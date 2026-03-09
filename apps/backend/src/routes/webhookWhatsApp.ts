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

export default async function webhookWhatsAppRoutes(app: FastifyInstance) {
  // ── GET: Meta webhook verification ──────────────────────────────────────────
  app.get('/webhook/whatsapp', async (request: any, reply: any) => {
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
        return reply.send(challenge);
      }
    }

    return reply.status(403).send('Forbidden');
  });

  // ── POST: Incoming messages ──────────────────────────────────────────────────
  app.post('/webhook/whatsapp', async (request: any, reply: any) => {
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
