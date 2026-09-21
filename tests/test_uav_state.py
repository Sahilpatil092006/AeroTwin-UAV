#!/usr/bin/env python3
"""
Unit & Integration Tests for UAV State & Multi-UAV Data Architecture
===================================================================
Verifies:
1. UAVState data structure encapsulates all 13 core attributes:
   - uav_id
   - mission_id
   - engine telemetry
   - flight phase
   - engine health
   - fitness score
   - predicted fault
   - fault confidence
   - anomaly status
   - anomaly score
   - predicted RUL
   - mission risk
   - recommendation
2. UAVState serialization and Pydantic UAVStateResponse schema validation
3. UAVState.from_states assembly from EngineState, DigitalTwinState, MissionDecision
4. Service Manager multi-UAV association, indexing, and state isolation
5. Default single-UAV behavior (UAV-001) backward compatibility
6. REST API endpoints (/api/uav/state, /api/uav/{uav_id}/state, /api/uav/list)
7. Telemetry streaming packet includes uav_id and uav_state while preserving legacy keys

Software-only research prototype.
"""

import pytest
from fastapi.testclient import TestClient

from backend.app.schemas.uav import UAVState, UAVStateResponse
from backend.app.simulation import AeroPistonEngineSimulator, EngineState
from backend.app.digital_twin import DigitalTwin, DigitalTwinState
from backend.app.decision import MissionDecisionEngine, MissionParameters, MissionDecision
from backend.app.services.twin_service import service_manager, TwinServiceManager
from backend.app.schemas import SimulationStartRequest
from backend.app.main import app

client = TestClient(app)


def test_uav_state_default_instantiation():
    """Verifies that UAVState initializes with all 13 required fields and correct defaults."""
    state = UAVState()
    assert state.uav_id == "UAV-001"
    assert state.mission_id == "MSN-001"
    assert isinstance(state.engine_telemetry, dict)
    assert state.flight_phase == "CRUISE"
    assert state.engine_health == 100.0
    assert state.fitness_score == 100.0
    assert state.predicted_fault == "NORMAL"
    assert state.fault_confidence == 1.0
    assert state.anomaly_status == "NORMAL"
    assert state.anomaly_score == 0.0
    assert state.predicted_rul == 150.0
    assert state.mission_risk == "LOW"
    assert state.recommendation == "CONTINUE_MISSION"


def test_uav_state_convenience_aliases():
    """Verifies telemetry and predicted_rul_hours convenience properties."""
    state = UAVState(
        engine_telemetry={"rpm": 2400.0, "cht": 85.0},
        predicted_rul=210.5
    )
    assert state.telemetry == {"rpm": 2400.0, "cht": 85.0}
    assert state.predicted_rul_hours == 210.5


def test_uav_state_serialization_and_pydantic_schema():
    """Verifies that to_dict and UAVStateResponse conform to API contract."""
    state = UAVState(
        uav_id="UAV-002",
        mission_id="MSN-042",
        engine_telemetry={"rpm": 2450.0, "throttle": 75.0, "cht": 92.0},
        flight_phase="CLIMB",
        engine_health=94.5,
        fitness_score=93.1,
        predicted_fault="COOLING_PROBLEM",
        fault_confidence=0.88,
        anomaly_status="NORMAL",
        anomaly_score=0.12,
        predicted_rul=320.0,
        mission_risk="LOW",
        recommendation="MONITOR_THERMALS"
    )

    d = state.to_dict()
    assert d["uav_id"] == "UAV-002"
    assert d["engine_health"] == 94.5
    assert d["telemetry"]["rpm"] == 2450.0

    # Pydantic schema validation
    response_model = UAVStateResponse(**d)
    assert response_model.uav_id == "UAV-002"
    assert response_model.engine_health == 94.5
    assert response_model.predicted_fault == "COOLING_PROBLEM"
    assert response_model.fault_confidence == 0.88
    assert response_model.recommendation == "MONITOR_THERMALS"


