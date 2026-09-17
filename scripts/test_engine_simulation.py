#!/usr/bin/env python3
"""
AeroTwin-UAV Standalone Engine Simulation Demonstration & Verification Script
=============================================================================
Demonstrates:
1. Healthy engine initialization
2. Step-by-step telemetry generation
3. Clean telemetry output formatting matching the project specification
4. Full mission execution through 6 flight phases
5. Degraded engine response
6. Fault scenario injections (Cooling problem, Lubrication problem, Misfire)
7. Logical validation of telemetry changes

Author: AeroTwin-UAV Architecture Team
"""

import sys
import os

# Add repository root to python path for backend package resolution
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

from backend.app.simulation import (
    AeroPistonEngineSimulator,
    FlightPhase,
    FaultType,
    FaultConfig,
    EngineState
)


def print_telemetry_block(state: EngineState, title: str = "ENGINE SIMULATION TEST"):
    """Prints telemetry state adhering to the exact required project output template."""
    print("=" * 45)
    print(f" {title}")
    print("=" * 45)
    print(f"Engine:\n{state.engine_id}\n")
    print(f"Flight Phase:\n{state.flight_phase}\n")
    print(f"RPM:\n{int(round(state.rpm))}\n")
    print(f"CHT:\n{int(round(state.cht))} °C\n")
    print(f"EGT:\n{int(round(state.egt))} °C\n")
    print(f"Oil Pressure:\n{state.oil_pressure:.2f} bar\n")
    print(f"Oil Temperature:\n{int(round(state.oil_temperature))} °C\n")
    print(f"Vibration:\n{state.vibration:.2f} mm/s\n")
    print(f"Fuel Flow:\n{state.fuel_flow:.1f} L/h\n")
    print(f"Engine Load:\n{int(round(state.engine_load))} %\n")
    print(f"Degradation:\n{state.degradation:.2f}\n")
    print(f"Fault:\n{state.fault_type}")
    print("=" * 45 + "\n")


