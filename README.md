# WORLDVIEW — Real-Time OSINT Geospatial Intelligence Platform

A Palantir-style real-time geospatial intelligence dashboard featuring a 3D CesiumJS globe with live OSINT data from multiple sources, a multi-agent backend architecture, and a dark intelligence-themed UI.

![Stack](https://img.shields.io/badge/Next.js_14-black?logo=next.js) ![Stack](https://img.shields.io/badge/CesiumJS-blue?logo=cesium) ![Stack](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white) ![Stack](https://img.shields.io/badge/WebSocket-010101?logo=socketdotio)

## Features

- **3D Globe** — CesiumJS with ESRI satellite imagery and country/city labels
- **Live OSINT Data** — Real ADS-B aircraft (adsb.lol), AIS ship tracking (Digitraffic), satellite positions (CelesTrak TLE)
- **4,500+ Entities** — Flights, ships, satellites, vehicles, and events rendered as canvas-drawn billboards
- **Multi-Agent Backend** — Ingestion, Analytics, and State Orchestrator agents with WebSocket streaming
- **Anomaly Detection** — Speed anomalies, route deviations, proximity alerts, altitude drops
- **Entity Interaction** — Click to inspect, hover tooltips, fly-to zoom with camera restore
- **Search** — Filter entities by callsign or ID
- **Alert Notifications** — Toast notifications for critical anomalies
- **Keyboard Shortcuts** — H (heatmap), C (clusters), R (reset), Esc (deselect), Space (pause)

## Data Sources

| Source | Type | Data |
|--------|------|------|
| [adsb.lol](https://adsb.lol) | ADS-B | Military aircraft positions |
| [OpenSky Network](https://opensky-network.org) | ADS-B | Commercial flight tracking |
| [Digitraffic AIS](https://www.digitraffic.fi/en/marine-traffic/) | AIS | Real-time ship positions |
| [CelesTrak](https://celestrak.org) | TLE | Satellite orbital data |
| Simulated | Generated | City vehicles, shipping routes, military vessels, events |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/noaRoblesLevy/osint-worldmap.git
cd osint-worldmap

npm install
cd backend && npm install
cd ../frontend && npm install
cd ..

# 2. Copy environment config
cp .env.example .env

# 3. Start both backend and frontend
npm run dev
```

Then open **http://localhost:3000**

Or start separately:

```bash
# Terminal 1 — Backend (WebSocket on :8080, HTTP API on :8081)
cd backend && npm run dev

# Terminal 2 — Frontend (Next.js on :3000)
cd frontend && npm run dev
```

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14 + CesiumJS)                 │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐ │
│  │  CesiumGlobe   │  │  ControlPanel  │  │  Zustand Store         │ │
│  │  - 3D globe    │  │  - Search      │  │  - Entities Map        │ │
│  │  - Billboards  │  │  - Toggles     │  │  - Anomalies           │ │
│  │  - Popups      │  │  - Stats       │  │  - Clusters            │ │
│  ├────────────────┤  ├────────────────┤  │  - Filters             │ │
│  │  DetailPanel   │  │  Notifications │  │  - Selection           │ │
│  │  Timeline      │  │  ErrorBoundary │  └────────────────────────┘ │
│  └────────────────┘  └────────────────┘                              │
│                            │ WebSocket (batched)                     │
├────────────────────────────┼─────────────────────────────────────────┤
│                     BACKEND (Node.js + Express + WS)                 │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                   State Orchestrator Agent                     │   │
│  │  - Merges ingestion + analytics                               │   │
│  │  - Applies filters, broadcasts batched updates                │   │
│  └──────────┬────────────────────────────────┬───────────────────┘   │
│  ┌──────────▼──────────┐       ┌─────────────▼───────────────────┐  │
│  │  Ingestion Agent    │       │  Analytics Agent                 │  │
│  │  - Real OSINT data  │       │  - Anomaly detection             │  │
│  │  - Simulated fill   │       │  - DBSCAN clustering             │  │
│  │  - 30s refresh      │       │  - Pattern history               │  │
│  └─────────────────────┘       └─────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

## Tech Stack

- **Frontend**: Next.js 14, CesiumJS (CDN), TypeScript, Tailwind CSS, Zustand
- **Backend**: Node.js, Express, WebSocket (ws), satellite.js, tsx
- **Map**: ESRI World Imagery + ESRI Reference Labels (no API key needed)
- **Data**: Real OSINT APIs (ADS-B, AIS, TLE) with simulated fallback

## Environment Variables

See `.env.example`:

| Variable | Default | Description |
|----------|---------|-------------|
| `WS_PORT` | 8080 | WebSocket server port |
| `HTTP_PORT` | 8081 | REST API port |
| `ENTITY_COUNT` | 300 | Base entity count (real data determines actual) |
| `UPDATE_INTERVAL_MS` | 1500 | Tick interval for movement simulation |
| `ANOMALY_PROBABILITY` | 0.05 | Anomaly chance per entity per tick |
| `NEXT_PUBLIC_WS_URL` | ws://localhost:8080 | Frontend WebSocket URL |

## License

MIT
