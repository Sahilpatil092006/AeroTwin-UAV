"""
AeroTwin-UAV Digital Twin Physics Baseline Module
=================================================
Calculates theoretical expected nominal telemetry and normal operating boundaries
for a Rotax 914/915 iS class turbocharged 4-stroke aero piston engine.

Software-only research prototype.
"""

from typing import Dict, Any, Tuple
import math
from dataclasses import dataclass


@dataclass
class OperatingBounds:
    """Operating limits and warning thresholds for telemetry parameters."""
    param_name: str
    unit: str
    nominal_min: float
    nominal_max: float
    warning_low: float
    warning_high: float
    critical_low: float
    critical_high: float
    tolerance: float  # Scale factor for normalized deviation calculation


# Prototype operating bounds (Rotax 914/915 iS class research baseline)
OPERATING_BOUNDS: Dict[str, OperatingBounds] = {
    "rpm": OperatingBounds(
        param_name="rpm",
        unit="RPM",
        nominal_min=1800.0,
        nominal_max=5800.0,
        warning_low=1600.0,
        warning_high=5900.0,
        critical_low=1200.0,
        critical_high=6200.0,
        tolerance=200.0
    ),
    "cht": OperatingBounds(
        param_name="cht",
        unit="°C",
        nominal_min=75.0,
        nominal_max=135.0,
        warning_low=60.0,
        warning_high=145.0,
        critical_low=45.0,
        critical_high=165.0,
        tolerance=15.0
    ),
    "egt": OperatingBounds(
        param_name="egt",
        unit="°C",
        nominal_min=680.0,
        nominal_max=880.0,
        warning_low=640.0,
        warning_high=910.0,
        critical_low=580.0,
        critical_high=960.0,
        tolerance=45.0
    ),
    "oil_pressure": OperatingBounds(
        param_name="oil_pressure",
        unit="bar",
        nominal_min=2.0,
        nominal_max=5.2,
        warning_low=1.8,
        warning_high=5.8,
        critical_low=1.2,
        critical_high=6.5,
        tolerance=0.5
    ),
    "oil_temperature": OperatingBounds(
        param_name="oil_temperature",
        unit="°C",
        nominal_min=70.0,
        nominal_max=110.0,
        warning_low=60.0,
        warning_high=120.0,
        critical_low=50.0,
        critical_high=135.0,
        tolerance=12.0
    ),
    "vibration": OperatingBounds(
        param_name="vibration",
        unit="mm/s",
        nominal_min=1.5,
        nominal_max=5.5,
        warning_low=0.5,
        warning_high=7.5,
        critical_low=0.0,
        critical_high=12.0,
        tolerance=1.5
    ),
    "fuel_flow": OperatingBounds(
        param_name="fuel_flow",
        unit="L/h",
        nominal_min=5.0,
        nominal_max=32.0,
        warning_low=4.0,
        warning_high=36.0,
        critical_low=2.5,
        critical_high=42.0,
        tolerance=3.5
    ),
    "engine_load": OperatingBounds(
        param_name="engine_load",
        unit="%",
        nominal_min=15.0,
        nominal_max=98.0,
        warning_low=10.0,
        warning_high=100.0,
        critical_low=5.0,
        critical_high=105.0,
        tolerance=10.0
    )
}


class PhysicsBaselineModel:
    """
    Computes expected nominal telemetry values based on operational controls
    (throttle, target RPM, density altitude, ambient temperature, flight phase).
    """

    @staticmethod
    def calculate_expected(telemetry: Dict[str, Any]) -> Dict[str, float]:
        """
        Calculates physics-grounded expected baseline parameters.
        Does NOT simply mirror actual telemetry values.
        """
        throttle_pct = float(telemetry.get("throttle", 50.0))
        throttle_ratio = max(0.0, min(1.0, throttle_pct / 100.0))

        altitude = float(telemetry.get("altitude", 0.0))
        altitude = max(0.0, min(10000.0, altitude))

        ambient_temp = float(telemetry.get("ambient_temperature", 15.0))
        flight_phase = str(telemetry.get("flight_phase", "CRUISE")).upper()

        # Atmospheric density ratio
        density_ratio = math.exp(-altitude / 8500.0)

        # Expected base load by flight phase
        phase_load_factors = {
            "GROUND": 0.20,
            "TAKEOFF": 0.95,
            "CLIMB": 0.82,
            "CRUISE": 0.64,
            "DESCENT": 0.38,
            "LANDING": 0.25
        }
        phase_load = phase_load_factors.get(flight_phase, 0.60)
        expected_load_ratio = phase_load * (0.85 + 0.15 * throttle_ratio) * (1.0 + 0.08 * (1.0 - density_ratio))
        expected_load_ratio = max(0.05, min(1.0, expected_load_ratio))
        expected_load = round(expected_load_ratio * 100.0, 1)

        # Expected RPM curve: 1800 idle, 5800 max continuous
        expected_rpm = 1800.0 + throttle_ratio * 4000.0
        expected_rpm = round(expected_rpm, 1)

        # Expected Fuel Flow (L/h)
        expected_fuel_flow = 4.8 + throttle_ratio * 24.5 + expected_load_ratio * 3.2
        expected_fuel_flow = round(expected_fuel_flow, 1)

        # Expected CHT (°C)
        expected_cht = 65.0 + 0.45 * ambient_temp + 52.0 * expected_load_ratio + 14.0 * throttle_ratio
        expected_cht = round(expected_cht, 1)

        # Expected EGT (°C)
        expected_egt = 680.0 + 135.0 * expected_load_ratio + 35.0 * throttle_ratio
        expected_egt = round(expected_egt, 1)

        # Expected Oil Temperature (°C)
        expected_oil_temp = 55.0 + 0.35 * ambient_temp + 40.0 * expected_load_ratio + 14.0 * (expected_rpm / 5800.0)
        expected_oil_temp = round(expected_oil_temp, 1)

        # Expected Oil Pressure (bar)
        expected_oil_p = 1.8 + 2.4 * (expected_rpm / 5800.0) - 0.012 * max(0.0, expected_oil_temp - 80.0)
        expected_oil_p = round(max(1.5, expected_oil_p), 2)

        # Expected Vibration (mm/s RMS)
        rpm_norm = expected_rpm / 5800.0
        expected_vib = 1.6 + 2.2 * (rpm_norm ** 2) + 0.85 * expected_load_ratio
        expected_vib = round(expected_vib, 2)

        return {
            "rpm": expected_rpm,
            "engine_load": expected_load,
            "fuel_flow": expected_fuel_flow,
            "cht": expected_cht,
            "egt": expected_egt,
            "oil_pressure": expected_oil_p,
            "oil_temperature": expected_oil_temp,
            "vibration": expected_vib
        }

    @staticmethod
    def evaluate_status(param_name: str, value: float) -> str:
        """
        Evaluates whether a parameter value is NORMAL, WARNING, or CRITICAL
        based on prototype operating thresholds.
        """
        bounds = OPERATING_BOUNDS.get(param_name)
        if not bounds:
            return "NORMAL"

        if value < bounds.critical_low or value > bounds.critical_high:
            return "CRITICAL"
        elif value < bounds.warning_low or value > bounds.warning_high:
            return "WARNING"
        return "NORMAL"
