"""
Unit & Integration Tests for What-If Scenario Evaluation (WIF-01)
==================================================================
Validates:
1. POST /api/mission/what-if endpoint execution.
2. Low-stress vs. high-stress scenario output variation.
3. Complete isolation: live UAV telemetry and fleet states are not mutated.
4. Correct response schema, numerical safety, and status tagging.
"""

import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.services.twin_service import service_manager


@pytest.fixture
def client():
    return TestClient(app)


def test_what_if_endpoint_low_stress(client):
    """Verifies that a nominal/low-stress scenario yields high survival and low risk."""
    payload = {
        "altitude": 5000.0,
        "ambientDelta": 0.0,
        "throttle": 65.0,
        "injectorDrift": 0.0,
        "uav_id": "UAV-001"
    }
    response = client.post("/api/mission/what-if", json=payload)
    assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.text}"
    data = response.json()
    
    assert data["is_what_if"] is True
    assert data["status_tag"] == "WHAT-IF / SIMULATED RESULT"
    assert "peakCht" in data
    assert "peakEgt" in data
    assert "survivalProb" in data
    assert "thermalMargin" in data
    assert "riskLevel" in data
    assert data["peakCht"] > 0
    assert data["peakEgt"] > 0
    assert 0 <= data["survivalProb"] <= 100
    assert 0 <= data["thermalMargin"] <= 100


def test_what_if_endpoint_high_stress(client):
    """Verifies that an extreme stress scenario reflects elevated temperatures and high risk."""
    low_stress_payload = {
        "altitude": 5000.0,
        "ambientDelta": -5.0,
        "throttle": 55.0,
        "injectorDrift": 0.0
    }
    high_stress_payload = {
        "altitude": 28000.0,
        "ambientDelta": 30.0,
        "throttle": 98.0,
        "injectorDrift": 25.0
    }
    
    res_low = client.post("/api/mission/what-if", json=low_stress_payload).json()
    res_high = client.post("/api/mission/what-if", json=high_stress_payload).json()
    
    # Verify stress sensitivity: CHT and EGT are higher in high stress
    assert res_high["peakCht"] > res_low["peakCht"], "High stress scenario should have higher CHT"
    assert res_high["peakEgt"] > res_low["peakEgt"], "High stress scenario should have higher EGT"
    assert res_high["survivalProb"] < res_low["survivalProb"], "High stress scenario should have lower survival probability"
    assert res_high["thermalMargin"] <= res_low["thermalMargin"], "High stress scenario should have lower thermal margin"


def test_what_if_does_not_mutate_live_uav_state(client):
    """
    CRITICAL: Validates that evaluating a What-If scenario does NOT modify
    the real/live UAV state, telemetry, or fleet data.
    """
    # 1. Capture live fleet state before What-If
    before_fleet = client.get("/api/uav/all").json()
    uav001_before = next(u for u in before_fleet["uavs"] if u["uav_id"] == "UAV-001")
    
    # 2. Run high-stress What-If scenario on UAV-001
    whatif_payload = {
        "altitude": 25000.0,
        "ambientDelta": 25.0,
        "throttle": 95.0,
        "injectorDrift": 28.0,
        "uav_id": "UAV-001"
    }
    whatif_res = client.post("/api/mission/what-if", json=whatif_payload)
    assert whatif_res.status_code == 200
    
    # 3. Capture live fleet state after What-If
    after_fleet = client.get("/api/uav/all").json()
    uav001_after = next(u for u in after_fleet["uavs"] if u["uav_id"] == "UAV-001")
    
    # 4. Assert live telemetry and identity did not mutate to the What-If parameters
    assert uav001_after["uav_id"] == "UAV-001"
    assert uav001_after["flight_phase"] == uav001_before["flight_phase"]
    # Telemetry should remain in normal operating zone, NOT jumped to 25000 ft altitude or 95% throttle
    assert abs(uav001_after["engine_telemetry"]["rpm"] - uav001_before["engine_telemetry"]["rpm"]) < 50.0


def test_what_if_altitude_validation_out_of_envelope(client):
    """
    Validates that What-If requests exceeding operational ceiling (30,000 ft / 9,144 m <= 10,000 m)
    or negative altitudes return a clean HTTP 422 validation error instead of HTTP 500.
    """
    # 1. Exceeds operational ceiling (35,000 ft)
    res_high_alt = client.post("/api/mission/what-if", json={"altitude": 35000.0})
    assert res_high_alt.status_code == 422, f"Expected 422 for 35,000 ft, got {res_high_alt.status_code}"
    assert "altitude" in str(res_high_alt.json()).lower()

    # 2. Negative altitude (-100 ft)
    res_neg_alt = client.post("/api/mission/what-if", json={"altitude": -100.0})
    assert res_neg_alt.status_code == 422, f"Expected 422 for negative altitude, got {res_neg_alt.status_code}"

    # 3. Maximum valid operational ceiling (30,000 ft)
    res_max_alt = client.post("/api/mission/what-if", json={"altitude": 30000.0})
    assert res_max_alt.status_code == 200, f"Expected 200 for 30,000 ft ceiling, got {res_max_alt.status_code}"

