import { NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'edro_session';
const REFRESH_COOKIE = 'edro_refresh';

const PUBLIC_PATHS = new Set([
  '/login',
  '/privacidade',
  '/politica-de-privacidade',
  '/exclusao-de-dados',
  '/termos-de-uso',
]);
const PUBLIC_PREFIXES = ['/calendar', '/edro/aprovacao-externa', '/proposta', '/portal', '/portal/approval'];

/** Edge Runtime safe base64url decode (no Buffer) */
function decodeBase64url(segment: string): string {
  const base64 = segment.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
  return atob(padded);
}

function hasValidSessionToken(token?: string) {
  if (!token) return false;
  try {
    const [, payload] = token.split('.');
    if (!payload) return false;
    const parsed = JSON.parse(decodeBase64url(payload)) as { exp?: number };
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
  const accessToken = request.cookies.get(SESSION_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  // Authenticated = valid access token OR refresh token present
  // If only refresh token exists, let the request through — /api/auth/session will renew the access token
  const authenticated = hasValidSessionToken(accessToken) || Boolean(refreshToken);

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
