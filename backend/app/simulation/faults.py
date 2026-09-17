"""
AeroTwin-UAV Fault Simulation & Degradation Models
=================================================
Implements physical fault injections and continuous degradation mechanics
for aero piston engines, matching the dynamics established in the synthetic dataset.

Software-only research prototype.
"""

from enum import Enum
from dataclasses import dataclass
from typing import Optional, Dict, Any
import numpy as np


class FaultType(str, Enum):
    """
    Supported virtual aero piston engine fault modes.
    """
    NORMAL = "NORMAL"
    INJECTOR_ABNORMALITY = "INJECTOR_ABNORMALITY"
    COOLING_PROBLEM = "COOLING_PROBLEM"
    LUBRICATION_PROBLEM = "LUBRICATION_PROBLEM"
    MISFIRE = "MISFIRE"
    SENSOR_ANOMALY = "SENSOR_ANOMALY"


@dataclass
class FaultConfig:
    """
    Configuration for an injected operational fault.
    """
    fault_type: FaultType = FaultType.NORMAL
    severity: float = 0.0                    # [0.0, 1.0] fault intensity
    target_sensor: Optional[str] = None      # Target channel for SENSOR_ANOMALY

    def __post_init__(self):
        if isinstance(self.fault_type, str):
            self.fault_type = FaultType(self.fault_type)
        self.severity = float(np.clip(self.severity, 0.0, 1.0))
        if self.fault_type == FaultType.NORMAL:
            self.severity = 0.0


@dataclass
class TelemetryPerturbation:
    """
    Physical offsets to apply to nominal telemetry channels.
    """
    rpm_offset: float = 0.0
    rpm_noise_boost: float = 0.0
    cht_offset: float = 0.0
    egt_offset: float = 0.0
    egt_noise_boost: float = 0.0
    oil_pressure_offset: float = 0.0
    oil_temperature_offset: float = 0.0
    vibration_offset: float = 0.0
    vibration_noise_boost: float = 0.0
    fuel_flow_offset: float = 0.0
    engine_load_offset: float = 0.0


class FaultInjector:
    """
    Calculates physics-consistent telemetry perturbations caused by
    both continuous mechanical degradation and active fault modes.
    """

    @staticmethod
    def calculate_degradation_effects(degradation: float) -> TelemetryPerturbation:
        """
        Calculates progressive telemetry drift from accumulated engine degradation (0.0 to 1.0).
        Wear accumulates gradually without abrupt discontinuous jumps:
        - Bearing wear -> elevated mechanical vibration and slight oil pressure drop.
        - Valve & ring wear -> thermal leakage (CHT increase) and slight fuel flow inefficiency.
        """
        deg = float(np.clip(degradation, 0.0, 1.0))
        p = TelemetryPerturbation()

        if deg <= 0.0:
            return p

        # Progressive mechanical vibration from accumulated bearing and wrist-pin clearance
        p.vibration_offset = 2.4 * (deg ** 1.5)

        # Cylinder head temperature rises moderately due to piston ring bypass and carbon build-up
        p.cht_offset = 18.0 * (deg ** 1.3)

        # Lubrication oil pump tolerances and oil thermal shearing reduce oil pressure
        p.oil_pressure_offset = -0.55 * deg

        # Friction build-up slightly increases operating oil temperature
        p.oil_temperature_offset = 12.0 * deg

        # Slight fuel flow penalty due to minor loss in thermal efficiency
        p.fuel_flow_offset = 1.2 * deg

        # Minor RPM instability from uneven compression
        p.rpm_noise_boost = 15.0 * deg

        return p

    @staticmethod
    def calculate_fault_effects(
        fault: FaultConfig,
        degradation: float,
        step_index: int,
        rng: np.random.Generator
    ) -> TelemetryPerturbation:
        """
        Computes telemetry shifts resulting from specific failure modes.
        Consistent with the physics formulations defined in scripts/generate_dataset.py.
        """
        p = TelemetryPerturbation()
        ft = fault.fault_type
        sev = fault.severity
        deg = float(np.clip(degradation, 0.0, 1.0))

        if ft == FaultType.NORMAL or sev <= 0.0:
            return p

        if ft == FaultType.INJECTOR_ABNORMALITY:
            # Lean/rich cylinder imbalance: elevated/erratic EGT, fuel flow starvation/drift, RPM jitter
            p.egt_offset = 65.0 * sev + 40.0 * deg
            p.egt_noise_boost = 18.0 * sev
            p.fuel_flow_offset = -4.5 * sev
            p.rpm_noise_boost = 35.0 * sev
            p.vibration_offset = 1.8 * sev + 1.2 * deg
            p.cht_offset = 8.0 * sev

        elif ft == FaultType.COOLING_PROBLEM:
            # Loss of coolant flow or airflow blockage: rapid CHT surge and elevated oil temp
            p.cht_offset = 38.0 * sev + 24.0 * deg
            p.oil_temperature_offset = 18.0 * sev + 12.0 * deg
            # Oil viscosity drops under extreme cylinder wall temperatures
            p.oil_pressure_offset = -0.35 * sev

        elif ft == FaultType.LUBRICATION_PROBLEM:
            # Oil pump cavitation or bearing failure: steep oil pressure drop, oil temp surge, heavy vibration
            p.oil_pressure_offset = -(1.6 * sev + 0.8 * deg)
            p.oil_temperature_offset = 22.0 * sev + 14.0 * deg
            p.vibration_offset = 3.5 * sev + 2.5 * deg
            p.rpm_offset = -45.0 * sev

        elif ft == FaultType.MISFIRE:
            # Combustion misfires: high torsional vibration, RPM dips and instability, erratic/cooler EGT
            p.vibration_offset = 8.5 * sev + 4.0 * deg
            p.vibration_noise_boost = 3.0 * sev
            p.rpm_offset = -110.0 * sev
            p.rpm_noise_boost = 60.0 * sev
            p.egt_offset = -60.0 * sev
            p.egt_noise_boost = 30.0 * sev
            p.engine_load_offset = rng.normal(0, 0.05 * sev)

        elif ft == FaultType.SENSOR_ANOMALY:
            # Instrument transducer failure: ONLY the targeted sensor channel exhibits abnormal telemetry
            # The virtual engine itself remains mechanically and thermally sound
            target = fault.target_sensor or "cht"
            target = target.lower()

            if target == "cht":
                p.cht_offset = 55.0 * sev
            elif target == "egt":
                # Erratic thermocouple behavior
                p.egt_offset = 140.0 * sev if (step_index % 2 == 0) else -120.0 * sev
            elif target == "oil_pressure":
                p.oil_pressure_offset = -1.4 * sev
            elif target == "oil_temperature":
                p.oil_temperature_offset = 45.0 * sev
            elif target == "vibration":
                p.vibration_offset = 9.0 * sev
            elif target == "fuel_flow":
                p.fuel_flow_offset = 9.0 * sev
            elif target == "rpm":
                p.rpm_offset = 450.0 * sev

        return p
