import type { NextRequest } from 'next/server';

export const EDRO_SESSION_COOKIE = 'edro_session';
export const EDRO_REFRESH_COOKIE = 'edro_refresh';
export const EDRO_PORTAL_SESSION_COOKIE = 'edro_portal_session';
export const EDRO_MFA_PENDING_COOKIE = 'edro_mfa_pending';

const DEFAULT_BACKEND_URL = process.env.NODE_ENV === 'production'
  ? 'https://edro-backend-production.up.railway.app'
  : 'http://localhost:3333';
const API_SUFFIX_REGEX = /\/api$/i;

export function getBackendBaseUrl() {
  const explicit = process.env.EDRO_BACKEND_URL?.trim();
  if (explicit && /^https?:\/\//i.test(explicit)) {
    return explicit.replace(/\/$/, '');
  }

  const railway = process.env.RAILWAY_SERVICE_EDRO_BACKEND_URL?.trim();
  if (railway) {
    return `https://${railway.replace(/\/$/, '')}`;
  }

  const publicBackend = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (publicBackend && /^https?:\/\//i.test(publicBackend)) {
    return publicBackend.replace(/\/$/, '');
  }

  const publicBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicBase && /^https?:\/\//i.test(publicBase)) {
    return publicBase.replace(/\/$/, '');
  }

  return DEFAULT_BACKEND_URL;
}

export function buildBackendApiUrl(path: string) {
  const base = getBackendBaseUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const finalPath = API_SUFFIX_REGEX.test(base) || normalizedPath.startsWith('/api')
    ? normalizedPath
    : `/api${normalizedPath}`;
  return `${base}${finalPath}`;
}

export function getCookieConfig(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
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

export function hasValidAccessToken(token?: string | null) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  return typeof payload.exp !== 'number' || payload.exp * 1000 > Date.now();
}

export function extractUserId(token?: string | null) {
  const payload = token ? decodeJwtPayload(token) : null;
  return typeof payload?.sub === 'string' ? payload.sub : null;
}

export function isSameOriginWrite(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  if (origin === request.nextUrl.origin) return true;

  // Railway proxies strip https and rewrite the host header, so nextUrl.origin
  // resolves to the internal container address. Accept the forwarded public origin.
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') ?? 'https';
  if (forwardedHost) {
    const publicOrigin = `${forwardedProto}://${forwardedHost}`;
    if (origin === publicOrigin) return true;
  }

  // Also accept the explicitly configured app URL (NEXT_PUBLIC_APP_URL).
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      if (origin === new URL(appUrl).origin) return true;
    } catch {
      // ignore malformed URL
    }
  }

  return false;
}

export async function refreshAccessToken(refreshToken: string, userId: string) {
  const response = await fetch(buildBackendApiUrl('/auth/refresh'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, refreshToken }),
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const text = await response.text();
  if (!text) return null;

  try {
    const data = JSON.parse(text);
    return data?.accessToken ? data : null;
  } catch {
    return null;
  }
}
