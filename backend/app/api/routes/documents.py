"""
Document Intelligence API routes.

Processing pipeline:
1. Upload → validate → save to disk → create DB record (status: Uploaded)
2. POST /process → real text extraction + AI event extraction (status: Processing → Extracting → Needs Approval)
3. GET /{id}/extracted-events → return extracted events for review
4. PATCH /{id}/extracted-events → update/delete events before commit
5. POST /{id}/commit → promote events to production DB (status: Completed)
6. POST /{id}/draft → save as draft only (status: Needs Approval)
7. DELETE /{id} → delete document + file
"""
import hashlib
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Optional, List

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, BackgroundTasks
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.base import get_db
from app.models.identity import User
from app.models.intelligence import Document, DocumentPage, DocumentEntity
from app.models.wells import Well
from app.models.geological import Basin, Field

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/documents", tags=["Document Intelligence"])

STORAGE_ROOT = Path(os.getenv("STORAGE_PATH", "/tmp/nwis_storage"))
STORAGE_ROOT.mkdir(parents=True, exist_ok=True)

SUPPORTED_MIME_TYPES = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/tiff": "tiff",
}

DOCUMENT_TYPES = [
    "Daily Drilling Report",
    "Drilling Summary Report",
    "Well Completion Report",
    "Geological Report",
    "Formation Report",
    "Reservoir Report",
    "Mud Logging Report",
    "Incident Report",
    "Lessons Learned Report",
    "Cementing Report",
    "Casing Report",
]

MAX_FILE_SIZE = 50 * 1024 * 1024


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# ─── Pydantic models ──────────────────────────────────────────

class ExtractedEventUpdate(BaseModel):
    event_type: str
    severity: str = "Low"
    start_depth: Optional[float] = None
    end_depth: Optional[float] = None
    description: Optional[str] = None
    cause: Optional[str] = None
    consequence: Optional[str] = None
    npt_hours: Optional[float] = None
    well_id: Optional[int] = None
    field_id: Optional[int] = None
    basin_id: Optional[int] = None
    formation_name: Optional[str] = None
    mitigation: Optional[str] = None
    lesson_learned: Optional[str] = None


class CommitRequest(BaseModel):
    events: List[ExtractedEventUpdate]
    page_contents: Optional[dict] = None  # {page_id: markdown_content}


# ─── Background Processing ────────────────────────────────────

async def _process_document(doc_id: int, file_path: str, mime_type: str, ai_provider: str):
    """Real document processing: extract text + AI event extraction using Vision LLMs."""
    from app.database.base import AsyncSessionLocal
    from app.documents.extractor import extract_document
    from app.documents.event_extractor import extract_from_vision, extract_events_from_text
    from app.documents.vision_utils import get_document_images_base64
    from app.config import settings
    import json

    async def set_status(status: str):
        async with AsyncSessionLocal() as session:
            doc = await session.get(Document, doc_id)
            if doc:
                doc.processing_status = status
                await session.commit()

    async def check_cancelled():
        async with AsyncSessionLocal() as session:
            doc = await session.get(Document, doc_id)
            return doc is None

    try:
        await set_status("Processing")
        if await check_cancelled(): return

        provider = ai_provider or settings.AI_PROVIDER
        is_ollama = provider == "ollama"
        base_url = f"{settings.OLLAMA_URL}/v1" if is_ollama else settings.OPENROUTER_BASE_URL
        model = settings.MODEL_NAME if is_ollama else "openrouter/free"
        api_key = settings.OPENROUTER_API_KEY or "sk-or-v1-dummy"

        path = Path(file_path)
        b64_images = get_document_images_base64(path, mime_type)

        extracted_events = []

        if b64_images:
            # Vision path: Use LLM for text
            async with AsyncSessionLocal() as session:
                doc = await session.get(Document, doc_id)
                if not doc: return
                doc.page_count = len(b64_images)
                
                for i, b64_img in enumerate(b64_images, 1):
                    result = await extract_from_vision(b64_img, provider, api_key, model, base_url)
                    
                    page = DocumentPage(
                        document_id=doc_id,
                        page_number=i,
                        raw_text=result.get("markdown_content", ""),
                        markdown_content=result.get("markdown_content", ""),
                        processing_status="Completed",
                    )
                    session.add(page)
                    await session.flush()
                        
                doc.processing_status = "Needs Approval"
                await session.commit()

        else:
            # Fallback path (e.g. DOCX): Extract text locally, then send to LLM
            await set_status("Extracting")
            pages = extract_document(path, mime_type)
            if await check_cancelled(): return

            async with AsyncSessionLocal() as session:
                doc = await session.get(Document, doc_id)
                if not doc: return
                doc.page_count = len(pages)
                for p in pages:
                    page = DocumentPage(
                        document_id=doc_id,
                        page_number=p["page_number"],
                        raw_text=p.get("raw_text", ""),
                        markdown_content=p.get("markdown_content", ""),
                        processing_status="Completed",
                    )
                    session.add(page)
                await session.commit()

            if await check_cancelled(): return
            
            async with AsyncSessionLocal() as session:
                doc = await session.get(Document, doc_id)
                if not doc: return
                doc.processing_status = "Needs Approval"
                await session.commit()

        logger.info("document_extraction_complete", doc_id=doc_id, events=len(extracted_events))

    except Exception as e:
        logger.error("document_processing_error", doc_id=doc_id, error=str(e))
        await set_status("Failed")


