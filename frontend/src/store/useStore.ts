import { create } from 'zustand';
import { GeoEntity, Anomaly, Cluster, EntityType, FilterCriteria } from '@/types';

export interface Bookmark {
  id: string;
  name: string;
  lng: number;
  lat: number;
  alt: number;
}

interface DashboardState {
  // Entity state
  entities: Map<string, GeoEntity>;
  anomalies: Anomaly[];
  clusters: Cluster[];

  // Selection state
  selectedEntityId: string | null;
  hoveredEntityId: string | null;
  multiSelectIds: Set<string>;

  // View toggles
  showHeatmap: boolean;
  showClusters: boolean;
  isPaused: boolean;
  showDayNight: boolean;
  cinemaMode: boolean;
  showLabels: boolean;
  showTrails: boolean;
  showMinimap: boolean;

  // Bookmarks
  flyToBookmark: Bookmark | null;
  customBookmarks: Bookmark[];

  // Camera viewport (for minimap)
  cameraViewRect: { west: number; south: number; east: number; north: number } | null;

  // Filters
  filters: FilterCriteria;
  activeTypes: Set<EntityType>;

  // Timeline
  timelinePosition: number; // 0-1

  // Cursor / camera
  cursorLat: number | null;
  cursorLng: number | null;
  cameraAlt: number | null;

  // Stats
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  entityCount: number;
  anomalyCount: number;

  // Actions
  setEntities: (entities: GeoEntity[]) => void;
  updateEntities: (entities: GeoEntity[]) => void;
  setAnomalies: (anomalies: Anomaly[]) => void;
  addAnomalies: (anomalies: Anomaly[]) => void;
  setClusters: (clusters: Cluster[]) => void;
  selectEntity: (id: string | null) => void;
  hoverEntity: (id: string | null) => void;
  toggleMultiSelect: (id: string) => void;
  clearMultiSelect: () => void;
  toggleHeatmap: () => void;
  toggleClusters: () => void;
  togglePause: () => void;
  toggleDayNight: () => void;
  toggleCinemaMode: () => void;
  toggleLabels: () => void;
  toggleTrails: () => void;
  toggleMinimap: () => void;
  setFlyToBookmark: (bookmark: Bookmark | null) => void;
  addCustomBookmark: (bookmark: Bookmark) => void;
  removeCustomBookmark: (id: string) => void;
  setCameraViewRect: (rect: DashboardState['cameraViewRect']) => void;
  setFilters: (filters: Partial<FilterCriteria>) => void;
  toggleType: (type: EntityType) => void;
  setTimelinePosition: (pos: number) => void;
  setConnectionStatus: (status: DashboardState['connectionStatus']) => void;
  setCursorCoords: (lat: number, lng: number) => void;
  setCameraAlt: (alt: number) => void;
}

export const useStore = create<DashboardState>((set, get) => ({
  entities: new Map(),
  anomalies: [],
  clusters: [],
  selectedEntityId: null,
  hoveredEntityId: null,
  multiSelectIds: new Set(),
  showHeatmap: false,
  showClusters: true,
  isPaused: false,
  showDayNight: false,
  cinemaMode: false,
  showLabels: false,
  showTrails: false,
  showMinimap: false,
  flyToBookmark: null,
  customBookmarks: [],
  cameraViewRect: null,
  filters: {},
  activeTypes: new Set(['flight', 'ship', 'satellite', 'vehicle', 'event']),
  timelinePosition: 1,
  cursorLat: null,
  cursorLng: null,
  cameraAlt: null,
  connectionStatus: 'connecting',
  entityCount: 0,
  anomalyCount: 0,

  setEntities: (entities) => {
    const map = new Map<string, GeoEntity>();
    entities.forEach((e) => map.set(e.id, e));
    set({ entities: map, entityCount: map.size });
  },

  updateEntities: (updated) => {
    const current = new Map(get().entities);
    updated.forEach((e) => current.set(e.id, e));
    set({ entities: current, entityCount: current.size });
  },

  setAnomalies: (anomalies) => set({ anomalies, anomalyCount: anomalies.length }),

  addAnomalies: (newAnomalies) => {
    const current = get().anomalies;
    const combined = [...current, ...newAnomalies].slice(-200);
    set({ anomalies: combined, anomalyCount: combined.length });
  },

  setClusters: (clusters) => set({ clusters }),

  selectEntity: (id) => set({ selectedEntityId: id }),

  hoverEntity: (id) => set({ hoveredEntityId: id }),

  toggleMultiSelect: (id) => {
    const current = new Set(get().multiSelectIds);
    if (current.has(id)) current.delete(id);
    else current.add(id);
    set({ multiSelectIds: current });
  },

  clearMultiSelect: () => set({ multiSelectIds: new Set() }),

  toggleHeatmap: () => set({ showHeatmap: !get().showHeatmap }),

  toggleClusters: () => set({ showClusters: !get().showClusters }),

  togglePause: () => set({ isPaused: !get().isPaused }),

  toggleDayNight: () => set({ showDayNight: !get().showDayNight }),

  toggleCinemaMode: () => set({ cinemaMode: !get().cinemaMode }),

  toggleLabels: () => set({ showLabels: !get().showLabels }),

  toggleTrails: () => set({ showTrails: !get().showTrails }),

  toggleMinimap: () => set({ showMinimap: !get().showMinimap }),

  setFlyToBookmark: (bookmark) => set({ flyToBookmark: bookmark }),

  addCustomBookmark: (bookmark) =>
    set({ customBookmarks: [...get().customBookmarks, bookmark] }),

  removeCustomBookmark: (id) =>
    set({ customBookmarks: get().customBookmarks.filter((b) => b.id !== id) }),

  setCameraViewRect: (rect) => set({ cameraViewRect: rect }),

  setFilters: (partial) => set({ filters: { ...get().filters, ...partial } }),

  toggleType: (type) => {
    const current = new Set(get().activeTypes);
    if (current.has(type)) current.delete(type);
    else current.add(type);
    set({ activeTypes: current });
  },

  setTimelinePosition: (pos) => set({ timelinePosition: pos }),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setCursorCoords: (lat, lng) => set({ cursorLat: lat, cursorLng: lng }),

  setCameraAlt: (alt) => set({ cameraAlt: alt }),
}));
