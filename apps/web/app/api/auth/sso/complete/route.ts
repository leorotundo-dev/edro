import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendApiUrl,
  EDRO_SESSION_COOKIE,
  getCookieConfig,
  hasValidAccessToken,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

function resolveNextPath(request: NextRequest, value: FormDataEntryValue | null) {
  const nextPath = typeof value === 'string' ? value : '';
  if (!nextPath || !nextPath.startsWith('/') || nextPath.startsWith('//') || nextPath.startsWith('/login')) {
    return new URL('/', request.url);
  }
  return new URL(nextPath, request.url);
}

async function fetchCurrentUser(accessToken: string) {
  const response = await fetch(buildBackendApiUrl('/auth/me'), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.redirect(new URL('/login?error=sso_invalid', request.url));
  }

  const token = typeof formData.get('token') === 'string' ? String(formData.get('token')) : '';
  if (!hasValidAccessToken(token)) {
    return NextResponse.redirect(new URL('/login?error=sso_invalid', request.url));
  }

  const user = await fetchCurrentUser(token);
  if (!user) {
    return NextResponse.redirect(new URL('/login?error=sso_invalid', request.url));
  }

  const response = NextResponse.redirect(resolveNextPath(request, formData.get('next')));
  response.headers.set('Cache-Control', 'no-store');
  response.cookies.set(EDRO_SESSION_COOKIE, token, getCookieConfig(60 * 60 * 24 * 14));

  return response;
}
