import { NextRequest, NextResponse } from 'next/server';
import { Buffer } from 'node:buffer';

// Increase timeout for large uploads
export const maxDuration = 60;

const DEFAULT_BACKEND_URL = 'http://localhost:3333';
const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 30000);
const API_SUFFIX_REGEX = /\/api$/i;

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

function resolveBackendBase() {
  const explicit = process.env.EDRO_BACKEND_URL?.trim();
  if (explicit && /^https?:\/\//i.test(explicit)) {
    return explicit.replace(/\/$/, '');
  }

  const railway = process.env.RAILWAY_SERVICE_EDRO_BACKEND_URL?.trim();
  if (railway) {
    return `https://${railway.replace(/\/$/, '')}`;
  }

  const publicBackend = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (publicBackend && /^https?:\/\//i.test(publicBackend)) {
    return publicBackend.replace(/\/$/, '');
  }

  const publicBase = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (publicBase && /^https?:\/\//i.test(publicBase)) {
    return publicBase.replace(/\/$/, '');
  }

  return DEFAULT_BACKEND_URL;
}

function buildTargetUrl(path: string, query = '') {
  const base = resolveBackendBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const finalPath = API_SUFFIX_REGEX.test(base) || normalizedPath.startsWith('/api')
    ? normalizedPath
    : `/api${normalizedPath}`;
  return `${base}${finalPath}${query}`;
}

function buildHeaders(request: NextRequest, bodyLength?: number) {
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === 'host' || lower === 'content-length') return;
    headers[key] = value;
  });
  if (bodyLength != null && bodyLength > 0) {
    headers['content-length'] = String(bodyLength);
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

async function proxyFetch(init: RequestInit, path: string, query = '') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    const response = await fetch(buildTargetUrl(path, query), {
      ...init,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments = [] } = await params;
  const path = '/' + pathSegments.join('/');
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';

  try {
    const response = await proxyFetch(
      { method: 'GET', headers: buildHeaders(request) },
      path,
      query
    );
    return await buildProxyResponse(response);
  } catch (error) {
    logProxyError(error);
    return buildProxyErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments = [] } = await params;
  const path = '/' + pathSegments.join('/');

  try {
    const body = await readRequestBody(request);
    const response = await proxyFetch(
      { method: 'POST', headers: buildHeaders(request, body?.byteLength), body },
      path
    );
    return await buildProxyResponse(response);
  } catch (error) {
    logProxyError(error);
    return buildProxyErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments = [] } = await params;
  const path = '/' + pathSegments.join('/');

  try {
    const body = await readRequestBody(request);
    const response = await proxyFetch(
      { method: 'PUT', headers: buildHeaders(request, body?.byteLength), body },
      path
    );
    return await buildProxyResponse(response);
  } catch (error) {
    logProxyError(error);
    return buildProxyErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments = [] } = await params;
  const path = '/' + pathSegments.join('/');

  try {
    const body = await readRequestBody(request);
    const response = await proxyFetch(
      { method: 'PATCH', headers: buildHeaders(request, body?.byteLength), body },
      path
    );
    return await buildProxyResponse(response);
  } catch (error) {
    logProxyError(error);
    return buildProxyErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: pathSegments = [] } = await params;
  const path = '/' + pathSegments.join('/');

  try {
    const response = await proxyFetch(
      { method: 'DELETE', headers: buildHeaders(request) },
      path
    );
    return await buildProxyResponse(response);
  } catch (error) {
    logProxyError(error);
    return buildProxyErrorResponse(error);
  }
}
