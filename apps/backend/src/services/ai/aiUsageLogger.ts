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
  'sonar': { input: 1.00, output: 1.00 },
  'sonar-pro': { input: 3.00, output: 15.00 },
  'sonar-reasoning-pro': { input: 3.00, output: 15.00 },
};

// Default pricing per provider when model not found
const PROVIDER_DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  openai: { input: 0.15, output: 0.60 },
  gemini: { input: 0.075, output: 0.30 },
  claude: { input: 3.00, output: 15.00 },
  perplexity: { input: 1.00, output: 1.00 },
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

// ── Leonardo.ai Usage Logger ─────────────────────────────────────
// Leonardo is billed per image generated (not per token).

const LEONARDO_PRICING_USD: Record<string, number> = {
  'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3': 0.012, // Phoenix 1.0
  'b24e16ff-06e3-43eb-8d33-4416c2d75876': 0.008, // Lightning XL
  'aa77f04e-3eec-4034-9c07-d0f619684628': 0.012, // Kino XL
  '1e60896f-3c26-4296-8ecc-53e2afecc132': 0.008, // Diffusion XL
};

export async function logLeonardoUsage(params: {
  tenant_id: string;
  model_id: string;
  model_alias?: string;
  num_images?: number;
  feature?: string;
  duration_ms?: number;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { tenant_id, model_id, model_alias, feature, duration_ms, metadata } = params;
  const numImages = params.num_images ?? 1;
  const pricePerImage = LEONARDO_PRICING_USD[model_id] ?? 0.010;
  const costUsd = pricePerImage * numImages;
  const costBrl = costUsd * USD_TO_BRL;
  const modelLabel = model_alias || model_id;

  await query(
    `INSERT INTO ai_usage_log
      (tenant_id, provider, model, feature, input_tokens, output_tokens, cost_usd, cost_brl, duration_ms, metadata)
     VALUES ($1, 'leonardo', $2, $3, 0, $4, $5, $6, $7, $8)`,
    [
      tenant_id,
      modelLabel,
      feature || 'image_generation',
      numImages,
      costUsd,
      costBrl,
      duration_ms || null,
      JSON.stringify({ ...metadata, num_images: numImages, model_id }),
    ]
  ).catch(() => {}); // best-effort — never block on logging
}

// ── Tavily Usage Logger ─────────────────────────────────────────
// Tavily is billed per API call, not per token.

const TAVILY_PRICING_USD: Record<string, number> = {
  'search-basic': 0.008,
  'search-advanced': 0.015,
  'extract': 0.008, // per URL extracted
};

export type TavilyOperation = 'search-basic' | 'search-advanced' | 'extract';

export async function logTavilyUsage(params: {
  tenant_id: string;
  operation: TavilyOperation;
  unit_count: number;
  feature?: string;
  duration_ms?: number;
  metadata?: Record<string, any>;
}): Promise<void> {
  const { tenant_id, operation, unit_count, feature, duration_ms, metadata } = params;
  const pricePerUnit = TAVILY_PRICING_USD[operation] ?? 0.008;
  const costUsd = pricePerUnit * unit_count;
  const costBrl = costUsd * USD_TO_BRL;

  await query(
    `INSERT INTO ai_usage_log
      (tenant_id, provider, model, feature, input_tokens, output_tokens, cost_usd, cost_brl, duration_ms, metadata)
     VALUES ($1, 'tavily', $2, $3, 0, 0, $4, $5, $6, $7)`,
    [
      tenant_id,
      operation,
      feature || 'web_intelligence',
      costUsd,
      costBrl,
      duration_ms || null,
      JSON.stringify({ ...metadata, unit_count }),
    ]
  ).catch(() => {}); // best-effort — never block on logging
}
