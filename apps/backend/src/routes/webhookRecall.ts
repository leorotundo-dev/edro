import { FastifyInstance } from 'fastify';
import { Readable } from 'stream';
import {
  ingestRecallWebhook,
  isRecallWebhookVerificationConfigured,
  processRecallWebhookEvent,
  verifyRecallWebhookSignature,
} from '../services/integrations/recallWebhookService';
import { env } from '../env';
import { securityLog } from '../audit/securityLog';

export default async function webhookRecallRoutes(app: FastifyInstance) {
  app.addHook('preParsing', async (request, _reply, payload) => {
    if (request.raw.url !== '/webhook/recall') {
      return payload;
    }

    const chunks: Buffer[] = [];
    for await (const chunk of payload as any) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const rawBody = Buffer.concat(chunks).toString('utf8');
    (request as any).rawBody = rawBody;
    return Readable.from([rawBody]);
  });

  app.post('/webhook/recall', { config: { rateLimit: { max: 300, timeWindow: '1 minute' } } }, async (request, reply) => {
    const rawBody = typeof (request as any).rawBody === 'string'
      ? (request as any).rawBody
      : JSON.stringify(request.body ?? {});

    const normalizedHeaders = Object.fromEntries(
      Object.entries(request.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(',') : (value ?? undefined),
      ]),
    ) as Record<string, string | undefined>;

    if (!isRecallWebhookVerificationConfigured()) {
      securityLog({ event: 'WEBHOOK_SIGNATURE_INVALID', ip: request.ip, detail: { webhook: 'recall', reason: 'secret_not_configured' } }).catch(() => {});
      return reply.code(401).send({ error: 'invalid_signature' });
    }
    try {
      verifyRecallWebhookSignature(normalizedHeaders, rawBody, env.RECALL_WEBHOOK_SECRET!);
    } catch (error: any) {
      request.log.warn({ error: error?.message }, '[webhookRecall] signature verification failed');
      securityLog({ event: 'WEBHOOK_SIGNATURE_INVALID', ip: request.ip, detail: { webhook: 'recall', reason: error?.message } }).catch(() => {});
      return reply.code(401).send({ error: 'invalid_signature' });
    }

    let payload: any;
    try {
      payload = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return reply.code(400).send({ error: 'invalid_json' });
    }

    const ingested = await ingestRecallWebhook({
      headers: normalizedHeaders,
      rawBody,
      payload,
    });

    reply.code(200).send({ received: true, duplicate: ingested.duplicate });

    if (!ingested.duplicate) {
      void processRecallWebhookEvent(ingested.id).catch((error: any) => {
        request.log.error({ error: error?.message, webhookEventId: ingested.id }, '[webhookRecall] processing failed');
      });
    }
  });
}
