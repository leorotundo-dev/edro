/**
 * Gmail Pub/Sub Webhook Handler
 * Receives push notifications from Google Pub/Sub when new emails arrive.
 *
 * Register in Google Cloud Console:
 *   1. Create Pub/Sub topic: gmail-watch
 *   2. Grant gmail-api-push@system.gserviceaccount.com Publisher role on topic
 *   3. Create subscription with push endpoint: https://api.edro.digital/webhook/gmail
 *   4. Set GOOGLE_PUBSUB_TOPIC=projects/<project>/topics/gmail-watch
 */

import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { processGmailHistory } from '../services/integrations/gmailService';

export default async function webhookGmailRoutes(app: FastifyInstance) {

  app.post('/webhook/gmail', async (request, reply) => {
    // Ack immediately — Pub/Sub will retry if we don't return 200/204
    reply.code(204).send();

    const body = request.body as any;
    if (!body?.message) return;

    try {
      // Decode Pub/Sub message
      const data = Buffer.from(body.message.data ?? '', 'base64').toString('utf-8');
      const parsed = JSON.parse(data) as { emailAddress?: string; historyId?: number };

      if (!parsed.emailAddress || !parsed.historyId) return;

      // Find tenant by email
      const { rows } = await query(
        `SELECT tenant_id FROM gmail_connections WHERE email_address = $1`,
        [parsed.emailAddress],
      );
      if (!rows.length) return;

      const tenantId = rows[0].tenant_id;

      await processGmailHistory(tenantId, String(parsed.historyId));
    } catch (err: any) {
      console.error('[webhookGmail] error:', err?.message);
    }
  });
}
