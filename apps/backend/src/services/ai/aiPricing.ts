type PricingPerToken = {
  input?: number;
  output?: number;
};

type PricingOverride = {
  input?: number;
  output?: number;
};

const DEFAULT_PRICING_PER_TOKEN: Record<string, PricingPerToken> = {
  // Pricing per token (USD / token). Defaults align with admin-costs-real.
  'gpt-4o-mini': { input: 0.15 / 1_000_000, output: 0.6 / 1_000_000 },
  'text-embedding-3-small': { input: 0.02 / 1_000_000 },
};

let cachedOverrides: Record<string, PricingPerToken> | null = null;

function loadOverrides(): Record<string, PricingPerToken> {
  if (cachedOverrides) return cachedOverrides;
  const raw = process.env.OPENAI_PRICING_PER_1M;
  if (!raw) {
    cachedOverrides = {};
    return cachedOverrides;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, PricingOverride>;
    const normalized: Record<string, PricingPerToken> = {};
    for (const [model, value] of Object.entries(parsed)) {
      normalized[model.toLowerCase()] = {
        input: typeof value.input === 'number' ? value.input / 1_000_000 : undefined,
        output: typeof value.output === 'number' ? value.output / 1_000_000 : undefined,
      };
    }
    cachedOverrides = normalized;
    return cachedOverrides;
  } catch (err) {
    console.warn('[ai-pricing] Invalid OPENAI_PRICING_PER_1M JSON, ignoring overrides.');
    cachedOverrides = {};
    return cachedOverrides;
  }
}

export function getPricingForModel(model?: string | null): PricingPerToken {
  const key = (model || '').toLowerCase();
  const overrides = loadOverrides();
  return overrides[key] || DEFAULT_PRICING_PER_TOKEN[key] || {};
}

export function estimateAiCostUsd(params: {
  model?: string;
  type: 'completion' | 'embedding';
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}): number {
  const pricing = getPricingForModel(params.model);
  const promptTokens = params.promptTokens || 0;
  const completionTokens =
    params.completionTokens !== undefined
      ? params.completionTokens || 0
      : Math.max(0, (params.totalTokens || 0) - promptTokens);

  if (params.type === 'embedding') {
    const tokens = promptTokens || params.totalTokens || 0;
    return tokens * (pricing.input || 0);
  }

  return (promptTokens * (pricing.input || 0)) + (completionTokens * (pricing.output || 0));
}

export function getKnownPricing(): Record<string, PricingPerToken> {
  return {
    ...DEFAULT_PRICING_PER_TOKEN,
    ...loadOverrides(),
  };
}

export default {
  getPricingForModel,
  estimateAiCostUsd,
  getKnownPricing,
};
