import crypto from 'crypto';
import type { FastifyInstance } from 'fastify';
import { Readable } from 'stream';

type HeaderValue = string | string[] | undefined;

function firstHeaderValue(value: HeaderValue): string | undefined {
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' ? value : undefined;
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function registerRawBodyCapture(app: FastifyInstance, paths: string[]) {
  const normalizedPaths = new Set(paths);

  app.addHook('preParsing', async (request, _reply, payload) => {
    if (request.method !== 'POST') {
      return payload;
    }

    const rawUrl = request.raw.url ?? '';
    const pathname = rawUrl.split('?')[0];
    if (!normalizedPaths.has(pathname)) {
      return payload;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of payload as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const rawBodyBuffer = Buffer.concat(chunks);
    (request as any).rawBody = rawBodyBuffer.toString('utf8');
    return Readable.from([rawBodyBuffer]);
  });
}

export function getCapturedRawBody(request: any): string {
  if (typeof request.rawBody === 'string') {
    return request.rawBody;
  }
  return JSON.stringify(request.body ?? {});
}

export function verifyMetaWebhookSignature(
  headers: Record<string, HeaderValue>,
  rawBody: string,
  appSecret: string,
) {
  const signatureHeader = firstHeaderValue(headers['x-hub-signature-256'] ?? headers['X-Hub-Signature-256']);
  if (!signatureHeader) {
    throw new Error('missing_meta_signature');
  }

  const [version, signature] = signatureHeader.split('=');
  if (version !== 'sha256' || !signature) {
    throw new Error('invalid_meta_signature_format');
  }

  const expected = crypto
    .createHmac('sha256', appSecret)
    .update(rawBody, 'utf8')
    .digest('hex');

  if (!safeEqual(signature, expected)) {
    throw new Error('invalid_meta_signature');
  }
}

export function verifySharedWebhookSecret(
  headers: Record<string, HeaderValue>,
  expectedSecret: string,
  options?: {
    headerNames?: string[];
    allowBearerAuth?: boolean;
  },
) {
  const headerNames = options?.headerNames ?? ['x-webhook-secret'];

  for (const headerName of headerNames) {
    const provided = firstHeaderValue(headers[headerName] ?? headers[headerName.toLowerCase()]);
    if (provided && safeEqual(provided, expectedSecret)) {
      return;
    }
  }

  if (options?.allowBearerAuth) {
    const authHeader = firstHeaderValue(headers.authorization ?? headers.Authorization);
    const bearerPrefix = 'Bearer ';
    if (authHeader?.startsWith(bearerPrefix)) {
      const token = authHeader.slice(bearerPrefix.length).trim();
      if (token && safeEqual(token, expectedSecret)) {
        return;
      }
    }
  }

  throw new Error('invalid_webhook_secret');
}
