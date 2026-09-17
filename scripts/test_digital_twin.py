#!/usr/bin/env python3
"""
AeroTwin-UAV Digital Twin Demonstration Script
==============================================
Runs and evaluates the Digital Twin logic across three distinct operational scenarios:
1. Healthy Cruise
2. High-Temperature / High-Throttle Operation
3. Degraded / Fault Condition (Lubrication Problem)

Demonstrates:
- Physics baseline generation
- Parameter deviation tracking
- Real-time fusion with trained AI models (Fault, Anomaly, RUL)
- Engine Health and Engine Fitness calculations
- Overall status determination

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
from backend.app.digital_twin import DigitalTwin, DigitalTwinState


def print_scenario_result(scenario_name: str, state: DigitalTwinState):
    """Prints scenario results adhering to the required project demonstration format."""
    print("=" * 60)
    print(f"Scenario:        {scenario_name}")
    print("=" * 60)
    print(f"Engine Health:   {state.engine_health:.1f} / 100")
    print(f"Fitness Score:   {state.engine_fitness_score:.1f} / 100")
    print(f"Predicted Fault: {state.predicted_fault}")
    print(f"Anomaly Status:  {state.anomaly_status}")
    print(f"Anomaly Score:   {state.anomaly_score:.4f}")
    print(f"Predicted RUL:   {state.predicted_rul_hours:.1f} hours")
    print(f"Overall Status:  {state.overall_status}")
    print("-" * 60)
    print("Telemetry Comparison (Actual vs Expected):")
    for param in ["rpm", "cht", "egt", "oil_pressure", "oil_temperature", "vibration", "fuel_flow", "engine_load"]:
        dev = state.deviations.get(param)
        if dev:
            print(f"  {param:<15}: Actual = {dev.actual:>7.2f} {dev.unit:<4} | Expected = {dev.expected:>7.2f} {dev.unit:<4} | Diff = {dev.absolute_deviation:>6.2f} ({dev.relative_deviation_pct:>+6.1f}%) [{dev.status}]")
    print("=" * 60 + "\n")


def main():
    print("\n" + "#" * 65)
    print(" AEROTWIN-UAV: DIGITAL TWIN INTEGRATED LOGIC VERIFICATION")
    print("#" * 65 + "\n")

    # Initialize Digital Twin with trained models
    print("[*] Initializing Digital Twin and loading AI model artifacts...")
    twin = DigitalTwin()
    print("[OK] Fault classifier, Anomaly detector, and RUL regressor loaded successfully.\n")

    # =========================================================================
    # SCENARIO 1: Healthy Cruise
    # =========================================================================
    sim_healthy = AeroPistonEngineSimulator(
        engine_id="AERO-001",
        mission_id="MSN-CRUISE-01",
        seed=42,
        degradation=0.0
    )
    sim_healthy.set_inputs(
        throttle=65.0,
        altitude=4500.0,
        ambient_temperature=12.0,
        humidity=45.0,
        wind_speed=5.0,
        flight_phase=FlightPhase.CRUISE
    )
    # Warmup simulation steps to reach thermal equilibrium
    for _ in range(12):
        telemetry_healthy = sim_healthy.step(1.0)

    state_healthy = twin.update(telemetry_healthy)
    print_scenario_result("SCENARIO 1: Healthy Cruise", state_healthy)

    # =========================================================================
    # SCENARIO 2: High-Temperature / High-Throttle Operation
    # =========================================================================
    sim_hot = AeroPistonEngineSimulator(
        engine_id="AERO-001",
        mission_id="MSN-CLIMB-HOT",
        seed=42,
        degradation=0.05
    )
    sim_hot.set_inputs(
        throttle=95.0,
        altitude=1500.0,
        ambient_temperature=42.0,  # Extreme desert ambient temperature
        humidity=25.0,
        wind_speed=12.0,
        flight_phase=FlightPhase.TAKEOFF
    )
    for _ in range(12):
        telemetry_hot = sim_hot.step(1.0)

    state_hot = twin.update(telemetry_hot)
    print_scenario_result("SCENARIO 2: High-Temperature / High-Throttle Operation", state_hot)

    # =========================================================================
    # SCENARIO 3: Degraded / Fault Condition (Lubrication Problem)
    # =========================================================================
    sim_fault = AeroPistonEngineSimulator(
        engine_id="AERO-001",
        mission_id="MSN-FAULT-LUB",
        seed=42,
        degradation=0.65
    )
    sim_fault.set_inputs(
        throttle=68.0,
        altitude=4500.0,
        ambient_temperature=15.0,
        flight_phase=FlightPhase.CRUISE
    )
    for _ in range(10):
        sim_fault.step(1.0)

    # Inject severe lubrication failure
    sim_fault.inject_fault(FaultType.LUBRICATION_PROBLEM, severity=0.85)
    for _ in range(15):
        telemetry_fault = sim_fault.step(1.0)

    state_fault = twin.update(telemetry_fault)
    print_scenario_result("SCENARIO 3: Degraded / Fault Condition (Lubrication Problem)", state_fault)

    print("[PASS] Digital Twin demonstration script completed successfully.\n")


if __name__ == '__main__':
    main()
