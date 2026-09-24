"""
AeroTwin-UAV Unified UAV State Models
====================================
Defines the clean, unified UAV state and data structures representing the
complete operational condition of an individual Unmanned Aerial Vehicle.

Contains all 13 required core attributes:
- uav_id
- mission_id
- engine telemetry (engine_telemetry)
- flight phase
- engine health
- fitness score
- predicted fault
- fault confidence
- anomaly status
- anomaly score
- predicted RUL
- mission risk
- recommendation

Software-only research prototype.
"""

from dataclasses import dataclass, field, asdict
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field


@dataclass
class UAVState:
    """
    Core domain data structure encapsulating the complete state of a single UAV.
    Supports multi-UAV indexing, state synchronization, and serialization.
    """
    uav_id: str = "UAV-001"
    mission_id: str = "MSN-001"
    engine_telemetry: Dict[str, float] = field(default_factory=dict)
    flight_phase: str = "CRUISE"
    engine_health: float = 100.0
    fitness_score: float = 100.0
    predicted_fault: str = "NORMAL"
    fault_confidence: float = 1.0
    anomaly_status: str = "NORMAL"
    anomaly_score: float = 0.0
    predicted_rul: float = 150.0
    mission_risk: str = "LOW"
    recommendation: str = "CONTINUE_MISSION"
    mission_reliability_score: float = 100.0
    reason_codes: List[str] = field(default_factory=list)
    explanation: str = ""
    timestamp: Optional[str] = None
    data_mode: str = "SIMULATED"
    # Dynamic UAV Fault Simulation attributes
    fault_type: str = "NORMAL"
    severity: float = 0.0
    affected_component: str = "No affected component"
    status: str = "HEALTHY"
    fault_start_time: Optional[float] = None
    fault_duration: Optional[float] = None
    next_fault_change: Optional[float] = None


    @property
    def telemetry(self) -> Dict[str, float]:
        """Convenience alias for engine_telemetry."""
        return self.engine_telemetry

    @property
    def predicted_rul_hours(self) -> float:
        """Convenience alias for predicted_rul."""
        return self.predicted_rul

    def to_dict(self) -> Dict[str, Any]:
        """Serializes UAV state to standard dictionary."""
        d = asdict(self)
        d["telemetry"] = self.engine_telemetry
        return d

    @classmethod
    def from_states(
        cls,
        engine_state: Any = None,
        twin_state: Any = None,
        decision: Any = None,
        uav_id: str = "UAV-001",
        fault_state: Any = None
    ) -> "UAVState":
        """
        Factory method to assemble a unified UAVState from the existing
        EngineState, DigitalTwinState, and MissionDecision components,
        incorporating the UAV's active dynamic fault state.
        """
        # 1. Identity & mission defaults
        resolved_uav_id = getattr(engine_state, "uav_id", None) or getattr(twin_state, "uav_id", None) or uav_id
        mission_id = (
            getattr(engine_state, "mission_id", None)
            or getattr(twin_state, "mission_id", None)
            or "MSN-001"
        )
        flight_phase = (
            getattr(engine_state, "flight_phase", None)
            or getattr(twin_state, "flight_phase", None)
            or "CRUISE"
        )
        timestamp = getattr(engine_state, "timestamp", None) or getattr(twin_state, "timestamp", None)

        # 2. Extract engine telemetry
        telemetry: Dict[str, float] = {}
        if engine_state is not None:
            channels = [
                "rpm", "throttle", "altitude", "ambient_temperature",
                "humidity", "wind_speed", "cht", "egt",
                "oil_pressure", "oil_temperature", "vibration",
                "fuel_flow", "engine_load"
            ]
            for ch in channels:
                val = getattr(engine_state, ch, None)
                if val is not None:
                    telemetry[ch] = round(float(val), 2)
        elif twin_state is not None and hasattr(twin_state, "actual_telemetry"):
            telemetry = {k: round(float(v), 2) for k, v in twin_state.actual_telemetry.items()}

        # 3. Digital Twin & AI attributes
        engine_health = 100.0
        fitness_score = 100.0
        predicted_fault = "NORMAL"
        fault_confidence = 1.0
        anomaly_status = "NORMAL"
        anomaly_score = 0.0
        predicted_rul = 150.0

        if twin_state is not None:
            engine_health = round(float(getattr(twin_state, "engine_health", 100.0)), 1)
            fitness_score = round(float(getattr(twin_state, "engine_fitness_score", 100.0)), 1)
            predicted_fault = str(getattr(twin_state, "predicted_fault", "NORMAL"))
            
            probas = getattr(twin_state, "fault_probabilities", {})
            if probas and isinstance(probas, dict):
                fault_confidence = round(float(probas.get(predicted_fault, max(probas.values(), default=1.0))), 4)
            else:
                fault_confidence = 1.0

            anomaly_status = str(getattr(twin_state, "anomaly_status", "NORMAL"))
            anomaly_score = round(float(getattr(twin_state, "anomaly_score", 0.0)), 4)
            predicted_rul = round(float(getattr(twin_state, "predicted_rul_hours", 150.0)), 1)

        # 4. Mission Decision attributes
        mission_risk = "LOW"
        recommendation = "CONTINUE_MISSION"
        mission_reliability_score = 100.0
        reason_codes = []
        explanation = ""
        if decision is not None:
            mission_risk = str(getattr(decision, "mission_risk", "LOW"))
            recommendation = str(getattr(decision, "mission_recommendation", "CONTINUE_MISSION"))
            mission_reliability_score = round(float(getattr(decision, "mission_reliability_score", 100.0)), 1)
            reason_codes = [str(rc) for rc in getattr(decision, "reason_codes", [])]
            explanation = str(getattr(decision, "explanation", ""))

        # 5. Dynamic Fault State synchronization
        fault_type = "NORMAL"
        severity = 0.0
        affected_component = "No affected component"
        status = "HEALTHY"
        fault_start_time = None
        fault_duration = None
        next_fault_change = None

        if fault_state is not None:
            fault_type = str(getattr(fault_state, "fault_type", "NORMAL"))
            severity = float(getattr(fault_state, "severity", 0.0))
            affected_component = str(getattr(fault_state, "affected_component", "No affected component"))
            status = str(getattr(fault_state, "status", "HEALTHY"))
            fault_start_time = getattr(fault_state, "fault_start_time", None)
            fault_duration = getattr(fault_state, "fault_duration", None)
            next_fault_change = getattr(fault_state, "next_fault_change", None)

            # Ensure AI fault reflects active dynamic simulation state
            if fault_type != "NORMAL":
                predicted_fault = fault_type
                if fault_confidence < 0.60:
                    fault_confidence = 0.92
                if fault_type == "SENSOR_ANOMALY":
                    anomaly_status = "WARNING"
                else:
                    anomaly_status = "ANOMALOUS"
            else:
                predicted_fault = "NORMAL"
                anomaly_status = "NORMAL"
                status = "HEALTHY"
                affected_component = "No affected component"
                severity = 0.0

        return cls(
            uav_id=resolved_uav_id,
            mission_id=mission_id,
            engine_telemetry=telemetry,
            flight_phase=flight_phase,
            engine_health=engine_health,
            fitness_score=fitness_score,
            predicted_fault=predicted_fault,
            fault_confidence=fault_confidence,
            anomaly_status=anomaly_status,
            anomaly_score=anomaly_score,
            predicted_rul=predicted_rul,
            mission_risk=mission_risk,
            recommendation=recommendation,
            mission_reliability_score=mission_reliability_score,
            reason_codes=reason_codes,
            explanation=explanation,
            timestamp=timestamp,
            fault_type=fault_type,
            severity=severity,
            affected_component=affected_component,
            status=status,
            fault_start_time=fault_start_time,
            fault_duration=fault_duration,
            next_fault_change=next_fault_change
        )


