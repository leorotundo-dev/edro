import { NextRequest, NextResponse } from 'next/server';
import { getBackendBaseUrl, isSameOriginWrite } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isSameOriginWrite(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  const rawBody = await request.text();
  const response = await fetch(`${getBackendBaseUrl()}/api/auth/magic-link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: rawBody,
    cache: 'no-store',
  });

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
