/**
 * Google Calendar Push Notification Webhook
 * Receives notifications from Google Calendar API watch channels.
 *
 * Google sends a POST with headers:
 *   X-Goog-Channel-ID    — our channel UUID
 *   X-Goog-Resource-State — 'sync' (initial) | 'exists' (change detected)
 *   X-Goog-Resource-ID   — Google resource ID
 */

import { FastifyInstance } from 'fastify';
import { processCalendarNotification } from '../services/integrations/googleCalendarService';

export default async function webhookGoogleCalendarRoutes(app: FastifyInstance) {

  app.post('/webhook/google-calendar', async (request, reply) => {
    // Ack immediately
    reply.code(200).send({ received: true });

    const channelId = request.headers['x-goog-channel-id'] as string | undefined;
    const resourceState = request.headers['x-goog-resource-state'] as string | undefined;

    if (!channelId) return;

    // 'sync' is the initial ping after watch() setup — no action needed
    if (resourceState === 'sync') return;

    // 'exists' means a calendar change was detected
    if (resourceState === 'exists' || resourceState === 'not_exists') {
      try {
        await processCalendarNotification(channelId);
      } catch (err: any) {
        console.error('[webhookGoogleCalendar] processNotification failed:', err?.message);
      }
    }
  });
}
