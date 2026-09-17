#!/usr/bin/env python3
"""
AeroTwin-UAV Mission Risk & Reliability Decision Engine Demonstration Script
=============================================================================
Evaluates the Decision Engine across three representative operational scenarios:
1. Healthy Cruise Mission
2. High Altitude + High Temperature + High Throttle
3. Degraded Engine with a Simulated Fault (Cooling Problem)

Demonstrates:
- Digital Twin telemetry processing
- Environmental stress calculation
- RUL adequacy and mission margin
- Mission reliability scoring
- Risk categorization (LOW, MEDIUM, HIGH)
- Decision-support recommendation and structured reasoning

Software-only research prototype.
"""

import os
import sys

# Ensure repository root is on sys.path
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

# Ensure standard UTF-8 console output on Windows
if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

from backend.app.simulation import AeroPistonEngineSimulator, FlightPhase, FaultType
from backend.app.digital_twin import DigitalTwin
from backend.app.decision import (
    MissionDecisionEngine,
    MissionParameters,
    MissionDecision
)


def print_mission_scenario(scenario_title: str, decision: MissionDecision):
    """Prints scenario output strictly matching the format specified in Section 15."""
    print("=" * 65)
    print(f"MISSION SCENARIO: {scenario_title}")
    print("=" * 65)
    print(f"Mission duration:     {decision.mission_duration_hours:.1f} hours")
    print(f"Altitude:             {decision.altitude:.0f} m")
    print(f"Temperature:          {decision.ambient_temperature:.1f} °C")
    print(f"Throttle:             {decision.throttle:.1f} %\n")

    print(f"Engine health:        {decision.engine_health:.1f} / 100")
    print(f"Fitness:              {decision.engine_fitness_score:.1f} / 100\n")

    print(f"Predicted fault:      {decision.predicted_fault}")
    print(f"Fault probability:    {decision.dominant_fault_probability:.4f}\n")

    print(f"Anomaly score:        {decision.anomaly_score:.4f}")
    print(f"Predicted RUL:        {decision.predicted_rul_hours:.1f} hours\n")

    print(f"RUL margin:           {decision.rul_margin_hours:.1f} hours ({decision.rul_adequacy})\n")

    print(f"Environmental stress: {decision.environmental_stress:.3f}\n")

    print(f"Mission reliability:  {decision.mission_reliability_score:.1f} / 100")
    print(f"Mission risk:         {decision.mission_risk}")
    print(f"Recommendation:       {decision.mission_recommendation}\n")

    print(f"Reason codes:         {', '.join(decision.reason_codes)}")
    print(f"Explanation:          {decision.explanation}")
    print("=" * 65 + "\n")


def main():
    print("\n" + "#" * 68)
    print(" AEROTWIN-UAV: MISSION RISK & RELIABILITY DECISION ENGINE DEMO")
    print("#" * 68 + "\n")

    twin = DigitalTwin()
    decision_engine = MissionDecisionEngine()

    # =========================================================================
    # SCENARIO 1: Healthy Cruise Mission (2.0 hours)
    # =========================================================================
    sim_healthy = AeroPistonEngineSimulator(seed=42, degradation=0.0)
    sim_healthy.set_inputs(
        throttle=65.0,
        altitude=3500.0,
        ambient_temperature=15.0,
        flight_phase=FlightPhase.CRUISE
    )
    for _ in range(12):
        tel_healthy = sim_healthy.step(1.0)

    twin_state_1 = twin.update(tel_healthy)
    decision_1 = decision_engine.evaluate(
        twin_state_1,
        MissionParameters(
            mission_duration_hours=2.0,
            altitude=3500.0,
            ambient_temperature=15.0,
            throttle=65.0,
            flight_phase="CRUISE"
        )
    )
    print_mission_scenario("SCENARIO 1: Healthy Cruise Mission", decision_1)

    # =========================================================================
    # SCENARIO 2: High Altitude + High Temperature + High Throttle (4.0 hours)
    # =========================================================================
    sim_hot_high = AeroPistonEngineSimulator(seed=42, degradation=0.1)
    sim_hot_high.set_inputs(
        throttle=90.0,
        altitude=6800.0,
        ambient_temperature=38.0,
        flight_phase=FlightPhase.CLIMB
    )
    for _ in range(12):
        tel_hot_high = sim_hot_high.step(1.0)

    twin_state_2 = twin.update(tel_hot_high)
    decision_2 = decision_engine.evaluate(
        twin_state_2,
        MissionParameters(
            mission_duration_hours=4.0,
            altitude=6800.0,
            ambient_temperature=38.0,
            throttle=90.0,
            flight_phase="CLIMB"
        )
    )
    print_mission_scenario("SCENARIO 2: High Altitude + High Temp + High Throttle", decision_2)

    # =========================================================================
    # SCENARIO 3: Degraded Engine with a Simulated Fault (Cooling Problem)
    # =========================================================================
    sim_fault = AeroPistonEngineSimulator(seed=42, degradation=0.70)
    sim_fault.set_inputs(
        throttle=70.0,
        altitude=4000.0,
        ambient_temperature=22.0,
        flight_phase=FlightPhase.CRUISE
    )
    for _ in range(10):
        sim_fault.step(1.0)
    sim_fault.inject_fault(FaultType.COOLING_PROBLEM, severity=0.85)
    for _ in range(15):
        tel_fault = sim_fault.step(1.0)

    twin_state_3 = twin.update(tel_fault)
    decision_3 = decision_engine.evaluate(
        twin_state_3,
        MissionParameters(
            mission_duration_hours=3.5,
            altitude=4000.0,
            ambient_temperature=22.0,
            throttle=70.0,
            flight_phase="CRUISE"
        )
    )
    print_mission_scenario("SCENARIO 3: Degraded Engine with Cooling Fault", decision_3)

    print("[PASS] Mission risk decision engine demonstration completed successfully.\n")


if __name__ == '__main__':
    main()
