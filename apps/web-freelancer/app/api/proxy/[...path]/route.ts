import { NextRequest, NextResponse } from 'next/server';
import {
  buildBackendApiUrl,
  FREELANCER_PORTAL_COOKIE,
  getSessionCookieConfig,
  isPortalSessionValid,
  isSameOriginWrite,
} from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
  method: string,
) {
  const token = request.cookies.get(FREELANCER_PORTAL_COOKIE)?.value;
  if (!isPortalSessionValid(token)) {
    const response = NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    response.cookies.set(FREELANCER_PORTAL_COOKIE, '', { ...getSessionCookieConfig(), maxAge: 0 });
    return response;
  }

  if (!['GET', 'HEAD'].includes(method) && !isSameOriginWrite(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  const { path } = await params;
  const backendUrl = buildBackendApiUrl(path, request.nextUrl.search);
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  const accept = request.headers.get('accept');

  if (contentType) headers.set('Content-Type', contentType);
  if (accept) headers.set('Accept', accept);
  headers.set('Authorization', `Bearer ${token}`);

  const upstream = await fetch(backendUrl, {
    method,
    headers,
    body: ['GET', 'HEAD'].includes(method) ? undefined : Buffer.from(await request.arrayBuffer()),
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
    response.cookies.set(FREELANCER_PORTAL_COOKIE, '', { ...getSessionCookieConfig(), maxAge: 0 });
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
