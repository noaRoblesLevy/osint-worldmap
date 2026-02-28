'use client';

import { useEffect, useRef, useState } from 'react';
import { useStore } from '@/store/useStore';
import { TYPE_COLORS, TYPE_LABELS } from '@/lib/entityIcons';
import { GeoEntity, EntityType } from '@/types';
import { loadCesium } from '@/lib/loadCesium';
import { getEntityIcon } from '@/lib/cesiumIcons';

export default function CesiumGlobe() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<any>(null);
  const cesiumRef = useRef<any>(null);
  const billboardsRef = useRef<any>(null);
  const bbMap = useRef<Map<string, any>>(new Map());
  const initDone = useRef(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const hoverPopupRef = useRef<HTMLDivElement>(null);
  const prevCameraRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);

  const entities = useStore((s) => s.entities);
  const activeTypes = useStore((s) => s.activeTypes);
  const selectedEntityId = useStore((s) => s.selectedEntityId);
  const selectEntity = useStore((s) => s.selectEntity);
  const hoverEntity = useStore((s) => s.hoverEntity);
  const setCursorCoords = useStore((s) => s.setCursorCoords);
  const setCameraAlt = useStore((s) => s.setCameraAlt);

  // Initialize Cesium viewer
  useEffect(() => {
    if (initDone.current || !containerRef.current) return;
    initDone.current = true;

    (async () => {
      try {
        const Cesium = await loadCesium();
        cesiumRef.current = Cesium;

        Cesium.Ion.defaultAccessToken = '';

        let imageryProvider: any;
        try {
          imageryProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer'
          );
        } catch {
          imageryProvider = new Cesium.OpenStreetMapImageryProvider({
            url: 'https://tile.openstreetmap.org/',
          });
        }

        // Add labels overlay (country/city names on transparent background)
        let labelsProvider: any;
        try {
          labelsProvider = await Cesium.ArcGisMapServerImageryProvider.fromUrl(
            'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer'
          );
        } catch {
          labelsProvider = null;
        }

        const viewer = new Cesium.Viewer(containerRef.current!, {
          baseLayer: new Cesium.ImageryLayer(imageryProvider),
          baseLayerPicker: false,
          geocoder: false,
          homeButton: false,
          sceneModePicker: false,
          selectionIndicator: false,
          navigationHelpButton: false,
          animation: false,
          timeline: false,
          fullscreenButton: false,
          infoBox: false,
          creditContainer: document.createElement('div'),
          terrainProvider: new Cesium.EllipsoidTerrainProvider(),
          msaaSamples: 4,
          requestRenderMode: true,
          maximumRenderTimeChange: Infinity,
        });

        // Request renders on changes
        viewer.scene.requestRenderMode = false; // continuous for live data

        viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#000008');
        viewer.scene.globe.enableLighting = false;
        viewer.scene.globe.showGroundAtmosphere = true;
        viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#0a0e17');
        viewer.scene.fog.enabled = true;
        viewer.scene.fog.density = 2.0e-4;

        if (viewer.scene.moon) viewer.scene.moon.show = false;
        if (viewer.scene.sun) viewer.scene.sun.show = false;
        if (viewer.scene.skyBox) viewer.scene.skyBox.show = false;
        viewer.scene.skyAtmosphere.show = true;

        // Add labels overlay on top of satellite imagery
        if (labelsProvider) {
          viewer.imageryLayers.addImageryProvider(labelsProvider);
        }

        const billboards = viewer.scene.primitives.add(
          new Cesium.BillboardCollection({ scene: viewer.scene })
        );
        billboardsRef.current = billboards;
        viewerRef.current = viewer;

        viewer.camera.setView({
          destination: Cesium.Cartesian3.fromDegrees(10, 30, 15000000),
        });

        // Click handler
        const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);
        handler.setInputAction((click: any) => {
          const picked = viewer.scene.pick(click.position);
          if (picked?.primitive?._entityId) {
            selectEntity(picked.primitive._entityId);
          } else {
            selectEntity(null);
          }
        }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

        // Hover handler with tooltip
        handler.setInputAction((move: any) => {
          const picked = viewer.scene.pick(move.endPosition);
          const hovId = picked?.primitive?._entityId || null;
          hoverEntity(hovId);
          containerRef.current!.style.cursor = hovId ? 'pointer' : 'default';

          // Hover tooltip positioning
          const hoverPopup = hoverPopupRef.current;
          if (hoverPopup) {
            if (hovId && hovId !== useStore.getState().selectedEntityId) {
              const hovEnt = useStore.getState().entities.get(hovId);
              if (hovEnt) {
                hoverPopup.style.display = 'block';
                hoverPopup.style.left = `${move.endPosition.x + 16}px`;
                hoverPopup.style.top = `${move.endPosition.y - 12}px`;
                hoverPopup.innerHTML = buildHoverHTML(hovEnt);
              }
            } else {
              hoverPopup.style.display = 'none';
            }
          }

          const cartesian = viewer.camera.pickEllipsoid(
            move.endPosition,
            viewer.scene.globe.ellipsoid
          );
          if (cartesian) {
            const carto = Cesium.Cartographic.fromCartesian(cartesian);
            setCursorCoords(
              Cesium.Math.toDegrees(carto.latitude),
              Cesium.Math.toDegrees(carto.longitude)
            );
          }
        }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

        // Camera altitude tracking
        viewer.camera.changed.addEventListener(() => {
          const carto = Cesium.Cartographic.fromCartesian(viewer.camera.positionWC);
          setCameraAlt(carto.height);
        });

        // Selected entity popup tracking
        viewer.scene.postRender.addEventListener(() => {
          const popup = popupRef.current;
          if (!popup) return;
          const selId = useStore.getState().selectedEntityId;
          const selEntity = selId ? useStore.getState().entities.get(selId) : null;
          if (!selEntity) {
            popup.style.display = 'none';
            return;
          }

          const alt = selEntity.type === 'satellite' ? selEntity.altitude : Math.max(selEntity.altitude, 50);
          const pos = Cesium.Cartesian3.fromDegrees(selEntity.lng, selEntity.lat, alt);
          const screenPos = Cesium.SceneTransforms.worldToWindowCoordinates(viewer.scene, pos);

          if (!screenPos) {
            popup.style.display = 'none';
            return;
          }

          popup.style.display = 'block';
          popup.style.left = `${screenPos.x + 20}px`;
          popup.style.top = `${screenPos.y - 30}px`;
        });

        setLoading(false);
      } catch (err) {
        console.error('[Cesium] Init failed:', err);
        setLoading(false);
      }
    })();

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
      }
    };
  }, [selectEntity, hoverEntity, setCursorCoords, setCameraAlt]);

  // Differential billboard update — only touch changed billboards
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const bc = billboardsRef.current;
    if (!Cesium || !bc) return;

    const existing = bbMap.current;

    // Track which existing IDs we've visited
    const visited = new Set<string>();

    entities.forEach((entity, id) => {
      if (!activeTypes.has(entity.type)) {
        // Type is filtered out — remove if exists
        const bb = existing.get(id);
        if (bb) { bc.remove(bb); existing.delete(id); }
        return;
      }

      visited.add(id);
      const isSelected = id === selectedEntityId;
      const isMil = !!entity.metadata.isMilitary;
      const color = isSelected ? '#ffffff' : isMil ? '#ff6b35' : TYPE_COLORS[entity.type];
      const scale = getScale(entity.type, isMil, isSelected);
      const alt = entity.type === 'satellite' ? entity.altitude : Math.max(entity.altitude, 50);

      let bb = existing.get(id);
      if (bb) {
        // Update in-place — only set properties that changed
        bb.position = Cesium.Cartesian3.fromDegrees(entity.lng, entity.lat, alt);
        if (bb.scale !== scale) bb.scale = scale;
        const newColor = Cesium.Color.fromCssColorString(color);
        if (!bb.color.equals(newColor)) bb.color = newColor;
      } else {
        // New entity — create billboard
        bb = bc.add({
          position: Cesium.Cartesian3.fromDegrees(entity.lng, entity.lat, alt),
          image: getEntityIcon(entity.type, isMil),
          scale,
          color: Cesium.Color.fromCssColorString(color),
          translucencyByDistance: new Cesium.NearFarScalar(1.0e3, 1.0, 1.5e7, 0.4),
          scaleByDistance: new Cesium.NearFarScalar(5.0e2, 2.0, 1.0e7, 0.35),
          disableDepthTestDistance: 0,
        });
        (bb as any)._entityId = id;
        existing.set(id, bb);
      }
    });

    // Remove billboards for entities that no longer exist
    existing.forEach((bb, id) => {
      if (!visited.has(id)) {
        bc.remove(bb);
        existing.delete(id);
      }
    });
  }, [entities, activeTypes, selectedEntityId]);

  // Fly to selected entity / fly back on deselect
  useEffect(() => {
    const Cesium = cesiumRef.current;
    const viewer = viewerRef.current;
    if (!Cesium || !viewer) return;

    if (selectedEntityId) {
      const entity = entities.get(selectedEntityId);
      if (!entity) return;

      if (!prevCameraRef.current) {
        prevCameraRef.current = {
          position: viewer.camera.position.clone(),
          direction: viewer.camera.direction.clone(),
          up: viewer.camera.up.clone(),
        };
      }

      const entityAlt = entity.type === 'satellite' ? entity.altitude : Math.max(entity.altitude, 50);
      const entityPos = Cesium.Cartesian3.fromDegrees(entity.lng, entity.lat, entityAlt);

      const range = entity.type === 'satellite' ? 400000
                  : entity.type === 'flight' ? 80000
                  : entity.type === 'ship' ? 30000
                  : entity.type === 'event' ? 50000
                  : 5000;

      viewer.camera.flyToBoundingSphere(
        new Cesium.BoundingSphere(entityPos, 0),
        {
          offset: new Cesium.HeadingPitchRange(
            Cesium.Math.toRadians(0),
            Cesium.Math.toRadians(-40),
            range
          ),
          duration: 1.5,
        }
      );
    } else if (prevCameraRef.current) {
      viewer.camera.flyTo({
        destination: prevCameraRef.current.position,
        orientation: {
          direction: prevCameraRef.current.direction,
          up: prevCameraRef.current.up,
        },
        duration: 1.2,
      });
      prevCameraRef.current = null;
    }
  }, [selectedEntityId, entities]);

  const selectedEntity = selectedEntityId ? entities.get(selectedEntityId) : null;

  return (
    <div className="cesium-wrapper">
      <div ref={containerRef} className="cesium-container" />

      {/* Hover tooltip — lightweight, follows cursor */}
      <div
        ref={hoverPopupRef}
        className="hover-tooltip"
        style={{ display: 'none' }}
      />

      {/* Selected entity popup */}
      <div
        ref={popupRef}
        className="entity-popup"
        style={{ display: 'none' }}
      >
        {selectedEntity && (
          <>
            <div className="entity-popup-arrow" />
            <div className="flex items-center gap-2 mb-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{
                  backgroundColor: TYPE_COLORS[selectedEntity.type],
                  boxShadow: `0 0 8px ${TYPE_COLORS[selectedEntity.type]}80`,
                }}
              />
              <span className="text-white font-mono text-[12px] font-semibold">
                {selectedEntity.metadata.callsign || selectedEntity.id}
              </span>
              {selectedEntity.metadata.isMilitary && (
                <span className="text-[8px] px-1 py-0.5 rounded bg-orange-500/30 text-orange-400 font-mono font-bold uppercase">
                  mil
                </span>
              )}
            </div>
            <div className="text-[9px] text-white/40 uppercase font-mono tracking-wider mb-2">
              {TYPE_LABELS[selectedEntity.type]}
              {selectedEntity.metadata.category ? ` / ${selectedEntity.metadata.category}` : ''}
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] font-mono">
              <div>
                <span className="text-white/30">SPD</span>{' '}
                <span className="text-white/80">{selectedEntity.speed.toFixed(0)} km/h</span>
              </div>
              <div>
                <span className="text-white/30">ALT</span>{' '}
                <span className="text-white/80">
                  {selectedEntity.altitude > 10000
                    ? `${(selectedEntity.altitude / 1000).toFixed(1)} km`
                    : `${selectedEntity.altitude.toFixed(0)} m`}
                </span>
              </div>
              <div>
                <span className="text-white/30">HDG</span>{' '}
                <span className="text-white/80">{selectedEntity.heading.toFixed(0)}&deg;</span>
              </div>
              <div>
                <span className="text-white/30">POS</span>{' '}
                <span className="text-white/80">
                  {selectedEntity.lat.toFixed(2)}, {selectedEntity.lng.toFixed(2)}
                </span>
              </div>
              {selectedEntity.metadata.origin && (
                <div className="col-span-2">
                  <span className="text-white/30">FROM</span>{' '}
                  <span className="text-white/80">{selectedEntity.metadata.origin as string}</span>
                </div>
              )}
              {selectedEntity.metadata.destination && (
                <div className="col-span-2">
                  <span className="text-white/30">TO</span>{' '}
                  <span className="text-white/80">{selectedEntity.metadata.destination as string}</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {loading && (
        <div className="cesium-loading">
          <div className="cesium-loading-spinner" />
          <span>INITIALIZING GLOBE</span>
        </div>
      )}
    </div>
  );
}

function buildHoverHTML(e: GeoEntity): string {
  const color = e.metadata.isMilitary ? '#ff6b35' : TYPE_COLORS[e.type];
  const mil = e.metadata.isMilitary ? '<span style="color:#ff6b35;font-size:8px;font-weight:bold;margin-left:4px">MIL</span>' : '';
  return `<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
    <div style="width:7px;height:7px;border-radius:50%;background:${color};box-shadow:0 0 6px ${color}80"></div>
    <span style="color:#fff;font-weight:600;font-size:11px">${e.metadata.callsign || e.id}</span>${mil}
  </div>
  <div style="color:rgba(255,255,255,0.35);font-size:9px;text-transform:uppercase;letter-spacing:0.05em">
    ${e.type}${e.metadata.category ? ' / ' + e.metadata.category : ''} &bull; ${e.speed.toFixed(0)} km/h
  </div>`;
}

function getScale(type: EntityType, isMilitary: boolean, selected: boolean): number {
  if (selected) return 0.65;
  if (isMilitary) return 0.5;
  switch (type) {
    case 'flight': return 0.38;
    case 'ship': return 0.35;
    case 'satellite': return 0.75;
    case 'vehicle': return 0.22;
    case 'event': return 0.5;
    default: return 0.3;
  }
}