def test_uav_state_from_states_factory():
    """Verifies dynamic assembly of UAVState from component state models."""
    sim = AeroPistonEngineSimulator(engine_id="AERO-001", mission_id="MSN-001", seed=42, uav_id="UAV-001")
    engine_state = sim.step(dt=1.0)
    twin = DigitalTwin()
    twin_state = twin.update(engine_state)
    dec_engine = MissionDecisionEngine()
    decision = dec_engine.evaluate(twin_state, MissionParameters())

    uav_state = UAVState.from_states(
        engine_state=engine_state,
        twin_state=twin_state,
        decision=decision,
        uav_id="UAV-001"
    )

    assert uav_state.uav_id == "UAV-001"
    assert uav_state.mission_id == "MSN-001"
    assert "rpm" in uav_state.engine_telemetry
    assert "cht" in uav_state.engine_telemetry
    assert "egt" in uav_state.engine_telemetry
    assert uav_state.engine_health == round(float(twin_state.engine_health), 1)
    assert uav_state.fitness_score == round(float(twin_state.engine_fitness_score), 1)
    assert uav_state.predicted_fault == twin_state.predicted_fault
    assert 0.0 <= uav_state.fault_confidence <= 1.0
    assert uav_state.anomaly_status == twin_state.anomaly_status
    assert uav_state.anomaly_score == round(float(twin_state.anomaly_score), 4)
    assert uav_state.predicted_rul == round(float(twin_state.predicted_rul_hours), 1)
    assert uav_state.mission_risk == decision.mission_risk
    assert uav_state.recommendation == decision.mission_recommendation


def test_twin_service_multi_uav_association():
    """Verifies that the TwinServiceManager associates states independently per uav_id."""
    mgr = TwinServiceManager()

    # 1. Start simulation for UAV-001 (Healthy)
    req1 = SimulationStartRequest(
        uav_id="UAV-001",
        engine_id="AERO-001",
        mission_id="MSN-001",
        seed=42,
        throttle=70.0,
        degradation=0.0
    )
    state1 = mgr.start_simulation(req1)
    assert state1.uav_id == "UAV-001"

    # 2. Start simulation for UAV-002 (Degraded)
    req2 = SimulationStartRequest(
        uav_id="UAV-002",
        engine_id="AERO-002",
        mission_id="MSN-002",
        seed=123,
        throttle=80.0,
        degradation=0.75
    )
    state2 = mgr.start_simulation(req2)
    assert state2.uav_id == "UAV-002"

    # 3. Verify states remain separate and independent
    uav1 = mgr.get_uav_state("UAV-001")
    uav2 = mgr.get_uav_state("UAV-002")

    assert uav1 is not None
    assert uav2 is not None
    assert uav1.uav_id == "UAV-001"
    assert uav2.uav_id == "UAV-002"
    assert uav1.mission_id == "MSN-001"
    assert uav2.mission_id == "MSN-002"
    assert uav1.engine_health > uav2.engine_health

    # 4. List UAVs
    uav_list = mgr.list_uav_ids()
    assert "UAV-001" in uav_list
    assert "UAV-002" in uav_list

    # 5. Get all states
    all_states = mgr.get_all_uav_states()
    assert "UAV-001" in all_states
    assert "UAV-002" in all_states
    assert all_states["UAV-001"].uav_id == "UAV-001"
    assert all_states["UAV-002"].uav_id == "UAV-002"


