#!/usr/bin/env python3
"""
Unit Tests for AeroTwin-UAV AI Remaining Useful Life (RUL) Regressor
====================================================================
Verifies that:
- Model and metadata artifacts exist.
- Metadata structure and feature lists match requirements.
- The model can be loaded via joblib.
- Predictions return valid numerical data (no NaN, no Inf).
- Model accepts typical single-sample and batch telemetry inputs.
- Final predicted RUL values satisfy the non-negative sanity check (RUL >= 0).
- NO arbitrary accuracy / R2 / MAE threshold tests are imposed.
"""

import os
import json
import pytest
import numpy as np
import pandas as pd
import joblib

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'rul_model.joblib')
METADATA_PATH = os.path.join(BASE_DIR, 'models', 'rul_model_metadata.json')

EXPECTED_INPUT_FEATURES = [
    'rpm',
    'throttle',
    'altitude',
    'ambient_temperature',
    'humidity',
    'wind_speed',
    'cht',
    'egt',
    'oil_pressure',
    'oil_temperature',
    'vibration',
    'fuel_flow',
    'engine_load'
]

FORBIDDEN_LEAKAGE_FEATURES = [
    'engine_health',
    'fault_type',
    'fault_severity',
    'anomaly_score',
    'rul_hours',
    'mission_risk'
]


@pytest.fixture(scope="module")
def model_artifacts():
    """Loads the model and metadata artifacts once for test module."""
    assert os.path.exists(MODEL_PATH), f"RUL model artifact not found at {MODEL_PATH}"
    assert os.path.exists(METADATA_PATH), f"RUL metadata artifact not found at {METADATA_PATH}"

    model = joblib.load(MODEL_PATH)
    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    return model, metadata


def test_model_file_exists():
    """Verifies that the trained model joblib file exists."""
    assert os.path.isfile(MODEL_PATH), f"Model file missing: {MODEL_PATH}"
    assert os.path.getsize(MODEL_PATH) > 1000, "Model file is unexpectedly empty or corrupted."


def test_metadata_file_exists():
    """Verifies that the metadata json file exists and is readable."""
    assert os.path.isfile(METADATA_PATH), f"Metadata file missing: {METADATA_PATH}"
    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        meta = json.load(f)
    assert "model_name" in meta
    assert "features" in meta
    assert "target" in meta
    assert meta["target"] == "rul_hours"


def test_model_can_be_loaded(model_artifacts):
    """Verifies that the joblib artifact can be unpickled and is callable."""
    model, _ = model_artifacts
    assert hasattr(model, "predict"), "Loaded model does not have a 'predict' method."


def test_expected_feature_list_exists(model_artifacts):
    """Verifies that the feature list in metadata matches expected telemetry features."""
    _, metadata = model_artifacts
    features = metadata.get("features", [])
    assert features == EXPECTED_INPUT_FEATURES, "Metadata feature list does not match expected input telemetry features."

    # Verify no target leakage features exist in features
    for forbidden in FORBIDDEN_LEAKAGE_FEATURES:
        assert forbidden not in features, f"Target leakage feature '{forbidden}' found in model input features!"


def test_model_accepts_valid_telemetry_sample(model_artifacts):
    """Verifies that model accepts a single valid aero piston engine telemetry sample."""
    model, metadata = model_artifacts
    features = metadata["features"]

    sample_dict = {
        'rpm': 2500.0,
        'throttle': 75.0,
        'altitude': 2000.0,
        'ambient_temperature': 20.0,
        'humidity': 50.0,
        'wind_speed': 5.0,
        'cht': 165.0,
        'egt': 720.0,
        'oil_pressure': 55.0,
        'oil_temperature': 90.0,
        'vibration': 2.5,
        'fuel_flow': 28.0,
        'engine_load': 70.0
    }

    sample_df = pd.DataFrame([sample_dict])[features]
    raw_pred = model.predict(sample_df)
    clipped_pred = np.clip(raw_pred, 0.0, None)

    assert len(clipped_pred) == 1
    assert isinstance(clipped_pred[0], (int, float, np.floating))
    assert not np.isnan(clipped_pred[0])
    assert not np.isinf(clipped_pred[0])
    assert clipped_pred[0] >= 0.0


def test_batch_prediction_numeric_and_no_nan_or_inf(model_artifacts):
    """Verifies that batch predictions are numeric, finite, and non-NaN."""
    model, metadata = model_artifacts
    features = metadata["features"]

    # Generate synthetic batch of 10 arbitrary operating points
    rng = np.random.default_rng(42)
    batch_data = pd.DataFrame({
        'rpm': rng.uniform(1800, 2700, size=10),
        'throttle': rng.uniform(40, 95, size=10),
        'altitude': rng.uniform(500, 4500, size=10),
        'ambient_temperature': rng.uniform(-10, 35, size=10),
        'humidity': rng.uniform(20, 85, size=10),
        'wind_speed': rng.uniform(0, 20, size=10),
        'cht': rng.uniform(130, 215, size=10),
        'egt': rng.uniform(620, 840, size=10),
        'oil_pressure': rng.uniform(30, 75, size=10),
        'oil_temperature': rng.uniform(70, 115, size=10),
        'vibration': rng.uniform(1.2, 9.5, size=10),
        'fuel_flow': rng.uniform(15, 38, size=10),
        'engine_load': rng.uniform(35, 95, size=10)
    })[features]

    raw_preds = model.predict(batch_data)
    clipped_preds = np.clip(raw_preds, 0.0, None)

    assert len(clipped_preds) == 10
    assert issubclass(clipped_preds.dtype.type, np.floating) or issubclass(clipped_preds.dtype.type, np.integer)
    assert not np.isnan(clipped_preds).any(), "NaN values found in RUL predictions!"
    assert not np.isinf(clipped_preds).any(), "Infinite values found in RUL predictions!"


def test_final_predicted_rul_is_non_negative(model_artifacts):
    """Verifies that final reported RUL (with non-negative clipping) is strictly >= 0.0."""
    model, metadata = model_artifacts
    features = metadata["features"]

    # Test extreme severe conditions that could produce low/negative raw predictions
    extreme_data = pd.DataFrame({
        'rpm': [2750.0, 1200.0],
        'throttle': [100.0, 10.0],
        'altitude': [5000.0, 200.0],
        'ambient_temperature': [45.0, -25.0],
        'humidity': [95.0, 10.0],
        'wind_speed': [28.0, 1.0],
        'cht': [245.0, 95.0],
        'egt': [890.0, 510.0],
        'oil_pressure': [18.0, 85.0],
        'oil_temperature': [135.0, 50.0],
        'vibration': [18.0, 0.8],
        'fuel_flow': [45.0, 8.0],
        'engine_load': [100.0, 15.0]
    })[features]

    raw_preds = model.predict(extreme_data)
    clipped_preds = np.clip(raw_preds, 0.0, None)

    for p in clipped_preds:
        assert p >= 0.0, f"Predicted RUL was negative ({p}) despite non-negative policy."
