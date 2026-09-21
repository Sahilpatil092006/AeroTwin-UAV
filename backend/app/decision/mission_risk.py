"""
AeroTwin-UAV Mission Risk Assessment & Decision Engine
======================================================
Fuses Digital Twin diagnostics, AI inferences, and planned mission operating
parameters into actionable risk classifications, reliability ratings, and recommendations.

Software-only research prototype.
"""

from enum import Enum
from dataclasses import dataclass, asdict, field
from typing import Dict, Any, Optional, List, Union
import datetime
import numpy as np

from backend.app.decision.reliability import (
    EnvironmentalStressCalculator,
    RulAdequacyEvaluator,
    MissionReliabilityCalculator,
    ReliabilityWeights
)
from backend.app.decision.recommendation import (
    MissionRecommendation,
    ReasonCode,
    RecommendationEngine
)


class MissionRiskLevel(str, Enum):
    """Permissible mission risk classifications."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


@dataclass
class MissionParameters:
    """Configurable flight profile parameters for planned or current mission."""
    mission_duration_hours: float = 2.0
    altitude: float = 3500.0
    ambient_temperature: float = 15.0
    throttle: float = 65.0
    flight_phase: str = "CRUISE"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class MissionDecision:
    """
    Complete structured decision-support output for a simulated mission.
    """
    timestamp: str

    mission_duration_hours: float
    altitude: float
    ambient_temperature: float
    throttle: float

    mission_reliability_score: float
    mission_risk: str
    mission_recommendation: str

    engine_health: float
    engine_fitness_score: float

    predicted_fault: str
    dominant_fault_probability: float

    anomaly_status: str
    anomaly_score: float

    predicted_rul_hours: float
    rul_margin_hours: float
    rul_adequacy: str

    environmental_stress: float

    reason_codes: List[str]
    explanation: str
    uav_id: str = "UAV-001"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class MissionRiskAssessor:
    """
    Evaluates multi-factor mission risk and handles risk escalation rules.
    """

    @staticmethod
    def assess_risk(
        reliability_score: float,
        engine_health: float,
        rul_adequacy: str,
        predicted_fault: str,
        fault_probability: float,
        anomaly_score: float,
        environmental_stress: float
    ) -> str:
        """
        Determines mission risk level (LOW, MEDIUM, HIGH) combining baseline reliability
        with strict safety escalation rules.
        """
        # Base mapping from reliability score
        if reliability_score >= 80.0:
            base_risk = MissionRiskLevel.LOW.value
        elif reliability_score >= 50.0:
            base_risk = MissionRiskLevel.MEDIUM.value
        else:
            base_risk = MissionRiskLevel.HIGH.value

        # --- Escalation Rules ---
        severe_faults = ["LUBRICATION_PROBLEM", "MISFIRE", "COOLING_PROBLEM"]

        # 1. Immediate escalation to HIGH:
        # - RUL is strictly inadequate for mission duration
        # - Critical engine health (< 50%)
        # - High-confidence severe mechanical/thermal failure
        if (
            rul_adequacy == "INADEQUATE" or
            engine_health < 50.0 or
            (predicted_fault in severe_faults and fault_probability >= 0.55) or
            anomaly_score >= 0.88
        ):
            return MissionRiskLevel.HIGH.value

        # 2. Escalation to at least MEDIUM:
        # - RUL is marginal
        # - Base risk was LOW but anomaly is noticeable (> 0.65)
        # - Base risk was LOW but a non-NORMAL fault is predicted with moderate confidence
        # - Severe environmental stress (> 0.70)
        if base_risk == MissionRiskLevel.LOW.value:
            if (
                rul_adequacy == "MARGINAL" or
                anomaly_score >= 0.65 or
                (predicted_fault != "NORMAL" and fault_probability >= 0.40) or
                environmental_stress >= 0.70 or
                engine_health < 80.0
            ):
                return MissionRiskLevel.MEDIUM.value

        return base_risk


class MissionDecisionEngine:
    """
    Central decision engine computing reliability, risk, and mission recommendations.
    """

    def __init__(
        self,
        reliability_weights: Optional[ReliabilityWeights] = None
    ):
        self.reliability_calc = MissionReliabilityCalculator(reliability_weights)

    def evaluate(
        self,
        twin_state: Union[Dict[str, Any], Any],
        mission_params: Optional[Union[Dict[str, Any], MissionParameters]] = None
    ) -> MissionDecision:
        """
        Processes a Digital Twin state snapshot and mission parameters into a complete MissionDecision.
        """
        # 1. Normalize Twin State
        if hasattr(twin_state, "to_dict"):
            t_dict = twin_state.to_dict()
        elif isinstance(twin_state, dict):
            t_dict = twin_state
        elif hasattr(twin_state, "__dict__"):
            t_dict = twin_state.__dict__
        else:
            raise TypeError(f"Unsupported twin_state type: {type(twin_state)}")

        # 2. Normalize Mission Parameters
        if mission_params is None:
            params = MissionParameters()
        elif isinstance(mission_params, MissionParameters):
            params = mission_params
        elif isinstance(mission_params, dict):
            params = MissionParameters(
                mission_duration_hours=float(mission_params.get("mission_duration_hours", 2.0)),
                altitude=float(mission_params.get("altitude", t_dict.get("actual_telemetry", {}).get("altitude", 3500.0))),
                ambient_temperature=float(mission_params.get("ambient_temperature", t_dict.get("actual_telemetry", {}).get("ambient_temperature", 15.0))),
                throttle=float(mission_params.get("throttle", t_dict.get("actual_telemetry", {}).get("throttle", 65.0))),
                flight_phase=str(mission_params.get("flight_phase", t_dict.get("flight_phase", "CRUISE")))
            )
        else:
            params = MissionParameters()

        # Extract telemetry & diagnostics from twin state
        actual_tel = t_dict.get("actual_telemetry", {})
        engine_health = float(t_dict.get("engine_health", 100.0))
        engine_fitness = float(t_dict.get("engine_fitness_score", 100.0))
        predicted_fault = str(t_dict.get("predicted_fault", "NORMAL"))
        fault_probabilities = t_dict.get("fault_probabilities", {})
        dominant_fault_prob = float(fault_probabilities.get(predicted_fault, 0.0))
        anomaly_status = str(t_dict.get("anomaly_status", "NORMAL"))
        anomaly_score = float(t_dict.get("anomaly_score", 0.0))
        predicted_rul = float(t_dict.get("predicted_rul_hours", 1000.0))
        deviations = t_dict.get("deviations", {})
        timestamp = str(t_dict.get("timestamp", datetime.datetime.now(datetime.timezone.utc).isoformat()))

        # Mission operating conditions: prioritize explicit mission parameters, fall back to telemetry
        altitude = float(params.altitude if params.altitude is not None else actual_tel.get("altitude", 3500.0))
        ambient_temp = float(params.ambient_temperature if params.ambient_temperature is not None else actual_tel.get("ambient_temperature", 15.0))
        throttle = float(params.throttle if params.throttle is not None else actual_tel.get("throttle", 65.0))
        engine_load = float(actual_tel.get("engine_load", 60.0))

        # 3. Calculate Environmental Stress
        env_stress = EnvironmentalStressCalculator.calculate_stress(
            altitude=altitude,
            ambient_temperature=ambient_temp,
            throttle=throttle,
            mission_duration_hours=params.mission_duration_hours,
            engine_load=engine_load
        )

        # 4. Evaluate RUL Adequacy
        rul_margin, rul_adequacy, rul_score = RulAdequacyEvaluator.evaluate(
            predicted_rul_hours=predicted_rul,
            mission_duration_hours=params.mission_duration_hours
        )

        # 5. Fault Risk Subscore (0 if normal, up to 1.0 depending on probability & fault severity)
        fault_severity_multiplier = {
            "NORMAL": 0.0,
            "SENSOR_ANOMALY": 0.35,
            "INJECTOR_ABNORMALITY": 0.65,
            "COOLING_PROBLEM": 0.85,
            "LUBRICATION_PROBLEM": 0.95,
            "MISFIRE": 0.90
        }
        fault_risk_score = min(1.0, dominant_fault_prob * fault_severity_multiplier.get(predicted_fault, 0.5))

        # 6. Compute Mission Reliability Score
        reliability_score = self.reliability_calc.compute_reliability(
            engine_health=engine_health,
            engine_fitness=engine_fitness,
            rul_score=rul_score,
            anomaly_score=anomaly_score,
            fault_risk_score=fault_risk_score,
            environmental_stress=env_stress
        )

        # 7. Assess Mission Risk Level
        mission_risk = MissionRiskAssessor.assess_risk(
            reliability_score=reliability_score,
            engine_health=engine_health,
            rul_adequacy=rul_adequacy,
            predicted_fault=predicted_fault,
            fault_probability=dominant_fault_prob,
            anomaly_score=anomaly_score,
            environmental_stress=env_stress
        )

        # 8. Determine Mission Recommendation
        recommendation = RecommendationEngine.determine_recommendation(
            mission_risk=mission_risk,
            engine_health=engine_health,
            rul_adequacy=rul_adequacy,
            predicted_fault=predicted_fault,
            fault_probability=dominant_fault_prob
        )

        # 9. Extract Reason Codes
        reason_codes = RecommendationEngine.extract_reason_codes(
            engine_health=engine_health,
            engine_fitness=engine_fitness,
            deviations=deviations,
            predicted_fault=predicted_fault,
            fault_probability=dominant_fault_prob,
            anomaly_score=anomaly_score,
            rul_adequacy=rul_adequacy,
            environmental_stress=env_stress,
            mission_duration_hours=params.mission_duration_hours
        )

        # 10. Generate Decision Explanation
        explanation = RecommendationEngine.generate_explanation(
            mission_risk=mission_risk,
            mission_recommendation=recommendation,
            engine_health=engine_health,
            engine_fitness=engine_fitness,
            predicted_fault=predicted_fault,
            fault_probability=dominant_fault_prob,
            anomaly_score=anomaly_score,
            rul_margin_hours=rul_margin,
            rul_adequacy=rul_adequacy,
            environmental_stress=env_stress,
            reason_codes=reason_codes
        )

        return MissionDecision(
            timestamp=timestamp,
            mission_duration_hours=round(params.mission_duration_hours, 2),
            altitude=round(altitude, 1),
            ambient_temperature=round(ambient_temp, 1),
            throttle=round(throttle, 1),
            mission_reliability_score=reliability_score,
            mission_risk=mission_risk,
            mission_recommendation=recommendation,
            engine_health=round(engine_health, 1),
            engine_fitness_score=round(engine_fitness, 1),
            predicted_fault=predicted_fault,
            dominant_fault_probability=round(dominant_fault_prob, 4),
            anomaly_status=anomaly_status,
            anomaly_score=round(anomaly_score, 4),
            predicted_rul_hours=round(predicted_rul, 1),
            rul_margin_hours=round(rul_margin, 1),
            rul_adequacy=rul_adequacy,
            environmental_stress=env_stress,
            reason_codes=reason_codes,
            explanation=explanation,
            uav_id=getattr(twin_state, "uav_id", "UAV-001")
        )
