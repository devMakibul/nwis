"""
Geological Module — Basin, Field, Block, Formation, FormationInterval, Reservoir
"""
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, Float, Integer, ForeignKey, DateTime, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database.base import Base


class Basin(Base):
    __tablename__ = "basins"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    region: Mapped[Optional[str]] = mapped_column(String(100))
    state: Mapped[Optional[str]] = mapped_column(String(100))
    geological_age: Mapped[Optional[str]] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    fields: Mapped[list["Field"]] = relationship("Field", back_populates="basin")
    formations: Mapped[list["Formation"]] = relationship("Formation", back_populates="basin")


class Field(Base):
    __tablename__ = "fields"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    basin_id: Mapped[int] = mapped_column(ForeignKey("basins.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    operator: Mapped[Optional[str]] = mapped_column(String(200))
    latitude: Mapped[Optional[float]] = mapped_column(Float)
    longitude: Mapped[Optional[float]] = mapped_column(Float)
    discovery_year: Mapped[Optional[int]] = mapped_column(Integer)

    # Relationships
    basin: Mapped["Basin"] = relationship("Basin", back_populates="fields")
    blocks: Mapped[list["Block"]] = relationship("Block", back_populates="field")
    wells: Mapped[list["Well"]] = relationship("Well", back_populates="field")


class Block(Base):
    __tablename__ = "blocks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    field_id: Mapped[int] = mapped_column(ForeignKey("fields.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    contract_type: Mapped[Optional[str]] = mapped_column(String(100))
    operator: Mapped[Optional[str]] = mapped_column(String(200))
    partners: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    field: Mapped["Field"] = relationship("Field", back_populates="blocks")
    wells: Mapped[list["Well"]] = relationship("Well", back_populates="block")


class Formation(Base):
    __tablename__ = "formations"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    basin_id: Mapped[int] = mapped_column(ForeignKey("basins.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    geological_age: Mapped[Optional[str]] = mapped_column(String(100))
    lithology: Mapped[Optional[str]] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text)

    # Relationships
    basin: Mapped["Basin"] = relationship("Basin", back_populates="formations")
    intervals: Mapped[list["FormationInterval"]] = relationship("FormationInterval", back_populates="formation")
    reservoirs: Mapped[list["Reservoir"]] = relationship("Reservoir", back_populates="formation")


class FormationInterval(Base):
    __tablename__ = "formation_intervals"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    well_id: Mapped[int] = mapped_column(ForeignKey("wells.id"), nullable=False, index=True)
    formation_id: Mapped[int] = mapped_column(ForeignKey("formations.id"), nullable=False, index=True)
    top_depth: Mapped[float] = mapped_column(Float, nullable=False)
    bottom_depth: Mapped[float] = mapped_column(Float, nullable=False)
    lithology: Mapped[Optional[str]] = mapped_column(String(200))
    reservoir_quality: Mapped[Optional[str]] = mapped_column(String(50))  # Poor/Fair/Good/Excellent

    # Relationships
    well: Mapped["Well"] = relationship("Well", back_populates="formation_intervals")
    formation: Mapped["Formation"] = relationship("Formation", back_populates="intervals")


class Reservoir(Base):
    __tablename__ = "reservoirs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    formation_id: Mapped[int] = mapped_column(ForeignKey("formations.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    reservoir_type: Mapped[Optional[str]] = mapped_column(String(100))
    porosity: Mapped[Optional[float]] = mapped_column(Float)
    permeability: Mapped[Optional[float]] = mapped_column(Float)
    pressure: Mapped[Optional[float]] = mapped_column(Float)

    # Relationships
    formation: Mapped["Formation"] = relationship("Formation", back_populates="reservoirs")
