"""
AeroTwin-UAV Dynamic UAV Fault Simulation Engine
================================================
Manages independent, time-stable, transitioning fault states for each UAV.
Provides physics-consistent telemetry perturbation configurations,
independent transition timers (20-40s), and component mappings.

Software-only research prototype.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
import time
import random

SUPPORTED_FAULT_STATES: List[str] = [
    "NORMAL",
    "SENSOR_ANOMALY",
    "COOLING_PROBLEM",
    "LUBRICATION_PROBLEM",
    "MISFIRE",
    "INJECTOR_ABNORMALITY"
]

FAULT_COMPONENT_MAPPING: Dict[str, Dict[str, Any]] = {
    "NORMAL": {
        "label": "ENGINE NORMAL / HEALTHY",
        "affected_component": "No affected component",
        "status": "HEALTHY",
        "default_severity": 0.0,
        "target_sensor": None,
    },
    "SENSOR_ANOMALY": {
        "label": "Sensor / Telemetry",
        "affected_component": "Telemetry Sensor",
        "status": "WARNING",
        "default_severity": 0.40,
        "target_sensor": "cht",
    },
    "COOLING_PROBLEM": {
        "label": "Cylinder Heads / Cooling",
        "affected_component": "Cylinder Heads / Cooling Fins",
        "status": "FAULT",
        "default_severity": 0.55,
        "target_sensor": None,
    },
    "LUBRICATION_PROBLEM": {
        "label": "Oil Pump / Oil System",
        "affected_component": "Oil Pump / Oil Sump",
        "status": "FAULT",
        "default_severity": 0.65,
        "target_sensor": None,
    },
    "MISFIRE": {
        "label": "Spark Plug / Cylinder",
        "affected_component": "Spark Plug / Cylinder 2",
        "status": "FAULT",
        "default_severity": 0.58,
        "target_sensor": None,
    },
    "INJECTOR_ABNORMALITY": {
        "label": "Fuel Injector",
        "affected_component": "Fuel Injector",
        "status": "FAULT",
        "default_severity": 0.50,
        "target_sensor": None,
    },
}

INITIAL_UAV_SEQUENCES: Dict[str, List[str]] = {
    "UAV-001": ["NORMAL", "SENSOR_ANOMALY", "NORMAL", "MISFIRE", "COOLING_PROBLEM"],
    "UAV-002": ["COOLING_PROBLEM", "NORMAL", "LUBRICATION_PROBLEM", "SENSOR_ANOMALY", "NORMAL"],
    "UAV-003": ["MISFIRE", "INJECTOR_ABNORMALITY", "NORMAL", "COOLING_PROBLEM", "LUBRICATION_PROBLEM"],
    "UAV-004": ["NORMAL", "COOLING_PROBLEM", "NORMAL", "SENSOR_ANOMALY", "INJECTOR_ABNORMALITY"],
    "UAV-005": ["LUBRICATION_PROBLEM", "NORMAL", "MISFIRE", "INJECTOR_ABNORMALITY", "NORMAL"],
}

# Staggered initial durations (20 - 35s) so transitions are desynchronized
INITIAL_DURATIONS: Dict[str, float] = {
    "UAV-001": 25.0,
    "UAV-002": 30.0,
    "UAV-003": 28.0,
    "UAV-004": 35.0,
    "UAV-005": 26.0,
}


@dataclass
class UAVDynamicFaultState:
    """
    Tracks the active dynamic fault state for an individual UAV.
    """
    uav_id: str = "UAV-001"
    fault_type: str = "NORMAL"
    severity: float = 0.0
    affected_component: str = "No affected component"
    status: str = "HEALTHY"
    fault_start_time: float = field(default_factory=time.time)
    fault_duration: float = 30.0
    next_fault_change: float = 30.0
    target_sensor: Optional[str] = None
    seq_index: int = 0
    sim_elapsed: float = 0.0
    sim_next_change: float = 30.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "uav_id": self.uav_id,
            "fault_type": self.fault_type,
            "severity": round(float(self.severity), 2),
            "affected_component": self.affected_component,
            "status": self.status,
            "fault_start_time": round(float(self.fault_start_time), 2),
            "fault_duration": round(float(self.fault_duration), 2),
            "next_fault_change": round(float(self.next_fault_change), 2),
        }


class FleetFaultScheduler:
    """
    Maintains independent dynamic fault states and progression timers for all UAVs.
    """

    def __init__(self, uav_ids: Optional[List[str]] = None):
        target_ids = uav_ids or ["UAV-001", "UAV-002", "UAV-003", "UAV-004", "UAV-005"]
        self._states: Dict[str, UAVDynamicFaultState] = {}
        now = time.time()

        for uid in target_ids:
            seq = INITIAL_UAV_SEQUENCES.get(uid, ["NORMAL", "COOLING_PROBLEM", "NORMAL"])
            first_fault = seq[0]
            mapping = FAULT_COMPONENT_MAPPING.get(first_fault, FAULT_COMPONENT_MAPPING["NORMAL"])
            dur = INITIAL_DURATIONS.get(uid, random.uniform(22.0, 32.0))

            self._states[uid] = UAVDynamicFaultState(
                uav_id=uid,
                fault_type=first_fault,
                severity=mapping["default_severity"],
                affected_component=mapping["affected_component"],
                status=mapping["status"],
                fault_start_time=now,
                fault_duration=dur,
                next_fault_change=now + dur,
                target_sensor=mapping.get("target_sensor"),
                seq_index=0,
                sim_elapsed=0.0,
                sim_next_change=dur
            )

    def get_state(self, uav_id: str) -> UAVDynamicFaultState:
        """Retrieves or creates dynamic fault state for uav_id."""
        clean_id = str(uav_id).strip().upper()
        if clean_id not in self._states:
            mapping = FAULT_COMPONENT_MAPPING["NORMAL"]
            now = time.time()
            dur = 30.0
            self._states[clean_id] = UAVDynamicFaultState(
                uav_id=clean_id,
                fault_type="NORMAL",
                severity=0.0,
                affected_component=mapping["affected_component"],
                status=mapping["status"],
                fault_start_time=now,
                fault_duration=dur,
                next_fault_change=now + dur,
                target_sensor=None,
                seq_index=0,
                sim_elapsed=0.0,
                sim_next_change=dur
            )
        return self._states[clean_id]

    def advance_time(self, uav_id: str, dt: float = 1.0) -> bool:
        """
        Advances the simulation clock by dt seconds for uav_id.
        Transitions state if interval has expired.
        Returns True if a state transition occurred.
        """
        st = self.get_state(uav_id)
        st.sim_elapsed += dt
        now = time.time()

        # Trigger if either simulated elapsed time reached target OR wall-clock time reached target
        if st.sim_elapsed >= st.sim_next_change or now >= st.next_fault_change:
            self.transition(uav_id)
            return True
        return False

    def check_wall_clock(self, uav_id: str) -> bool:
        """Checks whether wall-clock duration has expired and transitions if so."""
        st = self.get_state(uav_id)
        now = time.time()
        if now >= st.next_fault_change:
            self.transition(uav_id)
            return True
        return False

    def transition(self, uav_id: str) -> UAVDynamicFaultState:
        """
        Transitions uav_id to the next state according to the guided sequence or
        weighted transition matrix, ensuring independent states and avoiding immediate repeats.
        """
        st = self.get_state(uav_id)
        seq = INITIAL_UAV_SEQUENCES.get(uav_id)

        next_fault = "NORMAL"
        if seq and (st.seq_index + 1) < len(seq):
            st.seq_index += 1
            next_fault = seq[st.seq_index]
        else:
            # Beyond guided sequence: pick next state
            # Ensure NORMAL appears with good probability (40%), otherwise pick another fault class
            current_fault = st.fault_type
            available_faults = [f for f in SUPPORTED_FAULT_STATES if f != current_fault]

            if current_fault != "NORMAL" and random.random() < 0.45:
                next_fault = "NORMAL"
            else:
                non_normal = [f for f in available_faults if f != "NORMAL"]
                next_fault = random.choice(non_normal if non_normal else SUPPORTED_FAULT_STATES)

        mapping = FAULT_COMPONENT_MAPPING.get(next_fault, FAULT_COMPONENT_MAPPING["NORMAL"])
        now = time.time()
        # Duration between 20 and 38 seconds
        new_duration = round(random.uniform(22.0, 36.0), 1)

        st.fault_type = next_fault
        st.severity = mapping["default_severity"]
        st.affected_component = mapping["affected_component"]
        st.status = mapping["status"]
        st.fault_start_time = now
        st.fault_duration = new_duration
        st.next_fault_change = now + new_duration
        st.target_sensor = mapping.get("target_sensor")
        st.sim_next_change = st.sim_elapsed + new_duration

        return st

    def set_manual_fault(
        self,
        uav_id: str,
        fault_type: str,
        severity: float = 0.6,
        target_sensor: Optional[str] = None
    ) -> UAVDynamicFaultState:
        """Manually injects or overrides a fault for uav_id."""
        st = self.get_state(uav_id)
        clean_fault = str(fault_type).strip().upper()
        mapping = FAULT_COMPONENT_MAPPING.get(clean_fault, FAULT_COMPONENT_MAPPING["NORMAL"])
        now = time.time()
        dur = 60.0

        st.fault_type = clean_fault
        st.severity = severity if clean_fault != "NORMAL" else 0.0
        st.affected_component = mapping["affected_component"]
        st.status = mapping["status"]
        st.fault_start_time = now
        st.fault_duration = dur
        st.next_fault_change = now + dur
        st.target_sensor = target_sensor or mapping.get("target_sensor")
        st.sim_next_change = st.sim_elapsed + dur

        return st


# Global singleton fleet fault scheduler
fleet_fault_scheduler = FleetFaultScheduler()
