"""
Live Rig Intelligence & Telemetry Simulator

Provides:
- GET  /api/live/well/{well_id}         — current drill state snapshot
- GET  /api/live/risks/{well_id}        — predicted risks ahead of bit
- POST /api/live/sim/{well_id}/start    — start/reset simulator
- POST /api/live/sim/{well_id}/advance  — advance depth by one step
- WS   /ws/telemetry/{well_id}          — real-time telemetry stream
"""
import asyncio
import json
import math
import random
import uuid as _uuid
from datetime import datetime
from typing import Optional, List

import structlog
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Body
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.base import get_db
from app.models.identity import User
from app.models.wells import Well
from app.models.geological import Formation
from app.models.operations import DrillingEvent
from app.models.intelligence import RiskPrediction

logger = structlog.get_logger(__name__)

router = APIRouter(prefix="/live", tags=["Live Rig Intelligence"])
ws_router = APIRouter(tags=["WebSocket"])

# ─── In-memory simulator state (per well) ────────────────────
# In production this would be Redis — here a simple dict suffices for demo
_simulators: dict[int, dict] = {}


def _get_or_create_sim(well_id: int, total_depth: float = 4000.0) -> dict:
    if well_id not in _simulators:
        _simulators[well_id] = {
            "well_id": well_id,
            "current_depth": 0.0,
            "total_depth": total_depth,
            "rop": 12.5,           # m/h Rate of Penetration
            "wob": 18.0,           # tonnes Weight on Bit
            "rpm": 120.0,
            "torque": 8.5,         # kNm
            "mud_weight": 1.35,    # sg
            "ecd": 1.42,           # sg
            "flow_rate": 1800.0,   # lpm
            "standpipe_pressure": 220.0,  # bar
            "hookload": 145.0,     # tonnes
            "pit_volume": 285.0,   # m³
            "temp_in": 35.0,       # °C
            "temp_out": 58.0,      # °C
            "gas_units": 12.0,     # units
            "current_formation": "Surface",
            "is_running": False,
            "mode": "Auto",
            "alerts": [],
            "step_count": 0,
        }
    return _simulators[well_id]


def _formation_at_depth(depth: float) -> tuple[str, float, float]:
    """Returns (formation_name, pore_pressure_gg, frac_gradient_gg) at given depth."""
    intervals = [
        (0,    200,  "Quaternary Alluvium", 1.00, 1.55),
        (200,  600,  "Tipam Formation",     1.02, 1.60),
        (600,  1200, "Bokabil Formation",   1.05, 1.62),
        (1200, 1800, "Bhuban Formation",    1.08, 1.65),
        (1800, 2600, "Barail Formation",    1.12, 1.68),
        (2600, 3400, "Kopili Formation",    1.18, 1.70),
        (3400, 4000, "Sylhet Formation",    1.22, 1.72),
        (4000, 9999, "Basement",            1.25, 1.75),
    ]
    for top, bot, name, pp, fg in intervals:
        if top <= depth < bot:
            return name, pp, fg
    return "Unknown", 1.00, 1.55


def _noise(base: float, pct: float = 0.02) -> float:
    return base * (1 + random.uniform(-pct, pct))


