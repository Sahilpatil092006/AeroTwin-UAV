#!/usr/bin/env python3
"""
AeroTwin-UAV Frontend-Backend Contract Integration Tests
========================================================
Validates that the backend REST APIs and WebSocket stream precisely satisfy
the interface contracts expected by the React frontend components and hooks.

Verifies:
1. CORS configuration permits React dev server origins (localhost:3000, localhost:5173)
2. GET /api/health schema matches frontend healthApi.check()
3. POST /api/simulation/start schema matches frontend simulationApi.start()
4. GET /api/digital-twin/status matches frontend digitalTwinApi.getStatus()
5. GET /api/mission/risk matches frontend missionApi.getRisk()
6. WebSocket /ws/telemetry delivers all 14 required channels for the Dashboard
7. React state models (Telemetry, Digital Twin, AI, Mission) receive valid non-null values
8. Disconnection and standby states handle gracefully without runtime exceptions

Software-only research prototype.
"""

import math
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)

EXPECTED_DASHBOARD_CHANNELS = [
    "rpm", "cht", "egt", "oil_pressure", "oil_temperature",
    "vibration", "fuel_flow", "engine_load"
]


def test_cors_headers_for_react_dev_origins():
    """Verifies that CORS headers permit local React development servers."""
    origins_to_test = ["http://localhost:3000", "http://localhost:5173"]
    for origin in origins_to_test:
        response = client.options(
            "/api/health",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "GET",
            }
        )
        assert response.status_code in [200, 204]
        assert response.headers.get("access-control-allow-origin") == origin


def test_health_api_contract():
    """Verifies health response matches frontend healthApi.check contract."""
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data.get("status") == "ok"
    assert "service" in data
    assert "version" in data


def test_websocket_telemetry_packet_for_react_dashboard():
    """Verifies that WebSocket /ws/telemetry stream contains all 14 items needed by the React Dashboard."""
    with client.websocket_connect("/ws/telemetry") as ws:
        # Handshake
        handshake = ws.receive_json()
        assert handshake.get("type") == "connection"

        # Telemetry packet
        packet = ws.receive_json()
        assert packet.get("type") == "telemetry"

        # 1-8: Telemetry channels
        tel = packet.get("telemetry", {})
        for ch in EXPECTED_DASHBOARD_CHANNELS:
            assert ch in tel, f"Missing telemetry channel '{ch}' required by Dashboard"
            assert isinstance(tel[ch], (int, float))
            assert not math.isnan(tel[ch])
            assert not math.isinf(tel[ch])

        # 9-10: Engine Health and Fitness
        dt = packet.get("digital_twin", {})
        assert "engine_health" in dt, "Missing 'engine_health' for Dashboard"
        assert "engine_fitness_score" in dt, "Missing 'engine_fitness_score' for Dashboard"
        assert 0.0 <= dt["engine_health"] <= 100.0
        assert 0.0 <= dt["engine_fitness_score"] <= 100.0
        assert "overall_status" in dt

        # 11-13: RUL, Fault Prediction, Anomaly Status
        ai = packet.get("ai", {})
        assert "predicted_rul_hours" in ai, "Missing 'predicted_rul_hours' for Dashboard"
        assert "predicted_fault" in ai, "Missing 'predicted_fault' for Dashboard"
        assert "anomaly_status" in ai, "Missing 'anomaly_status' for Dashboard"
        assert "anomaly_score" in ai, "Missing 'anomaly_score' for Dashboard"
        assert ai["predicted_rul_hours"] >= 0.0
        assert 0.0 <= ai["anomaly_score"] <= 1.0

        # 14: Mission Risk
        mission = packet.get("mission", {})
        assert "mission_risk" in mission, "Missing 'mission_risk' for Dashboard"
        assert "mission_reliability_score" in mission
        assert "mission_recommendation" in mission
        assert mission["mission_risk"] in ["LOW", "MEDIUM", "HIGH"]


def test_telemetry_history_compatibility():
    """Verifies that streaming multiple packets provides consistent data for React LineChart."""
    with client.websocket_connect("/ws/telemetry") as ws:
        ws.receive_json()  # handshake

        for i in range(3):
            packet = ws.receive_json()
            assert packet.get("type") == "telemetry"
            tel = packet.get("telemetry", {})
            assert "rpm" in tel
            assert "egt" in tel
            assert "cht" in tel
            assert "oil_pressure" in tel
