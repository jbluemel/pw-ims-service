import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-sonnet-4-5';

export interface ExtractedData {
  // Maps directly to existing items columns
  year: number | null;
  make: string | null;
  model: string | null;
  vin: string | null;
  miles: number | null;
  location_address: string | null;
  // Everything else the LLM identified
  extra_attributes: Record<string, unknown>;
}

export async function extractFromText(rawText: string): Promise<ExtractedData> {
  const prompt = `You are extracting structured equipment/vehicle data from unstructured text for an auction inventory system.

Return ONLY valid JSON in this exact format. Use null for fields you can't confidently determine from the text:

{
  "year": <number or null>,
  "make": "<string or null>",
  "model": "<string or null>",
  "vin": "<string or null>",
  "miles": <number or null>,
  "location_address": "<string or null>",
  "extra_attributes": {
    "<any other field name>": "<value>"
  }
}

Rules:
- If you can't determine a field, set it to null. Do not guess.
- Put ANYTHING ELSE you find into extra_attributes — hours, condition, attachments, serial numbers, descriptions, anything.
- Use snake_case keys in extra_attributes (e.g., "hours", "serial_number", "attachments").
- Values in extra_attributes can be strings, numbers, or arrays as appropriate.

Text to extract from:
"""
${rawText}
"""

Return ONLY the JSON object, no markdown, no explanation.`;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as { type: 'text'; text: string }).text)
    .join('');

  const cleaned = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);

  return {
    year: parsed.year ?? null,
    make: parsed.make ?? null,
    model: parsed.model ?? null,
    vin: parsed.vin ?? null,
    miles: parsed.miles ?? null,
    location_address: parsed.location_address ?? null,
    extra_attributes: parsed.extra_attributes ?? {},
  };
}
