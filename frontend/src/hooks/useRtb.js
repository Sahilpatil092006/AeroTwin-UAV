import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { rtbApi } from '../services/api';

const CRITICAL_FAULT_TYPES = new Set([
  'LUBRICATION_PROBLEM',
  'COOLING_PROBLEM',
  'MISFIRE',
  'INJECTOR_ABNORMALITY',
  'TURBOCHARGER_DEGRADATION',
]);

function isCriticalFault(fault) {
  if (!fault) return false;
  const clean = String(fault).trim().toUpperCase();
  if (['NORMAL', 'NONE', 'SENSOR_ANOMALY', ''].includes(clean)) return false;
  return CRITICAL_FAULT_TYPES.has(clean) || (!['NORMAL', 'NONE', 'SENSOR_ANOMALY', ''].includes(clean));
}

// ── Shared RTB Completion Registry (RTB-05) ──────────────────────────────────
// Tracks completed RTB state per UAV ID so simulation arrival at Home Base
// is recognized across both /uav-tracking and /dashboard.
const completedRtbMap = new Map();
const completionListeners = new Set();

// ── Shared Simulated Manual RTB Command Registry (RTB-06) ─────────────────────
// Allows operator to command simulated RTB for demonstration / decision support.
// Integrates directly with the EXISTING RTB route, movement, and completion logic.
const simulatedManualRtbMap = new Map();
const manualRtbListeners = new Set();

export function commandSimulatedRtb(uavId) {
  if (!uavId) return;
  const cleanId = String(uavId).trim().toUpperCase();
  simulatedManualRtbMap.set(cleanId, {
    active: true,
    timestamp: new Date().toISOString(),
    reason: 'OPERATOR SIMULATION COMMAND (DECISION-SUPPORT DEMO)',
  });
  manualRtbListeners.forEach((fn) => {
    try {
      fn(cleanId, true);
    } catch (e) {
      // Ignore listener error
    }
  });
}

export function isSimulatedRtbActive(uavId) {
  if (!uavId) return false;
  return simulatedManualRtbMap.has(String(uavId).trim().toUpperCase());
}

export function clearSimulatedRtb(uavId) {
  if (!uavId) {
    simulatedManualRtbMap.clear();
  } else {
    simulatedManualRtbMap.delete(String(uavId).trim().toUpperCase());
  }
  manualRtbListeners.forEach((fn) => {
    try {
      fn(uavId || 'ALL', false);
    } catch (e) {
      // Ignore listener error
    }
  });
}

export function setUavRtbCompleted(uavId, completed = true) {
  if (!uavId) return;
  const cleanId = String(uavId).trim().toUpperCase();
  if (completed) {
    completedRtbMap.set(cleanId, {
      completed: true,
      timestamp: new Date().toISOString(),
      destination: 'HOME_BASE',
    });
    // Clear simulated command once completed
    simulatedManualRtbMap.delete(cleanId);
  } else {
    completedRtbMap.delete(cleanId);
  }
  completionListeners.forEach((fn) => {
    try {
      fn(cleanId, completed);
    } catch (e) {
      // Ignore listener error
    }
  });
}

export function isUavRtbCompleted(uavId) {
  if (!uavId) return false;
  return completedRtbMap.has(String(uavId).trim().toUpperCase());
}

export function clearUavRtbCompleted(uavId) {
  if (!uavId) {
    completedRtbMap.clear();
    simulatedManualRtbMap.clear();
  } else {
    const cleanId = String(uavId).trim().toUpperCase();
    completedRtbMap.delete(cleanId);
    simulatedManualRtbMap.delete(cleanId);
  }
  completionListeners.forEach((fn) => {
    try {
      fn(uavId || 'ALL', false);
    } catch (e) {}
  });
}


/**
 * Evaluates the 5 deterministic RTB-01 decision engine conditions against a UAV state:
 * 1. Engine Health < 30%
 * 2. Oil Pressure < 1.0 bar
 * 3. CHT > 145°C
 * 4. Vibration > 6g
 * 5. Mission Risk = HIGH AND a critical fault is present
 *
 * RTB-05: If the UAV has arrived at Home Base, status is COMPLETE and rtb_active is false.
 */
