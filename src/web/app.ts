import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { CDCListenerService, cdcEventEmitter } from '../services/cdc_listener.js';
import { checkDatabaseConnection } from '../config/database.js';
import { travelersRouter, activeFleetData } from './routes/travelers.js';
import { disruptionRouter, setDisruptionDeps } from './routes/disruption.js';
import { systemRouter } from './routes/system.js';
import { reportsRouter, setReportsDeps } from './routes/reports.js';

dotenv.config();

const app = express();
const DEFAULT_PORT = parseInt(process.env.PORT || '3000', 10);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'src', 'web', 'public')));

const cdcListener = new CDCListenerService(parseInt(process.env.CDC_POLL_INTERVAL_MS || '3000', 10));
cdcListener.startListening();

const sseClients: Response[] = [];

export const ACTIVE_FLEET_TRIPS: any[] = activeFleetData;

function broadcastSSE(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  const dead: Response[] = [];
  sseClients.forEach((client) => {
    try {
      client.write(payload);
    } catch (_err) {
      dead.push(client);
    }
  });
  dead.forEach((client) => {
    const idx = sseClients.indexOf(client);
    if (idx !== -1) sseClients.splice(idx, 1);
  });
}

cdcEventEmitter.on('cdc_event', (data) => broadcastSSE('cdc_event', data));
cdcEventEmitter.on('agent_step', (data) => broadcastSSE('agent_step', data));
cdcEventEmitter.on('cascade_healed', (data) => broadcastSSE('cascade_healed', data));
cdcEventEmitter.on('human_approval_required', (data) => broadcastSSE('human_approval_required', data));

setDisruptionDeps(broadcastSSE, cdcListener);
setReportsDeps(cdcListener);

app.use(travelersRouter);
app.use(disruptionRouter);
app.use(systemRouter);
app.use(reportsRouter);

app.get('/api/stream', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'SSE_CONNECTED', timestamp: new Date() })}\n\n`);
  } catch (_err) {
    return res.end();
  }

  sseClients.push(res);

  const heartbeatTimer = setInterval(() => {
    try {
      if (!res.writableEnded && !res.destroyed) {
        res.write(': keepalive\n\n');
      } else {
        cleanup();
      }
    } catch (_err) {
      cleanup();
    }
  }, 15000);

  let isCleanedUp = false;
  const cleanup = () => {
    if (isCleanedUp) return;
    isCleanedUp = true;
    clearInterval(heartbeatTimer);
    const idx = sseClients.indexOf(res);
    if (idx !== -1) sseClients.splice(idx, 1);
    try {
      if (!res.writableEnded && !res.destroyed) {
        res.end();
      }
    } catch (_err) {}
  };

  req.on('close', cleanup);
  req.on('end', cleanup);
  req.on('error', (err) => {
    console.warn('[SSE Request Socket Error]:', err?.message);
    cleanup();
  });
  res.on('error', (err) => {
    console.warn('[SSE Response Socket Error]:', err?.message);
    cleanup();
  });
});

app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'src', 'web', 'public', 'index.html'));
});

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[CASCADE Error]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

async function startServer(portToTry: number) {
  try {
    const isDbConnected = await checkDatabaseConnection();
    if (isDbConnected) {
      console.log('✅ CockroachDB Cloud cluster connected (SERIALIZABLE + VECTOR(1536) HNSW active).');
    }
  } catch (err: any) {
    console.error('CockroachDB Connection Error details:', err);
  }

  const server = app.listen(portToTry, () => {
    console.log(`=======================================================`);
    console.log(`CASCADE Hackathon UI & API Server active on port ${portToTry}`);
    console.log(`Dashboard URL: http://localhost:${portToTry}`);
    console.log(`=======================================================`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${portToTry} occupied, attempting fallback port ${portToTry + 1}...`);
      startServer(portToTry + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(DEFAULT_PORT);