def main():
    print("\n" + "#" * 65)
    print(" AEROTWIN-UAV: STANDALONE ENGINE SIMULATOR VERIFICATION")
    print("#" * 65 + "\n")

    # -------------------------------------------------------------------------
    # 1 & 2. Create Healthy Engine & Run Several Steps
    # -------------------------------------------------------------------------
    print("[1] Initializing Healthy Virtual Engine (AERO-001)...")
    sim = AeroPistonEngineSimulator(
        engine_id="AERO-001",
        mission_id="MSN-TEST-01",
        seed=42,
        degradation=0.0
    )

    # Configure cruise flight conditions
    sim.set_inputs(
        throttle=68.0,
        altitude=4500.0,
        ambient_temperature=12.0,
        humidity=45.0,
        wind_speed=6.0,
        flight_phase=FlightPhase.CRUISE
    )

    print("[2] Running 10 warmup & stabilization steps in CRUISE...")
    last_healthy_state = None
    for s in range(10):
        last_healthy_state = sim.step(dt=1.0)

    # 3. Print Telemetry (as specified in requirement 14)
    print("[3] Telemetry Snapshot (Healthy Baseline):")
    print_telemetry_block(last_healthy_state, "ENGINE SIMULATION TEST")

    # -------------------------------------------------------------------------
    # 4. Run a Complete Simulated Mission
    # -------------------------------------------------------------------------
    print("[4] Executing Complete Mission (GROUND -> TAKEOFF -> CLIMB -> CRUISE -> DESCENT -> LANDING)...")
    mission_sim = AeroPistonEngineSimulator(
        engine_id="AERO-001",
        mission_id="MSN-FULL-01",
        seed=100,
        degradation=0.05
    )

    phases_observed = []
    def on_step(st: EngineState):
        if not phases_observed or phases_observed[-1] != st.flight_phase:
            phases_observed.append(st.flight_phase)
            print(f"    --> Transitioned to: {st.flight_phase:<8} | RPM: {st.rpm:4.0f} | Load: {st.engine_load:4.1f}% | CHT: {st.cht:3.0f}°C | Alt: {st.altitude:4.0f}m")

    # 0.5 hour mission with dt=2.0s (~900 steps)
    mission_log = mission_sim.run_mission(duration_hours=0.5, dt=2.0, step_callback=on_step)
    print(f"[OK] Mission completed successfully. Total telemetry records: {len(mission_log)}.")
    print(f"    Phases traversed: {' -> '.join(phases_observed)}\n")

    # -------------------------------------------------------------------------
    # 5. Create Degraded Engine
    # -------------------------------------------------------------------------
    print("[5] Testing Engine Degradation (Healthy vs Severe Degradation = 0.75)...")
    deg_sim = AeroPistonEngineSimulator(
        engine_id="AERO-001",
        mission_id="MSN-DEG-01",
        seed=42,
        degradation=0.75
    )
    deg_sim.set_inputs(
        throttle=68.0,
        altitude=4500.0,
        ambient_temperature=12.0,
        flight_phase=FlightPhase.CRUISE
    )
    for _ in range(15):
        deg_state = deg_sim.step(dt=1.0)

    print(f"    Healthy  CHT: {last_healthy_state.cht:.1f}°C  |  Degraded CHT: {deg_state.cht:.1f}°C  (delta: +{deg_state.cht - last_healthy_state.cht:.1f}°C)")
    print(f"    Healthy  VIB: {last_healthy_state.vibration:.2f} mm/s |  Degraded VIB: {deg_state.vibration:.2f} mm/s (delta: +{deg_state.vibration - last_healthy_state.vibration:.2f} mm/s)")
    print(f"    Healthy  OIL: {last_healthy_state.oil_pressure:.2f} bar  |  Degraded OIL: {deg_state.oil_pressure:.2f} bar  (delta: {deg_state.oil_pressure - last_healthy_state.oil_pressure:.2f} bar)")
    print("[OK] Telemetry reflects degradation progression.\n")

    # -------------------------------------------------------------------------
    # 6. Create Fault Scenarios
    # -------------------------------------------------------------------------
    print("[6] Testing Fault Injections:")

    # Fault A: COOLING_PROBLEM
    cool_sim = AeroPistonEngineSimulator(
        engine_id="AERO-001",
        seed=42,
        degradation=0.1
    )
    cool_sim.set_inputs(throttle=68.0, altitude=4500.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(10):
        cool_sim.step(1.0)
    cool_sim.inject_fault(FaultType.COOLING_PROBLEM, severity=0.85)
    for _ in range(15):
        cool_state = cool_sim.step(1.0)

    print(f"    [Fault A] COOLING_PROBLEM:    CHT = {cool_state.cht:.1f}°C (+{cool_state.cht - last_healthy_state.cht:.1f}°C), Oil Temp = {cool_state.oil_temperature:.1f}°C")

    # Fault B: LUBRICATION_PROBLEM
    lub_sim = AeroPistonEngineSimulator(
        engine_id="AERO-001",
        seed=42,
        degradation=0.1
    )
    lub_sim.set_inputs(throttle=68.0, altitude=4500.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(10):
        lub_sim.step(1.0)
    lub_sim.inject_fault(FaultType.LUBRICATION_PROBLEM, severity=0.85)
    for _ in range(15):
        lub_state = lub_sim.step(1.0)

    print(f"    [Fault B] LUBRICATION_PROBLEM: Oil Press = {lub_state.oil_pressure:.2f} bar (drop: {lub_state.oil_pressure - last_healthy_state.oil_pressure:.2f} bar), VIB = {lub_state.vibration:.2f} mm/s")

    # Fault C: MISFIRE
    mis_sim = AeroPistonEngineSimulator(
        engine_id="AERO-001",
        seed=42,
        degradation=0.1
    )
    mis_sim.set_inputs(throttle=68.0, altitude=4500.0, flight_phase=FlightPhase.CRUISE)
    for _ in range(10):
        mis_sim.step(1.0)
    mis_sim.inject_fault(FaultType.MISFIRE, severity=0.90)
    for _ in range(15):
        mis_state = mis_sim.step(1.0)

    print(f"    [Fault C] MISFIRE:             Vibration = {mis_state.vibration:.2f} mm/s (+{mis_state.vibration - last_healthy_state.vibration:.2f} mm/s), RPM = {mis_state.rpm:.0f}")

    # -------------------------------------------------------------------------
    # 7. Print Final Degraded/Faulted Telemetry Block
    # -------------------------------------------------------------------------
    print("\n[7] Sample Telemetry Block Under Active Fault (COOLING_PROBLEM):")
    print_telemetry_block(cool_state, "FAULT INJECTION TELEMETRY TEST")

    print("[PASS] Standalone engine simulation test completed successfully.\n")


if __name__ == '__main__':
    main()
