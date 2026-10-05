"""
Schemas for geological entities: Basin, Field, Block, Formation
"""
from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class BasinResponse(BaseModel):
    id: int
    name: str
    region: Optional[str] = None
    state: Optional[str] = None
    geological_age: Optional[str] = None
    description: Optional[str] = None
    model_config = {"from_attributes": True}


class FieldResponse(BaseModel):
    id: int
    basin_id: int
    name: str
    operator: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    discovery_year: Optional[int] = None
    description: Optional[str] = None
    model_config = {"from_attributes": True}


class FormationResponse(BaseModel):
    id: int
    basin_id: int
    name: str
    geological_age: Optional[str] = None
    lithology: Optional[str] = None
    description: Optional[str] = None
    model_config = {"from_attributes": True}
