/**
 * Google Calendar OAuth + management routes
 *
 * Routes:
 *   GET  /auth/google/calendar/start      — start OAuth
 *   GET  /auth/google/calendar/callback   — OAuth callback
 *   GET  /calendar/watch-status           — channel status
 *   POST /calendar/watch/renew            — manually renew watch channel
 *   DELETE /calendar/disconnect           — remove calendar connection
 */

import { FastifyInstance } from 'fastify';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requirePerm } from '../auth/rbac';
import { query } from '../db';
import {
  calendarOAuthUrl,
  disconnectCalendar,
  exchangeCalendarCode,
  watchCalendar,
} from '../services/integrations/googleCalendarService';
import {
  CalendarAutoJoinQueueError,
  requeueCalendarAutoJoinById,
} from '../services/calendarAutoJoinQueueService';
import { env } from '../env';

function getIntegrationsRedirectUrl(query: string) {
  const webUrl = env.WEB_URL?.replace(/\/$/, '');
  if (!webUrl) {
    throw new Error('WEB_URL não configurado para redirecionar o fluxo do Google Calendar.');
  }
  return `${webUrl}/admin/integrations?${query}`;
}

export default async function googleCalendarRoutes(app: FastifyInstance) {

  // ── Start OAuth ─────────────────────────────────────────────────────────
  app.get('/auth/google/calendar/start', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request: any, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const mode = typeof request.query?.mode === 'string' ? request.query.mode : '';
    try {
      const url = calendarOAuthUrl(tenantId);
      if (mode === 'json') {
        return reply.send({ url });
      }
      return reply.redirect(url);
    } catch (err: any) {
      return reply.code(503).send({ error: err.message });
    }
  });

  // ── OAuth callback ──────────────────────────────────────────────────────
  app.get('/auth/google/calendar/callback', async (request: any, reply) => {
    const { code, state, error } = request.query as Record<string, string>;

    if (error) {
      return reply.redirect(getIntegrationsRedirectUrl(`calendar_error=${encodeURIComponent(error)}`));
    }

    if (!code || !state) {
      return reply.code(400).send({ error: 'Missing code or state' });
    }

    try {
      const { tenantId, email } = await exchangeCalendarCode(code, state);
      await watchCalendar(tenantId);

      return reply.redirect(getIntegrationsRedirectUrl(`calendar_connected=${encodeURIComponent(email)}`));
    } catch (err: any) {
      console.error('[googleCalendarRoutes] callback error:', err?.message);
      return reply.redirect(getIntegrationsRedirectUrl(`calendar_error=${encodeURIComponent(err.message)}`));
    }
  });

  // ── Watch status ────────────────────────────────────────────────────────
  app.get('/calendar/watch-status', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;

    const { rows } = await query(
      `SELECT email_address, expires_at, calendar_id, watch_status,
              last_watch_renewed_at, last_watch_error, last_notification_at, last_notification_state,
              (SELECT COUNT(*) FROM calendar_auto_joins WHERE tenant_id = $1) AS total_meetings,
              (SELECT COUNT(*) FROM calendar_auto_joins WHERE tenant_id = $1 AND job_enqueued_at IS NOT NULL) AS enqueued_meetings
       FROM google_calendar_channels WHERE tenant_id = $1`,
      [tenantId],
    );

    if (!rows.length) return reply.send({ configured: false });

    const r = rows[0];
    const expiresAt = r.expires_at ? new Date(r.expires_at) : null;
    const msToExpiry = expiresAt ? expiresAt.getTime() - Date.now() : null;
    return reply.send({
      configured: true,
      email: r.email_address,
      expiresAt: r.expires_at,
      calendarId: r.calendar_id,
      watchStatus: r.watch_status ?? 'unknown',
      expiresSoon: msToExpiry !== null ? msToExpiry < 48 * 60 * 60 * 1000 : false,
      expired: msToExpiry !== null ? msToExpiry <= 0 : false,
      lastWatchRenewedAt: r.last_watch_renewed_at,
      lastWatchError: r.last_watch_error,
      lastNotificationAt: r.last_notification_at,
      lastNotificationState: r.last_notification_state,
      stats: {
        totalMeetings: parseInt(r.total_meetings),
        enqueuedMeetings: parseInt(r.enqueued_meetings),
      },
    });
  });

  // ── Renew watch channel (called manually or by cron) ───────────────────
  app.post('/calendar/watch/renew', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    try {
      await watchCalendar(tenantId);
      return reply.send({ ok: true });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ── List upcoming auto-join meetings ────────────────────────────────────
  app.get('/calendar/auto-joins', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { rows } = await query(
      `SELECT id, event_title, video_url, video_platform, organizer_email,
              scheduled_at, job_enqueued_at, meeting_id, client_id,
              client_match_source, bot_id, status, last_error, attempt_count, processed_at, created_at
       FROM calendar_auto_joins
       WHERE tenant_id = $1
       ORDER BY scheduled_at DESC
       LIMIT 50`,
      [tenantId],
    );
    return reply.send({ data: rows });
  });

  // ── Requeue specific auto-join ─────────────────────────────────────────
  app.post<{ Params: { autoJoinId: string } }>('/calendar/auto-joins/:autoJoinId/requeue', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { autoJoinId } = request.params;

    try {
      return reply.send(await requeueCalendarAutoJoinById(tenantId, autoJoinId));
    } catch (error: any) {
      if (error instanceof CalendarAutoJoinQueueError) {
        return reply.code(error.statusCode).send({ error: error.message });
      }
      if (typeof error?.message === 'string' && error.message.includes('Janela insuficiente')) {
        return reply.code(422).send({ error: error.message });
      }
      throw error;
    }
  });

  // ── Disconnect ──────────────────────────────────────────────────────────
  app.delete('/calendar/disconnect', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    await disconnectCalendar(tenantId);
    return reply.send({ ok: true });
  });
}