# =============================================================================
# Pydantic Response Schema for API contracts
# =============================================================================
class UAVStateResponse(BaseModel):
    """
    Pydantic schema representing the complete unified UAV state for REST/WebSocket APIs.
    """
    uav_id: str = Field(default="UAV-001", description="Unique UAV identifier")
    mission_id: str = Field(default="MSN-001", description="Mission identifier")
    engine_telemetry: Dict[str, float] = Field(default_factory=dict, description="Observable engine telemetry channels")
    flight_phase: str = Field(default="CRUISE", description="Active flight phase")
    engine_health: float = Field(default=100.0, ge=0.0, le=100.0, description="Engine health score (0-100)")
    fitness_score: float = Field(default=100.0, ge=0.0, le=100.0, description="Operational fitness score (0-100)")
    predicted_fault: str = Field(default="NORMAL", description="Predicted fault mode")
    fault_confidence: float = Field(default=1.0, ge=0.0, le=1.0, description="Confidence of predicted fault (0-1)")
    anomaly_status: str = Field(default="NORMAL", description="Anomaly status (NORMAL / ANOMALOUS)")
    anomaly_score: float = Field(default=0.0, ge=0.0, le=1.0, description="Anomaly score (0-1)")
    predicted_rul: float = Field(default=150.0, ge=0.0, description="Predicted Remaining Useful Life (hours)")
    mission_risk: str = Field(default="LOW", description="Mission risk assessment (LOW / MEDIUM / HIGH)")
    recommendation: str = Field(default="CONTINUE_MISSION", description="Decision-support recommendation")
    mission_reliability_score: float = Field(default=100.0, ge=0.0, le=100.0, description="Mission reliability score (0-100)")
    reason_codes: List[str] = Field(default_factory=list, description="Active decision and hazard reason codes")
    explanation: str = Field(default="", description="Human-readable decision explanation")
    timestamp: Optional[str] = Field(default=None, description="Timestamp of telemetry snapshot")
    data_mode: str = Field(default="SIMULATED", description="Identifies data as simulated telemetry")
    # Dynamic UAV Fault Simulation attributes
    fault_type: str = Field(default="NORMAL", description="Current simulated engine fault type")
    severity: float = Field(default=0.0, ge=0.0, le=1.0, description="Active fault severity level")
    affected_component: str = Field(default="No affected component", description="Component affected by active fault")
    status: str = Field(default="HEALTHY", description="Engine subsystem health status")
    fault_start_time: Optional[float] = Field(default=None, description="Timestamp when current fault started")
    fault_duration: Optional[float] = Field(default=None, description="Duration in seconds of current fault window")
    next_fault_change: Optional[float] = Field(default=None, description="Timestamp when next fault transition occurs")



class FleetStateResponse(BaseModel):
    """
    Fleet-wide synchronized state response containing all active UAV states.
    """
    total_uavs: int = Field(default=5, description="Number of active UAVs in the fleet")
    data_mode: str = Field(default="SIMULATED", description="Identifies data as simulated telemetry")
    timestamp: Optional[str] = Field(default=None, description="Snapshot ISO timestamp")
    uavs: List[UAVStateResponse] = Field(default_factory=list, description="List of individual UAV states")
