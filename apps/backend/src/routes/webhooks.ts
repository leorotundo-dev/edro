import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { env } from '../env';
import {
  getCapturedRawBody,
  registerRawBodyCapture,
  verifyMetaWebhookSignature,
} from '../services/integrations/webhookSecurityService';
import { securityLog } from '../audit/securityLog';

function pickFirstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export default async function webhooksRoutes(app: FastifyInstance) {
  registerRawBodyCapture(app, ['/api/webhooks/whatsapp']);

  // ── WhatsApp Cloud API — webhook verification (GET challenge) ─────────────
  app.get('/webhooks/whatsapp', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request: any, reply: any) => {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = request.query as Record<string, string>;
    const expected = process.env.WHATSAPP_WEBHOOK_SECRET;
    if (expected && mode === 'subscribe' && token === expected) {
      // codeql[js/reflected-xss] Standard Meta webhook challenge — opaque numeric token echoed only after verify_token validation
      return reply.type('text/plain').send(String(challenge));
    }
    return reply.status(403).send('Forbidden');
  });

  // ── WhatsApp Cloud API — incoming messages ─────────────────────────────────
  // codeql[js/missing-rate-limiting] rate limiting applied via Fastify { config: { rateLimit: { max: 300 } } } — not recognised by CodeQL's Express sanitizer
  app.post('/webhooks/whatsapp', { config: { rateLimit: { max: 300, timeWindow: '1 minute' } } }, async (request: any, reply: any) => {
    if (env.META_APP_SECRET) {
      try {
        verifyMetaWebhookSignature(request.headers as Record<string, string | string[] | undefined>, getCapturedRawBody(request), env.META_APP_SECRET);
      } catch (error: any) {
        request.log.warn({ error: error?.message }, '[api/webhooks/whatsapp] signature verification failed');
        securityLog({ event: 'WEBHOOK_SIGNATURE_INVALID', ip: request.ip, detail: { webhook: 'whatsapp', reason: error?.message } }).catch(() => {});
        return reply.status(401).send({ error: 'invalid_signature' });
      }
    }

    // Always ack immediately — Meta expects 200 within 20s
    reply.send({ ok: true });

    try {
      const { handleWhatsAppWebhook } = await import('../services/integrations/whatsappBriefingService');
      await handleWhatsAppWebhook(request.body as any);
    } catch (err: any) {
      console.error('[api/webhooks/whatsapp] handler error:', err?.message);
    }
  });

  app.post('/webhooks/publisher', { config: { rateLimit: { max: 180, timeWindow: '1 minute' } } }, async (request: any, reply: any) => {
    const secret = String(request.headers?.authorization || '').replace('Bearer ', '');
    const expected = process.env.GATEWAY_SHARED_SECRET;
    if (!expected || secret !== expected) {
      securityLog({ event: 'WEBHOOK_SIGNATURE_INVALID', ip: request.ip, detail: { webhook: 'publisher', reason: !expected ? 'secret_not_configured' : 'secret_mismatch' } }).catch(() => {});
      return reply.status(403).send({ error: 'forbidden' });
    }

    const { jobId, status, result, error } = request.body ?? {};
    if (!jobId) {
      return reply.status(400).send({ error: 'jobId_required' });
    }

    if (status === 'published') {
      const resultPayload = result && typeof result === 'object' ? result as Record<string, any> : {};
      const bodyPayload = request.body && typeof request.body === 'object' ? request.body as Record<string, any> : {};
      const platformPostId = pickFirstString(
        resultPayload.post_id,
        resultPayload.postId,
        resultPayload.media_id,
        resultPayload.mediaId,
        resultPayload.item_id,
        resultPayload.itemId,
        resultPayload.publishId,
        resultPayload.publish_id,
        bodyPayload.post_id,
        bodyPayload.postId,
        bodyPayload.media_id,
        bodyPayload.mediaId,
        bodyPayload.item_id,
        bodyPayload.itemId,
        bodyPayload.publishId,
        bodyPayload.publish_id,
      );
      const platformPostUrl = pickFirstString(
        resultPayload.post_url,
        resultPayload.postUrl,
        resultPayload.share_url,
        resultPayload.shareUrl,
        bodyPayload.post_url,
        bodyPayload.postUrl,
        bodyPayload.share_url,
        bodyPayload.shareUrl,
      );

      await query(
        `UPDATE publish_queue
            SET status='published',
                updated_at=now(),
                error_message=NULL,
                platform_post_id = COALESCE($2, platform_post_id),
                platform_post_url = COALESCE($3, platform_post_url)
          WHERE id=$1`,
        [jobId, platformPostId, platformPostUrl]
      );
      const { rows } = await query<{ post_asset_id: string; tenant_id: string }>(
        `SELECT post_asset_id, tenant_id FROM publish_queue WHERE id=$1`,
        [jobId]
      );
      const postId = rows[0]?.post_asset_id;
      const tenantId = rows[0]?.tenant_id;
      if (postId && tenantId) {
        await query(
          `UPDATE post_assets
              SET status='published',
                  published_at=now(),
                  updated_at=now(),
                  external_post_id = COALESCE($3, external_post_id)
            WHERE id=$1 AND tenant_id=$2`,
          [postId, tenantId, platformPostId]
        );
      }
    } else {
      await query(
        `UPDATE publish_queue SET status='failed', error_message=$2, updated_at=now() WHERE id=$1`,
        [jobId, error ?? result ?? 'failed']
      );
    }

    return { ok: true };
  });
}
