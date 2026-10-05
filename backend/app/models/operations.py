"""
Operational Knowledge Module — DrillingEvent, Mitigation, LessonLearned, WellSimilarityScore
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Float, Integer, ForeignKey, DateTime, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class DrillingEvent(Base):
    __tablename__ = "drilling_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    well_id: Mapped[int] = mapped_column(ForeignKey("wells.id"), nullable=False, index=True)
    wellbore_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wellbores.id"), index=True)
    formation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("formations.id"), index=True)

    # Classification
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    event_category: Mapped[Optional[str]] = mapped_column(String(100))
    # Well Control / Lost Circulation / Mechanical / Formation Related / Drilling Parameter Abnormalities
    severity: Mapped[str] = mapped_column(
        String(50), nullable=False, default="Low"
    )  # Information/Low/Moderate/High/Critical

    # Depth
    start_depth: Mapped[Optional[float]] = mapped_column(Float)
    end_depth: Mapped[Optional[float]] = mapped_column(Float)

    # Details
    description: Mapped[Optional[str]] = mapped_column(Text)
    cause: Mapped[Optional[str]] = mapped_column(Text)
    consequence: Mapped[Optional[str]] = mapped_column(Text)
    npt_hours: Mapped[Optional[float]] = mapped_column(Float)

    # Timing
    event_start_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    event_end_time: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    source_document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("documents.id"), index=True)

    # Relationships
    well: Mapped["Well"] = relationship("Well", back_populates="drilling_events")
    wellbore: Mapped[Optional["Wellbore"]] = relationship("Wellbore", back_populates="drilling_events")
    formation: Mapped[Optional["Formation"]] = relationship("Formation")
    mitigations: Mapped[list["Mitigation"]] = relationship("Mitigation", back_populates="event")
    lessons: Mapped[list["LessonLearned"]] = relationship("LessonLearned", back_populates="event")


class Mitigation(Base):
    __tablename__ = "mitigations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[int] = mapped_column(ForeignKey("drilling_events.id"), nullable=False, index=True)
    action_taken: Mapped[str] = mapped_column(Text, nullable=False)
    procedure: Mapped[Optional[str]] = mapped_column(Text)
    materials_used: Mapped[Optional[str]] = mapped_column(Text)
    result: Mapped[Optional[str]] = mapped_column(Text)
    effectiveness_score: Mapped[Optional[float]] = mapped_column(Float)  # 0-100
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    event: Mapped["DrillingEvent"] = relationship("DrillingEvent", back_populates="mitigations")


class LessonLearned(Base):
    __tablename__ = "lessons_learned"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    event_id: Mapped[Optional[int]] = mapped_column(ForeignKey("drilling_events.id"), index=True)
    well_id: Mapped[int] = mapped_column(ForeignKey("wells.id"), nullable=False, index=True)
    formation_id: Mapped[Optional[int]] = mapped_column(ForeignKey("formations.id"), index=True)
    depth_range: Mapped[Optional[str]] = mapped_column(String(100))
    lesson_text: Mapped[str] = mapped_column(Text, nullable=False)
    recommended_action: Mapped[Optional[str]] = mapped_column(Text)
    applicable_conditions: Mapped[Optional[str]] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    event: Mapped[Optional["DrillingEvent"]] = relationship("DrillingEvent", back_populates="lessons")
    well: Mapped["Well"] = relationship("Well", back_populates="lessons_learned")
    formation: Mapped[Optional["Formation"]] = relationship("Formation")


class WellSimilarityScore(Base):
    __tablename__ = "well_similarity_scores"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    current_well_id: Mapped[int] = mapped_column(ForeignKey("wells.id"), nullable=False, index=True)
    offset_well_id: Mapped[int] = mapped_column(ForeignKey("wells.id"), nullable=False, index=True)
    distance_km: Mapped[Optional[float]] = mapped_column(Float)
    formation_similarity: Mapped[Optional[float]] = mapped_column(Float)  # 0-100
    trajectory_similarity: Mapped[Optional[float]] = mapped_column(Float)  # 0-100
    event_similarity: Mapped[Optional[float]] = mapped_column(Float)  # 0-100
    overall_similarity: Mapped[Optional[float]] = mapped_column(Float)  # 0-100
    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
