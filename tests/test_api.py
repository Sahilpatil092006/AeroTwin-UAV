#!/usr/bin/env python3
"""
Integration & Unit Tests for AeroTwin-UAV FastAPI Backend
=========================================================
Tests:
- GET /api/health
- POST /api/simulation/start
- GET /api/simulation/current (both before and after simulation starts)
- GET /api/digital-twin/status
- GET /api/digital-twin/health
- GET /api/digital-twin/deviation
- POST /api/ai/predict
- POST /api/ai/anomaly
- POST /api/ai/rul
- GET /api/ai/explanation
- GET /api/mission/risk
- Error handling on invalid simulation input (422 / 400)
- Missing simulation handling before start (404 or standby)
- Schema validity and non-negative constraints
- Total absence of NaN / Infinity in JSON responses

Software-only research prototype.
"""

import math
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.services.twin_service import service_manager

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_service_state():
    """Resets simulator before tests when needed, or leaves state cleanly."""
    pass


def test_health_endpoint():
    """Verifies GET /api/health returns 200 with status ok and service name."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "AeroTwin-UAV API"
    assert data["version"] == "1.0.0"


def test_current_simulation_before_start():
    """Verifies GET /api/simulation/current returns standby when no simulation is active."""
    # Temporarily set simulator to None to test standby behavior
    prev_sim = service_manager.current_engine_state
    service_manager.current_engine_state = None

    response = client.get("/api/simulation/current")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "standby"
    assert "No active simulation" in data["message"]

    # Restore
    service_manager.current_engine_state = prev_sim


def test_simulation_start_valid():
    """Verifies POST /api/simulation/start successfully starts simulation and returns telemetry."""
    payload = {
        "engine_id": "AERO-TEST-001",
        "mission_id": "MSN-TEST-99",
        "throttle": 68.0,
        "altitude": 4200.0,
        "ambient_temperature": 16.0,
        "humidity": 40.0,
        "wind_speed": 6.0,
        "mission_duration_hours": 3.0,
        "flight_phase": "CRUISE",
        "degradation": 0.05,
        "fault_type": "NORMAL",
        "fault_severity": 0.0,
        "seed": 42
    }
    response = client.post("/api/simulation/start", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["engine_id"] == "AERO-TEST-001"
    assert data["flight_phase"] == "CRUISE"
    assert data["rpm"] > 1800.0
    assert data["cht"] > 0.0
    assert data["oil_pressure"] > 0.0


def test_simulation_start_invalid_input():
    """Verifies POST /api/simulation/start rejects out-of-bound inputs with 422 error."""
    invalid_payload = {
        "engine_id": "AERO-001",
        "throttle": 150.0,  # Invalid: > 100%
        "altitude": -500.0, # Invalid: < 0
        "flight_phase": "INVALID_PHASE"
    }
    response = client.post("/api/simulation/start", json=invalid_payload)
    assert response.status_code == 422


def test_current_simulation_after_start():
    """Verifies GET /api/simulation/current returns active telemetry after simulation is started."""
    response = client.get("/api/simulation/current")
    assert response.status_code == 200
    data = response.json()
    assert "engine_id" in data
    assert "rpm" in data
    assert data["rpm"] > 0.0


def test_digital_twin_status():
    """Verifies GET /api/digital-twin/status returns complete Digital Twin state."""
    response = client.get("/api/digital-twin/status")
    assert response.status_code == 200
    data = response.json()
    assert "engine_health" in data
    assert "engine_fitness_score" in data
    assert "deviations" in data
    assert "predicted_fault" in data
    assert "anomaly_score" in data
    assert "predicted_rul_hours" in data
    assert data["overall_status"] in ["HEALTHY", "WARNING", "CRITICAL"]


def test_digital_twin_health():
    """Verifies GET /api/digital-twin/health returns health and fitness scores."""
    response = client.get("/api/digital-twin/health")
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["engine_health"] <= 100.0
    assert 0.0 <= data["engine_fitness_score"] <= 100.0
    assert data["overall_status"] in ["HEALTHY", "WARNING", "CRITICAL"]
    assert "timestamp" in data


def test_digital_twin_deviation():
    """Verifies GET /api/digital-twin/deviation returns expected vs actual telemetry and deviations."""
    response = client.get("/api/digital-twin/deviation")
    assert response.status_code == 200
    data = response.json()
    assert "expected_telemetry" in data
    assert "actual_telemetry" in data
    assert "deviations" in data
    for param in ["rpm", "cht", "egt", "oil_pressure", "vibration"]:
        assert param in data["deviations"]
        assert "absolute_deviation" in data["deviations"][param]
        assert "status" in data["deviations"][param]


def test_ai_predict_fault():
    """Verifies POST /api/ai/predict returns predicted fault class and probabilities."""
    telemetry_sample = {
        "rpm": 4520.0,
        "throttle": 68.0,
        "altitude": 4500.0,
        "ambient_temperature": 15.0,
        "humidity": 45.0,
        "wind_speed": 5.0,
        "cht": 102.0,
        "egt": 785.0,
        "oil_pressure": 3.7,
        "oil_temperature": 86.0,
        "vibration": 3.5,
        "fuel_flow": 23.5,
        "engine_load": 65.0
    }
    response = client.post("/api/ai/predict", json=telemetry_sample)
    assert response.status_code == 200
    data = response.json()
    assert "predicted_fault" in data
    assert isinstance(data["fault_probabilities"], dict)
    assert len(data["fault_probabilities"]) == 6


def test_ai_anomaly_detection():
    """Verifies POST /api/ai/anomaly returns anomaly status and score."""
    telemetry_sample = {
        "rpm": 4520.0,
        "throttle": 68.0,
        "altitude": 4500.0,
        "ambient_temperature": 15.0,
        "humidity": 45.0,
        "wind_speed": 5.0,
        "cht": 102.0,
        "egt": 785.0,
        "oil_pressure": 3.7,
        "oil_temperature": 86.0,
        "vibration": 3.5,
        "fuel_flow": 23.5,
        "engine_load": 65.0
    }
    response = client.post("/api/ai/anomaly", json=telemetry_sample)
    assert response.status_code == 200
    data = response.json()
    assert data["anomaly_status"] in ["NORMAL", "ANOMALOUS"]
    assert 0.0 <= data["anomaly_score"] <= 1.0


def test_ai_rul_prediction():
    """Verifies POST /api/ai/rul returns non-negative remaining useful life."""
    telemetry_sample = {
        "rpm": 4520.0,
        "throttle": 68.0,
        "altitude": 4500.0,
        "ambient_temperature": 15.0,
        "humidity": 45.0,
        "wind_speed": 5.0,
        "cht": 102.0,
        "egt": 785.0,
        "oil_pressure": 3.7,
        "oil_temperature": 86.0,
        "vibration": 3.5,
        "fuel_flow": 23.5,
        "engine_load": 65.0
    }
    response = client.post("/api/ai/rul", json=telemetry_sample)
    assert response.status_code == 200
    data = response.json()
    assert data["predicted_rul_hours"] >= 0.0


def test_ai_explanation():
    """Verifies GET /api/ai/explanation returns diagnostic explanation."""
    response = client.get("/api/ai/explanation")
    assert response.status_code == 200
    data = response.json()
    assert "explanation" in data
    assert "predicted_fault" in data
    assert "anomaly_score" in data


def test_mission_risk_endpoint():
    """Verifies GET /api/mission/risk returns reliability score, risk tier, and recommendation."""
    response = client.get("/api/mission/risk?mission_duration_hours=2.5&altitude=4000.0")
    assert response.status_code == 200
    data = response.json()
    assert 0.0 <= data["mission_reliability_score"] <= 100.0
    assert data["mission_risk"] in ["LOW", "MEDIUM", "HIGH"]
    assert data["mission_recommendation"] in ["SAFE_TO_PROCEED", "PROCEED_WITH_CAUTION", "MISSION_NOT_RECOMMENDED"]
    assert data["rul_adequacy"] in ["ADEQUATE", "MARGINAL", "INADEQUATE"]
    assert isinstance(data["reason_codes"], list)
    assert "explanation" in data


def test_no_nan_or_infinity_in_any_api_response():
    """Verifies that all JSON endpoint outputs are clean and contain no NaN or Infinity."""
    endpoints = [
        "/api/health",
        "/api/simulation/current",
        "/api/digital-twin/status",
        "/api/digital-twin/health",
        "/api/digital-twin/deviation",
        "/api/ai/explanation",
        "/api/mission/risk"
    ]

    def assert_no_nan(val, path=""):
        if isinstance(val, dict):
            for k, v in val.items():
                assert_no_nan(v, f"{path}.{k}")
        elif isinstance(val, list):
            for i, v in enumerate(val):
                assert_no_nan(v, f"{path}[{i}]")
        elif isinstance(val, (int, float)):
            assert not math.isnan(val), f"NaN at {path}"
            assert not math.isinf(val), f"Infinity at {path}"

    for ep in endpoints:
        res = client.get(ep)
        assert res.status_code == 200, f"Endpoint {ep} failed with status {res.status_code}"
        assert_no_nan(res.json(), ep)
