import { NextRequest, NextResponse } from 'next/server';
import {
  CLIENT_PORTAL_COOKIE,
  decodeJwtPayload,
  getSessionCookieConfig,
  isPortalSessionValid,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(CLIENT_PORTAL_COOKIE)?.value;
  if (!isPortalSessionValid(token)) {
    const response = NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(CLIENT_PORTAL_COOKIE, '', { ...getSessionCookieConfig(), maxAge: 0 });
    return response;
  }

  return NextResponse.json(
    { authenticated: true, user: decodeJwtPayload(token!) ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
