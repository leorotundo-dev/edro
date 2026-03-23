import { NextRequest, NextResponse } from 'next/server';
import {
  decodeJwtPayload,
  FREELANCER_PORTAL_COOKIE,
  getSessionCookieConfig,
  isPortalSessionValid,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(FREELANCER_PORTAL_COOKIE)?.value;
  if (!isPortalSessionValid(token)) {
    const response = NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(FREELANCER_PORTAL_COOKIE, '', { ...getSessionCookieConfig(), maxAge: 0 });
    return response;
  }

  return NextResponse.json(
    { authenticated: true, user: decodeJwtPayload(token!) ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
