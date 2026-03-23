import type { NextRequest } from 'next/server';

export const CLIENT_PORTAL_COOKIE = 'edro_client_session';

const PROD_BACKEND_URL = 'https://edro-backend-production.up.railway.app';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const DEFAULT_BACKEND_URL = process.env.NODE_ENV === 'production'
  ? PROD_BACKEND_URL
  : 'http://localhost:3333';
const API_SUFFIX_REGEX = /\/api$/i;

function normalizeBackendBase(base: string) {
  const trimmed = base.replace(/\/$/, '');
  return API_SUFFIX_REGEX.test(trimmed) ? trimmed.replace(API_SUFFIX_REGEX, '') : trimmed;
}

export function getBackendBaseUrl() {
  const explicit = process.env.EDRO_BACKEND_URL?.trim();
  if (explicit && /^https?:\/\//i.test(explicit)) {
    return normalizeBackendBase(explicit);
  }

  const railway = process.env.RAILWAY_SERVICE_EDRO_BACKEND_URL?.trim();
  if (railway) {
    return `https://${railway.replace(/\/$/, '')}`;
  }

  const publicBackend = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (publicBackend && /^https?:\/\//i.test(publicBackend)) {
    return normalizeBackendBase(publicBackend);
  }

  const publicApi = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicApi && /^https?:\/\//i.test(publicApi)) {
    return normalizeBackendBase(publicApi);
  }

  return DEFAULT_BACKEND_URL;
}

export function getSessionCookieConfig() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function isPortalSessionValid(token?: string | null) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now()) {
    return false;
  }
  return true;
}

export function isSameOriginWrite(request: NextRequest) {
  const origin = request.headers.get('origin');
  return !origin || origin === request.nextUrl.origin;
}

export function buildBackendApiUrl(pathSegments: string[], search: string) {
  const cleanPath = pathSegments.map((segment) => encodeURIComponent(segment)).join('/');
  return `${getBackendBaseUrl()}/api/${cleanPath}${search}`;
}
