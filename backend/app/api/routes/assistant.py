"""
AI Drilling Assistant routes.

Architecture:
- Full conversation management (CRUD for sessions)
- Two-phase agentic pipeline:
  Phase 1: LLM extracts structured intent/entities from the user question
  Phase 2: DB is queried using those entities
  Phase 3: LLM generates a grounded answer using real DB data + chat history
"""
import uuid
import json
from datetime import datetime
from typing import Optional
import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.base import get_db
from app.models.identity import User
from app.models.assistant import ChatSession, ChatMessage
from app.models.wells import Well, Wellbore
from app.models.geological import Basin, Field, Formation
from app.models.operations import DrillingEvent, LessonLearned, Mitigation
from app.config import settings
import httpx

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/assistant", tags=["AI Drilling Assistant"])

# ─── Request/Response Models ──────────────────────────────────

class SessionCreate(BaseModel):
    title: Optional[str] = "New Conversation"
    context_type: Optional[str] = "Global"
    context_id: Optional[int] = None


class SessionUpdate(BaseModel):
    title: str


class ChatRequest(BaseModel):
    message: str
    context_type: Optional[str] = "Global"
    context_id: Optional[int] = None
    ai_provider: Optional[str] = None
    extra_context: Optional[str] = None


# ─── LLM Client ───────────────────────────────────────────────

async def call_llm(
    messages: list[dict],
    ai_provider: Optional[str] = None,
    temperature: float = 0.2,
    max_tokens: int = 1200,
    response_format: Optional[dict] = None,
) -> str:
    """Single shared function to call the configured LLM."""
    api_key = settings.OPENROUTER_API_KEY or "sk-or-v1-dummy-key"
    provider = ai_provider or settings.AI_PROVIDER
    is_ollama = provider == "ollama"

    if is_ollama:
        base_url = f"{settings.OLLAMA_URL}/v1"
        model = settings.MODEL_NAME
    else:
        base_url = settings.OPENROUTER_BASE_URL
        model = "openrouter/free"

    payload: dict = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    # Only OpenAI-compatible endpoints support response_format
    if response_format and not is_ollama:
        payload["response_format"] = response_format

    headers = {"Authorization": f"Bearer {api_key}"}

    async with httpx.AsyncClient() as client:
        res = await client.post(
            f"{base_url}/chat/completions",
            json=payload,
            headers=headers,
            timeout=300.0,
        )
        res.raise_for_status()
        return res.json()["choices"][0]["message"]["content"]


# ─── Phase 1: Intent & Entity Extraction ─────────────────────

async def extract_intent(question: str, entity_catalog: list, ai_provider: Optional[str] = None) -> dict:
    """
    Ask the LLM to parse the user question against the real DB entity catalog.
    Passing the catalog lets the LLM spell-correct typos like 'Nararkatia' -> 'Naharkatiya'.
    """
    catalog_str = ", ".join(f'"{n}"' for n in entity_catalog[:80])
    system = (
        "You are a query parser for an oil & gas drilling database. "
        "Given a user question, extract the intent and named entities and return ONLY valid JSON. "
        "Do not include any explanation or markdown. Just return raw JSON.\n\n"
        "The JSON must have these keys:\n"
        '- "query_type": one of ["incidents", "wells", "formations", "risks", "basins", "lessons", "general"]\n'
        '- "entity_names": list of entity names from the CATALOG that the user is asking about. '
        "Match and correct typos: e.g. 'Nararkatia' -> 'Naharkatiya', 'basein' -> 'Bassein'. "
        "Return EXACT spellings from the catalog.\n"
        '- "event_type_filter": one of "Kick", "Lost Circulation", "Stuck Pipe", "Torque Spike", "Formation Instability" if relevant, else null.\n'
        '- "want_all_events": true if user asks broadly without a specific entity, false otherwise.\n\n'
        f"CATALOG:\n[{catalog_str}]\n\n"
        'Example: {"query_type": "general", "entity_names": ["Naharkatiya"], "event_type_filter": null, "want_all_events": false}'
    )
    try:
        raw = await call_llm(
            [{"role": "system", "content": system}, {"role": "user", "content": f"Question: {question}"}],
            ai_provider=ai_provider,
            temperature=0.0,
            max_tokens=300,
        )
        raw = raw.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        return json.loads(raw.strip())
    except Exception as e:
        logger.warning("intent_extraction_failed", error=str(e))
        return {"query_type": "general", "entity_names": [], "event_type_filter": None, "want_all_events": True}


