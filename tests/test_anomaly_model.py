"""
AeroTwin-UAV AI Anomaly Detection Unit Tests
============================================
Verifies the trained Isolation Forest anomaly detection artifact, metadata schema,
feature conformance, prediction output labels, and normalized scoring bounds.
"""

import os
import json
import pytest
import numpy as np
import pandas as pd
import joblib

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'anomaly_detector.joblib')
METADATA_PATH = os.path.join(BASE_DIR, 'models', 'anomaly_detector_metadata.json')

EXPECTED_FEATURES = [
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


def test_model_file_exists():
    """Verify that the serialized Isolation Forest model binary exists."""
    assert os.path.exists(MODEL_PATH), f"Model binary not found at {MODEL_PATH}"
    assert os.path.getsize(MODEL_PATH) > 10000, "Model binary file is suspiciously small"


def test_metadata_file_exists():
    """Verify that the model metadata JSON file exists and contains valid metadata."""
    assert os.path.exists(METADATA_PATH), f"Metadata not found at {METADATA_PATH}"
    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)
    assert isinstance(metadata, dict), "Metadata must be a dictionary"
    assert metadata.get("model_type") == "IsolationForest"


def test_model_can_be_loaded():
    """Verify that the model can be loaded from disk using joblib."""
    model = joblib.load(MODEL_PATH)
    assert model is not None, "Loaded model is None"
    assert hasattr(model, "decision_function"), "Model missing decision_function method"
    assert hasattr(model, "predict"), "Model missing predict method"


def test_expected_feature_list_exists():
    """Verify that metadata and input schema specify the exact expected 13 telemetry features."""
    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    meta_features = metadata.get("features", [])
    assert meta_features == EXPECTED_FEATURES, (
        f"Feature list mismatch: {meta_features} vs {EXPECTED_FEATURES}"
    )

    # Verify no target leakage features
    forbidden = {'engine_health', 'fault_type', 'fault_severity', 'anomaly_score', 'rul_hours', 'mission_risk'}
    assert len(set(meta_features).intersection(forbidden)) == 0, "Target leakage features found in feature list!"


def test_prediction_returns_valid_anomaly_labels():
    """Verify that model.predict returns valid Isolation Forest labels (+1 for normal, -1 for anomaly)."""
    model = joblib.load(MODEL_PATH)

    sample_inputs = pd.DataFrame([
        # Nominal cruise point
        [4600.0, 0.70, 4500.0, 12.0, 50.0, 8.0, 102.0, 780.0, 3.40, 88.0, 2.5, 18.5, 0.65],
        # Severe anomaly point (extreme CHT, severe vibration)
        [5800.0, 0.95, 7500.0, 35.0, 80.0, 20.0, 185.0, 950.0, 0.70, 140.0, 22.0, 35.0, 0.98]
    ], columns=EXPECTED_FEATURES)

    preds = model.predict(sample_inputs)
    assert len(preds) == 2
    for p in preds:
        assert p in [1, -1], f"Invalid prediction label: {p}. Expected +1 or -1."


def test_anomaly_score_is_within_zero_to_one():
    """Verify that the normalized anomaly score is bounded strictly within [0.0, 1.0]."""
    model = joblib.load(MODEL_PATH)
    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    df_min = metadata["anomaly_scoring"]["df_min"]
    df_max = metadata["anomaly_scoring"]["df_max"]

    sample_inputs = pd.DataFrame([
        [4600.0, 0.70, 4500.0, 12.0, 50.0, 8.0, 102.0, 780.0, 3.40, 88.0, 2.5, 18.5, 0.65],
        [3000.0, 0.35, 1000.0, 20.0, 40.0, 5.0, 95.0, 720.0, 2.80, 82.0, 2.1, 12.0, 0.35],
        [5800.0, 0.95, 7500.0, 35.0, 80.0, 20.0, 185.0, 950.0, 0.70, 140.0, 22.0, 35.0, 0.98]
    ], columns=EXPECTED_FEATURES)

    df_vals = model.decision_function(sample_inputs)
    scores = np.clip((df_max - df_vals) / (df_max - df_min), 0.0, 1.0)

    for s in scores:
        assert 0.0 <= s <= 1.0, f"Anomaly score {s} outside bounds [0.0, 1.0]"


def test_model_can_process_valid_telemetry_sample():
    """Verify that model processes a single telemetry observation dictionary/row without error."""
    model = joblib.load(MODEL_PATH)

    single_sample = pd.DataFrame([{
        'rpm': 4650.0,
        'throttle': 0.68,
        'altitude': 4200.0,
        'ambient_temperature': 14.5,
        'humidity': 52.0,
        'wind_speed': 6.5,
        'cht': 105.2,
        'egt': 785.0,
        'oil_pressure': 3.35,
        'oil_temperature': 89.0,
        'vibration': 2.8,
        'fuel_flow': 18.2,
        'engine_load': 0.64
    }])

    pred = model.predict(single_sample)
    df_val = model.decision_function(single_sample)

    assert len(pred) == 1
    assert pred[0] in [1, -1]
    assert isinstance(float(df_val[0]), float)
