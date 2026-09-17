import { useState, useEffect, useRef, useCallback } from 'react';

export const WS_STATUS = {
  CONNECTING: 'CONNECTING',
  CONNECTED: 'CONNECTED',
  DISCONNECTED: 'DISCONNECTED',
  RECONNECTING: 'RECONNECTING',
};

export const DEFAULT_WS_URL = (() => {
  const wsBase = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_BASE_URL)
    ? import.meta.env.VITE_WS_BASE_URL
    : 'ws://localhost:8000';
  return `${wsBase.replace(/\/$/, '')}/ws/telemetry`;
})();

/**
 * useWebSocket Hook
 * Robust, reconnect-resilient WebSocket client for AeroTwin-UAV telemetry streaming.
 * Handles React 18 StrictMode mount/unmount lifecycles, avoids obsolete socket
 * race conditions, and guards callbacks via stable references.
 */
export function useWebSocket(url = DEFAULT_WS_URL, options = {}) {
  const targetUrl = url || DEFAULT_WS_URL;

  // Keep latest options in ref to avoid recreation of connect callbacks on parent re-renders
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [status, setStatus] = useState(WS_STATUS.CONNECTING);
  const [lastMessage, setLastMessage] = useState(null);

  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const isUnmountedRef = useRef(false);

  const connect = useCallback(() => {
    if (!targetUrl || isUnmountedRef.current) return;

    // Clear any pending reconnection timer
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Cleanly detach and close previous socket instance
    if (wsRef.current) {
      const oldWs = wsRef.current;
      oldWs.onopen = null;
      oldWs.onmessage = null;
      oldWs.onerror = null;
      oldWs.onclose = null;
      try {
        oldWs.close(1000, 'Reconnecting or replacing socket');
      } catch {
        // ignore close errors
      }
      wsRef.current = null;
    }

    setStatus((prev) => (prev === WS_STATUS.DISCONNECTED ? WS_STATUS.RECONNECTING : WS_STATUS.CONNECTING));

    try {
      const ws = new WebSocket(targetUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current || wsRef.current !== ws) return;
        setStatus(WS_STATUS.CONNECTED);
        console.log(`[AeroTwin WS] Connection established to ${targetUrl}`);
      };

      ws.onmessage = (event) => {
        if (isUnmountedRef.current || wsRef.current !== ws) return;
        try {
          const parsed = JSON.parse(event.data);
          setLastMessage(parsed);
          if (optionsRef.current.onMessage) {
            optionsRef.current.onMessage(parsed);
          }
        } catch (err) {
          console.warn('[AeroTwin WS] Error parsing message payload:', err);
        }
      };

      ws.onerror = (err) => {
        if (isUnmountedRef.current || wsRef.current !== ws) return;
        console.warn(`[AeroTwin WS] WebSocket transport error at ${targetUrl}`);
      };

      ws.onclose = (event) => {
        // Ignore close events from obsolete or superseded sockets
        if (isUnmountedRef.current || wsRef.current !== ws) return;

        setStatus(WS_STATUS.DISCONNECTED);
        console.log(`[AeroTwin WS] Disconnected (code=${event.code}, reason='${event.reason || 'none'}')`);

        const autoReconnect = optionsRef.current.autoReconnect !== false;
        const interval = optionsRef.current.reconnectInterval ?? 3000;

        if (autoReconnect && !isUnmountedRef.current) {
          setStatus(WS_STATUS.RECONNECTING);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isUnmountedRef.current) {
              connect();
            }
          }, interval);
        }
      };
    } catch (err) {
      console.warn(`[AeroTwin WS] Failed to create WebSocket for ${targetUrl}:`, err);
      setStatus(WS_STATUS.DISCONNECTED);
      const autoReconnect = optionsRef.current.autoReconnect !== false;
      const interval = optionsRef.current.reconnectInterval ?? 3000;
      if (autoReconnect && !isUnmountedRef.current) {
        setStatus(WS_STATUS.RECONNECTING);
        reconnectTimeoutRef.current = setTimeout(() => {
          if (!isUnmountedRef.current) {
            connect();
          }
        }, interval);
      }
    }
  }, [targetUrl]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        const ws = wsRef.current;
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        try {
          ws.close(1000, 'Component unmounted');
        } catch {
          // ignore
        }
        wsRef.current = null;
      }
    };
  }, [connect]);

  const sendMessage = useCallback((msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }, []);

  return {
    status,
    isConnected: status === WS_STATUS.CONNECTED,
    lastMessage,
    sendMessage,
    reconnect: connect,
  };
}

export default useWebSocket;
