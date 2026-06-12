import { pool } from '../../db/connection';

export async function up() {
  await pool.query(`
    ALTER TABLE estimates
      ADD COLUMN IF NOT EXISTS item_snapshot JSONB;
  `);
}

export async function down() {
  await pool.query(`ALTER TABLE estimates DROP COLUMN item_snapshot;`);
}
