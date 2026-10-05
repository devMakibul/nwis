"""
ML Training Pipeline — eRTMAC-NWIS Phase 7
Trains 5 risk prediction models from synthetic + historical event data.
Run:  python -m app.ml.train_models
"""
import os
import json
import pickle
import random
import math
from datetime import datetime
from pathlib import Path
from typing import Optional

# Lazy imports so the module loads even without ML libs
_ML_AVAILABLE = False
try:
    import numpy as np
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier, IsolationForest
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import train_test_split, StratifiedKFold
    from sklearn.preprocessing import StandardScaler, LabelEncoder
    from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                                  f1_score, roc_auc_score, classification_report)
    from sklearn.pipeline import Pipeline
    import xgboost as xgb
    import joblib
    _ML_AVAILABLE = True
except ImportError as _e:
    np = None  # type: ignore
    pd = None  # type: ignore
    Pipeline = None  # type: ignore
    # Stubs so the rest of the module doesn't crash
    class _Stub:
        pass
    xgb = _Stub()  # type: ignore
    joblib = _Stub()  # type: ignore
    def train_test_split(*a, **k): return [], [], [], []  # type: ignore
    def accuracy_score(*a, **k): return 0  # type: ignore
    def precision_score(*a, **k): return 0  # type: ignore
    def recall_score(*a, **k): return 0  # type: ignore
    def f1_score(*a, **k): return 0  # type: ignore
    def roc_auc_score(*a, **k): return 0  # type: ignore
    class StandardScaler:  # type: ignore
        pass

MODELS_DIR = Path(__file__).parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# ─── Formation encoding ────────────────────────────────────────
FORMATIONS = [
    "Quaternary Alluvium", "Tipam Formation", "Barail Formation",
    "Kopili Formation", "Sylhet Formation", "Bhuban Formation",
    "Basement", "Unknown",
]
FORMATION_IDX = {f: i for i, f in enumerate(FORMATIONS)}

TRAJECTORIES = ["Vertical", "Directional", "Horizontal", "S-curve"]
TRAJECTORY_IDX = {t: i for i, t in enumerate(TRAJECTORIES)}


# ─── Synthetic dataset generation ─────────────────────────────
def _formation_risk_base(formation: str) -> dict:
    """Returns base risk probabilities per formation."""
    matrix = {
        "Quaternary Alluvium":  dict(lc=0.10, sp=0.10, kick=0.05, ta=0.08, fi=0.12),
        "Tipam Formation":      dict(lc=0.20, sp=0.25, kick=0.15, ta=0.18, fi=0.22),
        "Barail Formation":     dict(lc=0.72, sp=0.58, kick=0.35, ta=0.45, fi=0.60),
        "Kopili Formation":     dict(lc=0.45, sp=0.40, kick=0.68, ta=0.62, fi=0.48),
        "Sylhet Formation":     dict(lc=0.55, sp=0.35, kick=0.80, ta=0.50, fi=0.42),
        "Bhuban Formation":     dict(lc=0.30, sp=0.60, kick=0.25, ta=0.70, fi=0.38),
        "Basement":             dict(lc=0.15, sp=0.45, kick=0.10, ta=0.30, fi=0.55),
        "Unknown":              dict(lc=0.25, sp=0.25, kick=0.25, ta=0.25, fi=0.25),
    }
    return matrix.get(formation, matrix["Unknown"])


def generate_synthetic_dataset(n_samples: int = 8000, seed: int = 42) -> "pd.DataFrame":
    """Generate a rich synthetic drilling training dataset."""
    rng = np.random.default_rng(seed)

    rows = []
    for _ in range(n_samples):
        formation = rng.choice(FORMATIONS)
        trajectory = rng.choice(TRAJECTORIES)
        depth = float(rng.uniform(100, 5000))

        base = _formation_risk_base(formation)
        depth_factor = min(1.0, depth / 4000)  # deeper = higher risk

        # Drilling parameters
        rop = float(rng.uniform(2, 35))
        wob = float(rng.uniform(5, 40))
        rpm = float(rng.uniform(60, 200))
        torque = float(rng.uniform(5, 30))
        ecd = float(rng.uniform(1.20, 1.75))
        mud_weight = float(rng.uniform(1.05, 1.65))
        standpipe_pressure = float(rng.uniform(80, 350))
        flow_rate = float(rng.uniform(600, 2000))
        hookload = float(rng.uniform(80, 350))
        gas_units = float(rng.uniform(0, 80))
        pit_volume = float(rng.uniform(240, 310))

        # Trend features
        rop_trend = float(rng.normal(0, 3))
        torque_trend = float(rng.normal(0, 2))
        ecd_margin = float(1.80 - ecd)  # margin below fracture gradient

        # Historical context
        previous_events = int(rng.integers(0, 15))

        # Compute anomaly boosts
        high_ecd = max(0, ecd - 1.50) * 3.0
        low_pit = max(0, (280 - pit_volume) * 0.02)
        high_gas = max(0, gas_units / 100)
        high_torque = max(0, (torque - 18) * 0.04)

        def _label(base_p: float, boost: float) -> int:
            p = min(0.95, base_p + boost + depth_factor * 0.15)
            return int(rng.random() < p)

        lc_label = _label(base["lc"], high_ecd + low_pit)
        sp_label = _label(base["sp"], high_torque + 0.05 * (depth_factor > 0.7))
        kick_label = _label(base["kick"], high_gas + (ecd_margin < 0.10) * 0.3)
        ta_label = _label(base["ta"], high_torque + rop_trend * 0.05)
        fi_label = _label(base["fi"], depth_factor * 0.2)

        rows.append({
            "formation_idx": FORMATION_IDX[formation],
            "trajectory_idx": TRAJECTORY_IDX[trajectory],
            "depth": depth,
            "rop": rop,
            "wob": wob,
            "rpm": rpm,
            "torque": torque,
            "ecd": ecd,
            "mud_weight": mud_weight,
            "standpipe_pressure": standpipe_pressure,
            "flow_rate": flow_rate,
            "hookload": hookload,
            "gas_units": gas_units,
            "pit_volume": pit_volume,
            "rop_trend": rop_trend,
            "torque_trend": torque_trend,
            "ecd_margin": ecd_margin,
            "previous_events": previous_events,
            "depth_factor": depth_factor,
            "lc_label": lc_label,
            "sp_label": sp_label,
            "kick_label": kick_label,
            "ta_label": ta_label,
            "fi_label": fi_label,
        })

    return pd.DataFrame(rows)


