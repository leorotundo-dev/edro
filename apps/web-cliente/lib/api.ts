export function setToken(_token: string) {}

export function clearToken() {}

async function request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/proxy${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  try { return JSON.parse(text); } catch { return text as any; }
}

export const apiGet   = <T = any>(path: string) => request<T>('GET', path);
export const apiPost  = <T = any>(path: string, body?: unknown) => request<T>('POST', path, body);
export const apiPatch = <T = any>(path: string, body?: unknown) => request<T>('PATCH', path, body);

export function swrFetcher(path: string) {
  return apiGet(path);
}
