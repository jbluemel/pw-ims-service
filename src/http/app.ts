import express from 'express';
import itemsRouter from '../domain/items/items.routes';
import { checkReadiness } from '../lib/health';

// Builds the Express app (skeleton only — no auth/cors/rate-limiting;
// those are cross-cutting concerns owned by the edge/gateway).
// `trust proxy` stays: the service cooperates with the proxy in front of it
// by trusting X-Forwarded-* headers.
export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(express.json());

  // Liveness: process is up.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Readiness: dependencies reachable.
  app.get('/ready', async (_req, res) => {
    const ok = await checkReadiness();
    res.status(ok ? 200 : 503).json({ status: ok ? 'ready' : 'not_ready' });
  });

  // Business routes.
  app.use('/items', itemsRouter);

  return app;
}
