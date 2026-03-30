import { NextRequest, NextResponse } from 'next/server';
import { buildBackendApiUrl, EDRO_SESSION_COOKIE } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const token = request.cookies.get(EDRO_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const res = await fetch(buildBackendApiUrl('/freelancers/portal/da-capacity'), {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });

  const data = await res.json().catch(() => ({}));
  return NextResponse.json(data, { status: res.status });
}
