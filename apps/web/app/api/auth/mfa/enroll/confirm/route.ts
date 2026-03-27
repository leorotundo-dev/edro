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

function clearPendingCookie(response: NextResponse) {
  response.cookies.set(EDRO_MFA_PENDING_COOKIE, '', { ...getCookieConfig(60 * 10), maxAge: 0 });
  return response;
}

export async function POST(request: NextRequest) {
  if (!isSameOriginWrite(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  const pendingToken = request.cookies.get(EDRO_MFA_PENDING_COOKIE)?.value ?? '';
  if (!pendingToken) {
    return clearPendingCookie(NextResponse.json({ error: 'missing_pending_token' }, { status: 401 }));
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const upstream = await fetch(buildBackendApiUrl('/auth/mfa/enroll/confirm'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingToken, code: body?.code }),
    cache: 'no-store',
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }

  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ error: 'invalid_auth_response' }, { status: 502 });
  }

  if (!data?.accessToken && !data?.token) {
    return NextResponse.json({ error: 'token_not_returned' }, { status: 502 });
  }

  const accessToken = data.accessToken || data.token;
  const response = NextResponse.json(
    { ok: true, user: data.user ?? null, recoveryCodes: Array.isArray(data?.recoveryCodes) ? data.recoveryCodes : [] },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(EDRO_SESSION_COOKIE, accessToken, getCookieConfig(60 * 60 * 24 * 14));
  if (data?.refreshToken) {
    response.cookies.set(EDRO_REFRESH_COOKIE, data.refreshToken, getCookieConfig(60 * 60 * 24 * 14));
  }
  clearPendingCookie(response);
  return response;
}
