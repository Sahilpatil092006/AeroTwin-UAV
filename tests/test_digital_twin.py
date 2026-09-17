#!/usr/bin/env python3
"""
Unit Tests for AeroTwin-UAV Digital Twin Logic
==============================================
Verifies:
- Digital Twin initializes cleanly
- Existing trained AI models (fault, anomaly, RUL) load properly
- Expected telemetry is generated via physics baseline model
- Deviations (absolute, relative, normalized) are computed correctly
- Safe division-by-zero handling in relative deviation calculations
- Engine Health score remains strictly between 0 and 100
- Engine Fitness score remains strictly between 0 and 100
- Overall status produces valid enum values (HEALTHY, WARNING, CRITICAL)
- Model inference returns non-empty valid predictions and probabilities
- Degraded telemetry produces distinct health and RUL states from healthy telemetry
- Repeated updates work smoothly across sequential timesteps
- Zero NaN or Infinite values appear anywhere in DigitalTwinState

Software-only research prototype.
"""

import os
import math
import pytest
import numpy as np

from backend.app.simulation import AeroPistonEngineSimulator, FlightPhase, FaultType
from backend.app.digital_twin import (
    DigitalTwin,
    DigitalTwinState,
    DigitalTwinModelLoadError,
    PhysicsBaselineModel,
    DeviationAnalyzer,
    HealthAssessment
)


@pytest.fixture(scope="module")
def twin():
    """Initializes the Digital Twin once for the test module."""
    return DigitalTwin()


def test_digital_twin_initializes(twin):
    """Verifies that the Digital Twin initializes and holds reference to components."""
    assert twin is not None
    assert twin.fault_model is not None
    assert twin.anomaly_model is not None
    assert twin.rul_model is not None
    assert twin.health_assessment is not None


def test_existing_models_loaded(twin):
    """Verifies that all three existing AI models are loaded and have expected predict methods."""
    assert hasattr(twin.fault_model, "predict")
    assert hasattr(twin.fault_model, "predict_proba")
    assert hasattr(twin.anomaly_model, "predict")
    assert hasattr(twin.anomaly_model, "decision_function")
    assert hasattr(twin.rul_model, "predict")


def test_expected_telemetry_is_generated():
    """Verifies that the physics baseline model generates expected values for all primary parameters."""
    sample_input = {
        "throttle": 70.0,
        "altitude": 3500.0,
        "ambient_temperature": 10.0,
        "flight_phase": "CRUISE"
    }
    exp = PhysicsBaselineModel.calculate_expected(sample_input)
    assert isinstance(exp, dict)
    required_expected = ["rpm", "cht", "egt", "oil_pressure", "oil_temperature", "vibration", "fuel_flow", "engine_load"]
    for param in required_expected:
        assert param in exp, f"Missing expected parameter '{param}'"
        assert exp[param] > 0.0, f"Expected parameter '{param}' should be positive"


def test_deviations_calculated_and_zero_division_handled():
    """Verifies deviation calculation and ensures safe handling of zero or near-zero expected values."""
    actual = {
        "rpm": 4500.0,
        "cht": 110.0,
        "egt": 780.0,
        "oil_pressure": 3.8,
        "oil_temperature": 85.0,
        "vibration": 3.5,
        "fuel_flow": 22.0,
        "engine_load": 65.0
    }
    expected = {
        "rpm": 4400.0,
        "cht": 105.0,
        "egt": 770.0,
        "oil_pressure": 0.0,  # Edge case: zero expected value to test division by zero protection
        "oil_temperature": 85.0,
        "vibration": 3.2,
        "fuel_flow": 21.0,
        "engine_load": 60.0
    }

    devs = DeviationAnalyzer.compute_deviations(actual, expected)
    assert "oil_pressure" in devs
    oil_dev = devs["oil_pressure"]
    assert not math.isnan(oil_dev.relative_deviation_pct)
    assert not math.isinf(oil_dev.relative_deviation_pct)
    assert oil_dev.absolute_deviation == 3.8


def test_health_score_is_between_0_and_100(twin):
    """Verifies that engine_health stays within [0.0, 100.0] under various conditions."""
    sim = AeroPistonEngineSimulator(seed=42, degradation=0.1)
    sim.set_inputs(throttle=65.0, flight_phase=FlightPhase.CRUISE)

    for _ in range(5):
        telemetry = sim.step(1.0)
        state = twin.update(telemetry)
        assert 0.0 <= state.engine_health <= 100.0, f"Health {state.engine_health} out of range [0, 100]"


def test_fitness_score_is_between_0_and_100(twin):
    """Verifies that engine_fitness_score stays within [0.0, 100.0] under various conditions."""
    sim = AeroPistonEngineSimulator(seed=42, degradation=0.1)
    sim.set_inputs(throttle=65.0, flight_phase=FlightPhase.CRUISE)

    for _ in range(5):
        telemetry = sim.step(1.0)
        state = twin.update(telemetry)
        assert 0.0 <= state.engine_fitness_score <= 100.0, f"Fitness {state.engine_fitness_score} out of range [0, 100]"


