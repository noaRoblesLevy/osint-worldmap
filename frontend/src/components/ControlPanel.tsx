'use client';

import { useState, useMemo } from 'react';
import { useStore } from '@/store/useStore';
import { EntityType } from '@/types';
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/entityIcons';

const ALL_TYPES: EntityType[] = ['flight', 'ship', 'satellite', 'vehicle', 'event'];

const TYPE_ICONS: Record<EntityType, string> = {
  flight: '\u2708',
  ship: '\u26F5',
  satellite: '\uD83D\uDEF0',
  vehicle: '\uD83D\uDE97',
  event: '\u26A0',
};

export default function ControlPanel() {
  const activeTypes = useStore((s) => s.activeTypes);
  const toggleType = useStore((s) => s.toggleType);
  const showHeatmap = useStore((s) => s.showHeatmap);
  const showClusters = useStore((s) => s.showClusters);
  const toggleHeatmap = useStore((s) => s.toggleHeatmap);
  const toggleClusters = useStore((s) => s.toggleClusters);
  const isPaused = useStore((s) => s.isPaused);
  const togglePause = useStore((s) => s.togglePause);
  const entityCount = useStore((s) => s.entityCount);
  const anomalyCount = useStore((s) => s.anomalyCount);
  const connectionStatus = useStore((s) => s.connectionStatus);
  const entities = useStore((s) => s.entities);
  const selectEntity = useStore((s) => s.selectEntity);
  const [searchQuery, setSearchQuery] = useState('');

  // Count by type
  const typeCounts: Record<string, number> = { flight: 0, ship: 0, satellite: 0, vehicle: 0, event: 0 };
  entities.forEach((e) => { typeCounts[e.type] = (typeCounts[e.type] || 0) + 1; });

  return (
    <div className="w-72 bg-[#0d1117] border-r border-white/[0.06] flex flex-col h-full overflow-hidden">
      {/* Logo header */}
      <div className="px-5 py-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-[#3b82f6]/20 flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xs font-semibold text-white tracking-[0.12em] uppercase">
              Worldview
            </h1>
            <p className="text-[9px] text-white/30 tracking-wider uppercase">
              Geospatial Intelligence
            </p>
          </div>
        </div>
      </div>

      {/* Connection + Stats */}
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-3">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'connected' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]' :
            connectionStatus === 'connecting' ? 'bg-amber-500 animate-pulse' :
            'bg-red-500'
          }`} />
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono">
            {connectionStatus === 'connected' ? 'connected' : connectionStatus === 'connecting' ? 'connecting...' : 'disconnected'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatBox label="Tracked" value={entityCount} />
          <StatBox label="Alerts" value={anomalyCount} color="text-amber-400" />
        </div>
      </div>

      {/* Search */}
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <div className="relative">
          <input
            type="text"
            placeholder="Search callsign, ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              const q = e.target.value.toLowerCase().trim();
              if (q.length < 2) return;
              const found = Array.from(entities.values()).find(
                (ent) =>
                  ent.id.toLowerCase().includes(q) ||
                  (ent.metadata.callsign && ent.metadata.callsign.toLowerCase().includes(q))
              );
              if (found) selectEntity(found.id);
            }}
            className="w-full pl-8 pr-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-md text-[11px] text-white placeholder-white/20 focus:outline-none focus:border-blue-500/40 font-mono transition-colors"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
      </div>

      {/* Entity Type Toggles */}
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <h3 className="text-[9px] text-white/30 uppercase tracking-[0.15em] font-mono mb-3">
          Entity Layers
        </h3>
        <div className="space-y-1">
          {ALL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => toggleType(type)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs transition-all ${
                activeTypes.has(type)
                  ? 'bg-white/[0.04] text-white'
                  : 'text-white/30 hover:bg-white/[0.02]'
              }`}
            >
              {/* Toggle switch */}
              <div
                className={`w-8 h-[18px] rounded-full relative transition-colors ${
                  activeTypes.has(type) ? '' : 'bg-white/10'
                }`}
                style={{
                  backgroundColor: activeTypes.has(type) ? TYPE_COLORS[type] + '40' : undefined,
                }}
              >
                <div
                  className={`absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all shadow-sm ${
                    activeTypes.has(type) ? 'left-[17px]' : 'left-[2px]'
                  }`}
                  style={{
                    backgroundColor: activeTypes.has(type) ? TYPE_COLORS[type] : '#4a5568',
                  }}
                />
              </div>
              <span className="flex-1 text-left">{TYPE_LABELS[type]}</span>
              <span className="text-[10px] font-mono text-white/30">{typeCounts[type]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Layer Toggles */}
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <h3 className="text-[9px] text-white/30 uppercase tracking-[0.15em] font-mono mb-3">
          Overlays
        </h3>
        <div className="space-y-1">
          <ToggleSwitch label="Heatmap" shortcut="H" active={showHeatmap} onClick={toggleHeatmap} />
          <ToggleSwitch label="Clusters" shortcut="C" active={showClusters} onClick={toggleClusters} />
        </div>
      </div>

      {/* Playback */}
      <div className="px-5 py-3 border-b border-white/[0.06]">
        <button
          onClick={togglePause}
          className={`w-full py-2.5 rounded-md text-[11px] font-mono uppercase tracking-wider transition-all border ${
            isPaused
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20'
          }`}
        >
          {isPaused ? 'Resume Feed' : 'Pause Feed'}
        </button>
      </div>

      {/* Shortcuts */}
      <div className="px-5 py-3 mt-auto">
        <h3 className="text-[9px] text-white/30 uppercase tracking-[0.15em] font-mono mb-2">
          Keyboard
        </h3>
        <div className="space-y-1.5 text-[10px]">
          {[
            ['H', 'Heatmap'],
            ['C', 'Clusters'],
            ['R', 'Reset View'],
            ['Esc', 'Deselect'],
            ['Space', 'Pause/Resume'],
          ].map(([key, desc]) => (
            <div key={key} className="flex justify-between items-center">
              <span className="text-white/30">{desc}</span>
              <kbd className="px-1.5 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded text-white/50 font-mono text-[9px]">
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({
  label, shortcut, active, onClick,
}: {
  label: string; shortcut: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs transition-all ${
        active ? 'bg-white/[0.04] text-white' : 'text-white/30 hover:bg-white/[0.02]'
      }`}
    >
      <div className={`w-8 h-[18px] rounded-full relative transition-colors ${
        active ? 'bg-blue-500/30' : 'bg-white/10'
      }`}>
        <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full transition-all shadow-sm ${
          active ? 'left-[17px] bg-blue-500' : 'left-[2px] bg-gray-600'
        }`} />
      </div>
      <span className="flex-1 text-left">{label}</span>
      <kbd className="px-1 py-0.5 bg-white/[0.06] border border-white/[0.08] rounded text-[9px] text-white/40 font-mono">
        {shortcut}
      </kbd>
    </button>
  );
}

function StatBox({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-md px-3 py-2">
      <div className={`text-lg font-semibold font-mono ${color || 'text-white'}`}>
        {value.toLocaleString()}
      </div>
      <div className="text-[9px] text-white/30 uppercase tracking-wider">{label}</div>
    </div>
  );
}
