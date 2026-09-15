import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useWebSocket Hook
 * Foundation hook for managing full-duplex telemetry and command WebSocket connections.
 */
export function useWebSocket(url = null) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);

  const sendMessage = useCallback((msg) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    if (!url) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setIsConnected(true);
      ws.onclose = () => setIsConnected(false);
      ws.onerror = () => setIsConnected(false);
      ws.onmessage = (event) => setLastMessage(event.data);

      return () => {
        ws.close();
      };
    } catch (err) {
      console.warn('[AeroTwin WebSocket] Connection error:', err);
    }
  }, [url]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}

export default useWebSocket;