export function deriveRtbFromUavState(uavState) {
  if (!uavState) return null;

  const uavId = String(uavState.uav_id || 'UNKNOWN').trim().toUpperCase();
  const rawHealth = uavState.engine_health !== undefined ? Number(uavState.engine_health) : 100.0;
  const tel = uavState.engine_telemetry || {};
  const oilPressure = tel.oil_pressure !== undefined ? Number(tel.oil_pressure) : Number(uavState.oil_pressure ?? 2.8);
  const cht = tel.cht !== undefined ? Number(tel.cht) : Number(uavState.cht ?? 105.0);
  const vibration = tel.vibration !== undefined ? Number(tel.vibration) : Number(uavState.vibration ?? 2.4);
  const missionRisk = String(uavState.mission_risk || 'LOW').trim().toUpperCase();
  const predictedFault = String(uavState.fault_type || uavState.predicted_fault || 'NORMAL').trim().toUpperCase();

  const reasons = [];

  // 1. Engine Health < 30%
  if (rawHealth < 30.0) {
    reasons.push(`Engine Health < 30% (${rawHealth.toFixed(1)}%)`);
  }

  // 2. Oil Pressure < 1.0 bar
  if (oilPressure < 1.0) {
    reasons.push(`Oil Pressure < 1.0 bar (${oilPressure.toFixed(2)} bar)`);
  }

  // 3. CHT > 145°C
  if (cht > 145.0) {
    reasons.push(`CHT > 145°C (${cht.toFixed(1)}°C)`);
  }

  // 4. Vibration > 6g
  if (vibration > 6.0) {
    reasons.push(`Vibration > 6g (${vibration.toFixed(2)}g)`);
  }

  // 5. Mission Risk = HIGH AND a critical fault is present
  if ((missionRisk === 'HIGH' || missionRisk === 'CRITICAL') && isCriticalFault(predictedFault)) {
    reasons.push(`Mission Risk = HIGH with critical fault: ${predictedFault}`);
  }

  // RTB-05: Check if this UAV has already completed RTB and arrived at Home Base
  const isCompleted = isUavRtbCompleted(uavId) || Boolean(uavState.rtb_completed) || uavState.status === 'COMPLETE';
  if (isCompleted) {
    return {
      rtb_active: false,
      rtb_completed: true,
      uav_id: uavId,
      trigger_reason: reasons.length > 0 ? reasons.join('; ') : 'Critical threshold deviation resolved via RTB recovery',
      severity: 'NOMINAL',
      destination: 'HOME_BASE',
      status: 'COMPLETE',
      status_display: 'RTB COMPLETE — ARRIVED AT HOME BASE',
      triggering_telemetry_values: {
        engine_health: rawHealth,
        oil_pressure: oilPressure,
        cht,
        vibration,
        mission_risk: missionRisk,
        predicted_fault: predictedFault,
      },
      timestamp: uavState.timestamp || new Date().toISOString(),
    };
  }

  // RTB-06: Check operator simulated manual command
  const isManualSimulated = isSimulatedRtbActive(uavId);
  const rtbActive = reasons.length > 0 || isManualSimulated;
  const triggerReason = reasons.length > 0
    ? reasons.join('; ')
    : (isManualSimulated ? 'OPERATOR SIMULATION COMMAND (DECISION-SUPPORT DEMO)' : null);

  return {
    rtb_active: rtbActive,
    rtb_completed: false,
    is_manual_simulated: isManualSimulated,
    uav_id: uavId,
    trigger_reason: triggerReason,
    severity: rtbActive ? (reasons.length > 0 ? 'CRITICAL' : 'SIMULATED') : 'NONE',
    destination: 'HOME_BASE',
    status: rtbActive ? 'EMERGENCY RTB' : 'STANDBY',
    status_display: rtbActive ? 'RETURNING TO BASE' : 'STANDBY',
    triggering_telemetry_values: {
      engine_health: rawHealth,
      oil_pressure: oilPressure,
      cht,
      vibration,
      mission_risk: missionRisk,
      predicted_fault: predictedFault,
    },
    timestamp: uavState.timestamp || new Date().toISOString(),
  };
}

/**
 * Hook to retrieve and subscribe to live Emergency Return-to-Base (RTB) decision state.
 * Uses the SAME active/selected UAV state already displayed on the Dashboard as the
 * primary immediate source of truth, synchronizing seamlessly with /api/rtb/status.
 *
 * @param {string} uavId - Active UAV identifier (e.g. 'UAV-001')
 * @param {Object|null} activeUavState - The active UAV state from useFleet()
 * @returns {{
 *   rtbState: Object|null,
 *   isRtbActive: boolean,
 *   isRtbCompleted: boolean,
 *   loading: boolean,
 *   error: string|null,
 *   refreshRtb: Function
 * }}
 */
