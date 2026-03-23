import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendApiUrl,
  EDRO_MFA_PENDING_COOKIE,
  getCookieConfig,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

function clearPendingCookie(response: NextResponse) {
  response.cookies.set(EDRO_MFA_PENDING_COOKIE, '', { ...getCookieConfig(60 * 10), maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const pendingToken = request.cookies.get(EDRO_MFA_PENDING_COOKIE)?.value ?? '';
  if (!pendingToken) {
    return clearPendingCookie(NextResponse.json({ error: 'missing_pending_token' }, { status: 401 }));
  }

  const upstream = await fetch(buildBackendApiUrl('/auth/mfa/pending'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pendingToken }),
    cache: 'no-store',
  });

  const text = await upstream.text();
  if (!upstream.ok) {
    return clearPendingCookie(new NextResponse(text, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    }));
  }

  return new NextResponse(text, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
