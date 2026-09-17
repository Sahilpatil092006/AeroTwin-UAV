"""
AeroTwin-UAV Engine Health & Fitness Assessment Module
======================================================
Computes composite Engine Health (overall physical condition) and
Engine Fitness (current operating conformity to baseline expectations).

Software-only research prototype.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional
import numpy as np

from backend.app.digital_twin.deviation import ParameterDeviation


@dataclass
class HealthWeights:
    """Configurable weights for parameter deviation health penalties."""
    cht: float = 0.25
    oil_pressure: float = 0.25
    vibration: float = 0.25
    egt: float = 0.12
    oil_temperature: float = 0.06
    rpm: float = 0.04
    fuel_flow: float = 0.02
    engine_load: float = 0.01

    def normalize(self) -> None:
        """Ensures weights sum to 1.0."""
        total = sum([
            self.cht, self.oil_pressure, self.vibration, self.egt,
            self.oil_temperature, self.rpm, self.fuel_flow, self.engine_load
        ])
        if total > 0:
            self.cht /= total
            self.oil_pressure /= total
            self.vibration /= total
            self.egt /= total
            self.oil_temperature /= total
            self.rpm /= total
            self.fuel_flow /= total
            self.engine_load /= total


class HealthAssessment:
    """
    Evaluates Engine Health, Engine Fitness, and Overall Operational Status.
    """

    def __init__(self, weights: Optional[HealthWeights] = None):
        self.weights = weights or HealthWeights()
        self.weights.normalize()

    def compute_engine_health(
        self,
        deviations: Dict[str, ParameterDeviation],
        degradation: Optional[float] = None
    ) -> float:
        """
        Calculates the Engine Health Score (0.0 to 100.0).
        Represents the overall physical mechanical/thermal condition of the virtual engine.

        Decreases when critical parameters (CHT, Oil Pressure, Vibration, EGT) deviate
        from safe operational norms or enter WARNING/CRITICAL limits.
        """
        base_health = 100.0
        penalty = 0.0

        weight_map = {
            "cht": self.weights.cht,
            "oil_pressure": self.weights.oil_pressure,
            "vibration": self.weights.vibration,
            "egt": self.weights.egt,
            "oil_temperature": self.weights.oil_temperature,
            "rpm": self.weights.rpm,
            "fuel_flow": self.weights.fuel_flow,
            "engine_load": self.weights.engine_load,
        }

        for param, dev in deviations.items():
            w = weight_map.get(param, 0.02)
            norm_dev = dev.normalized_deviation

            # Non-linear penalty scaling for deviations exceeding tolerance
            if norm_dev > 1.0:
                # Quadratic penalty growth past 1 tolerance unit
                param_penalty = (norm_dev - 1.0) * 22.0 + (norm_dev ** 1.3) * 8.0
            else:
                param_penalty = norm_dev * 4.0

            # Direct boundary violation penalties
            if dev.status == "WARNING":
                param_penalty += 12.0
            elif dev.status == "CRITICAL":
                param_penalty += 35.0

            penalty += w * param_penalty

        # If physical degradation parameter is directly supplied from simulator, factor it in
        if degradation is not None:
            deg_penalty = float(np.clip(degradation, 0.0, 1.0)) * 25.0
            penalty = 0.8 * penalty + 0.2 * deg_penalty

        health = max(0.0, min(100.0, base_health - penalty))
        return round(health, 1)

    def compute_engine_fitness(
        self,
        deviations: Dict[str, ParameterDeviation],
        health_score: float,
        anomaly_score: float,
        fault_severity: float = 0.0
    ) -> float:
        """
        Calculates the Engine Fitness Score (0.0 to 100.0).
        Represents how closely the current engine is operating relative to its expected baseline.

        Unlike overall engine health (which measures long-term wear / structural integrity),
        engine fitness captures instantaneous operational fidelity, transient mismatch,
        unsupervised anomaly detection intensity, and active fault severity.
        """
        base_fitness = 100.0

        # 1. Average normalized telemetry deviation penalty
        if deviations:
            norm_devs = [d.normalized_deviation for d in deviations.values()]
            mean_norm_dev = sum(norm_devs) / len(norm_devs)
            dev_penalty = min(50.0, mean_norm_dev * 16.0)
        else:
            dev_penalty = 0.0

        # 2. Anomaly score contribution (anomaly_score is normalized in [0.0, 1.0])
        # Baseline normal scores are ~0.38; high anomaly scores > 0.6 indicate substantial deviation
        anomaly_penalty = float(np.clip(anomaly_score, 0.0, 1.0)) * 28.0

        # 3. Fault severity impact
        fault_penalty = float(np.clip(fault_severity, 0.0, 1.0)) * 30.0

        # 4. Long-term health reflection (poor health drags down maximum reachable fitness)
        health_drag = max(0.0, (100.0 - health_score) * 0.25)

        total_penalty = dev_penalty * 0.40 + anomaly_penalty * 0.25 + fault_penalty * 0.20 + health_drag * 0.15
        fitness = max(0.0, min(100.0, base_fitness - total_penalty))
        return round(fitness, 1)

    @staticmethod
    def determine_overall_status(
        health_score: float,
        fitness_score: float,
        anomaly_status: str,
        predicted_fault: str,
        deviations: Dict[str, ParameterDeviation]
    ) -> str:
        """
        Synthesizes composite condition into standard tri-state status:
        HEALTHY, WARNING, or CRITICAL.
        """
        # Critical conditions:
        # - Health or fitness falls below 50.0
        # - Active catastrophic fault predicted with severe signature
        # - Any critical sensor (oil_pressure, vibration, cht) in CRITICAL boundary
        critical_params = ["cht", "oil_pressure", "vibration"]
        has_critical_param = any(
            deviations.get(p) and deviations[p].status == "CRITICAL"
            for p in critical_params
        )

        severe_faults = ["LUBRICATION_PROBLEM", "MISFIRE", "COOLING_PROBLEM"]

        if (
            health_score < 50.0 or
            fitness_score < 50.0 or
            has_critical_param or
            (predicted_fault in severe_faults and health_score < 70.0)
        ):
            return "CRITICAL"

        # Warning conditions:
        # - Health or fitness between 50 and 79.9
        # - Unsupervised anomaly detected
        # - Fault classifier predicts non-NORMAL class
        # - Any parameter in WARNING boundary
        has_warning_param = any(
            d.status in ["WARNING", "CRITICAL"]
            for d in deviations.values()
        )

        if (
            health_score < 80.0 or
            fitness_score < 80.0 or
            anomaly_status == "ANOMALOUS" or
            predicted_fault != "NORMAL" or
            has_warning_param
        ):
            return "WARNING"

        return "HEALTHY"
