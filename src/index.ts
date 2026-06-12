import { createApp } from './http/app';
import { config } from './config';
import { pool } from './db/connection';
import { logger } from './lib/logger';

const app = createApp();

const server = app.listen(config.port, () => {
  logger.info({ port: config.port }, 'Server running');
});

// Graceful shutdown: stop accepting connections, drain the DB pool, then exit.
// k8s sends SIGTERM on rolling deploys; we want in-flight requests to finish.
async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down');
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, config.shutdownTimeoutMs).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
