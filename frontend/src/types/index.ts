// Shared types mirroring backend schema

export type EntityType = 'flight' | 'ship' | 'satellite' | 'vehicle' | 'event';

export interface GeoEntity {
  id: string;
  type: EntityType;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  heading: number;
  timestamp: number;
  metadata: {
    callsign?: string;
    origin?: string;
    destination?: string;
    status?: string;
    flag?: string;
    category?: string;
    [key: string]: unknown;
  };
}

export type AnomalyType = 'speed_change' | 'route_deviation' | 'proximity_alert' | 'altitude_anomaly' | 'stationary';

export interface Anomaly {
  id: string;
  entityId: string;
  type: AnomalyType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: number;
  lat: number;
  lng: number;
}

export interface Cluster {
  id: string;
  centroid: { lat: number; lng: number };
  entityIds: string[];
  radius: number;
  density: number;
}

export interface FilterCriteria {
  types?: EntityType[];
  speedMin?: number;
  speedMax?: number;
  region?: { north: number; south: number; east: number; west: number };
  timeWindow?: { start: number; end: number };
}

export type WSMessage =
  | { type: 'entities'; data: GeoEntity[] }
  | { type: 'anomalies'; data: Anomaly[] }
  | { type: 'clusters'; data: Cluster[] }
  | { type: 'snapshot'; data: { entities: GeoEntity[]; anomalies: Anomaly[]; clusters: Cluster[] } }
  | { type: 'batch'; data: { entities?: GeoEntity[]; anomalies?: Anomaly[]; clusters?: Cluster[] } }
  | { type: 'entity_detail'; data: GeoEntity };
