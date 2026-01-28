const RAW_API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/proxy';
const API_SUFFIX_REGEX = /\/api$/i;
const PROXY_PATH = '/api/proxy';

function normalizeApiBase(base: string) {
  if (base.startsWith('/')) {
    return base;
  }
  const trimmed = base.replace(/\/$/, '');
  return API_SUFFIX_REGEX.test(trimmed) ? trimmed : `${trimmed}/api`;
}

function normalizeBackendBase(base: string) {
  const trimmed = base.replace(/\/$/, '');
  return API_SUFFIX_REGEX.test(trimmed) ? trimmed.replace(API_SUFFIX_REGEX, '') : trimmed;
}

function resolveApiBase() {
  const raw = RAW_API_URL || PROXY_PATH;
  if (typeof window !== 'undefined') {
    if (/^https?:\/\//i.test(raw)) {
      try {
        const url = new URL(raw);
        if (url.origin === window.location.origin) {
          return PROXY_PATH;
        }
      } catch {
        // fall through to normalization
      }
    } else if (raw.startsWith('/')) {
      if (raw === PROXY_PATH || raw.startsWith(`${PROXY_PATH}/`)) {
        return PROXY_PATH;
      }
    }
  }
  return normalizeApiBase(raw);
}

function resolveBackendBase() {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (explicit && /^https?:\/\//i.test(explicit)) {
    return normalizeBackendBase(explicit);
  }
  return normalizeBackendBase(RAW_API_URL);
}

export function getApiBase() {
  return resolveApiBase();
}

export function getBackendBase() {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (explicit && /^https?:\/\//i.test(explicit)) {
    return normalizeBackendBase(explicit);
  }
  if (/^https?:\/\//i.test(RAW_API_URL)) {
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(RAW_API_URL);
        if (url.origin === window.location.origin) {
          return window.location.origin;
        }
      } catch {
        return normalizeBackendBase(RAW_API_URL);
      }
    }
    return normalizeBackendBase(RAW_API_URL);
  }
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function buildApiUrl(path: string) {
  const base = getApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const baseHasApi = API_SUFFIX_REGEX.test(base) || base.endsWith(PROXY_PATH);
  const finalPath = baseHasApi && normalizedPath.startsWith('/api/')
    ? normalizedPath.replace(/^\/api/, '')
    : normalizedPath;

  if (base.startsWith('/')) {
    if (typeof window === 'undefined') {
      return `${base}${finalPath}`;
    }
    return `${window.location.origin}${base}${finalPath}`;
  }

  return `${base}${finalPath}`;
}

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

function getAuthHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('edro_token');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

async function refreshAccessToken(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const refreshToken = localStorage.getItem('edro_refresh');
  const userRaw = localStorage.getItem('edro_user');
  if (!refreshToken || !userRaw) return false;

  try {
    const user = JSON.parse(userRaw);
    if (!user?.id) return false;

    const response = await fetch(`${getApiBase()}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, refreshToken }),
    });

    const text = await response.text();
    if (!response.ok) return false;
    const data = JSON.parse(text);

    if (data?.accessToken) {
      localStorage.setItem('edro_token', data.accessToken);
    }
    if (data?.refreshToken) {
      localStorage.setItem('edro_refresh', data.refreshToken);
    }
    return true;
  } catch {
    return false;
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return {} as T;
  }

  const text = await response.text();
  if (!text) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return {} as T;
  }

  try {
    const parsed = JSON.parse(text) as T & { error?: string; message?: string };
    if (!response.ok) {
      throw new Error(parsed.error || parsed.message || `HTTP ${response.status}`);
    }
    return parsed as T;
  } catch (error) {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return { raw: text } as T;
  }
}

async function requestWithRefresh<T>(path: string, options: RequestInit): Promise<T> {
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      const retry = await fetch(`${apiBase}${path}`, {
        ...options,
        headers: getAuthHeaders(),
      });
      return handleResponse<T>(retry);
    }

    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname || '/';
      const shouldRedirect = !(pathname === '/calendar' || pathname.startsWith('/calendar/'));
      localStorage.removeItem('edro_token');
      localStorage.removeItem('edro_refresh');
      localStorage.removeItem('edro_user');
      if (shouldRedirect) {
        window.location.href = '/login';
      }
    }
  }

  return handleResponse<T>(response);
}

export async function apiGet<T = any>(path: string): Promise<T> {
  return requestWithRefresh<T>(path, { method: 'GET' });
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  return requestWithRefresh<T>(path, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiPatch<T = any>(path: string, body?: any): Promise<T> {
  return requestWithRefresh<T>(path, {
    method: 'PATCH',
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  return requestWithRefresh<T>(path, { method: 'DELETE' });
}

export const api = {
  get: apiGet,
  post: apiPost,
  patch: apiPatch,
  delete: apiDelete,
};
