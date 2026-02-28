'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useStore } from '@/store/useStore';

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function formatTimeShort(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export default function Timeline() {
  const timelinePosition = useStore((s) => s.timelinePosition);
  const setTimelinePosition = useStore((s) => s.setTimelinePosition);
  const isPaused = useStore((s) => s.isPaused);
  const togglePause = useStore((s) => s.togglePause);
  const entityCount = useStore((s) => s.entityCount);
  const connectionStatus = useStore((s) => s.connectionStatus);

  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    updatePosition(e);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    updatePosition(e);
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const updatePosition = (e: React.MouseEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setTimelinePosition(x);
  };

  const timeLabels = [];
  for (let i = 0; i <= 6; i++) {
    const t = new Date(currentTime.getTime() - (6 - i) * 10 * 60000);
    timeLabels.push(formatTimeShort(t));
  }

  return (
    <div
      className="h-14 bg-[#0d1117] border-t border-white/[0.06] flex items-center px-4 gap-4"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <button
        onClick={togglePause}
        className="w-8 h-8 flex items-center justify-center rounded-md bg-white/[0.04] hover:bg-white/[0.08] text-white/60 transition-colors border border-white/[0.06]"
      >
        <span className="text-[10px]">{isPaused ? '\u25B6' : '\u23F8'}</span>
      </button>

      <div className="flex-1 flex flex-col gap-1">
        <div
          ref={trackRef}
          className="relative h-5 cursor-pointer group"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
        >
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-white/[0.08] rounded-full">
            <div
              className="absolute left-0 top-0 h-full bg-blue-500/60 rounded-full transition-all"
              style={{ width: `${timelinePosition * 100}%` }}
            />
          </div>
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)] transition-all"
            style={{ left: `calc(${timelinePosition * 100}% - 5px)` }}
          />
          {[0, 0.167, 0.333, 0.5, 0.667, 0.833, 1].map((pos, i) => (
            <div
              key={i}
              className="absolute top-1/2 -translate-y-1/2 w-px h-2 bg-white/[0.08]"
              style={{ left: `${pos * 100}%` }}
            />
          ))}
        </div>

        <div className="flex justify-between text-[8px] text-white/20 font-mono">
          {mounted
            ? timeLabels.map((label, i) => <span key={i}>{label}</span>)
            : timeLabels.map((_, i) => <span key={i}>--:--</span>)
          }
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-white/30 font-mono min-w-[200px] justify-end">
        <div className="flex items-center gap-1.5">
          <div className={`w-1.5 h-1.5 rounded-full ${
            connectionStatus === 'connected'
              ? 'bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]'
              : 'bg-red-500'
          }`} />
          <span>{entityCount.toLocaleString()} tracked</span>
        </div>
        <span className="text-white/50 tabular-nums">{mounted ? formatTime(currentTime) : '--:--:--'}</span>
      </div>
    </div>
  );
}