def _fuzzy_match_entity(query_word: str, candidates: list, threshold: float = 0.70) -> list:
    """Fuzzy match query_word against candidates as a safety net after LLM extraction."""
    import difflib
    q = query_word.lower()
    matches = []
    for c in candidates:
        cl = c.lower()
        if q in cl or cl in q:
            matches.append(c)
            continue
        if difflib.SequenceMatcher(None, q, cl).ratio() >= threshold:
            matches.append(c)
            continue
        for part in cl.split():
            if len(part) > 3 and difflib.SequenceMatcher(None, q, part).ratio() >= threshold:
                matches.append(c)
                break
    return matches


# ─── Phase 2: Targeted DB Retrieval ──────────────────────────

async def retrieve_context(
    question: str,
    context_type: str,
    context_id: Optional[int],
    db: AsyncSession,
    ai_provider: Optional[str] = None,
) -> dict:
    """
    Two-phase retrieval:
    1. Use LLM to extract intent + entities from the question.
    2. Run targeted SQL queries based on those entities.
    Falls back to broad queries if no specific entities are found.
    """
    context = {
        "wells": [],
        "events": [],
        "lessons": [],
        "formations": [],
        "basins": [],
        "mitigations": [],
    }

    # ── Explicit context selectors (Well / Formation / Field) ──
    if context_type == "Well" and context_id:
        well_res = await db.execute(select(Well).where(Well.id == context_id))
        well = well_res.scalar_one_or_none()
        if well:
            context["wells"].append({
                "id": well.id, "name": well.well_name, "status": well.well_status,
                "depth": well.total_depth, "trajectory": well.well_trajectory,
                "hydrocarbon": well.hydrocarbon_type,
            })
            # Events for this well
            ev_res = await db.execute(
                select(DrillingEvent)
                .where(DrillingEvent.well_id == context_id)
                .order_by(DrillingEvent.severity.desc())
                .limit(10)
            )
            context["events"] = [
                {"type": e.event_type, "severity": e.severity, "depth": e.start_depth,
                 "npt": e.npt_hours, "cause": e.cause, "well": well.well_name}
                for e in ev_res.scalars()
            ]
            # Lessons for this well
            ll_res = await db.execute(
                select(LessonLearned).where(LessonLearned.well_id == context_id).limit(5)
            )
            context["lessons"] = [
                {"lesson": ll.lesson_text, "well": well.well_name,
                 "recommended_action": ll.recommended_action}
                for ll in ll_res.scalars()
            ]

    elif context_type == "Formation" and context_id:
        form_res = await db.execute(select(Formation).where(Formation.id == context_id))
        formation = form_res.scalar_one_or_none()
        if formation:
            context["formations"].append({
                "id": formation.id, "name": formation.name,
                "age": formation.geological_age, "lithology": formation.lithology,
                "description": formation.description,
            })
            ev_res = await db.execute(
                select(DrillingEvent, Well.well_name.label("well_name"))
                .join(Well, DrillingEvent.well_id == Well.id)
                .where(DrillingEvent.formation_name.ilike(f"%{formation.name}%"))
                .limit(8)
            )
            context["events"] = [
                {"type": e.event_type, "severity": e.severity, "depth": e.start_depth,
                 "npt": e.npt_hours, "well": wname}
                for e, wname in ev_res
            ]

    # ── Build entity catalog from DB for LLM-guided matching ──
    all_fields_res = await db.execute(select(Field.name))
    all_wells_res = await db.execute(select(Well.well_name))
    all_basins_res = await db.execute(select(Basin.name))
    all_forms_res = await db.execute(select(Formation.name))
    entity_catalog = (
        [r[0] for r in all_fields_res] +
        [r[0] for r in all_wells_res] +
        [r[0] for r in all_basins_res] +
        [r[0] for r in all_forms_res]
    )

    # ── Phase 1: LLM Intent Extraction with catalog ──
    intent = await extract_intent(question, entity_catalog=entity_catalog, ai_provider=ai_provider)
    query_type = intent.get("query_type", "general")
    entity_names = intent.get("entity_names", [])
    event_type_filter = intent.get("event_type_filter")
    want_all_events = intent.get("want_all_events", False)

    logger.info("intent_extracted", query_type=query_type, entity_names=entity_names,
                event_type_filter=event_type_filter, want_all_events=want_all_events)

    # ── Safety net: if LLM returned empty entity_names, try fuzzy matching ourselves ──
    if not entity_names:
        q_words = [w.strip(".,?!-") for w in question.split() if len(w.strip(".,?!-")) > 3]
        for word in q_words:
            fuzzy_hits = _fuzzy_match_entity(word, entity_catalog)
            entity_names.extend(h for h in fuzzy_hits if h not in entity_names)
        if entity_names:
            logger.info("fuzzy_fallback_matched", matched=entity_names)

    # ── Phase 2: Targeted Entity Queries ──
    matched_well_ids = set()

    for entity in entity_names:
        # Search Fields
        field_res = await db.execute(
            select(Field).where(Field.name.ilike(f"%{entity}%"))
        )
        for field in field_res.scalars():
            # Fetch all wells in that field
            fw_res = await db.execute(
                select(Well).where(Well.field_id == field.id)
            )
            fw_list = list(fw_res.scalars())
            for w in fw_list:
                if not any(cw["id"] == w.id for cw in context["wells"]):
                    context["wells"].append({
                        "id": w.id, "name": w.well_name, "status": w.well_status,
                        "field": field.name, "depth": w.total_depth,
                    })
                matched_well_ids.add(w.id)

        # Search Wells
        well_res = await db.execute(
            select(Well).where(Well.well_name.ilike(f"%{entity}%"))
        )
        for w in well_res.scalars():
            if not any(cw["id"] == w.id for cw in context["wells"]):
                context["wells"].append({
                    "id": w.id, "name": w.well_name, "status": w.well_status,
                    "depth": w.total_depth,
                })
            matched_well_ids.add(w.id)

        # Search Basins
        basin_res = await db.execute(
            select(Basin, func.count(Field.id).label("field_count"))
            .outerjoin(Field, Field.basin_id == Basin.id)
            .where(Basin.name.ilike(f"%{entity}%"))
            .group_by(Basin.id)
        )
        for b, fc in basin_res:
            if not any(cb["name"] == b.name for cb in context["basins"]):
                context["basins"].append({"name": b.name, "state": b.state,
                                          "age": b.geological_age, "fields": fc})
            # Also grab wells for basins
            bf_res = await db.execute(select(Field).where(Field.basin_id == b.id))
            for field in bf_res.scalars():
                fw_res = await db.execute(select(Well).where(Well.field_id == field.id))
                for w in fw_res.scalars():
                    matched_well_ids.add(w.id)

        # Search Formations
        form_res = await db.execute(
            select(Formation).where(Formation.name.ilike(f"%{entity}%"))
        )
        for f in form_res.scalars():
            if not any(cf["name"] == f.name for cf in context["formations"]):
                context["formations"].append({
                    "id": f.id, "name": f.name, "age": f.geological_age,
                    "lithology": f.lithology, "description": f.description,
                })

    # ── Fetch events for matched wells or all events if want_all ──
    ev_q = (
        select(DrillingEvent, Well.well_name.label("well_name"))
        .join(Well, DrillingEvent.well_id == Well.id)
    )
    if matched_well_ids:
        ev_q = ev_q.where(DrillingEvent.well_id.in_(matched_well_ids))
    elif not want_all_events and query_type not in ("incidents", "risks", "lessons"):
        # No entities found and user didn't ask broadly — don't flood with all events
        ev_q = None

    if ev_q is not None:
        if event_type_filter:
            ev_q = ev_q.where(DrillingEvent.event_type.ilike(f"%{event_type_filter}%"))
        ev_q = ev_q.order_by(DrillingEvent.severity.desc()).limit(20)

        ev_res = await db.execute(ev_q)
        for ev, wname in ev_res:
            dup = any(
                ce["type"] == ev.event_type and ce["well"] == wname and ce.get("depth") == ev.start_depth
                for ce in context["events"]
            )
            if not dup:
                context["events"].append({
                    "type": ev.event_type, "severity": ev.severity,
                    "well": wname, "depth": ev.start_depth,
                    "npt": ev.npt_hours, "cause": ev.cause,
                })

    # ── Fetch lessons ──
    if not context["lessons"] and (matched_well_ids or want_all_events):
        ll_q = (
            select(LessonLearned, Well.well_name.label("well_name"))
            .join(Well, LessonLearned.well_id == Well.id)
        )
        if matched_well_ids:
            ll_q = ll_q.where(LessonLearned.well_id.in_(matched_well_ids))
        ll_q = ll_q.limit(5)
        ll_res = await db.execute(ll_q)
        context["lessons"] = [
            {"lesson": ll.lesson_text, "well": wname,
             "recommended_action": ll.recommended_action}
            for ll, wname in ll_res
        ]

    return context, intent


