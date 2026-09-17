"""
AeroTwin-UAV Engine Simulation Package
======================================
Physics-inspired software-only aero piston engine simulation suite for MALE UAVs.

Exposes:
- AeroPistonEngineSimulator: Main simulation runner
- FlightPhase: Operating flight phase enum & characteristics
- FaultType, FaultConfig: Operational fault modes and perturbation injectors
- EngineParameters, SimulationInputs, EngineState: Physical models and state snapshots
"""

from backend.app.simulation.parameters import (
    EngineParameters,
    SimulationInputs,
    EngineState
)
from backend.app.simulation.flight_phases import (
    FlightPhase,
    PhaseCharacteristics,
    PHASE_PROFILES,
    MISSION_PHASE_SEQUENCE,
    get_phase_characteristics
)
from backend.app.simulation.faults import (
    FaultType,
    FaultConfig,
    FaultInjector,
    TelemetryPerturbation
)
from backend.app.simulation.engine import (
    AeroPistonEngineSimulator
)

__all__ = [
    "AeroPistonEngineSimulator",
    "EngineParameters",
    "SimulationInputs",
    "EngineState",
    "FlightPhase",
    "PhaseCharacteristics",
    "PHASE_PROFILES",
    "MISSION_PHASE_SEQUENCE",
    "get_phase_characteristics",
    "FaultType",
    "FaultConfig",
    "FaultInjector",
    "TelemetryPerturbation"
]
