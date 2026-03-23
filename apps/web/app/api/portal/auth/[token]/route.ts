import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendApiUrl,
  EDRO_PORTAL_SESSION_COOKIE,
  getCookieConfig,
  hasValidAccessToken,
  isSameOriginWrite,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const PORTAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (!isSameOriginWrite(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  const upstream = await fetch(buildBackendApiUrl(`/portal/token/${encodeURIComponent(token)}`), {
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

  if (!hasValidAccessToken(data?.token)) {
    return NextResponse.json({ error: 'token_not_returned' }, { status: 502 });
  }

  const response = NextResponse.json(
    { ok: true, clientName: typeof data?.clientName === 'string' ? data.clientName : '' },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(EDRO_PORTAL_SESSION_COOKIE, data.token, getCookieConfig(PORTAL_COOKIE_MAX_AGE));
  return response;
}
