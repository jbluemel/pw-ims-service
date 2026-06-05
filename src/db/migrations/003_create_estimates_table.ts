import { pool } from '../connection';

export async function up() {
  await pool.query(`
    CREATE TABLE estimates (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      low_price NUMERIC(12, 2) NOT NULL,
      high_price NUMERIC(12, 2) NOT NULL,
      reasoning TEXT,
      model_used VARCHAR(100),
      prompt_version VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_estimates_item_id ON estimates(item_id);
    CREATE INDEX idx_estimates_created_at ON estimates(created_at DESC);
  `);
}

export async function down() {
  await pool.query(`DROP TABLE estimates`);
}