# ─── Routes ───────────────────────────────────────────────────

@router.post("/upload", summary="Upload a document")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_type: str = Form(...),
    well_id: Optional[int] = Form(None),
    ai_provider: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if document_type not in DOCUMENT_TYPES:
        raise HTTPException(status_code=400, detail=f"Invalid document type.")

    content = await file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File size exceeds 50MB limit")

    file_hash = _sha256(content)

    existing = await db.execute(select(Document).where(Document.file_hash == file_hash))
    existing_doc = existing.scalar_one_or_none()
    if existing_doc:
        raise HTTPException(
            status_code=409,
            detail={
                "message": "Document already exists in knowledge repository.",
                "existing_id": existing_doc.id,
                "existing_name": existing_doc.file_name,
                "uploaded_at": existing_doc.upload_date.isoformat(),
            },
        )

    file_dir = STORAGE_ROOT / "documents"
    file_dir.mkdir(parents=True, exist_ok=True)
    stored_path = file_dir / f"{file_hash[:16]}_{file.filename}"
    stored_path.write_bytes(content)

    mime_type = file.content_type or "application/octet-stream"
    doc = Document(
        well_id=well_id,
        document_type=document_type,
        file_name=file.filename or "unknown",
        original_path=str(stored_path),
        file_hash=file_hash,
        file_size=len(content),
        mime_type=mime_type,
        uploaded_by=current_user.id,
        processing_status="Uploaded",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # Start real processing in background
    background_tasks.add_task(
        _process_document, doc.id, str(stored_path), mime_type, ai_provider or ""
    )

    logger.info("document_uploaded", doc_id=doc.id, file=file.filename)

    return {
        "id": doc.id,
        "file_name": doc.file_name,
        "document_type": doc.document_type,
        "file_size": doc.file_size,
        "processing_status": doc.processing_status,
        "message": "Document uploaded. Processing started.",
    }


@router.get("/{doc_id}/file", summary="Download/view the original source document")
async def get_document_file(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    doc = await db.get(Document, doc_id)
    if not doc or not doc.original_path:
        raise HTTPException(status_code=404, detail="Document file not found")
        
    path = Path(doc.original_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="File missing on disk")
        
    return FileResponse(
        path=path,
        filename=doc.file_name,
        media_type=doc.mime_type or "application/octet-stream",
        content_disposition_type="inline"  # inline lets browser open PDFs directly
    )


@router.delete("/{doc_id}", summary="Delete a document and its file")
async def delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete file from disk
    if doc.original_path:
        try:
            Path(doc.original_path).unlink(missing_ok=True)
        except Exception:
            pass

    await db.delete(doc)
    await db.commit()
    return {"deleted": True, "id": doc_id}


@router.post("/{doc_id}/extract-events", summary="Extract events from parsed markdown")
async def extract_events(
    doc_id: int,
    ai_provider: str = Query(None),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.documents.event_extractor import extract_events_from_text
    from app.config import settings
    import json
    
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    pages_res = await db.execute(select(DocumentPage).where(DocumentPage.document_id == doc_id).order_by(DocumentPage.page_number))
    pages = pages_res.scalars().all()
    
    if not pages:
        raise HTTPException(status_code=400, detail="No pages found to extract events from")
        
    full_text = "\n\n".join(p.markdown_content or "" for p in pages)
    
    provider = ai_provider or settings.AI_PROVIDER
    is_ollama = provider == "ollama"
    base_url = f"{settings.OLLAMA_URL}/v1" if is_ollama else settings.OPENROUTER_BASE_URL
    model = settings.MODEL_NAME if is_ollama else "openrouter/free"
    api_key = settings.OPENROUTER_API_KEY or "sk-or-v1-dummy"
    
    extracted_events = await extract_events_from_text(
        full_text, provider, api_key, model, base_url
    )
    
    # Save entities
    first_page = pages[0]
    for ev in extracted_events:
        entity = DocumentEntity(
            document_page_id=first_page.id,
            entity_type="EXTRACTED_EVENT",
            entity_value=json.dumps(ev),
            confidence_score=80.0,
        )
        db.add(entity)
        
    await db.commit()
    
    return {"message": "Events extracted successfully"}

@router.get("/{doc_id}/extracted-events", summary="Get AI-extracted events for review")
async def get_extracted_events(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    import json

    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Fetch entity records with EXTRACTED_EVENT type
    pages_res = await db.execute(
        select(DocumentPage).where(DocumentPage.document_id == doc_id)
    )
    page_ids = [p.id for p in pages_res.scalars()]

    if not page_ids:
        return {"events": [], "status": doc.processing_status}

    entities_res = await db.execute(
        select(DocumentEntity)
        .where(
            DocumentEntity.document_page_id.in_(page_ids),
            DocumentEntity.entity_type == "EXTRACTED_EVENT",
        )
    )
    entities = entities_res.scalars().all()

    events = []
    for ent in entities:
        try:
            ev = json.loads(ent.entity_value)
            ev["_entity_id"] = ent.id
            events.append(ev)
        except Exception:
            pass

    return {"events": events, "status": doc.processing_status, "entity_count": len(events)}


@router.put("/{doc_id}/extracted-events", summary="Update extracted events before commit")
async def update_extracted_events(
    doc_id: int,
    events: List[dict],
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Replace all extracted events for a document (user edits before commit)."""
    import json

    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Find first page
    page_res = await db.execute(
        select(DocumentPage).where(DocumentPage.document_id == doc_id).limit(1)
    )
    first_page = page_res.scalar_one_or_none()
    if not first_page:
        raise HTTPException(status_code=400, detail="No pages found for document")

    # Delete existing extracted events
    existing_res = await db.execute(
        select(DocumentEntity).where(
            DocumentEntity.document_page_id == first_page.id,
            DocumentEntity.entity_type == "EXTRACTED_EVENT",
        )
    )
    for ent in existing_res.scalars():
        await db.delete(ent)

    # Re-insert updated events
    for ev in events:
        entity = DocumentEntity(
            document_page_id=first_page.id,
            entity_type="EXTRACTED_EVENT",
            entity_value=json.dumps(ev),
            confidence_score=95.0,  # user-verified
        )
        db.add(entity)

    await db.commit()
    return {"updated": len(events)}


@router.post("/{doc_id}/draft", summary="Save as draft (Needs Approval)")
async def save_draft(
    doc_id: int,
    body: CommitRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Save events as draft — not visible to AI, status set to Needs Approval."""
    import json

    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Update page contents if provided
    if body.page_contents:
        for page_id_str, content in body.page_contents.items():
            page = await db.get(DocumentPage, int(page_id_str))
            if page and page.document_id == doc_id:
                page.markdown_content = content

    # Save events as entities
    page_res = await db.execute(
        select(DocumentPage).where(DocumentPage.document_id == doc_id).limit(1)
    )
    first_page = page_res.scalar_one_or_none()

    if first_page:
        # Clear old
        existing_res = await db.execute(
            select(DocumentEntity).where(
                DocumentEntity.document_page_id == first_page.id,
                DocumentEntity.entity_type == "EXTRACTED_EVENT",
            )
        )
        for ent in existing_res.scalars():
            await db.delete(ent)

        for ev in body.events:
            entity = DocumentEntity(
                document_page_id=first_page.id,
                entity_type="EXTRACTED_EVENT",
                entity_value=json.dumps(ev.model_dump()),
                confidence_score=95.0,
            )
            db.add(entity)

    doc.processing_status = "Needs Approval"
    await db.commit()
    return {"status": "Needs Approval", "events_saved": len(body.events)}


@router.post("/{doc_id}/commit", summary="Commit document events to production DB")
async def commit_document(
    doc_id: int,
    body: CommitRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Commit reviewed events to DrillingEvent, Mitigation, and LessonLearned tables."""
    from app.models.operations import DrillingEvent, Mitigation, LessonLearned
    import json

    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Update page contents if provided
    if body.page_contents:
        for page_id_str, content in body.page_contents.items():
            page = await db.get(DocumentPage, int(page_id_str))
            if page and page.document_id == doc_id:
                page.markdown_content = content

    committed = 0
    errors = []

    for ev_data in body.events:
        well_id = ev_data.well_id
        if not well_id:
            errors.append(f"Skipped event '{ev_data.event_type}': no well_id")
            continue

        # Verify well exists
        well = await db.get(Well, well_id)
        if not well:
            errors.append(f"Skipped event '{ev_data.event_type}': well_id {well_id} not found")
            continue

        drilling_event = DrillingEvent(
            well_id=well_id,
            source_document_id=doc_id,
            event_type=ev_data.event_type,
            severity=ev_data.severity or "Low",
            start_depth=ev_data.start_depth,
            end_depth=ev_data.end_depth,
            description=ev_data.description,
            cause=ev_data.cause,
            consequence=ev_data.consequence,
            npt_hours=ev_data.npt_hours,
        )
        db.add(drilling_event)
        await db.flush()  # get the ID

        if ev_data.mitigation:
            mit = Mitigation(
                event_id=drilling_event.id,
                action_taken=ev_data.mitigation,
            )
            db.add(mit)

        if ev_data.lesson_learned:
            ll = LessonLearned(
                event_id=drilling_event.id,
                well_id=well_id,
                lesson_text=ev_data.lesson_learned,
            )
            db.add(ll)

        committed += 1

    doc.processing_status = "Completed"
    await db.commit()

    logger.info("document_committed", doc_id=doc_id, committed=committed, errors=len(errors))

    return {
        "status": "Completed",
        "committed_events": committed,
        "skipped": errors,
    }


@router.get("/basins-fields-wells", summary="Cascading basin/field/well selector data")
async def get_basins_fields_wells(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    """Returns all basins with their fields and wells for the event editor cascading dropdowns."""
    basins_res = await db.execute(select(Basin).order_by(Basin.name))
    basins = basins_res.scalars().all()

    fields_res = await db.execute(select(Field).order_by(Field.name))
    fields = fields_res.scalars().all()

    wells_res = await db.execute(select(Well).order_by(Well.well_name))
    wells = wells_res.scalars().all()

    return {
        "basins": [{"id": b.id, "name": b.name} for b in basins],
        "fields": [{"id": f.id, "name": f.name, "basin_id": f.basin_id} for f in fields],
        "wells": [{"id": w.id, "name": w.well_name, "field_id": w.field_id} for w in wells],
    }


@router.get("/historical-events", summary="List all committed drilling events for Historical Events page")
async def get_historical_events(
    basin_id: Optional[int] = None,
    field_id: Optional[int] = None,
    well_id: Optional[int] = None,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = Query(default=1000, le=2000),
    offset: int = Query(default=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.models.operations import DrillingEvent, Mitigation, LessonLearned

    q = (
        select(
            DrillingEvent,
            Well.well_name,
            Field.name.label("field_name"),
            Field.id.label("field_id"),
            Basin.name.label("basin_name"),
            Basin.id.label("basin_id"),
        )
        .outerjoin(Well, DrillingEvent.well_id == Well.id)
        .outerjoin(Field, Well.field_id == Field.id)
        .outerjoin(Basin, Field.basin_id == Basin.id)
        .order_by(DrillingEvent.severity.desc(), DrillingEvent.created_at.desc())
        .limit(limit)
        .offset(offset)
    )

    if well_id:
        q = q.where(DrillingEvent.well_id == well_id)
    if field_id:
        q = q.where(Well.field_id == field_id)
    if basin_id:
        q = q.where(Field.basin_id == basin_id)
    if event_type:
        q = q.where(DrillingEvent.event_type.ilike(f"%{event_type}%"))
    if severity:
        q = q.where(DrillingEvent.severity == severity)

    result = await db.execute(q)
    rows = result.all()

    events = []
    for row in rows:
        ev = row[0]
        # Fetch mitigations and lessons
        mits_res = await db.execute(
            select(Mitigation).where(Mitigation.event_id == ev.id)
        )
        lls_res = await db.execute(
            select(LessonLearned).where(LessonLearned.event_id == ev.id)
        )
        events.append({
            "id": ev.id,
            "event_type": ev.event_type,
            "severity": ev.severity,
            "start_depth": ev.start_depth,
            "end_depth": ev.end_depth,
            "description": ev.description,
            "cause": ev.cause,
            "consequence": ev.consequence,
            "npt_hours": ev.npt_hours,
            "well_id": ev.well_id,
            "well_name": row[1],
            "field_id": row[3],
            "field_name": row[2],
            "basin_id": row[5],
            "basin_name": row[4],
            "source_document_id": ev.source_document_id,
            "created_at": ev.created_at.isoformat() if ev.created_at else None,
            "mitigations": [{"action": m.action_taken, "result": m.result} for m in mits_res.scalars()],
            "lessons": [{"lesson": ll.lesson_text, "action": ll.recommended_action} for ll in lls_res.scalars()],
        })

    total = (await db.execute(select(func.count()).select_from(DrillingEvent))).scalar()
    return {"events": events, "total": total}


@router.get("/{doc_id}/historical-events/{event_id}", summary="Get single event detail")
async def get_event_detail(
    event_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.models.operations import DrillingEvent, Mitigation, LessonLearned

    ev = await db.get(DrillingEvent, event_id)
    if not ev:
        raise HTTPException(status_code=404, detail="Event not found")

    well = await db.get(Well, ev.well_id) if ev.well_id else None
    field = await db.get(Field, well.field_id) if well else None
    basin = await db.get(Basin, field.basin_id) if field else None

    mits = (await db.execute(select(Mitigation).where(Mitigation.event_id == ev.id))).scalars().all()
    lls = (await db.execute(select(LessonLearned).where(LessonLearned.event_id == ev.id))).scalars().all()

    return {
        "id": ev.id,
        "event_type": ev.event_type,
        "severity": ev.severity,
        "start_depth": ev.start_depth,
        "end_depth": ev.end_depth,
        "description": ev.description,
        "cause": ev.cause,
        "consequence": ev.consequence,
        "npt_hours": ev.npt_hours,
        "well_id": ev.well_id,
        "well_name": well.well_name if well else None,
        "field_id": field.id if field else None,
        "field_name": field.name if field else None,
        "basin_id": basin.id if basin else None,
        "basin_name": basin.name if basin else None,
        "source_document_id": ev.source_document_id,
        "mitigations": [{"id": m.id, "action": m.action_taken, "procedure": m.procedure, "result": m.result} for m in mits],
        "lessons": [{"id": ll.id, "lesson": ll.lesson_text, "action": ll.recommended_action} for ll in lls],
    }


# ─── Existing routes kept ─────────────────────────────────────

@router.get("", summary="List documents")
async def list_documents(
    well_id: Optional[int] = None,
    document_type: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = (
        select(
            Document.id, Document.file_name, Document.document_type,
            Document.file_size, Document.page_count, Document.processing_status,
            Document.upload_date, Document.well_id,
            Well.well_name.label("well_name"),
        )
        .outerjoin(Well, Document.well_id == Well.id)
        .order_by(Document.upload_date.desc())
        .limit(limit)
        .offset(offset)
    )
    if well_id:
        q = q.where(Document.well_id == well_id)
    if document_type:
        q = q.where(Document.document_type == document_type)
    if status:
        q = q.where(Document.processing_status == status)

    result = await db.execute(q)
    rows = result.mappings().all()
    return [dict(row) for row in rows]


@router.get("/types", summary="Supported document types")
async def get_document_types(_: User = Depends(get_current_user)):
    return {"document_types": DOCUMENT_TYPES}


@router.get("/stats", summary="Document statistics")
async def document_stats(db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    total = (await db.execute(select(func.count()).select_from(Document))).scalar()
    by_status = (await db.execute(
        select(Document.processing_status, func.count().label("cnt"))
        .group_by(Document.processing_status)
    )).all()
    by_type = (await db.execute(
        select(Document.document_type, func.count().label("cnt"))
        .group_by(Document.document_type)
    )).all()
    return {
        "total": total,
        "by_status": {r.processing_status: r.cnt for r in by_status},
        "by_type": {r.document_type: r.cnt for r in by_type},
    }


@router.get("/{doc_id}", summary="Document detail")
async def get_document(doc_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return {
        "id": doc.id,
        "file_name": doc.file_name,
        "document_type": doc.document_type,
        "file_hash": doc.file_hash,
        "file_size": doc.file_size,
        "mime_type": doc.mime_type,
        "page_count": doc.page_count,
        "processing_status": doc.processing_status,
        "upload_date": doc.upload_date.isoformat() if doc.upload_date else None,
        "well_id": doc.well_id,
    }


@router.get("/{doc_id}/pages", summary="Document pages")
async def get_pages(doc_id: int, db: AsyncSession = Depends(get_db), _: User = Depends(get_current_user)):
    doc = await db.get(Document, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    result = await db.execute(
        select(DocumentPage)
        .where(DocumentPage.document_id == doc_id)
        .order_by(DocumentPage.page_number)
    )
    pages = result.scalars().all()
    return [
        {
            "id": p.id,
            "page_number": p.page_number,
            "markdown_content": p.markdown_content,
            "raw_text": p.raw_text,
            "processing_status": p.processing_status,
        }
        for p in pages
    ]
