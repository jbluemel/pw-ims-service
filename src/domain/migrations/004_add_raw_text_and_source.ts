import { pool } from '../../db/connection';

export async function up() {
  await pool.query(`
    ALTER TABLE items
      ADD COLUMN IF NOT EXISTS raw_text TEXT,
      ADD COLUMN IF NOT EXISTS extra_attributes JSONB;
  `);

  await pool.query(`
    ALTER TABLE estimates
      ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'llm_external';
  `);

  // Backfill existing rows to be explicit
  await pool.query(`
    UPDATE estimates SET source = 'llm_external' WHERE source IS NULL;
  `);
}

export async function down() {
  await pool.query(`ALTER TABLE estimates DROP COLUMN source;`);
  await pool.query(`ALTER TABLE items DROP COLUMN raw_text, DROP COLUMN extra_attributes;`);
}
