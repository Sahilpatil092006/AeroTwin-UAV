"""
AeroTwin-UAV Pydantic Request & Response Data Transfer Schemas
==============================================================
Defines strict validation rules and response serialization contracts for
all REST API endpoints.

Software-only research prototype.
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, field_validator

from backend.app.schemas.uav import UAVState, UAVStateResponse, FleetStateResponse


# =============================================================================
# Health & Status Schemas
# =============================================================================
class HealthResponse(BaseModel):
    """System health check response."""
    status: str = "ok"
    service: str = "AeroTwin-UAV API"
    version: str = "1.0.0"


class StandbyResponse(BaseModel):
    """Returned when simulation has not yet been initialized."""
    status: str = "standby"
    message: str = "No active simulation."


# =============================================================================
# Telemetry Schemas
# =============================================================================
class TelemetryInput(BaseModel):
    """
    13-channel observable telemetry vector for direct AI inference.
    """
    rpm: float = Field(..., ge=0.0, le=7000.0, description="Engine rotational speed (RPM)")
    throttle: float = Field(..., ge=0.0, le=100.0, description="Throttle position (0-100%)")
    altitude: float = Field(..., ge=0.0, le=8500.0, description="Altitude MSL (meters)")
    ambient_temperature: float = Field(..., ge=-40.0, le=60.0, description="Outside air temp (°C)")
    humidity: float = Field(..., ge=0.0, le=100.0, description="Relative humidity (%)")
    wind_speed: float = Field(..., ge=0.0, le=50.0, description="Wind speed (m/s)")
    cht: float = Field(..., ge=0.0, le=300.0, description="Cylinder Head Temperature (°C)")
    egt: float = Field(..., ge=0.0, le=1100.0, description="Exhaust Gas Temperature (°C)")
    oil_pressure: float = Field(..., ge=0.0, le=10.0, description="Oil pressure (bar)")
    oil_temperature: float = Field(..., ge=0.0, le=200.0, description="Oil temperature (°C)")
    vibration: float = Field(..., ge=0.0, le=50.0, description="Vibration RMS (mm/s)")
    fuel_flow: float = Field(..., ge=0.0, le=80.0, description="Fuel flow rate (L/h)")
    engine_load: float = Field(..., ge=0.0, le=100.0, description="Calculated engine load (%)")


class TelemetryResponse(BaseModel):
    """Full simulated telemetry snapshot output."""
    uav_id: str = Field(default="UAV-001", description="Unique UAV identifier")
    engine_id: str
    mission_id: str
    timestamp: str
    flight_phase: str
    rpm: float
    throttle: float
    altitude: float
    ambient_temperature: float
    humidity: float
    wind_speed: float
    cht: float
    egt: float
    oil_pressure: float
    oil_temperature: float
    vibration: float
    fuel_flow: float
    engine_load: float
    degradation: float
    fault_type: str
    fault_severity: float


# =============================================================================
# Simulation Schemas
# =============================================================================
class SimulationStartRequest(BaseModel):
    """Parameters for initializing or updating the virtual aero engine simulation."""
    uav_id: str = Field(default="UAV-001", description="Unique UAV identifier")
    engine_id: str = Field(default="AERO-001", description="Engine identifier")
    mission_id: str = Field(default="MSN-001", description="Mission identifier")
    rpm_target: Optional[float] = Field(default=None, ge=800.0, le=6000.0, description="Target RPM override")
    throttle: float = Field(default=65.0, ge=0.0, le=100.0, description="Throttle position (%)")
    altitude: float = Field(default=3500.0, ge=0.0, le=8000.0, description="Altitude (meters)")
    ambient_temperature: float = Field(default=15.0, ge=-25.0, le=50.0, description="Ambient air temperature (°C)")
    humidity: float = Field(default=50.0, ge=0.0, le=100.0, description="Relative humidity (%)")
    wind_speed: float = Field(default=5.0, ge=0.0, le=25.0, description="Wind speed (m/s)")
    mission_duration_hours: float = Field(default=2.0, gt=0.0, le=48.0, description="Mission duration (hours)")
    flight_phase: str = Field(default="CRUISE", description="Operating flight phase")
    degradation: float = Field(default=0.0, ge=0.0, le=1.0, description="Mechanical wear level (0.0 healthy - 1.0 critical)")
    fault_type: str = Field(default="NORMAL", description="Fault mode injection")
    fault_severity: float = Field(default=0.0, ge=0.0, le=1.0, description="Fault intensity")
    seed: Optional[int] = Field(default=42, description="Random generator seed")

    @field_validator("flight_phase")
    @classmethod
    def validate_flight_phase(cls, v: str) -> str:
        valid = ["GROUND", "TAKEOFF", "CLIMB", "CRUISE", "DESCENT", "LANDING"]
        if v.upper() not in valid:
            raise ValueError(f"Invalid flight_phase '{v}'. Permitted: {valid}")
        return v.upper()

    @field_validator("fault_type")
    @classmethod
    def validate_fault_type(cls, v: str) -> str:
        valid = ["NORMAL", "INJECTOR_ABNORMALITY", "COOLING_PROBLEM", "LUBRICATION_PROBLEM", "MISFIRE", "SENSOR_ANOMALY"]
        if v.upper() not in valid:
            raise ValueError(f"Invalid fault_type '{v}'. Permitted: {valid}")
        return v.upper()


class SimulationFaultRequest(BaseModel):
    """Parameters for injecting or clearing an operational fault in an active UAV simulation."""
    uav_id: Optional[str] = Field(default="UAV-001", description="Target UAV identifier")
    fault_type: str = Field(default="NORMAL", description="Fault mode: NORMAL, INJECTOR_ABNORMALITY, COOLING_PROBLEM, LUBRICATION_PROBLEM, MISFIRE, SENSOR_ANOMALY")
    severity: float = Field(default=0.8, ge=0.0, le=1.0, description="Fault intensity [0.0, 1.0]")
    degradation: Optional[float] = Field(default=None, ge=0.0, le=1.0, description="Optional mechanical degradation level [0.0, 1.0]")
    target_sensor: Optional[str] = Field(default=None, description="Optional target sensor for SENSOR_ANOMALY")

    @field_validator("fault_type")
    @classmethod
    def validate_fault_type(cls, v: str) -> str:
        valid = ["NORMAL", "INJECTOR_ABNORMALITY", "COOLING_PROBLEM", "LUBRICATION_PROBLEM", "MISFIRE", "SENSOR_ANOMALY"]
        if v.upper() not in valid:
            raise ValueError(f"Invalid fault_type '{v}'. Permitted: {valid}")
        return v.upper()


# =============================================================================
# Digital Twin Schemas
# =============================================================================
class ParameterDeviationDetail(BaseModel):
    """Detailed deviation metrics for a single telemetry parameter."""
    param_name: str
    unit: str
    actual: float
    expected: float
    absolute_deviation: float
    relative_deviation_pct: float
    normalized_deviation: float
    status: str


class DigitalTwinHealthResponse(BaseModel):
    """Composite health and operational fitness response."""
    engine_health: float = Field(..., ge=0.0, le=100.0)
    engine_fitness_score: float = Field(..., ge=0.0, le=100.0)
    overall_status: str
    timestamp: str


class DigitalTwinDeviationResponse(BaseModel):
    """Deviations between actual and expected telemetry."""
    expected_telemetry: Dict[str, float]
    actual_telemetry: Dict[str, float]
    deviations: Dict[str, ParameterDeviationDetail]


class DigitalTwinResponse(BaseModel):
    """Comprehensive Digital Twin state representation."""
    uav_id: str = Field(default="UAV-001", description="Unique UAV identifier")
    timestamp: str
    engine_id: str
    mission_id: str
    flight_phase: str
    actual_telemetry: Dict[str, float]
    expected_telemetry: Dict[str, float]
    deviations: Dict[str, ParameterDeviationDetail]
    engine_health: float
    engine_fitness_score: float
    predicted_fault: str
    fault_probabilities: Dict[str, float]
    anomaly_status: str
    anomaly_score: float
    predicted_rul_hours: float
    overall_status: str


# =============================================================================
# AI Model Schemas
# =============================================================================
class FaultPredictionResponse(BaseModel):
    """Multi-class fault classifier output."""
    predicted_fault: str
    fault_probabilities: Dict[str, float]


class AnomalyResponse(BaseModel):
    """Unsupervised anomaly detector output."""
    anomaly_status: str
    anomaly_score: float = Field(..., ge=0.0, le=1.0)


class RULResponse(BaseModel):
    """Remaining Useful Life regressor output."""
    predicted_rul_hours: float = Field(..., ge=0.0)


class AIExplanationResponse(BaseModel):
    """Synthesized AI decision-support explanation."""
    predicted_fault: str
    fault_probability: float
    anomaly_status: str
    anomaly_score: float
    predicted_rul_hours: float
    important_deviations: List[Dict[str, Any]]
    explanation: str


# =============================================================================
# Mission Risk Schemas
# =============================================================================
class MissionRiskResponse(BaseModel):
    """Complete Mission Risk and Reliability decision-support output."""
    uav_id: str = Field(default="UAV-001", description="Unique UAV identifier")
    timestamp: str
    mission_duration_hours: float
    altitude: float
    ambient_temperature: float
    throttle: float
    mission_reliability_score: float = Field(..., ge=0.0, le=100.0)
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


# =============================================================================
# What-If Scenario Schemas (WIF-01)
# =============================================================================
class WhatIfRequest(BaseModel):
    """Parameters for evaluating a What-If predictive flight projection."""
    altitude: float = Field(default=18000.0, ge=0.0, le=50000.0, description="Altitude in feet")
    ambientDelta: float = Field(default=15.0, ge=-50.0, le=60.0, description="Ambient temperature delta in °C")
    throttle: float = Field(default=85.0, ge=0.0, le=100.0, description="Throttle position %")
    injectorDrift: float = Field(default=0.0, ge=0.0, le=100.0, description="Induced injector lean drift %")
    uav_id: Optional[str] = Field(default="UAV-001", description="Target UAV identifier")
    flight_phase: Optional[str] = Field(default="CRUISE", description="Operating flight phase")
    mission_duration_hours: Optional[float] = Field(default=2.0, gt=0.0, le=48.0, description="Mission duration in hours")


class WhatIfResponse(BaseModel):
    """Calculated What-If scenario outcome from physics simulator, Digital Twin, and AI."""
    is_what_if: bool = True
    status_tag: str = "WHAT-IF / SIMULATED RESULT"
    uav_id: str = "UAV-001"
    scenario_inputs: Dict[str, Any]
    peakCht: float
    peakEgt: float
    survivalProb: float
    thermalMargin: float
    riskLevel: str
    engine_health: float
    engine_fitness_score: float
    predicted_fault: str
    predicted_rul_hours: float
    anomaly_status: str
    anomaly_score: float
    mission_recommendation: str
    reason_codes: List[str]
    explanation: str
    timestamp: str

