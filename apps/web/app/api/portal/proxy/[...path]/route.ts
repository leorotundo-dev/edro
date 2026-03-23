import { NextRequest, NextResponse } from 'next/server';
import {
  EDRO_PORTAL_SESSION_COOKIE,
  getCookieConfig,
  getBackendBaseUrl,
  hasValidAccessToken,
  isSameOriginWrite,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

const PORTAL_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

function buildBackendPortalUrl(path: string[], search: string) {
  const normalizedPath = path.map((segment) => encodeURIComponent(segment)).join('/');
  return `${getBackendBaseUrl()}/api/portal/${normalizedPath}${search}`;
}

function clearPortalCookie(response: NextResponse) {
  response.cookies.set(EDRO_PORTAL_SESSION_COOKIE, '', {
    ...getCookieConfig(PORTAL_COOKIE_MAX_AGE),
    maxAge: 0,
  });
}

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
  method: string,
) {
  const token = request.cookies.get(EDRO_PORTAL_SESSION_COOKIE)?.value ?? null;
  if (!hasValidAccessToken(token)) {
    const response = NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    clearPortalCookie(response);
    return response;
  }

  if (!['GET', 'HEAD'].includes(method) && !isSameOriginWrite(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  const { path } = await params;
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');

  if (contentType) headers.set('Content-Type', contentType);
  if (accept) headers.set('Accept', accept);
  headers.set('Authorization', `Bearer ${token}`);

  const upstream = await fetch(buildBackendPortalUrl(path, request.nextUrl.search), {
    method,
    headers,
    body: ['GET', 'HEAD'].includes(method) ? undefined : await request.text(),
    cache: 'no-store',
  });

  const body = await upstream.arrayBuffer();
  const response = new NextResponse(body, {
    status: upstream.status,
    headers: {
      'Cache-Control': 'no-store',
      ...(upstream.headers.get('content-type')
        ? { 'Content-Type': upstream.headers.get('content-type')! }
        : {}),
      ...(upstream.headers.get('content-disposition')
        ? { 'Content-Disposition': upstream.headers.get('content-disposition')! }
        : {}),
    },
  });

  if (upstream.status === 401) {
    clearPortalCookie(response);
  }

  return response;
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context, 'GET');
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context, 'POST');
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context, 'PATCH');
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context, 'PUT');
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(request, context, 'DELETE');
}
