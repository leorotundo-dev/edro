import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'edro_session';
const PUBLIC_PATHS = new Set(['/login']);
const PUBLIC_PREFIXES = ['/calendar', '/edro/aprovacao-externa', '/proposta', '/portal', '/portal/approval'];

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

function isPublicPath(pathname: string) {
  return (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const authenticated = hasValidSessionToken(request.cookies.get(COOKIE_NAME)?.value);

  if (pathname === '/login') {
    if (authenticated) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!authenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
