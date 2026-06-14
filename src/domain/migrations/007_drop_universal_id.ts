import { pool } from '../../db/connection';

// Drop universal_id: redundant now that the UUID primary key (id) serves
// as the cross-system identifier. origin_system is kept (useful for provenance).
export async function up() {
  await pool.query(`ALTER TABLE items DROP COLUMN IF EXISTS universal_id;`);
}

export async function down() {
  await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS universal_id UUID DEFAULT gen_random_uuid();`);
}
