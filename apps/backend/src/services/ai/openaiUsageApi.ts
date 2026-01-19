type UsageAggregate = {
  model: string;
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  calls: number;
};

type UsageSummary = {
  totals: UsageAggregate;
  byModel: Record<string, UsageAggregate>;
  source: 'openai_api';
};

type CacheEntry = {
  key: string;
  expiresAt: number;
  data: UsageSummary;
};

let cache: CacheEntry | null = null;
let lastUsageError: string | null = null;

function getBaseUrl(): string {
  const base = process.env.OPENAI_USAGE_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  return base.replace(/\/+$/, '');
}

function getHeaders(): Record<string, string> {
  const apiKey = process.env.OPENAI_USAGE_KEY || process.env.OPENAI_API_KEY || '';
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  if (process.env.OPENAI_ORG_ID) {
    headers['OpenAI-Organization'] = process.env.OPENAI_ORG_ID;
  }
  if (process.env.OPENAI_PROJECT_ID) {
    headers['OpenAI-Project'] = process.env.OPENAI_PROJECT_ID;
  }
  return headers;
}

async function fetchJson(url: string) {
  const response = await fetch(url, { headers: getHeaders() });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenAI usage API failed (${response.status}): ${body}`);
  }
  return response.json();
}

function extractUsageRows(payload: any): any[] {
  if (!payload) return [];
  if (Array.isArray(payload.data)) {
    const rows: any[] = [];
    payload.data.forEach((entry: any) => {
      if (Array.isArray(entry?.results)) {
        rows.push(...entry.results);
      } else {
        rows.push(entry);
      }
    });
    return rows;
  }
  if (Array.isArray(payload.results)) return payload.results;
  return [];
}

function normalizeUsageRow(row: any): UsageAggregate {
  const promptTokens = Number(
    row?.prompt_tokens ??
      row?.input_tokens ??
      row?.n_prompt_tokens ??
      row?.n_input_tokens ??
      0
  );
  const completionTokens = Number(
    row?.completion_tokens ??
      row?.output_tokens ??
      row?.n_completion_tokens ??
      row?.n_output_tokens ??
      0
  );
  const totalTokens = Number(row?.total_tokens ?? row?.n_total_tokens ?? promptTokens + completionTokens);
  const calls = Number(row?.num_requests ?? row?.requests ?? row?.count ?? 0);
  const model = String(row?.model ?? row?.snapshot_id ?? row?.model_id ?? 'unknown');

  return {
    model,
    prompt_tokens: Number.isFinite(promptTokens) ? promptTokens : 0,
    completion_tokens: Number.isFinite(completionTokens) ? completionTokens : 0,
    total_tokens: Number.isFinite(totalTokens) ? totalTokens : promptTokens + completionTokens,
    calls: Number.isFinite(calls) ? calls : 0,
  };
}

function aggregateRows(rows: any[]): UsageSummary {
  const totals: UsageAggregate = {
    model: 'total',
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
    calls: 0,
  };
  const byModel: Record<string, UsageAggregate> = {};

  rows.forEach(row => {
    const normalized = normalizeUsageRow(row);
    totals.prompt_tokens += normalized.prompt_tokens;
    totals.completion_tokens += normalized.completion_tokens;
    totals.total_tokens += normalized.total_tokens;
    totals.calls += normalized.calls;

    const existing = byModel[normalized.model] || {
      model: normalized.model,
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      calls: 0,
    };
    existing.prompt_tokens += normalized.prompt_tokens;
    existing.completion_tokens += normalized.completion_tokens;
    existing.total_tokens += normalized.total_tokens;
    existing.calls += normalized.calls;
    byModel[normalized.model] = existing;
  });

  return { totals, byModel, source: 'openai_api' };
}

async function tryUsageEndpoints(startDate: string, endDate: string): Promise<UsageSummary | null> {
  const baseUrl = getBaseUrl();
  const endpoints = [
    `${baseUrl}/usage?date=${endDate}`,
    `${baseUrl}/usage?date=${startDate}`,
    `${baseUrl}/organization/usage/completions?start_date=${startDate}&end_date=${endDate}`,
    `${baseUrl}/organization/usage/embeddings?start_date=${startDate}&end_date=${endDate}`,
  ];

  for (const url of endpoints) {
    try {
      const payload = await fetchJson(url);
      const rows = extractUsageRows(payload);
      if (rows.length > 0) {
        lastUsageError = null;
        return aggregateRows(rows);
      }
      lastUsageError = 'OpenAI usage API returned empty data.';
    } catch (error) {
      lastUsageError = error instanceof Error ? error.message : String(error);
      console.warn('[openai-usage] Endpoint failed:', url, error);
    }
  }

  return null;
}

export async function getOpenAiUsageForPeriod(startDate: string, endDate: string): Promise<UsageSummary | null> {
  if (!process.env.OPENAI_API_KEY) return null;

  const ttlSeconds = Number(process.env.OPENAI_USAGE_CACHE_TTL_SECONDS || 300);
  const key = `${startDate}:${endDate}`;
  const now = Date.now();

  if (cache && cache.key === key && cache.expiresAt > now) {
    return cache.data;
  }

  const data = await tryUsageEndpoints(startDate, endDate);
  if (!data) return null;

  cache = {
    key,
    data,
    expiresAt: now + (Number.isFinite(ttlSeconds) ? ttlSeconds * 1000 : 300000),
  };
  return data;
}

export function getLastOpenAiUsageError(): string | null {
  return lastUsageError;
}
