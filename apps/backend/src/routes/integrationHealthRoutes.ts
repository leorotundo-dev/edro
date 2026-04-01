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
import { sendEmail, isEmailConfigured } from '../services/emailService';
import { env } from '../env';
import { getMonitorStatus, type IntegrationService, type ServiceMonitorStatus } from '../services/integrationMonitor';

async function safeQuery<T>(sql: string, params: any[]): Promise<{ rows: T[] }> {
  try {
    return await query<T>(sql, params);
  } catch {
    return { rows: [] };
  }
}

function has(key: string): boolean {
  const v = process.env[key];
  return Boolean(v && v.trim().length > 0);
}

const HOUR_MS = 60 * 60 * 1000;

const STALE_ACTIVITY_WINDOW_MS: Partial<Record<IntegrationService, number>> = {
  trello: 48 * HOUR_MS,
  whatsapp: 72 * HOUR_MS,
  evolution: 72 * HOUR_MS,
  recall: 72 * HOUR_MS,
  resend: 72 * HOUR_MS,
  d4sign: 14 * 24 * HOUR_MS,
  openai: 7 * 24 * HOUR_MS,
  gmail: 24 * HOUR_MS,
  google_calendar: 24 * HOUR_MS,
  instagram: 72 * HOUR_MS,
};

