import { env } from '../env';

const DEFAULT_VERSION = 'v18.0';

function baseUrl() {
  const version = env.META_GRAPH_VERSION || DEFAULT_VERSION;
  return `https://graph.facebook.com/${version}`;
}

export async function callMetaGraph<T = any>(path: string, params: Record<string, any>) {
  const url = new URL(`${baseUrl()}/${path.replace(/^\/+/, '')}`);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    url.searchParams.set(key, String(value));
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Meta Graph error (${response.status}): ${text}`);
  }

  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { raw: text } as T;
  }
}
