import { NextRequest, NextResponse } from 'next/server';
import {
  CLIENT_PORTAL_COOKIE,
  decodeJwtPayload,
  getBackendBaseUrl,
  getSessionCookieConfig,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const upstream = await fetch(`${getBackendBaseUrl()}/api/auth/magic-link/verify`, {
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

  if (!data?.token) {
    return NextResponse.json({ error: 'token_not_returned' }, { status: 502 });
  }

  const response = NextResponse.json(
    { ok: true, user: decodeJwtPayload(data.token) ?? null },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  );
  response.cookies.set(CLIENT_PORTAL_COOKIE, data.token, getSessionCookieConfig());
  return response;
}
