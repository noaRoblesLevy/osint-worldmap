import { GeoEntity } from '../types';

// --- Real Data Sources ---
// Fetches live data from public APIs: ADS-B flights, military, satellites.
// Falls back gracefully if APIs are unavailable.

// Multiple flight data sources — try each in order
const FLIGHT_SOURCES = [
  { name: 'OpenSky', url: 'https://opensky-network.org/api/states/all' },
  { name: 'adsb.lol', url: 'https://api.adsb.lol/v2/all' },
];
const MILITARY_SOURCES = [
  { name: 'adsb.lol/mil', url: 'https://api.adsb.lol/v2/mil' },
];
const CELESTRAK_TLE_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=visual&FORMAT=tle';

const FETCH_TIMEOUT = 15000;

interface AdsbAircraft {
  hex: string;
  flight?: string;
  r?: string;        // registration
  t?: string;        // aircraft type
  alt_baro?: number | 'ground';
  alt_geom?: number;
  gs?: number;       // ground speed (knots)
  track?: number;    // heading
  lat?: number;
  lon?: number;
  category?: string;
  squawk?: string;
  dbFlags?: number;  // 1=military, 2=interesting, 4=PIA, 8=LADD
}

// Fetch with timeout
async function fetchWithTimeout(url: string, timeout = FETCH_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// --- ADS-B Flight Data (multiple sources) ---
export async function fetchAllFlights(maxCount = 3000): Promise<GeoEntity[]> {
  for (const source of FLIGHT_SOURCES) {
    try {
      console.log(`[RealData] Fetching flights from ${source.name}...`);
      const res = await fetchWithTimeout(source.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      // OpenSky returns { states: [[...]] }, adsb.lol returns { ac: [...] }
      let entities: GeoEntity[] = [];
      if (json.states) {
        // OpenSky format: array of arrays
        entities = json.states
          .filter((s: any[]) => s[5] != null && s[6] != null) // has lon, lat
          .slice(0, maxCount)
          .map((s: any[]) => openSkyToEntity(s));
        console.log(`[RealData] Got ${entities.length} flights from ${source.name} (OpenSky format)`);
      } else if (json.ac) {
        // adsb.lol format: array of objects
        entities = json.ac
          .filter((ac: AdsbAircraft) => ac.lat != null && ac.lon != null)
          .slice(0, maxCount)
          .map((ac: AdsbAircraft) => adsbToEntity(ac, false));
        console.log(`[RealData] Got ${entities.length} flights from ${source.name}`);
      }

      if (entities.length > 0) return entities;
    } catch (err: any) {
      console.warn(`[RealData] ${source.name} failed: ${err.message}`);
    }
  }
  console.warn('[RealData] All flight sources failed');
  return [];
}

// OpenSky state vector: [icao24, callsign, origin_country, time_position,
//   last_contact, longitude, latitude, baro_altitude, on_ground, velocity,
//   true_track, vertical_rate, sensors, geo_altitude, squawk, spi, position_source]
function openSkyToEntity(s: any[]): GeoEntity {
  const alt = typeof s[7] === 'number' ? s[7] : 0; // baro_altitude in meters
  let speed = (s[9] || 0) * 3.6; // m/s to km/h
  const onGround = !!s[8];
  // Sanity: cruising jets 300-1000 km/h, ground 0-50, nothing > 1200
  if (speed > 1200) speed = 800;
  return {
    id: `adsb-${s[0]}`,
    type: 'flight',
    lat: s[6],
    lng: s[5],
    altitude: onGround ? 0 : alt,
    speed,
    heading: s[10] || 0,
    timestamp: Date.now(),
    metadata: {
      callsign: (s[1] || s[0]).toString().trim(),
      origin: s[2] || undefined,
      status: onGround ? 'ground' : 'active',
      category: 'commercial',
    },
  };
}

// --- Military Flight Data ---
export async function fetchMilitaryFlights(): Promise<GeoEntity[]> {
  for (const source of MILITARY_SOURCES) {
    try {
      console.log(`[RealData] Fetching military flights from ${source.name}...`);
      const res = await fetchWithTimeout(source.url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const aircraft: AdsbAircraft[] = json.ac || [];
      console.log(`[RealData] Got ${aircraft.length} military aircraft from ${source.name}`);

      return aircraft
        .filter((ac) => ac.lat != null && ac.lon != null)
        .map((ac) => adsbToEntity(ac, true));
    } catch (err: any) {
      console.warn(`[RealData] ${source.name} failed: ${err.message}`);
    }
  }
  return [];
}

function adsbToEntity(ac: AdsbAircraft, isMilitary: boolean): GeoEntity {
  const onGround = ac.alt_baro === 'ground';
  const alt = typeof ac.alt_baro === 'number' ? ac.alt_baro * 0.3048 : // feet to meters
              typeof ac.alt_geom === 'number' ? ac.alt_geom * 0.3048 : 0;
  let speed = (ac.gs || 0) * 1.852; // knots to km/h
  // Sanity clamp — nothing airborne exceeds ~1200 km/h
  if (speed > 1200) speed = 800;

  return {
    id: `adsb-${ac.hex}`,
    type: 'flight',
    lat: ac.lat!,
    lng: ac.lon!,
    altitude: onGround ? 0 : alt,
    speed,
    heading: ac.track || 0,
    timestamp: Date.now(),
    metadata: {
      callsign: ac.flight?.trim() || ac.hex.toUpperCase(),
      origin: isMilitary ? 'MILITARY' : undefined,
      destination: undefined,
      status: onGround ? 'ground' : isMilitary ? 'military' : 'active',
      category: isMilitary ? 'military' : (ac.category || 'commercial'),
      registration: ac.r,
      aircraftType: ac.t,
      squawk: ac.squawk,
      isMilitary,
    },
  };
}

// --- Satellite Data (CelesTrak TLEs + satellite.js) ---
let satelliteJs: typeof import('satellite.js') | null = null;

async function loadSatelliteJs() {
  if (!satelliteJs) {
    satelliteJs = await import('satellite.js');
  }
  return satelliteJs;
}

interface TLERecord {
  name: string;
  line1: string;
  line2: string;
}

function parseTLEText(text: string): TLERecord[] {
  const lines = text.trim().split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const records: TLERecord[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    if (lines[i + 1].startsWith('1') && lines[i + 2].startsWith('2')) {
      records.push({ name: lines[i], line1: lines[i + 1], line2: lines[i + 2] });
    }
  }
  return records;
}

export async function fetchSatellites(maxCount = 150): Promise<GeoEntity[]> {
  try {
    console.log('[RealData] Fetching satellite TLEs from CelesTrak...');
    const sat = await loadSatelliteJs();
    const res = await fetchWithTimeout(CELESTRAK_TLE_URL, 20000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const tles = parseTLEText(text).slice(0, maxCount);
    console.log(`[RealData] Parsed ${tles.length} satellite TLEs`);

    const now = new Date();
    const gmst = sat.gstime(now);
    const entities: GeoEntity[] = [];

    for (const tle of tles) {
      try {
        const satrec = sat.twoline2satrec(tle.line1, tle.line2);
        const posVel = sat.propagate(satrec, now);
        if (posVel.position === false || typeof posVel.position === 'boolean') continue;

        const geo = sat.eciToGeodetic(posVel.position, gmst);
        const lat = sat.degreesLat(geo.latitude);
        const lng = sat.degreesLong(geo.longitude);
        const altKm = geo.height;

        if (isNaN(lat) || isNaN(lng) || isNaN(altKm)) continue;

        // Compute speed from velocity vector (satellite.js returns km/s)
        const vel = posVel.velocity;
        let speed = 27000; // default LEO speed in km/h
        if (vel && typeof vel !== 'boolean') {
          const vKmS = Math.sqrt(vel.x ** 2 + vel.y ** 2 + vel.z ** 2);
          speed = vKmS * 3600; // km/s → km/h
        }
        // Sanity: LEO ~28000 km/h, GEO ~11000, nothing orbiting Earth exceeds ~40000
        if (speed > 40000 || speed < 1000 || isNaN(speed)) speed = 27000;

        // Extract NORAD catalog number from TLE line 1
        const noradId = tle.line1.substring(2, 7).trim();

        entities.push({
          id: `sat-${noradId}`,
          type: 'satellite',
          lat,
          lng,
          altitude: altKm * 1000, // km to meters
          speed,
          heading: 0,
          timestamp: Date.now(),
          metadata: {
            callsign: tle.name.trim(),
            status: 'active',
            category: 'satellite',
            noradId,
            altitudeKm: altKm,
          },
        });
      } catch {
        // Skip satellites that fail to propagate
      }
    }

    console.log(`[RealData] Computed positions for ${entities.length} satellites`);
    return entities;
  } catch (err: any) {
    console.warn(`[RealData] Satellite fetch failed: ${err.message}`);
    return [];
  }
}

// --- Real Ship Data (Finnish Digitraffic AIS — free, no key) ---
export async function fetchShips(maxCount = 500): Promise<GeoEntity[]> {
  const AIS_URL = 'https://meri.digitraffic.fi/api/ais/v1/locations';
  try {
    console.log('[RealData] Fetching AIS ship data from Digitraffic...');
    const res = await fetchWithTimeout(AIS_URL, 20000);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const features = json.features || [];

    const entities: GeoEntity[] = features
      .slice(0, maxCount)
      .filter((f: any) => f.geometry?.coordinates)
      .map((f: any) => {
        const [lng, lat] = f.geometry.coordinates;
        const p = f.properties || {};
        const speed = (p.sog || 0) * 1.852; // knots to km/h
        return {
          id: `ship-${f.mmsi || p.mmsi}`,
          type: 'ship' as const,
          lat,
          lng,
          altitude: 0,
          speed,
          heading: p.cog || p.heading || 0,
          timestamp: Date.now(),
          metadata: {
            callsign: `MMSI-${f.mmsi || p.mmsi}`,
            status: p.navStat === 0 ? 'underway' : p.navStat === 1 ? 'anchored' : 'active',
            category: 'vessel',
            mmsi: f.mmsi || p.mmsi,
          },
        } as GeoEntity;
      });

    console.log(`[RealData] Got ${entities.length} ships from Digitraffic AIS`);
    return entities;
  } catch (err: any) {
    console.warn(`[RealData] AIS ship fetch failed: ${err.message}`);
    return [];
  }
}

// --- Simulated Ships on Major Shipping Routes + Military Naval Vessels ---
const SHIPPING_ROUTES = [
  // Strait of Malacca
  { lat: 1.5, lng: 103.5, spread: 2, count: 30 },
  // English Channel
  { lat: 50.5, lng: 0.5, spread: 1.5, count: 25 },
  // Suez Canal approach
  { lat: 30.0, lng: 32.5, spread: 1, count: 15 },
  // Panama Canal approach
  { lat: 9.0, lng: -79.5, spread: 1, count: 12 },
  // South China Sea
  { lat: 14.0, lng: 114.0, spread: 4, count: 35 },
  // Mediterranean
  { lat: 36.0, lng: 15.0, spread: 5, count: 25 },
  // North Atlantic
  { lat: 45.0, lng: -40.0, spread: 8, count: 20 },
  // Persian Gulf
  { lat: 26.0, lng: 52.0, spread: 2, count: 20 },
  // East Coast USA
  { lat: 35.0, lng: -74.0, spread: 4, count: 20 },
  // North Sea
  { lat: 56.0, lng: 3.0, spread: 3, count: 20 },
];

const SHIP_TYPES = ['tanker', 'cargo', 'container', 'bulk_carrier', 'roro', 'lng_carrier'];

export function generateShippingRouteVessels(): GeoEntity[] {
  const entities: GeoEntity[] = [];
  let id = 0;

  for (const route of SHIPPING_ROUTES) {
    for (let i = 0; i < route.count; i++) {
      const lat = route.lat + (Math.random() - 0.5) * route.spread;
      const lng = route.lng + (Math.random() - 0.5) * route.spread;
      const shipType = SHIP_TYPES[Math.floor(Math.random() * SHIP_TYPES.length)];
      const speed = shipType === 'container' ? 18 + Math.random() * 8
                  : shipType === 'tanker' ? 10 + Math.random() * 6
                  : 12 + Math.random() * 10;

      entities.push({
        id: `ship-sim-${id++}`,
        type: 'ship',
        lat, lng,
        altitude: 0,
        speed: speed * 1.852, // knots to km/h
        heading: Math.random() * 360,
        timestamp: Date.now(),
        metadata: {
          callsign: `${shipType.toUpperCase().replace('_', '')}-${1000 + id}`,
          status: 'underway',
          category: shipType,
        },
      });
    }
  }

  console.log(`[RealData] Generated ${entities.length} simulated shipping route vessels`);
  return entities;
}

// --- Military Naval Vessels (Simulated at known fleet areas) ---
const NAVAL_BASES = [
  { name: 'Norfolk', lat: 36.95, lng: -76.33, count: 8 },
  { name: 'San Diego', lat: 32.68, lng: -117.23, count: 7 },
  { name: 'Pearl Harbor', lat: 21.35, lng: -157.97, count: 5 },
  { name: 'Yokosuka', lat: 35.28, lng: 139.67, count: 6 },
  { name: 'Portsmouth', lat: 50.80, lng: -1.10, count: 4 },
  { name: 'Toulon', lat: 43.12, lng: 5.93, count: 4 },
  { name: 'Sevastopol', lat: 44.62, lng: 33.53, count: 3 },
  { name: 'Tartus', lat: 34.89, lng: 35.89, count: 2 },
  { name: 'Changi', lat: 1.32, lng: 104.0, count: 3 },
  { name: 'Bahrain', lat: 26.23, lng: 50.58, count: 4 },
];

const MIL_SHIP_TYPES = ['destroyer', 'frigate', 'carrier', 'submarine', 'cruiser', 'patrol'];

export function generateMilitaryShips(): GeoEntity[] {
  const entities: GeoEntity[] = [];
  let id = 0;

  for (const base of NAVAL_BASES) {
    for (let i = 0; i < base.count; i++) {
      // Spread ships around the naval base (some far out on patrol)
      const range = i < base.count / 2 ? 0.5 : 3 + Math.random() * 5;
      const angle = Math.random() * Math.PI * 2;
      const lat = base.lat + Math.sin(angle) * range;
      const lng = base.lng + Math.cos(angle) * range;
      const shipType = MIL_SHIP_TYPES[Math.floor(Math.random() * MIL_SHIP_TYPES.length)];
      const speed = shipType === 'carrier' ? 25 + Math.random() * 10
                  : shipType === 'submarine' ? 15 + Math.random() * 15
                  : 18 + Math.random() * 12;

      entities.push({
        id: `ship-mil-${id++}`,
        type: 'ship',
        lat, lng,
        altitude: 0,
        speed: speed * 1.852,
        heading: Math.random() * 360,
        timestamp: Date.now(),
        metadata: {
          callsign: `${base.name.toUpperCase().slice(0, 4)}-${shipType.toUpperCase().slice(0, 3)}-${id}`,
          origin: base.name,
          status: i < base.count / 2 ? 'in_port' : 'patrol',
          category: shipType,
          isMilitary: true,
        },
      });
    }
  }

  console.log(`[RealData] Generated ${entities.length} simulated military naval vessels`);
  return entities;
}

// --- Dense City Vehicles (Simulated) ---
const MAJOR_CITIES = [
  // North America
  { name: 'New York', lat: 40.7580, lng: -73.9855, pop: 8.3, gridSize: 0.10 },
  { name: 'Los Angeles', lat: 34.0522, lng: -118.2437, pop: 3.9, gridSize: 0.12 },
  { name: 'Chicago', lat: 41.8781, lng: -87.6298, pop: 2.7, gridSize: 0.08 },
  { name: 'Houston', lat: 29.7604, lng: -95.3698, pop: 2.3, gridSize: 0.08 },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194, pop: 0.87, gridSize: 0.05 },
  { name: 'Washington DC', lat: 38.9072, lng: -77.0369, pop: 0.7, gridSize: 0.05 },
  { name: 'Toronto', lat: 43.6532, lng: -79.3832, pop: 2.9, gridSize: 0.06 },
  { name: 'Mexico City', lat: 19.4326, lng: -99.1332, pop: 9.2, gridSize: 0.10 },
  // Europe
  { name: 'London', lat: 51.5074, lng: -0.1278, pop: 8.9, gridSize: 0.09 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, pop: 2.2, gridSize: 0.06 },
  { name: 'Berlin', lat: 52.5200, lng: 13.4050, pop: 3.6, gridSize: 0.07 },
  { name: 'Madrid', lat: 40.4168, lng: -3.7038, pop: 3.3, gridSize: 0.06 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964, pop: 2.8, gridSize: 0.05 },
  { name: 'Amsterdam', lat: 52.3676, lng: 4.9041, pop: 0.87, gridSize: 0.04 },
  { name: 'Moscow', lat: 55.7558, lng: 37.6173, pop: 12.5, gridSize: 0.10 },
  { name: 'Istanbul', lat: 41.0082, lng: 28.9784, pop: 15.5, gridSize: 0.10 },
  // Asia
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, pop: 13.9, gridSize: 0.08 },
  { name: 'Beijing', lat: 39.9042, lng: 116.4074, pop: 21.5, gridSize: 0.12 },
  { name: 'Shanghai', lat: 31.2304, lng: 121.4737, pop: 24.8, gridSize: 0.12 },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, pop: 12.4, gridSize: 0.06 },
  { name: 'Delhi', lat: 28.7041, lng: 77.1025, pop: 11.0, gridSize: 0.08 },
  { name: 'Seoul', lat: 37.5665, lng: 126.9780, pop: 9.7, gridSize: 0.07 },
  { name: 'Bangkok', lat: 13.7563, lng: 100.5018, pop: 8.3, gridSize: 0.06 },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, pop: 5.6, gridSize: 0.04 },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, pop: 3.3, gridSize: 0.06 },
  // Southern hemisphere
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333, pop: 12.3, gridSize: 0.10 },
  { name: 'Buenos Aires', lat: -34.6037, lng: -58.3816, pop: 3.0, gridSize: 0.06 },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, pop: 5.3, gridSize: 0.07 },
  { name: 'Cairo', lat: 30.0444, lng: 31.2357, pop: 9.5, gridSize: 0.08 },
  { name: 'Lagos', lat: 6.5244, lng: 3.3792, pop: 15.4, gridSize: 0.08 },
  { name: 'Johannesburg', lat: -26.2041, lng: 28.0473, pop: 5.6, gridSize: 0.06 },
];