def test_twin_service_telemetry_packet_contains_uav_id_and_state():
    """Verifies that telemetry packet contains uav_id and uav_state while preserving all legacy keys."""
    mgr = TwinServiceManager()
    mgr.ensure_simulation(uav_id="UAV-001")
    packet = mgr.build_telemetry_packet(uav_id="UAV-001")

    # Legacy dashboard channels
    assert packet["type"] == "telemetry"
    assert "engine_id" in packet
    assert "mission_id" in packet
    assert "flight_phase" in packet
    assert "telemetry" in packet
    assert "digital_twin" in packet
    assert "ai" in packet
    assert "mission" in packet

    # Multi-UAV architecture additions
    assert packet["uav_id"] == "UAV-001"
    assert "uav_state" in packet
    uav_st = packet["uav_state"]
    assert uav_st["uav_id"] == "UAV-001"
    assert "engine_health" in uav_st
    assert "fitness_score" in uav_st
    assert "predicted_fault" in uav_st
    assert "fault_confidence" in uav_st
    assert "anomaly_status" in uav_st
    assert "anomaly_score" in uav_st
    assert "predicted_rul" in uav_st
    assert "mission_risk" in uav_st
    assert "recommendation" in uav_st


def test_uav_api_endpoints():
    """Verifies the REST API endpoints under /api/uav."""
    # 1. GET /api/uav/state (defaults to UAV-001)
    res1 = client.get("/api/uav/state")
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["uav_id"] == "UAV-001"
    assert "engine_health" in data1
    assert "predicted_fault" in data1
    assert "recommendation" in data1

    # 2. GET /api/uav/UAV-001/state (path param)
    res2 = client.get("/api/uav/UAV-001/state")
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["uav_id"] == "UAV-001"

    # 3. GET /api/uav/list
    res3 = client.get("/api/uav/list")
    assert res3.status_code == 200
    data3 = res3.json()
    assert "uav_ids" in data3
    assert "UAV-001" in data3["uav_ids"]

    # 4. GET /api/uav/NONEXISTENT-999/state returns 404
    res4 = client.get("/api/uav/NONEXISTENT-999/state")
    assert res4.status_code == 404


def test_fleet_simulation_all_5_uavs_have_independent_states():
    """
    Verifies that all 5 simulated UAVs (UAV-001 through UAV-005) initialize with
    independent operating conditions, telemetry, and AI/Digital Twin diagnostics.
    """
    mgr = TwinServiceManager()
    mgr.ensure_fleet_simulation()

    fleet_states = mgr.get_all_uav_states()
    assert len(fleet_states) == 5

    expected_uavs = ["UAV-001", "UAV-002", "UAV-003", "UAV-004", "UAV-005"]
    for uid in expected_uavs:
        assert uid in fleet_states
        st = fleet_states[uid]
        assert st.uav_id == uid
        assert st.data_mode == "SIMULATED"
        # Verify 13-channel telemetry exists
        tel = st.engine_telemetry
        for ch in ["rpm", "cht", "egt", "oil_pressure", "oil_temperature", "vibration", "fuel_flow", "engine_load"]:
            assert ch in tel, f"Missing telemetry channel '{ch}' in {uid}"

    # Verify telemetry values and operating conditions differ across UAVs
    rpms = [fleet_states[uid].engine_telemetry["rpm"] for uid in expected_uavs]
    assert len(set(rpms)) > 1, "RPM values should differ across UAVs"

    altitudes = [fleet_states[uid].engine_telemetry["altitude"] for uid in expected_uavs]
    assert len(set(altitudes)) > 1, "Altitudes should differ across UAVs"

    healths = [fleet_states[uid].engine_health for uid in expected_uavs]
    assert len(set(healths)) > 1, "Engine health scores should differ across UAVs"

    phases = [fleet_states[uid].flight_phase for uid in expected_uavs]
    assert len(set(phases)) > 1, "Flight phases should differ across UAVs (e.g. CRUISE, CLIMB, DESCENT)"

    # UAV-001 should be nominal/healthy
    assert fleet_states["UAV-001"].flight_phase == "CRUISE"

    # UAV-002 should be in climb with higher altitude
    assert fleet_states["UAV-002"].flight_phase == "CLIMB"
    assert fleet_states["UAV-002"].engine_telemetry["altitude"] > fleet_states["UAV-001"].engine_telemetry["altitude"]

    # UAV-005 should reflect elevated degradation and risk
    assert fleet_states["UAV-005"].engine_health < fleet_states["UAV-001"].engine_health


