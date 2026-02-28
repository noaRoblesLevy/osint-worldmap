import { GeoEntity, Anomaly, Cluster, AnomalyType } from '../types';
import { EventEmitter } from 'events';

// --- Analytics Agent ---
// Detects anomalies, computes clusters, generates derived metrics.
// Maintains short-term history for pattern detection.

const PROXIMITY_THRESHOLD_KM = 50;
const SPEED_CHANGE_THRESHOLD = 1.8; // 80% change
const ALTITUDE_CHANGE_THRESHOLD = 0.4; // 40% drop
const CLUSTER_RADIUS_KM = 100;
const MIN_CLUSTER_SIZE = 3;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

let anomalyCounter = 0;

export class AnalyticsAgent extends EventEmitter {
  // Short-term history: last N states per entity
  private history: Map<string, GeoEntity[]> = new Map();
  private anomalies: Anomaly[] = [];
  private clusters: Cluster[] = [];
  private maxHistory = 10;
  private maxAnomalies = 200;

  constructor() {
    super();
  }

  // Process a batch of updated entities, run detection
  analyze(entities: GeoEntity[], allEntities: GeoEntity[]): { anomalies: Anomaly[]; clusters: Cluster[] } {
    const newAnomalies: Anomaly[] = [];

    for (const entity of entities) {
      // Update history
      const hist = this.history.get(entity.id) || [];
      hist.push(entity);
      if (hist.length > this.maxHistory) hist.shift();
      this.history.set(entity.id, hist);

      // Detect anomalies per entity
      const detected = this.detectAnomalies(entity, hist);
      newAnomalies.push(...detected);
    }

    // Proximity alerts (check pairwise for recent updates only)
    const proxAlerts = this.detectProximity(entities, allEntities);
    newAnomalies.push(...proxAlerts);

    // Trim anomalies buffer
    this.anomalies.push(...newAnomalies);
    if (this.anomalies.length > this.maxAnomalies) {
      this.anomalies = this.anomalies.slice(-this.maxAnomalies);
    }

    // Recompute clusters on full dataset
    this.clusters = this.computeClusters(allEntities);

    if (newAnomalies.length > 0) {
      this.emit('anomalies', newAnomalies);
    }
    this.emit('clusters', this.clusters);

    return { anomalies: newAnomalies, clusters: this.clusters };
  }

  getAnomalies(): Anomaly[] {
    return this.anomalies;
  }

  getClusters(): Cluster[] {
    return this.clusters;
  }

  private detectAnomalies(entity: GeoEntity, history: GeoEntity[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    if (history.length < 2) return anomalies;

    const prev = history[history.length - 2];
    const curr = entity;

    // Speed change detection
    if (prev.speed > 0) {
      const ratio = curr.speed / prev.speed;
      if (ratio > SPEED_CHANGE_THRESHOLD || ratio < 1 / SPEED_CHANGE_THRESHOLD) {
        anomalies.push(this.createAnomaly(curr, 'speed_change',
          ratio > 1 ? 'high' : 'medium',
          `Speed changed from ${prev.speed.toFixed(0)} to ${curr.speed.toFixed(0)} km/h`
        ));
      }
    }

    // Altitude anomaly
    if (prev.altitude > 100) {
      const altRatio = curr.altitude / prev.altitude;
      if (altRatio < ALTITUDE_CHANGE_THRESHOLD) {
        anomalies.push(this.createAnomaly(curr, 'altitude_anomaly', 'critical',
          `Altitude dropped from ${prev.altitude.toFixed(0)}m to ${curr.altitude.toFixed(0)}m`
        ));
      }
    }

    // Route deviation (sharp heading change)
    const headingDiff = Math.abs(curr.heading - prev.heading);
    const normalizedDiff = headingDiff > 180 ? 360 - headingDiff : headingDiff;
    if (normalizedDiff > 45 && curr.type !== 'vehicle') {
      anomalies.push(this.createAnomaly(curr, 'route_deviation', 'medium',
        `Heading changed by ${normalizedDiff.toFixed(0)} degrees`
      ));
    }

    // Stationary detection (entity that should be moving)
    if (curr.type !== 'event' && curr.speed < 1 && prev.speed > 10) {
      anomalies.push(this.createAnomaly(curr, 'stationary', 'low',
        `Entity stopped moving (was ${prev.speed.toFixed(0)} km/h)`
      ));
    }

    return anomalies;
  }

  private detectProximity(updated: GeoEntity[], all: GeoEntity[]): Anomaly[] {
    const alerts: Anomaly[] = [];
    // Only check proximity for non-event, moving entities
    const moving = updated.filter((e) => e.type !== 'event' && e.speed > 0);

    for (const entity of moving) {
      for (const other of all) {
        if (entity.id === other.id || other.type === 'event') continue;
        // Same-type proximity check
        if (entity.type === other.type) {
          const dist = haversineKm(entity.lat, entity.lng, other.lat, other.lng);
          if (dist < PROXIMITY_THRESHOLD_KM && dist > 0) {
            // Avoid duplicate alerts — only from lower ID
            if (entity.id < other.id) {
              alerts.push({
                id: `anomaly-${++anomalyCounter}`,
                entityId: entity.id,
                type: 'proximity_alert',
                severity: dist < 20 ? 'critical' : 'high',
                message: `${entity.metadata.callsign} within ${dist.toFixed(1)}km of ${other.metadata.callsign}`,
                timestamp: Date.now(),
                lat: (entity.lat + other.lat) / 2,
                lng: (entity.lng + other.lng) / 2,
              });
            }
          }
        }
      }
    }

    // Limit proximity alerts per tick to avoid flooding
    return alerts.slice(0, 5);
  }

  // Simple distance-based clustering (DBSCAN-like)
  private computeClusters(entities: GeoEntity[]): Cluster[] {
    const movingEntities = entities.filter((e) => e.type !== 'event');
    const visited = new Set<string>();
    const clusters: Cluster[] = [];
    let clusterId = 0;

    for (const entity of movingEntities) {
      if (visited.has(entity.id)) continue;

      const neighbors = movingEntities.filter(
        (other) =>
          other.id !== entity.id &&
          !visited.has(other.id) &&
          haversineKm(entity.lat, entity.lng, other.lat, other.lng) < CLUSTER_RADIUS_KM
      );

      if (neighbors.length >= MIN_CLUSTER_SIZE - 1) {
        const clusterEntities = [entity, ...neighbors];
        clusterEntities.forEach((e) => visited.add(e.id));

        const centroidLat = clusterEntities.reduce((s, e) => s + e.lat, 0) / clusterEntities.length;
        const centroidLng = clusterEntities.reduce((s, e) => s + e.lng, 0) / clusterEntities.length;

        // Compute actual radius
        const maxDist = Math.max(
          ...clusterEntities.map((e) => haversineKm(centroidLat, centroidLng, e.lat, e.lng))
        );

        clusters.push({
          id: `cluster-${clusterId++}`,
          centroid: { lat: centroidLat, lng: centroidLng },
          entityIds: clusterEntities.map((e) => e.id),
          radius: maxDist,
          density: clusterEntities.length / (Math.PI * maxDist * maxDist + 1),
        });
      }
    }

    return clusters;
  }

  private createAnomaly(
    entity: GeoEntity,
    type: AnomalyType,
    severity: Anomaly['severity'],
    message: string
  ): Anomaly {
    return {
      id: `anomaly-${++anomalyCounter}`,
      entityId: entity.id,
      type,
      severity,
      message,
      timestamp: Date.now(),
      lat: entity.lat,
      lng: entity.lng,
    };
  }
}
