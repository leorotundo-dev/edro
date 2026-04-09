/**
 * webhookTrello.ts — Trello inbound webhook receiver.
 *
 * Routes (no /api prefix — Trello calls the raw URL):
 *   HEAD /webhook/trello   — required by Trello when registering the webhook
 *   POST /webhook/trello   — receives Trello actions
 *
 * Security: optional TRELLO_WEBHOOK_SECRET matched against ?secret= query param.
 *
 * Processing is async — we respond 200 immediately to avoid Trello timeouts.
 */

import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { env } from '../env';
import { processWebhookAction, TrelloWebhookAction } from '../services/trelloProjectorService';

export default async function webhookTrelloRoutes(app: FastifyInstance) {

  // Trello requires HEAD 200 when the webhook is first registered
  app.head('/webhook/trello', async (_request, reply) => {
    return reply.code(200).send();
  });

  app.post('/webhook/trello', async (request, reply) => {
    // 1. Validate secret if configured
    if (env.TRELLO_WEBHOOK_SECRET) {
      const provided = (request.query as Record<string, string>).secret;
      if (provided !== env.TRELLO_WEBHOOK_SECRET) {
        return reply.code(401).send({ error: 'invalid_secret' });
      }
    }

    // 2. Resolve tenant from ?tenant= query param
    const tenantId = (request.query as Record<string, string>).tenant;
    if (!tenantId) {
      return reply.code(400).send({ error: 'missing_tenant' });
    }

    const body = request.body as any;
    const action: TrelloWebhookAction | undefined = body?.action;

    // Trello sends HEAD-only pings with no body — ignore gracefully
    if (!action?.id || !action?.type) {
      return reply.code(200).send({ ok: true });
    }

    // 3. Respond immediately — process async
    reply.code(200).send({ ok: true });

    const trelloBoardId: string | undefined = action.data?.board?.id ?? body?.model?.id;

    // 4. Dedupe + log
    let eventId: string | null = null;
    try {
      const insertRes = await query<{ id: string }>(
        `INSERT INTO trello_webhook_events
           (tenant_id, trello_board_id, trello_action_id, action_type, payload, status)
         VALUES ($1, $2, $3, $4, $5, 'pending')
         ON CONFLICT (tenant_id, trello_action_id) DO NOTHING
         RETURNING id`,
        [tenantId, trelloBoardId ?? null, action.id, action.type, JSON.stringify(body)],
      );
      if (!insertRes.rows.length) return; // duplicate — already processed
      eventId = insertRes.rows[0].id;
    } catch (err: any) {
      console.error('[webhookTrello] failed to log event:', err?.message);
      return;
    }

    // 5. Project into read model
    try {
      const handled = await processWebhookAction(tenantId, action);

      await query(
        `UPDATE trello_webhook_events
         SET status = $1, processed_at = now()
         WHERE id = $2`,
        [handled ? 'processed' : 'skipped', eventId],
      );

      // Update last_seen_at on the webhook registry row
      if (trelloBoardId) {
        await query(
          `UPDATE trello_webhooks SET last_seen_at = now(), last_error = NULL
           WHERE tenant_id = $1 AND trello_board_id = $2`,
          [tenantId, trelloBoardId],
        ).catch(() => undefined);
      }
    } catch (err: any) {
      console.error(`[webhookTrello] projection error tenant=${tenantId} action=${action.id}:`, err?.message);
      await query(
        `UPDATE trello_webhook_events SET status = 'error', error_message = $1 WHERE id = $2`,
        [err?.message ?? 'unknown', eventId],
      ).catch(() => undefined);
    }
  });
}
