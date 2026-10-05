"""
Document Intelligence Module — Document, DocumentPage, DocumentEntity, KnowledgeEmbedding, KnowledgeReference
Live Operations Module — RigTelemetry, RiskPrediction
"""
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Float, Integer, ForeignKey, DateTime, BigInteger, Index
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.database.base import Base


# ─────────────────────────────────────────────
# Document Intelligence
# ─────────────────────────────────────────────

class Document(Base):
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    well_id: Mapped[Optional[int]] = mapped_column(ForeignKey("wells.id"), index=True)
    document_type: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # Daily Drilling Report / Well Completion Report / etc.
    file_name: Mapped[str] = mapped_column(String(500), nullable=False)
    original_path: Mapped[Optional[str]] = mapped_column(String(1000))
    file_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    file_size: Mapped[Optional[int]] = mapped_column(BigInteger)
    mime_type: Mapped[Optional[str]] = mapped_column(String(100))
    page_count: Mapped[Optional[int]] = mapped_column(Integer)
    upload_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    uploaded_by: Mapped[Optional[uuid.UUID]] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"))
    processing_status: Mapped[str] = mapped_column(
        String(50), default="Uploaded"
    )  # Uploaded/Processing/Extracting/Embedding/Completed/Failed

    # Relationships
    well: Mapped[Optional["Well"]] = relationship("Well", back_populates="documents")
    pages: Mapped[list["DocumentPage"]] = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan")
    drilling_events: Mapped[list["DrillingEvent"]] = relationship("DrillingEvent")


class DocumentPage(Base):
    __tablename__ = "document_pages"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    document_id: Mapped[int] = mapped_column(ForeignKey("documents.id"), nullable=False, index=True)
    page_number: Mapped[int] = mapped_column(Integer, nullable=False)
    image_path: Mapped[Optional[str]] = mapped_column(String(1000))
    raw_text: Mapped[Optional[str]] = mapped_column(Text)
    markdown_content: Mapped[Optional[str]] = mapped_column(Text)
    processing_status: Mapped[str] = mapped_column(String(50), default="Pending")

    # Relationships
    document: Mapped["Document"] = relationship("Document", back_populates="pages")
    entities: Mapped[list["DocumentEntity"]] = relationship("DocumentEntity", back_populates="page", cascade="all, delete-orphan")


class DocumentEntity(Base):
    __tablename__ = "document_entities"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    document_page_id: Mapped[int] = mapped_column(ForeignKey("document_pages.id"), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # WELL / FIELD / BASIN / FORMATION / DEPTH / TRAJECTORY / DRILLING_PARAM / INCIDENT / MITIGATION / EQUIPMENT / DATE
    entity_value: Mapped[str] = mapped_column(Text, nullable=False)
    depth_reference: Mapped[Optional[float]] = mapped_column(Float)
    confidence_score: Mapped[Optional[float]] = mapped_column(Float)  # 0-100

    # Relationships
    page: Mapped["DocumentPage"] = relationship("DocumentPage", back_populates="entities")


class KnowledgeEmbedding(Base):
    """Stores pgvector embeddings for semantic retrieval."""
    __tablename__ = "knowledge_embeddings"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    source_type: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # document_page / lesson_learned / event / mitigation
    source_id: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # embedding stored as vector — populated after pgvector init
    # Using Text as placeholder; actual vector column added via migration
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)


class KnowledgeReference(Base):
    """Links AI responses back to source documents."""
    __tablename__ = "knowledge_references"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    session_id: Mapped[Optional[int]] = mapped_column(ForeignKey("chat_sessions.id"), index=True)
    document_id: Mapped[Optional[int]] = mapped_column(ForeignKey("documents.id"), index=True)
    page_number: Mapped[Optional[int]] = mapped_column(Integer)
    reference_text: Mapped[Optional[str]] = mapped_column(Text)


# ─────────────────────────────────────────────
# Live Operations
# ─────────────────────────────────────────────

class RigTelemetry(Base):
    """Time-series rig telemetry — managed by TimescaleDB hypertable."""
    __tablename__ = "rig_telemetry"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    well_id: Mapped[int] = mapped_column(ForeignKey("wells.id"), nullable=False, index=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    measured_depth: Mapped[Optional[float]] = mapped_column(Float)
    vertical_depth: Mapped[Optional[float]] = mapped_column(Float)
    rop: Mapped[Optional[float]] = mapped_column(Float)           # Rate of penetration m/hr
    wob: Mapped[Optional[float]] = mapped_column(Float)           # Weight on bit (tonnes)
    rpm: Mapped[Optional[float]] = mapped_column(Float)           # Rotary speed
    torque: Mapped[Optional[float]] = mapped_column(Float)        # kN.m
    standpipe_pressure: Mapped[Optional[float]] = mapped_column(Float)  # psi
    ecd: Mapped[Optional[float]] = mapped_column(Float)           # Equivalent circulating density g/cc
    mud_weight: Mapped[Optional[float]] = mapped_column(Float)    # g/cc
    flow_rate: Mapped[Optional[float]] = mapped_column(Float)     # l/min
    hook_load: Mapped[Optional[float]] = mapped_column(Float)     # tonnes
    temperature: Mapped[Optional[float]] = mapped_column(Float)   # °C

    # Relationships
    well: Mapped["Well"] = relationship("Well", back_populates="telemetry")


class RiskPrediction(Base):
    __tablename__ = "risk_predictions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    well_id: Mapped[int] = mapped_column(ForeignKey("wells.id"), nullable=False, index=True)
    depth: Mapped[Optional[float]] = mapped_column(Float)
    risk_type: Mapped[str] = mapped_column(String(100), nullable=False)
    # Mud Loss / Kick / Stuck Pipe / Torque Spike / Formation Instability / Cementing Risk
    probability: Mapped[Optional[float]] = mapped_column(Float)   # 0-100
    confidence: Mapped[Optional[float]] = mapped_column(Float)    # 0-100
    severity: Mapped[Optional[str]] = mapped_column(String(50))   # Low/Medium/High/Critical
    historical_frequency: Mapped[Optional[str]] = mapped_column(String(50))
    similarity_score: Mapped[Optional[float]] = mapped_column(Float)
    explanation: Mapped[Optional[str]] = mapped_column(Text)
    generated_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    well: Mapped["Well"] = relationship("Well", back_populates="risk_predictions")