FEATURE_COLS = [
    "formation_idx", "trajectory_idx", "depth", "rop", "wob", "rpm",
    "torque", "ecd", "mud_weight", "standpipe_pressure", "flow_rate",
    "hookload", "gas_units", "pit_volume", "rop_trend", "torque_trend",
    "ecd_margin", "previous_events", "depth_factor",
]

# Feature importance mapping (for explainability)
FEATURE_IMPORTANCE = {
    "lc": ["ecd", "formation_idx", "mud_weight", "pit_volume", "ecd_margin", "depth"],
    "sp": ["torque", "formation_idx", "depth", "wob", "hookload", "torque_trend"],
    "kick": ["gas_units", "ecd_margin", "ecd", "formation_idx", "pit_volume", "rpm"],
    "ta": ["torque", "torque_trend", "formation_idx", "rop", "depth", "rpm"],
    "fi": ["formation_idx", "depth_factor", "depth", "wob", "rpm", "mud_weight"],
}


def train_model(X_train, y_train, model_key: str) -> "Pipeline":
    """Train an XGBoost + scaler pipeline."""
    scale_pos = max(1, (y_train == 0).sum() / max(1, (y_train == 1).sum()))

    xgb_clf = xgb.XGBClassifier(
        n_estimators=150,
        max_depth=5,
        learning_rate=0.08,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=scale_pos,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
        verbosity=0,
    )

    pipeline = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", xgb_clf),
    ])
    pipeline.fit(X_train, y_train)
    return pipeline


def evaluate(pipeline, X_test, y_test) -> dict:
    y_pred = pipeline.predict(X_test)
    y_prob = pipeline.predict_proba(X_test)[:, 1]
    return {
        "accuracy":  round(accuracy_score(y_test, y_pred), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall":    round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1":        round(f1_score(y_test, y_pred, zero_division=0), 4),
        "roc_auc":   round(roc_auc_score(y_test, y_prob), 4),
    }


RISK_MODELS = {
    "lc":   ("lost_circulation",        "lc_label"),
    "sp":   ("stuck_pipe",              "sp_label"),
    "kick": ("kick",                    "kick_label"),
    "ta":   ("torque_anomaly",          "ta_label"),
    "fi":   ("formation_instability",   "fi_label"),
}


def train_all_models(n_samples: int = 8000) -> dict:
    """Full training pipeline — returns metrics dict."""
    if not _ML_AVAILABLE:
        raise RuntimeError("ML libraries not installed. Run: pip install xgboost scikit-learn pandas")

    print(f"[ML] Generating synthetic dataset ({n_samples} samples)…")
    df = generate_synthetic_dataset(n_samples)
    X = df[FEATURE_COLS].values
    print(f"[ML] Dataset: {X.shape[0]} rows × {X.shape[1]} features")

    all_metrics = {}

    for key, (model_name, label_col) in RISK_MODELS.items():
        y = df[label_col].values
        pos_rate = y.mean()
        print(f"\n[ML] Training {model_name}  (positive rate: {pos_rate:.1%})…")

        X_tr, X_te, y_tr, y_te = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        pipeline = train_model(X_tr, y_tr, key)
        metrics = evaluate(pipeline, X_te, y_te)
        print(f"  Accuracy={metrics['accuracy']:.3f}  F1={metrics['f1']:.3f}  AUC={metrics['roc_auc']:.3f}")

        # Save model
        model_path = MODELS_DIR / f"{model_name}.pkl"
        joblib.dump(pipeline, model_path)

        # Save metadata
        meta = {
            "name": model_name,
            "key": key,
            "version": "1.0",
            "trained_at": datetime.utcnow().isoformat(),
            "dataset_size": int(X.shape[0]),
            "features": FEATURE_COLS,
            "top_features": FEATURE_IMPORTANCE[key],
            "metrics": metrics,
            "positive_rate": round(float(pos_rate), 4),
        }
        meta_path = MODELS_DIR / f"{model_name}.meta.json"
        meta_path.write_text(json.dumps(meta, indent=2))

        all_metrics[model_name] = metrics

    print(f"\n[ML] All models saved to {MODELS_DIR}")
    return all_metrics


if __name__ == "__main__":
    metrics = train_all_models()
    print("\n=== TRAINING COMPLETE ===")
    for name, m in metrics.items():
        print(f"  {name:30s}  AUC={m['roc_auc']:.3f}  F1={m['f1']:.3f}")
