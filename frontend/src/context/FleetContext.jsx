import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { fleetApi } from '../services/api';

export const FLEET_UAV_IDS = ['UAV-001', 'UAV-002', 'UAV-003', 'UAV-004', 'UAV-005'];

const FleetContext = createContext(null);

const CACHE_KEY = 'aerotwin_uav_cache_v1';

function loadCachedUavs() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const raw = window.sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    }
  } catch (e) {
    // Ignore storage parse errors
  }
  return {};
}

function saveCachedUavs(cache) {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    }
  } catch (e) {
    // Ignore storage write errors
  }
}

export function FleetProvider({ children }) {
  const [activeUavId, setActiveUavIdState] = useState('UAV-001');
  const [fleetData, setFleetData] = useState(null);
  const [uavCache, setUavCache] = useState(loadCachedUavs);
  const [loading, setLoading] = useState(!fleetData && Object.keys(uavCache).length === 0);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Background refresh for a specific UAV
  const refreshUav = useCallback(async (uavId) => {
    if (!uavId) return;
    const cleanId = String(uavId).trim().toUpperCase();
    try {
      const uavState = await fleetApi.getUavState(cleanId);
      if (uavState && uavState.uav_id === cleanId && (uavState.engine_telemetry || uavState.engine_health !== undefined)) {
        setUavCache((prev) => {
          const next = { ...prev, [cleanId]: { ...prev[cleanId], ...uavState } };
          saveCachedUavs(next);
          return next;
        });
        setFleetData((prev) => {
          if (!prev?.uavs) return prev;
          const updated = prev.uavs.map((u) => (u.uav_id === cleanId ? { ...u, ...uavState } : u));
          return { ...prev, uavs: updated };
        });
      }
    } catch (err) {
      // Non-blocking: background refresh should never disrupt UI
      console.debug(`[FleetContext] Background refresh for ${cleanId}:`, err?.message || err);
    }
  }, []);

  // Safe setter that validates UAV ID and triggers background refresh
  const setActiveUavId = useCallback((uavId) => {
    if (!uavId) return;
    const cleanId = String(uavId).trim().toUpperCase();
    setActiveUavIdState(cleanId);
    // Refresh that UAV's data in the background non-blockingly
    refreshUav(cleanId);
  }, [refreshUav]);

  // Fetch live fleet telemetry from backend
  const fetchFleet = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const data = await fleetApi.getAllUavStates();
      if (data && (Array.isArray(data.uavs) || Array.isArray(data))) {
        const uavList = Array.isArray(data.uavs) ? data.uavs : data;
        setFleetData({ ...data, uavs: uavList });
        setLastUpdated(new Date());
        setError(null);

        // Update uavCache with latest valid states for all UAVs
        setUavCache((prev) => {
          const next = { ...prev };
          let changed = false;
          uavList.forEach((uav) => {
            if (uav && uav.uav_id && (uav.engine_telemetry || uav.engine_health !== undefined)) {
              next[uav.uav_id] = { ...next[uav.uav_id], ...uav };
              changed = true;
            }
          });
          if (changed) {
            saveCachedUavs(next);
          }
          return changed ? next : prev;
        });
      } else {
        throw new Error('Invalid fleet payload structure received');
      }
    } catch (err) {
      console.error('[FleetContext] Failed to fetch fleet telemetry:', err);
      setError('Unable to reach backend fleet telemetry endpoint.');
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  }, []);

  // Poll live fleet telemetry every 2.5 seconds
  useEffect(() => {
    fetchFleet();
    const interval = setInterval(() => {
      fetchFleet();
    }, 2500);
    return () => clearInterval(interval);
  }, [fetchFleet]);

  // Compute active UAV state dynamically:
  // 1. Live fleetData if matching activeUavId exists
  // 2. uavCache (instant switch, zero delay, no STANDBY/UNKNOWN reset)
  // 3. null only if never received valid data yet
  const activeUavState = useMemo(() => {
    const liveMatch = fleetData?.uavs?.find((u) => u.uav_id === activeUavId);
    if (liveMatch && (liveMatch.engine_telemetry || liveMatch.engine_health !== undefined)) {
      return liveMatch;
    }
    if (uavCache[activeUavId] && (uavCache[activeUavId].engine_telemetry || uavCache[activeUavId].engine_health !== undefined)) {
      return uavCache[activeUavId];
    }
    return null;
  }, [fleetData, uavCache, activeUavId]);

  const hasActiveUavData = Boolean(activeUavState);

  const value = useMemo(() => ({
    activeUavId,
    setActiveUavId,
    activeUavState,
    uavCache,
    hasActiveUavData,
    fleetData,
    uavs: fleetData?.uavs || Object.values(uavCache) || [],
    loading,
    error,
    lastUpdated,
    isRefreshing,
    refreshFleet: fetchFleet,
    refreshUav,
    fleetUavIds: FLEET_UAV_IDS,
  }), [activeUavId, setActiveUavId, activeUavState, uavCache, hasActiveUavData, fleetData, loading, error, lastUpdated, isRefreshing, fetchFleet, refreshUav]);

  return (
    <FleetContext.Provider value={value}>
      {children}
    </FleetContext.Provider>
  );
}

export function useFleet() {
  const context = useContext(FleetContext);
  if (!context) {
    throw new Error('useFleet must be used within a FleetProvider');
  }
  return context;
}

export default FleetContext;
