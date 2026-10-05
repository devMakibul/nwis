import json
import math
from pathlib import Path
from typing import Optional
from functools import lru_cache

import structlog

logger = structlog.get_logger(__name__)

MODELS_DIR = Path(__file__).parent / "models"

_ML_AVAILABLE = False
try:
    import numpy as np
    import joblib
    _ML_AVAILABLE = True
except ImportError:
    np = None  # type: ignore

try:
    from app.ml.train_models import (
        FEATURE_COLS, FEATURE_IMPORTANCE, RISK_MODELS,
        FORMATION_IDX, TRAJECTORY_IDX,
    )
except ImportError:
    FEATURE_COLS = []
    FEATURE_IMPORTANCE = {}
    RISK_MODELS = {
        "lc":   ("lost_circulation",        "lc_label"),
        "sp":   ("stuck_pipe",              "sp_label"),
        "kick": ("kick",                    "kick_label"),
        "ta":   ("torque_anomaly",          "ta_label"),
        "fi":   ("formation_instability",   "fi_label"),
    }
    FORMATION_IDX = {}
    TRAJECTORY_IDX = {}

# Risk display configuration
RISK_CONFIG = {
    "lost_circulation": {
        "label": "Lost Circulation",
        "mitigation": "Increase LCM concentration; prepare fiber/flake blend; reduce ECD by lowering mud weight.",
        "evidence_pattern": "Similar losses observed in fractured Barail intervals at comparable ECD.",
    },
    "stuck_pipe": {
        "label": "Stuck Pipe",
        "mitigation": "Maintain reciprocation schedule; ensure adequate hole cleaning; monitor torque/drag trends.",
        "evidence_pattern": "Reactive shale swelling reported in offset wells at similar depth intervals.",
    },
    "kick": {
        "label": "Kick / Well Control",
        "mitigation": "Monitor pit volume and flow rate continuously; conduct flow checks at each connection.",
        "evidence_pattern": "Overpressured carbonate lenses identified in Sylhet/Kopili formation offset data.",
    },
    "torque_anomaly": {
        "label": "Torque Spike",
        "mitigation": "Reduce WOB; increase circulation rate; consider wiper trips if trend persists.",
        "evidence_pattern": "Interbedded hard/soft layers caused torque fluctuations in offset wells.",
    },
    "formation_instability": {
        "label": "Formation Instability",
        "mitigation": "Increase mud weight to inhibit shale swelling; consider inhibitive mud system.",
        "evidence_pattern": "Swelling clay content documented in formation analysis reports.",
    },
}

SEVERITY_THRESHOLDS = {
    "Critical": 0.80,
    "High":     0.60,
    "Moderate": 0.40,
    "Low":      0.20,
}


@lru_cache(maxsize=1)
def _load_models() -> dict:
    """Load all trained models from disk. Cached after first call."""
    if not _ML_AVAILABLE:
        return {}

    loaded = {}
    for key, (model_name, _) in RISK_MODELS.items():
        path = MODELS_DIR / f"{model_name}.pkl"
        if path.exists():
            try:
                loaded[key] = joblib.load(path)
                logger.info("ml_model_loaded", model=model_name)
            except Exception as e:
                logger.error("ml_model_load_failed", model=model_name, error=str(e))
        else:
            logger.warning("ml_model_missing", model=model_name, path=str(path))

    return loaded


def _load_metadata() -> dict:
    meta = {}
    for key, (model_name, _) in RISK_MODELS.items():
        path = MODELS_DIR / f"{model_name}.meta.json"
        if path.exists():
            try:
                meta[key] = json.loads(path.read_text())
            except Exception:
                pass
    return meta


