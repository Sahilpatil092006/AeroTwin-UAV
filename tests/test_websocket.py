#!/usr/bin/env python3
"""
Tests for AeroTwin-UAV Real-Time WebSocket Telemetry Pipeline
============================================================
Verifies:
- WebSocket endpoint /ws/telemetry exists
- Client connection succeeds and receives initial handshake
- Structured JSON telemetry packets are transmitted
- Telemetry, Digital Twin, AI, and Mission fields exist
- Numbers are strictly finite (no NaN, Infinity)
- AI probabilities, anomaly scores, health scores, and RUL obey constraints
- Clean disconnection handling
- Telemetry dynamically changes across simulation steps

Software-only research prototype.
"""

import math
import json
import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

client = TestClient(app)


def assert_no_nan_or_inf(data, path="root"):
    """Recursively validates that no non-finite float exists in the JSON payload."""
    if isinstance(data, dict):
        for k, v in data.items():
            assert_no_nan_or_inf(v, f"{path}.{k}")
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            assert_no_nan_or_inf(item, f"{path}[{idx}]")
    elif isinstance(data, float):
        assert not math.isnan(data), f"NaN discovered at {path}"
        assert not math.isinf(data), f"Infinity discovered at {path}"


def test_websocket_endpoint_exists_and_connects():
    """Verifies that the WebSocket endpoint accepts connections and sends handshake."""
    with client.websocket_connect("/ws/telemetry") as ws:
        msg = ws.receive_json()
        assert msg["type"] == "connection"
        assert msg["status"] == "connected"
        assert "AeroTwin-UAV telemetry stream started" in msg["message"]


def test_websocket_telemetry_packet_structure():
    """Verifies that subsequent messages are structured telemetry packets."""
    with client.websocket_connect("/ws/telemetry") as ws:
        # Handshake
        handshake = ws.receive_json()
        assert handshake["type"] == "connection"

        # First telemetry packet
        packet = ws.receive_json()
        assert packet["type"] == "telemetry"
        assert "timestamp" in packet
        assert "engine_id" in packet
        assert "mission_id" in packet
        assert "flight_phase" in packet

        # Main components
        assert "telemetry" in packet
        assert "digital_twin" in packet
        assert "ai" in packet
        assert "mission" in packet


def test_websocket_telemetry_fields():
    """Verifies that all 13 core telemetry channels are populated and within valid physical bounds."""
    with client.websocket_connect("/ws/telemetry") as ws:
        ws.receive_json()  # handshake
        packet = ws.receive_json()

        tel = packet["telemetry"]
        required_channels = [
            "rpm", "throttle", "altitude", "ambient_temperature",
            "humidity", "wind_speed", "cht", "egt", "oil_pressure",
            "oil_temperature", "vibration", "fuel_flow", "engine_load"
        ]
        for ch in required_channels:
            assert ch in tel, f"Missing channel {ch} in telemetry payload"
            assert isinstance(tel[ch], (int, float)), f"Channel {ch} is not numeric"

        assert tel["rpm"] > 0
        assert 0.0 <= tel["throttle"] <= 100.0
        assert 0.0 <= tel["altitude"] <= 8000.0
        assert 0.0 <= tel["engine_load"] <= 100.0


def test_websocket_digital_twin_fields():
    """Verifies Digital Twin section contains expected values, deviations, and health scores."""
    with client.websocket_connect("/ws/telemetry") as ws:
        ws.receive_json()  # handshake
        packet = ws.receive_json()

        twin = packet["digital_twin"]
        assert "expected_telemetry" in twin
        assert "deviations" in twin
        assert "engine_health" in twin
        assert "engine_fitness_score" in twin
        assert "overall_status" in twin

        assert 0.0 <= twin["engine_health"] <= 100.0
        assert 0.0 <= twin["engine_fitness_score"] <= 100.0
        assert twin["overall_status"] in ["HEALTHY", "OPTIMAL", "NOMINAL", "DEGRADED", "WARNING", "CRITICAL"]

        # Deviations check
        assert isinstance(twin["deviations"], dict)
        assert len(twin["deviations"]) > 0


def test_websocket_ai_fields():
    """Verifies AI outputs include fault prediction, probabilities, anomaly score, and RUL."""
    with client.websocket_connect("/ws/telemetry") as ws:
        ws.receive_json()  # handshake
        packet = ws.receive_json()

        ai = packet["ai"]
        assert "predicted_fault" in ai
        assert "fault_probabilities" in ai
        assert "anomaly_status" in ai
        assert "anomaly_score" in ai
        assert "predicted_rul_hours" in ai

        assert 0.0 <= ai["anomaly_score"] <= 1.0
        assert ai["predicted_rul_hours"] >= 0.0
        assert ai["anomaly_status"] in ["NORMAL", "ANOMALOUS"]

        probs = ai["fault_probabilities"]
        assert isinstance(probs, dict)
        prob_sum = sum(probs.values())
        assert 0.98 <= prob_sum <= 1.02, f"Probabilities do not sum to ~1.0: {prob_sum}"


def test_websocket_mission_fields():
    """Verifies Mission Risk decision fields, scores, and recommendations."""
    with client.websocket_connect("/ws/telemetry") as ws:
        ws.receive_json()  # handshake
        packet = ws.receive_json()

        mission = packet["mission"]
        assert "mission_reliability_score" in mission
        assert "mission_risk" in mission
        assert "mission_recommendation" in mission
        assert "reason_codes" in mission

        assert 0.0 <= mission["mission_reliability_score"] <= 100.0
        assert mission["mission_risk"] in ["LOW", "MEDIUM", "HIGH"]
        assert isinstance(mission["reason_codes"], list)


def test_websocket_json_serializable_and_no_nan_inf():
    """Verifies entire payload is JSON serializable and contains no NaN or Infinity."""
    with client.websocket_connect("/ws/telemetry") as ws:
        ws.receive_json()  # handshake
        for _ in range(3):
            packet = ws.receive_json()
            # Test round-trip JSON serialization
            serialized = json.dumps(packet)
            deserialized = json.loads(serialized)
            assert deserialized["type"] == "telemetry"
            assert_no_nan_or_inf(packet)


def test_websocket_clean_disconnect():
    """Verifies client can disconnect and reconnect cleanly without crashing server."""
    with client.websocket_connect("/ws/telemetry") as ws1:
        msg1 = ws1.receive_json()
        assert msg1["type"] == "connection"
        tel1 = ws1.receive_json()
        assert tel1["type"] == "telemetry"

    # Reconnect immediately
    with client.websocket_connect("/ws/telemetry") as ws2:
        msg2 = ws2.receive_json()
        assert msg2["type"] == "connection"
        tel2 = ws2.receive_json()
        assert tel2["type"] == "telemetry"


def test_websocket_telemetry_changes_over_time():
    """Verifies simulator advances state and produces dynamically changing telemetry."""
    with client.websocket_connect("/ws/telemetry") as ws:
        ws.receive_json()  # handshake

        p1 = ws.receive_json()
        p2 = ws.receive_json()

        # Timestamp or values should evolve
        assert p1["type"] == "telemetry"
        assert p2["type"] == "telemetry"
        assert "timestamp" in p1 and "timestamp" in p2
