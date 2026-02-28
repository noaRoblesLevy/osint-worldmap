// Airport IATA code → [lat, lng] lookup for flight route arcs

const AIRPORTS: Record<string, [number, number]> = {
  // North America
  JFK: [40.6413, -73.7781],
  LAX: [33.9425, -118.4081],
  ORD: [41.9742, -87.9073],
  ATL: [33.6407, -84.4277],
  DFW: [32.8998, -97.0403],
  SFO: [37.6213, -122.379],
  MIA: [25.7959, -80.287],
  YYZ: [43.6777, -79.6248],
  // Europe
  LHR: [51.47, -0.4543],
  CDG: [49.0097, 2.5479],
  FRA: [50.0379, 8.5622],
  AMS: [52.3105, 4.7683],
  MAD: [40.4983, -3.5676],
  FCO: [41.8003, 12.2389],
  IST: [41.2753, 28.7519],
  // Middle East
  DXB: [25.2532, 55.3657],
  DOH: [25.2731, 51.6081],
  // Asia-Pacific
  NRT: [35.7647, 140.3864],
  HND: [35.5494, 139.7798],
  PEK: [40.0799, 116.6031],
  ICN: [37.4602, 126.4407],
  SIN: [1.3644, 103.9915],
  SYD: [-33.9461, 151.1772],
  // South America / Africa
  GRU: [-23.4356, -46.4731],
  JNB: [-26.1392, 28.246],
};

export function lookupAirport(code: string): [number, number] | null {
  if (!code) return null;
  const upper = code.toUpperCase().trim();
  return AIRPORTS[upper] ?? null;
}
