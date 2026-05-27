import { pool } from '../connection';

export async function up() {
  await pool.query(`
    ALTER TABLE items
    ADD COLUMN icn VARCHAR(50)
  `);
}

export async function down() {
  await pool.query(`
    ALTER TABLE items
    DROP COLUMN icn
  `);
}