import { logger } from '../../lib/logger';

// Calls PWAS to request an appraisal for an item.
// This is the IMS -> PWAS handshake. Best-effort: a PWAS failure must not
// fail item creation. Later this direct call will be replaced by a NATS event.
const PWAS_URL = process.env.PWAS_URL ?? 'http://localhost:3001';

export async function requestAppraisal(item: Record<string, unknown>): Promise<void> {
  const payload = {
    item_id: item.id,
    icn: item.icn,
    item_snapshot: item,
  };

  const res = await fetch(`${PWAS_URL}/appraisals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PWAS responded ${res.status}: ${text}`);
  }

  logger.info({ itemId: item.id, icn: item.icn }, 'Appraisal requested from PWAS');
}
