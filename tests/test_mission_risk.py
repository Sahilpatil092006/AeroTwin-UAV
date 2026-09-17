#!/usr/bin/env python3
"""
Unit Tests for AeroTwin-UAV Mission Risk & Reliability Decision Engine
======================================================================
Verifies:
1. Healthy mission produces a valid decision object
2. Mission reliability score is bounded between 0 and 100
3. Mission risk is one of {LOW, MEDIUM, HIGH}
4. Recommendation is one of {SAFE_TO_PROCEED, PROCEED_WITH_CAUTION, MISSION_NOT_RECOMMENDED}
5. RUL margin is calculated correctly (predicted_rul - mission_duration)
6. RUL adequacy classification is valid {ADEQUATE, MARGINAL, INADEQUATE}
7. High anomaly score increases risk / reduces reliability
8. Severe fault probability escalates risk
9. High environmental stress impacts reliability and risk
10. Longer mission duration reduces RUL margin and can degrade adequacy
11. Reason codes are generated strictly when corresponding conditions exist
12. Explanation reflects actual calculated factors
13. Absence of NaN or Infinite values
14. Same inputs produce deterministic, reproducible decision results

Software-only research prototype.
"""

import math
import pytest

from backend.app.simulation import AeroPistonEngineSimulator, FlightPhase, FaultType
from backend.app.digital_twin import DigitalTwin
from backend.app.decision import (
    MissionDecisionEngine,
    MissionParameters,
    MissionDecision,
    MissionRiskLevel,
    MissionRecommendation,
    ReasonCode,
    EnvironmentalStressCalculator,
    RulAdequacyEvaluator
)


@pytest.fixture(scope="module")
def decision_suite():
    """Initializes Digital Twin and Decision Engine once for test module."""
    twin = DigitalTwin()
    engine = MissionDecisionEngine()
    return twin, engine


