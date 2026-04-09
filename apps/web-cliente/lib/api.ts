export function setToken(_token: string) {}

export function clearToken() {}

async function request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const hasJsonBody = body !== undefined;
  const res = await fetch(`/api/proxy${path}`, {
    method,
    headers: hasJsonBody ? { 'Content-Type': 'application/json' } : undefined,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });

  if (res.status === 401) {
    throw new Error('Unauthorized');
  }

  const text = await res.text();
  if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
  try { return JSON.parse(text); } catch { return text as any; }
}

export const apiGet    = <T = any>(path: string) => request<T>('GET', path);
export const apiPost   = <T = any>(path: string, body?: unknown) => request<T>('POST', path, body);
export const apiPatch  = <T = any>(path: string, body?: unknown) => request<T>('PATCH', path, body);
export const apiDelete = <T = any>(path: string) => request<T>('DELETE', path);

export function swrFetcher(path: string) {
  return apiGet(path);
}
