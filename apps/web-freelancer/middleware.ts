import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'edro_freelancer_session';

function hasValidSessionToken(token?: string) {
  if (!token) return false;
  try {
    const [, payload] = token.split('.');
    if (!payload) return false;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { exp?: number };
    return typeof parsed.exp !== 'number' || parsed.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const authenticated = hasValidSessionToken(token);
  const { pathname } = request.nextUrl;

  if (pathname === '/login') {
    if (authenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (!authenticated) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
