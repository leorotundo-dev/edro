/**
 * webhookWhatsApp.ts
 *
 * WhatsApp Cloud API webhook routes:
 *   GET  /webhook/whatsapp  — challenge verification (Meta setup)
 *   POST /webhook/whatsapp  — incoming message events
 *
 * Public — no authGuard (Meta calls this directly).
 * Security: verify_token checked on GET; POST payload signature validated.
 */
import type { FastifyInstance } from 'fastify';
import { query } from '../db/db';
import { decryptJSON } from '../security/secrets';
import { env } from '../env';
import {
  getCapturedRawBody,
  registerRawBodyCapture,
  verifyMetaWebhookSignature,
} from '../services/integrations/webhookSecurityService';

export default async function webhookWhatsAppRoutes(app: FastifyInstance) {
  registerRawBodyCapture(app, ['/webhook/whatsapp']);

  // ── GET: Meta webhook verification ──────────────────────────────────────────
  app.get('/webhook/whatsapp', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request: any, reply: any) => {
    const mode      = request.query['hub.mode'];
    const token     = request.query['hub.verify_token'];
    const challenge = request.query['hub.challenge'];

    if (mode !== 'subscribe') {
      return reply.status(400).send('Invalid mode');
    }

    // Find a connector whose verify_token matches
    const { rows } = await query(
      `SELECT secrets_enc FROM connectors WHERE provider = 'whatsapp' AND status = 'active'`,
    );

    for (const row of rows) {
      const secrets = await decryptJSON(row.secrets_enc).catch(() => ({} as any));
      if (secrets.verify_token === token) {
        // codeql[js/reflected-xss] Standard Meta webhook challenge — opaque numeric token echoed only after verify_token validation
        return reply.type('text/plain').send(String(challenge));
      }
    }

    return reply.status(403).send('Forbidden');
  });

  // ── POST: Incoming messages ──────────────────────────────────────────────────
  // codeql[js/missing-rate-limiting] rate limiting applied via Fastify { config: { rateLimit: { max: 300 } } } — not recognised by CodeQL's Express sanitizer
  app.post('/webhook/whatsapp', { config: { rateLimit: { max: 300, timeWindow: '1 minute' } } }, async (request: any, reply: any) => {
    if (env.META_APP_SECRET) {
      try {
        verifyMetaWebhookSignature(request.headers as Record<string, string | string[] | undefined>, getCapturedRawBody(request), env.META_APP_SECRET);
      } catch (error: any) {
        request.log.warn({ error: error?.message }, '[webhook/whatsapp] signature verification failed');
        return reply.status(401).send({ error: 'invalid_signature' });
      }
    }

    // Respond 200 immediately — Meta requires < 5s
    reply.status(200).send('OK');

    // Process async
    try {
      const { handleWhatsAppWebhook } = await import('../services/integrations/whatsappBriefingService');
      await handleWhatsAppWebhook(request.body);
    } catch (err: any) {
      console.error('[webhook/whatsapp] Error:', err?.message);
    }
  });
}
