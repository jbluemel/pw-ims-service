import { pool } from '../../db/connection';

export async function up() {
  await pool.query(`
    ALTER TABLE items
    ADD COLUMN IF NOT EXISTS universal_id UUID DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS origin_system VARCHAR(50) DEFAULT 'IMS'
  `);
}

export async function down() {
  await pool.query(`
    ALTER TABLE items
    DROP COLUMN universal_id,
    DROP COLUMN origin_system
  `);
}