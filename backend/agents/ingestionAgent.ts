import { GeoEntity, EntityType } from '../types';
import { EventEmitter } from 'events';
import {
  fetchAllFlights,
  fetchMilitaryFlights,
  fetchSatellites,
  fetchShips,
  generateShippingRouteVessels,
  generateMilitaryShips,
  generateCityVehicles,
} from './realDataSources';

// --- Data Ingestion Agent (v2 — Real + Simulated Hybrid) ---
// Pulls real ADS-B flights, military aircraft, and satellite positions.
// Generates dense simulated vehicles in major cities.
// Falls back to full simulation if APIs are unavailable.

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

export class IngestionAgent extends EventEmitter {
  private entities: Map<string, GeoEntity> = new Map();
  private interval: ReturnType<typeof setInterval> | null = null;
  private realDataInterval: ReturnType<typeof setInterval> | null = null;
  private updateIntervalMs: number;
  private anomalyProbability: number;
  private hasRealCommercialFlights = false;
  private hasRealMilitaryFlights = false;
  private hasRealSatellites = false;
  private hasRealShips = false;

  constructor(
    _entityCount = 300, // kept for API compat, real data determines count
    updateIntervalMs = 1500,
    anomalyProbability = 0.05
  ) {
    super();
    this.updateIntervalMs = updateIntervalMs;
    this.anomalyProbability = anomalyProbability;
  }

  async init(): Promise<GeoEntity[]> {
    console.log('[IngestionAgent] Initializing with real data sources...');

    // Fetch all data sources in parallel
    const [flights, military, satellites, realShips] = await Promise.all([
      fetchAllFlights(3000),
      fetchMilitaryFlights(),
      fetchSatellites(150),
      fetchShips(500),
    ]);

    // Generate simulated city vehicles
    const vehicles = generateCityVehicles(100);

    // Generate simulated events
    const events = this.generateEvents(30);

    // Generate ships (real AIS + simulated global routes + military)
    const simShips = generateShippingRouteVessels();
    const milShips = generateMilitaryShips();

    this.hasRealCommercialFlights = flights.length > 0;
    this.hasRealMilitaryFlights = military.length > 0;
    this.hasRealSatellites = satellites.length > 0;
    this.hasRealShips = realShips.length > 0;

    // Always ensure we have commercial flights — generate simulated if APIs failed
    let allFlights = [...flights];
    if (flights.length === 0) {
      console.log('[IngestionAgent] No real commercial flights — generating 500 simulated...');
      allFlights = this.generateSimulatedFlights(500);
    }

    // Merge military into flights
    allFlights.push(...military);

    // Always ensure we have satellites — generate more simulated if needed
    let allSatellites = [...satellites];
    if (satellites.length === 0) {
      console.log('[IngestionAgent] No real satellites — generating 80 simulated...');
      allSatellites = this.generateSimulatedSatellites(80);
    } else if (satellites.length < 100) {
      // Supplement with extra simulated
      const extra = this.generateSimulatedSatellites(80 - Math.min(satellites.length, 80));
      allSatellites.push(...extra);
    }

    // Merge all ships: real AIS + simulated routes + military
    const allShips = [...realShips, ...simShips, ...milShips];

    // Merge all into entity map
    const all = [...allFlights, ...allSatellites, ...allShips, ...vehicles, ...events];
    for (const entity of all) {
      this.entities.set(entity.id, entity);
    }

    console.log(`[IngestionAgent] Initialized: ${allFlights.length} flights (${military.length} military), ${allSatellites.length} satellites, ${allShips.length} ships (${realShips.length} real AIS, ${milShips.length} military), ${vehicles.length} vehicles, ${events.length} events = ${this.entities.size} total`);

    return Array.from(this.entities.values());
  }

  start(): void {
    if (this.interval) return;

    // Tick for movement simulation
    this.interval = setInterval(() => {
      const updated = this.tick();
      this.emit('update', updated);
    }, this.updateIntervalMs);

    // Refresh real data every 30 seconds
    this.realDataInterval = setInterval(() => {
      this.refreshRealData();
    }, 30000);

    console.log(`[IngestionAgent] Streaming at ${this.updateIntervalMs}ms intervals`);
  }

  stop(): void {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
    if (this.realDataInterval) { clearInterval(this.realDataInterval); this.realDataInterval = null; }
  }

  getAll(): GeoEntity[] {
    return Array.from(this.entities.values());
  }

  getById(id: string): GeoEntity | undefined {
    return this.entities.get(id);
  }

