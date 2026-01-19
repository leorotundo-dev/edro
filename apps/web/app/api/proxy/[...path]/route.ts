import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3333';
const PROXY_TIMEOUT_MS = Number(process.env.PROXY_TIMEOUT_MS || 20000);
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

function buildTargetUrl(path: string, query = '') {
  const base = BACKEND_URL.replace(/\/$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const finalPath = API_SUFFIX_REGEX.test(base) || normalizedPath.startsWith('/api')
    ? normalizedPath
    : `/api${normalizedPath}`;
  return `${base}${finalPath}${query}`;
}

function buildHeaders(request: NextRequest) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }
  return headers;
}

async function readResponse(response: Response) {
  if (response.status === 204) {
    return { data: {}, status: 204 };
  }
  const text = await response.text();
  if (!text) {
    return { data: {}, status: response.status };
  }
  try {
    return { data: JSON.parse(text), status: response.status };
  } catch {
    return { data: { raw: text }, status: response.status };
  }
}

async function proxyFetch(request: NextRequest, init: RequestInit, path: string, query = '') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  try {
    const response = await fetch(buildTargetUrl(path, query), {
      ...init,
      signal: controller.signal,
    });
    return await readResponse(response);
  } catch (error) {
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path || [];
  const path = '/' + pathSegments.join('/');
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.toString() ? `?${searchParams.toString()}` : '';

  try {
    const { data, status } = await proxyFetch(
      request,
      { method: 'GET', headers: buildHeaders(request) },
      path,
      query
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    logProxyError(error);
    return buildProxyErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path || [];
  const path = '/' + pathSegments.join('/');

  try {
    const body = await request.json();
    const { data, status } = await proxyFetch(
      request,
      { method: 'POST', headers: buildHeaders(request), body: JSON.stringify(body) },
      path
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    logProxyError(error);
    return buildProxyErrorResponse(error);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path || [];
  const path = '/' + pathSegments.join('/');

  try {
    const body = await request.json();
    const { data, status } = await proxyFetch(
      request,
      { method: 'PUT', headers: buildHeaders(request), body: JSON.stringify(body) },
      path
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    logProxyError(error);
    return buildProxyErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path || [];
  const path = '/' + pathSegments.join('/');

  try {
    const body = await request.json();
    const { data, status } = await proxyFetch(
      request,
      { method: 'PATCH', headers: buildHeaders(request), body: JSON.stringify(body) },
      path
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    logProxyError(error);
    return buildProxyErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const pathSegments = params.path || [];
  const path = '/' + pathSegments.join('/');

  try {
    const { data, status } = await proxyFetch(
      request,
      { method: 'DELETE', headers: buildHeaders(request) },
      path
    );
    return NextResponse.json(data, { status });
  } catch (error) {
    logProxyError(error);
    return buildProxyErrorResponse(error);
  }
}
