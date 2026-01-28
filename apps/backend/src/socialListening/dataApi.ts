import { env } from '../env';

const DEFAULT_TIMEOUT_MS = 20000;

function resolveBaseUrl() {
  const explicit = env.SOCIAL_DATA_API_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  return '';
}

function resolveApiKey() {
  return env.SOCIAL_DATA_API_KEY || '';
}

export async function callDataApi(
  endpoint: string,
  options: {
    query?: Record<string, any>;
    body?: any;
    method?: 'GET' | 'POST';
    timeoutMs?: number;
  } = {}
) {
  const baseUrl = resolveBaseUrl();
  const apiKey = resolveApiKey();
  if (!baseUrl || !apiKey) {
    throw new Error('SOCIAL_DATA_API_NOT_CONFIGURED');
  }

  const cleanedEndpoint = endpoint.replace(/^\/+/, '');
  const url = new URL(`${baseUrl}/${cleanedEndpoint}`);
  if (options.query) {
    Object.entries(options.query).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }

  const method = options.method || (options.body ? 'POST' : 'GET');
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'x-api-key': apiKey,
      },
      body: method === 'POST' ? JSON.stringify(options.body ?? {}) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Social Data API error (${response.status}): ${text}`);
    }

    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } finally {
    clearTimeout(timeoutId);
  }
}
