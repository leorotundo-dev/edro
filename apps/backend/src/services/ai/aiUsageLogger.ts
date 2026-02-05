import { query } from '../../db';

const USD_TO_BRL = 5.80;

// Prices per 1M tokens (USD)
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gemini-1.5-flash': { input: 0.075, output: 0.30 },
  'gemini-2.0-flash': { input: 0.10, output: 0.40 },
  'gemini-1.5-pro': { input: 1.25, output: 5.00 },
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
};

// Default pricing per provider when model not found
const PROVIDER_DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  openai: { input: 0.15, output: 0.60 },
  gemini: { input: 0.075, output: 0.30 },
  claude: { input: 3.00, output: 15.00 },
};

function getPricing(model: string, provider: string): { input: number; output: number } {
  // Try exact match first
  if (MODEL_PRICING[model]) return MODEL_PRICING[model];

  // Try partial match (model string might have prefix like "openai:gpt-4o-mini")
  const cleanModel = model.includes(':') ? model.split(':').pop()! : model;
  if (MODEL_PRICING[cleanModel]) return MODEL_PRICING[cleanModel];

  // Try prefix match
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (cleanModel.startsWith(key) || key.startsWith(cleanModel)) return pricing;
  }

  return PROVIDER_DEFAULT_PRICING[provider] || { input: 1.00, output: 5.00 };
}

function calculateCostUsd(
  inputTokens: number,
  outputTokens: number,
  pricing: { input: number; output: number }
): number {
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

export type AiUsageEntry = {
  tenant_id: string;
  provider: string;
  model: string;
  feature: string;
  input_tokens: number;
  output_tokens: number;
  duration_ms?: number;
  metadata?: Record<string, any>;
};

export async function logAiUsage(entry: AiUsageEntry): Promise<void> {
  const pricing = getPricing(entry.model, entry.provider);
  const costUsd = calculateCostUsd(entry.input_tokens, entry.output_tokens, pricing);
  const costBrl = costUsd * USD_TO_BRL;

  await query(
    `INSERT INTO ai_usage_log
      (tenant_id, provider, model, feature, input_tokens, output_tokens, cost_usd, cost_brl, duration_ms, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
      entry.tenant_id,
      entry.provider,
      entry.model,
      entry.feature,
      entry.input_tokens,
      entry.output_tokens,
      costUsd,
      costBrl,
      entry.duration_ms || null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ]
  );
}

/** Rough token estimate (~4 chars per token) for providers that don't return usage */
export function estimateTokens(text: string): number {
  return Math.ceil((text || '').length / 4);
}
