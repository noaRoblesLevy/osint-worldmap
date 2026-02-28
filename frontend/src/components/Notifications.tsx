'use client';

import { useStore } from '@/store/useStore';
import { useEffect, useState, useRef } from 'react';
import { Anomaly } from '@/types';
import { SEVERITY_COLORS } from '@/lib/entityIcons';

interface Toast {
  anomaly: Anomaly;
  expiresAt: number;
}

export default function Notifications() {
  const anomalies = useStore((s) => s.anomalies);
  const selectEntity = useStore((s) => s.selectEntity);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastCountRef = useRef(0);

  useEffect(() => {
    if (anomalies.length <= lastCountRef.current) {
      lastCountRef.current = anomalies.length;
      return;
    }

    // Find new critical/high anomalies since last check
    const newOnes = anomalies.slice(lastCountRef.current);
    lastCountRef.current = anomalies.length;

    const critical = newOnes.filter(
      (a) => a.severity === 'critical' || a.severity === 'high'
    );

    if (critical.length === 0) return;

    const now = Date.now();
    const newToasts = critical.slice(-3).map((a) => ({
      anomaly: a,
      expiresAt: now + 6000,
    }));

    setToasts((prev) => [...prev, ...newToasts].slice(-5));
  }, [anomalies]);

  // Cleanup expired toasts
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setToasts((prev) => prev.filter((t) => t.expiresAt > now));
    }, 1000);
    return () => clearInterval(timer);
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-12 right-[340px] z-40 space-y-2 max-w-sm pointer-events-auto">
      {toasts.map((toast) => (
        <button
          key={toast.anomaly.id}
          onClick={() => selectEntity(toast.anomaly.entityId)}
          className="alert-toast w-full text-left"
          style={{
            borderColor: `${SEVERITY_COLORS[toast.anomaly.severity]}40`,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-2 h-2 rounded-full animate-pulse flex-shrink-0"
              style={{ backgroundColor: SEVERITY_COLORS[toast.anomaly.severity] }}
            />
            <span
              className="text-[10px] font-mono uppercase font-bold tracking-wider"
              style={{ color: SEVERITY_COLORS[toast.anomaly.severity] }}
            >
              {toast.anomaly.severity} alert
            </span>
            <span className="text-[9px] text-white/20 ml-auto font-mono">
              {toast.anomaly.type.replace('_', ' ')}
            </span>
          </div>
          <p className="text-white/70 text-[11px] leading-snug">{toast.anomaly.message}</p>
        </button>
      ))}
    </div>
  );
}
