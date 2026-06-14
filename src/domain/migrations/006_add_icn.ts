import { pool } from '../../db/connection';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';

function randomIcn(): string {
  const l = () => LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const d = () => DIGITS[Math.floor(Math.random() * DIGITS.length)];
  return `${l()}${l()}${d()}${d()}${d()}${d()}`;
}

export async function up() {
  // 1. Add nullable column first (existing rows allowed to be null for now)
  await pool.query(`ALTER TABLE items ADD COLUMN IF NOT EXISTS icn VARCHAR(6);`);

  // 2. Backfill existing rows that have no ICN
  const { rows } = await pool.query(`SELECT id FROM items WHERE icn IS NULL;`);
  for (const row of rows) {
    let assigned = false;
    for (let attempt = 0; attempt < 20 && !assigned; attempt++) {
      const candidate = randomIcn();
      const exists = await pool.query(`SELECT 1 FROM items WHERE icn = $1;`, [candidate]);
      if (exists.rows.length === 0) {
        await pool.query(`UPDATE items SET icn = $1 WHERE id = $2;`, [candidate, row.id]);
        assigned = true;
      }
    }
    if (!assigned) throw new Error(`Could not assign unique ICN to item ${row.id}`);
  }

  // 3. Now enforce NOT NULL + UNIQUE
  await pool.query(`ALTER TABLE items ALTER COLUMN icn SET NOT NULL;`);
  await pool.query(`
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'items_icn_unique'
      ) THEN
        ALTER TABLE items ADD CONSTRAINT items_icn_unique UNIQUE (icn);
      END IF;
    END $$;
  `);
}

export async function down() {
  await pool.query(`ALTER TABLE items DROP CONSTRAINT IF EXISTS items_icn_unique;`);
  await pool.query(`ALTER TABLE items DROP COLUMN IF EXISTS icn;`);
}
