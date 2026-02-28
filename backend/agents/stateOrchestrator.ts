import { GeoEntity, Anomaly, Cluster, FilterCriteria, WSMessage } from '../types';
import { EventEmitter } from 'events';
import { IngestionAgent } from './ingestionAgent';
import { AnalyticsAgent } from './analyticsAgent';

// --- State Orchestrator Agent ---
// Central hub that merges ingestion + analytics outputs, applies filters,
// and publishes unified state to all connected clients.

export class StateOrchestrator extends EventEmitter {
  private ingestion: IngestionAgent;
  private analytics: AnalyticsAgent;
  private filters: FilterCriteria = {};
  private paused = false;

  constructor(ingestion: IngestionAgent, analytics: AnalyticsAgent) {
    super();
    this.ingestion = ingestion;
    this.analytics = analytics;
    this.wireAgents();
  }

  private wireAgents(): void {
    this.ingestion.on('update', (updatedEntities: GeoEntity[]) => {
      if (this.paused) return;

      const allEntities = this.ingestion.getAll();
      const { anomalies, clusters } = this.analytics.analyze(updatedEntities, allEntities);
      const filteredEntities = this.applyFilters(updatedEntities);

      // Single batched message instead of 3 separate ones
      const batch: any = {};
      if (filteredEntities.length > 0) batch.entities = filteredEntities;
      if (anomalies.length > 0) batch.anomalies = anomalies;
      if (clusters.length > 0) batch.clusters = clusters;

      if (Object.keys(batch).length > 0) {
        this.emit('broadcast', { type: 'batch', data: batch } as WSMessage);
      }
    });

    console.log('[StateOrchestrator] Agents wired together');
  }

  // Now async — waits for real data APIs
  async initialize(): Promise<WSMessage> {
    const entities = await this.ingestion.init();
    const { clusters } = this.analytics.analyze(entities, entities);
    const anomalies = this.analytics.getAnomalies();

    return {
      type: 'snapshot',
      data: {
        entities: this.applyFilters(entities),
        anomalies,
        clusters,
      },
    };
  }

  start(): void {
    this.ingestion.start();
    console.log('[StateOrchestrator] System started');
  }

  stop(): void {
    this.ingestion.stop();
  }

  pause(): void { this.paused = true; }
  resume(): void { this.paused = false; }

  setFilters(filters: FilterCriteria): void {
    this.filters = filters;
    const entities = this.applyFilters(this.ingestion.getAll());
    const anomalies = this.analytics.getAnomalies();
    const clusters = this.analytics.getClusters();
    this.emit('broadcast', {
      type: 'snapshot',
      data: { entities, anomalies, clusters },
    } as WSMessage);
  }

  getSnapshot(): WSMessage {
    return {
      type: 'snapshot',
      data: {
        entities: this.applyFilters(this.ingestion.getAll()),
        anomalies: this.analytics.getAnomalies(),
        clusters: this.analytics.getClusters(),
      },
    };
  }

  getEntity(id: string): GeoEntity | undefined {
    return this.ingestion.getById(id);
  }

  private applyFilters(entities: GeoEntity[]): GeoEntity[] {
    let result = entities;
    if (this.filters.types?.length) {
      result = result.filter((e) => this.filters.types!.includes(e.type));
    }
    if (this.filters.speedMin !== undefined) {
      result = result.filter((e) => e.speed >= this.filters.speedMin!);
    }
    if (this.filters.speedMax !== undefined) {
      result = result.filter((e) => e.speed <= this.filters.speedMax!);
    }
    if (this.filters.region) {
      const { north, south, east, west } = this.filters.region;
      result = result.filter((e) => e.lat <= north && e.lat >= south && e.lng <= east && e.lng >= west);
    }
    if (this.filters.timeWindow) {
      const { start, end } = this.filters.timeWindow;
      result = result.filter((e) => e.timestamp >= start && e.timestamp <= end);
    }
    return result;
  }
}
