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

  const rawBody = await request.text();
  const upstream = await fetch(buildBackendApiUrl('/auth/verify'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody,
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

  if (data?.pendingToken && (data?.mfaRequired || data?.mfaEnrollmentRequired)) {
    const response = NextResponse.json(
      {
        ok: true,
        user: data.user ?? null,
        mfaRequired: Boolean(data.mfaRequired),
        mfaEnrollmentRequired: Boolean(data.mfaEnrollmentRequired),
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
    response.cookies.set(EDRO_MFA_PENDING_COOKIE, data.pendingToken, getCookieConfig(60 * 10));
    response.cookies.set(EDRO_SESSION_COOKIE, '', { ...getCookieConfig(60 * 30), maxAge: 0 });
    response.cookies.set(EDRO_REFRESH_COOKIE, '', { ...getCookieConfig(60 * 60 * 24 * 14), maxAge: 0 });
    return response;
  }

  if (!data?.accessToken && !data?.token) {
    return NextResponse.json({ error: 'token_not_returned' }, { status: 502 });
  }

  const accessToken = data.accessToken || data.token;
  const response = NextResponse.json(
    { ok: true, user: data.user ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );

  response.cookies.set(EDRO_SESSION_COOKIE, accessToken, getCookieConfig(60 * 60 * 24 * 14));
  response.cookies.set(EDRO_MFA_PENDING_COOKIE, '', { ...getCookieConfig(60 * 10), maxAge: 0 });
  if (data?.refreshToken) {
    response.cookies.set(EDRO_REFRESH_COOKIE, data.refreshToken, getCookieConfig(60 * 60 * 24 * 14));
  }

  return response;
}
