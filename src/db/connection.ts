import { Pool } from 'pg';

function buildConnectionString(): string {
  // Prefer DATABASE_URL if provided (local dev, docker-compose).
  // Fall back to building from parts (production, env vars from Secrets Manager).
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const password = process.env.DB_PASSWORD;
  const host = process.env.DB_HOST;
  const name = process.env.DB_NAME ?? 'ims_db';
  const user = process.env.DB_USER ?? 'postgres';
  const port = process.env.DB_PORT ?? '5432';

  if (!password || !host) {
    // Local dev fallback if nothing is set
    return 'postgresql://pw_user:pw_local_dev@localhost:5440/ims_db';
  }

  return `postgresql://${user}:${encodeURIComponent(password)}@${host}:${port}/${name}?sslmode=require&uselibpqcompat=true`;
}

const connectionString = buildConnectionString();

export const pool = new Pool({ connectionString });

export async function query(text: string, params?: unknown[]) {
  return pool.query(text, params);
}
