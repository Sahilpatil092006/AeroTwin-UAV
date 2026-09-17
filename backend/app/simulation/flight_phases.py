"""
AeroTwin-UAV Flight Phases Specification & Profile Models
=========================================================
Defines supported UAV flight phases, operational envelopes, and aerodynamic
transitions for virtual aero piston engines.

Software-only research prototype.
"""

from enum import Enum
from dataclasses import dataclass
from typing import List, Dict


class FlightPhase(str, Enum):
    """
    Standard operating flight phases for MALE UAV missions.
    """
    GROUND = "GROUND"
    TAKEOFF = "TAKEOFF"
    CLIMB = "CLIMB"
    CRUISE = "CRUISE"
    DESCENT = "DESCENT"
    LANDING = "LANDING"


@dataclass
class PhaseCharacteristics:
    """
    Operational envelope characteristics and typical targets for a flight phase.
    """
    phase: FlightPhase
    throttle_min: float         # % (0 - 100)
    throttle_max: float         # % (0 - 100)
    base_load_min: float        # % (0 - 100)
    base_load_max: float        # % (0 - 100)
    typical_rpm_min: float      # RPM
    typical_rpm_max: float      # RPM
    altitude_target_min: float  # meters
    altitude_target_max: float  # meters
    mission_time_share: float   # Fraction of total mission duration (sums to 1.0)
    description: str


# Phase characteristic definitions grounded in aero piston MALE UAV operations
PHASE_PROFILES: Dict[FlightPhase, PhaseCharacteristics] = {
    FlightPhase.GROUND: PhaseCharacteristics(
        phase=FlightPhase.GROUND,
        throttle_min=12.0,
        throttle_max=22.0,
        base_load_min=18.0,
        base_load_max=25.0,
        typical_rpm_min=1800.0,
        typical_rpm_max=2300.0,
        altitude_target_min=0.0,
        altitude_target_max=100.0,
        mission_time_share=0.10,
        description="Pre-flight warmup, taxi, magneto and idle verification under minimal aerodynamic load."
    ),
    FlightPhase.TAKEOFF: PhaseCharacteristics(
        phase=FlightPhase.TAKEOFF,
        throttle_min=92.0,
        throttle_max=100.0,
        base_load_min=90.0,
        base_load_max=98.0,
        typical_rpm_min=5500.0,
        typical_rpm_max=5800.0,
        altitude_target_min=0.0,
        altitude_target_max=500.0,
        mission_time_share=0.05,
        description="Maximum takeoff power, high fuel flow, peak cylinder pressure and rapid thermal accumulation."
    ),
    FlightPhase.CLIMB: PhaseCharacteristics(
        phase=FlightPhase.CLIMB,
        throttle_min=80.0,
        throttle_max=90.0,
        base_load_min=75.0,
        base_load_max=85.0,
        typical_rpm_min=5000.0,
        typical_rpm_max=5400.0,
        altitude_target_min=500.0,
        altitude_target_max=4500.0,
        mission_time_share=0.15,
        description="High continuous climb power with decreasing atmospheric density and ambient temperature."
    ),
    FlightPhase.CRUISE: PhaseCharacteristics(
        phase=FlightPhase.CRUISE,
        throttle_min=62.0,
        throttle_max=74.0,
        base_load_min=58.0,
        base_load_max=66.0,
        typical_rpm_min=4200.0,
        typical_rpm_max=4600.0,
        altitude_target_min=3500.0,
        altitude_target_max=5500.0,
        mission_time_share=0.50,
        description="Steady-state loiter/cruise at density altitude, optimized fuel economy, thermal equilibrium."
    ),
    FlightPhase.DESCENT: PhaseCharacteristics(
        phase=FlightPhase.DESCENT,
        throttle_min=30.0,
        throttle_max=45.0,
        base_load_min=32.0,
        base_load_max=42.0,
        typical_rpm_min=3000.0,
        typical_rpm_max=3600.0,
        altitude_target_min=500.0,
        altitude_target_max=3500.0,
        mission_time_share=0.12,
        description="Reduced throttle descent, shock cooling management, moderate airspeed aerodynamic airflow."
    ),
    FlightPhase.LANDING: PhaseCharacteristics(
        phase=FlightPhase.LANDING,
        throttle_min=18.0,
        throttle_max=35.0,
        base_load_min=20.0,
        base_load_max=30.0,
        typical_rpm_min=2000.0,
        typical_rpm_max=2700.0,
        altitude_target_min=0.0,
        altitude_target_max=500.0,
        mission_time_share=0.08,
        description="Approach, flare and touchdown, low engine RPM with rapid minor throttle micro-adjustments."
    )
}

# Standard sequential mission flight phase order
MISSION_PHASE_SEQUENCE: List[FlightPhase] = [
    FlightPhase.GROUND,
    FlightPhase.TAKEOFF,
    FlightPhase.CLIMB,
    FlightPhase.CRUISE,
    FlightPhase.DESCENT,
    FlightPhase.LANDING
]


def get_phase_characteristics(phase: str | FlightPhase) -> PhaseCharacteristics:
    """
    Returns characteristics and default bounds for a given flight phase.
    """
    if isinstance(phase, str):
        try:
            phase = FlightPhase(phase.upper())
        except ValueError:
            valid = [p.value for p in FlightPhase]
            raise ValueError(f"Unknown flight phase '{phase}'. Supported phases: {valid}")
    return PHASE_PROFILES[phase]