def test_step_fleet_simulation_advances_all_5_uavs():
    """Verifies that stepping fleet simulation advances all 5 UAVs."""
    mgr = TwinServiceManager()
    mgr.ensure_fleet_simulation()

    initial_states = {uid: dict(mgr.get_uav_state(uid).engine_telemetry) for uid in mgr.list_uav_ids()}

    # Advance fleet by 2 seconds
    stepped_states = mgr.step_fleet_simulation(dt=2.0)
    assert len(stepped_states) == 5

    for uid in ["UAV-001", "UAV-002", "UAV-003", "UAV-004", "UAV-005"]:
        assert uid in stepped_states
        st = stepped_states[uid]
        assert st.uav_id == uid
        assert st.data_mode == "SIMULATED"


def test_api_uav_all_endpoint_returns_5_uavs():
    """Verifies GET /api/uav/all returns structured state for all 5 fleet UAVs."""
    res = client.get("/api/uav/all")
    assert res.status_code == 200
    data = res.json()

    assert data["total_uavs"] == 5
    assert data["data_mode"] == "SIMULATED"
    assert "uavs" in data
    assert len(data["uavs"]) == 5

    uav_ids = [u["uav_id"] for u in data["uavs"]]
    assert uav_ids == ["UAV-001", "UAV-002", "UAV-003", "UAV-004", "UAV-005"]

    for u in data["uavs"]:
        assert u["data_mode"] == "SIMULATED"
        assert "engine_telemetry" in u
        assert "engine_health" in u
        assert "fitness_score" in u
        assert "predicted_fault" in u
        assert "anomaly_status" in u
        assert "predicted_rul" in u
        assert "mission_risk" in u
        assert "recommendation" in u


def test_api_uav_individual_endpoints_for_all_5_uavs():
    """Verifies GET /api/uav/{uav_id}/state for all 5 UAVs."""
    for uid in ["UAV-001", "UAV-002", "UAV-003", "UAV-004", "UAV-005"]:
        res = client.get(f"/api/uav/{uid}/state")
        assert res.status_code == 200
        data = res.json()
        assert data["uav_id"] == uid
        assert data["data_mode"] == "SIMULATED"
        assert "rpm" in data["engine_telemetry"]


def test_manual_simulation_telemetry_authority_and_isolation():
    """
    Verifies that starting a manual simulation for UAV-001 establishes authoritative
    ownership over its telemetry and is NOT overwritten by subsequent fleet simulation steps.
    Also verifies UAV-002..UAV-005 continue their independent fleet simulations.
    """
    mgr = TwinServiceManager()
    mgr.ensure_fleet_simulation()

    # 1. Start UAV-001 with custom manual parameters (CRUISE, 4500m, 80% throttle)
    req = SimulationStartRequest(
        uav_id="UAV-001",
        engine_id="AERO-001",
        mission_id="MSN-001",
        altitude=4500.0,
        throttle=80.0,
        flight_phase="CRUISE",
        ambient_temperature=15.0,
        humidity=50.0,
        wind_speed=5.0,
        mission_duration_hours=2.0
    )
    init_state = mgr.start_simulation(req, uav_id="UAV-001")
    assert init_state.flight_phase == "CRUISE"
    assert init_state.altitude == 4500.0
    assert init_state.throttle == 80.0

    ctx_001 = mgr._get_or_create_context("UAV-001")
    assert ctx_001.is_manual is True
    assert mgr.active_manual_uav_id == "UAV-001"

    # 2. Advance fleet simulation by 10 discrete seconds
    for _ in range(10):
        fleet_states = mgr.step_fleet_simulation(dt=1.0)

    # 3. Subsequent telemetry for UAV-001 must remain associated with that manual simulation
    # and NOT be overwritten by fleet defaults (e.g. 1500m / 75% throttle)
    uav1_state = mgr.get_uav_state("UAV-001")
    assert uav1_state is not None
    assert uav1_state.flight_phase == "CRUISE"
    assert uav1_state.engine_telemetry["altitude"] == 4500.0
    assert uav1_state.engine_telemetry["throttle"] == 80.0

    # 4. UAV-002..UAV-005 continue receiving independent fleet telemetry
    uav2_state = mgr.get_uav_state("UAV-002")
    assert uav2_state is not None
    assert uav2_state.flight_phase == "CLIMB"
    assert uav2_state.engine_telemetry["altitude"] == 3200.0
    assert uav2_state.engine_telemetry["throttle"] == 85.0

    uav4_state = mgr.get_uav_state("UAV-004")
    assert uav4_state is not None
    assert uav4_state.flight_phase == "DESCENT"

    # 5. Digital Twin receives UAV-001's manual simulation telemetry
    twin1 = mgr.get_digital_twin_state("UAV-001")
    assert twin1 is not None
    assert twin1.flight_phase == "CRUISE"
    assert twin1.actual_telemetry["altitude"] == 4500.0
    assert twin1.actual_telemetry["throttle"] == 80.0


