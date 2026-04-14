import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';
import {
  buildBackendApiUrl,
  EDRO_REFRESH_COOKIE,
  EDRO_SESSION_COOKIE,
  extractUserId,
  getCookieConfig,
  hasValidAccessToken,
  isSameOriginWrite,
  refreshAccessToken,
} from '@/lib/serverAuth';

// Increase timeout for AI-heavy requests (brand voice, strategic brief, etc.)
export const maxDuration = 120;

const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 90000);

function isAbortError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'AbortError'
  );
}

function logProxyError(error: unknown) {
  if (isAbortError(error)) {
    console.log('Proxy request aborted');
    return;
  }
  console.error('Proxy error:', error);
}

function buildProxyErrorResponse(error: unknown) {
  if (isAbortError(error)) {
    return NextResponse.json({ error: 'Proxy request timed out' }, { status: 504 });
  }
  return NextResponse.json({ error: 'Proxy request failed' }, { status: 500 });
}

function isEventStreamRequest(request: NextRequest, path: string) {
  const accept = request.headers.get('accept') || '';
  return accept.includes('text/event-stream') || path === '/notifications/stream';
}

function buildHeaders(request: NextRequest, accessToken?: string | null, bodyLength?: number) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'content-length' || lower === 'cookie' || lower === 'authorization') return;
    headers[key] = value;
  });
  if (bodyLength != null && bodyLength > 0) {
    headers['content-length'] = String(bodyLength);
  }
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

function isJsonResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') || contentType.includes('+json');
}

async function buildProxyResponse(response: Response) {
  if (response.status === 204) {
    return NextResponse.json({}, { status: 204 });
  }

  if (isJsonResponse(response)) {
    const text = await response.text();
    if (!text) {
      return NextResponse.json({}, { status: response.status });
    }
    try {
      const data = JSON.parse(text);
      return NextResponse.json(data, { status: response.status });
    } catch {
      return NextResponse.json({ raw: text }, { status: response.status });
    }
  }

  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('content-length');
  return new NextResponse(response.body, { status: response.status, headers });
}

async function readRequestBody(request: NextRequest) {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const buffer = await request.arrayBuffer();
  return buffer.byteLength ? Buffer.from(buffer) : undefined;
}

async function proxyFetch(init: RequestInit, path: string, query = '', timeoutMs = PROXY_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(`${buildBackendApiUrl(path)}${query}`, {
      ...init,
      signal: controller.signal,
    });
    return response;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function executeProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
  method: string,
) {
  if (!['GET', 'HEAD'].includes(method) && !isSameOriginWrite(request)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }

  const { path: pathSegments = [] } = await params;
  const path = '/' + pathSegments.join('/');
  const query = request.nextUrl.searchParams.toString()
    ? `?${request.nextUrl.searchParams.toString()}`
    : '';
  const body = await readRequestBody(request);
  const timeoutMs = isEventStreamRequest(request, path) ? 0 : PROXY_TIMEOUT_MS;

  const accessToken = request.cookies.get(EDRO_SESSION_COOKIE)?.value ?? null;
  const refreshToken = request.cookies.get(EDRO_REFRESH_COOKIE)?.value ?? null;

  const runUpstream = (token?: string | null) =>
    proxyFetch(
      {
        method,
        headers: buildHeaders(request, token, body?.byteLength),
        body,
      },
      path,
      query,
      timeoutMs,
    );

  try {
    let upstream = await runUpstream(accessToken);
    let refreshed: any = null;

    if (upstream.status === 401 && refreshToken) {
      const userId = extractUserId(accessToken);
      if (userId) {
        refreshed = await refreshAccessToken(refreshToken, userId);
      }
      if (refreshed?.accessToken) {
        upstream = await runUpstream(refreshed.accessToken);
      }
    }

    const response = await buildProxyResponse(upstream);
    if (refreshed?.accessToken) {
      response.cookies.set(EDRO_SESSION_COOKIE, refreshed.accessToken, getCookieConfig(60 * 30));
    }
    if (refreshed?.refreshToken) {
      response.cookies.set(EDRO_REFRESH_COOKIE, refreshed.refreshToken, getCookieConfig(60 * 60 * 24 * 14));
    }
    if (upstream.status === 401) {
      response.cookies.set(EDRO_SESSION_COOKIE, '', { ...getCookieConfig(60 * 30), maxAge: 0 });
      response.cookies.set(EDRO_REFRESH_COOKIE, '', { ...getCookieConfig(60 * 60 * 24 * 14), maxAge: 0 });
    }
    return response;
  } catch (error) {
    logProxyError(error);
    return buildProxyErrorResponse(error);
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return executeProxy(request, context, 'GET');
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return executeProxy(request, context, 'POST');
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return executeProxy(request, context, 'PUT');
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return executeProxy(request, context, 'PATCH');
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return executeProxy(request, context, 'DELETE');
}