const VEHICLE_MODELS: Record<string, string[]> = {
  sedan: ['Toyota Camry', 'Honda Civic', 'BMW 3-Series', 'Mercedes C-Class', 'VW Golf', 'Hyundai Sonata'],
  suv: ['Toyota RAV4', 'Ford Explorer', 'BMW X5', 'Range Rover', 'Jeep Cherokee', 'Tesla Model Y'],
  truck: ['Ford F-150', 'Chevy Silverado', 'RAM 1500', 'Toyota Hilux', 'Isuzu NPR'],
  bus: ['City Transit', 'Express Route', 'School Bus', 'Double Decker', 'Shuttle'],
  taxi: ['Yellow Cab', 'Uber', 'Lyft', 'Bolt', 'Grab', 'Ola'],
  motorcycle: ['Honda CBR', 'Yamaha R1', 'Kawasaki Ninja', 'BMW GS', 'Ducati'],
  emergency: ['Ambulance', 'Fire Engine', 'Police Cruiser', 'SWAT', 'Rescue'],
  delivery: ['Amazon Van', 'FedEx', 'UPS', 'DHL', 'Royal Mail', 'Food Delivery'],
};

const VEHICLE_TYPES = Object.keys(VEHICLE_MODELS);

function randomPlate(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const l = () => letters[Math.floor(Math.random() * 26)];
  const n = () => Math.floor(Math.random() * 10);
  return `${l()}${l()}${n()}${n()} ${l()}${l()}${l()}`;
}