# ─── Phase 3: Answer Generation ──────────────────────────────

async def build_answer(
    question: str,
    context: dict,
    intent: dict,
    chat_history: list,
    ai_provider: Optional[str] = None,
) -> tuple[str, list]:
    """
    Given the retrieved DB context, ask the LLM to produce a final, grounded answer.
    The LLM sees real data — no hardcoded templates.
    """
    sources = list({f"Well: {ev['well']}" for ev in context["events"] if ev.get("well")})

    # Serialize context as a clean text block for the LLM
    ctx_parts = []

    if context["wells"]:
        ctx_parts.append("### Wells\n" + "\n".join(
            f"- **{w['name']}** (status: {w.get('status','?')}, depth: {w.get('depth','?')}m, field: {w.get('field','?')})"
            for w in context["wells"]
        ))

    if context["formations"]:
        ctx_parts.append("### Formations\n" + "\n".join(
            f"- **{f['name']}** — {f.get('lithology','?')}, Age: {f.get('age','?')}\n  {f.get('description','')}"
            for f in context["formations"]
        ))

    if context["basins"]:
        ctx_parts.append("### Basins\n" + "\n".join(
            f"- **{b['name']}** ({b.get('state','?')}) — {b.get('fields',0)} fields, Age: {b.get('age','?')}"
            for b in context["basins"]
        ))

    if context["events"]:
        rows = ["| # | Event Type | Severity | Well | Depth | NPT (h) | Cause |",
                "|---|---|---|---|---|---|---|"]
        for i, ev in enumerate(context["events"], 1):
            rows.append(
                f"| {i} | {ev.get('type','—')} | {ev.get('severity','—')} | "
                f"{ev.get('well','—')} | {ev.get('depth','—')}m | "
                f"{ev.get('npt',0) or 0:.1f} | {ev.get('cause','—') or '—'} |"
            )
        ctx_parts.append("### Drilling Incidents / Events\n" + "\n".join(rows))

    if context["lessons"]:
        ctx_parts.append("### Lessons Learned\n" + "\n".join(
            f"- **{ll.get('well','?')}:** {ll['lesson']}"
            + (f"\n  *Recommendation:* {ll['recommended_action']}" if ll.get("recommended_action") else "")
            for ll in context["lessons"]
        ))

    if not ctx_parts:
        ctx_parts.append(
            "*(The NWIS database returned no records matching the specific entities or topics in this query. "
            "Use your general domain knowledge about Indian oil & gas operations to help the user, "
            "and clearly state that this is based on general knowledge rather than NWIS records.)*"
        )

    context_block = "\n\n".join(ctx_parts)

    system_prompt = (
        "You are NWIS AI, an expert AI Drilling Assistant for the eRTMAC-NWIS platform "
        "(National Well Intelligence System for India). "
        "You have been given REAL DATA retrieved from the NWIS database. "
        "Answer the user's question using this data. Be specific, cite wells and events by name. "
        "If data is present, use it — don't say you don't have data. "
        "Format your response in clean, well-structured Markdown. "
        "Use tables for tabular data, bold for key terms. "
        "If the database returned no records, say so clearly and give relevant general knowledge."
    )

    # Build message history: system + past messages + current grounded user message
    llm_messages = [{"role": "system", "content": system_prompt}]
    for m in (chat_history or [])[:-1]:  # exclude latest user msg (provided below with context)
        llm_messages.append({"role": m.role, "content": m.message})

    user_prompt = (
        f"## Retrieved NWIS Database Context\n\n{context_block}\n\n"
        f"---\n\n"
        f"## User Question\n\n{question}"
    )
    llm_messages.append({"role": "user", "content": user_prompt})

    try:
        answer = await call_llm(
            llm_messages,
            ai_provider=ai_provider,
            temperature=0.3,
            max_tokens=1500,
        )
    except Exception as e:
        logger.error("llm_answer_generation_failed", error=repr(e))
        answer = (
            f"⚠️ **AI Generation Error:** The language model failed to respond.\n\n"
            f"**Raw database context retrieved:**\n\n{context_block}\n\n"
            f"*Error: {repr(e)}*"
        )

    return answer, sources


