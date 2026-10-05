"""
Well Intelligence Module — Well, Wellbore, TrajectorySurvey
"""
from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Text, Float, Integer, ForeignKey, DateTime, Date, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class Well(Base):
    __tablename__ = "wells"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)

    # Identity
    well_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    well_number: Mapped[Optional[str]] = mapped_column(String(100))

    # Location
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id"), nullable=False, index=True)
    block_id: Mapped[Optional[int]] = mapped_column(ForeignKey("blocks.id"), index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)

    # Classification
    well_purpose: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # Exploratory/Appraisal/Development/Injection/Observation
    well_status: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # Planned/Spudded/Drilling/Completed/Testing/Producing/Suspended/Abandoned
    production_status: Mapped[Optional[str]] = mapped_column(String(100))
    trajectory_type: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Vertical"
    )  # Vertical/Directional/Horizontal/Multilateral

    # Depth
    planned_depth: Mapped[Optional[float]] = mapped_column(Float)
    total_depth: Mapped[Optional[float]] = mapped_column(Float)
    current_depth: Mapped[Optional[float]] = mapped_column(Float)

    # Trajectory details
    max_inclination: Mapped[Optional[float]] = mapped_column(Float)
    max_azimuth: Mapped[Optional[float]] = mapped_column(Float)
    max_dogleg_severity: Mapped[Optional[float]] = mapped_column(Float)

    # Dates
    spud_date: Mapped[Optional[date]] = mapped_column(Date)
    completion_date: Mapped[Optional[date]] = mapped_column(Date)
    abandonment_date: Mapped[Optional[date]] = mapped_column(Date)

    # Reservoir
    reservoir_type: Mapped[Optional[str]] = mapped_column(String(100))
    hydrocarbon_type: Mapped[Optional[str]] = mapped_column(String(100))

    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # Relationships
    field: Mapped["Field"] = relationship("Field", back_populates="wells")
    block: Mapped[Optional["Block"]] = relationship("Block", back_populates="wells")
    wellbores: Mapped[list["Wellbore"]] = relationship("Wellbore", back_populates="well")
    formation_intervals: Mapped[list["FormationInterval"]] = relationship("FormationInterval", back_populates="well")
    drilling_events: Mapped[list["DrillingEvent"]] = relationship("DrillingEvent", back_populates="well")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="well")
    telemetry: Mapped[list["RigTelemetry"]] = relationship("RigTelemetry", back_populates="well")
    risk_predictions: Mapped[list["RiskPrediction"]] = relationship("RiskPrediction", back_populates="well")
    lessons_learned: Mapped[list["LessonLearned"]] = relationship("LessonLearned", back_populates="well")

    def __repr__(self) -> str:
        return f"<Well {self.well_name}>"


class Wellbore(Base):
    __tablename__ = "wellbores"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    well_id: Mapped[int] = mapped_column(ForeignKey("wells.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[Optional[str]] = mapped_column(String(50))
    trajectory_type: Mapped[Optional[str]] = mapped_column(String(50))
    sidetrack_number: Mapped[Optional[int]] = mapped_column(Integer)
    kickoff_depth: Mapped[Optional[float]] = mapped_column(Float)
    total_depth: Mapped[Optional[float]] = mapped_column(Float)

    # Relationships
    well: Mapped["Well"] = relationship("Well", back_populates="wellbores")
    surveys: Mapped[list["TrajectorySurvey"]] = relationship("TrajectorySurvey", back_populates="wellbore")
    drilling_events: Mapped[list["DrillingEvent"]] = relationship("DrillingEvent", back_populates="wellbore")


class TrajectorySurvey(Base):
    __tablename__ = "trajectory_surveys"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    wellbore_id: Mapped[int] = mapped_column(ForeignKey("wellbores.id"), nullable=False, index=True)
    measured_depth: Mapped[float] = mapped_column(Float, nullable=False)
    inclination: Mapped[float] = mapped_column(Float, nullable=False)
    azimuth: Mapped[float] = mapped_column(Float, nullable=False)
    true_vertical_depth: Mapped[Optional[float]] = mapped_column(Float)
    northing: Mapped[Optional[float]] = mapped_column(Float)
    easting: Mapped[Optional[float]] = mapped_column(Float)
    dogleg_severity: Mapped[Optional[float]] = mapped_column(Float)

    # Relationships
    wellbore: Mapped["Wellbore"] = relationship("Wellbore", back_populates="surveys")