export function useRtb(uavId = 'UAV-001', activeUavState = null) {
  const cleanId = (uavId || activeUavState?.uav_id || 'UAV-001').trim().toUpperCase();

  // 1. Immediately derive RTB decision synchronously from the currently selected UAV state
  const derivedInitialState = useMemo(() => {
    if (activeUavState && (!activeUavState.uav_id || activeUavState.uav_id === cleanId)) {
      return deriveRtbFromUavState(activeUavState);
    }
    if (isUavRtbCompleted(cleanId)) {
      return {
        rtb_active: false,
        rtb_completed: true,
        uav_id: cleanId,
        destination: 'HOME_BASE',
        status: 'COMPLETE',
        status_display: 'RTB COMPLETE — ARRIVED AT HOME BASE',
        severity: 'NOMINAL',
        timestamp: new Date().toISOString(),
      };
    }
    return null;
  }, [cleanId, activeUavState]);

  const [rtbState, setRtbState] = useState(derivedInitialState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const activeIdRef = useRef(cleanId);
  activeIdRef.current = cleanId;

  // Whenever the active UAV state changes, immediately update rtbState synchronously
  useEffect(() => {
    if (activeUavState && (!activeUavState.uav_id || activeUavState.uav_id === cleanId)) {
      const derived = deriveRtbFromUavState(activeUavState);
      if (derived) {
        setRtbState(derived);
      }
    } else if (isUavRtbCompleted(cleanId)) {
      setRtbState((prev) => ({
        ...(prev || {}),
        rtb_active: false,
        rtb_completed: true,
        uav_id: cleanId,
        status: 'COMPLETE',
        status_display: 'RTB COMPLETE — ARRIVED AT HOME BASE',
      }));
    }
  }, [cleanId, activeUavState]);

  // Subscribe to completion changes across components
  useEffect(() => {
    const onCompletionChange = (changedId, isCompleted) => {
      if (changedId === cleanId || changedId === 'ALL') {
        if (isCompleted) {
          setRtbState((prev) => ({
            ...(prev || {}),
            rtb_active: false,
            rtb_completed: true,
            uav_id: cleanId,
            status: 'COMPLETE',
            status_display: 'RTB COMPLETE — ARRIVED AT HOME BASE',
          }));
        } else if (activeUavState) {
          setRtbState(deriveRtbFromUavState(activeUavState));
        }
      }
    };
    completionListeners.add(onCompletionChange);
    return () => {
      completionListeners.delete(onCompletionChange);
    };
  }, [cleanId, activeUavState]);

  // Subscribe to simulated manual command changes across components (RTB-06)
  useEffect(() => {
    const onManualChange = (changedId, isActive) => {
      if (changedId === cleanId || changedId === 'ALL') {
        if (isActive && !isUavRtbCompleted(cleanId)) {
          setRtbState((prev) => ({
            ...(prev || {}),
            rtb_active: true,
            rtb_completed: false,
            is_manual_simulated: true,
            uav_id: cleanId,
            destination: 'HOME_BASE',
            status: 'EMERGENCY RTB',
            status_display: 'RETURNING TO BASE',
            trigger_reason: 'OPERATOR SIMULATION COMMAND (DECISION-SUPPORT DEMO)',
          }));
        } else if (!isActive && activeUavState) {
          setRtbState(deriveRtbFromUavState(activeUavState));
        }
      }
    };
    manualRtbListeners.add(onManualChange);
    return () => {
      manualRtbListeners.delete(onManualChange);
    };
  }, [cleanId, activeUavState]);

  // 2. Fetch authoritative backend /api/rtb/status in parallel
  const fetchRtb = useCallback(async () => {
    const targetId = activeIdRef.current;
    if (!targetId) return;
    try {
      const data = await rtbApi.getStatus(targetId);
      if (data && data.uav_id === activeIdRef.current) {
        if (isUavRtbCompleted(targetId)) {
          // RTB-05: Preserve completion state while parked at Home Base
          setRtbState({
            ...data,
            rtb_active: false,
            rtb_completed: true,
            status: 'COMPLETE',
            status_display: 'RTB COMPLETE — ARRIVED AT HOME BASE',
          });
        } else if (isSimulatedRtbActive(targetId)) {
          // RTB-06: Preserve operator manual simulated RTB command
          setRtbState({
            ...data,
            rtb_active: true,
            rtb_completed: false,
            is_manual_simulated: true,
            status: 'EMERGENCY RTB',
            status_display: 'RETURNING TO BASE',
            trigger_reason: data.trigger_reason || 'OPERATOR SIMULATION COMMAND (DECISION-SUPPORT DEMO)',
          });
        } else {
          setRtbState({
            ...data,
            rtb_completed: false,
            status_display: data.rtb_active ? 'RETURNING TO BASE' : 'STANDBY',
          });
        }
        setError(null);
      }
    } catch (err) {
      console.debug(`[useRtb] Background fetch for ${targetId}:`, err?.message || err);
      setError(err?.message || 'Error fetching RTB');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch immediately on UAV change
  useEffect(() => {
    fetchRtb();
  }, [cleanId, fetchRtb]);

  // Periodic poll every 2.0s
  useEffect(() => {
    const interval = setInterval(fetchRtb, 2000);
    return () => clearInterval(interval);
  }, [fetchRtb]);

  const isRtbActive = Boolean(rtbState?.rtb_active);
  const isRtbCompleted = Boolean(rtbState?.rtb_completed || rtbState?.status === 'COMPLETE');

  return {
    rtbState,
    isRtbActive,
    isRtbCompleted,
    loading,
    error,
    refreshRtb: fetchRtb,
  };
}

export default useRtb;