def _advance_sim(sim: dict, depth_increment: float = 5.0) -> dict:
    """Advance simulation one depth step with realistic parameter evolution."""
    sim["current_depth"] = min(
        sim["current_depth"] + depth_increment,
        sim["total_depth"],
    )
    depth = sim["current_depth"]

    formation, pp_gg, fg_gg = _formation_at_depth(depth)
    sim["current_formation"] = formation

    # Realistic parameter drift based on depth and formation
    depth_factor = depth / 4000.0  # 0–1

    # Increase mud weight near overpressured zones
    target_mw = 1.25 + depth_factor * 0.25 + random.uniform(-0.02, 0.02)
    sim["mud_weight"] = round(min(target_mw, fg_gg - 0.05), 3)
    sim["ecd"] = round(sim["mud_weight"] + random.uniform(0.05, 0.12), 3)

    # ROP slows with depth (harder rock)
    sim["rop"] = round(_noise(max(4.0, 18.0 - depth_factor * 12.0), 0.08), 1)

    # WOB increases in harder formations
    sim["wob"] = round(_noise(15.0 + depth_factor * 10.0, 0.05), 1)

    # RPM stable with slight variation
    sim["rpm"] = round(_noise(115.0, 0.04), 0)

    # Torque increases significantly in sticky formations
    torque_base = 7.5 + depth_factor * 8.0
    if formation in ("Barail Formation", "Kopili Formation"):
        torque_base *= 1.25  # These formations are notorious for torque issues
    sim["torque"] = round(_noise(torque_base, 0.08), 1)

    # Standpipe pressure
    sim["standpipe_pressure"] = round(_noise(190 + depth_factor * 60, 0.04), 1)

    # Hookload (BHA weight in air)
    sim["hookload"] = round(100 + depth_factor * 80 + random.uniform(-5, 5), 1)

    # Pit volume — small fluctuations, loss in high-risk zones
    pit_delta = random.uniform(-2.5, 1.5)
    if formation in ("Barail Formation",) and depth > 2000:
        pit_delta -= random.uniform(0, 4.0)  # Simulate mud loss
    sim["pit_volume"] = round(max(220.0, sim["pit_volume"] + pit_delta), 1)

    # Temperature gradient
    sim["temp_out"] = round(35 + depth_factor * 65 + random.uniform(-2, 2), 1)

    # Gas units spike occasionally in reservoir sections
    if formation in ("Barail Formation", "Sylhet Formation"):
        sim["gas_units"] = round(max(0, random.gauss(45, 20)), 1)
    else:
        sim["gas_units"] = round(max(0, random.gauss(8, 5)), 1)

    # ── Alert generation ─────────────────────────────────────
    alerts = []
    if sim["ecd"] > fg_gg - 0.05:
        alerts.append({
            "type": "critical",
            "message": f"ECD {sim['ecd']:.2f}sg approaching fracture gradient {fg_gg:.2f}sg",
            "parameter": "ECD",
        })
    if sim["pit_volume"] < 255:
        alerts.append({
            "type": "warning",
            "message": f"Pit volume low: {sim['pit_volume']:.0f}m³ — possible mud loss",
            "parameter": "Pit Volume",
        })
    if sim["torque"] > 18:
        alerts.append({
            "type": "warning",
            "message": f"High torque {sim['torque']:.1f}kNm in {formation}",
            "parameter": "Torque",
        })
    if sim["gas_units"] > 80:
        alerts.append({
            "type": "critical",
            "message": f"High gas units {sim['gas_units']:.0f} — possible kick indicator",
            "parameter": "Gas Units",
        })
    sim["alerts"] = alerts
    sim["step_count"] += 1
    sim["timestamp"] = datetime.utcnow().isoformat()

    return sim


