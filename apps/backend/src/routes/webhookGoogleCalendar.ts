/**
 * Google Calendar Push Notification Webhook
 * Receives notifications from Google Calendar API watch channels.
 *
 * Google sends a POST with headers:
 *   X-Goog-Channel-ID    — our channel UUID
 *   X-Goog-Channel-Token — signed secret bound to the channel ID
 *   X-Goog-Resource-State — 'sync' (initial) | 'exists' (change detected)
 *   X-Goog-Resource-ID   — Google resource ID
 */

import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { isProductionLike } from '../env';
import {
  buildCalendarWebhookToken,
  canValidateCalendarWebhookToken,
  processCalendarNotification,
  watchCalendar,
} from '../services/integrations/googleCalendarService';
import { verifySharedWebhookSecret } from '../services/integrations/webhookSecurityService';

export default async function webhookGoogleCalendarRoutes(app: FastifyInstance) {

  app.post('/webhook/google-calendar', async (request, reply) => {
    const channelId = request.headers['x-goog-channel-id'] as string | undefined;
    const channelToken = request.headers['x-goog-channel-token'] as string | undefined;
    const resourceState = request.headers['x-goog-resource-state'] as string | undefined;
    const resourceId = request.headers['x-goog-resource-id'] as string | undefined;

    if (!channelId) {
      return reply.code(400).send({ error: 'missing_channel_id' });
    }

    const { rows } = await query<{ tenant_id: string; resource_id: string | null }>(
      `SELECT tenant_id, resource_id
         FROM google_calendar_channels
        WHERE channel_id = $1
        LIMIT 1`,
      [channelId],
    );

    if (!rows[0]) {
      return reply.code(204).send();
    }

    const row = rows[0];

    if (canValidateCalendarWebhookToken()) {
      try {
        verifySharedWebhookSecret(
          {
            authorization: channelToken ? `Bearer ${channelToken}` : undefined,
          },
          buildCalendarWebhookToken(channelId),
          { allowBearerAuth: true },
        );
      } catch {
        // Legacy watches created before token hardening do not send X-Goog-Channel-Token.
        // Rotate them to a secure channel, but do not process unauthenticated payloads.
        if (!channelToken && row.resource_id && resourceId && row.resource_id === resourceId) {
          watchCalendar(row.tenant_id).catch((err) => {
            console.error('[webhookGoogleCalendar] failed to rotate insecure channel:', err?.message);
          });
          return reply.code(202).send({ rotated: true });
        }
        return reply.code(401).send({ error: 'invalid_channel_token' });
      }
    } else if (isProductionLike) {
      return reply.code(503).send({ error: 'calendar_webhook_secret_not_configured' });
    }

    if (row.resource_id && resourceId && row.resource_id !== resourceId) {
      return reply.code(401).send({ error: 'invalid_resource_id' });
    }

    // Ack only after channel authenticity was checked.
    reply.code(200).send({ received: true });

    // 'sync' is the initial ping after watch() setup — no action needed
    if (resourceState === 'sync') return;

    // 'exists' means a calendar change was detected
    if (resourceState === 'exists' || resourceState === 'not_exists') {
      try {
        await processCalendarNotification(channelId, resourceState);
      } catch (err: any) {
        console.error('[webhookGoogleCalendar] processNotification failed:', err?.message);
      }
    }
  });
}
