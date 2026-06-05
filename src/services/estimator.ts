import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-5';
const PROMPT_VERSION = 'v1';

export interface EstimateResult {
  low_price: number;
  high_price: number;
  reasoning: string;
  model_used: string;
  prompt_version: string;
}

export interface ItemForEstimate {
  year?: number | null;
  make?: string | null;
  model?: string | null;
  description?: string | null;
  condition?: string | null;
  location?: string | null;
  mileage?: number | null;
  hours?: number | null;
}

export async function estimateValue(item: ItemForEstimate): Promise<EstimateResult> {
  const prompt = buildPrompt(item);

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('');

  const parsed = parseResponse(text);

  return {
    ...parsed,
    model_used: MODEL,
    prompt_version: PROMPT_VERSION,
  };
}

function buildPrompt(item: ItemForEstimate): string {
  const lines: string[] = [];
  if (item.year) lines.push(`Year: ${item.year}`);
  if (item.make) lines.push(`Make: ${item.make}`);
  if (item.model) lines.push(`Model: ${item.model}`);
  if (item.description) lines.push(`Description: ${item.description}`);
  if (item.condition) lines.push(`Condition: ${item.condition}`);
  if (item.location) lines.push(`Location: ${item.location}`);
  if (item.mileage) lines.push(`Mileage: ${item.mileage}`);
  if (item.hours) lines.push(`Hours: ${item.hours}`);

  return `You are an expert appraiser for heavy equipment, vehicles, and machinery sold at auction.

Estimate the auction sale value range (low and high USD) for this item. Be realistic — auction prices are typically below retail.

Item details:
${lines.join('\n')}

Respond ONLY with valid JSON in this exact format, no other text:
{"low_price": <number>, "high_price": <number>, "reasoning": "<1-3 sentences explaining the estimate>"}`;
}

function parseResponse(text: string): { low_price: number; high_price: number; reasoning: string } {
  // Strip any markdown code fences if present
  const cleaned = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  if (typeof parsed.low_price !== 'number' || typeof parsed.high_price !== 'number') {
    throw new Error('Invalid estimate response: missing or non-numeric prices');
  }

  return {
    low_price: parsed.low_price,
    high_price: parsed.high_price,
    reasoning: parsed.reasoning ?? '',
  };
}
