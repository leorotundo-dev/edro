/**
 * Gmail OAuth routes
 * Connects agency Gmail inbox to Jarvis monitoring.
 *
 * Routes:
 *   GET  /auth/google/start           — redirect to Google OAuth
 *   GET  /auth/google/callback        — exchange code, save tokens, start watch
 *   GET  /gmail/status                — connection status for current tenant
 *   DELETE /gmail/disconnect          — remove Gmail connection
 */

import { FastifyInstance } from 'fastify';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { query } from '../db';
import {
  gmailOAuthUrl,
  exchangeGmailCode,
  watchGmailInbox,
} from '../services/integrations/gmailService';
import { syncGoogleContacts } from '../services/integrations/googleContactsService';

function getIntegrationsRedirectUrl(query: string) {
  const webUrl = (process.env.WEB_URL ?? 'https://edro-production.up.railway.app').replace(/\/$/, '');
  return `${webUrl}/admin/integrations?${query}`;
}

export default async function gmailRoutes(app: FastifyInstance) {

  // ── Start OAuth flow ────────────────────────────────────────────────────
  app.get('/auth/google/start', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request: any, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const mode = typeof request.query?.mode === 'string' ? request.query.mode : '';
    try {
      const url = gmailOAuthUrl(tenantId);
      if (mode === 'json') {
        return reply.send({ url });
      }
      return reply.redirect(url);
    } catch (err: any) {
      return reply.code(503).send({ error: err.message });
    }
  });

  // ── OAuth callback ──────────────────────────────────────────────────────
  app.get('/auth/google/callback', async (request: any, reply) => {
    const { code, state, error } = request.query as Record<string, string>;

    if (error) {
      return reply.redirect(getIntegrationsRedirectUrl(`gmail_error=${encodeURIComponent(error)}`));
    }

    if (!code || !state) {
      return reply.code(400).send({ error: 'Missing code or state' });
    }

    try {
      const { tenantId, email } = await exchangeGmailCode(code, state);
      await watchGmailInbox(tenantId);

      // Non-blocking: sync Google Contacts in background after OAuth
      syncGoogleContacts(tenantId).catch((err) =>
        console.error('[gmailRoutes] contacts sync after OAuth failed:', err?.message),
      );

      return reply.redirect(getIntegrationsRedirectUrl(`gmail_connected=${encodeURIComponent(email)}`));
    } catch (err: any) {
      console.error('[gmailRoutes] OAuth callback error:', err?.message);
      return reply.redirect(getIntegrationsRedirectUrl(`gmail_error=${encodeURIComponent(err.message)}`));
    }
  });

  // ── Connection status ───────────────────────────────────────────────────
  app.get('/gmail/status', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;

    const { rows } = await query(
      `SELECT email_address, watch_expiry, last_sync_at, last_error,
              connected_at,
              (SELECT COUNT(*) FROM gmail_threads WHERE tenant_id = $1) AS total_threads,
              (SELECT COUNT(*) FROM gmail_threads WHERE tenant_id = $1 AND jarvis_processed = true) AS processed_threads
       FROM gmail_connections WHERE tenant_id = $1`,
      [tenantId],
    );

    if (!rows.length) {
      return reply.send({ configured: false });
    }

    const r = rows[0];
    return reply.send({
      configured: true,
      email: r.email_address,
      watchExpiry: r.watch_expiry,
      lastSyncAt: r.last_sync_at,
      lastError: r.last_error,
      connectedAt: r.connected_at,
      stats: {
        totalThreads: parseInt(r.total_threads),
        processedThreads: parseInt(r.processed_threads),
      },
    });
  });

  // ── Sync Google Contacts → people directory ─────────────────────────────
  app.post('/people/sync-contacts', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    try {
      const result = await syncGoogleContacts(tenantId);
      return reply.send({ success: true, ...result });
    } catch (err: any) {
      if (err.message?.startsWith('needs_reauth')) {
        return reply.code(403).send({ error: 'needs_reauth', message: err.message.replace('needs_reauth: ', '') });
      }
      return reply.code(500).send({ error: err.message });
    }
  });

  // ── Disconnect ──────────────────────────────────────────────────────────
  app.delete('/gmail/disconnect', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    await query(`DELETE FROM gmail_connections WHERE tenant_id = $1`, [tenantId]);
    return reply.send({ ok: true });
  });
}
