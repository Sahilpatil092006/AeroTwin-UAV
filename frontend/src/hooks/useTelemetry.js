import { useTelemetryContext } from '../context/TelemetryContext';

/**
 * useTelemetry Hook
 * Accesses incoming aero engine telemetry and digital twin state from the global provider.
 */
export function useTelemetry() {
  const ctx = useTelemetryContext();
  return {
    telemetry: ctx.telemetry,
    digitalTwin: ctx.digitalTwin,
    ai: ctx.ai,
    mission: ctx.mission,
    packet: ctx.packet,
    isConnected: ctx.isConnected,
    status: ctx.status,
    lastUpdated: ctx.timestamp,
    history: ctx.history,
    reconnect: ctx.reconnect,
  };
}

export default useTelemetry;
