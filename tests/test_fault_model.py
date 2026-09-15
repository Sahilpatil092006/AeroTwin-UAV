"""
AeroTwin-UAV AI Fault Classifier Verification Tests
===================================================
Verifies the trained fault classification model artifact, metadata integrity,
feature schema conformance, target class coverage, and prediction output probabilities.
"""

import os
import json
import pytest
import numpy as np
import joblib

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
MODEL_PATH = os.path.join(BASE_DIR, 'models', 'fault_classifier.joblib')
METADATA_PATH = os.path.join(BASE_DIR, 'models', 'fault_classifier_metadata.json')

EXPECTED_CLASSES = {
    'NORMAL',
    'INJECTOR_ABNORMALITY',
    'COOLING_PROBLEM',
    'LUBRICATION_PROBLEM',
    'MISFIRE',
    'SENSOR_ANOMALY'
}

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
    """Verify that the serialized Random Forest model binary exists."""
    assert os.path.exists(MODEL_PATH), f"Model binary not found at {MODEL_PATH}"
    assert os.path.getsize(MODEL_PATH) > 10000, "Model binary file is suspiciously small"


def test_metadata_file_exists():
    """Verify that the model metadata JSON file exists and contains valid JSON."""
    assert os.path.exists(METADATA_PATH), f"Metadata not found at {METADATA_PATH}"
    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)
    assert isinstance(metadata, dict), "Metadata must be a JSON dictionary"
    assert metadata.get("model_type") == "RandomForestClassifier"


def test_expected_feature_list_exists():
    """Verify that metadata and model contain the exact expected 13 input features."""
    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    meta_features = metadata.get("features", [])
    assert meta_features == EXPECTED_FEATURES, (
        f"Feature list mismatch: {meta_features} vs {EXPECTED_FEATURES}"
    )

    # Check that forbidden target-leakage features are not present
    forbidden = {'engine_health', 'fault_type', 'fault_severity', 'anomaly_score', 'rul_hours', 'mission_risk'}
    assert len(set(meta_features).intersection(forbidden)) == 0, "Target leakage features found in feature list!"


def test_all_six_fault_classes_represented():
    """Verify that all six required fault classes are represented in model metadata and classes_."""
    with open(METADATA_PATH, 'r', encoding='utf-8') as f:
        metadata = json.load(f)

    meta_classes = set(metadata.get("classes", []))
    assert meta_classes == EXPECTED_CLASSES, (
        f"Classes in metadata mismatch: {meta_classes} vs {EXPECTED_CLASSES}"
    )

    model = joblib.load(MODEL_PATH)
    assert hasattr(model, 'classes_'), "Model missing classes_ attribute"
    model_classes = set(model.classes_)
    assert model_classes == EXPECTED_CLASSES, (
        f"Classes in model mismatch: {model_classes} vs {EXPECTED_CLASSES}"
    )


def test_prediction_output_belongs_to_valid_fault_classes():
    """Verify that predictions from synthetic telemetry inputs yield valid fault class labels."""
    model = joblib.load(MODEL_PATH)

    # Synthetic sample of 3 telemetry vectors
    sample_inputs = np.array([
        # Nominal cruise
        [4600.0, 0.70, 4500.0, 12.0, 50.0, 8.0, 102.0, 780.0, 3.40, 88.0, 2.5, 18.5, 0.65],
        # Severe cooling problem (high CHT, high oil temp)
        [4600.0, 0.70, 4500.0, 12.0, 50.0, 8.0, 165.0, 785.0, 2.80, 128.0, 3.2, 18.5, 0.68],
        # Severe lubrication problem (low oil pressure, high vibration)
        [4300.0, 0.65, 4500.0, 12.0, 50.0, 8.0, 105.0, 780.0, 1.20, 122.0, 12.5, 18.0, 0.66]
    ])
    import pandas as pd
    sample_df = pd.DataFrame(sample_inputs, columns=EXPECTED_FEATURES)

    predictions = model.predict(sample_df)
    assert len(predictions) == 3

    for pred in predictions:
        assert pred in EXPECTED_CLASSES, f"Predicted class '{pred}' is not in valid class set {EXPECTED_CLASSES}"


def test_prediction_probabilities_sum_to_one():
    """Verify that predicted class probabilities sum approximately to 1.0."""
    import pandas as pd
    model = joblib.load(MODEL_PATH)

    sample_inputs = np.array([
        [4600.0, 0.70, 4500.0, 12.0, 50.0, 8.0, 102.0, 780.0, 3.40, 88.0, 2.5, 18.5, 0.65],
        [4600.0, 0.70, 4500.0, 12.0, 50.0, 8.0, 165.0, 785.0, 2.80, 128.0, 3.2, 18.5, 0.68]
    ])
    sample_df = pd.DataFrame(sample_inputs, columns=EXPECTED_FEATURES)

    probs = model.predict_proba(sample_df)
    assert probs.shape == (2, 6), f"Unexpected proba matrix shape: {probs.shape}"

    sums = np.sum(probs, axis=1)
    np.testing.assert_allclose(sums, np.ones(len(sample_inputs)), atol=1e-4), (
        f"Class probabilities do not sum to 1.0: {sums}"
    )