export function generateCityVehicles(vehiclesPerCity = 100): GeoEntity[] {
  const entities: GeoEntity[] = [];
  let id = 0;

  for (const city of MAJOR_CITIES) {
    const count = Math.floor(vehiclesPerCity * Math.max(city.pop / 8, 0.5));
    for (let i = 0; i < count; i++) {
      const vType = VEHICLE_TYPES[Math.floor(Math.random() * VEHICLE_TYPES.length)];
      const models = VEHICLE_MODELS[vType];
      const model = models[Math.floor(Math.random() * models.length)];

      // Spread vehicles across the city grid with road-like patterns
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * city.gridSize;
      const lat = city.lat + Math.sin(angle) * dist;
      const lng = city.lng + Math.cos(angle) * dist;

      // Road-aligned headings (N/S/E/W with variance)
      const heading = [0, 90, 180, 270][Math.floor(Math.random() * 4)] + (Math.random() - 0.5) * 15;
      const speed = vType === 'emergency' ? 60 + Math.random() * 80
                  : vType === 'bus' ? 15 + Math.random() * 30
                  : vType === 'motorcycle' ? 30 + Math.random() * 70
                  : vType === 'taxi' ? 20 + Math.random() * 50
                  : vType === 'delivery' ? 15 + Math.random() * 40
                  : 20 + Math.random() * 60;

      entities.push({
        id: `vehicle-${id++}`,
        type: 'vehicle',
        lat, lng,
        altitude: 0,
        speed,
        heading: (heading + 360) % 360,
        timestamp: Date.now(),
        metadata: {
          callsign: `${model}`,
          origin: city.name,
          status: vType === 'emergency' ? 'responding' : Math.random() > 0.85 ? 'stopped' : 'active',
          category: vType,
          city: city.name,
          plate: randomPlate(),
          model,
        },
      });
    }
  }

  console.log(`[RealData] Generated ${entities.length} city vehicles across ${MAJOR_CITIES.length} cities`);
  return entities;
}
