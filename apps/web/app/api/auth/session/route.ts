import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendApiUrl,
  decodeJwtPayload,
  EDRO_REFRESH_COOKIE,
  EDRO_SESSION_COOKIE,
  extractUserId,
  getCookieConfig,
  hasValidAccessToken,
  isSameOriginWrite,
  refreshAccessToken,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

async function fetchCurrentUser(accessToken: string) {
  const response = await fetch(buildBackendApiUrl('/auth/me'), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  let accessToken = request.cookies.get(EDRO_SESSION_COOKIE)?.value ?? null;
  const refreshToken = request.cookies.get(EDRO_REFRESH_COOKIE)?.value ?? null;
  let refreshed: any = null;

  if (!hasValidAccessToken(accessToken) && refreshToken) {
    const userId = extractUserId(accessToken);
    if (userId) {
      refreshed = await refreshAccessToken(refreshToken, userId);
      accessToken = refreshed?.accessToken ?? null;
    }
  }

  if (!hasValidAccessToken(accessToken)) {
    const response = NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(EDRO_SESSION_COOKIE, '', { ...getCookieConfig(60 * 30), maxAge: 0 });
    response.cookies.set(EDRO_REFRESH_COOKIE, '', { ...getCookieConfig(60 * 60 * 24 * 14), maxAge: 0 });
    return response;
  }

  const user = await fetchCurrentUser(accessToken!);
  if (!user) {
    const response = NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(EDRO_SESSION_COOKIE, '', { ...getCookieConfig(60 * 30), maxAge: 0 });
    response.cookies.set(EDRO_REFRESH_COOKIE, '', { ...getCookieConfig(60 * 60 * 24 * 14), maxAge: 0 });
    return response;
  }

  const response = NextResponse.json(
    { authenticated: true, user, tokenPayload: decodeJwtPayload(accessToken!) ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );

  // Always renew the session cookie (rolling session) so the browser-side expiry resets on every visit.
  // This also ensures an expired-JWT-but-valid-cookie stays alive for the refresh flow.
  response.cookies.set(
    EDRO_SESSION_COOKIE,
    refreshed?.accessToken ?? accessToken!,
    getCookieConfig(60 * 60 * 24 * 14),
  );
  if (refreshed?.refreshToken) {
    response.cookies.set(EDRO_REFRESH_COOKIE, refreshed.refreshToken, getCookieConfig(60 * 60 * 24 * 14));
  }

  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginWrite(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const token = typeof body?.token === 'string' ? body.token : '';
  if (!hasValidAccessToken(token)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const user = await fetchCurrentUser(token);
  if (!user) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 401 });
  }

  const response = NextResponse.json(
    { ok: true, user, tokenPayload: decodeJwtPayload(token) ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(EDRO_SESSION_COOKIE, token, getCookieConfig(60 * 60 * 24 * 14));
  return response;
}
