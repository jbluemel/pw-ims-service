import { query } from '../../db/connection';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';

// Generate a candidate ICN: 2 letters + 4 digits, e.g. "YA3456"
function randomIcn(): string {
  const l = () => LETTERS[Math.floor(Math.random() * LETTERS.length)];
  const d = () => DIGITS[Math.floor(Math.random() * DIGITS.length)];
  return `${l()}${l()}${d()}${d()}${d()}${d()}`;
}

// Generate a unique ICN, checking against the DB and retrying on collision.
export async function generateUniqueIcn(maxAttempts = 10): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = randomIcn();
    const result = await query('SELECT 1 FROM items WHERE icn = $1', [candidate]);
    if (result.rows.length === 0) {
      return candidate;
    }
  }
  throw new Error(`Failed to generate unique ICN after ${maxAttempts} attempts`);
}
