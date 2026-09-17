"""
AeroTwin-UAV Parameter Deviation Calculation Module
===================================================
Calculates absolute, relative (percentage), and tolerance-normalized deviations
between observed telemetry and physics baseline expectations.

Software-only research prototype.
"""

from dataclasses import dataclass, asdict
from typing import Dict, Any
from backend.app.digital_twin.baseline import OPERATING_BOUNDS, PhysicsBaselineModel


@dataclass
class ParameterDeviation:
    """Detailed deviation report for a single telemetry parameter."""
    param_name: str
    unit: str
    actual: float
    expected: float
    absolute_deviation: float       # |actual - expected|
    relative_deviation_pct: float   # ((actual - expected) / expected) * 100
    normalized_deviation: float     # |actual - expected| / tolerance
    status: str                     # NORMAL / WARNING / CRITICAL

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class DeviationAnalyzer:
    """
    Computes mathematical deviations between actual engine telemetry and baseline expectations.
    """

    SUPPORTED_PARAMETERS = [
        "rpm",
        "cht",
        "egt",
        "oil_pressure",
        "oil_temperature",
        "vibration",
        "fuel_flow",
        "engine_load"
    ]

    @classmethod
    def compute_deviations(
        cls,
        actual_telemetry: Dict[str, Any],
        expected_telemetry: Dict[str, float]
    ) -> Dict[str, ParameterDeviation]:
        """
        Computes absolute, relative %, and normalized deviations for each telemetry parameter.
        Guarantees safe division-by-zero protection.
        """
        deviations: Dict[str, ParameterDeviation] = {}

        for param in cls.SUPPORTED_PARAMETERS:
            if param not in actual_telemetry or param not in expected_telemetry:
                continue

            act = float(actual_telemetry[param])
            exp = float(expected_telemetry[param])
            bounds = OPERATING_BOUNDS.get(param)
            unit = bounds.unit if bounds else ""
            tolerance = bounds.tolerance if bounds else 1.0

            # Absolute deviation
            abs_dev = abs(act - exp)

            # Safe relative deviation percentage
            if abs(exp) > 1e-6:
                rel_dev_pct = ((act - exp) / exp) * 100.0
            else:
                rel_dev_pct = 0.0 if abs(act) < 1e-6 else 100.0

            # Normalized deviation relative to operational tolerance
            norm_dev = abs_dev / max(1e-4, tolerance)

            # Operational status check
            status = PhysicsBaselineModel.evaluate_status(param, act)

            deviations[param] = ParameterDeviation(
                param_name=param,
                unit=unit,
                actual=round(act, 2),
                expected=round(exp, 2),
                absolute_deviation=round(abs_dev, 2),
                relative_deviation_pct=round(rel_dev_pct, 2),
                normalized_deviation=round(norm_dev, 2),
                status=status
            )

        return deviations
