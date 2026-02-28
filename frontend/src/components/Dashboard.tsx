'use client';

import dynamic from 'next/dynamic';
import ControlPanel from './ControlPanel';
import DetailPanel from './DetailPanel';
import Timeline from './Timeline';
import Notifications from './Notifications';
import { ErrorBoundary } from './ErrorBoundary';
import { useWebSocket } from '@/hooks/useWebSocket';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useStore } from '@/store/useStore';
import { useState, useEffect } from 'react';

const CesiumGlobe = dynamic(() => import('./CesiumGlobe'), { ssr: false });
const Minimap = dynamic(() => import('./Minimap'), { ssr: false });

function formatCoord(val: number, pos: string, neg: string): string {
  const abs = Math.abs(val);
  const deg = Math.floor(abs);
  const min = Math.floor((abs - deg) * 60);
  const sec = ((abs - deg - min / 60) * 3600).toFixed(1);
  return `${deg}\u00B0${String(min).padStart(2, '0')}'${sec}"${val >= 0 ? pos : neg}`;
}

function formatAlt(meters: number): string {
  if (meters > 100000) return `${(meters / 1000).toFixed(0)} km`;
  if (meters > 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${meters.toFixed(0)} m`;
}

export default function Dashboard() {
  useWebSocket();
  useKeyboardShortcuts();

  const cursorLat = useStore((s) => s.cursorLat);
  const cursorLng = useStore((s) => s.cursorLng);
  const cameraAlt = useStore((s) => s.cameraAlt);
  const entityCount = useStore((s) => s.entityCount);
  const anomalyCount = useStore((s) => s.anomalyCount);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const cinemaMode = useStore((s) => s.cinemaMode);
  const showMinimap = useStore((s) => s.showMinimap);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#000008] text-palantir-text overflow-hidden">
      {/* Classification banner — always visible */}
      <div className="h-6 bg-[#1a472a] flex items-center justify-center z-30 relative flex-shrink-0">
        <span className="text-[10px] font-mono font-bold tracking-[0.3em] text-[#4ade80] uppercase">
          unclassified // for official use only
        </span>
      </div>

      {/* Main row */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left panel — hidden in cinema mode */}
        {!cinemaMode && (
          <div className="w-72 flex-shrink-0 z-20 relative">
            <ControlPanel />
          </div>
        )}

        {/* Center globe */}
        <div className="flex-1 min-w-0 relative z-0">
          <div className="absolute inset-0">
            <ErrorBoundary>
              <CesiumGlobe />
            </ErrorBoundary>
          </div>

          {/* Vignette overlay */}
          <div className="absolute inset-0 pointer-events-none z-10 vignette-overlay" />

          {/* Notifications */}
          <Notifications />

          {/* Cinema HUD bar — only in cinema mode */}
          {cinemaMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
              <div className="flex items-center gap-4 bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg px-5 py-2">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    connectionStatus === 'connected' ? 'bg-emerald-500' : 'bg-red-500'
                  }`} />
                  <span className="text-[10px] font-mono text-white/50 uppercase">
                    {connectionStatus === 'connected' ? 'live' : 'offline'}
                  </span>
                </div>
                <div className="w-px h-4 bg-white/10" />
                <span className="text-[10px] font-mono text-white/50">
                  {entityCount.toLocaleString()} tracked
                </span>
                {anomalyCount > 0 && (
                  <>
                    <div className="w-px h-4 bg-white/10" />
                    <span className="text-[10px] font-mono text-amber-400">
                      {anomalyCount} alerts
                    </span>
                  </>
                )}
                <div className="w-px h-4 bg-white/10" />
                <CinemaClock />
                <div className="w-px h-4 bg-white/10" />
                <span className="text-[9px] font-mono text-white/30">
                  Press F to exit
                </span>
              </div>
            </div>
          )}

          {/* Top-left branding — hidden in cinema mode */}
          {!cinemaMode && (
            <div className="absolute top-4 left-4 z-20 pointer-events-none">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-black/70 backdrop-blur-sm border border-white/10 rounded px-3 py-2">
                  <div className="w-2 h-2 rounded-full bg-[#3b82f6] animate-pulse" />
                  <span className="text-[11px] font-mono text-white/90 tracking-[0.15em] uppercase font-medium">
                    worldview
                  </span>
                </div>
                <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded px-2 py-1.5">
                  <span className="text-[9px] font-mono text-white/50 tracking-wider uppercase">
                    {mounted && connectionStatus === 'connected' ? 'live' : 'offline'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Top-right stats — hidden in cinema mode */}
          {!cinemaMode && (
            <div className="absolute top-4 right-4 z-20 pointer-events-none">
              <div className="flex items-center gap-2">
                <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded px-3 py-1.5">
                  <span className="text-[10px] font-mono text-white/60">
                    {entityCount.toLocaleString()} TRACKED
                  </span>
                </div>
                {anomalyCount > 0 && (
                  <div className="bg-amber-500/10 backdrop-blur-sm border border-amber-500/20 rounded px-3 py-1.5">
                    <span className="text-[10px] font-mono text-amber-400">
                      {anomalyCount} ALERTS
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom-left coordinate display */}
          <div className="absolute bottom-3 left-4 z-20 pointer-events-none">
            <div className="flex items-center gap-3">
              <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded px-3 py-1.5">
                <span className="text-[10px] font-mono text-white/50">
                  {mounted && cursorLat !== null
                    ? `${formatCoord(cursorLat, 'N', 'S')} ${formatCoord(cursorLng!, 'E', 'W')}`
                    : '--\u00B0--\'--"N --\u00B0--\'--"E'}
                </span>
              </div>
              <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded px-3 py-1.5">
                <span className="text-[10px] font-mono text-white/50">
                  ALT: {mounted && cameraAlt ? formatAlt(cameraAlt) : '--'}
                </span>
              </div>
            </div>
          </div>

          {/* Minimap */}
          {showMinimap && <Minimap />}

          {/* Bottom-right source indicator */}
          <div className="absolute bottom-3 right-4 z-20 pointer-events-none">
            <span className="text-[8px] text-white/30 font-mono">
              SRC: OpenSky / adsb.lol MIL / Digitraffic AIS / CelesTrak TLE / SIM
            </span>
          </div>
        </div>

        {/* Right panel — hidden in cinema mode */}
        {!cinemaMode && (
          <div className="w-80 flex-shrink-0 z-20 relative">
            <DetailPanel />
          </div>
        )}
      </div>

      {/* Bottom timeline — hidden in cinema mode */}
      {!cinemaMode && (
        <div className="z-20 relative flex-shrink-0">
          <Timeline />
        </div>
      )}
    </div>
  );
}

function CinemaClock() {
  const [time, setTime] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const update = () => {
      const now = new Date();
      setTime(
        `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}:${String(now.getUTCSeconds()).padStart(2, '0')}Z`
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return <span className="text-[10px] font-mono text-white/50">--:--:--Z</span>;
  return <span className="text-[10px] font-mono text-white/50">{time}</span>;
}
