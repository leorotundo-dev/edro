import { NextRequest, NextResponse } from 'next/server';
import {
  CLIENT_PORTAL_COOKIE,
  decodeJwtPayload,
  getBackendBaseUrl,
  getSessionCookieConfig,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const upstream = await fetch(`${getBackendBaseUrl()}/api/portal/token/${token}`, {
    cache: 'no-store',
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  let data: any;
  try { data = JSON.parse(text); } catch {
    return NextResponse.json({ error: 'invalid_auth_response' }, { status: 502 });
  }

  if (!data?.token) {
    return NextResponse.json({ error: 'token_not_returned' }, { status: 502 });
  }

  const response = NextResponse.json(
    { ok: true, user: decodeJwtPayload(data.token) ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(CLIENT_PORTAL_COOKIE, data.token, getSessionCookieConfig());
  return response;
}
