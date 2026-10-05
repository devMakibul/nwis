"""
Wells & Fields API routes.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload
from typing import Optional
from app.database.base import get_db
from app.models.wells import Well
from app.models.geological import Basin, Field, Formation, FormationInterval
from app.models.operations import DrillingEvent, LessonLearned
from app.schemas.wells import WellListItem, WellDetail, DrillingEventResponse, WellStats
from app.schemas.geological import BasinResponse, FieldResponse, FormationResponse
from app.api.dependencies import get_current_user
from app.models.identity import User

router = APIRouter(prefix="/wells", tags=["Wells"])
fields_router = APIRouter(prefix="/fields", tags=["Fields"])
basins_router = APIRouter(prefix="/basins", tags=["Basins"])


# ─────────────────────────────────────────────
# BASIN ROUTES
# ─────────────────────────────────────────────

@basins_router.get("", response_model=list[BasinResponse], summary="List all petroleum basins")
async def list_basins(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Basin).order_by(Basin.name))
    return result.scalars().all()


@basins_router.get("/{basin_id}/fields", response_model=list[FieldResponse], summary="Fields in a basin")
async def fields_in_basin(basin_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Field).where(Field.basin_id == basin_id).order_by(Field.name))
    return result.scalars().all()


@basins_router.get("/{basin_id}/formations", response_model=list[FormationResponse], summary="Formations in a basin")
async def formations_in_basin(basin_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Formation).where(Formation.basin_id == basin_id).order_by(Formation.name))
    return result.scalars().all()


# ─────────────────────────────────────────────
# FIELD ROUTES
# ─────────────────────────────────────────────

@fields_router.get("", response_model=list[FieldResponse], summary="List all fields")
async def list_fields(
    basin_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(Field).order_by(Field.name)
    if basin_id:
        q = q.where(Field.basin_id == basin_id)
    result = await db.execute(q)
    return result.scalars().all()


@fields_router.get("/{field_id}", response_model=FieldResponse, summary="Field detail")
async def get_field(field_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    result = await db.execute(select(Field).where(Field.id == field_id))
    field = result.scalar_one_or_none()
    if not field:
        raise HTTPException(status_code=404, detail="Field not found")
    return field


# ─────────────────────────────────────────────
# WELL ROUTES
# ─────────────────────────────────────────────

@router.get("", response_model=list[WellListItem], summary="List wells with filtering")
async def list_wells(
    field_id: Optional[int] = None,
    basin_id: Optional[int] = None,
    status: Optional[str] = None,
    purpose: Optional[str] = None,
    trajectory: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = Query(default=200, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = (
        select(
            Well.id, Well.well_name, Well.well_number,
            Well.field_id, Well.latitude, Well.longitude,
            Well.well_purpose, Well.well_status,
            Well.trajectory_type, Well.current_depth, Well.total_depth,
            Well.spud_date,
            Field.name.label("field_name"),
            Basin.name.label("basin_name"),
        )
        .join(Field, Well.field_id == Field.id)
        .join(Basin, Field.basin_id == Basin.id)
        .order_by(Well.well_name)
        .limit(limit)
        .offset(offset)
    )

    if field_id:
        q = q.where(Well.field_id == field_id)
    if basin_id:
        q = q.where(Field.basin_id == basin_id)
    if status:
        q = q.where(Well.well_status == status)
    if purpose:
        q = q.where(Well.well_purpose == purpose)
    if trajectory:
        q = q.where(Well.trajectory_type == trajectory)
    if search:
        q = q.where(
            or_(
                Well.well_name.ilike(f"%{search}%"),
                Field.name.ilike(f"%{search}%"),
                Basin.name.ilike(f"%{search}%"),
            )
        )

    result = await db.execute(q)
    rows = result.mappings().all()
    return [WellListItem(**dict(row)) for row in rows]


@router.get("/drilling", response_model=list[WellListItem], summary="List only Drilling wells")
async def list_drilling_wells(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns only wells with status='Drilling', used for the simulation well selector."""
    q = (
        select(
            Well.id, Well.well_name, Well.well_number,
            Well.field_id, Well.latitude, Well.longitude,
            Well.well_purpose, Well.well_status,
            Well.trajectory_type, Well.current_depth, Well.total_depth,
            Well.spud_date,
            Field.name.label("field_name"),
            Basin.name.label("basin_name"),
        )
        .join(Field, Well.field_id == Field.id)
        .join(Basin, Field.basin_id == Basin.id)
        .where(Well.well_status == "Drilling")
        .order_by(Well.well_name)
    )
    result = await db.execute(q)
    rows = result.mappings().all()
    return [WellListItem(**dict(row)) for row in rows]


