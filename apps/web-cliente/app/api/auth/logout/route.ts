import { NextRequest, NextResponse } from 'next/server';
import {
  CLIENT_PORTAL_COOKIE,
  getSessionCookieConfig,
  isSameOriginWrite,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOriginWrite(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(CLIENT_PORTAL_COOKIE, '', { ...getSessionCookieConfig(), maxAge: 0 });
  return response;
}