# ─── Session Routes ───────────────────────────────────────────

@router.get("/sessions", summary="List chat sessions for current user")
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .limit(50)
    )
    sessions = result.scalars().all()
    return [
        {
            "id": s.id,
            "title": s.title,
            "context_type": s.context_type,
            "context_id": s.context_id,
            "created_at": s.created_at.isoformat(),
            "updated_at": s.updated_at.isoformat(),
        }
        for s in sessions
    ]


@router.post("/sessions", summary="Create a new chat session")
async def create_session(
    body: SessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = ChatSession(
        user_id=current_user.id,
        title=body.title or "New Conversation",
        context_type=body.context_type or "Global",
        context_id=body.context_id,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return {"id": session.id, "title": session.title, "context_type": session.context_type}


@router.patch("/sessions/{session_id}", summary="Rename a session")
async def rename_session(
    session_id: int,
    body: SessionUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    session.title = body.title
    await db.commit()
    return {"id": session.id, "title": session.title}


@router.delete("/sessions/{session_id}", summary="Delete a session")
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
    return {"deleted": True}


@router.get("/sessions/{session_id}/messages", summary="Get messages in a session")
async def get_messages(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    return [
        {
            "id": m.id,
            "role": m.role,
            "message": m.message,
            "sources": json.loads(m.sources) if m.sources else [],
            "created_at": m.created_at.isoformat(),
        }
        for m in messages
    ]


@router.post("/sessions/{session_id}/chat", summary="Send a message and get AI response")
async def chat(
    session_id: int,
    body: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = await db.get(ChatSession, session_id)
    if not session or session.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Session not found")

    # Store user message immediately
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        message=body.message,
    )
    db.add(user_msg)
    await db.flush()

    # Fetch chat history for conversational context (before new user msg)
    history_res = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
        .limit(20)
    )
    chat_history = history_res.scalars().all()

    context_type = body.context_type or session.context_type or "Global"
    context_id = body.context_id or session.context_id
    ai_provider = body.ai_provider

    # Phase 1 + 2: Extract intent, query DB
    full_message_for_llm = body.message
    if body.extra_context:
        full_message_for_llm = f"{body.message}\n\n[USER PROVIDED EXPLICIT CONTEXT]\n{body.extra_context}"

    context, intent = await retrieve_context(
        full_message_for_llm, context_type, context_id, db, ai_provider=ai_provider
    )

    # Phase 3: Generate grounded answer
    response_text, sources = await build_answer(
        full_message_for_llm, context, intent, chat_history, ai_provider=ai_provider
    )

    # Auto-title session from first message
    if session.title == "New Conversation":
        words = body.message.split()
        session.title = " ".join(words[:8]) + ("…" if len(words) > 8 else "")
        session.updated_at = datetime.utcnow()

    # Persist assistant reply
    asst_msg = ChatMessage(
        session_id=session_id,
        role="assistant",
        message=response_text,
        sources=json.dumps(sources) if sources else None,
    )
    db.add(asst_msg)
    await db.commit()

    logger.info("chat_done", session_id=session_id, events=len(context["events"]),
                wells=len(context["wells"]), intent=intent.get("query_type"))

    return {
        "id": asst_msg.id,
        "role": "assistant",
        "message": response_text,
        "sources": sources,
        "created_at": asst_msg.created_at.isoformat(),
    }


@router.get("/context/wells", summary="Searchable well list for context selector")
async def get_context_wells(
    search: Optional[str] = None,
    limit: int = Query(default=20, le=50),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = (
        select(Well.id, Well.well_name, Well.well_status, Field.name.label("field_name"))
        .join(Field, Well.field_id == Field.id)
        .order_by(Well.well_name)
        .limit(limit)
    )
    if search:
        q = q.where(or_(Well.well_name.ilike(f"%{search}%"), Field.name.ilike(f"%{search}%")))
    result = await db.execute(q)
    return [dict(row._mapping) for row in result]
