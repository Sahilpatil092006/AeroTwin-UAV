import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import useWebSocket, { WS_STATUS } from '../hooks/useWebSocket';
import { simulationApi } from '../services/api';

const TelemetryContext = createContext(null);

const MAX_HISTORY_POINTS = 30;

export function TelemetryProvider({ children }) {
  const [packet, setPacket] = useState(null);
  const [history, setHistory] = useState([]);
  const [apiError, setApiError] = useState(null);

  const handleMessage = useCallback((data) => {
    if (!data) return;

    if (data.type === 'telemetry') {
      setPacket(data);
      setApiError(null);

      // Append to historical trend points for charts
      const ts = data.timestamp ? data.timestamp.split('T')[1]?.substring(0, 8) || data.timestamp : '';
      const point = {
        timestamp: ts,
        rpm: data.telemetry?.rpm ?? 0,
        cht: data.telemetry?.cht ?? 0,
        egt: data.telemetry?.egt ?? 0,
        oil_pressure: data.telemetry?.oil_pressure ?? 0,
        oil_temperature: data.telemetry?.oil_temperature ?? 0,
        vibration: data.telemetry?.vibration ?? 0,
        fuel_flow: data.telemetry?.fuel_flow ?? 0,
        engine_load: data.telemetry?.engine_load ?? 0,
        health: data.digital_twin?.engine_health ?? 100,
      };

      setHistory((prev) => {
        const next = [...prev, point];
        return next.length > MAX_HISTORY_POINTS ? next.slice(-MAX_HISTORY_POINTS) : next;
      });
    } else if (data.type === 'error') {
      console.warn('[AeroTwin] Server error in telemetry stream:', data.message);
      setApiError(data.message);
    }
  }, []);

  const { status, isConnected, reconnect } = useWebSocket(undefined, {
    onMessage: handleMessage,
    autoReconnect: true,
  });

  const startSimulation = useCallback(async (params) => {
    try {
      setApiError(null);
      const res = await simulationApi.start(params);
      return res;
    } catch (err) {
      console.error('[AeroTwin] Failed to start simulation via REST:', err);
      setApiError(err.response?.data?.detail || err.message);
      throw err;
    }
  }, []);

  const value = useMemo(() => ({
    status,
    isConnected,
    packet,
    telemetry: packet?.telemetry || null,
    digitalTwin: packet?.digital_twin || null,
    ai: packet?.ai || null,
    mission: packet?.mission || null,
    engineId: packet?.engine_id || 'ENGINE-001',
    missionId: packet?.mission_id || 'MISSION-001',
    flightPhase: packet?.flight_phase || 'STANDBY',
    timestamp: packet?.timestamp || null,
    history,
    apiError,
    reconnect,
    startSimulation,
  }), [status, isConnected, packet, history, apiError, reconnect, startSimulation]);

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetryContext() {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetryContext must be used within a TelemetryProvider');
  }
  return context;
}

export default TelemetryContext;
