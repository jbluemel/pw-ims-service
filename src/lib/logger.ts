import pino from 'pino';
import { config } from '../config';

// Structured JSON logging. One logger for the whole process.
// JSON lines are what Datadog (and most log pipelines) expect — no pretty
// printing in prod. Log level is env-driven so we can turn up detail without
// a redeploy of code.
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (config.nodeEnv === 'production' ? 'info' : 'debug'),
});
