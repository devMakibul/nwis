"""
ML API Routes — Phase 7
POST /api/ml/predict             — real-time risk prediction
GET  /api/ml/well-analysis/{id}  — full well risk analysis
GET  /api/ml/models              — model registry + performance metrics
POST /api/ml/train               — trigger model training (admin only)
"""
import structlog
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_current_user
from app.database.base import get_db
from app.models.identity import User
from app.models.wells import Well
from app.models.geological import Field, Basin
from app.models.operations import DrillingEvent

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/ml", tags=["ML Risk Engine"])


class TelemetryInput(BaseModel):
    well_id: Optional[int] = None
    current_depth: float = 1500.0
    current_formation: str = "Barail Formation"
    trajectory_type: str = "Vertical"
    rop: float = 15.0
    wob: float = 20.0
    rpm: float = 120.0
    torque: float = 10.0
    ecd: float = 1.38
    mud_weight: float = 1.30
    standpipe_pressure: float = 180.0
    flow_rate: float = 1200.0
    hookload: float = 150.0
    gas_units: float = 5.0
    pit_volume: float = 285.0
    rop_trend: float = 0.0
    torque_trend: float = 0.0
    previous_events: int = 0


@router.get("/models", summary="List all ML models and their metrics")
async def get_models(_: User = Depends(get_current_user)):
    from app.ml.inference import get_model_stats
    return get_model_stats()


@router.post("/predict", summary="Real-time ML risk prediction from telemetry")
async def predict(
    body: TelemetryInput,
    _: User = Depends(get_current_user),
):
    from app.ml.inference import predict_risks
    telemetry = body.model_dump()
    risks = predict_risks(telemetry)
    return {
        "well_id": body.well_id,
        "depth": body.current_depth,
        "formation": body.current_formation,
        "risk_count": len(risks),
        "risks": risks,
    }


@router.post("/risk-advice", summary="Generate AI mitigation advice for a risk")
async def get_risk_advice(
    body: dict,
    _: User = Depends(get_current_user),
):
    from app.config import settings
    import httpx

    risk_type = body.get("risk_type", "Unknown Risk")
    formation = body.get("formation", "Unknown")
    depth = body.get("depth", 0)

    prompt = f"As a drilling engineering expert, provide 2 short, actionable mitigation recommendations and suggest specific safe operating parameters (WOB, RPM, Flow Rate, Mud Weight) for a predicted {risk_type} risk at {depth}m in the {formation}. Be extremely concise and use bullet points."

    is_ollama = settings.AI_PROVIDER == "ollama"
    base_url = f"{settings.OLLAMA_URL}/v1/chat/completions" if is_ollama else f"{settings.OPENROUTER_BASE_URL}/chat/completions"
    model = settings.MODEL_NAME if is_ollama else "openrouter/free"
    headers = {"Authorization": f"Bearer {settings.OPENROUTER_API_KEY}"} if not is_ollama else {}

    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                base_url,
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 150,
                },
                headers=headers,
                timeout=15.0
            )
            data = resp.json()
            if "choices" in data and len(data["choices"]) > 0:
                advice = data["choices"][0]["message"]["content"]
                return {"advice": advice}
            else:
                return {"advice": f"Recommended Actions:\n- Closely monitor parameters for {risk_type}\n- Prepare contingency plans for {formation}."}
    except Exception as e:
        logger.error("risk_advice_error", error=str(e))
        return {"advice": f"Recommended Actions:\n- Monitor ECD closely\n- Run flow check in {formation}."}



@router.get("/well-analysis/{well_id}", summary="Full ML risk analysis for a well")
async def well_analysis(
    well_id: int,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    from app.ml.inference import predict_risks, get_model_stats
    from app.api.routes.live import _get_or_create_sim

    # Fetch well data
    res = await db.execute(
        select(Well, Field.name.label("field_name"), Basin.name.label("basin_name"))
        .join(Field, Well.field_id == Field.id)
        .join(Basin, Field.basin_id == Basin.id)
        .where(Well.id == well_id)
    )
    row = res.first()
    if not row:
        raise HTTPException(status_code=404, detail="Well not found")
    well, field_name, basin_name = row[0], row[1], row[2]

    # Get historical event count
    ev_count = (await db.execute(
        select(DrillingEvent).where(DrillingEvent.well_id == well_id)
    )).scalars().all()

    # Simulate current state or use existing sim
    sim = _get_or_create_sim(well_id, float(well.total_depth or 4000))

    telemetry = {
        "well_id": well_id,
        "current_depth": sim.get("current_depth", float(well.total_depth or 0) * 0.7),
        "current_formation": sim.get("current_formation", "Barail Formation"),
        "trajectory_type": well.trajectory_type or "Vertical",
        "rop": sim.get("rop", 15.0),
        "wob": sim.get("wob", 20.0),
        "rpm": sim.get("rpm", 120.0),
        "torque": sim.get("torque", 10.0),
        "ecd": sim.get("ecd", 1.38),
        "mud_weight": sim.get("mud_weight", 1.30),
        "standpipe_pressure": sim.get("standpipe_pressure", 180.0),
        "flow_rate": sim.get("flow_rate", 1200.0),
        "hookload": sim.get("hookload", 150.0),
        "gas_units": sim.get("gas_units", 5.0),
        "pit_volume": sim.get("pit_volume", 285.0),
        "rop_trend": 0.0,
        "torque_trend": 0.0,
        "previous_events": len(ev_count),
    }

    risks = predict_risks(telemetry)
    model_stats = get_model_stats()

    # Historical event summary
    ev_by_type: dict = {}
    for e in ev_count:
        ev_by_type[e.event_type] = ev_by_type.get(e.event_type, 0) + 1

    return {
        "well": {
            "id": well.id,
            "name": well.well_name,
            "field": field_name,
            "basin": basin_name,
            "status": well.well_status,
            "total_depth": well.total_depth,
            "trajectory": well.trajectory_type,
        },
        "current_telemetry": telemetry,
        "ml_predictions": risks,
        "historical_events": ev_by_type,
        "total_historical_events": len(ev_count),
        "model_summary": [
            {"model": m["label"], "auc": m["metrics"].get("roc_auc", 0), "trained": m["trained"]}
            for m in model_stats
        ],
    }


@router.post("/train", summary="Trigger ML model training (admin)")
async def trigger_training(
    background_tasks: BackgroundTasks,
    n_samples: int = 8000,
    current_user: User = Depends(get_current_user),
):
    if not any(r.name == "admin" for r in (current_user.roles or [])):
        raise HTTPException(status_code=403, detail="Admin access required to train models")

    def _train_task():
        from app.ml.train_models import train_all_models
        try:
            metrics = train_all_models(n_samples)
            logger.info("ml_training_complete", metrics=metrics)
            # Invalidate inference cache
            from app.ml.inference import _load_models
            _load_models.cache_clear()
        except Exception as e:
            logger.error("ml_training_error", error=str(e))

    background_tasks.add_task(_train_task)
    return {"status": "training_started", "n_samples": n_samples,
            "message": "Model training started in background. Check /api/ml/models for status."}