def _compute_risks(sim: dict, events_by_type: dict) -> list[dict]:
    """
    Compute risk predictions ahead of current bit depth.
    Combines: formation knowledge + historical event frequency + telemetry trends.
    """
    depth = sim["current_depth"]
    formation = sim["current_formation"]

    # Look ahead windows
    look_ahead = [
        {"window": "Next 100m", "depth_start": depth, "depth_end": depth + 100},
        {"window": "100–300m ahead", "depth_start": depth + 100, "depth_end": depth + 300},
        {"window": "300–600m ahead", "depth_start": depth + 300, "depth_end": depth + 600},
    ]

    risk_matrix = {
        "Barail Formation":  [
            ("Lost Circulation", 0.78, "High",     "Naturally fractured sandstone intervals"),
            ("Stuck Pipe",       0.65, "Moderate", "Reactive shale intercalations"),
            ("Formation Instability", 0.52, "Moderate", "Swelling clay content"),
        ],
        "Kopili Formation":  [
            ("Kick",             0.71, "High",     "Overpressured carbonate lenses"),
            ("Torque Spike",     0.68, "Moderate", "Interbedded hard and soft layers"),
            ("Lost Circulation", 0.44, "Low",      "Fractures in limestone intervals"),
        ],
        "Sylhet Formation":  [
            ("Kick",             0.82, "Critical", "Carbonate reservoir with high pore pressure"),
            ("Lost Circulation", 0.55, "High",     "Vuggy porosity in limestone"),
        ],
        "Bhuban Formation":  [
            ("Stuck Pipe",       0.61, "Moderate", "Thick shale sections"),
            ("Torque Spike",     0.48, "Low",      "Interbedded sandstone"),
        ],
    }

    # Telemetry-based boosters
    ecd_boost = max(0, (sim["ecd"] - 1.5) * 0.5)
    torque_boost = max(0, (sim["torque"] - 12) * 0.02)
    gas_boost = max(0, (sim["gas_units"] - 30) * 0.005)
    pit_boost = max(0, (285 - sim["pit_volume"]) * 0.01)

    base_risks = risk_matrix.get(formation, [
        ("Stuck Pipe", 0.30, "Low", "General drilling hazard"),
    ])

    risks = []
    for i, window in enumerate(look_ahead):
        window_risks = []
        for risk_type, base_conf, severity, evidence in base_risks:
            # Apply telemetry boost and depth decay for further windows
            decay = 1.0 - i * 0.15
            boost = ecd_boost + torque_boost + gas_boost + pit_boost
            confidence = min(0.98, (base_conf + boost) * decay)

            # Historical frequency from seeded events
            hist_count = events_by_type.get(risk_type, 0)

            window_risks.append({
                "risk_type": risk_type,
                "depth_start": round(window["depth_start"], 0),
                "depth_end": round(window["depth_end"], 0),
                "window": window["window"],
                "confidence": round(confidence * 100, 1),
                "severity": severity,
                "formation": formation,
                "evidence": evidence,
                "historical_frequency": hist_count,
            })

        # Only include top risk per window
        window_risks.sort(key=lambda x: x["confidence"], reverse=True)
        risks.extend(window_risks[:2])

    return risks


# ─── REST Endpoints ───────────────────────────────────────────