  // Refresh real flight/satellite positions
  private async refreshRealData(): Promise<void> {
    try {
      const [flights, military, satellites, ships] = await Promise.all([
        this.hasRealCommercialFlights ? fetchAllFlights(3000) : Promise.resolve([]),
        this.hasRealMilitaryFlights ? fetchMilitaryFlights() : Promise.resolve([]),
        this.hasRealSatellites ? fetchSatellites(150) : Promise.resolve([]),
        this.hasRealShips ? fetchShips(500) : Promise.resolve([]),
      ]);

      const all = [...flights, ...military, ...satellites, ...ships];
      for (const entity of all) {
        this.entities.set(entity.id, entity);
      }

      if (all.length > 0) {
        this.emit('update', all);
      }
    } catch (err) {
      // Silent fail on refresh
    }
  }

  // Simulate movement for entities between real data refreshes
  private tick(): GeoEntity[] {
    const batchSize = Math.floor(this.entities.size * 0.2);
    const ids = Array.from(this.entities.keys());
    const updated: GeoEntity[] = [];

    for (let i = 0; i < batchSize; i++) {
      const id = ids[Math.floor(Math.random() * ids.length)];
      const entity = this.entities.get(id);
      if (!entity) continue;

      // Only simulate movement for simulated entities and vehicles
      // Real ADS-B data gets refreshed via API
      const isSimulated = !entity.id.startsWith('adsb-') && !entity.id.startsWith('sat-');
      if (!isSimulated && Math.random() > 0.1) continue; // still slightly move real entities for visual continuity

      const isAnomaly = Math.random() < this.anomalyProbability;
      const moved = this.moveEntity(entity, isAnomaly);
      this.entities.set(id, moved);
      updated.push(moved);
    }

    return updated;
  }

  private moveEntity(entity: GeoEntity, anomaly: boolean): GeoEntity {
    if (entity.type === 'event') {
      return { ...entity, timestamp: Date.now() };
    }

    const dt = this.updateIntervalMs / 1000;
    const speedDeg = (entity.speed / 111) * (dt / 3600);

    let headingRad = (entity.heading * Math.PI) / 180;
    let speed = entity.speed;
    let altitude = entity.altitude;

    if (anomaly) {
      const r = Math.random();
      if (r < 0.3) speed *= randomBetween(2, 5);
      else if (r < 0.6) headingRad += randomBetween(-Math.PI / 2, Math.PI / 2);
      else altitude *= randomBetween(0.3, 0.6);
    } else {
      headingRad += randomBetween(-0.05, 0.05);
      speed += randomBetween(-2, 2);
    }

    let newLat = entity.lat + Math.cos(headingRad) * speedDeg;
    let newLng = entity.lng + Math.sin(headingRad) * speedDeg;

    // Vehicles stay within their city bounds
    if (entity.type === 'vehicle' && entity.metadata.city) {
      const drift = 0.15;
      if (Math.abs(newLat - entity.lat) > drift) newLat = entity.lat;
      if (Math.abs(newLng - entity.lng) > drift) newLng = entity.lng;
    }

    const lat = Math.max(-85, Math.min(85, newLat));
    const lng = ((newLng + 180) % 360) - 180;

    return {
      ...entity,
      lat, lng,
      speed: Math.max(0, speed),
      altitude: Math.max(0, altitude),
      heading: ((headingRad * 180) / Math.PI + 360) % 360,
      timestamp: Date.now(),
    };
  }

  // --- Fallback Simulated Data ---

