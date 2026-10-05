"""
Schemas for well entities
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime


class FormationIntervalResponse(BaseModel):
    id: int
    well_id: int
    formation_id: int
    formation_name: Optional[str] = None
    top_depth: float
    bottom_depth: float
    lithology: Optional[str] = None
    reservoir_quality: Optional[str] = None
    model_config = {"from_attributes": True}


class WellListItem(BaseModel):
    id: int
    well_name: str
    well_number: Optional[str] = None
    field_id: int
    field_name: Optional[str] = None
    basin_name: Optional[str] = None
    latitude: float
    longitude: float
    well_purpose: str
    well_status: str
    trajectory_type: str
    current_depth: Optional[float] = None
    total_depth: Optional[float] = None
    spud_date: Optional[date] = None
    model_config = {"from_attributes": True}


class WellDetail(BaseModel):
    id: int
    well_name: str
    well_number: Optional[str] = None
    field_id: int
    field_name: Optional[str] = None
    basin_id: Optional[int] = None
    basin_name: Optional[str] = None
    latitude: float
    longitude: float
    well_purpose: str
    well_status: str
    production_status: Optional[str] = None
    trajectory_type: str
    planned_depth: Optional[float] = None
    total_depth: Optional[float] = None
    current_depth: Optional[float] = None
    max_inclination: Optional[float] = None
    max_azimuth: Optional[float] = None
    max_dogleg_severity: Optional[float] = None
    spud_date: Optional[date] = None
    completion_date: Optional[date] = None
    reservoir_type: Optional[str] = None
    hydrocarbon_type: Optional[str] = None
    model_config = {"from_attributes": True}

class MitigationResponse(BaseModel):
    action: str = Field(validation_alias="action_taken")
    result: Optional[str] = None
    model_config = {"from_attributes": True, "populate_by_name": True}


class LessonResponse(BaseModel):
    lesson: str = Field(validation_alias="lesson_text")
    action: Optional[str] = Field(None, validation_alias="recommended_action")
    model_config = {"from_attributes": True, "populate_by_name": True}


class DrillingEventResponse(BaseModel):
    id: int
    well_id: int
    event_type: str
    event_category: Optional[str] = None
    severity: str
    start_depth: Optional[float] = None
    end_depth: Optional[float] = None
    description: Optional[str] = None
    cause: Optional[str] = None
    npt_hours: Optional[float] = None
    event_start_time: Optional[datetime] = None
    mitigations: list[MitigationResponse] = []
    lessons: list[LessonResponse] = []
    source_document_id: Optional[int] = None
    model_config = {"from_attributes": True}


class WellStats(BaseModel):
    total_wells: int
    drilling: int
    producing: int
    completed: int
    suspended: int
    abandoned: int
    planned: int
    testing: int
    by_purpose: dict
    by_trajectory: dict
