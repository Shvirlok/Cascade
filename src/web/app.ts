import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { CDCListenerService, cdcEventEmitter } from '../services/cdc_listener.js';
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

// Initialize CockroachDB CDC Listener
const cdcListener = new CDCListenerService(parseInt(process.env.CDC_POLL_INTERVAL_MS || '3000', 10));
cdcListener.startListening();

// Active SSE client connections
const sseClients: Response[] = [];

// Export active fleet trips reference
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

// Forward CDC event emitter steps to SSE web clients
cdcEventEmitter.on('cdc_event', (data) => broadcastSSE('cdc_event', data));
cdcEventEmitter.on('agent_step', (data) => broadcastSSE('agent_step', data));
cdcEventEmitter.on('cascade_healed', (data) => broadcastSSE('cascade_healed', data));
cdcEventEmitter.on('human_approval_required', (data) => broadcastSSE('human_approval_required', data));

// Initialize module dependencies
setDisruptionDeps(broadcastSSE, cdcListener);
setReportsDeps(cdcListener);

// Mount Modular Express Routers
app.use(travelersRouter);
app.use(disruptionRouter);
app.use(systemRouter);
app.use(reportsRouter);

/**
 * Server-Sent Events (SSE) Stream Endpoint for real-time dashboard UI
 */
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

  // Periodic heartbeat timer to keep socket alive and detect dead connections early
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
    } catch (_err) {
      // Ignore socket termination errors
    }
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

// Wildcard fallback to serve index.html for Single Page Application navigation
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(process.cwd(), 'src', 'web', 'public', 'index.html'));
});

// Centralized Express Error Handling Middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[CASCADE Centralized Error Handler]:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

// Port listener with fallback if occupied
function startServer(portToTry: number) {
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
