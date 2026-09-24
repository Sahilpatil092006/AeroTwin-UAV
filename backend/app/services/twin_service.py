"""
AeroTwin-UAV Twin & Simulation Service Manager
=============================================
Coordinates live simulator state, digital twin estimation cycles,
and mission risk calculations for the REST API endpoints.

Software-only research prototype.
"""

from dataclasses import dataclass, field
from typing import Optional, Dict, Any, Tuple, List
import pandas as pd
import numpy as np

from backend.app.simulation import (
    AeroPistonEngineSimulator,
    EngineState,
    FaultType,
    FlightPhase,
    FleetFaultScheduler,
    fleet_fault_scheduler,
    FAULT_COMPONENT_MAPPING
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
from backend.app.schemas import SimulationStartRequest, WhatIfRequest
from backend.app.schemas.uav import UAVState
from backend.app.db.flight_history import flight_history_db


@dataclass
class UAVContext:
    """
    Encapsulates all simulation, digital twin, AI and mission state
    associated with an individual UAV identifier.
    """
    uav_id: str = "UAV-001"
    simulator: Optional[AeroPistonEngineSimulator] = None
    engine_state: Optional[EngineState] = None
    twin_state: Optional[DigitalTwinState] = None
    decision: Optional[MissionDecision] = None
    mission_params: Optional[MissionParameters] = None
    uav_state: Optional[UAVState] = None
    is_manual: bool = False



# =============================================================================
# Standard 5-UAV Fleet Operational & Diagnostic Profiles
# =============================================================================
FLEET_UAV_CONFIGS: Dict[str, Dict[str, Any]] = {
    "UAV-001": {
        "engine_id": "AERO-001",
        "mission_id": "MSN-001",
        "flight_phase": "CRUISE",
        "rpm_target": 2400.0,
        "throttle": 75.0,
        "altitude": 1500.0,
        "ambient_temperature": 22.0,
        "humidity": 45.0,
        "wind_speed": 5.0,
        "mission_duration_hours": 10.0,
        "degradation": 0.04,
        "fault_type": "NORMAL",
        "fault_severity": 0.0,
        "seed": 42,
    },
    "UAV-002": {
        "engine_id": "AERO-002",
        "mission_id": "MSN-002",
        "flight_phase": "CLIMB",
        "rpm_target": 2550.0,
        "throttle": 85.0,
        "altitude": 3200.0,
        "ambient_temperature": 10.0,
        "humidity": 60.0,
        "wind_speed": 9.0,
        "mission_duration_hours": 6.0,
        "degradation": 0.12,
        "fault_type": "NORMAL",
        "fault_severity": 0.0,
        "seed": 102,
    },
    "UAV-003": {
        "engine_id": "AERO-003",
        "mission_id": "MSN-003",
        "flight_phase": "CRUISE",
        "rpm_target": 2350.0,
        "throttle": 72.0,
        "altitude": 1200.0,
        "ambient_temperature": 35.0,
        "humidity": 35.0,
        "wind_speed": 4.0,
        "mission_duration_hours": 8.0,
        "degradation": 0.25,
        "fault_type": "COOLING_PROBLEM",
        "fault_severity": 0.35,
        "seed": 203,
    },
    "UAV-004": {
        "engine_id": "AERO-004",
        "mission_id": "MSN-004",
        "flight_phase": "DESCENT",
        "rpm_target": 1950.0,
        "throttle": 40.0,
        "altitude": 900.0,
        "ambient_temperature": 20.0,
        "humidity": 55.0,
        "wind_speed": 6.0,
        "mission_duration_hours": 4.0,
        "degradation": 0.08,
        "fault_type": "SENSOR_ANOMALY",
        "fault_severity": 0.40,
        "seed": 304,
    },
    "UAV-005": {
        "engine_id": "AERO-005",
        "mission_id": "MSN-005",
        "flight_phase": "CRUISE",
        "rpm_target": 2450.0,
        "throttle": 78.0,
        "altitude": 2200.0,
        "ambient_temperature": 28.0,
        "humidity": 50.0,
        "wind_speed": 7.0,
        "mission_duration_hours": 12.0,
        "degradation": 0.68,
        "fault_type": "LUBRICATION_PROBLEM",
        "fault_severity": 0.60,
        "seed": 405,
    },
}

FLEET_UAV_IDS: List[str] = list(FLEET_UAV_CONFIGS.keys())


class TwinServiceManager:
    """
    Manages in-memory state for active engine simulation, digital twin tracking,
    and mission risk evaluations across API requests for single and multi-UAV fleets.
    """

    def __init__(self):
        self.default_uav_id: str = "UAV-001"
        self.active_manual_uav_id: Optional[str] = None
        self._uav_contexts: Dict[str, UAVContext] = {
            uid: UAVContext(uav_id=uid) for uid in FLEET_UAV_IDS
        }
        self.digital_twin = DigitalTwin()
        self.decision_engine = MissionDecisionEngine()
        self.fault_scheduler = FleetFaultScheduler()



    def _get_or_create_context(self, uav_id: Optional[str] = None) -> UAVContext:
        """Retrieves or initializes the UAVContext for a specific UAV identifier."""
        raw_id = uav_id or self.default_uav_id
        resolved_id = str(raw_id).strip().upper()
        if not resolved_id:
            resolved_id = self.default_uav_id
        if resolved_id not in self._uav_contexts:
            self._uav_contexts[resolved_id] = UAVContext(uav_id=resolved_id)
        return self._uav_contexts[resolved_id]

    # -------------------------------------------------------------------------
    # Backward-compatible property delegates targeting default UAV (UAV-001)
    # -------------------------------------------------------------------------
    @property
    def simulator(self) -> Optional[AeroPistonEngineSimulator]:
        return self._get_or_create_context(self.default_uav_id).simulator

    @simulator.setter
    def simulator(self, value: Optional[AeroPistonEngineSimulator]):
        self._get_or_create_context(self.default_uav_id).simulator = value

    @property
    def current_engine_state(self) -> Optional[EngineState]:
        return self._get_or_create_context(self.default_uav_id).engine_state

    @current_engine_state.setter
    def current_engine_state(self, value: Optional[EngineState]):
        self._get_or_create_context(self.default_uav_id).engine_state = value

    @property
    def current_twin_state(self) -> Optional[DigitalTwinState]:
        return self._get_or_create_context(self.default_uav_id).twin_state

    @current_twin_state.setter
    def current_twin_state(self, value: Optional[DigitalTwinState]):
        self._get_or_create_context(self.default_uav_id).twin_state = value

    @property
    def current_decision(self) -> Optional[MissionDecision]:
        return self._get_or_create_context(self.default_uav_id).decision

    @current_decision.setter
    def current_decision(self, value: Optional[MissionDecision]):
        self._get_or_create_context(self.default_uav_id).decision = value

    @property
    def current_mission_params(self) -> Optional[MissionParameters]:
        return self._get_or_create_context(self.default_uav_id).mission_params

    @current_mission_params.setter
    def current_mission_params(self, value: Optional[MissionParameters]):
        self._get_or_create_context(self.default_uav_id).mission_params = value

    def start_simulation(
        self,
        request: SimulationStartRequest,
        uav_id: Optional[str] = None,
        is_manual: bool = True
    ) -> EngineState:
        """
        Initializes and starts a virtual aero engine simulation for a given UAV.
        Advances the first timestep and synchronizes Digital Twin, Decision Engine, and UAVState.
        Marks the UAV as having authoritative manual simulation state when is_manual is True.
        """
        raw_uav_id = getattr(request, "uav_id", None) or uav_id or self.default_uav_id
        target_uav_id = str(raw_uav_id).strip().upper()
        ctx = self._get_or_create_context(target_uav_id)

        if is_manual:
            ctx.is_manual = True
            self.active_manual_uav_id = target_uav_id

        if ctx.simulator is None:
            ctx.simulator = AeroPistonEngineSimulator(
                engine_id=request.engine_id,
                mission_id=request.mission_id,
                seed=request.seed,
                degradation=request.degradation,
                uav_id=target_uav_id
            )
        else:
            # Preserve existing simulation engine instance across flight phase and parameter updates
            if request.engine_id:
                ctx.simulator.engine_id = request.engine_id
            if request.mission_id:
                ctx.simulator.mission_id = request.mission_id
            if request.degradation is not None:
                ctx.simulator.set_degradation(request.degradation)

        # Configure initial inputs
        ctx.simulator.set_inputs(
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
            ctx.simulator.inject_fault(
                fault_type=request.fault_type,
                severity=request.fault_severity
            )
        else:
            ctx.simulator.clear_fault()

        ctx.mission_params = MissionParameters(
            mission_duration_hours=request.mission_duration_hours,
            altitude=request.altitude,
            ambient_temperature=request.ambient_temperature,
            throttle=request.throttle,
            flight_phase=request.flight_phase
        )

        # Run first discrete step to establish initial telemetry
        ctx.engine_state = ctx.simulator.step(dt=1.0)

        # Synchronize Digital Twin
        ctx.twin_state = self.digital_twin.update(ctx.engine_state)

        # Synchronize Mission Decision Engine
        ctx.decision = self.decision_engine.evaluate(
            twin_state=ctx.twin_state,
            mission_params=ctx.mission_params
        )

        # Synchronize unified UAVState with dynamic fault state
        fault_st = self.fault_scheduler.get_state(target_uav_id)
        if is_manual:
            self.fault_scheduler.set_manual_fault(target_uav_id, request.fault_type, request.fault_severity)
            fault_st = self.fault_scheduler.get_state(target_uav_id)

        ctx.uav_state = UAVState.from_states(
            engine_state=ctx.engine_state,
            twin_state=ctx.twin_state,
            decision=ctx.decision,
            uav_id=target_uav_id,
            fault_state=fault_st
        )

        try:
            flight_history_db.record_telemetry(
                uav_id=target_uav_id,
                telemetry=ctx.uav_state.engine_telemetry,
                flight_phase=ctx.uav_state.flight_phase,
                health_score=ctx.uav_state.engine_health,
                mission_risk=ctx.uav_state.mission_risk,
                timestamp=ctx.uav_state.timestamp,
            )
        except Exception:
            pass

        return ctx.engine_state

    def inject_fault(
        self,
        fault_type: str,
        severity: float = 0.8,
        uav_id: Optional[str] = None,
        degradation: Optional[float] = None,
        target_sensor: Optional[str] = None
    ) -> EngineState:
        """
        Injects or clears an operational fault for the specified or active manual UAV.
        Ensures the UAV simulation is initialized, marks it as authoritative manual state,
        applies the fault to AeroPistonEngineSimulator, advances a step to compute physical effects,
        and synchronizes the Digital Twin, Mission Decision Engine, and unified UAVState.
        """
        raw_uav_id = uav_id or self.active_manual_uav_id or self.default_uav_id
        target_uav_id = str(raw_uav_id).strip().upper()
        ctx = self._get_or_create_context(target_uav_id)
        if ctx.simulator is None or ctx.engine_state is None:
            self.ensure_simulation(uav_id=target_uav_id)
            ctx = self._get_or_create_context(target_uav_id)

        ctx.is_manual = True
        self.active_manual_uav_id = target_uav_id

        clean_fault = str(fault_type).strip().upper()
        if clean_fault == "NORMAL" or severity <= 0.0:
            ctx.simulator.clear_fault()
        else:
            ctx.simulator.inject_fault(
                fault_type=clean_fault,
                severity=severity,
                target_sensor=target_sensor
            )

        if degradation is not None:
            ctx.simulator.set_degradation(degradation)

        # Advance one discrete step to apply fault perturbations immediately
        ctx.engine_state = ctx.simulator.step(dt=1.0)

        # Synchronize Digital Twin
        ctx.twin_state = self.digital_twin.update(ctx.engine_state)

        # Synchronize Mission Decision Engine
        params = ctx.mission_params or MissionParameters(
            mission_duration_hours=10.0,
            altitude=ctx.engine_state.altitude,
            ambient_temperature=ctx.engine_state.ambient_temperature,
            throttle=ctx.engine_state.throttle,
            flight_phase=ctx.engine_state.flight_phase
        )
        ctx.decision = self.decision_engine.evaluate(
            twin_state=ctx.twin_state,
            mission_params=params
        )

        # Synchronize unified UAVState with manual fault state
        fault_st = self.fault_scheduler.set_manual_fault(target_uav_id, clean_fault, severity, target_sensor)
        ctx.uav_state = UAVState.from_states(
            engine_state=ctx.engine_state,
            twin_state=ctx.twin_state,
            decision=ctx.decision,
            uav_id=target_uav_id,
            fault_state=fault_st
        )

        try:
            flight_history_db.record_telemetry(
                uav_id=target_uav_id,
                telemetry=ctx.uav_state.engine_telemetry,
                flight_phase=ctx.uav_state.flight_phase,
                health_score=ctx.uav_state.engine_health,
                mission_risk=ctx.uav_state.mission_risk,
                timestamp=ctx.uav_state.timestamp,
            )
        except Exception:
            pass

        return ctx.engine_state

    def get_current_simulation(self, uav_id: Optional[str] = None) -> Optional[EngineState]:
        """Returns the latest simulator telemetry state if an active simulation exists for uav_id."""
        target_id = str(uav_id or self.active_manual_uav_id or self.default_uav_id).strip().upper()
        ctx = self._uav_contexts.get(target_id)
        return ctx.engine_state if ctx else None

    def get_digital_twin_state(self, uav_id: Optional[str] = None) -> Optional[DigitalTwinState]:
        """Returns the latest Digital Twin state for uav_id."""
        target_id = str(uav_id or self.active_manual_uav_id or self.default_uav_id).strip().upper()
        ctx = self._uav_contexts.get(target_id)
        return ctx.twin_state if ctx else None

    def get_mission_decision(
        self,
        duration_hours: Optional[float] = None,
        altitude: Optional[float] = None,
        ambient_temp: Optional[float] = None,
        throttle: Optional[float] = None,
        uav_id: str = "UAV-001"
    ) -> Optional[MissionDecision]:
        """
        Returns mission risk decision for uav_id. If override parameters are provided,
        performs dynamic evaluation without altering stored telemetry.
        """
        target_id = str(uav_id or "UAV-001").strip().upper()
        if target_id in FLEET_UAV_IDS:
            self.ensure_simulation(uav_id=target_id)
        ctx = self._uav_contexts.get(target_id)
        if ctx is None or ctx.twin_state is None:
            return None

        params = ctx.mission_params or MissionParameters()
        if any(v is not None for v in [duration_hours, altitude, ambient_temp, throttle]):
            params = MissionParameters(
                mission_duration_hours=duration_hours if duration_hours is not None else params.mission_duration_hours,
                altitude=altitude if altitude is not None else params.altitude,
                ambient_temperature=ambient_temp if ambient_temp is not None else params.ambient_temperature,
                throttle=throttle if throttle is not None else params.throttle,
                flight_phase=params.flight_phase
            )

        return self.decision_engine.evaluate(ctx.twin_state, params)

    def get_uav_state(self, uav_id: str = "UAV-001") -> Optional[UAVState]:
        """
        Returns the unified UAVState for the specified uav_id.
        Constructs dynamically from component states if not already cached.
        """
        # If it's a known fleet UAV, ensure its simulation exists
        if uav_id in FLEET_UAV_IDS:
            ctx = self._get_or_create_context(uav_id)
            if ctx.simulator is None or ctx.engine_state is None:
                self.ensure_simulation(uav_id=uav_id)
            elif not ctx.is_manual:
                if self.fault_scheduler.check_wall_clock(uav_id):
                    fault_st = self.fault_scheduler.get_state(uav_id)
                    if fault_st.fault_type == "NORMAL":
                        ctx.simulator.clear_fault()
                    else:
                        ctx.simulator.inject_fault(
                            fault_type=fault_st.fault_type,
                            severity=fault_st.severity,
                            target_sensor=fault_st.target_sensor
                        )
                    ctx.engine_state = ctx.simulator.step(dt=1.0)
                    ctx.twin_state = self.digital_twin.update(ctx.engine_state)
                    params = ctx.mission_params or MissionParameters(
                        mission_duration_hours=10.0,
                        altitude=ctx.engine_state.altitude,
                        ambient_temperature=ctx.engine_state.ambient_temperature,
                        throttle=ctx.engine_state.throttle,
                        flight_phase=ctx.engine_state.flight_phase
                    )
                    ctx.decision = self.decision_engine.evaluate(ctx.twin_state, params)
                    ctx.uav_state = UAVState.from_states(
                        engine_state=ctx.engine_state,
                        twin_state=ctx.twin_state,
                        decision=ctx.decision,
                        uav_id=uav_id,
                        fault_state=fault_st
                    )
        elif uav_id not in self._uav_contexts:
            return None

        ctx = self._uav_contexts.get(uav_id)
        if ctx is None or ctx.simulator is None or ctx.engine_state is None:
            return None

        if ctx.uav_state is None and ctx.engine_state is not None:
            fault_st = self.fault_scheduler.get_state(uav_id)
            ctx.uav_state = UAVState.from_states(
                engine_state=ctx.engine_state,
                twin_state=ctx.twin_state,
                decision=ctx.decision,
                uav_id=uav_id,
                fault_state=fault_st
            )
        return ctx.uav_state


    def ensure_fleet_simulation(self) -> None:
        """
        Ensures all 5 fleet UAV simulations are initialized with their designated profiles,
        preserving any UAV currently under authoritative manual simulation.
        """
        for uid in FLEET_UAV_IDS:
            ctx = self._get_or_create_context(uid)
            if not ctx.is_manual or ctx.engine_state is None:
                self.ensure_simulation(uav_id=uid)

    def list_uav_ids(self) -> List[str]:
        """Returns the list of all registered or active fleet UAV identifiers."""
        self.ensure_fleet_simulation()
        return list(FLEET_UAV_IDS)

    def get_all_uav_states(self) -> Dict[str, UAVState]:
        """Returns a mapping of uav_id -> UAVState for all 5 fleet UAVs."""
        self.ensure_fleet_simulation()
        states: Dict[str, UAVState] = {}
        for uid in FLEET_UAV_IDS:
            st = self.get_uav_state(uid)
            if st is not None:
                states[uid] = st
        return states

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
        seed: int = 42,
        uav_id: str = "UAV-001"
    ) -> EngineState:
        """
        Ensures an active simulation exists for uav_id. If not, initializes with
        the designated fleet profile or default parameters.
        Preserves active manual simulation state without overwriting with fleet defaults.
        """
        raw_id = uav_id or self.default_uav_id
        target_uav_id = str(raw_id).strip().upper()
        ctx = self._get_or_create_context(target_uav_id)
        if ctx.is_manual and ctx.engine_state is not None:
            return ctx.engine_state
        if ctx.simulator is None or ctx.engine_state is None:
            cfg = FLEET_UAV_CONFIGS.get(target_uav_id, {})
            fault_st = self.fault_scheduler.get_state(target_uav_id)
            default_req = SimulationStartRequest(
                uav_id=target_uav_id,
                engine_id=cfg.get("engine_id", engine_id),
                mission_id=cfg.get("mission_id", mission_id),
                rpm_target=cfg.get("rpm_target", 2400.0),
                throttle=cfg.get("throttle", 75.0),
                altitude=cfg.get("altitude", 1500.0),
                ambient_temperature=cfg.get("ambient_temperature", 25.0),
                humidity=cfg.get("humidity", 45.0),
                wind_speed=cfg.get("wind_speed", 5.0),
                mission_duration_hours=cfg.get("mission_duration_hours", 10.0),
                flight_phase=cfg.get("flight_phase", flight_phase),
                degradation=cfg.get("degradation", 0.05),
                fault_type=fault_st.fault_type,
                fault_severity=fault_st.severity,
                seed=cfg.get("seed", seed)
            )
            return self.start_simulation(default_req, uav_id=target_uav_id, is_manual=False)
        return ctx.engine_state

    def step_fleet_simulation(self, dt: float = 1.0) -> Dict[str, UAVState]:
        """
        Advances all 5 UAV simulations by dt seconds, updates their digital twins,
        AI predictions, and mission risk, returning a mapping of uav_id -> UAVState.
        """
        self.ensure_fleet_simulation()
        states: Dict[str, UAVState] = {}
        for uav_id in FLEET_UAV_IDS:
            ctx = self._get_or_create_context(uav_id)
            if ctx.simulator is not None and ctx.engine_state is not None:
                fault_st = self.fault_scheduler.get_state(uav_id)
                if not ctx.is_manual:
                    transitioned = self.fault_scheduler.advance_time(uav_id, dt=dt)
                    if transitioned:
                        fault_st = self.fault_scheduler.get_state(uav_id)
                        if fault_st.fault_type == "NORMAL":
                            ctx.simulator.clear_fault()
                        else:
                            ctx.simulator.inject_fault(
                                fault_type=fault_st.fault_type,
                                severity=fault_st.severity,
                                target_sensor=fault_st.target_sensor
                            )

                # 1. Advance simulator (uses manual inputs if manual, or fleet profile if not)
                ctx.engine_state = ctx.simulator.step(dt=dt)

                # 2. Update Digital Twin
                ctx.twin_state = self.digital_twin.update(ctx.engine_state)

                # 3. Calculate Mission Risk
                params = ctx.mission_params or MissionParameters(
                    mission_duration_hours=10.0,
                    altitude=ctx.engine_state.altitude,
                    ambient_temperature=ctx.engine_state.ambient_temperature,
                    throttle=ctx.engine_state.throttle,
                    flight_phase=ctx.engine_state.flight_phase
                )
                ctx.decision = self.decision_engine.evaluate(
                    twin_state=ctx.twin_state,
                    mission_params=params
                )

                # 4. Synchronize unified UAVState with dynamic fault state
                ctx.uav_state = UAVState.from_states(
                    engine_state=ctx.engine_state,
                    twin_state=ctx.twin_state,
                    decision=ctx.decision,
                    uav_id=uav_id,
                    fault_state=fault_st
                )
                states[uav_id] = ctx.uav_state

                try:
                    flight_history_db.record_telemetry(
                        uav_id=uav_id,
                        telemetry=ctx.uav_state.engine_telemetry,
                        flight_phase=ctx.uav_state.flight_phase,
                        health_score=ctx.uav_state.engine_health,
                        mission_risk=ctx.uav_state.mission_risk,
                        timestamp=ctx.uav_state.timestamp,
                    )
                except Exception:
                    pass
        return states


    def step_simulation(self, dt: float = 1.0, uav_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Advances the virtual engine simulation for all fleet UAVs by dt seconds.
        For UAVs with active manual simulations, advances their authoritative manual simulation.
        For other UAVs, advances their fleet simulation.
        Returns a verified, numerically safe telemetry dictionary for streaming uav_id.
        """
        # Advance all 5 fleet UAVs together
        self.step_fleet_simulation(dt=dt)
        target_id = str(uav_id or self.active_manual_uav_id or self.default_uav_id).strip().upper()
        return self.build_telemetry_packet(uav_id=target_id)

    def build_telemetry_packet(self, uav_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Constructs a complete, validated, JSON-serializable telemetry and analysis packet for uav_id.
        Guarantees:
        - No NaN or Infinity
        - RUL >= 0
        - Health & Fitness in [0, 100]
        - Anomaly score in [0, 1]
        - Probabilities in [0, 1]
        - Preserves all single-UAV legacy dashboard fields
        - Includes clean unified UAVState
        """
        target_id = str(uav_id or self.active_manual_uav_id or self.default_uav_id).strip().upper()
        ctx = self._get_or_create_context(target_id)
        if (
            ctx.engine_state is None
            or ctx.twin_state is None
            or ctx.decision is None
        ):
            self.ensure_simulation(uav_id=target_id)
            ctx = self._get_or_create_context(target_id)
        if (
            ctx.engine_state is None
            or ctx.twin_state is None
            or ctx.decision is None
        ):
            raise RuntimeError(f"Simulation state is not initialized for {target_id}.")

        # Telemetry channels
        telemetry_dict = {
            "rpm": round(float(ctx.engine_state.rpm), 1),
            "throttle": round(float(ctx.engine_state.throttle), 1),
            "altitude": round(float(ctx.engine_state.altitude), 1),
            "ambient_temperature": round(float(ctx.engine_state.ambient_temperature), 1),
            "humidity": round(float(ctx.engine_state.humidity), 1),
            "wind_speed": round(float(ctx.engine_state.wind_speed), 1),
            "cht": round(float(ctx.engine_state.cht), 2),
            "egt": round(float(ctx.engine_state.egt), 2),
            "oil_pressure": round(float(ctx.engine_state.oil_pressure), 2),
            "oil_temperature": round(float(ctx.engine_state.oil_temperature), 2),
            "vibration": round(float(ctx.engine_state.vibration), 3),
            "fuel_flow": round(float(ctx.engine_state.fuel_flow), 2),
            "engine_load": round(float(ctx.engine_state.engine_load), 1),
        }

        # Expected telemetry from Digital Twin
        expected_telemetry = {
            k: round(float(v), 2)
            for k, v in ctx.twin_state.expected_telemetry.items()
        }

        # Deviations from Digital Twin
        deviations = {
            k: (v.to_dict() if hasattr(v, "to_dict") else v)
            for k, v in ctx.twin_state.deviations.items()
        }

        # Digital Twin section
        digital_twin_dict = {
            "expected_telemetry": expected_telemetry,
            "deviations": deviations,
            "engine_health": round(float(np.clip(ctx.twin_state.engine_health, 0.0, 100.0)), 1),
            "engine_fitness_score": round(float(np.clip(ctx.twin_state.engine_fitness_score, 0.0, 100.0)), 1),
            "overall_status": str(ctx.twin_state.overall_status),
        }

        # AI section
        fault_probabilities = {
            cls_name: round(float(np.clip(prob, 0.0, 1.0)), 4)
            for cls_name, prob in ctx.twin_state.fault_probabilities.items()
        }
        fault_st = self.fault_scheduler.get_state(target_id)
        effective_fault = fault_st.fault_type if fault_st.fault_type != "NORMAL" else str(ctx.twin_state.predicted_fault)
        ai_dict = {
            "predicted_fault": effective_fault,
            "fault_type": fault_st.fault_type,
            "severity": fault_st.severity,
            "affected_component": fault_st.affected_component,
            "status": fault_st.status,
            "fault_start_time": fault_st.fault_start_time,
            "fault_duration": fault_st.fault_duration,
            "next_fault_change": fault_st.next_fault_change,
            "fault_probabilities": fault_probabilities,
            "anomaly_status": "WARNING" if fault_st.fault_type == "SENSOR_ANOMALY" else ("ANOMALOUS" if fault_st.fault_type != "NORMAL" else str(ctx.twin_state.anomaly_status)),
            "anomaly_score": 0.75 if fault_st.fault_type not in ["NORMAL", "SENSOR_ANOMALY"] else (0.40 if fault_st.fault_type == "SENSOR_ANOMALY" else round(float(np.clip(ctx.twin_state.anomaly_score, 0.0, 1.0)), 4)),
            "predicted_rul_hours": round(float(max(0.0, ctx.twin_state.predicted_rul_hours)), 1),
        }

        # Mission section
        mission_dict = {
            "mission_reliability_score": round(float(np.clip(ctx.decision.mission_reliability_score, 0.0, 100.0)), 1),
            "mission_risk": str(ctx.decision.mission_risk),
            "mission_recommendation": str(ctx.decision.mission_recommendation),
            "reason_codes": [str(rc) for rc in ctx.decision.reason_codes],
        }

        # Unified UAV state
        uav_state = ctx.uav_state or UAVState.from_states(
            engine_state=ctx.engine_state,
            twin_state=ctx.twin_state,
            decision=ctx.decision,
            uav_id=uav_id,
            fault_state=fault_st
        )
        ctx.uav_state = uav_state


        packet = {
            "type": "telemetry",
            "uav_id": str(uav_id),
            "timestamp": str(ctx.engine_state.timestamp),
            "engine_id": str(ctx.engine_state.engine_id),
            "mission_id": str(ctx.engine_state.mission_id),
            "flight_phase": str(ctx.engine_state.flight_phase),
            "telemetry": telemetry_dict,
            "digital_twin": digital_twin_dict,
            "ai": ai_dict,
            "mission": mission_dict,
            "uav_state": uav_state.to_dict(),
        }

        # Deep validation: ensure no NaN or Infinity exists anywhere
        self._validate_numerical_safety(packet)

        return packet

    def evaluate_what_if(self, request: Any) -> Dict[str, Any]:
        """
        Evaluates a What-If flight scenario using an isolated AeroPistonEngineSimulator instance,
        passing results through the existing Digital Twin physics and Decision Engine models.

        Guaranteed complete isolation: does NOT modify live UAV telemetry, fleet state,
        RTB state, or fault injection schedules.
        """
        alt_ft = float(getattr(request, "altitude", 18000.0))
        alt_m = alt_ft * 0.3048  # feet to meters
        ambient_delta = float(getattr(request, "ambientDelta", getattr(request, "ambient_temperature_delta", 15.0)))
        ambient_temp = 15.0 + ambient_delta
        throttle = float(getattr(request, "throttle", 85.0))
        injector_drift = float(getattr(request, "injectorDrift", getattr(request, "injector_drift", 0.0)))
        uav_id = str(getattr(request, "uav_id", "UAV-001") or "UAV-001").strip().upper()
        flight_phase = str(getattr(request, "flight_phase", "CRUISE") or "CRUISE").strip().upper()
        duration_hours = float(getattr(request, "mission_duration_hours", 2.0) or 2.0)

        rpm_target = 1000.0 + (throttle / 100.0) * 1700.0

        # Isolated simulator instance
        whatif_sim = AeroPistonEngineSimulator(
            engine_id=f"WHATIF-{uav_id}",
            mission_id="WHATIF-MISSION",
            seed=42,
            degradation=0.05,
            uav_id="WHATIF"
        )
        whatif_sim.set_inputs(
            rpm_target=rpm_target,
            throttle=throttle,
            altitude=alt_m,
            ambient_temperature=ambient_temp,
            humidity=45.0,
            wind_speed=5.0,
            mission_duration=duration_hours,
            flight_phase=flight_phase
        )

        if injector_drift > 0.01:
            severity = min(1.0, injector_drift / 30.0)
            whatif_sim.inject_fault(fault_type="INJECTOR_ABNORMALITY", severity=severity)
        else:
            whatif_sim.clear_fault()

        # Step through stabilization steps for thermal equilibrium
        sim_state = None
        for _ in range(10):
            sim_state = whatif_sim.step(dt=1.0)

        # Evaluate using existing Digital Twin
        twin_state = self.digital_twin.update(sim_state)

        # Evaluate using existing Decision Engine
        mission_params = MissionParameters(
            mission_duration_hours=duration_hours,
            altitude=alt_m,
            ambient_temperature=ambient_temp,
            throttle=throttle,
            flight_phase=flight_phase
        )
        decision = self.decision_engine.evaluate(twin_state=twin_state, mission_params=mission_params)

        peak_cht = round(float(sim_state.cht), 1)
        peak_egt = round(float(sim_state.egt), 1)
        survival_prob = round(float(np.clip(decision.mission_reliability_score, 0.0, 100.0)), 1)

        # Thermal margin relative to typical boundaries (135 C CHT, 880 C EGT)
        cht_penalty = max(0.0, (peak_cht - 100.0) / 35.0 * 50.0)
        egt_penalty = max(0.0, (peak_egt - 700.0) / 180.0 * 50.0)
        thermal_margin = round(float(np.clip(100.0 - (cht_penalty + egt_penalty), 0.0, 100.0)), 1)

        risk_level = str(decision.mission_risk)

        from datetime import datetime, timezone
        now_str = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")

        result = {
            "is_what_if": True,
            "status_tag": "WHAT-IF / SIMULATED RESULT",
            "uav_id": uav_id,
            "scenario_inputs": {
                "altitude_ft": alt_ft,
                "altitude_m": round(alt_m, 1),
                "ambient_delta": ambient_delta,
                "ambient_temperature": round(ambient_temp, 1),
                "throttle": throttle,
                "injector_drift": injector_drift,
                "flight_phase": flight_phase,
                "mission_duration_hours": duration_hours
            },
            "peakCht": peak_cht,
            "peakEgt": peak_egt,
            "survivalProb": survival_prob,
            "thermalMargin": thermal_margin,
            "riskLevel": risk_level,
            "engine_health": round(float(np.clip(twin_state.engine_health, 0.0, 100.0)), 1),
            "engine_fitness_score": round(float(np.clip(twin_state.engine_fitness_score, 0.0, 100.0)), 1),
            "predicted_fault": str(twin_state.predicted_fault),
            "predicted_rul_hours": round(float(max(0.0, twin_state.predicted_rul_hours)), 1),
            "anomaly_status": str(twin_state.anomaly_status),
            "anomaly_score": round(float(np.clip(twin_state.anomaly_score, 0.0, 1.0)), 4),
            "mission_recommendation": str(decision.mission_recommendation),
            "reason_codes": [str(rc) for rc in decision.reason_codes],
            "explanation": decision.explanation,
            "timestamp": now_str
        }

        self._validate_numerical_safety(result)
        return result

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