def _telemetry_to_features(telemetry: dict) -> list:
    """Convert a telemetry dict into the ML feature vector."""
    formation = telemetry.get("current_formation", "Unknown")
    formation_idx = FORMATION_IDX.get(formation, FORMATION_IDX.get("Unknown", 7))

    trajectory = telemetry.get("trajectory_type", "Vertical")
    trajectory_idx = TRAJECTORY_IDX.get(trajectory, 0)

    depth = float(telemetry.get("current_depth", 1000))
    ecd = float(telemetry.get("ecd", 1.35))
    mud_weight = float(telemetry.get("mud_weight", 1.25))
    pit_volume = float(telemetry.get("pit_volume", 285))
    gas_units = float(telemetry.get("gas_units", 0))

    features = {
        "formation_idx": formation_idx,
        "trajectory_idx": trajectory_idx,
        "depth": depth,
        "rop": float(telemetry.get("rop", 15)),
        "wob": float(telemetry.get("wob", 20)),
        "rpm": float(telemetry.get("rpm", 120)),
        "torque": float(telemetry.get("torque", 10)),
        "ecd": ecd,
        "mud_weight": mud_weight,
        "standpipe_pressure": float(telemetry.get("standpipe_pressure", 180)),
        "flow_rate": float(telemetry.get("flow_rate", 1200)),
        "hookload": float(telemetry.get("hookload", 150)),
        "gas_units": gas_units,
        "pit_volume": pit_volume,
        "rop_trend": float(telemetry.get("rop_trend", 0)),
        "torque_trend": float(telemetry.get("torque_trend", 0)),
        "ecd_margin": max(0, 1.80 - ecd),
        "previous_events": int(telemetry.get("previous_events", 0)),
        "depth_factor": min(1.0, depth / 4000),
    }

    return [features[col] for col in FEATURE_COLS]


def _severity_from_prob(prob: float) -> str:
    if prob >= SEVERITY_THRESHOLDS["Critical"]: return "Critical"
    if prob >= SEVERITY_THRESHOLDS["High"]:     return "High"
    if prob >= SEVERITY_THRESHOLDS["Moderate"]: return "Moderate"
    return "Low"


def _build_reasons(key: str, telemetry: dict, prob: float) -> list:
    """Generate explainable reasons for a risk prediction."""
    formation = telemetry.get("current_formation", "Unknown")
    ecd = float(telemetry.get("ecd", 1.35))
    torque = float(telemetry.get("torque", 10))
    gas_units = float(telemetry.get("gas_units", 0))
    pit_volume = float(telemetry.get("pit_volume", 285))
    depth = float(telemetry.get("current_depth", 1000))

    reasons = []

    if key == "lc":
        if formation in ("Barail Formation", "Kopili Formation"):
            reasons.append(f"{formation} has high historical lost circulation frequency (fractured sandstone).")
        if ecd > 1.50:
            reasons.append(f"ECD ({ecd:.3f} sg) is elevated — increasing pressure on natural fractures.")
        if pit_volume < 270:
            reasons.append(f"Pit volume ({pit_volume:.0f} bbl) declining — potential mud loss indicator.")
    elif key == "sp":
        if torque > 18:
            reasons.append(f"Torque ({torque:.1f} kNm) trending above threshold — possible packoff.")
        if formation in ("Barail Formation", "Bhuban Formation"):
            reasons.append(f"{formation} contains reactive shales documented in offset well reports.")
        if depth > 2500:
            reasons.append(f"Depth ({depth:.0f}m) increases differential sticking risk.")
    elif key == "kick":
        if gas_units > 30:
            reasons.append(f"Gas units ({gas_units:.0f}) elevated — possible influx indication.")
        if ecd < 1.25:
            reasons.append(f"ECD ({ecd:.3f} sg) approaching pore pressure gradient.")
        if formation in ("Sylhet Formation", "Kopili Formation"):
            reasons.append(f"{formation} has overpressured carbonate intervals from offset data.")
    elif key == "ta":
        if torque > 20:
            reasons.append(f"Current torque ({torque:.1f} kNm) shows anomalous variation.")
        if formation == "Bhuban Formation":
            reasons.append("Bhuban Formation interbedded lithology causes torque fluctuations.")
    elif key == "fi":
        if depth > 3000:
            reasons.append(f"Deeper intervals ({depth:.0f}m) exhibit higher formation instability rates.")
        if formation in ("Barail Formation", "Tipam Formation"):
            reasons.append(f"{formation} has documented swelling clay content in petrophysical logs.")

    if not reasons:
        reasons.append(f"ML model detected anomalous pattern in formation context ({formation}) at {depth:.0f}m.")

    return reasons[:3]


