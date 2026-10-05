"""
Report Generation API — Phase 6
POST /api/reports/generate  — generate a PDF or DOCX report
GET  /api/reports           — list generated reports
GET  /api/reports/{id}      — download a report
DELETE /api/reports/{id}    — delete a report
"""
import os
import json
from datetime import datetime
from pathlib import Path
from typing import Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.base import get_db
from app.models.identity import User
from app.models.wells import Well, Wellbore
from app.models.geological import Field, Basin, Formation
from app.models.operations import DrillingEvent, LessonLearned

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports"])

# Reports stored in /tmp/nwis_reports/ for the demo
REPORTS_DIR = Path("/tmp/nwis_reports")
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

# In-memory report registry (production would use DB table)
_report_registry: list[dict] = []


class ReportRequest(BaseModel):
    report_type: str  # "well_intelligence" | "field_intelligence" | "management_summary"
    format: str = "pdf"  # "pdf" | "docx"
    well_id: Optional[int] = None
    field_id: Optional[int] = None
    sections: Optional[list[str]] = None
    title: Optional[str] = None


@router.get("", summary="List all generated reports")
async def list_reports(_: User = Depends(get_current_user)):
    return sorted(_report_registry, key=lambda r: r["created_at"], reverse=True)


@router.delete("/{report_id}", summary="Delete a report")
async def delete_report(report_id: str, _: User = Depends(get_current_user)):
    global _report_registry
    report = next((r for r in _report_registry if r["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    # Remove file
    path = REPORTS_DIR / report["filename"]
    if path.exists():
        path.unlink()
    _report_registry = [r for r in _report_registry if r["id"] != report_id]
    return {"deleted": True}


@router.get("/{report_id}/download", summary="Download a report file")
async def download_report(report_id: str, _: User = Depends(get_current_user)):
    report = next((r for r in _report_registry if r["id"] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    path = REPORTS_DIR / report["filename"]
    if not path.exists():
        raise HTTPException(status_code=404, detail="Report file not found")
    media_type = "application/pdf" if report["format"] == "pdf" else \
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return FileResponse(path=str(path), filename=report["filename"], media_type=media_type)


@router.post("/generate", summary="Generate a new report")
async def generate_report(
    body: ReportRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from app.services.report_service import (
        generate_well_intelligence_pdf,
        generate_well_intelligence_docx,
        generate_field_report_pdf,
        generate_management_summary_pdf,
    )

    generated_by = current_user.name or current_user.email
    report_id = f"RPT-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}-{id(body) % 9999:04d}"
    fmt = body.format.lower()
    ext = "pdf" if fmt == "pdf" else "docx"
    filename = f"{report_id}.{ext}"
    filepath = REPORTS_DIR / filename

    try:
        if body.report_type == "well_intelligence":
            if not body.well_id:
                raise HTTPException(status_code=400, detail="well_id required for this report type")

            # Fetch well data
            well_res = await db.execute(
                select(Well, Field.name.label("field_name"), Basin.name.label("basin_name"))
                .join(Field, Well.field_id == Field.id)
                .join(Basin, Field.basin_id == Basin.id)
                .where(Well.id == body.well_id)
            )
            well_row = well_res.first()
            if not well_row:
                raise HTTPException(status_code=404, detail="Well not found")
            well_obj, field_name, basin_name = well_row[0], well_row[1], well_row[2]
            well_dict = {
                "well_name": well_obj.well_name,
                "well_status": well_obj.well_status,
                "total_depth": well_obj.total_depth,
                "trajectory_type": well_obj.trajectory_type,
                "well_purpose": well_obj.well_purpose,
                "hydrocarbon_type": well_obj.hydrocarbon_type,
                "latitude": well_obj.latitude,
                "longitude": well_obj.longitude,
                "spud_date": well_obj.spud_date,
                "completion_date": well_obj.completion_date,
                "field_name": field_name,
                "basin_name": basin_name,
            }

            # Fetch events
            ev_res = await db.execute(
                select(DrillingEvent).where(DrillingEvent.well_id == body.well_id).limit(25)
            )
            events = [
                {
                    "event_type": e.event_type, "severity": e.severity,
                    "start_depth": e.start_depth, "npt_hours": e.npt_hours,
                    "cause": e.cause, "formation": None,
                }
                for e in ev_res.scalars()
            ]

            # Fetch offset wells (same field)
            ow_res = await db.execute(
                select(Well, Field.name.label("field_name"))
                .join(Field, Well.field_id == Field.id)
                .where(Well.field_id == well_obj.field_id, Well.id != body.well_id)
                .limit(10)
            )
            offset_wells = [
                {
                    "well_name": r[0].well_name, "field_name": r[1],
                    "well_status": r[0].well_status, "total_depth": r[0].total_depth,
                    "distance_km": None, "event_count": 0,
                }
                for r in ow_res
            ]

            # Risks from live module
            from app.api.routes.live import _simulators, _compute_risks, _get_or_create_sim
            sim = _get_or_create_sim(body.well_id, float(well_obj.total_depth or 4000))
            risks = _compute_risks(sim, {})

            if fmt == "pdf":
                content = generate_well_intelligence_pdf(well_dict, events, offset_wells, risks, generated_by)
            else:
                content = generate_well_intelligence_docx(well_dict, events, offset_wells, risks, generated_by)
            title = f"Well Report — {well_dict['well_name']}"

        elif body.report_type == "field_intelligence":
            if not body.field_id:
                raise HTTPException(status_code=400, detail="field_id required for this report type")

            field_res = await db.execute(
                select(Field, Basin.name.label("basin_name"))
                .join(Basin, Field.basin_id == Basin.id)
                .where(Field.id == body.field_id)
            )
            field_row = field_res.first()
            if not field_row:
                raise HTTPException(status_code=404, detail="Field not found")
            field_obj, basin_name = field_row[0], field_row[1]

            wells_res = await db.execute(
                select(Well).where(Well.field_id == body.field_id).limit(30)
            )
            wells = [
                {
                    "well_name": w.well_name, "well_status": w.well_status,
                    "total_depth": w.total_depth, "trajectory_type": w.trajectory_type,
                    "well_purpose": w.well_purpose,
                }
                for w in wells_res.scalars()
            ]
            field_dict = {"name": field_obj.name, "basin_name": basin_name}

            ev_res = await db.execute(
                select(DrillingEvent)
                .join(Well, DrillingEvent.well_id == Well.id)
                .where(Well.field_id == body.field_id)
                .limit(100)
            )
            events = [{"event_type": e.event_type, "npt_hours": e.npt_hours, "severity": e.severity}
                      for e in ev_res.scalars()]

            content = generate_field_report_pdf(field_dict, wells, events, generated_by)
            title = f"Field Report — {field_obj.name}"
            fmt = "pdf"  # Field report is PDF only

        elif body.report_type == "management_summary":
            # Gather platform-wide stats
            total_wells = (await db.execute(select(func.count(Well.id)))).scalar() or 0
            active_wells = (await db.execute(
                select(func.count(Well.id)).where(Well.well_status.in_(["Drilling", "Producing"]))
            )).scalar() or 0
            total_fields = (await db.execute(select(func.count(Field.id)))).scalar() or 0
            total_basins = (await db.execute(select(func.count(Basin.id)))).scalar() or 0
            total_events = (await db.execute(select(func.count(DrillingEvent.id)))).scalar() or 0
            avg_npt = (await db.execute(select(func.avg(DrillingEvent.npt_hours)))).scalar() or 0

            from app.models.assistant import ChatSession
            from app.models.intelligence import Document
            total_docs = (await db.execute(select(func.count(Document.id)))).scalar() or 0
            total_sessions = (await db.execute(select(func.count(ChatSession.id)))).scalar() or 0

            overview = {
                "total_wells": total_wells, "active_wells": active_wells,
                "total_fields": total_fields, "total_basins": total_basins,
                "total_events": total_events, "avg_npt": float(avg_npt or 0),
                "total_docs": total_docs, "total_sessions": total_sessions,
            }
            content = generate_management_summary_pdf(overview, generated_by)
            title = "Management Summary Report"
            fmt = "pdf"

        else:
            raise HTTPException(status_code=400, detail=f"Unknown report_type: {body.report_type}")

        # Write file
        filepath.write_bytes(content)
        file_size = len(content)

        entry = {
            "id": report_id,
            "title": body.title or title,
            "report_type": body.report_type,
            "format": fmt,
            "filename": filename,
            "file_size": file_size,
            "generated_by": generated_by,
            "created_at": datetime.utcnow().isoformat(),
            "well_id": body.well_id,
            "field_id": body.field_id,
        }
        _report_registry.append(entry)
        logger.info("report_generated", report_id=report_id, type=body.report_type, size=file_size)
        return {"success": True, "report": entry}

    except HTTPException:
        raise
    except Exception as e:
        logger.error("report_generation_error", error=str(e))
        raise HTTPException(status_code=500, detail=f"Report generation failed: {str(e)}")
