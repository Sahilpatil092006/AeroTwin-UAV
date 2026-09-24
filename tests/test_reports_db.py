"""
Tests for Persistent SQLite Flight History and Reports API (Step 26C)
"""

import os
import tempfile
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.db.flight_history import FlightHistoryDB


@pytest.fixture
def temp_db():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    
    db = FlightHistoryDB(db_path=db_path, min_sample_interval_sec=0.0)
    yield db
    
    try:
        os.remove(db_path)
    except Exception:
        pass


def test_flight_history_db_initialization(temp_db):
    """Verify SQLite database creates tables with proper schema."""
    summary_001 = temp_db.get_summary("UAV-001")
    assert summary_001["uav_id"] == "UAV-001"
    assert summary_001["total_samples"] == 0
    assert summary_001["peak_cht"] == 0.0

    samples_001 = temp_db.get_history("UAV-001")
    assert isinstance(samples_001, list)
    assert len(samples_001) == 0


def test_flight_history_record_telemetry_and_isolation(temp_db):
    """Verify telemetry recording and strict separation between UAVs."""
    # Record for UAV-001
    sample_id_1 = temp_db.record_telemetry(
        uav_id="UAV-001",
        telemetry={
            "rpm": 2400.0,
            "cht": 175.5,
            "egt": 720.0,
            "oil_pressure": 55.0,
            "oil_temperature": 85.0,
            "vibration": 0.08,
            "fuel_flow": 18.5,
            "throttle": 0.75,
            "engine_load": 0.75,
        },
        flight_phase="CRUISE",
        health_score=94.5,
        mission_risk="LOW",
        timestamp=100.0,
    )
    assert sample_id_1 is not None

    sample_id_2 = temp_db.record_telemetry(
        uav_id="UAV-001",
        telemetry={
            "rpm": 2450.0,
            "cht": 182.0,  # higher CHT
            "egt": 735.0,  # higher EGT
            "oil_pressure": 48.0,  # lower oil pressure
            "oil_temperature": 88.0,
            "vibration": 0.10,
            "fuel_flow": 19.0,
            "throttle": 0.78,
            "engine_load": 0.78,
        },
        flight_phase="CRUISE",
        health_score=91.0,
        mission_risk="LOW",
        timestamp=102.0,
    )
    assert sample_id_2 is not None

    # Record for UAV-002
    sample_id_uav2 = temp_db.record_telemetry(
        uav_id="UAV-002",
        telemetry={
            "rpm": 2550.0,
            "cht": 195.0,
            "egt": 750.0,
            "oil_pressure": 60.0,
            "oil_temperature": 92.0,
            "vibration": 0.12,
            "fuel_flow": 22.0,
            "throttle": 0.85,
            "engine_load": 0.85,
        },
        flight_phase="CLIMB",
        health_score=88.0,
        mission_risk="MEDIUM",
        timestamp=100.0,
    )
    assert sample_id_uav2 is not None

    # Verify UAV-001 summary
    summary_001 = temp_db.get_summary("UAV-001")
    assert summary_001["uav_id"] == "UAV-001"
    assert summary_001["total_samples"] == 2
    assert summary_001["peak_cht"] == 182.0
    assert summary_001["peak_egt"] == 735.0
    assert summary_001["min_oil_pressure"] == 48.0
    assert summary_001["health_score"] == 91.0
    assert summary_001["mission_risk"] == "LOW"

    # Verify UAV-002 summary is isolated
    summary_002 = temp_db.get_summary("UAV-002")
    assert summary_002["uav_id"] == "UAV-002"
    assert summary_002["total_samples"] == 1
    assert summary_002["peak_cht"] == 195.0
    assert summary_002["peak_egt"] == 750.0
    assert summary_002["min_oil_pressure"] == 60.0
    assert summary_002["health_score"] == 88.0
    assert summary_002["mission_risk"] == "MEDIUM"

    # Verify UAV-001 history samples count
    samples_001 = temp_db.get_history("UAV-001")
    assert len(samples_001) == 2
    assert samples_001[0]["cht"] == 175.5
    assert samples_001[1]["cht"] == 182.0

    # Verify UAV-002 history samples count
    samples_002 = temp_db.get_history("UAV-002")
    assert len(samples_002) == 1
    assert samples_002[0]["cht"] == 195.0


def test_reports_api_endpoints():
    """Verify REST endpoints GET /api/reports/{uav_id}/history and /summary."""
    client = TestClient(app)

    # Trigger simulation start to populate data (returns 201 Created)
    start_res = client.post("/api/simulation/start", json={
        "uav_id": "UAV-001",
        "engine_id": "AERO-001",
        "rpm_target": 2400,
        "throttle": 75,
        "flight_phase": "CRUISE"
    })
    assert start_res.status_code == 201

    # Test history endpoint
    hist_res = client.get("/api/reports/UAV-001/history")
    assert hist_res.status_code == 200
    hist_json = hist_res.json()
    assert hist_json["uav_id"] == "UAV-001"
    assert "samples" in hist_json
    assert isinstance(hist_json["samples"], list)
    assert "sessions" in hist_json
    assert isinstance(hist_json["sessions"], list)
    assert len(hist_json["sessions"]) >= 1
    assert hist_json["total_samples"] >= 1

    # Test summary endpoint
    summ_res = client.get("/api/reports/UAV-001/summary")
    assert summ_res.status_code == 200
    summ_json = summ_res.json()
    assert summ_json["uav_id"] == "UAV-001"
    assert "total_samples" in summ_json
    assert "peak_cht" in summ_json
    assert "peak_egt" in summ_json
    assert "min_oil_pressure" in summ_json

    # Test UAV-002 isolation via API
    summ_res_2 = client.get("/api/reports/UAV-002/summary")
    assert summ_res_2.status_code == 200
    assert summ_res_2.json()["uav_id"] == "UAV-002"
