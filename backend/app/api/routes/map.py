"""
Map Intelligence API routes — GeoJSON endpoints for MapLibre GL.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case as sqlalchemy_case
from typing import Optional
from app.database.base import get_db
from app.models.wells import Well
from app.models.geological import Basin, Field
from app.models.operations import DrillingEvent
from app.api.dependencies import get_current_user
from app.models.identity import User

router = APIRouter(prefix="/map", tags=["Map Intelligence"])

STATUS_COLORS = {
    "Drilling": "#eab308",
    "Producing": "#059669",
    "Completed": "#7c3aed",
    "Testing": "#d97706",
    "Suspended": "#6b7280",
    "Abandoned": "#374151",
    "Planned": "#0891b2",
}


@router.get("/wells/geojson", summary="All wells as GeoJSON FeatureCollection")
async def wells_geojson(
    basin_id: Optional[int] = None,
    field_id: Optional[int] = None,
    status: Optional[list[str]] = Query(None),
    purpose: Optional[list[str]] = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns wells as GeoJSON for MapLibre. Includes status color for client rendering."""
    q = (
        select(
            Well.id, Well.well_name, Well.well_status, Well.well_purpose,
            Well.trajectory_type, Well.latitude, Well.longitude,
            Well.total_depth, Well.current_depth,
            Field.id.label("field_id"), Field.name.label("field_name"),
            Basin.id.label("basin_id"), Basin.name.label("basin_name"),
        )
        .join(Field, Well.field_id == Field.id)
        .join(Basin, Field.basin_id == Basin.id)
    )
    if basin_id:
        q = q.where(Basin.id == basin_id)
    if field_id:
        q = q.where(Field.id == field_id)
    if status:
        q = q.where(Well.well_status.in_(status))
    if purpose:
        q = q.where(Well.well_purpose.in_(purpose))

    result = await db.execute(q)
    rows = result.mappings().all()

    features = []
    for row in rows:
        if row["latitude"] and row["longitude"]:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [row["longitude"], row["latitude"]],
                },
                "properties": {
                    "id": row["id"],
                    "well_name": row["well_name"],
                    "well_status": row["well_status"],
                    "well_purpose": row["well_purpose"],
                    "trajectory_type": row["trajectory_type"],
                    "total_depth": row["total_depth"],
                    "current_depth": row["current_depth"],
                    "field_id": row["field_id"],
                    "field_name": row["field_name"],
                    "basin_id": row["basin_id"],
                    "basin_name": row["basin_name"],
                    "color": STATUS_COLORS.get(row["well_status"], "#9ca3af"),
                },
            })

    return {"type": "FeatureCollection", "features": features}


@router.get("/fields/geojson", summary="Fields as GeoJSON with well counts")
async def fields_geojson(
    basin_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Returns fields with centroid + well count for field boundary circles."""
    q = (
        select(
            Field.id, Field.name, Field.latitude, Field.longitude, Field.operator,
            Basin.id.label("basin_id"), Basin.name.label("basin_name"),
            func.count(Well.id).label("well_count"),
            func.sum(
                sqlalchemy_case(
                    (Well.well_status.in_(["Drilling", "Producing"]), 1),
                    else_=0,
                )
            ).label("active_count"),
        )
        .join(Basin, Field.basin_id == Basin.id)
        .outerjoin(Well, Well.field_id == Field.id)
        .group_by(Field.id, Field.name, Field.latitude, Field.longitude, Field.operator, Basin.id, Basin.name)
    )
    if basin_id:
        q = q.where(Basin.id == basin_id)

    result = await db.execute(q)
    rows = result.mappings().all()

    features = []
    for row in rows:
        if row["latitude"] and row["longitude"]:
            features.append({
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [row["longitude"], row["latitude"]],
                },
                "properties": {
                    "id": row["id"],
                    "name": row["name"],
                    "operator": row["operator"],
                    "basin_id": row["basin_id"],
                    "basin_name": row["basin_name"],
                    "well_count": row["well_count"] or 0,
                    "active_count": row["active_count"] or 0,
                },
            })

    return {"type": "FeatureCollection", "features": features}
