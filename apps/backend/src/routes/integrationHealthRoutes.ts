/**
 * GET /admin/integrations/health
 * Returns which API keys / env vars are configured — values never exposed.
 * Used by the admin integrations hub to show status per service.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { sendWhatsAppText, isWhatsAppConfigured } from '../services/whatsappService';
import { env } from '../env';

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

    const result = await sendWhatsAppText(phone, '✅ Teste Edro.Digital — mensagem enviada com sucesso pelo sistema de notificações.');
    if (!result.ok) {
      return reply.status(502).send({ error: result.error || 'Falha ao enviar mensagem.' });
    }
    return { ok: true, messageId: result.messageId };
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
