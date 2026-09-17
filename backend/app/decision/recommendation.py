"""
AeroTwin-UAV Mission Recommendation & Reason Code Generator
============================================================
Synthesizes transparent reason codes, rule-based mission recommendations,
and natural-language decision explanations from Digital Twin and AI diagnostics.

Software-only research prototype.
"""

from enum import Enum
from typing import List, Dict, Any


class MissionRecommendation(str, Enum):
    """Supported prototype mission recommendation states."""
    SAFE_TO_PROCEED = "SAFE_TO_PROCEED"
    PROCEED_WITH_CAUTION = "PROCEED_WITH_CAUTION"
    MISSION_NOT_RECOMMENDED = "MISSION_NOT_RECOMMENDED"


class ReasonCode(str, Enum):
    """Structured diagnostic reason codes triggered by engine/mission conditions."""
    HIGH_ENGINE_HEALTH = "HIGH_ENGINE_HEALTH"
    LOW_ENGINE_HEALTH = "LOW_ENGINE_HEALTH"
    CRITICAL_ENGINE_HEALTH = "CRITICAL_ENGINE_HEALTH"
    HIGH_VIBRATION = "HIGH_VIBRATION"
    HIGH_CHT = "HIGH_CHT"
    HIGH_EGT = "HIGH_EGT"
    LOW_OIL_PRESSURE = "LOW_OIL_PRESSURE"
    HIGH_OIL_TEMP = "HIGH_OIL_TEMP"
    HIGH_ANOMALY = "HIGH_ANOMALY"
    FAULT_PROBABILITY_HIGH = "FAULT_PROBABILITY_HIGH"
    LOW_RUL_MARGIN = "LOW_RUL_MARGIN"
    INADEQUATE_RUL = "INADEQUATE_RUL"
    ADEQUATE_RUL_MARGIN = "ADEQUATE_RUL_MARGIN"
    HIGH_ENVIRONMENTAL_STRESS = "HIGH_ENVIRONMENTAL_STRESS"
    HIGH_MISSION_DURATION = "HIGH_MISSION_DURATION"
    NOMINAL_OPERATING_CONDITIONS = "NOMINAL_OPERATING_CONDITIONS"


