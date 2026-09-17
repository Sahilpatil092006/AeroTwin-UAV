"""
AeroTwin-UAV Mission Reliability & Environmental Stress Calculations
===================================================================
Evaluates mission reliability score, environmental stress factors,
and RUL flight margin adequacy.

Software-only research prototype.
"""

from dataclasses import dataclass
from typing import Dict, Any, Tuple
import math
import numpy as np


@dataclass
class ReliabilityWeights:
    """Configurable weights for the composite mission reliability score."""
    health_weight: float = 0.30
    fitness_weight: float = 0.20
    rul_weight: float = 0.15
    anomaly_weight: float = 0.15
    fault_weight: float = 0.10
    env_stress_weight: float = 0.10

    def normalize(self) -> None:
        total = (
            self.health_weight + self.fitness_weight + self.rul_weight +
            self.anomaly_weight + self.fault_weight + self.env_stress_weight
        )
        if total > 0:
            self.health_weight /= total
            self.fitness_weight /= total
            self.rul_weight /= total
            self.anomaly_weight /= total
            self.fault_weight /= total
            self.env_stress_weight /= total


class EnvironmentalStressCalculator:
    """
    Computes environmental and operational stress index [0.0, 1.0]
    based on flight profile, ambient thermodynamics, and mission duration.
    """

    @staticmethod
    def calculate_stress(
        altitude: float,
        ambient_temperature: float,
        throttle: float,
        mission_duration_hours: float,
        engine_load: float = 60.0
    ) -> float:
        """
        Calculates a composite environmental stress index [0.0, 1.0].
        Higher stress stems from:
        - Extreme high altitude (> 4000 m: low air density, reduced cooling airflow)
        - Extreme ambient temperature (> 32 °C or < -15 °C: thermal dissipation stress)
        - Sustained high throttle / load (> 80 %)
        - Extended mission duration (> 4 hours: cumulative thermal/vibrational exposure)
        """
        # 1. Altitude stress (starts above 3000 m, maxes out at 8000 m)
        alt_stress = max(0.0, min(1.0, (altitude - 3000.0) / 5000.0))

        # 2. Ambient temperature stress
        if ambient_temperature > 25.0:
            temp_stress = max(0.0, min(1.0, (ambient_temperature - 25.0) / 25.0))
        elif ambient_temperature < -10.0:
            temp_stress = max(0.0, min(1.0, (-10.0 - ambient_temperature) / 25.0))
        else:
            temp_stress = 0.0

        # 3. Throttle & mechanical load stress (starts above 70%, maxes at 100%)
        throttle_pct = max(0.0, min(100.0, throttle))
        load_pct = max(0.0, min(100.0, engine_load))
        throttle_stress = max(0.0, min(1.0, (throttle_pct - 70.0) / 30.0))
        load_stress = max(0.0, min(1.0, (load_pct - 70.0) / 30.0))
        power_stress = 0.5 * throttle_stress + 0.5 * load_stress

        # 4. Mission duration stress (MALE endurance scaling: baseline 2 hrs, full stress at 12 hrs)
        duration_stress = max(0.0, min(1.0, (mission_duration_hours - 2.0) / 10.0))

        # Composite weighted stress
        composite_stress = (
            0.30 * power_stress +
            0.25 * alt_stress +
            0.25 * temp_stress +
            0.20 * duration_stress
        )
        return round(float(np.clip(composite_stress, 0.0, 1.0)), 3)


class RulAdequacyEvaluator:
    """
    Evaluates whether predicted remaining useful life provides sufficient operating margin.
    """

    @staticmethod
    def evaluate(
        predicted_rul_hours: float,
        mission_duration_hours: float
    ) -> Tuple[float, str, float]:
        """
        Evaluates RUL margin and adequacy.

        Returns:
            rul_margin_hours: max(0.0, predicted_rul_hours - mission_duration_hours)
            rul_adequacy: "ADEQUATE", "MARGINAL", or "INADEQUATE"
            rul_score: sub-score [0.0, 100.0] representing RUL health factor
        """
        rul = max(0.0, float(predicted_rul_hours))
        duration = max(0.1, float(mission_duration_hours))
        margin = max(0.0, rul - duration)

        # Ratio of remaining life to planned mission duration
        safety_ratio = rul / duration

        if safety_ratio < 1.0:
            adequacy = "INADEQUATE"
            # Severe penalty if RUL is less than planned mission length
            rul_score = max(0.0, safety_ratio * 30.0)
        elif safety_ratio < 2.5 or margin < 20.0:
            adequacy = "MARGINAL"
            # Marginal operating buffer
            rul_score = 40.0 + min(35.0, (safety_ratio - 1.0) * 25.0)
        else:
            adequacy = "ADEQUATE"
            # Abundant operating buffer
            rul_score = 80.0 + min(20.0, (safety_ratio - 2.5) * 5.0)

        return round(margin, 1), adequacy, round(rul_score, 1)


class MissionReliabilityCalculator:
    """
    Calculates the composite Mission Reliability Score (0.0 to 100.0).
    """

    def __init__(self, weights: Optional[ReliabilityWeights] = None):
        self.weights = weights or ReliabilityWeights()
        self.weights.normalize()

    def compute_reliability(
        self,
        engine_health: float,
        engine_fitness: float,
        rul_score: float,
        anomaly_score: float,
        fault_risk_score: float,
        environmental_stress: float
    ) -> float:
        """
        Synthesizes composite mission reliability score [0.0, 100.0].
        All input components are normalized to [0.0, 100.0] scales:
        - engine_health: 0 - 100
        - engine_fitness: 0 - 100
        - rul_score: 0 - 100 (from RulAdequacyEvaluator)
        - anomaly_subscore: 100 * (1 - anomaly_score)
        - fault_subscore: 100 * (1 - fault_risk_score)
        - env_subscore: 100 * (1 - environmental_stress)
        """
        health_term = max(0.0, min(100.0, engine_health))
        fitness_term = max(0.0, min(100.0, engine_fitness))
        rul_term = max(0.0, min(100.0, rul_score))
        anomaly_term = max(0.0, min(100.0, 100.0 * (1.0 - float(anomaly_score))))
        fault_term = max(0.0, min(100.0, 100.0 * (1.0 - float(fault_risk_score))))
        env_term = max(0.0, min(100.0, 100.0 * (1.0 - float(environmental_stress))))

        reliability = (
            self.weights.health_weight * health_term +
            self.weights.fitness_weight * fitness_term +
            self.weights.rul_weight * rul_term +
            self.weights.anomaly_weight * anomaly_term +
            self.weights.fault_weight * fault_term +
            self.weights.env_stress_weight * env_term
        )

        return round(float(np.clip(reliability, 0.0, 100.0)), 1)
