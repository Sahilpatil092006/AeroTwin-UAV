"""
AeroTwin-UAV Emergency Return-to-Base (RTB) Decision Engine
==========================================================
Evaluates live telemetry, Digital Twin diagnostics, AI fault inferences,
and mission risk classifications against strict threshold criteria to
determine whether an autonomous Emergency Return-to-Base (RTB) order
must be executed.

RTB activates when ANY of the following 5 conditions is true:
1. Engine Health < 30%
2. Oil Pressure < 1.0 bar
3. CHT > 145°C
4. Vibration > 6g
5. Mission Risk = HIGH AND a critical fault is present

Software-only research prototype.
"""

from typing import Dict, Any, Optional, List, Union
import datetime

# Critical mechanical / powertrain fault signatures that pose immediate flight safety risks
CRITICAL_FAULT_TYPES = {
    "LUBRICATION_PROBLEM",
    "COOLING_PROBLEM",
    "MISFIRE",
    "INJECTOR_ABNORMALITY",
    "TURBOCHARGER_DEGRADATION",
}


def is_critical_fault(predicted_fault: Optional[str]) -> bool:
    """
    Determines whether a predicted fault represents a critical engine mechanical failure.
    Non-critical states: 'NORMAL', 'NONE', 'SENSOR_ANOMALY' (instrumentation anomaly).
    """
    if not predicted_fault:
        return False
    clean = str(predicted_fault).strip().upper()
    if clean in ("NORMAL", "NONE", "SENSOR_ANOMALY", ""):
        return False
    return clean in CRITICAL_FAULT_TYPES or clean not in ("NORMAL", "NONE", "SENSOR_ANOMALY")


class RtbDecisionEngine:
    """
    Rule-based deterministic decision engine for Emergency Return-to-Base.
    Evaluates current UAV telemetry, health metrics, and mission risk against
    operational safety thresholds.
    """

    CRITICAL_HEALTH_THRESHOLD = 30.0       # %
    CRITICAL_OIL_PRESSURE_THRESHOLD = 1.0  # bar
    CRITICAL_CHT_THRESHOLD = 145.0         # °C
    CRITICAL_VIBRATION_THRESHOLD = 6.0     # g

    @classmethod
    def evaluate(
        cls,
        uav_id: str,
        engine_health: float,
        oil_pressure: float,
        cht: float,
        vibration: float,
        mission_risk: str,
        predicted_fault: str,
        timestamp: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Evaluates the 5 explicit RTB trigger conditions:
        1. Engine Health < 30%
        2. Oil Pressure < 1.0 bar
        3. CHT > 145°C
        4. Vibration > 6g
        5. Mission Risk = HIGH AND a critical fault is present
        """
        reasons: List[str] = []

        # 1. Engine Health < 30%
        if engine_health < cls.CRITICAL_HEALTH_THRESHOLD:
            reasons.append(f"Engine Health < 30% ({engine_health:.1f}%)")

        # 2. Oil Pressure < 1.0 bar
        if oil_pressure < cls.CRITICAL_OIL_PRESSURE_THRESHOLD:
            reasons.append(f"Oil Pressure < 1.0 bar ({oil_pressure:.2f} bar)")

        # 3. CHT > 145°C
        if cht > cls.CRITICAL_CHT_THRESHOLD:
            reasons.append(f"CHT > 145°C ({cht:.1f}°C)")

        # 4. Vibration > 6g
        if vibration > cls.CRITICAL_VIBRATION_THRESHOLD:
            reasons.append(f"Vibration > 6g ({vibration:.2f}g)")

        # 5. Mission Risk = HIGH AND a critical fault is present
        risk_upper = (mission_risk or "").strip().upper()
        if risk_upper in ("HIGH", "CRITICAL") and is_critical_fault(predicted_fault):
            reasons.append(f"Mission Risk = HIGH with critical fault: {predicted_fault}")

        rtb_active = len(reasons) > 0
        trigger_reason = "; ".join(reasons) if rtb_active else None
        status = "EMERGENCY RTB" if rtb_active else "STANDBY"
        severity = "CRITICAL" if rtb_active else "NONE"

        ts = timestamp or datetime.datetime.now(datetime.timezone.utc).isoformat()

        triggering_telemetry_values = {
            "engine_health": round(float(engine_health), 2),
            "oil_pressure": round(float(oil_pressure), 2),
            "cht": round(float(cht), 2),
            "vibration": round(float(vibration), 2),
            "mission_risk": risk_upper or "LOW",
            "predicted_fault": predicted_fault or "NORMAL",
        }

        return {
            "rtb_active": rtb_active,
            "uav_id": uav_id,
            "trigger_reason": trigger_reason,
            "severity": severity,
            "destination": "HOME_BASE",
            "status": status,
            "triggering_telemetry_values": triggering_telemetry_values,
            "timestamp": ts,
        }

    @classmethod
    def evaluate_uav_state(cls, uav_state: Any) -> Dict[str, Any]:
        """
        Convenience adapter that evaluates a UAVState dataclass, model, or dict.
        """
        if uav_state is None:
            return cls.evaluate(
                uav_id="UNKNOWN",
                engine_health=100.0,
                oil_pressure=2.8,
                cht=105.0,
                vibration=2.4,
                mission_risk="LOW",
                predicted_fault="NORMAL"
            )

        if hasattr(uav_state, "to_dict"):
            d = uav_state.to_dict()
        elif isinstance(uav_state, dict):
            d = uav_state
        else:
            d = getattr(uav_state, "__dict__", {})

        uav_id = str(d.get("uav_id", "UAV-001"))
        engine_health = float(d.get("engine_health", 100.0))
        mission_risk = str(d.get("mission_risk", "LOW"))
        predicted_fault = str(d.get("predicted_fault", "NORMAL"))
        timestamp = d.get("timestamp")

        # Extract telemetry parameters
        tel = d.get("engine_telemetry", {}) or {}
        oil_pressure = float(tel.get("oil_pressure", d.get("oil_pressure", 2.8)))
        cht = float(tel.get("cht", d.get("cht", 105.0)))
        vibration = float(tel.get("vibration", d.get("vibration", 2.4)))

        return cls.evaluate(
            uav_id=uav_id,
            engine_health=engine_health,
            oil_pressure=oil_pressure,
            cht=cht,
            vibration=vibration,
            mission_risk=mission_risk,
            predicted_fault=predicted_fault,
            timestamp=timestamp
        )
