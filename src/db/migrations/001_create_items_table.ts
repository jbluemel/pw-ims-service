import { pool } from '../connection';

export async function up() {
  await pool.query(`
    CREATE TABLE items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

      -- Core fields
      year INTEGER,
      make VARCHAR(255),
      model VARCHAR(255),
      vin VARCHAR(255),
      miles INTEGER,
      location_address VARCHAR(255),
      seller_account_number VARCHAR(255),

      -- Status fields
      data_capture_status VARCHAR(50) CHECK (data_capture_status IN ('todo', 'in_progress', 'complete')),
      title_received BOOLEAN DEFAULT false,
      seller_name_matches BOOLEAN DEFAULT false,
      lien_search BOOLEAN DEFAULT false,
      clean_title_check BOOLEAN DEFAULT false,
      odometer_reading_check BOOLEAN DEFAULT false,
      review_status VARCHAR(50) CHECK (review_status IN ('todo', 'in_progress', 'complete')),
      published BOOLEAN DEFAULT false,

      -- Timestamps
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function down() {
  await pool.query('DROP TABLE IF EXISTS items');
}
