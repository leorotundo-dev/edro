import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendApiUrl,
  EDRO_PORTAL_SESSION_COOKIE,
  getCookieConfig,
  hasValidAccessToken,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const PORTAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function clearPortalCookie(response: NextResponse) {
  response.cookies.set(EDRO_PORTAL_SESSION_COOKIE, '', {
    ...getCookieConfig(PORTAL_COOKIE_MAX_AGE),
    maxAge: 0,
  });
}

export async function GET(request: NextRequest) {
  const token = request.cookies.get(EDRO_PORTAL_SESSION_COOKIE)?.value ?? null;
  if (!hasValidAccessToken(token)) {
    const response = NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    clearPortalCookie(response);
    return response;
  }

  const upstream = await fetch(buildBackendApiUrl('/portal/client/me'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  if (!upstream.ok) {
    const response = NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    clearPortalCookie(response);
    return response;
  }

  const text = await upstream.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: 'invalid_portal_response' }, { status: 502 });
  }

  return NextResponse.json(
    { authenticated: true, client: data?.client ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
