"""
Dashboard analytics routes — system-wide KPI summary.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database.base import get_db
from app.models.wells import Well
from app.models.geological import Basin, Field
from app.models.operations import DrillingEvent, LessonLearned
from app.models.intelligence import Document
from app.api.dependencies import get_current_user
from app.models.identity import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/overview", summary="System-wide operational overview")
async def get_overview(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    # Wells
    wells_total = (await db.execute(select(func.count()).select_from(Well))).scalar()
    wells_drilling = (await db.execute(select(func.count()).select_from(Well).where(Well.well_status == "Drilling"))).scalar()
    wells_producing = (await db.execute(select(func.count()).select_from(Well).where(Well.well_status == "Producing"))).scalar()

    # Events
    events_total = (await db.execute(select(func.count()).select_from(DrillingEvent))).scalar()
    events_critical = (await db.execute(
        select(func.count()).select_from(DrillingEvent).where(DrillingEvent.severity.in_(["High", "Critical"]))
    )).scalar()
    total_npt = (await db.execute(select(func.sum(DrillingEvent.npt_hours)).select_from(DrillingEvent))).scalar()

    # Knowledge base
    lessons_total = (await db.execute(select(func.count()).select_from(LessonLearned))).scalar()
    basins_total = (await db.execute(select(func.count()).select_from(Basin))).scalar()
    fields_total = (await db.execute(select(func.count()).select_from(Field))).scalar()
    docs_total = (await db.execute(select(func.count()).select_from(Document))).scalar()

    # Top event types
    event_type_result = await db.execute(
        select(DrillingEvent.event_type, func.count().label("cnt"))
        .group_by(DrillingEvent.event_type)
        .order_by(func.count().desc())
        .limit(6)
    )
    top_event_types = [{"event_type": r.event_type, "count": r.cnt} for r in event_type_result]

    # Severity breakdown
    severity_result = await db.execute(
        select(DrillingEvent.severity, func.count().label("cnt"))
        .group_by(DrillingEvent.severity)
    )
    severity_breakdown = {r.severity: r.cnt for r in severity_result}

    return {
        "wells": {
            "total": wells_total,
            "drilling": wells_drilling,
            "producing": wells_producing,
        },
        "events": {
            "total": events_total,
            "high_critical": events_critical,
            "total_npt_hours": round(total_npt or 0, 1),
            "by_severity": severity_breakdown,
            "top_types": top_event_types,
        },
        "knowledge": {
            "basins": basins_total,
            "fields": fields_total,
            "lessons_learned": lessons_total,
            "documents": docs_total,
        },
    }
