/**
 * GET /admin/integrations/health
 * Returns which API keys / env vars are configured — values never exposed.
 * Used by the admin integrations hub to show status per service.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { query } from '../db';
import { sendWhatsAppText, isWhatsAppConfigured } from '../services/whatsappService';
import { env } from '../env';
import { getMonitorStatus, type IntegrationService, type ServiceMonitorStatus } from '../services/integrationMonitor';
import { isEmailConfigured } from '../services/emailService';

function has(key: string): boolean {
  const v = process.env[key];
  return Boolean(v && v.trim().length > 0);
}

export default async function integrationHealthRoutes(app: FastifyInstance) {
  app.get('/admin/integrations/health', {
    preHandler: [authGuard, requirePerm('admin:read'), tenantGuard()],
  }, async (_request, reply) => {
    return reply.send({
      google: {
        client_id:        has('GOOGLE_CLIENT_ID'),
        client_secret:    has('GOOGLE_CLIENT_SECRET'),
        pubsub_topic:     has('GOOGLE_PUBSUB_TOPIC'),
        calendar_webhook: has('GOOGLE_CALENDAR_WEBHOOK_URL'),
      },
      ai: {
        gemini:  has('GEMINI_API_KEY'),
        openai:  has('OPENAI_API_KEY'),
      },
      search: {
        serper:         has('SERPER_API_KEY'),
        tavily:         has('TAVILY_API_KEY'),
        google_trends:  has('GOOGLE_TRENDS_SERVICE_URL'),
      },
      meta: {
        app_id:        has('META_APP_ID'),
        app_secret:    has('META_APP_SECRET'),
        redirect_uri:  has('META_REDIRECT_URI') || has('PUBLIC_API_URL'),
        verify_token:  has('META_VERIFY_TOKEN'),
      },
      whatsapp_evolution: {
        api_key: has('EVOLUTION_API_KEY'),
        api_url: has('EVOLUTION_API_URL'),
      },
      whatsapp_meta: {
        token:        has('WHATSAPP_TOKEN'),
        phone_id:     has('WHATSAPP_PHONE_ID'),
        verify_token: has('META_VERIFY_TOKEN'),
      },
      recall: {
        api_key:          has('RECALL_API_KEY'),
        webhook_secret:   has('RECALL_WEBHOOK_SECRET'),
        google_login_group: has('RECALL_GOOGLE_LOGIN_GROUP_ID'),
      },
      reportei: {
        token:    has('REPORTEI_TOKEN'),
        base_url: has('REPORTEI_BASE_URL'),
      },
      omie: {
        app_key:    has('OMIE_APP_KEY'),
        app_secret: has('OMIE_APP_SECRET'),
      },
      analytics: {
        youtube: has('YOUTUBE_API_KEY'),
      },
      auth: {
        oidc_issuer:     has('OIDC_ISSUER_URL'),
        oidc_client_id:  has('OIDC_CLIENT_ID'),
        mfa_enforced:    Boolean(env.EDRO_ENFORCE_PRIVILEGED_MFA),
      },
      d4sign: {
        token_api:        has('D4SIGN_TOKEN_API'),
        crypt_key:        has('D4SIGN_CRYPT_KEY'),
        safe_uuid:        has('D4SIGN_SAFE_UUID'),
        webhook_secret:   has('D4SIGN_WEBHOOK_SECRET'),
        sandbox:          Boolean(env.D4SIGN_SANDBOX),
      },
    });
  });

  // POST /admin/integrations/whatsapp/test-send
  app.post('/admin/integrations/whatsapp/test-send', {
    preHandler: [authGuard, requirePerm('admin:write'), tenantGuard()],
  }, async (request, reply) => {
    const { phone } = z.object({ phone: z.string().min(8) }).parse(request.body);

    if (!isWhatsAppConfigured()) {
      return reply.status(503).send({ error: 'WHATSAPP_TOKEN ou WHATSAPP_PHONE_ID não configurados.' });
    }

    const tenantId = (request.user as any).tenant_id as string;
    const result = await sendWhatsAppText(phone, '✅ Teste Edro.Digital — mensagem enviada com sucesso pelo sistema de notificações.', {
      tenantId,
      event: 'test_send',
      meta: {
        channel: 'admin_integration_test',
      },
    });
    if (!result.ok) {
      return reply.status(502).send({ error: result.error || 'Falha ao enviar mensagem.' });
    }
    return { ok: true, messageId: result.messageId };
  });

  // GET /admin/integrations/monitor — live activity status per service
  app.get('/admin/integrations/monitor', {
    preHandler: [authGuard, requirePerm('admin:read'), tenantGuard()],
  }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const now = Date.now();

    const [
      trelloConnectorRes,
      gmailConnectionRes,
      calendarChannelRes,
      metaConnectorRes,
    ] = await Promise.all([
      query<{
        member_id: string | null;
        last_synced_at: string | null;
      }>(
        `SELECT member_id, last_synced_at
           FROM trello_connectors
          WHERE tenant_id = $1
            AND is_active = true
          LIMIT 1`,
        [tenantId],
      ),
      query<{
        email_address: string | null;
        watch_expiry: string | null;
        last_sync_at: string | null;
        last_error: string | null;
        connected_at: string | null;
      }>(
        `SELECT email_address, watch_expiry, last_sync_at, last_error, connected_at
           FROM gmail_connections
          WHERE tenant_id = $1
          LIMIT 1`,
        [tenantId],
      ),
      query<{
        email_address: string | null;
        expires_at: string | null;
        watch_status: string | null;
        last_watch_renewed_at: string | null;
        last_watch_error: string | null;
        last_notification_at: string | null;
        last_notification_state: string | null;
      }>(
        `SELECT email_address, expires_at, watch_status, last_watch_renewed_at, last_watch_error,
                last_notification_at, last_notification_state
           FROM google_calendar_channels
          WHERE tenant_id = $1
          LIMIT 1`,
        [tenantId],
      ),
      query<{
        client_id: string | null;
        last_sync_at: string | null;
        page_id: string | null;
        instagram_business_id: string | null;
      }>(
        `SELECT client_id,
                last_sync_at,
                payload->>'page_id' AS page_id,
                payload->>'instagram_business_id' AS instagram_business_id
           FROM connectors
          WHERE tenant_id = $1
            AND provider = 'meta'
          ORDER BY updated_at DESC
          LIMIT 1`,
        [tenantId],
      ),
    ]);

    const configured = new Set<IntegrationService>([
      ...(trelloConnectorRes.rows.length || has('TRELLO_API_KEY') || has('TRELLO_TOKEN') ? ['trello' as const] : []),
      ...(has('WHATSAPP_TOKEN') ? ['whatsapp' as const] : []),
      ...(has('EVOLUTION_API_KEY') ? ['evolution' as const] : []),
      ...(has('RECALL_API_KEY') ? ['recall' as const] : []),
      ...(isEmailConfigured() ? ['resend' as const] : []),
      ...(has('D4SIGN_TOKEN_API') ? ['d4sign' as const] : []),
      ...(has('OPENAI_API_KEY') ? ['openai' as const] : []),
      ...(gmailConnectionRes.rows.length || has('GOOGLE_CLIENT_ID') ? ['gmail' as const] : []),
      ...(calendarChannelRes.rows.length || has('GOOGLE_CLIENT_ID') ? ['google_calendar' as const] : []),
      ...(metaConnectorRes.rows.length || has('META_APP_ID') ? ['instagram' as const] : []),
    ]);

    const services = await getMonitorStatus(tenantId, configured);
    const fallbacks = new Map<IntegrationService, Partial<ServiceMonitorStatus>>();

    if (trelloConnectorRes.rows[0]) {
      fallbacks.set('trello', {
        status: trelloConnectorRes.rows[0].last_synced_at ? 'ok' : 'unknown',
        last_event: trelloConnectorRes.rows[0].last_synced_at ? 'sync' : 'connected',
        last_activity: trelloConnectorRes.rows[0].last_synced_at ?? undefined,
        meta: {
          member_id: trelloConnectorRes.rows[0].member_id,
        },
      });
    }

    if (gmailConnectionRes.rows[0]) {
      const gmail = gmailConnectionRes.rows[0];
      const watchExpiryMs = gmail.watch_expiry ? new Date(gmail.watch_expiry).getTime() : null;
      const watchExpired = watchExpiryMs !== null && watchExpiryMs <= now;
      fallbacks.set('gmail', {
        status: gmail.last_error
          ? 'error'
          : watchExpired
            ? 'degraded'
            : 'ok',
        last_event: gmail.last_error
          ? 'watch_error'
          : gmail.last_sync_at
            ? 'sync'
            : 'connected',
        last_activity: gmail.last_sync_at ?? gmail.connected_at ?? undefined,
        error_msg: gmail.last_error ?? undefined,
        meta: {
          email: gmail.email_address,
          watch_expiry: gmail.watch_expiry,
        },
      });
    }

    if (calendarChannelRes.rows[0]) {
      const calendar = calendarChannelRes.rows[0];
      const expiryMs = calendar.expires_at ? new Date(calendar.expires_at).getTime() : null;
      const expired = expiryMs !== null && expiryMs <= now;
      const expiresSoon = expiryMs !== null && expiryMs > now && expiryMs - now < 48 * 60 * 60 * 1000;
      fallbacks.set('google_calendar', {
        status: calendar.watch_status === 'error' || calendar.last_watch_error
          ? 'error'
          : expired
            ? 'degraded'
            : expiresSoon
              ? 'degraded'
              : 'ok',
        last_event: calendar.last_notification_at
          ? `notification_${calendar.last_notification_state ?? 'received'}`
          : calendar.last_watch_renewed_at
            ? 'watch_renewed'
            : 'connected',
        last_activity: calendar.last_notification_at ?? calendar.last_watch_renewed_at ?? undefined,
        error_msg: calendar.last_watch_error ?? undefined,
        meta: {
          email: calendar.email_address,
          expires_at: calendar.expires_at,
          watch_status: calendar.watch_status,
        },
      });
    }

    if (metaConnectorRes.rows[0]) {
      const meta = metaConnectorRes.rows[0];
      fallbacks.set('instagram', {
        status: meta.page_id || meta.instagram_business_id ? 'ok' : 'unknown',
        last_event: meta.last_sync_at ? 'sync' : 'connected',
        last_activity: meta.last_sync_at ?? undefined,
        meta: {
          client_id: meta.client_id,
          page_id: meta.page_id,
          instagram_business_id: meta.instagram_business_id,
        },
      });
    }

    const mergedServices = services.map((service) => {
      if (service.last_activity) return service;
      const fallback = fallbacks.get(service.service);
      return fallback ? { ...service, ...fallback } : service;
    });

    return reply.send({ services: mergedServices });
  });

  // GET /admin/integrations/config-hints
  app.get('/admin/integrations/config-hints', {
    preHandler: [authGuard, requirePerm('admin:read'), tenantGuard()],
  }, async (_request, reply) => {
    const publicApiUrl = env.PUBLIC_API_URL?.replace(/\/$/, '') || null;
    return reply.send({
      google_redirect_uri_gmail:     publicApiUrl ? `${publicApiUrl}/auth/google/callback` : null,
      google_redirect_uri_calendar:  publicApiUrl ? `${publicApiUrl}/auth/google/calendar/callback` : null,
      webhook_base_url:              publicApiUrl,
      meta_verify_token_set:         has('META_VERIFY_TOKEN'),
    });
  });
}
