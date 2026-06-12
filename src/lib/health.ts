import { pool } from '../db/connection';

// Liveness = "the process is up" (no dependencies checked).
// Readiness = "the process can serve traffic" (dependencies reachable).
// k8s uses these for different probes.

export async function checkReadiness(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