function applyStaleMonitorStatus(service: ServiceMonitorStatus, nowMs: number): ServiceMonitorStatus {
  // Only handle 'ok' and 'error' — 'degraded'/'unknown' are unchanged
  if (service.status !== 'ok' && service.status !== 'error') return service;
  if (!service.last_activity) return service;

  const staleWindowMs = STALE_ACTIVITY_WINDOW_MS[service.service];
  if (!staleWindowMs) return service;

  const lastActivityMs = new Date(service.last_activity).getTime();
  if (!Number.isFinite(lastActivityMs)) return service;

  const ageMs = nowMs - lastActivityMs;
  // For errors use 3× the stale window so genuinely recent errors stay visible longer
  const effectiveWindowMs = service.status === 'error' ? staleWindowMs * 3 : staleWindowMs;
  if (ageMs <= effectiveWindowMs) return service;

  return {
    ...service,
    status: 'degraded',
    meta: {
      ...(service.meta ?? {}),
      stale: true,
      stale_age_hours: Math.floor(ageMs / HOUR_MS),
      stale_window_hours: Math.floor(effectiveWindowMs / HOUR_MS),
    },
  };
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
        token:         has('WHATSAPP_TOKEN'),
        phone_id:      has('WHATSAPP_PHONE_ID'),
        verify_token:  has('META_VERIFY_TOKEN'),
        agency_phones: Boolean(process.env.WHATSAPP_AGENCY_PHONES?.trim()),
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

  // POST /admin/integrations/email/test-send
  app.post('/admin/integrations/email/test-send', {
    preHandler: [authGuard, requirePerm('admin:write'), tenantGuard()],
  }, async (request: any, reply) => {
    const { to } = z.object({ to: z.string().email() }).parse(request.body);

    if (!isEmailConfigured()) {
      return reply.status(503).send({ error: 'Email não configurado. Configure SMTP_HOST/SMTP_USER/SMTP_PASS ou RESEND_API_KEY.' });
    }

    const tenantId = request.user.tenant_id as string;
    const result = await sendEmail({
      to,
      subject: '✅ Teste Edro.Digital — Email de verificação',
      text: 'Este é um email de teste enviado pelo painel de integrações da Edro.Digital para verificar que o serviço de email está funcionando corretamente.',
      tenantId,
    });

    if (!result.ok) {
      return reply.status(502).send({ error: result.error || 'Falha ao enviar email.' });
    }
    return { ok: true, provider: result.provider };
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
      // Gmail/Calendar only "configured" when OAuth creds exist — otherwise DB rows from
      // prior sessions show stale errors that can't be resolved without the credentials.
      ...(has('GOOGLE_CLIENT_ID') ? ['gmail' as const] : []),
      ...(has('GOOGLE_CLIENT_ID') ? ['google_calendar' as const] : []),
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

    if (gmailConnectionRes.rows[0] && has('GOOGLE_CLIENT_ID')) {
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

    if (calendarChannelRes.rows[0] && has('GOOGLE_CLIENT_ID')) {
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

    for (const service of services) {
      if (!service.configured || fallbacks.has(service.service)) continue;
      fallbacks.set(service.service, {
        status: 'ok',
        last_event: 'configured',
      });
    }

    const mergedServices = services.map((service) => {
      if (service.last_activity) return service;
      const fallback = fallbacks.get(service.service);
      return fallback ? { ...service, ...fallback } : service;
    }).map((service) => applyStaleMonitorStatus(service, now));

    return reply.send({ services: mergedServices });
  });

  app.get('/admin/integrations/monitor/:service/history', {
    preHandler: [authGuard, requirePerm('admin:read'), tenantGuard()],
  }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const params = z.object({
      service: z.enum([
        'trello',
        'whatsapp',
        'recall',
        'resend',
        'd4sign',
        'openai',
        'gmail',
        'google_calendar',
        'instagram',
        'evolution',
      ]),
    }).parse(request.params);
    const querystring = z.object({
      limit: z.coerce.number().int().min(1).max(20).optional(),
    }).parse(request.query ?? {});
    const limit = querystring.limit ?? 8;

    const { rows } = await query<{
      event: string;
      status: 'ok' | 'error' | 'degraded';
      records: number | null;
      error_msg: string | null;
      meta: Record<string, any> | null;
      created_at: string;
    }>(
      `SELECT event, status, records, error_msg, meta, created_at
         FROM integration_activity_log
        WHERE tenant_id = $1
          AND service = $2
        ORDER BY created_at DESC
        LIMIT $3`,
      [tenantId, params.service, limit],
    );

    return reply.send({ events: rows });
  });

  // GET /admin/controle — Central de Controle: integrações + frescor de dados + alertas
  app.get('/admin/controle', {
    preHandler: [authGuard, requirePerm('admin:read'), tenantGuard()],
  }, async (request: any, reply) => {
    try {
    const tenantId = request.user?.tenant_id as string;
    const now = Date.now();
    const nowTs = new Date().toISOString();

    // 1. All queries in parallel
    const [
      trelloConnectorRes,
      gmailConnectionRes,
      calendarChannelRes,
      metaConnectorRes,
      trelloBoardsRes,
      trelloUnmappedRes,
      trelloMembersRes,
      metaFailingRes,
      freshnessRes,
    ] = await Promise.all([
      safeQuery<{ last_synced_at: string | null; is_active: boolean }>(
        `SELECT last_synced_at, is_active FROM trello_connectors WHERE tenant_id = $1 LIMIT 1`,
        [tenantId],
      ),
      safeQuery<{ email_address: string | null; watch_expiry: string | null; last_sync_at: string | null; last_error: string | null }>(
        `SELECT email_address, watch_expiry, last_sync_at, last_error FROM gmail_connections WHERE tenant_id = $1 LIMIT 1`,
        [tenantId],
      ),
      safeQuery<{ email_address: string | null; expires_at: string | null; watch_status: string | null; last_watch_error: string | null }>(
        `SELECT email_address, expires_at, watch_status, last_watch_error FROM google_calendar_channels WHERE tenant_id = $1 LIMIT 1`,
        [tenantId],
      ),
      safeQuery<{ last_sync_at: string | null; page_id: string | null; last_sync_ok: boolean | null; last_error: string | null; last_error_at: string | null }>(
        `SELECT last_sync_at, payload->>'page_id' AS page_id, last_sync_ok, last_error, last_error_at
         FROM connectors WHERE tenant_id = $1 AND provider = 'meta' ORDER BY updated_at DESC LIMIT 1`,
        [tenantId],
      ),
      // Trello boards health summary
      safeQuery<{ ok: number; stale: number; err: number; unlinked: number; total: number }>(
        `SELECT
           COUNT(*) FILTER (WHERE last_synced_at IS NOT NULL AND EXTRACT(EPOCH FROM (now()-last_synced_at))/3600 <= 2)::int as ok,
           COUNT(*) FILTER (WHERE last_synced_at IS NOT NULL AND EXTRACT(EPOCH FROM (now()-last_synced_at))/3600 > 2)::int as stale,
           COUNT(*) FILTER (WHERE last_synced_at IS NULL)::int as err,
           COUNT(*) FILTER (WHERE client_id IS NULL)::int as unlinked,
           COUNT(*)::int as total
         FROM project_boards WHERE tenant_id = $1 AND is_archived = false`,
        [tenantId],
      ),
      // Trello unmapped lists — uses EXISTS instead of COUNT(*) subquery to avoid O(n) scan
      safeQuery<{ count: number; board_names: string }>(
        `SELECT
           COUNT(pl.id)::int as count,
           STRING_AGG(DISTINCT pb.name, ', ' ORDER BY pb.name) AS board_names
         FROM project_lists pl
         JOIN project_boards pb ON pb.id = pl.board_id
         WHERE pl.tenant_id = $1
           AND pl.is_archived = false
           AND NOT EXISTS (
             SELECT 1 FROM trello_list_status_map m WHERE m.list_id = pl.id AND m.tenant_id = $1
           )
           AND EXISTS (
             SELECT 1 FROM project_cards pc WHERE pc.list_id = pl.id AND pc.is_archived = false
           )`,
        [tenantId],
      ),
      // Trello members without email — limit scan to active boards only
      safeQuery<{ count: number }>(
        `SELECT COUNT(DISTINCT pcm.trello_member_id)::int as count
         FROM project_card_members pcm
         JOIN project_cards pc ON pc.id = pcm.card_id
         WHERE pc.board_id IN (
           SELECT id FROM project_boards WHERE tenant_id = $1 AND is_archived = false
         ) AND pcm.email IS NULL`,
        [tenantId],
      ),
      // Meta connectors failing > 24h (across all clients)
      safeQuery<{ count: number; client_names: string }>(
        `SELECT
           COUNT(*)::int as count,
           STRING_AGG(cl.name, ', ' ORDER BY cl.name) AS client_names
         FROM connectors c
         JOIN clients cl ON cl.id = c.client_id
         WHERE c.tenant_id = $1
           AND c.provider = 'meta'
           AND c.last_sync_ok = false
           AND c.last_error_at < now() - interval '24 hours'`,
        [tenantId],
      ),
      // 2. Data freshness per domain (runs in parallel with connector queries)
      safeQuery<{
        last_meta_metrics: string | null;
        last_learning_rules: string | null;
        last_trello_card: string | null;
        last_calendar: string | null;
        last_whatsapp: string | null;
        last_jarvis_alert: string | null;
        last_briefing: string | null;
      }>(
        `SELECT
           (SELECT MAX(updated_at)::text FROM format_performance_metrics WHERE tenant_id = $1) as last_meta_metrics,
           (SELECT MAX(updated_at)::text FROM learning_rules WHERE tenant_id = $1) as last_learning_rules,
           (SELECT MAX(updated_at)::text FROM project_cards WHERE tenant_id = $1) as last_trello_card,
           (SELECT MAX(updated_at)::text FROM calendar_events WHERE tenant_id = $1) as last_calendar,
           (SELECT MAX(created_at)::text FROM whatsapp_messages WHERE tenant_id = $1) as last_whatsapp,
           (SELECT MAX(created_at)::text FROM jarvis_alerts WHERE tenant_id = $1) as last_jarvis_alert,
           (SELECT MAX(updated_at)::text FROM edro_briefings WHERE tenant_id = $1) as last_briefing`,
        [tenantId],
      ),
    ]);
    const fr: {
      last_meta_metrics: string | null;
      last_learning_rules: string | null;
      last_trello_card: string | null;
      last_calendar: string | null;
      last_whatsapp: string | null;
      last_jarvis_alert: string | null;
      last_briefing: string | null;
    } = freshnessRes.rows[0] ?? {
      last_meta_metrics: null, last_learning_rules: null, last_trello_card: null,
      last_calendar: null, last_whatsapp: null, last_jarvis_alert: null, last_briefing: null,
    };

    function ageHours(ts: string | null): number | null {
      if (!ts) return null;
      return Math.round((now - new Date(ts).getTime()) / 3_600_000);
    }
    function freshStatus(ageH: number | null, thresholdH: number): 'ok' | 'stale' | 'critical' | 'no_data' {
      if (ageH === null) return 'no_data';
      if (ageH <= thresholdH) return 'ok';
      if (ageH <= thresholdH * 3) return 'stale';
      return 'critical';
    }

    const domains = [
      { key: 'meta_metrics',    label: 'Performance Meta/Instagram', source: 'Meta',      last_write: fr.last_meta_metrics,    threshold_h: 26,  freshness: freshStatus(ageHours(fr.last_meta_metrics), 26) },
      { key: 'learning_rules',  label: 'Regras de Aprendizado',      source: 'Meta+Reportei', last_write: fr.last_learning_rules, threshold_h: 200, freshness: freshStatus(ageHours(fr.last_learning_rules), 200) },
      { key: 'trello',          label: 'Jobs / Kanban (Trello)',      source: 'Trello',    last_write: fr.last_trello_card,     threshold_h: 3,   freshness: freshStatus(ageHours(fr.last_trello_card), 3) },
      { key: 'calendar',        label: 'Calendário de Eventos',       source: 'Google',    last_write: fr.last_calendar,        threshold_h: 26,  freshness: freshStatus(ageHours(fr.last_calendar), 26) },
      { key: 'whatsapp',        label: 'Mensagens WhatsApp',          source: 'WhatsApp',  last_write: fr.last_whatsapp,        threshold_h: 72,  freshness: freshStatus(ageHours(fr.last_whatsapp), 72) },
      { key: 'briefings',       label: 'Briefings & Copy',            source: 'Manual+AI', last_write: fr.last_briefing,        threshold_h: 72,  freshness: freshStatus(ageHours(fr.last_briefing), 72) },
      { key: 'jarvis_alerts',   label: 'Alertas Jarvis',              source: 'Jarvis',    last_write: fr.last_jarvis_alert,    threshold_h: 14,  freshness: freshStatus(ageHours(fr.last_jarvis_alert), 14) },
    ];

    // 3. Build integration tiles
    const trello = trelloConnectorRes.rows[0];
    const gmail = gmailConnectionRes.rows[0];
    const calendar = calendarChannelRes.rows[0];
    const meta = metaConnectorRes.rows[0];
    const tb = trelloBoardsRes.rows[0];
    const trelloUnmapped = trelloUnmappedRes.rows[0];
    const trelloMembers = trelloMembersRes.rows[0];
    const metaFailing = metaFailingRes.rows[0];

    const calendarExpiry = calendar?.expires_at ? new Date(calendar.expires_at).getTime() : null;
    const calendarExpired = calendarExpiry !== null && calendarExpiry <= now;
    const calendarExpiresSoon = calendarExpiry !== null && calendarExpiry > now && calendarExpiry - now < 48 * 3_600_000;
    const gmailExpiry = gmail?.watch_expiry ? new Date(gmail.watch_expiry).getTime() : null;
    const gmailExpired = gmailExpiry !== null && gmailExpiry <= now;
    const gmailExpiresSoon = gmailExpiry !== null && gmailExpiry > now && gmailExpiry - now < 48 * 3_600_000;

    const integrations = [
      {
        key: 'trello',
        label: 'Trello',
        icon: 'trello',
        configured: Boolean(trello?.is_active),
        status: !trello ? 'disconnected'
          : (tb?.err ?? 0) > 0 ? 'error'
          : (tb?.stale ?? 0) > 0 || (trelloUnmapped?.count ?? 0) > 0 ? 'stale'
          : 'ok',
        last_activity: trello?.last_synced_at ?? null,
        details: trello
          ? `${tb?.total ?? 0} boards · ${tb?.unlinked ?? 0} sem cliente · ${tb?.stale ?? 0} desatualizados · ${trelloUnmapped?.count ?? 0} listas sem mapeamento`
          : 'Não conectado',
        action_url: '/admin/trello',
        warning: (trelloUnmapped?.count ?? 0) > 0
          ? `${trelloUnmapped.count} lista(s) com cards sem status definido — podem aparecer como "Intake" incorretamente`
          : null,
      },
      {
        key: 'meta',
        label: 'Meta / Instagram',
        icon: 'meta',
        configured: Boolean(meta?.page_id),
        status: !meta ? 'disconnected'
          : meta.last_sync_ok === false ? 'error'
          : ageHours(meta.last_sync_at) !== null && ageHours(meta.last_sync_at)! > 26 ? 'stale'
          : 'ok',
        last_activity: meta?.last_sync_at ?? null,
        details: meta ? `Page ID: ${meta.page_id ?? 'não vinculado'}` : 'Não conectado',
        action_url: '/admin/integrations',
        warning: meta?.last_sync_ok === false ? `Último erro: ${meta.last_error ?? 'desconhecido'}` : null,
      },
      {
        key: 'google_calendar',
        label: 'Google Calendar',
        icon: 'google',
        configured: Boolean(calendar),
        status: !calendar ? 'disconnected' : calendar.last_watch_error ? 'error' : calendarExpired ? 'error' : calendarExpiresSoon ? 'expiring' : 'ok',
        last_activity: calendar?.expires_at ?? null,
        details: calendar ? `${calendar.email_address ?? '—'} · expira ${calendar.expires_at ? new Date(calendar.expires_at).toLocaleDateString('pt-BR') : '?'}` : 'Não conectado',
        action_url: '/admin/integrations',
        warning: calendarExpiresSoon ? 'Token expira em < 48h' : calendarExpired ? 'Token expirado — sync parado' : null,
      },
      {
        key: 'gmail',
        label: 'Gmail',
        icon: 'gmail',
        configured: Boolean(gmail),
        status: !gmail ? 'disconnected' : gmail.last_error ? 'error' : gmailExpired ? 'error' : gmailExpiresSoon ? 'expiring' : 'ok',
        last_activity: gmail?.last_sync_at ?? null,
        details: gmail ? `${gmail.email_address ?? '—'} · expira ${gmail.watch_expiry ? new Date(gmail.watch_expiry).toLocaleDateString('pt-BR') : '?'}` : 'Não conectado',
        action_url: '/admin/integrations',
        warning: gmailExpiresSoon ? 'Watch token expira em < 48h' : gmailExpired ? 'Watch token expirado — sync parado' : null,
      },
      {
        key: 'whatsapp',
        label: 'WhatsApp',
        icon: 'whatsapp',
        configured: has('WHATSAPP_TOKEN') || has('EVOLUTION_API_KEY'),
        status: has('WHATSAPP_TOKEN') || has('EVOLUTION_API_KEY') ? 'ok' : 'disconnected',
        last_activity: fr.last_whatsapp ?? null,
        details: has('EVOLUTION_API_KEY') ? 'Evolution API' : has('WHATSAPP_TOKEN') ? 'Meta Cloud API' : 'Não configurado',
        action_url: '/admin/integrations',
      },
      {
        key: 'reportei',
        label: 'Reportei',
        icon: 'reportei',
        configured: has('REPORTEI_TOKEN'),
        status: !has('REPORTEI_TOKEN') ? 'disconnected' : ageHours(fr.last_learning_rules) !== null && ageHours(fr.last_learning_rules)! > 200 ? 'stale' : 'ok',
        last_activity: fr.last_learning_rules ?? null,
        details: has('REPORTEI_TOKEN') ? 'Sync seg/qua/sex — dados com até 2 dias de defasagem' : 'Não configurado',
        action_url: '/admin/reportei',
        warning: null,
      },
      {
        key: 'recall',
        label: 'Recall.ai (Reuniões)',
        icon: 'recall',
        configured: has('RECALL_API_KEY'),
        status: has('RECALL_API_KEY') ? 'ok' : 'disconnected',
        last_activity: null,
        details: has('RECALL_API_KEY') ? 'Configurado — bot ativo em reuniões agendadas' : 'Não configurado',
        action_url: '/admin/integrations',
      },
    ];

    // 4. Alerts
    const alerts: Array<{ severity: 'critical' | 'warning' | 'info'; title: string; message: string; action_label?: string; action_url?: string }> = [];

    if (calendarExpired) alerts.push({ severity: 'critical', title: 'Google Calendar desconectado', message: 'Watch token expirou. Eventos não estão sendo recebidos em tempo real.', action_label: 'Reconectar', action_url: '/admin/integrations' });
    else if (calendarExpiresSoon) alerts.push({ severity: 'warning', title: 'Google Calendar expira em breve', message: 'Watch token expira em menos de 48h. Renove antes de parar de funcionar.', action_label: 'Renovar', action_url: '/admin/integrations' });

    if (gmailExpired) alerts.push({ severity: 'critical', title: 'Gmail desconectado', message: 'Watch token expirou. E-mails não estão sendo sincronizados.', action_label: 'Reconectar', action_url: '/admin/integrations' });
    else if (gmailExpiresSoon) alerts.push({ severity: 'warning', title: 'Gmail expira em breve', message: 'Watch token expira em menos de 48h.', action_label: 'Renovar', action_url: '/admin/integrations' });

    if ((tb?.stale ?? 0) > 0) alerts.push({ severity: 'warning', title: `${tb?.stale} board(s) Trello desatualizados`, message: 'Dados do Trello estão com mais de 2h sem sync. A Central de Operações pode estar mostrando informações antigas.', action_label: 'Ver boards', action_url: '/admin/trello' });
    if ((tb?.unlinked ?? 0) > 0) alerts.push({ severity: 'info', title: `${tb?.unlinked} board(s) sem cliente vinculado`, message: 'Cards desses boards aparecem sem contexto de cliente na Central de Operações.', action_label: 'Vincular', action_url: '/admin/trello' });
    if ((trelloUnmapped?.count ?? 0) > 0) alerts.push({
      severity: 'warning',
      title: `${trelloUnmapped.count} lista(s) Trello sem status mapeado`,
      message: `Cards nessas listas aparecem como "Intake" na Central de Operações (status padrão por não ter mapeamento explícito). Boards afetados: ${trelloUnmapped.board_names ?? '—'}.`,
      action_label: 'Mapear listas',
      action_url: '/admin/trello?tab=mapping',
    });
    if ((trelloMembers?.count ?? 0) > 0) alerts.push({
      severity: 'info',
      title: `${trelloMembers.count} membro(s) Trello sem e-mail`,
      message: 'Responsáveis de cards sem e-mail não podem ser vinculados à equipe Edro. Atualize os perfis no Trello.',
      action_label: 'Ver no Trello',
      action_url: '/admin/trello',
    });

    if ((metaFailing?.count ?? 0) > 0) {
      alerts.push({
        severity: 'warning',
        title: `${metaFailing.count} conector(es) Meta com falha há > 24h`,
        message: `Os seguintes clientes estão sem sync Meta: ${metaFailing.client_names ?? '—'}. Verifique os tokens de acesso.`,
        action_label: 'Ver integrações',
        action_url: '/admin/integrations',
      });
    }

    if (has('REPORTEI_TOKEN') && ageHours(fr.last_learning_rules) !== null && ageHours(fr.last_learning_rules)! > 200) {
      alerts.push({ severity: 'warning', title: 'Insights de performance desatualizados', message: `Regras de aprendizado com ${ageHours(fr.last_learning_rules)}h de defasagem. Próximo sync: seg/qua/sex.`, action_label: 'Ver configuração', action_url: '/admin/reportei' });
    }

    const criticalDomains = domains.filter((d) => d.freshness === 'critical');
    if (criticalDomains.length > 0) {
      alerts.push({ severity: 'critical', title: 'Dados críticos sem atualização', message: `${criticalDomains.map((d) => d.label).join(', ')} estão com dados muito desatualizados.` });
    }

    const summary = {
      ok: integrations.filter((i) => i.status === 'ok').length,
      warnings: integrations.filter((i) => ['stale', 'expiring'].includes(i.status)).length,
      errors: integrations.filter((i) => ['error', 'disconnected'].includes(i.status)).length,
      total: integrations.length,
      alerts_critical: alerts.filter((a) => a.severity === 'critical').length,
      alerts_warning: alerts.filter((a) => a.severity === 'warning').length,
      generated_at: nowTs,
    };

    return reply.send({ integrations, domains, alerts, summary });
    } catch (err: any) {
      request.log?.error({ err }, 'GET /admin/controle failed');
      return reply.status(500).send({ error: 'Falha ao carregar dados do sistema.', detail: err?.message });
    }
  });

  // GET /admin/integrations/config-hints
  app.get('/admin/integrations/config-hints', {
    preHandler: [authGuard, requirePerm('admin:read'), tenantGuard()],
  }, async (_request, reply) => {
    const publicApiUrl = env.PUBLIC_API_URL?.replace(/\/$/, '') || null;

    // Mirror the same resolution logic used by gmailService and googleCalendarService
    // so the dialog shows the EXACT URI that will be sent to Google — not a guess.
    const gmailRedirectUri = env.GOOGLE_REDIRECT_URI
      ? env.GOOGLE_REDIRECT_URI
      : publicApiUrl ? `${publicApiUrl}/api/auth/google/callback` : null;

    const calendarRedirectUri = env.GOOGLE_CALENDAR_REDIRECT_URI
      ? env.GOOGLE_CALENDAR_REDIRECT_URI
      : publicApiUrl ? `${publicApiUrl}/api/auth/google/calendar/callback` : null;

    return reply.send({
      google_redirect_uri_gmail:     gmailRedirectUri,
      google_redirect_uri_calendar:  calendarRedirectUri,
      google_redirect_uri_explicit:  Boolean(env.GOOGLE_REDIRECT_URI),
      webhook_base_url:              publicApiUrl,
      meta_verify_token_set:         has('META_VERIFY_TOKEN'),
    });
  });
}
