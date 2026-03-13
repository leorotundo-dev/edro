function resolveApiUrl() {
  const explicit = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3000';
  }
  return 'https://edro-backend-production.up.railway.app';
}

const API_URL = resolveApiUrl();

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('fl_token') ?? '';
}

export function setToken(token: string) {
  localStorage.setItem('fl_token', token);
}

export function clearToken() {
  localStorage.removeItem('fl_token');
}

async function request<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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

export const apiGet  = <T = any>(path: string) => request<T>('GET', path);
export const apiPost = <T = any>(path: string, body?: unknown) => request<T>('POST', path, body);
export const apiPatch = <T = any>(path: string, body?: unknown) => request<T>('PATCH', path, body);

// SWR fetcher
export function swrFetcher(path: string) {
  return apiGet(path);
}

export function getApiBaseUrl() {
  return API_URL;
}