def test_overall_status_is_valid(twin):
    """Verifies that overall_status is one of HEALTHY, WARNING, or CRITICAL."""
    valid_statuses = {"HEALTHY", "WARNING", "CRITICAL"}
    sim = AeroPistonEngineSimulator(seed=42)
    telemetry = sim.step(1.0)
    state = twin.update(telemetry)
    assert state.overall_status in valid_statuses, f"Invalid overall status: {state.overall_status}"


def test_ai_inference_returns_valid_outputs(twin):
    """Verifies that all three AI models produce expected structured results."""
    sim = AeroPistonEngineSimulator(seed=42)
    sim.set_inputs(throttle=65.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(5):
        telemetry = sim.step(1.0)

    state = twin.update(telemetry)

    # Fault Classifier
    assert isinstance(state.predicted_fault, str)
    assert len(state.predicted_fault) > 0
    assert isinstance(state.fault_probabilities, dict)
    assert len(state.fault_probabilities) == 6
    assert abs(sum(state.fault_probabilities.values()) - 1.0) < 0.05

    # Anomaly Detector
    assert state.anomaly_status in ["NORMAL", "ANOMALOUS"]
    assert 0.0 <= state.anomaly_score <= 1.0

    # RUL Regressor
    assert state.predicted_rul_hours >= 0.0
    assert not math.isnan(state.predicted_rul_hours)
    assert not math.isinf(state.predicted_rul_hours)


def test_degraded_telemetry_produces_different_state_from_healthy(twin):
    """Verifies that severe degradation and faults trigger noticeable telemetry and state divergence."""
    # Healthy baseline
    sim_healthy = AeroPistonEngineSimulator(seed=42, degradation=0.0)
    sim_healthy.set_inputs(throttle=68.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(12):
        tel_healthy = sim_healthy.step(1.0)
    state_healthy = twin.update(tel_healthy)

    # Degraded / Faulted
    sim_degraded = AeroPistonEngineSimulator(seed=42, degradation=0.85)
    sim_degraded.set_inputs(throttle=68.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(10):
        sim_degraded.step(1.0)
    sim_degraded.inject_fault(FaultType.COOLING_PROBLEM, severity=0.9)
    for _ in range(12):
        tel_degraded = sim_degraded.step(1.0)
    state_degraded = twin.update(tel_degraded)

    # Health score must be substantially lower for degraded/faulted condition
    assert state_degraded.engine_health < state_healthy.engine_health - 15.0
    # Predicted RUL must be lower for degraded engine
    assert state_degraded.predicted_rul_hours < state_healthy.predicted_rul_hours
    # Overall status should indicate WARNING or CRITICAL
    assert state_degraded.overall_status in ["WARNING", "CRITICAL"]


def test_repeated_updates_work(twin):
    """Verifies that sequential real-time updates execute without state leakage or performance degradation."""
    sim = AeroPistonEngineSimulator(seed=123)
    sim.set_inputs(throttle=70.0, flight_phase=FlightPhase.CRUISE)

    states = []
    for _ in range(25):
        telemetry = sim.step(1.0)
        st = twin.update(telemetry)
        states.append(st)

    assert len(states) == 25
    # Timestamps should progress
    assert states[0].timestamp != states[-1].timestamp


def test_no_nan_or_infinity_in_digital_twin_output(twin):
    """Verifies that no numeric field in the entire DigitalTwinState is NaN or Infinite."""
    sim = AeroPistonEngineSimulator(seed=777, degradation=0.5)
    sim.set_inputs(throttle=85.0, altitude=6000.0, ambient_temperature=-5.0, flight_phase=FlightPhase.CLIMB)

    for _ in range(10):
        telemetry = sim.step(1.0)
        state = twin.update(telemetry)
        d = state.to_dict()

        def check_numeric_clean(obj, path=""):
            if isinstance(obj, dict):
                for k, v in obj.items():
                    check_numeric_clean(v, f"{path}.{k}")
            elif isinstance(obj, list):
                for i, v in enumerate(obj):
                    check_numeric_clean(v, f"{path}[{i}]")
            elif isinstance(obj, (int, float)):
                assert not math.isnan(obj), f"NaN found at {path} ({obj})"
                assert not math.isinf(obj), f"Infinity found at {path} ({obj})"

        check_numeric_clean(d, "DigitalTwinState")


def test_missing_model_raises_structured_error(tmp_path):
    """Verifies that DigitalTwin raises DigitalTwinModelLoadError if model files are missing."""
    with pytest.raises(DigitalTwinModelLoadError) as exc_info:
        DigitalTwin(models_dir=str(tmp_path))
    assert "Required AI model artifact missing" in str(exc_info.value)
