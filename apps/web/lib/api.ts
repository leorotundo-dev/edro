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
      return PROXY_PATH;
    }
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
  return {
    'Content-Type': 'application/json',
  };
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

  let parsed: any;
  try {
    parsed = JSON.parse(text);
  } catch {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return { raw: text } as T;
  }

  if (!response.ok) {
    const error = new Error(parsed?.error || parsed?.message || `HTTP ${response.status}`) as Error & {
      status?: number;
      code?: string;
      details?: any;
      payload?: any;
    };
    error.status = response.status;
    error.code = parsed?.error_code;
    error.details = parsed?.details;
    error.payload = parsed;
    throw error;
  }
  return parsed as T;
}

async function requestWithRefresh<T>(path: string, options: RequestInit): Promise<T> {
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: getAuthHeaders(),
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname || '/';
      const shouldRedirect = !(pathname === '/login' || pathname.startsWith('/login') || pathname === '/calendar' || pathname.startsWith('/calendar/') || pathname.startsWith('/edro/aprovacao-externa'));
      localStorage.removeItem('edro_user');
      if (shouldRedirect) {
        window.location.href = '/login';
      }
    }
  }

  if (response.status === 403) {
    const cloned = response.clone();
    const body = await cloned.json().catch(() => ({}));
    if (body?.error === 'mfa_required' && typeof window !== 'undefined') {
      localStorage.removeItem('edro_user');
      window.location.href = '/login';
      return {} as T;
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
    body: JSON.stringify(body ?? {}),
  });
}

export async function apiPostFormData<T = any>(path: string, formData: FormData): Promise<T> {
  const apiBase = getApiBase();
  const response = await fetch(`${apiBase}${path}`, {
    method: 'POST',
    body: formData,
  });
  if (response.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('edro_user');
      window.location.href = '/login';
    }
  }
  return handleResponse<T>(response);
}

export async function apiPatch<T = any>(path: string, body?: any): Promise<T> {
  return requestWithRefresh<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body ?? {}),
  });
}

export async function apiPut<T = any>(path: string, body?: any): Promise<T> {
  return requestWithRefresh<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body ?? {}),
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
