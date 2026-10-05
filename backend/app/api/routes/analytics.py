"""
Analytics API — Phase 6
Aggregated statistics for the Analytics dashboard:
  GET /api/analytics/overview       — key platform KPIs
  GET /api/analytics/events         — event frequency by type/severity
  GET /api/analytics/wells          — well distribution by status/basin
  GET /api/analytics/npt-trends     — NPT distribution
  GET /api/analytics/formations     — formation risk heatmap
  GET /api/analytics/basins         — basin-level statistics
"""
import structlog
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, case
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.base import get_db
from app.models.identity import User
from app.models.wells import Well
from app.models.geological import Field, Basin, Formation
from app.models.operations import DrillingEvent, LessonLearned

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview", summary="Platform KPI summary")
async def get_overview(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    total_wells    = (await db.execute(select(func.count(Well.id)))).scalar() or 0
    active_wells   = (await db.execute(
        select(func.count(Well.id)).where(Well.well_status.in_(["Drilling", "Producing"]))
    )).scalar() or 0
    total_fields   = (await db.execute(select(func.count(Field.id)))).scalar() or 0
    total_basins   = (await db.execute(select(func.count(Basin.id)))).scalar() or 0
    total_events   = (await db.execute(select(func.count(DrillingEvent.id)))).scalar() or 0
    total_lessons  = (await db.execute(select(func.count(LessonLearned.id)))).scalar() or 0
    avg_npt        = (await db.execute(select(func.avg(DrillingEvent.npt_hours)))).scalar() or 0
    total_npt      = (await db.execute(select(func.sum(DrillingEvent.npt_hours)))).scalar() or 0
    high_sev_events = (await db.execute(
        select(func.count(DrillingEvent.id)).where(DrillingEvent.severity.in_(["High", "Critical"]))
    )).scalar() or 0

    return {
        "total_wells": total_wells,
        "active_wells": active_wells,
        "total_fields": total_fields,
        "total_basins": total_basins,
        "total_events": total_events,
        "high_severity_events": high_sev_events,
        "total_lessons": total_lessons,
        "avg_npt_hours": round(float(avg_npt), 1),
        "total_npt_hours": round(float(total_npt), 1),
        "high_severity_pct": round(high_sev_events / max(1, total_events) * 100, 1),
    }


@router.get("/events", summary="Event frequency by type and severity")
async def get_event_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # By type
    by_type_res = await db.execute(
        select(
            DrillingEvent.event_type,
            func.count().label("count"),
            func.sum(DrillingEvent.npt_hours).label("total_npt"),
            func.avg(DrillingEvent.npt_hours).label("avg_npt"),
        )
        .group_by(DrillingEvent.event_type)
        .order_by(func.count().desc())
    )
    by_type = [
        {
            "event_type": row.event_type,
            "count": row.count,
            "total_npt": round(float(row.total_npt or 0), 1),
            "avg_npt": round(float(row.avg_npt or 0), 1),
        }
        for row in by_type_res
    ]

    # By severity
    by_sev_res = await db.execute(
        select(DrillingEvent.severity, func.count().label("count"))
        .group_by(DrillingEvent.severity)
        .order_by(func.count().desc())
    )
    by_severity = [{"severity": row.severity, "count": row.count} for row in by_sev_res]

    # Top NPT events
    top_npt_res = await db.execute(
        select(DrillingEvent.event_type, DrillingEvent.severity,
               DrillingEvent.npt_hours, Well.well_name.label("well_name"))
        .join(Well, DrillingEvent.well_id == Well.id)
        .order_by(DrillingEvent.npt_hours.desc())
        .limit(10)
    )
    top_npt = [
        {
            "event_type": row.event_type, "severity": row.severity,
            "npt_hours": float(row.npt_hours or 0), "well_name": row.well_name,
        }
        for row in top_npt_res
    ]

    return {"by_type": by_type, "by_severity": by_severity, "top_npt_events": top_npt}


@router.get("/wells", summary="Well distribution statistics")
async def get_well_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # By status
    by_status_res = await db.execute(
        select(Well.well_status, func.count().label("count"))
        .group_by(Well.well_status)
        .order_by(func.count().desc())
    )
    by_status = [{"status": row.well_status, "count": row.count} for row in by_status_res]

    # By trajectory
    by_traj_res = await db.execute(
        select(Well.trajectory_type, func.count().label("count"))
        .group_by(Well.trajectory_type)
        .order_by(func.count().desc())
    )
    by_trajectory = [{"trajectory": row.trajectory_type, "count": row.count} for row in by_traj_res]

    # By basin
    by_basin_res = await db.execute(
        select(Basin.name.label("basin"), func.count(Well.id).label("count"))
        .join(Field, Field.basin_id == Basin.id)
        .join(Well, Well.field_id == Field.id)
        .group_by(Basin.name)
        .order_by(func.count(Well.id).desc())
    )
    by_basin = [{"basin": row.basin, "count": row.count} for row in by_basin_res]

    # By purpose
    by_purpose_res = await db.execute(
        select(Well.well_purpose, func.count().label("count"))
        .group_by(Well.well_purpose)
        .order_by(func.count().desc())
    )
    by_purpose = [{"purpose": row.well_purpose, "count": row.count} for row in by_purpose_res]

    # Depth distribution
    depth_res = await db.execute(
        select(
            func.min(Well.total_depth).label("min"),
            func.max(Well.total_depth).label("max"),
            func.avg(Well.total_depth).label("avg"),
        )
    )
    dr = depth_res.first()
    depth_stats = {
        "min": round(float(dr.min or 0), 0),
        "max": round(float(dr.max or 0), 0),
        "avg": round(float(dr.avg or 0), 0),
    }

    return {
        "by_status": by_status,
        "by_trajectory": by_trajectory,
        "by_basin": by_basin,
        "by_purpose": by_purpose,
        "depth_stats": depth_stats,
    }


@router.get("/formations", summary="Formation risk heatmap data")
async def get_formation_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # Events per formation
    form_ev_res = await db.execute(
        select(
            Formation.name.label("formation"),
            DrillingEvent.event_type,
            func.count().label("count"),
            func.avg(DrillingEvent.npt_hours).label("avg_npt"),
        )
        .join(Formation, DrillingEvent.formation_id == Formation.id, isouter=True)
        .where(Formation.name.isnot(None))
        .group_by(Formation.name, DrillingEvent.event_type)
        .order_by(func.count().desc())
        .limit(50)
    )
    formation_events = [
        {
            "formation": row.formation, "event_type": row.event_type,
            "count": row.count, "avg_npt": round(float(row.avg_npt or 0), 1),
        }
        for row in form_ev_res
    ]

    return {"formation_events": formation_events}


@router.get("/basins", summary="Basin-level operational statistics")
async def get_basin_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    res = await db.execute(
        select(
            Basin.name.label("basin"),
            Basin.state,
            func.count(Well.id).label("total_wells"),
            func.sum(
                case((Well.well_status.in_(["Drilling", "Producing"]), 1), else_=0)
            ).label("active_wells"),
            func.count(Field.id.distinct()).label("total_fields"),
        )
        .join(Field, Field.basin_id == Basin.id, isouter=True)
        .join(Well, Well.field_id == Field.id, isouter=True)
        .group_by(Basin.name, Basin.state)
        .order_by(func.count(Well.id).desc())
    )
    return [
        {
            "basin": row.basin, "state": row.state,
            "total_wells": row.total_wells or 0,
            "active_wells": int(row.active_wells or 0),
            "total_fields": row.total_fields or 0,
        }
        for row in res
    ]


@router.get("/npt-trends", summary="NPT distribution by event type")
async def get_npt_trends(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns NPT breakdown for charting."""
    res = await db.execute(
        select(
            DrillingEvent.event_type,
            DrillingEvent.severity,
            func.count().label("count"),
            func.sum(DrillingEvent.npt_hours).label("total_npt"),
        )
        .group_by(DrillingEvent.event_type, DrillingEvent.severity)
        .order_by(func.sum(DrillingEvent.npt_hours).desc())
    )
    return [
        {
            "event_type": row.event_type, "severity": row.severity,
            "count": row.count, "total_npt": round(float(row.total_npt or 0), 1),
        }
        for row in res
    ]
