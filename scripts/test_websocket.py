"""
AeroTwin-UAV Real-Time WebSocket Telemetry Test Client
======================================================
Connects to ws://localhost:8000/ws/telemetry, consumes at least 5
streaming telemetry messages, validates schema fields, and prints values.

Software-only research prototype.
"""

import sys
import os
import json
import asyncio
import math

try:
    import websockets
except ImportError:
    print("Error: 'websockets' library is required. Install with: pip install websockets")
    sys.exit(1)


WS_URI = os.getenv("WS_URI", "ws://localhost:8000/ws/telemetry")
REQUIRED_TELEMETRY_KEYS = [
    "rpm", "throttle", "altitude", "ambient_temperature",
    "humidity", "wind_speed", "cht", "egt", "oil_pressure",
    "oil_temperature", "vibration", "fuel_flow", "engine_load"
]
REQUIRED_TWIN_KEYS = [
    "expected_telemetry", "deviations", "engine_health",
    "engine_fitness_score", "overall_status"
]
REQUIRED_AI_KEYS = [
    "predicted_fault", "fault_probabilities", "anomaly_status",
    "anomaly_score", "predicted_rul_hours"
]
REQUIRED_MISSION_KEYS = [
    "mission_reliability_score", "mission_risk",
    "mission_recommendation", "reason_codes"
]


def validate_finite_numbers(data, path="root"):
    """Recursively verifies that no NaN or Infinity exists in data."""
    if isinstance(data, dict):
        for k, v in data.items():
            validate_finite_numbers(v, f"{path}.{k}")
    elif isinstance(data, list):
        for idx, item in enumerate(data):
            validate_finite_numbers(item, f"{path}[{idx}]")
    elif isinstance(data, float):
        if math.isnan(data) or math.isinf(data):
            raise ValueError(f"Numerical violation: {path} contains non-finite value {data}")


def validate_telemetry_packet(packet: dict, index: int):
    """Verifies all required sections and fields are present and valid."""
    assert packet.get("type") == "telemetry", f"Msg {index}: expected type 'telemetry', got {packet.get('type')}"
    assert "timestamp" in packet, f"Msg {index}: missing 'timestamp'"
    assert "engine_id" in packet, f"Msg {index}: missing 'engine_id'"
    assert "mission_id" in packet, f"Msg {index}: missing 'mission_id'"
    assert "flight_phase" in packet, f"Msg {index}: missing 'flight_phase'"

    # Telemetry section
    tel = packet.get("telemetry", {})
    for k in REQUIRED_TELEMETRY_KEYS:
        assert k in tel, f"Msg {index}: missing telemetry key '{k}'"

    # Digital Twin section
    twin = packet.get("digital_twin", {})
    for k in REQUIRED_TWIN_KEYS:
        assert k in twin, f"Msg {index}: missing digital_twin key '{k}'"
    assert 0.0 <= twin["engine_health"] <= 100.0, f"Health score out of bounds: {twin['engine_health']}"
    assert 0.0 <= twin["engine_fitness_score"] <= 100.0, f"Fitness score out of bounds: {twin['engine_fitness_score']}"

    # AI section
    ai = packet.get("ai", {})
    for k in REQUIRED_AI_KEYS:
        assert k in ai, f"Msg {index}: missing ai key '{k}'"
    assert 0.0 <= ai["anomaly_score"] <= 1.0, f"Anomaly score out of bounds: {ai['anomaly_score']}"
    assert ai["predicted_rul_hours"] >= 0.0, f"RUL cannot be negative: {ai['predicted_rul_hours']}"

    # Mission section
    mission = packet.get("mission", {})
    for k in REQUIRED_MISSION_KEYS:
        assert k in mission, f"Msg {index}: missing mission key '{k}'"
    assert 0.0 <= mission["mission_reliability_score"] <= 100.0, f"Mission reliability score out of bounds: {mission['mission_reliability_score']}"

    # Verify no NaN or Inf in entire structure
    validate_finite_numbers(packet)


async def main():
    print(f"Connecting to {WS_URI} ...")
    try:
        async with websockets.connect(WS_URI) as ws:
            print("CONNECTED\n")

            telemetry_count = 0
            while telemetry_count < 5:
                raw_message = await ws.recv()
                data = json.loads(raw_message)

                msg_type = data.get("type")
                if msg_type == "connection":
                    # Initial connection acknowledgement
                    continue

                if msg_type == "error":
                    print(f"Received error from server: {data.get('message')}")
                    sys.exit(1)

                if msg_type == "telemetry":
                    telemetry_count += 1
                    validate_telemetry_packet(data, telemetry_count)

                    tel = data["telemetry"]
                    twin = data["digital_twin"]
                    ai = data["ai"]
                    mission = data["mission"]

                    print(f"Message {telemetry_count}")
                    print(f"RPM: {tel['rpm']}")
                    print(f"CHT: {tel['cht']} deg C")
                    print(f"EGT: {tel['egt']} deg C")
                    print(f"Oil Pressure: {tel['oil_pressure']} kPa")
                    print(f"Vibration: {tel['vibration']} g")
                    print(f"Health: {twin['engine_health']}%")
                    print(f"Fitness: {twin['engine_fitness_score']}%")
                    print(f"Fault: {ai['predicted_fault']}")
                    print(f"Anomaly: {ai['anomaly_status']} (score: {ai['anomaly_score']})")
                    print(f"RUL: {ai['predicted_rul_hours']} hrs")
                    print(f"Mission Risk: {mission['mission_risk']} ({mission['mission_recommendation']})")
                    print("-" * 40)

            print("\nWEBSOCKET TEST PASSED")

    except ConnectionRefusedError:
        print(f"\nConnection failed: Unable to connect to {WS_URI}.")
        print("Please start the backend server first:")
        print("  uvicorn backend.app.main:app --reload --host 0.0.0.0 --port 8000")
        sys.exit(1)
    except Exception as e:
        print(f"\nWebSocket test failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
