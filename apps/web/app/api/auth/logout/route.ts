import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendApiUrl,
  EDRO_MFA_PENDING_COOKIE,
  EDRO_REFRESH_COOKIE,
  EDRO_SESSION_COOKIE,
  getCookieConfig,
  isSameOriginWrite,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOriginWrite(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  const accessToken = request.cookies.get(EDRO_SESSION_COOKIE)?.value;
  if (accessToken) {
    await fetch(buildBackendApiUrl('/auth/logout'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    }).catch(() => null);
  }

  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(EDRO_SESSION_COOKIE, '', { ...getCookieConfig(60 * 30), maxAge: 0 });
  response.cookies.set(EDRO_REFRESH_COOKIE, '', { ...getCookieConfig(60 * 60 * 24 * 14), maxAge: 0 });
  response.cookies.set(EDRO_MFA_PENDING_COOKIE, '', { ...getCookieConfig(60 * 10), maxAge: 0 });
  return response;
}
