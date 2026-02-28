'use client';

import { useStore } from '@/store/useStore';
import { TYPE_COLORS, SEVERITY_COLORS } from '@/lib/entityIcons';
import { useState, useEffect } from 'react';

export default function DetailPanel() {
  const entities = useStore((s) => s.entities);
  const anomalies = useStore((s) => s.anomalies);
  const selectedEntityId = useStore((s) => s.selectedEntityId);
  const selectEntity = useStore((s) => s.selectEntity);

  const selectedEntity = selectedEntityId ? entities.get(selectedEntityId) : null;
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const entityAnomalies = selectedEntityId
    ? anomalies.filter((a) => a.entityId === selectedEntityId).slice(-10)
    : [];

  const recentAnomalies = anomalies.slice(-20).reverse();

  return (
    <div className="w-80 bg-[#0d1117] border-l border-white/[0.06] flex flex-col h-full overflow-hidden">
      {/* Entity Detail */}
      {selectedEntity ? (
        <div className="flex-shrink-0">
          <div className="p-4 border-b border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] text-white/30 uppercase tracking-[0.15em] font-mono">
                Entity Inspector
              </h2>
              <button
                onClick={() => selectEntity(null)}
                className="text-white/30 hover:text-white text-xs w-5 h-5 flex items-center justify-center rounded hover:bg-white/10 transition-colors"
              >
                x
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-2.5 h-2.5 rounded-full shadow-sm"
                style={{
                  backgroundColor: TYPE_COLORS[selectedEntity.type],
                  boxShadow: `0 0 8px ${TYPE_COLORS[selectedEntity.type]}60`,
                }}
              />
              <span className="text-sm font-mono text-white font-medium">
                {selectedEntity.metadata.callsign || selectedEntity.id}
              </span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.06] text-white/40 uppercase font-mono">
                {selectedEntity.type}
              </span>
              {!!selectedEntity.metadata.isMilitary && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 uppercase font-mono font-bold">
                  mil
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <DataField label="Latitude" value={selectedEntity.lat.toFixed(5)} />
              <DataField label="Longitude" value={selectedEntity.lng.toFixed(5)} />
              <DataField
                label="Speed"
                value={`${selectedEntity.speed.toFixed(1)} km/h`}
              />
              <DataField
                label="Altitude"
                value={
                  selectedEntity.altitude > 10000
                    ? `${(selectedEntity.altitude / 1000).toFixed(1)} km`
                    : `${selectedEntity.altitude.toFixed(0)} m`
                }
              />
              <DataField label="Heading" value={`${selectedEntity.heading.toFixed(1)}\u00B0`} />
              <DataField
                label="Updated"
                value={
                  mounted
                    ? new Date(selectedEntity.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: false,
                      })
                    : '--:--:--'
                }
              />
              {selectedEntity.metadata.origin && (
                <DataField label="Origin" value={selectedEntity.metadata.origin as string} />
              )}
              {selectedEntity.metadata.destination && (
                <DataField label="Destination" value={selectedEntity.metadata.destination as string} />
              )}
              {selectedEntity.metadata.category && (
                <DataField label="Category" value={selectedEntity.metadata.category as string} />
              )}
            </div>
          </div>

          {entityAnomalies.length > 0 && (
            <div className="p-4 border-b border-white/[0.06] max-h-40 overflow-y-auto">
              <h3 className="text-[9px] text-white/30 uppercase tracking-[0.15em] font-mono mb-2">
                Entity Alerts ({entityAnomalies.length})
              </h3>
              <div className="space-y-1">
                {entityAnomalies.map((a) => (
                  <div key={a.id} className="text-[10px] p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-1.5">
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: SEVERITY_COLORS[a.severity] }}
                      />
                      <span className="text-white/40 uppercase font-mono">{a.severity}</span>
                    </div>
                    <p className="text-white/70 mt-1">{a.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 border-b border-white/[0.06]">
          <h2 className="text-[10px] text-white/30 uppercase tracking-[0.15em] font-mono mb-1">
            Inspector
          </h2>
          <p className="text-[11px] text-white/20">Click an entity on the globe to inspect</p>
        </div>
      )}

      {/* Anomaly Feed */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-[9px] text-white/30 uppercase tracking-[0.15em] font-mono mb-2 sticky top-0 bg-[#0d1117] py-1 z-10">
            Live Anomaly Feed
          </h3>
          <div className="space-y-1.5">
            {recentAnomalies.length === 0 ? (
              <p className="text-[10px] text-white/20">No anomalies detected</p>
            ) : (
              recentAnomalies.map((anomaly) => (
                <button
                  key={anomaly.id}
                  onClick={() => selectEntity(anomaly.entityId)}
                  className="w-full text-left p-2.5 rounded-md bg-white/[0.01] hover:bg-white/[0.04] border border-transparent hover:border-white/[0.06] transition-all"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: SEVERITY_COLORS[anomaly.severity] }}
                    />
                    <span className="text-[9px] text-white/30 uppercase font-mono">
                      {anomaly.type.replace('_', ' ')}
                    </span>
                    <span className="text-[9px] text-white/20 ml-auto font-mono">
                      {mounted
                        ? new Date(anomaly.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: false,
                          })
                        : '--:--:--'}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 truncate">{anomaly.message}</p>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DataField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] text-white/30 uppercase font-mono tracking-wider">{label}</div>
      <div className="text-white/80 font-mono text-[11px]">{value}</div>
    </div>
  );
}
