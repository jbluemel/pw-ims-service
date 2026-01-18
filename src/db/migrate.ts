import { pool } from './connection';
import { up } from './migrations/001_create_items_table';

async function migrate() {
  try {
    console.log('Running migrations...');
    await up();
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
