'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { WSMessage, FilterCriteria } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080';
const RECONNECT_BASE = 1000;
const RECONNECT_MAX = 30000;

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const reconnectAttempts = useRef(0);
  const {
    setEntities, updateEntities, setAnomalies, addAnomalies,
    setClusters, setConnectionStatus,
  } = useStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setConnectionStatus('connecting');
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Connected');
      setConnectionStatus('connected');
      reconnectAttempts.current = 0; // Reset backoff on success
    };

    ws.onmessage = (event) => {
      try {
        const msg: WSMessage = JSON.parse(event.data);

        switch (msg.type) {
          case 'snapshot':
            setEntities(msg.data.entities);
            setAnomalies(msg.data.anomalies);
            setClusters(msg.data.clusters);
            break;
          case 'batch':
            // Batched update — single message with optional fields
            if (msg.data.entities) updateEntities(msg.data.entities);
            if (msg.data.anomalies) addAnomalies(msg.data.anomalies);
            if (msg.data.clusters) setClusters(msg.data.clusters);
            break;
          case 'entities':
            updateEntities(msg.data);
            break;
          case 'anomalies':
            addAnomalies(msg.data);
            break;
          case 'clusters':
            setClusters(msg.data);
            break;
        }
      } catch (err) {
        console.error('[WS] Parse error:', err);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      setConnectionStatus('disconnected');
      wsRef.current = null;

      // Exponential backoff with jitter
      const delay = Math.min(
        RECONNECT_BASE * Math.pow(2, reconnectAttempts.current) + Math.random() * 500,
        RECONNECT_MAX
      );
      reconnectAttempts.current++;
      console.log(`[WS] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts.current})`);
      reconnectTimer.current = setTimeout(connect, delay);
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      ws.close();
    };
  }, [setEntities, updateEntities, setAnomalies, addAnomalies, setClusters, setConnectionStatus]);

  const sendFilter = useCallback((filters: FilterCriteria) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'filter', data: filters }));
    }
  }, []);

  const sendPause = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'pause' }));
    }
  }, []);

  const sendResume = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'resume' }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { sendFilter, sendPause, sendResume };
}
