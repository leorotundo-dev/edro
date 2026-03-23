import { NextRequest, NextResponse } from 'next/server';
import {
  EDRO_PORTAL_SESSION_COOKIE,
  getCookieConfig,
  isSameOriginWrite,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const PORTAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  if (!isSameOriginWrite(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  response.cookies.set(EDRO_PORTAL_SESSION_COOKIE, '', {
    ...getCookieConfig(PORTAL_COOKIE_MAX_AGE),
    maxAge: 0,
  });
  return response;
}
