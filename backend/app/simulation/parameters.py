"""
AeroTwin-UAV Simulation Parameters & State Models
=================================================
Defines physical engine parameters, configurable simulation inputs,
and structured engine telemetry state representations.

Software-only research prototype.
"""

from dataclasses import dataclass, asdict, field
from typing import Optional, Dict, Any
import datetime
import math


@dataclass
class EngineParameters:
    """
    Physical baseline parameters and constants for a Rotax 914/915 iS class
    turbocharged 4-stroke horizontally opposed aero piston engine.
    """
    # Mechanical bounds
    idle_rpm: float = 1800.0
    max_continuous_rpm: float = 5500.0
    max_takeoff_rpm: float = 5800.0
    redline_rpm: float = 6000.0

    # Fuel flow baseline (Liters per hour)
    idle_fuel_flow: float = 4.8
    max_fuel_flow: float = 34.0

    # Thermal baselines (Degrees Celsius)
    nominal_cht_base: float = 65.0
    redline_cht: float = 150.0
    nominal_egt_base: float = 680.0
    redline_egt: float = 900.0
    nominal_oil_temp_base: float = 55.0
    redline_oil_temp: float = 135.0

    # Lubrication baselines (bar)
    idle_oil_pressure: float = 1.8
    max_oil_pressure: float = 5.2
    redline_low_oil_pressure: float = 1.2

    # Vibration baselines (mm/s RMS)
    nominal_vibration_base: float = 1.6
    max_safe_vibration: float = 8.0

    # Thermal time constants (first-order lag filter factors for 1 Hz dt)
    cht_thermal_lag: float = 0.08      # Responsiveness to thermal input
    oil_t_thermal_lag: float = 0.05    # High thermal inertia of oil mass

    # Sensor noise standard deviations (Gaussian sigma)
    noise_rpm: float = 10.0
    noise_cht: float = 0.5
    noise_egt: float = 2.5
    noise_oil_pressure: float = 0.04
    noise_oil_temperature: float = 0.4
    noise_vibration: float = 0.15
    noise_fuel_flow: float = 0.25


@dataclass
class SimulationInputs:
    """
    Configurable operating and environmental inputs to the engine simulator.
    """
    rpm_target: Optional[float] = None       # Target RPM (800 - 6000)
    throttle: float = 20.0                   # Throttle lever position (0 - 100%)
    altitude: float = 0.0                    # Altitude MSL (0 - 8000 m)
    ambient_temperature: float = 15.0        # Outside ambient temp (-10 to 50 °C)
    humidity: float = 50.0                   # Relative humidity (0 - 100%)
    wind_speed: float = 5.0                  # Ambient wind speed (0 - 25 m/s)
    mission_duration: float = 1.0            # Mission duration in hours
    flight_phase: str = "GROUND"             # Active flight phase

    def validate(self) -> None:
        """Enforces physical bounds and checks for NaN/inf."""
        for name, val in [
            ("throttle", self.throttle),
            ("altitude", self.altitude),
            ("ambient_temperature", self.ambient_temperature),
            ("humidity", self.humidity),
            ("wind_speed", self.wind_speed),
            ("mission_duration", self.mission_duration),
        ]:
            if val is None or math.isnan(val) or math.isinf(val):
                raise ValueError(f"Simulation input '{name}' must be a finite numerical value, got {val}")

        if self.rpm_target is not None:
            if math.isnan(self.rpm_target) or math.isinf(self.rpm_target):
                raise ValueError(f"rpm_target must be finite, got {self.rpm_target}")
            if not (400.0 <= self.rpm_target <= 6500.0):
                raise ValueError(f"rpm_target {self.rpm_target} out of plausible range [400, 6500]")

        if not (0.0 <= self.throttle <= 100.0):
            raise ValueError(f"throttle {self.throttle} out of range [0, 100]%")
        if not (0.0 <= self.altitude <= 10000.0):
            raise ValueError(f"altitude {self.altitude} out of range [0, 10000] m")
        if not (-40.0 <= self.ambient_temperature <= 60.0):
            raise ValueError(f"ambient_temperature {self.ambient_temperature} out of range [-40, 60] °C")
        if not (0.0 <= self.humidity <= 100.0):
            raise ValueError(f"humidity {self.humidity} out of range [0, 100]%")
        if not (0.0 <= self.wind_speed <= 50.0):
            raise ValueError(f"wind_speed {self.wind_speed} out of range [0, 50] m/s")
        if self.mission_duration <= 0.0:
            raise ValueError("mission_duration must be positive")


@dataclass
class EngineState:
    """
    Structured snapshot of engine telemetry and internal health state.
    Contains all 19 standard channels required for the AeroTwin-UAV Digital Twin.
    """
    engine_id: str
    mission_id: str
    timestamp: str
    flight_phase: str

    # Operating & environmental telemetry
    rpm: float
    throttle: float
    altitude: float
    ambient_temperature: float
    humidity: float
    wind_speed: float

    # Engine physical sensor channels
    cht: float
    egt: float
    oil_pressure: float
    oil_temperature: float
    vibration: float
    fuel_flow: float
    engine_load: float

    # Health & fault degradation status
    degradation: float
    fault_type: str
    fault_severity: float

    # UAV identifier
    uav_id: str = "UAV-001"

    def to_dict(self) -> Dict[str, Any]:
        """Serializes state to standard dictionary."""
        return asdict(self)

    def validate_bounds(self) -> None:
        """
        Validates safety and physical plausibility limits.
        Raises ValueError if any sensor value is NaN, infinite, or violates minimum bounds.
        """
        checks = [
            ("rpm", self.rpm, 0.0),
            ("throttle", self.throttle, 0.0),
            ("altitude", self.altitude, 0.0),
            ("cht", self.cht, 0.0),
            ("egt", self.egt, 0.0),
            ("oil_pressure", self.oil_pressure, 0.0),
            ("oil_temperature", self.oil_temperature, 0.0),
            ("vibration", self.vibration, 0.0),
            ("fuel_flow", self.fuel_flow, 0.0),
            ("engine_load", self.engine_load, 0.0),
            ("degradation", self.degradation, 0.0),
            ("fault_severity", self.fault_severity, 0.0)
        ]

        for name, val, min_val in checks:
            if math.isnan(val):
                raise ValueError(f"EngineState channel '{name}' is NaN!")
            if math.isinf(val):
                raise ValueError(f"EngineState channel '{name}' is Infinite!")
            if val < min_val:
                raise ValueError(f"EngineState channel '{name}' value {val} is below minimum plausible limit {min_val}!")