  private generateSimulatedFlights(count: number): GeoEntity[] {
    const airports = [
      { code: 'JFK', name: 'New York JFK', lat: 40.64, lng: -73.78 },
      { code: 'LAX', name: 'Los Angeles', lat: 33.94, lng: -118.41 },
      { code: 'LHR', name: 'London Heathrow', lat: 51.47, lng: -0.46 },
      { code: 'CDG', name: 'Paris CDG', lat: 49.01, lng: 2.55 },
      { code: 'FRA', name: 'Frankfurt', lat: 50.03, lng: 8.57 },
      { code: 'DXB', name: 'Dubai', lat: 25.25, lng: 55.36 },
      { code: 'HND', name: 'Tokyo Haneda', lat: 35.55, lng: 139.78 },
      { code: 'PEK', name: 'Beijing Capital', lat: 40.08, lng: 116.58 },
      { code: 'SIN', name: 'Singapore Changi', lat: 1.36, lng: 103.99 },
      { code: 'SYD', name: 'Sydney', lat: -33.95, lng: 151.18 },
      { code: 'ORD', name: 'Chicago O\'Hare', lat: 41.97, lng: -87.91 },
      { code: 'ATL', name: 'Atlanta', lat: 33.64, lng: -84.43 },
      { code: 'AMS', name: 'Amsterdam', lat: 52.31, lng: 4.77 },
      { code: 'IST', name: 'Istanbul', lat: 41.28, lng: 28.73 },
      { code: 'DEL', name: 'Delhi', lat: 28.56, lng: 77.10 },
      { code: 'GRU', name: 'São Paulo', lat: -23.43, lng: -46.47 },
      { code: 'ICN', name: 'Seoul Incheon', lat: 37.46, lng: 126.44 },
      { code: 'BKK', name: 'Bangkok', lat: 13.69, lng: 100.75 },
      { code: 'SFO', name: 'San Francisco', lat: 37.62, lng: -122.38 },
      { code: 'MIA', name: 'Miami', lat: 25.79, lng: -80.29 },
      { code: 'MEX', name: 'Mexico City', lat: 19.44, lng: -99.07 },
      { code: 'JNB', name: 'Johannesburg', lat: -26.13, lng: 28.24 },
      { code: 'DOH', name: 'Doha', lat: 25.26, lng: 51.57 },
      { code: 'MUC', name: 'Munich', lat: 48.35, lng: 11.79 },
    ];
    const airlines = [
      { prefix: 'UAL', name: 'United' }, { prefix: 'DAL', name: 'Delta' },
      { prefix: 'AAL', name: 'American' }, { prefix: 'SWA', name: 'Southwest' },
      { prefix: 'BAW', name: 'British Airways' }, { prefix: 'AFR', name: 'Air France' },
      { prefix: 'DLH', name: 'Lufthansa' }, { prefix: 'QFA', name: 'Qantas' },
      { prefix: 'ANA', name: 'ANA' }, { prefix: 'SIA', name: 'Singapore Air' },
      { prefix: 'CPA', name: 'Cathay Pacific' }, { prefix: 'UAE', name: 'Emirates' },
      { prefix: 'THY', name: 'Turkish' }, { prefix: 'KLM', name: 'KLM' },
      { prefix: 'QTR', name: 'Qatar Airways' }, { prefix: 'ETH', name: 'Ethiopian' },
      { prefix: 'RYR', name: 'Ryanair' }, { prefix: 'EZY', name: 'easyJet' },
    ];

    return Array.from({ length: count }, (_, i) => {
      const origin = airports[Math.floor(Math.random() * airports.length)];
      let dest = airports[Math.floor(Math.random() * airports.length)];
      while (dest.code === origin.code) dest = airports[Math.floor(Math.random() * airports.length)];

      // Place aircraft somewhere between origin and destination
      const progress = Math.random();
      const lat = origin.lat + (dest.lat - origin.lat) * progress + randomBetween(-2, 2);
      const lng = origin.lng + (dest.lng - origin.lng) * progress + randomBetween(-2, 2);

      // Heading roughly toward destination
      const dLat = dest.lat - lat;
      const dLng = dest.lng - lng;
      const heading = ((Math.atan2(dLng, dLat) * 180) / Math.PI + 360) % 360;

      const airline = airlines[Math.floor(Math.random() * airlines.length)];
      const flightNum = Math.floor(100 + Math.random() * 9000);
      const altitude = randomBetween(9000, 12500); // typical cruise altitude in meters
      const speed = randomBetween(750, 920); // typical jet cruise speed km/h

      return {
        id: `sim-flight-${i}`,
        type: 'flight' as EntityType,
        lat, lng,
        altitude,
        speed,
        heading,
        timestamp: Date.now(),
        metadata: {
          callsign: `${airline.prefix}${flightNum}`,
          origin: `${origin.code} ${origin.name}`,
          destination: `${dest.code} ${dest.name}`,
          status: 'active',
          category: 'commercial',
        },
      };
    });
  }

  private generateSimulatedSatellites(count: number): GeoEntity[] {
    const names = ['STARLINK', 'GPS-IIR', 'GOES', 'SENTINEL', 'LANDSAT', 'NOAA', 'ISS', 'TIANHE', 'COSMOS'];
    return Array.from({ length: count }, (_, i) => ({
      id: `sim-sat-${i}`,
      type: 'satellite' as EntityType,
      lat: randomBetween(-70, 70),
      lng: randomBetween(-180, 180),
      altitude: randomBetween(200000, 500000),
      speed: randomBetween(25000, 28000),
      heading: Math.random() * 360,
      timestamp: Date.now(),
      metadata: {
        callsign: `${names[i % names.length]}-${Math.floor(1000 + Math.random() * 9000)}`,
        status: 'active',
        category: 'satellite',
      },
    }));
  }

  private generateEvents(count: number): GeoEntity[] {
    const types = ['seismic', 'weather', 'signal', 'thermal', 'rf_emission'];
    return Array.from({ length: count }, (_, i) => ({
      id: `event-${i}`,
      type: 'event' as EntityType,
      lat: randomBetween(-60, 60),
      lng: randomBetween(-180, 180),
      altitude: 0,
      speed: 0,
      heading: 0,
      timestamp: Date.now(),
      metadata: {
        callsign: `EVT-${i}`,
        status: 'active',
        category: types[i % types.length],
      },
    }));
  }
}
