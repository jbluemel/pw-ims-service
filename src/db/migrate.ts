import { pool } from './connection';
import { up as up001 } from './migrations/001_create_items_table';
import { up as up002 } from './migrations/002_add_universal_id';

async function migrate() {
  try {
    console.log('Running migrations...');
    
    // Skip 001 - already ran
    // await up001();
    
    await up002();
    console.log('Migration 002 completed');
    
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();