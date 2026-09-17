#!/usr/bin/env python3
"""
Unit Tests for AeroTwin-UAV Engine Simulation Module
====================================================
Verifies:
- Simulator initializes with default and custom configurations
- Simulation step advances time and updates engine state
- Telemetry contains all required channels
- Absence of NaN or Infinite values
- Values remain within plausible physical safety bounds
- Degradation progressively shifts telemetry
- Cooling problem raises thermal parameters (CHT, oil temperature)
- Lubrication problem drops oil pressure and increases vibration
- Misfire increases vibration and decreases/destabilizes RPM
- Sensor anomaly specifically perturbs the designated channel
- Full mission simulation progresses through all 6 flight phases
- Seeded pseudo-random generation provides exact reproducibility

Author: AeroTwin-UAV Architecture Team
"""

import math
import pytest
import numpy as np

from backend.app.simulation import (
    AeroPistonEngineSimulator,
    EngineParameters,
    SimulationInputs,
    EngineState,
    FlightPhase,
    MISSION_PHASE_SEQUENCE,
    FaultType,
    FaultConfig
)

REQUIRED_TELEMETRY_FIELDS = [
    'engine_id',
    'mission_id',
    'timestamp',
    'flight_phase',
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
    'engine_load',
    'degradation',
    'fault_type',
    'fault_severity'
]


def test_simulator_initialization():
    """Verifies that simulator initializes cleanly with default and explicit parameters."""
    sim = AeroPistonEngineSimulator(engine_id="AERO-001", mission_id="MSN-001", seed=42)
    assert sim.engine_id == "AERO-001"
    assert sim.mission_id == "MSN-001"
    assert sim.degradation == 0.0
    assert sim.fault_config.fault_type == FaultType.NORMAL
    assert sim.step_count == 0
    assert sim.operating_hours == 0.0


def test_simulation_step_works():
    """Verifies that stepping advances clock, step count, and produces an EngineState."""
    sim = AeroPistonEngineSimulator(seed=42)
    initial_time = sim.current_time

    state = sim.step(dt=1.0)
    assert isinstance(state, EngineState)
    assert sim.step_count == 1
    assert sim.operating_hours > 0.0
    assert sim.current_time > initial_time

    # Advance again by 2.5s
    state2 = sim.step(dt=2.5)
    assert sim.step_count == 2
    assert state2.timestamp != state.timestamp


def test_telemetry_contains_required_fields():
    """Verifies that the generated telemetry contains all 19 standard channels."""
    sim = AeroPistonEngineSimulator(seed=42)
    state = sim.step(dt=1.0)
    data = state.to_dict()

    for field in REQUIRED_TELEMETRY_FIELDS:
        assert field in data, f"Required telemetry field '{field}' missing from EngineState!"


def test_no_nan_or_infinite_values():
    """Verifies that no telemetry channel produces NaN or Infinite values under normal and edge conditions."""
    sim = AeroPistonEngineSimulator(seed=42)

    # Test under multiple conditions: extreme altitude, temperatures, throttle
    test_conditions = [
        {"throttle": 0.0, "altitude": 0.0, "ambient_temperature": -15.0},
        {"throttle": 50.0, "altitude": 4000.0, "ambient_temperature": 15.0},
        {"throttle": 100.0, "altitude": 7500.0, "ambient_temperature": 45.0},
    ]

    for cond in test_conditions:
        sim.set_inputs(**cond)
        for _ in range(5):
            state = sim.step(dt=1.0)
            data = state.to_dict()
            for key, val in data.items():
                if isinstance(val, (int, float)):
                    assert not math.isnan(val), f"Field '{key}' is NaN under condition {cond}!"
                    assert not math.isinf(val), f"Field '{key}' is Infinite under condition {cond}!"


def test_values_remain_within_valid_ranges():
    """Verifies physical plausibility limits (non-negative, realistic aviation bounds)."""
    sim = AeroPistonEngineSimulator(seed=42)
    sim.set_inputs(throttle=65.0, altitude=3000.0, flight_phase=FlightPhase.CRUISE)

    for _ in range(20):
        st = sim.step(dt=1.0)
        assert 0.0 <= st.rpm <= 6500.0
        assert 0.0 <= st.throttle <= 100.0
        assert 0.0 <= st.altitude <= 8500.0
        assert 0.0 <= st.cht <= 300.0
        assert 0.0 <= st.egt <= 1100.0
        assert 0.0 <= st.oil_pressure <= 10.0
        assert 0.0 <= st.oil_temperature <= 200.0
        assert 0.0 <= st.vibration <= 50.0
        assert 0.0 <= st.fuel_flow <= 80.0
        assert 0.0 <= st.engine_load <= 100.0