@router.get("/well/{well_id}", summary="Current drill state snapshot")
async def get_live_state(
    well_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    well = await db.get(Well, well_id)
    if not well:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Well not found")

    sim = _get_or_create_sim(well_id, float(well.total_depth or 4000))
    formation, pp_gg, fg_gg = _formation_at_depth(sim["current_depth"])
    sim["current_formation"] = formation
    return {**sim, "pore_pressure_gg": pp_gg, "frac_gradient_gg": fg_gg}


@router.get("/risks/{well_id}", summary="Predicted risks ahead of bit")
async def get_risks(
    well_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    sim = _get_or_create_sim(well_id)

    # Get event type frequencies for this well's formation region
    ev_result = await db.execute(
        select(DrillingEvent.event_type, func.count().label("cnt"))
        .group_by(DrillingEvent.event_type)
    )
    events_by_type = {row.event_type: row.cnt for row in ev_result}

    return _compute_risks(sim, events_by_type)


@router.post("/risks/{well_id}/persist", summary="Save AI-generated risks to database")
async def persist_risks(
    well_id: int,
    risks: List[dict] = Body(...),
    simulation_run_id: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """
    Persist a batch of AI-generated risk predictions to the database.
    Idempotent: duplicates at (well_id, depth, risk_type, simulation_run_id) are skipped.
    """
    run_id = simulation_run_id or str(_uuid.uuid4())
    saved = 0
    for r in risks:
        # Check for existing entry to avoid duplicates
        existing = await db.execute(
            select(RiskPrediction).where(
                RiskPrediction.well_id == well_id,
                RiskPrediction.depth == r.get("depth_start"),
                RiskPrediction.risk_type == r.get("risk_type"),
            ).limit(1)
        )
        if existing.scalar_one_or_none():
            continue
        rp = RiskPrediction(
            well_id=well_id,
            depth=r.get("depth_start"),
            risk_type=r.get("risk_type"),
            probability=r.get("confidence"),
            confidence=r.get("confidence"),
            severity=r.get("severity"),
            explanation=r.get("evidence", ""),
            historical_frequency=str(r.get("historical_frequency", 0)),
            generated_time=datetime.utcnow(),
        )
        db.add(rp)
        saved += 1
    await db.commit()
    return {"ok": True, "saved": saved, "simulation_run_id": run_id}


@router.get("/risks/{well_id}/saved", summary="Fetch persisted risks for a well")
async def get_saved_risks(
    well_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Retrieve previously persisted risk predictions for the given well."""
    result = await db.execute(
        select(RiskPrediction)
        .where(RiskPrediction.well_id == well_id)
        .order_by(desc(RiskPrediction.depth))
        .limit(limit)
    )
    rows = result.scalars().all()
    return [
        {
            "id": r.id,
            "risk_type": r.risk_type,
            "depth_start": r.depth,
            "depth_end": (r.depth or 0) + 100,
            "confidence": r.confidence,
            "severity": r.severity,
            "evidence": r.explanation,
            "historical_frequency": int(r.historical_frequency or 0),
            "generated_time": r.generated_time.isoformat() if r.generated_time else None,
        }
        for r in rows
    ]


@router.post("/sim/{well_id}/start", summary="Start or reset telemetry simulator")
async def start_sim(
    well_id: int,
    starting_depth: Optional[float] = None,
    mode: str = "Auto",
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    well = await db.get(Well, well_id)
    total = float(well.total_depth or 4000) if well else 4000.0
    # Use well's current_depth from DB as start point if not explicitly set
    if starting_depth is None:
        starting_depth = float(well.current_depth or 0) if well else 0.0
    if well_id in _simulators:
        del _simulators[well_id]
    sim = _get_or_create_sim(well_id, total)
    sim["current_depth"] = starting_depth
    sim["mode"] = mode
    sim["is_running"] = True
    sim["step_count"] = 0
    return {"message": f"Simulator started at {starting_depth}m", "state": sim}


@router.post("/sim/{well_id}/advance", summary="Advance simulator one depth step")
async def advance_sim(
    well_id: int,
    depth_increment: float = 5.0,
    _: User = Depends(get_current_user),
):
    sim = _get_or_create_sim(well_id)
    _advance_sim(sim, depth_increment)
    return sim


# ─── WebSocket Streaming ──────────────────────────────────────

@ws_router.websocket("/ws/telemetry/{well_id}")
async def telemetry_ws(websocket: WebSocket, well_id: int):
    """
    Streams live telemetry every 2 seconds.
    Client can send JSON {"command": "stop"} to halt streaming.
    """
    await websocket.accept()
    logger.info("ws_telemetry_connect", well_id=well_id)

    sim = _get_or_create_sim(well_id)
    sim["is_running"] = True
    # Streaming ceiling = 10000m or total_depth + 2000m if known
    ceiling = max(sim["total_depth"] + 500, sim["current_depth"] + 2000)

    try:
        while sim["is_running"] and sim["current_depth"] < ceiling:
            # Non-blocking check for client commands
            try:
                data = await asyncio.wait_for(websocket.receive_text(), timeout=0.05)
                msg = json.loads(data)
                if msg.get("command") == "stop":
                    break
                elif msg.get("command") == "set_depth":
                    sim["current_depth"] = float(msg.get("depth", sim["current_depth"]))
                elif msg.get("command") == "set_param":
                    for k, v in msg.get("params", {}).items():
                        if k in sim:
                            sim[k] = float(v)
            except asyncio.TimeoutError:
                pass
            except WebSocketDisconnect:
                return
            except Exception:
                pass

            # Advance and broadcast
            _advance_sim(sim, depth_increment=2.0)
            formation, pp_gg, fg_gg = _formation_at_depth(sim["current_depth"])

            payload = {
                **sim,
                "pore_pressure_gg": pp_gg,
                "frac_gradient_gg": fg_gg,
                "timestamp": datetime.utcnow().isoformat(),
            }
            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(2.0)

        try:
            await websocket.close()
        except Exception:
            pass
        logger.info("ws_telemetry_disconnect", well_id=well_id)

    except WebSocketDisconnect:
        logger.info("ws_telemetry_client_disconnect", well_id=well_id)
    except Exception as e:
        logger.error("ws_telemetry_error", well_id=well_id, error=str(e))
        try:
            await websocket.close()
        except Exception:
            pass

