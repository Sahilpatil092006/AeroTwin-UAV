import { useState } from 'react';

/**
 * useTelemetry Hook
 * Foundation hook for subscribing to incoming aero engine telemetry.
 * Ready for WebSocket / REST polling integration.
 */
export function useTelemetry() {
  const [telemetry, setTelemetry] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  return {
    telemetry,
    isConnected,
    lastUpdated,
    setTelemetry,
    setIsConnected,
  };
}

export default useTelemetry;