def test_degradation_changes_telemetry():
    """Verifies that higher mechanical degradation increases vibration & CHT while decreasing oil pressure."""
    # Healthy baseline
    sim_healthy = AeroPistonEngineSimulator(seed=42, degradation=0.0)
    sim_healthy.set_inputs(throttle=65.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(15):
        healthy_state = sim_healthy.step(1.0)

    # Degraded engine
    sim_degraded = AeroPistonEngineSimulator(seed=42, degradation=0.80)
    sim_degraded.set_inputs(throttle=65.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(15):
        degraded_state = sim_degraded.step(1.0)

    # Vibration should be noticeably higher
    assert degraded_state.vibration > healthy_state.vibration, "Degradation did not increase vibration!"
    # CHT should be elevated
    assert degraded_state.cht > healthy_state.cht, "Degradation did not elevate CHT!"
    # Oil pressure should be lower
    assert degraded_state.oil_pressure < healthy_state.oil_pressure, "Degradation did not decrease oil pressure!"


def test_cooling_fault_affects_thermal_parameters():
    """Verifies that COOLING_PROBLEM substantially raises CHT and oil temperature."""
    sim = AeroPistonEngineSimulator(seed=42, degradation=0.05)
    sim.set_inputs(throttle=70.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(10):
        baseline = sim.step(1.0)

    sim.inject_fault(FaultType.COOLING_PROBLEM, severity=0.8)
    for _ in range(15):
        faulted = sim.step(1.0)

    assert faulted.cht > baseline.cht + 20.0, f"COOLING_PROBLEM did not sufficiently raise CHT ({baseline.cht} -> {faulted.cht})"
    assert faulted.oil_temperature > baseline.oil_temperature + 8.0, "COOLING_PROBLEM did not raise oil temperature"


def test_lubrication_fault_affects_oil_pressure_and_vibration():
    """Verifies that LUBRICATION_PROBLEM causes sharp oil pressure loss and elevated vibration."""
    sim = AeroPistonEngineSimulator(seed=42, degradation=0.05)
    sim.set_inputs(throttle=70.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(10):
        baseline = sim.step(1.0)

    sim.inject_fault(FaultType.LUBRICATION_PROBLEM, severity=0.85)
    for _ in range(15):
        faulted = sim.step(1.0)

    assert faulted.oil_pressure < baseline.oil_pressure - 0.8, f"LUBRICATION_PROBLEM failed to reduce oil pressure ({baseline.oil_pressure} -> {faulted.oil_pressure})"
    assert faulted.vibration > baseline.vibration + 1.5, f"LUBRICATION_PROBLEM failed to increase vibration ({baseline.vibration} -> {faulted.vibration})"


def test_misfire_affects_rpm_and_vibration():
    """Verifies that MISFIRE causes severe torsional vibration and lowers/destabilizes RPM."""
    sim = AeroPistonEngineSimulator(seed=42, degradation=0.05)
    sim.set_inputs(throttle=70.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(10):
        baseline = sim.step(1.0)

    sim.inject_fault(FaultType.MISFIRE, severity=0.9)
    for _ in range(15):
        faulted = sim.step(1.0)

    assert faulted.vibration > baseline.vibration + 4.0, f"MISFIRE failed to trigger high vibration ({baseline.vibration} -> {faulted.vibration})"
    assert faulted.rpm < baseline.rpm, f"MISFIRE failed to reduce average RPM ({baseline.rpm} -> {faulted.rpm})"


def test_sensor_anomaly_affects_selected_sensor_only():
    """Verifies that SENSOR_ANOMALY only perturbs the designated channel, preserving other channels."""
    sim = AeroPistonEngineSimulator(seed=42, degradation=0.0)
    sim.set_inputs(throttle=65.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(10):
        baseline = sim.step(1.0)

    # Perturb only CHT sensor
    sim.inject_fault(FaultType.SENSOR_ANOMALY, severity=0.9, target_sensor="cht")
    for _ in range(5):
        faulted = sim.step(1.0)

    # CHT should show severe offset
    assert faulted.cht > baseline.cht + 35.0, "SENSOR_ANOMALY did not perturb targeted CHT channel!"
    # Unrelated mechanical sensors should remain unaffected
    assert abs(faulted.oil_pressure - baseline.oil_pressure) < 0.25, "SENSOR_ANOMALY leaked into oil pressure channel!"
    assert abs(faulted.vibration - baseline.vibration) < 0.6, "SENSOR_ANOMALY leaked into vibration channel!"


def test_mission_simulation_progresses_through_flight_phases():
    """Verifies that run_mission sequentially covers all 6 standard flight phases."""
    sim = AeroPistonEngineSimulator(seed=42, degradation=0.05)
    log = sim.run_mission(duration_hours=0.2, dt=2.0)

    assert len(log) > 50, "Mission run did not produce expected number of steps"

    phases_found = []
    for entry in log:
        if not phases_found or phases_found[-1] != entry.flight_phase:
            phases_found.append(entry.flight_phase)

    assert phases_found == [p.value for p in MISSION_PHASE_SEQUENCE], f"Mission did not traverse expected phases! Got {phases_found}"


def test_same_seed_produces_reproducible_output():
    """Verifies that two simulator instances with the same seed, inputs, and dt produce identical telemetry."""
    sim_a = AeroPistonEngineSimulator(seed=999, degradation=0.2)
    sim_b = AeroPistonEngineSimulator(seed=999, degradation=0.2)

    sim_a.set_inputs(throttle=72.0, altitude=3200.0, flight_phase=FlightPhase.CLIMB)
    sim_b.set_inputs(throttle=72.0, altitude=3200.0, flight_phase=FlightPhase.CLIMB)

    for i in range(10):
        st_a = sim_a.step(dt=1.0)
        st_b = sim_b.step(dt=1.0)

        assert st_a.rpm == st_b.rpm, f"Step {i}: RPM mismatch ({st_a.rpm} != {st_b.rpm})"
        assert st_a.cht == st_b.cht, f"Step {i}: CHT mismatch"
        assert st_a.egt == st_b.egt, f"Step {i}: EGT mismatch"
        assert st_a.oil_pressure == st_b.oil_pressure, f"Step {i}: Oil pressure mismatch"
        assert st_a.oil_temperature == st_b.oil_temperature, f"Step {i}: Oil temp mismatch"
        assert st_a.vibration == st_b.vibration, f"Step {i}: Vibration mismatch"
        assert st_a.fuel_flow == st_b.fuel_flow, f"Step {i}: Fuel flow mismatch"
        assert st_a.engine_load == st_b.engine_load, f"Step {i}: Engine load mismatch"
