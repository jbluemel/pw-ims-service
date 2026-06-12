import { pool } from './connection';
import { logger } from '../lib/logger';
import { migrations } from '../domain/migrations';

// Applies pending migrations in order, tracked in schema_migrations.
// Idempotent: re-running applies only what hasn't run yet.

async function ensureTrackingTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

async function appliedIds(): Promise<Set<string>> {
  const result = await pool.query('SELECT id FROM schema_migrations');
  return new Set(result.rows.map((row) => row.id));
}

async function migrate(): Promise<void> {
  await ensureTrackingTable();
  const done = await appliedIds();
  const pending = migrations.filter((m) => !done.has(m.id));

  if (pending.length === 0) {
    logger.info('No pending migrations');
    return;
  }

  for (const migration of pending) {
    logger.info({ id: migration.id }, 'Applying migration');
    await migration.up();
    await pool.query('INSERT INTO schema_migrations (id) VALUES ($1)', [migration.id]);
  }

  logger.info({ count: pending.length }, 'Migrations complete');
}

migrate()
  .catch((error) => {
    logger.error({ err: error }, 'Migration failed');
    process.exitCode = 1;
  })
  .finally(() => pool.end());
