import { pool } from '../../db/connection';
import { EstimateResult } from '../ai/estimator';

export interface EstimateRow {
  id: string;
  item_id: string;
  low_price: number;
  high_price: number;
  reasoning: string;
  model_used: string;
  prompt_version: string;
  item_snapshot: any;
  created_at: Date;
}

export async function insertEstimate(
  itemId: string,
  estimate: EstimateResult,
  snapshot: any
): Promise<EstimateRow> {
  const result = await pool.query(
    `INSERT INTO estimates (item_id, low_price, high_price, reasoning, model_used, prompt_version, item_snapshot)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      itemId,
      estimate.low_price,
      estimate.high_price,
      estimate.reasoning,
      estimate.model_used,
      estimate.prompt_version,
      JSON.stringify(snapshot),
    ]
  );
  return result.rows[0];
}

export async function listEstimatesForItem(itemId: string): Promise<EstimateRow[]> {
  const result = await pool.query(
    `SELECT * FROM estimates WHERE item_id = $1 ORDER BY created_at DESC`,
    [itemId]
  );
  return result.rows;
}

export async function getLatestEstimate(itemId: string): Promise<EstimateRow | null> {
  const result = await pool.query(
    `SELECT * FROM estimates WHERE item_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [itemId]
  );
  return result.rows[0] ?? null;
}