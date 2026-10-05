"""
All SQLAlchemy models — imported here to ensure they are registered
with the metadata and available for Alembic migrations.
"""
# Identity
from app.models.identity import Role, User

# Geological
from app.models.geological import Basin, Field, Block, Formation, FormationInterval, Reservoir

# Well Intelligence
from app.models.wells import Well, Wellbore, TrajectorySurvey

# Operational Knowledge
from app.models.operations import DrillingEvent, Mitigation, LessonLearned, WellSimilarityScore

# Document Intelligence & Live Operations
from app.models.intelligence import (
    Document, DocumentPage, DocumentEntity,
    KnowledgeEmbedding, KnowledgeReference,
    RigTelemetry, RiskPrediction,
)

# AI Assistant & Reporting
from app.models.assistant import ChatSession, ChatMessage, Report

__all__ = [
    "Role", "User",
    "Basin", "Field", "Block", "Formation", "FormationInterval", "Reservoir",
    "Well", "Wellbore", "TrajectorySurvey",
    "DrillingEvent", "Mitigation", "LessonLearned", "WellSimilarityScore",
    "Document", "DocumentPage", "DocumentEntity",
    "KnowledgeEmbedding", "KnowledgeReference",
    "RigTelemetry", "RiskPrediction",
    "ChatSession", "ChatMessage", "Report",
]