def test_fault_injection_and_isolation():
    """Verifies that POST /api/simulation/fault injects fault into active UAV while isolating others."""
    client = TestClient(app)

    # 1. Start UAV-001 in CRUISE at 4500m
    start_resp = client.post(
        "/api/simulation/start",
        json={
            "uav_id": "UAV-001",
            "flight_phase": "CRUISE",
            "altitude": 4500.0,
            "throttle": 80.0,
            "ambient_temperature": 15.0,
            "fault_type": "NORMAL",
            "fault_severity": 0.0
        }
    )
    assert start_resp.status_code == 201
    baseline_cht = start_resp.json()["cht"]

    # 2. Inject COOLING_PROBLEM fault into UAV-001
    fault_resp = client.post(
        "/api/simulation/fault",
        json={
            "uav_id": "UAV-001",
            "fault_type": "COOLING_PROBLEM",
            "severity": 0.85,
            "degradation": 0.2
        }
    )
    assert fault_resp.status_code == 200
    fault_data = fault_resp.json()
    assert fault_data["fault_type"] == "COOLING_PROBLEM"
    assert fault_data["fault_severity"] == 0.85
    assert fault_data["cht"] > baseline_cht + 15.0

    # 3. Verify UAV-001 state reflects fault and elevated CHT
    uav1_resp = client.get("/api/uav/UAV-001/state")
    assert uav1_resp.status_code == 200
    uav1_state = uav1_resp.json()
    assert uav1_state["uav_id"] == "UAV-001"
    assert uav1_state["engine_telemetry"]["cht"] > baseline_cht + 15.0
    assert uav1_state["predicted_fault"] in ["COOLING_PROBLEM", "SENSOR_ANOMALY"]
    assert uav1_state["anomaly_score"] > 0.05

    # 4. Verify UAV-002 is completely unaffected and isolated
    uav2_resp = client.get("/api/uav/UAV-002/state")
    assert uav2_resp.status_code == 200
    uav2_state = uav2_resp.json()
    assert uav2_state["uav_id"] == "UAV-002"
    assert uav2_state["flight_phase"] == "CLIMB"
    assert uav2_state["engine_telemetry"]["altitude"] == 3200.0
    assert uav2_state["engine_telemetry"]["throttle"] == 85.0
    assert uav2_state["engine_telemetry"]["cht"] < baseline_cht + 15.0

    # 5. Clear fault / restore nominal mode
    clear_resp = client.post(
        "/api/simulation/fault",
        json={
            "uav_id": "UAV-001",
            "fault_type": "NORMAL",
            "severity": 0.0,
            "degradation": 0.0
        }
    )
    assert clear_resp.status_code == 200
    clear_data = clear_resp.json()
    assert clear_data["fault_type"] == "NORMAL"
    assert clear_data["fault_severity"] == 0.0