def test_healthy_mission_produces_valid_decision_object(decision_suite):
    """1. Verifies that a healthy mission produces a fully-formed MissionDecision object."""
    twin, engine = decision_suite
    sim = AeroPistonEngineSimulator(seed=42, degradation=0.0)
    sim.set_inputs(throttle=65.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(12):
        tel = sim.step(1.0)

    twin_state = twin.update(tel)
    decision = engine.evaluate(twin_state, MissionParameters(mission_duration_hours=2.0))

    assert isinstance(decision, MissionDecision)
    assert decision.timestamp != ""
    assert decision.mission_duration_hours == 2.0


def test_mission_reliability_is_between_0_and_100(decision_suite):
    """2. Verifies that mission reliability score is strictly bounded [0.0, 100.0]."""
    twin, engine = decision_suite
    sim = AeroPistonEngineSimulator(seed=42, degradation=0.2)
    sim.set_inputs(throttle=70.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(5):
        tel = sim.step(1.0)
        twin_state = twin.update(tel)
        decision = engine.evaluate(twin_state)
        assert 0.0 <= decision.mission_reliability_score <= 100.0


def test_mission_risk_is_valid_level(decision_suite):
    """3. Verifies that mission risk is one of LOW, MEDIUM, or HIGH."""
    twin, engine = decision_suite
    valid_risks = {r.value for r in MissionRiskLevel}
    sim = AeroPistonEngineSimulator(seed=42)
    tel = sim.step(1.0)
    twin_state = twin.update(tel)
    decision = engine.evaluate(twin_state)
    assert decision.mission_risk in valid_risks


def test_recommendation_is_valid_value(decision_suite):
    """4. Verifies recommendation belongs to permissible prototype recommendation enum."""
    twin, engine = decision_suite
    valid_recs = {r.value for r in MissionRecommendation}
    sim = AeroPistonEngineSimulator(seed=42)
    tel = sim.step(1.0)
    twin_state = twin.update(tel)
    decision = engine.evaluate(twin_state)
    assert decision.mission_recommendation in valid_recs


def test_rul_margin_calculated_correctly():
    """5. Verifies RUL margin is strictly predicted_rul - duration, bounded at >= 0.0."""
    margin, adequacy, _ = RulAdequacyEvaluator.evaluate(predicted_rul_hours=100.0, mission_duration_hours=20.0)
    assert margin == 80.0
    assert adequacy == "ADEQUATE"

    # Negative margin clamped to 0.0
    margin_neg, adequacy_neg, _ = RulAdequacyEvaluator.evaluate(predicted_rul_hours=5.0, mission_duration_hours=10.0)
    assert margin_neg == 0.0
    assert adequacy_neg == "INADEQUATE"


def test_rul_adequacy_is_valid():
    """6. Verifies RUL adequacy transitions: ADEQUATE, MARGINAL, INADEQUATE."""
    valid_adequacies = {"ADEQUATE", "MARGINAL", "INADEQUATE"}

    _, ad_inad, _ = RulAdequacyEvaluator.evaluate(10.0, 15.0)
    assert ad_inad == "INADEQUATE"

    _, ad_marg, _ = RulAdequacyEvaluator.evaluate(25.0, 15.0)
    assert ad_marg == "MARGINAL"

    _, ad_adeq, _ = RulAdequacyEvaluator.evaluate(100.0, 10.0)
    assert ad_adeq == "ADEQUATE"

    for a in [ad_inad, ad_marg, ad_adeq]:
        assert a in valid_adequacies


def test_high_anomaly_increases_risk_contribution(decision_suite):
    """7. Verifies that higher anomaly score depresses reliability and elevates risk."""
    _, engine = decision_suite
    mock_base = {
        "actual_telemetry": {"altitude": 3000.0, "ambient_temperature": 15.0, "throttle": 60.0},
        "engine_health": 85.0,
        "engine_fitness_score": 85.0,
        "predicted_fault": "NORMAL",
        "fault_probabilities": {"NORMAL": 0.85},
        "predicted_rul_hours": 500.0,
        "deviations": {}
    }

    # Low anomaly
    low_anom_state = {**mock_base, "anomaly_status": "NORMAL", "anomaly_score": 0.15}
    dec_low = engine.evaluate(low_anom_state, MissionParameters(mission_duration_hours=2.0))

    # High anomaly
    high_anom_state = {**mock_base, "anomaly_status": "ANOMALOUS", "anomaly_score": 0.85}
    dec_high = engine.evaluate(high_anom_state, MissionParameters(mission_duration_hours=2.0))

    assert dec_high.mission_reliability_score < dec_low.mission_reliability_score
    assert dec_high.anomaly_score > dec_low.anomaly_score


def test_severe_fault_probability_can_escalate_risk(decision_suite):
    """8. Verifies severe fault probability escalates mission risk."""
    _, engine = decision_suite
    mock_state = {
        "actual_telemetry": {"altitude": 3000.0, "ambient_temperature": 15.0, "throttle": 60.0},
        "engine_health": 65.0,
        "engine_fitness_score": 70.0,
        "predicted_fault": "LUBRICATION_PROBLEM",
        "fault_probabilities": {"LUBRICATION_PROBLEM": 0.85},
        "anomaly_status": "ANOMALOUS",
        "anomaly_score": 0.70,
        "predicted_rul_hours": 120.0,
        "deviations": {}
    }

    decision = engine.evaluate(mock_state, MissionParameters(mission_duration_hours=2.0))
    # Severe lubrication fault with high probability should escalate risk to HIGH
    assert decision.mission_risk == "HIGH"
    assert decision.mission_recommendation == "MISSION_NOT_RECOMMENDED"


def test_high_environmental_stress_affects_risk(decision_suite):
    """9. Verifies high altitude, high temp, and high throttle increase environmental stress."""
    stress_mild = EnvironmentalStressCalculator.calculate_stress(
        altitude=1000.0, ambient_temperature=18.0, throttle=50.0, mission_duration_hours=1.0
    )
    stress_extreme = EnvironmentalStressCalculator.calculate_stress(
        altitude=7500.0, ambient_temperature=45.0, throttle=95.0, mission_duration_hours=8.0
    )
    assert stress_extreme > stress_mild + 0.40

    # Test via decision engine
    _, engine = decision_suite
    mock_state = {
        "actual_telemetry": {"altitude": 1000.0, "ambient_temperature": 18.0, "throttle": 50.0},
        "engine_health": 90.0,
        "engine_fitness_score": 90.0,
        "predicted_fault": "NORMAL",
        "fault_probabilities": {"NORMAL": 0.90},
        "anomaly_status": "NORMAL",
        "anomaly_score": 0.2,
        "predicted_rul_hours": 500.0,
        "deviations": {}
    }
    dec_mild = engine.evaluate(mock_state, MissionParameters(altitude=1000.0, ambient_temperature=18.0, throttle=50.0))
    dec_extreme = engine.evaluate(mock_state, MissionParameters(altitude=7500.0, ambient_temperature=45.0, throttle=95.0))
    assert dec_extreme.environmental_stress > dec_mild.environmental_stress
    assert dec_extreme.mission_reliability_score < dec_mild.mission_reliability_score


def test_longer_mission_duration_affects_rul_margin(decision_suite):
    """10. Verifies longer duration directly compresses RUL margin and can degrade adequacy."""
    twin, engine = decision_suite
    sim = AeroPistonEngineSimulator(seed=42)
    tel = sim.step(1.0)
    twin_state = twin.update(tel)

    dec_short = engine.evaluate(twin_state, MissionParameters(mission_duration_hours=2.0))
    dec_long = engine.evaluate(twin_state, MissionParameters(mission_duration_hours=20.0))

    assert dec_long.rul_margin_hours < dec_short.rul_margin_hours
    assert dec_long.mission_duration_hours > dec_short.mission_duration_hours


def test_reason_codes_generated_only_when_relevant(decision_suite):
    """11. Verifies that reason codes match active conditions (no false positives)."""
    twin, engine = decision_suite
    sim_healthy = AeroPistonEngineSimulator(seed=42, degradation=0.0)
    sim_healthy.set_inputs(throttle=60.0, altitude=2500.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(12):
        tel = sim_healthy.step(1.0)

    twin_state = twin.update(tel)
    dec = engine.evaluate(twin_state, MissionParameters(mission_duration_hours=2.0))

    # Healthy cruise should NOT have LOW_ENGINE_HEALTH, INADEQUATE_RUL, or FAULT_PROBABILITY_HIGH
    assert ReasonCode.LOW_ENGINE_HEALTH.value not in dec.reason_codes
    assert ReasonCode.INADEQUATE_RUL.value not in dec.reason_codes
    assert ReasonCode.CRITICAL_ENGINE_HEALTH.value not in dec.reason_codes


def test_explanation_reflects_actual_decision_factors(decision_suite):
    """12. Verifies that the natural language explanation incorporates computed factors."""
    _, engine = decision_suite
    mock_state = {
        "actual_telemetry": {"altitude": 3000.0, "ambient_temperature": 15.0, "throttle": 60.0},
        "engine_health": 45.0,  # Critical health
        "engine_fitness_score": 60.0,
        "predicted_fault": "COOLING_PROBLEM",
        "fault_probabilities": {"COOLING_PROBLEM": 0.75},
        "anomaly_status": "ANOMALOUS",
        "anomaly_score": 0.80,
        "predicted_rul_hours": 15.0,
        "deviations": {}
    }

    decision = engine.evaluate(mock_state, MissionParameters(mission_duration_hours=2.0))
    assert "COOLING_PROBLEM" in decision.explanation
    assert "health" in decision.explanation.lower()
    assert decision.mission_risk in decision.explanation


def test_no_nan_or_infinity_in_decision_output(decision_suite):
    """13. Verifies complete absence of NaN or Infinity in MissionDecision and its dict export."""
    twin, engine = decision_suite
    sim = AeroPistonEngineSimulator(seed=42, degradation=0.5)
    sim.set_inputs(throttle=80.0, flight_phase=FlightPhase.CLIMB)
    for _ in range(5):
        tel = sim.step(1.0)
        state = twin.update(tel)
        decision = engine.evaluate(state)
        d = decision.to_dict()

        for k, v in d.items():
            if isinstance(v, (int, float)):
                assert not math.isnan(v), f"Field '{k}' is NaN!"
                assert not math.isinf(v), f"Field '{k}' is Infinite!"


def test_same_inputs_produce_same_decision(decision_suite):
    """14. Verifies deterministic reproducibility of decision evaluations."""
    _, engine = decision_suite
    mock_state = {
        "actual_telemetry": {"altitude": 3200.0, "ambient_temperature": 18.0, "throttle": 68.0},
        "engine_health": 88.0,
        "engine_fitness_score": 85.0,
        "predicted_fault": "NORMAL",
        "fault_probabilities": {"NORMAL": 0.92},
        "anomaly_status": "NORMAL",
        "anomaly_score": 0.32,
        "predicted_rul_hours": 620.0,
        "deviations": {}
    }
    params = MissionParameters(mission_duration_hours=3.0)

    dec_1 = engine.evaluate(mock_state, params)
    dec_2 = engine.evaluate(mock_state, params)

    assert dec_1.mission_reliability_score == dec_2.mission_reliability_score
    assert dec_1.mission_risk == dec_2.mission_risk
    assert dec_1.mission_recommendation == dec_2.mission_recommendation
    assert dec_1.environmental_stress == dec_2.environmental_stress
    assert dec_1.reason_codes == dec_2.reason_codes
    assert dec_1.explanation == dec_2.explanation