def predict_risks(telemetry: dict) -> list:
    """
    Run all 5 ML models and return risk predictions with explanations.
    Falls back to rule-based scoring if models not trained.
    """
    models = _load_models()
    metadata = _load_metadata()

    if not models:
        # Rule-based fallback
        return _rule_based_predict(telemetry)

    try:
        import numpy as np
        features = _telemetry_to_features(telemetry)
        X = np.array([features])
    except Exception as e:
        logger.error("ml_feature_extraction_error", error=str(e))
        return _rule_based_predict(telemetry)

    results = []
    depth = float(telemetry.get("current_depth", 1000))

    for key, (model_name, _) in RISK_MODELS.items():
        if key not in models:
            continue
        try:
            prob = float(models[key].predict_proba(X)[0][1])
            severity = _severity_from_prob(prob)

            # Only surface >= Low predictions
            if prob < 0.20:
                continue

            meta = metadata.get(key, {})
            reasons = _build_reasons(key, telemetry, prob)
            cfg = RISK_CONFIG.get(model_name, {})

            results.append({
                "risk_type": cfg.get("label", model_name),
                "model_key": key,
                "model_name": model_name,
                "probability": round(prob, 4),
                "confidence": round(prob * 100, 1),
                "severity": severity,
                "depth": depth,
                "formation": telemetry.get("current_formation", "Unknown"),
                "reasons": reasons,
                "mitigation": cfg.get("mitigation", ""),
                "evidence_pattern": cfg.get("evidence_pattern", ""),
                "model_auc": meta.get("metrics", {}).get("roc_auc", 0),
                "top_features": FEATURE_IMPORTANCE.get(key, [])[:3],
            })
        except Exception as e:
            logger.error("ml_inference_error", model=model_name, error=str(e))

    results.sort(key=lambda r: r["probability"], reverse=True)
    return results


def _rule_based_predict(telemetry: dict) -> list:
    """Simple rule-based fallback when models aren't trained."""
    from app.api.routes.live import _compute_risks, _get_or_create_sim
    well_id = telemetry.get("well_id", 0)
    sim = _get_or_create_sim(well_id)
    sim.update(telemetry)
    raw = _compute_risks(sim, {})
    return [
        {
            "risk_type": r["risk_type"],
            "model_key": "rule",
            "model_name": "rule_based",
            "probability": round(r["confidence"] / 100, 4),
            "confidence": r["confidence"],
            "severity": r["severity"],
            "depth": r["depth_start"],
            "formation": r["formation"],
            "reasons": [r["evidence"]],
            "mitigation": "",
            "evidence_pattern": r["evidence"],
            "model_auc": None,
            "top_features": [],
        }
        for r in raw[:5]
    ]


def get_model_stats() -> list:
    """Return metadata for all trained models."""
    metadata = _load_metadata()
    stats = []
    for key, (model_name, _) in RISK_MODELS.items():
        model_path = MODELS_DIR / f"{model_name}.pkl"
        trained = model_path.exists()
        meta = metadata.get(key, {})
        stats.append({
            "model_name": model_name,
            "key": key,
            "label": RISK_CONFIG.get(model_name, {}).get("label", model_name),
            "trained": trained,
            "version": meta.get("version", "—"),
            "trained_at": meta.get("trained_at", "—"),
            "dataset_size": meta.get("dataset_size", 0),
            "features": meta.get("features", FEATURE_COLS),
            "top_features": meta.get("top_features", []),
            "metrics": meta.get("metrics", {}),
            "positive_rate": meta.get("positive_rate", 0),
        })
    return stats
