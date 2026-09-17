"""
AeroTwin-UAV Twin & Simulation Service Manager
=============================================
Coordinates live simulator state, digital twin estimation cycles,
and mission risk calculations for the REST API endpoints.

Software-only research prototype.
"""

from typing import Optional, Dict, Any, Tuple, List
import pandas as pd
import numpy as np

from backend.app.simulation import (
    AeroPistonEngineSimulator,
    EngineState,
    FaultType,
    FlightPhase
)
from backend.app.digital_twin import (
    DigitalTwin,
    DigitalTwinState
)
from backend.app.decision import (
    MissionDecisionEngine,
    MissionParameters,
    MissionDecision
)
from backend.app.schemas import SimulationStartRequest


class TwinServiceManager:
    """
    Manages in-memory state for active engine simulation, digital twin tracking,
    and mission risk evaluations across API requests.
    """

    def __init__(self):
        self.simulator: Optional[AeroPistonEngineSimulator] = None
        self.digital_twin = DigitalTwin()
        self.decision_engine = MissionDecisionEngine()

        self.current_engine_state: Optional[EngineState] = None
        self.current_twin_state: Optional[DigitalTwinState] = None
        self.current_decision: Optional[MissionDecision] = None
        self.current_mission_params: Optional[MissionParameters] = None

    def start_simulation(self, request: SimulationStartRequest) -> EngineState:
        """
        Initializes and starts a new virtual aero engine simulation.
        Advances the first timestep and updates the Digital Twin and Decision Engine.
        """
        self.simulator = AeroPistonEngineSimulator(
            engine_id=request.engine_id,
            mission_id=request.mission_id,
            seed=request.seed,
            degradation=request.degradation
        )

        # Configure initial inputs
        self.simulator.set_inputs(
            rpm_target=request.rpm_target,
            throttle=request.throttle,
            altitude=request.altitude,
            ambient_temperature=request.ambient_temperature,
            humidity=request.humidity,
            wind_speed=request.wind_speed,
            mission_duration=request.mission_duration_hours,
            flight_phase=request.flight_phase
        )

        # Inject fault if non-normal
        if request.fault_type != "NORMAL" and request.fault_severity > 0.0:
            self.simulator.inject_fault(
                fault_type=request.fault_type,
                severity=request.fault_severity
            )

        self.current_mission_params = MissionParameters(
            mission_duration_hours=request.mission_duration_hours,
            altitude=request.altitude,
            ambient_temperature=request.ambient_temperature,
            throttle=request.throttle,
            flight_phase=request.flight_phase
        )

        # Run first discrete step to establish initial telemetry
        self.current_engine_state = self.simulator.step(dt=1.0)

        # Synchronize Digital Twin
        self.current_twin_state = self.digital_twin.update(self.current_engine_state)

        # Synchronize Mission Decision Engine
        self.current_decision = self.decision_engine.evaluate(
            twin_state=self.current_twin_state,
            mission_params=self.current_mission_params
        )

        return self.current_engine_state

    def get_current_simulation(self) -> Optional[EngineState]:
        """Returns the latest simulator telemetry state if an active simulation exists."""
        return self.current_engine_state

    def get_digital_twin_state(self) -> Optional[DigitalTwinState]:
        """Returns the latest Digital Twin state."""
        return self.current_twin_state

    def get_mission_decision(
        self,
        duration_hours: Optional[float] = None,
        altitude: Optional[float] = None,
        ambient_temp: Optional[float] = None,
        throttle: Optional[float] = None
    ) -> Optional[MissionDecision]:
        """
        Returns mission risk decision. If override parameters are provided,
        performs dynamic evaluation without altering stored telemetry.
        """
        if self.current_twin_state is None:
            return None

        params = self.current_mission_params or MissionParameters()
        if any(v is not None for v in [duration_hours, altitude, ambient_temp, throttle]):
            params = MissionParameters(
                mission_duration_hours=duration_hours if duration_hours is not None else params.mission_duration_hours,
                altitude=altitude if altitude is not None else params.altitude,
                ambient_temperature=ambient_temp if ambient_temp is not None else params.ambient_temperature,
                throttle=throttle if throttle is not None else params.throttle,
                flight_phase=params.flight_phase
            )

        return self.decision_engine.evaluate(self.current_twin_state, params)

    # -------------------------------------------------------------------------
    # Direct AI Inference Helpers
    # -------------------------------------------------------------------------
    def _prepare_features_df(self, telemetry: Dict[str, Any]) -> pd.DataFrame:
        """Converts and scales telemetry vector to match model input conventions."""
        feat_dict = {}
        for f in self.digital_twin.FEATURE_NAMES:
            if f not in telemetry:
                raise ValueError(f"Missing required telemetry channel '{f}' for AI inference.")
            val = float(telemetry[f])
            if np.isnan(val) or np.isinf(val):
                raise ValueError(f"Invalid non-finite value in channel '{f}': {val}")
            if f in ["throttle", "engine_load"] and val > 1.0:
                feat_dict[f] = val / 100.0
            else:
                feat_dict[f] = val
        return pd.DataFrame([feat_dict])[self.digital_twin.FEATURE_NAMES]

    def predict_fault(self, telemetry: Dict[str, Any]) -> Tuple[str, Dict[str, float]]:
        """Invokes the Fault Classifier on an arbitrary telemetry vector."""
        X = self._prepare_features_df(telemetry)
        pred = str(self.digital_twin.fault_model.predict(X)[0])
        probas = self.digital_twin.fault_model.predict_proba(X)[0]
        classes = self.digital_twin.fault_model.classes_
        proba_dict = {
            cls_name: round(float(p), 4)
            for cls_name, p in zip(classes, probas)
        }
        return pred, proba_dict

    def detect_anomaly(self, telemetry: Dict[str, Any]) -> Tuple[str, float]:
        """Invokes the Anomaly Detector on an arbitrary telemetry vector."""
        X = self._prepare_features_df(telemetry)
        raw_pred = int(self.digital_twin.anomaly_model.predict(X)[0])
        raw_df = float(self.digital_twin.anomaly_model.decision_function(X)[0])

        status = "NORMAL" if raw_pred == 1 else "ANOMALOUS"
        norm_score = (self.digital_twin.df_max - raw_df) / max(
            1e-5, (self.digital_twin.df_max - self.digital_twin.df_min)
        )
        anomaly_score = float(np.clip(norm_score, 0.0, 1.0))
        return status, round(anomaly_score, 4)

    def predict_rul(self, telemetry: Dict[str, Any]) -> float:
        """Invokes the RUL Regressor on an arbitrary telemetry vector."""
        X = self._prepare_features_df(telemetry)
        raw_rul = float(self.digital_twin.rul_model.predict(X)[0])
        return round(float(np.clip(raw_rul, 0.0, None)), 1)

    def ensure_simulation(
        self,
        engine_id: str = "ENGINE-001",
        mission_id: str = "MISSION-001",
        flight_phase: str = "CRUISE",
        seed: int = 42
    ) -> EngineState:
        """
        Ensures an active simulation exists. If not, initializes a deterministic
        default demonstration scenario in CRUISE mode.
        """
        if self.simulator is None or self.current_engine_state is None:
            default_req = SimulationStartRequest(
                engine_id=engine_id,
                mission_id=mission_id,
                rpm_target=2400.0,
                throttle=75.0,
                altitude=1500.0,
                ambient_temperature=25.0,
                humidity=45.0,
                wind_speed=5.0,
                mission_duration_hours=10.0,
                flight_phase=flight_phase,
                degradation=0.05,
                fault_type="NORMAL",
                fault_severity=0.0,
                seed=seed
            )
            return self.start_simulation(default_req)
        return self.current_engine_state

    def step_simulation(self, dt: float = 1.0) -> Dict[str, Any]:
        """
        Advances the virtual engine simulation by dt seconds, updates
        the Digital Twin, evaluates Mission Risk, and returns a verified,
        numerically safe telemetry dictionary for streaming.
        """
        if self.simulator is None or self.current_engine_state is None:
            self.ensure_simulation()

        # 1. Advance simulator
        self.current_engine_state = self.simulator.step(dt=dt)

        # 2. Update Digital Twin
        self.current_twin_state = self.digital_twin.update(self.current_engine_state)

        # 3. Calculate Mission Risk
        params = self.current_mission_params or MissionParameters(
            mission_duration_hours=10.0,
            altitude=self.current_engine_state.altitude,
            ambient_temperature=self.current_engine_state.ambient_temperature,
            throttle=self.current_engine_state.throttle,
            flight_phase=self.current_engine_state.flight_phase
        )
        self.current_decision = self.decision_engine.evaluate(
            twin_state=self.current_twin_state,
            mission_params=params
        )

        # 4. Build and return complete real-time JSON packet
        return self.build_telemetry_packet()

    def build_telemetry_packet(self) -> Dict[str, Any]:
        """
        Constructs a complete, validated, JSON-serializable telemetry and analysis packet.
        Guarantees:
        - No NaN or Infinity
        - RUL >= 0
        - Health & Fitness in [0, 100]
        - Anomaly score in [0, 1]
        - Probabilities in [0, 1]
        """
        if (
            self.current_engine_state is None
            or self.current_twin_state is None
            or self.current_decision is None
        ):
            raise RuntimeError("Simulation state is not initialized.")

        # Telemetry channels
        telemetry_dict = {
            "rpm": round(float(self.current_engine_state.rpm), 1),
            "throttle": round(float(self.current_engine_state.throttle), 1),
            "altitude": round(float(self.current_engine_state.altitude), 1),
            "ambient_temperature": round(float(self.current_engine_state.ambient_temperature), 1),
            "humidity": round(float(self.current_engine_state.humidity), 1),
            "wind_speed": round(float(self.current_engine_state.wind_speed), 1),
            "cht": round(float(self.current_engine_state.cht), 2),
            "egt": round(float(self.current_engine_state.egt), 2),
            "oil_pressure": round(float(self.current_engine_state.oil_pressure), 2),
            "oil_temperature": round(float(self.current_engine_state.oil_temperature), 2),
            "vibration": round(float(self.current_engine_state.vibration), 3),
            "fuel_flow": round(float(self.current_engine_state.fuel_flow), 2),
            "engine_load": round(float(self.current_engine_state.engine_load), 1),
        }

        # Expected telemetry from Digital Twin
        expected_telemetry = {
            k: round(float(v), 2)
            for k, v in self.current_twin_state.expected_telemetry.items()
        }

        # Deviations from Digital Twin
        deviations = {
            k: (v.to_dict() if hasattr(v, "to_dict") else v)
            for k, v in self.current_twin_state.deviations.items()
        }

        # Digital Twin section
        digital_twin_dict = {
            "expected_telemetry": expected_telemetry,
            "deviations": deviations,
            "engine_health": round(float(np.clip(self.current_twin_state.engine_health, 0.0, 100.0)), 1),
            "engine_fitness_score": round(float(np.clip(self.current_twin_state.engine_fitness_score, 0.0, 100.0)), 1),
            "overall_status": str(self.current_twin_state.overall_status),
        }

        # AI section
        fault_probabilities = {
            cls_name: round(float(np.clip(prob, 0.0, 1.0)), 4)
            for cls_name, prob in self.current_twin_state.fault_probabilities.items()
        }
        ai_dict = {
            "predicted_fault": str(self.current_twin_state.predicted_fault),
            "fault_probabilities": fault_probabilities,
            "anomaly_status": str(self.current_twin_state.anomaly_status),
            "anomaly_score": round(float(np.clip(self.current_twin_state.anomaly_score, 0.0, 1.0)), 4),
            "predicted_rul_hours": round(float(max(0.0, self.current_twin_state.predicted_rul_hours)), 1),
        }

        # Mission section
        mission_dict = {
            "mission_reliability_score": round(float(np.clip(self.current_decision.mission_reliability_score, 0.0, 100.0)), 1),
            "mission_risk": str(self.current_decision.mission_risk),
            "mission_recommendation": str(self.current_decision.mission_recommendation),
            "reason_codes": [str(rc) for rc in self.current_decision.reason_codes],
        }

        packet = {
            "type": "telemetry",
            "timestamp": str(self.current_engine_state.timestamp),
            "engine_id": str(self.current_engine_state.engine_id),
            "mission_id": str(self.current_engine_state.mission_id),
            "flight_phase": str(self.current_engine_state.flight_phase),
            "telemetry": telemetry_dict,
            "digital_twin": digital_twin_dict,
            "ai": ai_dict,
            "mission": mission_dict,
        }

        # Deep validation: ensure no NaN or Infinity exists anywhere
        self._validate_numerical_safety(packet)

        return packet

    @classmethod
    def _validate_numerical_safety(cls, obj: Any, path: str = "root"):
        """Ensures all values are finite and strictly valid for JSON serialization."""
        import math
        if isinstance(obj, dict):
            for k, v in obj.items():
                cls._validate_numerical_safety(v, f"{path}.{k}")
        elif isinstance(obj, list):
            for i, v in enumerate(obj):
                cls._validate_numerical_safety(v, f"{path}[{i}]")
        elif isinstance(obj, (float, np.floating)):
            val = float(obj)
            if math.isnan(val) or math.isinf(val):
                raise ValueError(f"Numerical safety violation at '{path}': non-finite value {val}")


# Global singleton service instance
service_manager = TwinServiceManager()
