"""
Tests for Emergency Return-to-Base (RTB) Decision Engine & API
=============================================================
Tests all 5 explicit RTB trigger conditions, non-critical warning conditions,
and the /api/rtb/status endpoint.

Conditions:
1. Engine Health < 30% -> RTB true
2. Oil Pressure < 1.0 bar -> RTB true
3. CHT > 145°C -> RTB true
4. Vibration > 6g -> RTB true
5. Mission Risk = HIGH AND a critical fault is present -> RTB true
- Normal UAV -> RTB false
- Warning condition without critical threshold -> RTB false
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.decision.rtb import RtbDecisionEngine, is_critical_fault
from backend.app.schemas.uav import UAVState


@pytest.fixture
def client():
    return TestClient(app)


# =============================================================================
# Unit Tests for RtbDecisionEngine
# =============================================================================

def test_rtb_normal_uav_false():
    """Normal UAV operates nominal parameters -> RTB false, STANDBY."""
    res = RtbDecisionEngine.evaluate(
        uav_id="UAV-001",
        engine_health=92.5,
        oil_pressure=2.85,
        cht=104.2,
        vibration=2.35,
        mission_risk="LOW",
        predicted_fault="NORMAL"
    )

    assert res["rtb_active"] is False
    assert res["status"] == "STANDBY"
    assert res["severity"] == "NONE"
    assert res["destination"] == "HOME_BASE"
    assert res["trigger_reason"] is None
    assert res["uav_id"] == "UAV-001"
    assert res["triggering_telemetry_values"]["engine_health"] == 92.5
    assert res["triggering_telemetry_values"]["oil_pressure"] == 2.85


def test_rtb_low_engine_health_true():
    """Engine Health < 30% -> RTB true, EMERGENCY RTB."""
    res = RtbDecisionEngine.evaluate(
        uav_id="UAV-001",
        engine_health=24.5,  # < 30.0%
        oil_pressure=2.4,
        cht=112.0,
        vibration=2.8,
        mission_risk="MEDIUM",
        predicted_fault="NORMAL"
    )

    assert res["rtb_active"] is True
    assert res["status"] == "EMERGENCY RTB"
    assert res["severity"] == "CRITICAL"
    assert res["destination"] == "HOME_BASE"
    assert "Engine Health < 30%" in res["trigger_reason"]
    assert res["triggering_telemetry_values"]["engine_health"] == 24.5


def test_rtb_low_oil_pressure_true():
    """Oil Pressure < 1.0 bar -> RTB true, EMERGENCY RTB."""
    res = RtbDecisionEngine.evaluate(
        uav_id="UAV-001",
        engine_health=78.0,
        oil_pressure=0.82,  # < 1.0 bar
        cht=118.0,
        vibration=3.1,
        mission_risk="MEDIUM",
        predicted_fault="NORMAL"
    )

    assert res["rtb_active"] is True
    assert res["status"] == "EMERGENCY RTB"
    assert res["severity"] == "CRITICAL"
    assert "Oil Pressure < 1.0 bar" in res["trigger_reason"]
    assert res["triggering_telemetry_values"]["oil_pressure"] == 0.82


def test_rtb_high_cht_true():
    """CHT > 145°C -> RTB true, EMERGENCY RTB."""
    res = RtbDecisionEngine.evaluate(
        uav_id="UAV-001",
        engine_health=68.0,
        oil_pressure=2.2,
        cht=153.4,  # > 145.0°C
        vibration=3.5,
        mission_risk="MEDIUM",
        predicted_fault="NORMAL"
    )

    assert res["rtb_active"] is True
    assert res["status"] == "EMERGENCY RTB"
    assert res["severity"] == "CRITICAL"
    assert "CHT > 145°C" in res["trigger_reason"]
    assert res["triggering_telemetry_values"]["cht"] == 153.4


def test_rtb_high_vibration_true():
    """Vibration > 6g -> RTB true, EMERGENCY RTB."""
    res = RtbDecisionEngine.evaluate(
        uav_id="UAV-001",
        engine_health=72.0,
        oil_pressure=2.5,
        cht=115.0,
        vibration=6.85,  # > 6.0g
        mission_risk="MEDIUM",
        predicted_fault="NORMAL"
    )

    assert res["rtb_active"] is True
    assert res["status"] == "EMERGENCY RTB"
    assert res["severity"] == "CRITICAL"
    assert "Vibration > 6g" in res["trigger_reason"]
    assert res["triggering_telemetry_values"]["vibration"] == 6.85


def test_rtb_high_mission_risk_and_critical_fault_true():
    """Mission Risk = HIGH AND critical fault present -> RTB true."""
    # Critical fault examples: COOLING_PROBLEM, LUBRICATION_PROBLEM, MISFIRE, INJECTOR_ABNORMALITY
    res = RtbDecisionEngine.evaluate(
        uav_id="UAV-003",
        engine_health=62.0,  # >= 30%
        oil_pressure=2.1,   # >= 1.0 bar
        cht=135.0,          # <= 145°C
        vibration=4.2,      # <= 6g
        mission_risk="HIGH",
        predicted_fault="COOLING_PROBLEM"
    )

    assert res["rtb_active"] is True
    assert res["status"] == "EMERGENCY RTB"
    assert res["severity"] == "CRITICAL"
    assert "Mission Risk = HIGH with critical fault" in res["trigger_reason"]
    assert "COOLING_PROBLEM" in res["trigger_reason"]


def test_rtb_warning_condition_without_critical_threshold_false():
    """
    Warning conditions (health 65%, oil 1.8 bar, CHT 132°C, vibration 4.2g, Medium Risk,
    or Sensor Anomaly with High Risk) must NOT trigger RTB unless critical thresholds met.
    """
    # Sub-case A: Warning degradation without crossing critical threshold
    res_a = RtbDecisionEngine.evaluate(
        uav_id="UAV-002",
        engine_health=65.0,  # Warning level, but > 30%
        oil_pressure=1.85,   # Warning level, but > 1.0 bar
        cht=132.0,           # Warning level, but < 145°C
        vibration=4.2,       # Warning level, but < 6g
        mission_risk="MEDIUM",
        predicted_fault="COOLING_PROBLEM"  # Fault present, but risk is not HIGH
    )

    assert res_a["rtb_active"] is False
    assert res_a["status"] == "STANDBY"
    assert res_a["trigger_reason"] is None

    # Sub-case B: High Mission Risk, but fault is SENSOR_ANOMALY (not a critical powertrain fault)
    res_b = RtbDecisionEngine.evaluate(
        uav_id="UAV-001",
        engine_health=75.0,
        oil_pressure=2.6,
        cht=108.0,
        vibration=2.5,
        mission_risk="HIGH",
        predicted_fault="SENSOR_ANOMALY"
    )

    assert res_b["rtb_active"] is False
    assert res_b["status"] == "STANDBY"
    assert res_b["trigger_reason"] is None


def test_rtb_evaluate_uav_state_adapter():
    """Tests evaluating a UAVState dataclass object directly."""
    uav_state = UAVState(
        uav_id="UAV-001",
        engine_health=85.0,
        engine_telemetry={
            "oil_pressure": 2.75,
            "cht": 106.0,
            "vibration": 2.45
        },
        mission_risk="LOW",
        predicted_fault="NORMAL"
    )

    res = RtbDecisionEngine.evaluate_uav_state(uav_state)
    assert res["rtb_active"] is False
    assert res["uav_id"] == "UAV-001"
    assert res["status"] == "STANDBY"
    assert res["destination"] == "HOME_BASE"


# =============================================================================
# API Route Tests: GET /api/rtb/status
# =============================================================================

def test_api_rtb_status_uav001(client):
    """Verifies GET /api/rtb/status?uav_id=UAV-001 endpoint response structure."""
    response = client.get("/api/rtb/status?uav_id=UAV-001")
    assert response.status_code == 200
    data = response.json()

    assert "rtb_active" in data
    assert isinstance(data["rtb_active"], bool)
    assert data["uav_id"] == "UAV-001"
    assert "status" in data
    assert data["status"] in ("STANDBY", "EMERGENCY RTB")
    assert "severity" in data
    assert data["destination"] == "HOME_BASE"
    assert "triggering_telemetry_values" in data

    tel = data["triggering_telemetry_values"]
    assert "engine_health" in tel
    assert "oil_pressure" in tel
    assert "cht" in tel
    assert "vibration" in tel
    assert "mission_risk" in tel
    assert "predicted_fault" in tel


def test_api_rtb_status_uav005(client):
    """
    UAV-005 in default simulated fleet has severe lubrication problem,
    low oil pressure (< 1.0 bar), and critical engine health (< 30%).
    Must activate RTB.
    """
    # Deterministically ensure UAV-005 is in its critical severe lubrication fault condition
    # regardless of dynamic fault scheduler progression during long test runs
    client.post(
        "/api/simulation/fault",
        json={
            "fault_type": "LUBRICATION_PROBLEM",
            "severity": 0.85,
            "degradation": 0.70,
            "uav_id": "UAV-005",
        }
    )

    response = client.get("/api/rtb/status?uav_id=UAV-005")
    assert response.status_code == 200
    data = response.json()

    assert data["rtb_active"] is True
    assert data["status"] == "EMERGENCY RTB"
    assert data["severity"] == "CRITICAL"
    assert data["destination"] == "HOME_BASE"
    assert data["trigger_reason"] is not None


def test_api_rtb_status_unknown_uav_404(client):
    """Requesting an unknown UAV ID returns HTTP 404."""
    response = client.get("/api/rtb/status?uav_id=UAV-999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
