import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://pw_user:pw_local_dev@localhost:5440/ims_db';

export const pool = new Pool({ connectionString });

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}