class RecommendationEngine:
    """
    Evaluates rule-based recommendations, extracts active reason codes,
    and generates natural-language decision explanations.
    """

    @staticmethod
    def extract_reason_codes(
        engine_health: float,
        engine_fitness: float,
        deviations: Dict[str, Any],
        predicted_fault: str,
        fault_probability: float,
        anomaly_score: float,
        rul_adequacy: str,
        environmental_stress: float,
        mission_duration_hours: float
    ) -> List[str]:
        """
        Extracts active reason codes strictly matching observed conditions.
        """
        codes = []

        # 1. Health indicators
        if engine_health >= 85.0 and engine_fitness >= 85.0 and predicted_fault == "NORMAL":
            codes.append(ReasonCode.HIGH_ENGINE_HEALTH.value)
        elif engine_health < 50.0:
            codes.append(ReasonCode.CRITICAL_ENGINE_HEALTH.value)
        elif engine_health < 80.0:
            codes.append(ReasonCode.LOW_ENGINE_HEALTH.value)

        # 2. Parameter deviations
        if deviations:
            for p, dev in deviations.items():
                status = getattr(dev, "status", None) or (dev.get("status") if isinstance(dev, dict) else None)
                if status in ["WARNING", "CRITICAL"]:
                    if p == "vibration":
                        codes.append(ReasonCode.HIGH_VIBRATION.value)
                    elif p == "cht":
                        codes.append(ReasonCode.HIGH_CHT.value)
                    elif p == "egt":
                        codes.append(ReasonCode.HIGH_EGT.value)
                    elif p == "oil_pressure":
                        codes.append(ReasonCode.LOW_OIL_PRESSURE.value)
                    elif p == "oil_temperature":
                        codes.append(ReasonCode.HIGH_OIL_TEMP.value)

        # 3. Anomaly indicator
        if anomaly_score > 0.60:
            codes.append(ReasonCode.HIGH_ANOMALY.value)

        # 4. Fault indicator
        if predicted_fault != "NORMAL" and fault_probability > 0.40:
            codes.append(ReasonCode.FAULT_PROBABILITY_HIGH.value)

        # 5. RUL margin
        if rul_adequacy == "INADEQUATE":
            codes.append(ReasonCode.INADEQUATE_RUL.value)
        elif rul_adequacy == "MARGINAL":
            codes.append(ReasonCode.LOW_RUL_MARGIN.value)
        elif rul_adequacy == "ADEQUATE":
            codes.append(ReasonCode.ADEQUATE_RUL_MARGIN.value)

        # 6. Environmental stress & duration
        if environmental_stress > 0.55:
            codes.append(ReasonCode.HIGH_ENVIRONMENTAL_STRESS.value)

        if mission_duration_hours >= 6.0:
            codes.append(ReasonCode.HIGH_MISSION_DURATION.value)

        if not codes:
            codes.append(ReasonCode.NOMINAL_OPERATING_CONDITIONS.value)

        return list(dict.fromkeys(codes))  # Preserve order, remove duplicates

    @staticmethod
    def determine_recommendation(
        mission_risk: str,
        engine_health: float,
        rul_adequacy: str,
        predicted_fault: str,
        fault_probability: float
    ) -> str:
        """
        Determines the decision-support mission recommendation:
        SAFE_TO_PROCEED, PROCEED_WITH_CAUTION, or MISSION_NOT_RECOMMENDED.
        """
        severe_faults = ["LUBRICATION_PROBLEM", "MISFIRE", "COOLING_PROBLEM"]

        # Hard blocks for MISSION_NOT_RECOMMENDED
        if (
            mission_risk == "HIGH" or
            rul_adequacy == "INADEQUATE" or
            engine_health < 50.0 or
            (predicted_fault in severe_faults and fault_probability > 0.55)
        ):
            return MissionRecommendation.MISSION_NOT_RECOMMENDED.value

        # Caution conditions
        if (
            mission_risk == "MEDIUM" or
            rul_adequacy == "MARGINAL" or
            engine_health < 80.0 or
            predicted_fault != "NORMAL"
        ):
            return MissionRecommendation.PROCEED_WITH_CAUTION.value

        return MissionRecommendation.SAFE_TO_PROCEED.value

    @staticmethod
    def generate_explanation(
        mission_risk: str,
        mission_recommendation: str,
        engine_health: float,
        engine_fitness: float,
        predicted_fault: str,
        fault_probability: float,
        anomaly_score: float,
        rul_margin_hours: float,
        rul_adequacy: str,
        environmental_stress: float,
        reason_codes: List[str]
    ) -> str:
        """
        Generates structured, human-readable rationale grounded in actual conditions.
        """
        factors = []

        if engine_health < 50.0:
            factors.append(f"engine health is critically low ({engine_health:.1f}%)")
        elif engine_health < 80.0:
            factors.append(f"engine health is degraded ({engine_health:.1f}%)")

        if engine_fitness < 80.0:
            factors.append(f"operational fitness has dropped ({engine_fitness:.1f}%)")

        if predicted_fault != "NORMAL":
            factors.append(f"predicted fault '{predicted_fault}' with probability {fault_probability:.2f}")

        if anomaly_score > 0.60:
            factors.append(f"unsupervised anomaly score is elevated ({anomaly_score:.2f})")

        if rul_adequacy == "INADEQUATE":
            factors.append("predicted RUL does not cover planned mission duration")
        elif rul_adequacy == "MARGINAL":
            factors.append(f"predicted RUL margin is tight ({rul_margin_hours:.1f} hours remaining)")

        if environmental_stress > 0.55:
            factors.append(f"high environmental/operational stress index ({environmental_stress:.2f})")

        if not factors:
            return (
                f"Mission risk is {mission_risk} and recommendation is {mission_recommendation} because "
                f"engine health ({engine_health:.1f}%) and operational fitness ({engine_fitness:.1f}%) are nominal, "
                f"predicted fault is NORMAL, and predicted RUL margin is adequate ({rul_margin_hours:.1f} hours)."
            )

        factors_str = ", ".join(factors)
        return (
            f"Mission risk is {mission_risk} and recommendation is {mission_recommendation} because "
            f"{factors_str}."
        )