@router.patch("/{well_id}/sim-update", summary="Update well depth and/or status during simulation")
async def sim_update_well(
    well_id: int,
    current_depth: Optional[float] = None,
    well_status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Atomically update current_depth and/or well_status for a well during simulation."""
    from datetime import date
    well = await db.get(Well, well_id)
    if not well:
        raise HTTPException(status_code=404, detail="Well not found")
    if current_depth is not None:
        well.current_depth = current_depth
    if well_status is not None:
        well.well_status = well_status
        if well_status == "Completed" and not well.completion_date:
            well.completion_date = date.today()
    await db.commit()
    return {"ok": True, "well_id": well_id, "current_depth": well.current_depth, "well_status": well.well_status}



@router.get("/stats", response_model=WellStats, summary="Well statistics")
async def well_stats(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    # Status distribution
    status_result = await db.execute(
        select(Well.well_status, func.count().label("cnt")).group_by(Well.well_status)
    )
    status_map = {row.well_status: row.cnt for row in status_result}

    # Purpose distribution
    purpose_result = await db.execute(
        select(Well.well_purpose, func.count().label("cnt")).group_by(Well.well_purpose)
    )
    by_purpose = {row.well_purpose: row.cnt for row in purpose_result}

    # Trajectory distribution
    traj_result = await db.execute(
        select(Well.trajectory_type, func.count().label("cnt")).group_by(Well.trajectory_type)
    )
    by_trajectory = {row.trajectory_type: row.cnt for row in traj_result}

    total = sum(status_map.values())
    return WellStats(
        total_wells=total,
        drilling=status_map.get("Drilling", 0),
        producing=status_map.get("Producing", 0),
        completed=status_map.get("Completed", 0),
        suspended=status_map.get("Suspended", 0),
        abandoned=status_map.get("Abandoned", 0),
        planned=status_map.get("Planned", 0),
        testing=status_map.get("Testing", 0),
        by_purpose=by_purpose,
        by_trajectory=by_trajectory,
    )


@router.get("/{well_id}", response_model=WellDetail, summary="Well detail")
async def get_well(well_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    q = (
        select(
            Well.id, Well.well_name, Well.well_number,
            Well.field_id, Well.latitude, Well.longitude,
            Well.well_purpose, Well.well_status, Well.production_status,
            Well.trajectory_type,
            Well.planned_depth, Well.total_depth, Well.current_depth,
            Well.max_inclination, Well.max_azimuth, Well.max_dogleg_severity,
            Well.spud_date, Well.completion_date,
            Well.reservoir_type, Well.hydrocarbon_type,
            Field.name.label("field_name"),
            Field.basin_id.label("basin_id"),
            Basin.name.label("basin_name"),
        )
        .join(Field, Well.field_id == Field.id)
        .join(Basin, Field.basin_id == Basin.id)
        .where(Well.id == well_id)
    )
    result = await db.execute(q)
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Well not found")
    return WellDetail(**dict(row))


@router.get("/{well_id}/events", response_model=list[DrillingEventResponse], summary="Drilling events for a well")
async def get_well_events(
    well_id: int,
    severity: Optional[str] = None,
    event_type: Optional[str] = None,
    limit: int = Query(default=100, le=500),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = (
        select(DrillingEvent)
        .options(selectinload(DrillingEvent.mitigations), selectinload(DrillingEvent.lessons))
        .where(DrillingEvent.well_id == well_id)
        .order_by(DrillingEvent.start_depth)
        .limit(limit)
    )
    if severity:
        q = q.where(DrillingEvent.severity == severity)
    if event_type:
        q = q.where(DrillingEvent.event_type.ilike(f"%{event_type}%"))
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{well_id}/formations", summary="Formation intervals for a well")
async def get_well_formations(well_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    q = (
        select(
            FormationInterval.id,
            FormationInterval.well_id,
            FormationInterval.formation_id,
            Formation.name.label("formation_name"),
            FormationInterval.top_depth,
            FormationInterval.bottom_depth,
            FormationInterval.lithology,
            FormationInterval.reservoir_quality,
        )
        .join(Formation, FormationInterval.formation_id == Formation.id)
        .where(FormationInterval.well_id == well_id)
        .order_by(FormationInterval.top_depth)
    )
    result = await db.execute(q)
    rows = result.mappings().all()
    return [dict(row) for row in rows]


@router.get("/{well_id}/offset-wells", summary="Nearby similar wells")
async def get_offset_wells(
    well_id: int,
    radius_km: float = Query(default=50.0, le=1000.0),
    limit: int = Query(default=10, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Find nearby wells using approximate distance formula."""
    # Get current well
    result = await db.execute(select(Well).where(Well.id == well_id))
    current_well = result.scalar_one_or_none()
    if not current_well:
        raise HTTPException(status_code=404, detail="Well not found")

    lat, lon = current_well.latitude, current_well.longitude
    # Approximate bounding box (~1° ≈ 111km)
    lat_delta = radius_km / 111.0
    lon_delta = radius_km / (111.0 * abs(import_cos(lat)) or 1)

    q = (
        select(Well, Field.name.label("field_name"), Basin.name.label("basin_name"))
        .join(Field, Well.field_id == Field.id)
        .join(Basin, Field.basin_id == Basin.id)
        .where(
            Well.id != well_id,
            Well.latitude.between(lat - lat_delta, lat + lat_delta),
            Well.longitude.between(lon - lon_delta, lon + lon_delta),
        )
    )
    result = await db.execute(q)
    rows = result.all()

    import math

    def dist(w: Well) -> float:
        dlat = math.radians(w.latitude - lat)
        dlon = math.radians(w.longitude - lon)
        a = math.sin(dlat/2)**2 + math.cos(math.radians(lat)) * math.cos(math.radians(w.latitude)) * math.sin(dlon/2)**2
        return 6371.0 * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))

    results = []
    for well_obj, field_name, basin_name in rows:
        d = dist(well_obj)
        if d <= radius_km:
            results.append({
                "id": well_obj.id,
                "well_name": well_obj.well_name,
                "field_name": field_name,
                "basin_name": basin_name,
                "distance_km": round(d, 2),
                "well_status": well_obj.well_status,
                "trajectory_type": well_obj.trajectory_type,
                "total_depth": well_obj.total_depth,
                "latitude": well_obj.latitude,
                "longitude": well_obj.longitude,
            })

    results.sort(key=lambda x: x["distance_km"])
    return results[:limit]


@router.get("/{well_id}/trajectory", summary="Trajectory surveys for a well")
async def get_trajectory(
    well_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.models.wells import Wellbore, TrajectorySurvey
    # Get first wellbore
    wb_result = await db.execute(
        select(Wellbore).where(Wellbore.well_id == well_id).limit(1)
    )
    wb = wb_result.scalar_one_or_none()
    if not wb:
        return []
    # Get surveys
    surv_result = await db.execute(
        select(TrajectorySurvey)
        .where(TrajectorySurvey.wellbore_id == wb.id)
        .order_by(TrajectorySurvey.measured_depth)
    )
    surveys = surv_result.scalars().all()
    return [
        {
            "measured_depth": s.measured_depth,
            "inclination": s.inclination,
            "azimuth": s.azimuth,
            "true_vertical_depth": s.true_vertical_depth,
            "northing": s.northing,
            "easting": s.easting,
            "dogleg_severity": s.dogleg_severity,
        }
        for s in surveys
    ]


def import_cos(deg: float) -> float:
    import math
    return math.cos(math.radians(deg))
