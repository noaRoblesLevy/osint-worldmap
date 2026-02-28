import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { IngestionAgent } from './agents/ingestionAgent';
import { AnalyticsAgent } from './agents/analyticsAgent';
import { StateOrchestrator } from './agents/stateOrchestrator';
import { FilterCriteria, WSMessage } from './types';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' });

const WS_PORT = parseInt(process.env.WS_PORT || '8080');
const HTTP_PORT = parseInt(process.env.HTTP_PORT || '8081');
const ENTITY_COUNT = parseInt(process.env.ENTITY_COUNT || '300');
const UPDATE_INTERVAL = parseInt(process.env.UPDATE_INTERVAL_MS || '1500');
const ANOMALY_PROB = parseFloat(process.env.ANOMALY_PROBABILITY || '0.05');

// --- Initialize Agents ---
const ingestionAgent = new IngestionAgent(ENTITY_COUNT, UPDATE_INTERVAL, ANOMALY_PROB);
const analyticsAgent = new AnalyticsAgent();
const orchestrator = new StateOrchestrator(ingestionAgent, analyticsAgent);

// --- WebSocket Server ---
const wss = new WebSocketServer({ port: WS_PORT });
const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected (${clients.size} total)`);

  // Send full snapshot on connect
  const snapshot = orchestrator.getSnapshot();
  ws.send(JSON.stringify(snapshot));

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type === 'filter') orchestrator.setFilters(msg.data as FilterCriteria);
      else if (msg.type === 'pause') orchestrator.pause();
      else if (msg.type === 'resume') orchestrator.resume();
      else if (msg.type === 'get_entity') {
        const entity = orchestrator.getEntity(msg.id);
        if (entity) ws.send(JSON.stringify({ type: 'entity_detail', data: entity }));
      }
    } catch (err) {
      console.error('[WS] Bad message:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected (${clients.size} total)`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Error:', err.message);
    clients.delete(ws);
  });
});

orchestrator.on('broadcast', (msg: WSMessage) => {
  const data = JSON.stringify(msg);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
});

// --- HTTP API ---
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', clients: clients.size, uptime: process.uptime() });
});

app.get('/api/snapshot', (_req, res) => {
  res.json(orchestrator.getSnapshot());
});

app.get('/api/entity/:id', (req, res) => {
  const entity = orchestrator.getEntity(req.params.id);
  if (entity) res.json(entity);
  else res.status(404).json({ error: 'Not found' });
});

app.post('/api/filters', (req, res) => {
  orchestrator.setFilters(req.body as FilterCriteria);
  res.json({ success: true });
});

app.listen(HTTP_PORT, () => {
  console.log(`[HTTP] API server on http://localhost:${HTTP_PORT}`);
});

// --- Boot (async for real data) ---
async function boot() {
  console.log('[Boot] Fetching real-time data from OSINT sources...');
  const snapshot = await orchestrator.initialize();
  console.log(`[Boot] Snapshot ready: ${snapshot.data.entities.length} entities`);
  orchestrator.start();

  console.log(`
╔══════════════════════════════════════════════════════╗
║  PALANTIR DASH — Geospatial Intelligence Platform   ║
║                                                      ║
║  WebSocket:  ws://localhost:${WS_PORT}                    ║
║  HTTP API:   http://localhost:${HTTP_PORT}                  ║
║  Entities:   ${String(snapshot.data.entities.length).padEnd(6)}                              ║
║  Sources:    ADS-B, CelesTrak, Simulated             ║
║  Interval:   ${UPDATE_INTERVAL}ms                                ║
╚══════════════════════════════════════════════════════╝
  `);
}

boot().catch((err) => {
  console.error('[Boot] Fatal error:', err);
  process.exit(1);
});
