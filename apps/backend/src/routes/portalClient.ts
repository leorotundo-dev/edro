/**
 * Portal do Cliente — Backend Routes
 * Fase 3 do ERP
 *
 * Acesso via JWT com role='client', claim client_id preenchido.
 * Todas as rotas lêem request.user.client_id para filtrar dados.
 *
 * Rotas:
 *   GET  /portal/client/me
 *   GET  /portal/client/jobs
 *   GET  /portal/client/jobs/:id
 *   POST /portal/client/jobs/:id/approve
 *   POST /portal/client/jobs/:id/revision
 *   GET  /portal/client/reports
 *   GET  /portal/client/invoices
 */

import type { FastifyReply, FastifyRequest } from 'fastify';
import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import { z } from 'zod';
import { pool } from '../db';
import { hasClientPerm, requireClientPerm } from '../auth/clientPerms';
import { requirePortalCapability } from '../auth/portalClientPerms';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { env } from '../env';
import { sendEmail, isEmailConfigured } from '../services/emailService';
import {
  buildArtDirectionFeedbackMetadata,
  getPrimaryArtDirectionReferenceId,
  recordArtDirectionFeedbackEvent,
  resolveArtDirectionCreativeContext,
} from '../services/ai/artDirectionMemoryService';
import {
  runBriefingAutoPipeline,
  createBriefingTrelloCard,
  sendBriefingAcceptedWhatsApp,
} from '../services/briefingAutoPipelineService';

// ── Auth helper ────────────────────────────────────────────────────────────────

function getClientId(request: any): string | null {
  // JWT payload: { id, role: 'client', client_id, ... }
  return request.user?.client_id ?? null;
}

function requireClient(request: any, reply: any): string | null {
  const clientId = getClientId(request);
  if (!clientId) {
    reply.status(401).send({ error: 'Client authentication required' });
    return null;
  }
  return clientId;
}

type ClientScopePerm = 'read' | 'write';

async function ensureScopedClientAccess(params: {
  request: FastifyRequest;
  reply: FastifyReply;
  tenantId: string;
  clientId: string | null | undefined;
  perm: ClientScopePerm;
}) {
  const { request, reply, tenantId, clientId, perm } = params;
  const user = request.user as { sub?: string; role?: string } | undefined;
  if ((user?.role || '').toLowerCase() === 'admin') {
    return true;
  }
  if (!user?.sub) {
    reply.status(401).send({ error: 'missing_user' });
    return false;
  }
  if (!clientId) {
    return true;
  }

  const allowed = await hasClientPerm({
    tenantId,
    userId: user.sub,
    role: user.role,
    clientId,
    perm,
  });
  if (!allowed) {
    reply.status(403).send({ error: 'client_forbidden', perm, client_id: clientId });
    return false;
  }
  return true;
}

function requirePortalLinkPerm(perm: ClientScopePerm) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    const tokenId = (request.params as any)?.tokenId as string | undefined;
    if (!tenantId || !tokenId) {
      return reply.status(400).send({ error: 'missing_token_id' });
    }

    const result = await pool.query(
      `SELECT client_id
         FROM client_portal_tokens
        WHERE id = $1 AND tenant_id = $2
        LIMIT 1`,
      [tokenId, tenantId],
    );
    const clientId = result.rows[0]?.client_id as string | undefined;
    if (!clientId) {
      return reply.status(404).send({ error: 'not_found' });
    }

    const allowed = await ensureScopedClientAccess({
      request,
      reply,
      tenantId,
      clientId,
      perm,
    });
    if (!allowed) return;
  };
}

function requirePortalContactPerm(perm: ClientScopePerm) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    const contactId = (request.params as any)?.contactId as string | undefined;
    if (!tenantId || !contactId) {
      return reply.status(400).send({ error: 'missing_contact_id' });
    }

    const result = await pool.query(
      `SELECT client_id
         FROM portal_contacts
        WHERE id = $1 AND tenant_id = $2
        LIMIT 1`,
      [contactId, tenantId],
    );
    const clientId = result.rows[0]?.client_id as string | undefined;
    if (!clientId) {
      return reply.status(404).send({ error: 'not_found' });
    }

    const allowed = await ensureScopedClientAccess({
      request,
      reply,
      tenantId,
      clientId,
      perm,
    });
    if (!allowed) return;
  };
}

function resolvePortalBaseUrl() {
  const webUrl = env.WEB_URL?.replace(/\/$/, '');
  if (webUrl) return webUrl;

  const directPortalUrl = process.env.NEXT_PUBLIC_CLIENTE_URL?.trim();
  if (directPortalUrl && /^https?:\/\//i.test(directPortalUrl)) {
    return directPortalUrl.replace(/\/$/, '');
  }

  throw new Error('portal_url_not_configured');
}

// ── Routes ─────────────────────────────────────────────────────────────────────

export default async function portalClientRoutes(app: FastifyInstance) {

  // Verify JWT on all portal routes
  app.addHook('preHandler', async (request: any, reply) => {
    try {
      await request.jwtVerify();
    } catch {
      reply.status(401).send({ error: 'Unauthorized' });
    }
  });

  // GET /portal/client/me — dados do cliente logado
  app.get('/portal/client/me', async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;

    const res = await pool.query(
      `SELECT id, name, status, profile FROM clients WHERE id = $1`,
      [clientId],
    );
    if (!res.rows.length) return reply.status(404).send({ error: 'Client not found' });
    return reply.send({ client: res.rows[0] });
  });

  // GET /portal/client/jobs — lista de briefings do cliente
  app.get('/portal/client/jobs', async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;

    const { status, limit = '50' } = request.query as any;

    let q = `
      SELECT b.id, b.title, b.status, b.due_at, b.updated_at,
             b.copy_approved_at, b.copy_approval_comment,
             b.labels
      FROM edro_briefings b
      WHERE b.main_client_id = $1
    `;
    const params: any[] = [clientId];

    if (status) {
      params.push(status);
      q += ` AND b.status = $${params.length}`;
    }

    q += ` ORDER BY b.updated_at DESC LIMIT $${params.length + 1}`;
    params.push(parseInt(limit));

    const res = await pool.query(q, params);
    return reply.send({ jobs: res.rows });
  });

  // GET /portal/client/jobs/:id — detalhe + thread de aprovação
  app.get('/portal/client/jobs/:id', async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;

    const { id } = request.params as any;

    const jobRes = await pool.query(
      `SELECT b.id, b.title, b.status, b.due_at, b.updated_at,
              b.copy_approved_at, b.copy_approval_comment, b.labels
       FROM edro_briefings b
       WHERE b.id = $1 AND b.main_client_id = $2`,
      [id, clientId],
    );
    if (!jobRes.rows.length) return reply.status(404).send({ error: 'Job not found' });

    const threadRes = await pool.query(
      `SELECT id, author_type, author_name, message, created_at
       FROM copy_approval_thread
       WHERE briefing_id = $1
       ORDER BY created_at ASC`,
      [id],
    );

    return reply.send({ job: jobRes.rows[0], thread: threadRes.rows });
  });

  // POST /portal/client/jobs/:id/approve — cliente aprova copy
  app.post('/portal/client/jobs/:id/approve', {
    preHandler: [requirePortalCapability('approve')],
  }, async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;
    const tenantId = request.user?.tenant_id ?? null;

    const { id } = request.params as any;
    const { comment } = z.object({ comment: z.string().optional() }).parse(request.body ?? {});

    // Verify ownership
    const check = await pool.query(
      `SELECT id FROM edro_briefings WHERE id = $1 AND main_client_id = $2`,
      [id, clientId],
    );
    if (!check.rows.length) return reply.status(404).send({ error: 'Job not found' });

    // Fetch client name for thread
    const clientRes = await pool.query(`SELECT name FROM clients WHERE id = $1`, [clientId]);
    const clientName = clientRes.rows[0]?.name ?? 'Cliente';

    // Update briefing
    await pool.query(
      `UPDATE edro_briefings
       SET copy_approved_at = NOW(), copy_approval_comment = $1
       WHERE id = $2`,
      [comment ?? null, id],
    );

    // Add to thread
    if (comment) {
      await pool.query(
        `INSERT INTO copy_approval_thread (briefing_id, author_type, author_name, message)
         VALUES ($1, 'client', $2, $3)`,
        [id, clientName, `✓ Aprovado: ${comment}`],
      );
    } else {
      await pool.query(
        `INSERT INTO copy_approval_thread (briefing_id, author_type, author_name, message)
         VALUES ($1, 'client', $2, '✓ Copy aprovada pelo cliente.')`,
        [id, clientName],
      );
    }

    if (tenantId) {
      const creativeContext = await resolveArtDirectionCreativeContext({
        tenantId,
        briefingId: id,
        clientId,
      }).catch(() => null);
      const daMetadata = buildArtDirectionFeedbackMetadata({
        context: creativeContext,
        metadata: {
          feedback: comment ?? null,
        },
        source: 'client_portal_approval',
        reviewActor: 'client',
        reviewStage: 'client_portal',
        briefingId: id,
        clientId,
      });
      if (
        daMetadata.visual_intent ||
        daMetadata.strategy_summary ||
        daMetadata.reference_ids?.length ||
        daMetadata.reference_urls?.length ||
        daMetadata.concept_slugs?.length ||
        daMetadata.trend_tags?.length
      ) {
        await recordArtDirectionFeedbackEvent({
          tenantId,
          clientId,
          creativeSessionId: creativeContext?.creativeSessionId ?? null,
          referenceId: getPrimaryArtDirectionReferenceId(daMetadata),
          eventType: 'approved',
          notes: comment ?? 'client_portal_approved',
          metadata: daMetadata,
          createdBy: request.user?.id ?? null,
        }).catch(() => {});
      }
    }

    return reply.send({ ok: true });
  });

  // POST /portal/client/jobs/request — cliente envia novo pedido
  app.post('/portal/client/jobs/request', {
    preHandler: [requirePortalCapability('request')],
  }, async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;

    const { message } = z.object({ message: z.string().min(5) }).parse(request.body ?? {});

    // Get client info to resolve edro_clients UUID
    const clientRes = await pool.query(
      `SELECT name, tenant_id FROM clients WHERE id = $1`,
      [clientId],
    );
    if (!clientRes.rows.length) return reply.status(404).send({ error: 'Client not found' });
    const { name: clientName, tenant_id: tenantId } = clientRes.rows[0];

    const edroRes = await pool.query(
      `SELECT id FROM edro_clients WHERE client_id = $1 AND tenant_id = $2 LIMIT 1`,
      [clientId, tenantId],
    );
    if (!edroRes.rows.length) {
      // Create a simple note in the whatsapp_group_messages style instead
      await pool.query(
        `INSERT INTO webhook_events (tenant_id, client_id, source, raw_payload, extracted_message)
         VALUES ($1, $2, 'portal', $3, $4)`,
        [tenantId, clientId, JSON.stringify({ message }), message],
      );
      return reply.send({ ok: true });
    }

    const { createBriefing } = await import('../repositories/edroBriefingRepository');
    await createBriefing({
      clientId: edroRes.rows[0].id,
      title: `Pedido via Portal — ${message.slice(0, 60)}`,
      status: 'draft',
      payload: {
        objective: message,
        notes: `Pedido enviado pelo cliente ${clientName} via Portal do Cliente.`,
        origin: 'client_portal',
      },
      createdBy: 'client-portal',
    });

    return reply.send({ ok: true });
  });

  // POST /portal/client/jobs/:id/revision — cliente solicita revisão
  app.post('/portal/client/jobs/:id/revision', {
    preHandler: [requirePortalCapability('approve')],
  }, async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;

    const { id } = request.params as any;
    const { comment } = z.object({ comment: z.string().min(1) }).parse(request.body ?? {});

    // Verify ownership
    const check = await pool.query(
      `SELECT id FROM edro_briefings WHERE id = $1 AND main_client_id = $2`,
      [id, clientId],
    );
    if (!check.rows.length) return reply.status(404).send({ error: 'Job not found' });

    const clientRes = await pool.query(`SELECT name FROM clients WHERE id = $1`, [clientId]);
    const clientName = clientRes.rows[0]?.name ?? 'Cliente';

    // Add revision request to thread
    await pool.query(
      `INSERT INTO copy_approval_thread (briefing_id, author_type, author_name, message)
       VALUES ($1, 'client', $2, $3)`,
      [id, clientName, comment],
    );

    // Move briefing back to in_progress if it was in review
    await pool.query(
      `UPDATE edro_briefings SET status = 'in_progress', copy_approved_at = NULL
       WHERE id = $1 AND status = 'review'`,
      [id],
    );

    return reply.send({ ok: true });
  });

  // GET /portal/client/reports — pre-generated reports + on-demand fallback for last 6 months
  app.get('/portal/client/reports', async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;

    // Try pre-generated reports from DB first
    const dbRes = await pool.query(
      `SELECT id, period_month, title, generated_at as created_at,
              '/api/portal/client/reports/' || period_month || '/pdf' as pdf_url
       FROM client_monthly_reports
       WHERE client_id = $1
       ORDER BY period_month DESC
       LIMIT 12`,
      [clientId],
    );

    if (dbRes.rows.length > 0) {
      return reply.send({ reports: dbRes.rows });
    }

    // Fallback: last 6 months on-demand
    const reports = [];
    const now = new Date();
    for (let i = 1; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      reports.push({
        id: `${clientId}-${month}`,
        period_month: month,
        title: `Relatório ${label.charAt(0).toUpperCase() + label.slice(1)}`,
        created_at: d.toISOString(),
        pdf_url: `/api/portal/client/reports/${month}/pdf`,
      });
    }
    return reply.send({ reports });
  });

  // GET /portal/client/reports/:month/pdf — gera PDF do relatório mensal
  app.get('/portal/client/reports/:month/pdf', async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;

    const { month } = request.params as { month: string };
    if (!/^\d{4}-\d{2}$/.test(month)) return reply.status(400).send({ error: 'Invalid month format' });

    const { generateClientReportPdf } = await import('../services/clientReportService');
    const buf = await generateClientReportPdf(clientId, month);

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="relatorio-${month}.pdf"`)
      .send(buf);
  });

  // GET /portal/client/invoices — faturas do cliente
  app.get('/portal/client/invoices', async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;

    const { limit = '20' } = request.query as any;

    const res = await pool.query(
      `SELECT id, description, amount_brl, status, due_date, paid_at, period_month, pdf_url
       FROM invoices
       WHERE client_id = $1 AND status != 'cancelled'
       ORDER BY created_at DESC
       LIMIT $2`,
      [clientId, parseInt(limit)],
    );

    return reply.send({ invoices: res.rows });
  });

  // GET /portal/client/briefings — lista solicitações de briefing do cliente
  app.get('/portal/client/briefings', {
    preHandler: [requirePortalCapability('request')],
  }, async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;
    const tenantId = request.user?.tenant_id;

    const res = await pool.query(
      `SELECT id, status, form_data, ai_enriched, agency_notes, created_at, updated_at
       FROM portal_briefing_requests
       WHERE client_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC
       LIMIT 50`,
      [clientId, tenantId],
    );
    return reply.send({ briefings: res.rows });
  });

  // POST /portal/client/briefings/enrich — AI enrichment preview (sem salvar)
  app.post('/portal/client/briefings/enrich', {
    preHandler: [requirePortalCapability('request')],
  }, async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;

    const schema = z.object({
      type: z.string(),
      platform: z.string().optional(),
      objective: z.string().min(10),
      deadline: z.string().optional(),
      budget_range: z.string().optional(),
      notes: z.string().optional(),
    });
    const form = schema.parse(request.body ?? {});

    const clientRes = await pool.query(`SELECT name FROM clients WHERE id = $1`, [clientId]);
    const clientName = clientRes.rows[0]?.name ?? 'Cliente';

    try {
      const { ClaudeService: claudeService } = await import('../services/ai/claudeService');
      const prompt = `Você é assistente de operações de uma agência criativa. Um cliente enviou esta solicitação de job:

Cliente: ${clientName}
Tipo: ${form.type}
Plataforma: ${form.platform ?? 'Não informado'}
Objetivo: ${form.objective}
Prazo: ${form.deadline ?? 'Não informado'}
Orçamento: ${form.budget_range ?? 'Não informado'}
Observações: ${form.notes ?? ''}

Gere um enriquecimento estruturado para a equipe interna da agência. Responda SOMENTE com JSON válido:
{
  "suggested_title": "título objetivo para o card interno",
  "job_type": "social_media|email|ads|site|video|print|branding|outro",
  "urgency": "low|medium|high|urgent",
  "key_deliverables": ["entregável 1", "entregável 2"],
  "suggested_platforms": ["plataforma1"],
  "estimated_complexity": "small|medium|large",
  "internal_notes": "observação estratégica para a equipe"
}`;

      const result = await claudeService.generateCompletion({
        prompt,
        temperature: 0.3,
        maxTokens: 600,
      });

      let enriched: any = {};
      try { enriched = JSON.parse(result.text.trim()); } catch {
        const match = result.text.match(/\{[\s\S]*\}/);
        if (match) enriched = JSON.parse(match[0]);
      }

      return reply.send({ ok: true, enriched });
    } catch (err: any) {
      return reply.status(500).send({ error: 'enrichment_failed', detail: err?.message });
    }
  });

  // POST /portal/client/briefings — submete novo briefing request
  app.post('/portal/client/briefings', {
    preHandler: [requirePortalCapability('request')],
  }, async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;
    const tenantId = request.user?.tenant_id;
    const contactId = request.user?.contact_id ?? null;

    const schema = z.object({
      form_data: z.object({
        type: z.string(),
        platform: z.string().optional(),
        objective: z.string().min(10),
        deadline: z.string().optional(),
        budget_range: z.string().optional(),
        notes: z.string().optional(),
      }),
      ai_enriched: z.any().optional(),
    });
    const { form_data, ai_enriched } = schema.parse(request.body ?? {});

    const result = await pool.query(
      `INSERT INTO portal_briefing_requests
         (client_id, tenant_id, contact_id, status, form_data, ai_enriched)
       VALUES ($1, $2, $3, 'submitted', $4, $5)
       RETURNING id, status, created_at`,
      [clientId, tenantId, contactId, form_data, ai_enriched ?? null],
    );

    const row = result.rows[0];

    // Notify agency team via email (immediate, synchronous-ish)
    await notifyAgencyNewBriefingRequest({
      tenantId,
      clientId,
      briefingId: row.id,
      formData: form_data,
    }).catch(() => {});

    // Jarvis auto-pipeline: fire-and-forget (concept + copy + Trello card + WhatsApp)
    setImmediate(() => {
      runBriefingAutoPipeline({
        briefingId:  row.id,
        clientId,
        tenantId,
        formData:    form_data,
        aiEnriched:  ai_enriched ?? null,
      }).catch(err => console.error('[briefingPipeline] Unhandled error:', err));
    });

    return reply.send({ ok: true, briefing: row });
  });
}

// ── Public token routes (separate Fastify instance — no JWT preHandler) ──────

export async function portalTokenRoutes(app: FastifyInstance) {

  // POST /portal/invite/:clientId — generate magic link (admin only)
  app.post('/portal/invite/:clientId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:write'), requireClientPerm('write')],
  }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id;
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

    const { clientId } = request.params as { clientId: string };
    const { label, expiresInDays = 90 } = z.object({
      label: z.string().optional(),
      expiresInDays: z.coerce.number().min(1).max(365).optional(),
    }).parse(request.body ?? {});

    // Verify client belongs to this tenant
    const check = await pool.query(
      `SELECT id, name FROM clients WHERE id = $1 AND tenant_id = $2`,
      [clientId, tenantId],
    );
    if (!check.rows.length) return reply.status(404).send({ error: 'Client not found' });

    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const result = await pool.query(
      `INSERT INTO client_portal_tokens (tenant_id, client_id, label, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, token, label, expires_at, created_at`,
      [tenantId, clientId, label ?? `Portal ${check.rows[0].name}`, expiresAt],
    );

    const row = result.rows[0];
    let portalUrl: string;
    try {
      portalUrl = `${resolvePortalBaseUrl()}/portal/${row.token}`;
    } catch {
      return reply.status(503).send({ error: 'portal_url_not_configured' });
    }

    return reply.send({
      ok: true,
      token: row.token,
      url: portalUrl,
      label: row.label,
      expiresAt: row.expires_at,
      createdAt: row.created_at,
    });
  });

  // GET /portal/token/:token — exchange magic token for a client JWT
  // Handles both client_portal_tokens (generic) and portal_contacts.invite_token (contact-specific)
  app.get('/portal/token/:token', async (request: any, reply) => {
    const { token } = request.params as { token: string };

    // 1. Check portal_contacts invite tokens first
    const contactRes = await pool.query(
      `SELECT pc.id AS contact_id, pc.client_id, pc.tenant_id, pc.email, pc.name, pc.role,
              c.name AS client_name,
              c.profile->>'logo_url' AS client_logo_url
       FROM portal_contacts pc
       JOIN clients c ON c.id = pc.client_id
       WHERE pc.invite_token = $1 AND pc.is_active = true`,
      [token],
    );

    if (contactRes.rows.length > 0) {
      const c = contactRes.rows[0];
      // Mark accepted
      await pool.query(
        `UPDATE portal_contacts
         SET accepted_at = COALESCE(accepted_at, now()), invite_token = NULL, last_login_at = now()
         WHERE id = $1`,
        [c.contact_id],
      );

      const jwt = app.jwt.sign(
        {
          sub: c.contact_id,
          role: 'client',
          client_id: c.client_id,
          tenant_id: c.tenant_id,
          contact_id: c.contact_id,
          contact_role: c.role,
          client_name: c.client_name,
          client_logo_url: c.client_logo_url ?? null,
          name: c.name ?? c.email,
        },
        { expiresIn: '30d' },
      );
      return reply.send({ token: jwt, clientName: c.client_name });
    }

    // 2. Fall back to client_portal_tokens (generic magic link)
    const result = await pool.query(
      `SELECT cpt.id, cpt.tenant_id, cpt.client_id, cpt.expires_at,
              c.name AS client_name,
              c.profile->>'logo_url' AS client_logo_url
       FROM client_portal_tokens cpt
       JOIN clients c ON c.id = cpt.client_id
       WHERE cpt.token = $1`,
      [token],
    );

    if (!result.rows.length) {
      return reply.status(404).send({ error: 'Token inválido ou expirado.' });
    }

    const row = result.rows[0];

    // Check expiry
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return reply.status(410).send({ error: 'Link expirado.' });
    }

    // Update last_used_at
    await pool.query(
      `UPDATE client_portal_tokens SET last_used_at = now() WHERE id = $1`,
      [row.id],
    );

    // Issue client JWT (7 days)
    const jwt = app.jwt.sign(
      {
        sub: row.client_id,
        role: 'client',
        client_id: row.client_id,
        tenant_id: row.tenant_id,
        client_name: row.client_name,
        client_logo_url: row.client_logo_url ?? null,
        portal_token: token,
      },
      { expiresIn: '7d' },
    );

    return reply.send({ token: jwt, clientName: row.client_name });
  });

  // GET /portal/links/:clientId — list active tokens for admin
  app.get('/portal/links/:clientId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:read'), requireClientPerm('read')],
  }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id;
    const { clientId } = request.params as { clientId: string };

    const result = await pool.query(
      `SELECT id, token, label, expires_at, last_used_at, created_at
       FROM client_portal_tokens
       WHERE tenant_id = $1 AND client_id = $2
       ORDER BY created_at DESC`,
      [tenantId, clientId],
    );

    let portalBaseUrl: string;
    try {
      portalBaseUrl = resolvePortalBaseUrl();
    } catch {
      return reply.status(503).send({ error: 'portal_url_not_configured' });
    }
    return reply.send({
      links: result.rows.map(r => ({
        ...r,
        url: `${portalBaseUrl}/portal/${r.token}`,
      })),
    });
  });

  // DELETE /portal/links/:tokenId — revoke token
  app.delete('/portal/links/:tokenId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:write'), requirePortalLinkPerm('write')],
  }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id;
    const { tokenId } = request.params as { tokenId: string };

    await pool.query(
      `DELETE FROM client_portal_tokens WHERE id = $1 AND tenant_id = $2`,
      [tokenId, tenantId],
    );
    return reply.send({ ok: true });
  });

  // ── Portal Contacts (multi-user per client) ───────────────────────────────────

  // POST /portal/contacts/:clientId — invite contact
  app.post('/portal/contacts/:clientId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:write'), requireClientPerm('write')],
  }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id;
    const { clientId } = request.params as { clientId: string };

    const { email, name, role } = z.object({
      email: z.string().email(),
      name: z.string().optional(),
      role: z.enum(['viewer', 'requester', 'approver', 'admin']).default('viewer'),
    }).parse(request.body ?? {});

    const normalizedEmail = email.trim().toLowerCase();

    // Verify client belongs to tenant + cap at 5
    const check = await pool.query(
      `SELECT id, name FROM clients WHERE id = $1 AND tenant_id = $2`,
      [clientId, tenantId],
    );
    if (!check.rows.length) return reply.status(404).send({ error: 'Client not found' });

    const existingContactRes = await pool.query(
      `SELECT id, is_active
         FROM portal_contacts
        WHERE client_id = $1 AND tenant_id = $2 AND email = $3
        LIMIT 1`,
      [clientId, tenantId, normalizedEmail],
    );
    const existingContact = existingContactRes.rows[0] as { id: string; is_active: boolean } | undefined;

    const countRes = await pool.query(
      `SELECT COUNT(*)::int AS n FROM portal_contacts WHERE client_id = $1 AND is_active = true`,
      [clientId],
    );
    const activeCount = countRes.rows[0]?.n ?? 0;
    const willConsumeNewSeat = !existingContact || !existingContact.is_active;
    if (willConsumeNewSeat && activeCount >= 5) {
      return reply.status(422).send({ error: 'max_contacts_reached', max: 5 });
    }

    const inviteToken = crypto.randomBytes(24).toString('hex');
    const result = await pool.query(
      `INSERT INTO portal_contacts (client_id, tenant_id, email, name, role, invite_token, invited_at)
       VALUES ($1, $2, $3, $4, $5, $6, now())
       ON CONFLICT (client_id, email) DO UPDATE
         SET role = EXCLUDED.role, name = COALESCE(EXCLUDED.name, portal_contacts.name),
             invite_token = EXCLUDED.invite_token, invited_at = now(), is_active = true,
             accepted_at = CASE WHEN portal_contacts.is_active THEN portal_contacts.accepted_at ELSE NULL END
       RETURNING id, email, name, role, invited_at, accepted_at, is_active`,
      [clientId, tenantId, normalizedEmail, name ?? null, role, inviteToken],
    );

    const contact = result.rows[0];

    // Send invite email
    let portalBaseUrl: string;
    try { portalBaseUrl = resolvePortalBaseUrl(); } catch { portalBaseUrl = ''; }

    if (portalBaseUrl && isEmailConfigured()) {
      const inviteUrl = `${portalBaseUrl}/portal/${inviteToken}`;
      const clientName = check.rows[0].name;
      await sendEmail({
        to: normalizedEmail,
        subject: `Você foi convidado para o portal da ${clientName}`,
        tenantId,
        html: buildInviteEmail({ name: name ?? normalizedEmail, clientName, inviteUrl, role }),
      }).catch(() => {});
    }

    return reply.send({ ok: true, contact });
  });

  // GET /portal/contacts/:clientId — list contacts
  app.get('/portal/contacts/:clientId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:read'), requireClientPerm('read')],
  }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id;
    const { clientId } = request.params as { clientId: string };

    const res = await pool.query(
      `SELECT id, email, name, role, invited_at, accepted_at, last_login_at, is_active
       FROM portal_contacts
       WHERE client_id = $1 AND tenant_id = $2
       ORDER BY created_at ASC`,
      [clientId, tenantId],
    );
    return reply.send({ contacts: res.rows });
  });

  // PATCH /portal/contacts/:contactId — update role
  app.patch('/portal/contacts/:contactId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:write'), requirePortalContactPerm('write')],
  }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id;
    const { contactId } = request.params as { contactId: string };

    const { role } = z.object({
      role: z.enum(['viewer', 'requester', 'approver', 'admin']),
    }).parse(request.body ?? {});

    await pool.query(
      `UPDATE portal_contacts SET role = $1
       WHERE id = $2 AND tenant_id = $3`,
      [role, contactId, tenantId],
    );
    return reply.send({ ok: true });
  });

  // DELETE /portal/contacts/:contactId — deactivate
  app.delete('/portal/contacts/:contactId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:write'), requirePortalContactPerm('write')],
  }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id;
    const { contactId } = request.params as { contactId: string };

    await pool.query(
      `UPDATE portal_contacts SET is_active = false, invite_token = NULL
       WHERE id = $1 AND tenant_id = $2`,
      [contactId, tenantId],
    );
    return reply.send({ ok: true });
  });

  // POST /portal/contacts/:contactId/resend — regenerate invite token and resend email
  app.post('/portal/contacts/:contactId/resend', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:write'), requirePortalContactPerm('write')],
  }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id;
    const { contactId } = request.params as { contactId: string };

    const result = await pool.query(
      `SELECT pc.id, pc.email, pc.name, pc.role, pc.is_active, c.name AS client_name
         FROM portal_contacts pc
         JOIN clients c ON c.id = pc.client_id
        WHERE pc.id = $1 AND pc.tenant_id = $2
        LIMIT 1`,
      [contactId, tenantId],
    );
    const contact = result.rows[0] as
      | { id: string; email: string; name?: string; role: 'viewer' | 'requester' | 'approver' | 'admin'; is_active: boolean; client_name: string }
      | undefined;
    if (!contact) return reply.status(404).send({ error: 'not_found' });
    if (!contact.is_active) return reply.status(422).send({ error: 'contact_inactive' });

    const inviteToken = crypto.randomBytes(24).toString('hex');
    await pool.query(
      `UPDATE portal_contacts
          SET invite_token = $1,
              invited_at = now(),
              accepted_at = NULL
        WHERE id = $2 AND tenant_id = $3`,
      [inviteToken, contactId, tenantId],
    );

    let portalBaseUrl: string;
    try { portalBaseUrl = resolvePortalBaseUrl(); } catch { portalBaseUrl = ''; }

    if (portalBaseUrl && isEmailConfigured()) {
      const inviteUrl = `${portalBaseUrl}/portal/${inviteToken}`;
      await sendEmail({
        to: contact.email,
        subject: `Seu acesso ao portal da ${contact.client_name}`,
        tenantId,
        html: buildInviteEmail({
          name: contact.name ?? contact.email,
          clientName: contact.client_name,
          inviteUrl,
          role: contact.role,
        }),
      }).catch(() => {});
    }

    return reply.send({ ok: true });
  });

  // ── Admin Briefing Request Queue ──────────────────────────────────────────────

  // GET /admin/briefing-requests — fila de solicitações
  app.get('/admin/briefing-requests', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:read')],
  }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id;
    const { status = 'submitted', limit = '50' } = request.query as any;

    const res = await pool.query(
      `SELECT br.id, br.status, br.form_data, br.ai_enriched, br.agency_notes,
              br.auto_pipeline_output, br.trello_card_id, br.pipeline_ran_at,
              br.created_at, br.updated_at,
              c.name AS client_name, c.id AS client_id,
              pc.name AS contact_name, pc.email AS contact_email, pc.role AS contact_role
       FROM portal_briefing_requests br
       JOIN clients c ON c.id = br.client_id
       LEFT JOIN portal_contacts pc ON pc.id = br.contact_id
       WHERE br.tenant_id = $1
         AND ($2 = 'all' OR br.status = $2)
       ORDER BY br.created_at DESC
       LIMIT $3`,
      [tenantId, status, parseInt(limit)],
    );
    return reply.send({ requests: res.rows });
  });

  // PATCH /admin/briefing-requests/:id — accept or decline
  app.patch('/admin/briefing-requests/:id', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:write')],
  }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id;
    const { id } = request.params as { id: string };

    const { action, agency_notes } = z.object({
      action: z.enum(['accept', 'decline']),
      agency_notes: z.string().optional(),
    }).parse(request.body ?? {});

    const newStatus = action === 'accept' ? 'accepted' : 'declined';

    const result = await pool.query(
      `UPDATE portal_briefing_requests
       SET status = $1, agency_notes = COALESCE($2, agency_notes), updated_at = now()
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, status, client_id, contact_id, form_data, ai_enriched, trello_card_id`,
      [newStatus, agency_notes ?? null, id, tenantId],
    );
    if (!result.rows.length) return reply.status(404).send({ error: 'Not found' });

    const row = result.rows[0];
    const clientRes = await pool.query(`SELECT name FROM clients WHERE id = $1`, [row.client_id]);
    const clientName = clientRes.rows[0]?.name ?? row.client_id;

    // Notify contact by email if accepted/declined
    if (row.contact_id) {
      const contactRes = await pool.query(
        `SELECT email, name FROM portal_contacts WHERE id = $1`,
        [row.contact_id],
      );
      const contact = contactRes.rows[0];
      if (contact && isEmailConfigured()) {
        const title = (row.form_data as any)?.objective?.slice(0, 60) ?? 'sua solicitação';
        await sendEmail({
          to: contact.email,
          subject: action === 'accept'
            ? `Solicitação recebida — ${clientName}`
            : `Atualização sobre sua solicitação — ${clientName}`,
          tenantId,
          html: buildBriefingStatusEmail({ name: contact.name ?? contact.email, clientName, action, title, agencyNotes: agency_notes }),
        }).catch(() => {});
      }
    }

    // On accept: create Trello card (if not already created) + WhatsApp
    if (action === 'accept') {
      setImmediate(async () => {
        let trelloCardUrl = undefined as string | undefined;
        if (!row.trello_card_id) {
          const card = await createBriefingTrelloCard({
            briefingId: row.id,
            tenantId,
            clientId: row.client_id,
            clientName,
            formData: row.form_data as any,
            aiEnriched: row.ai_enriched as any,
            label: '✅ ACEITO',
          }).catch(() => null);
          if (card) {
            trelloCardUrl = card.cardUrl;
            await pool.query(
              `UPDATE portal_briefing_requests SET trello_card_id = $1 WHERE id = $2`,
              [card.cardId, row.id],
            ).catch(() => {});
          }
        }
        await sendBriefingAcceptedWhatsApp({
          tenantId,
          clientName,
          formData: row.form_data as any,
          aiEnriched: row.ai_enriched as any,
          trelloUrl: trelloCardUrl,
        }).catch(() => {});
      });
    }

    return reply.send({ ok: true, status: newStatus });
  });
}

// ── Email helpers ─────────────────────────────────────────────────────────────

async function notifyAgencyNewBriefingRequest(params: {
  tenantId: string;
  clientId: string;
  briefingId: string;
  formData: any;
}) {
  if (!isEmailConfigured()) return;
  const { tenantId, clientId, briefingId, formData } = params;

  // Find admin contacts for this client
  const res = await pool.query(
    `SELECT email, name FROM portal_contacts
     WHERE client_id = $1 AND tenant_id = $2 AND role = 'admin' AND is_active = true`,
    [clientId, tenantId],
  );

  // Also get tenant admin email from settings
  const settingsRes = await pool.query(
    `SELECT value FROM tenant_settings WHERE tenant_id = $1 AND key = 'notification_email' LIMIT 1`,
    [tenantId],
  ).catch(() => ({ rows: [] as any[] }));

  const notifyEmails = new Set<string>([
    ...res.rows.map((r: any) => r.email as string),
    ...(settingsRes.rows[0]?.value ? [settingsRes.rows[0].value as string] : []),
  ]);

  const clientRes = await pool.query(`SELECT name FROM clients WHERE id = $1`, [clientId]);
  const clientName = clientRes.rows[0]?.name ?? clientId;

  const subject = `Nova solicitação de job — ${clientName}`;
  const html = buildNewBriefingEmail({ clientName, briefingId, formData });

  for (const email of notifyEmails) {
    await sendEmail({ to: email, subject, html, tenantId }).catch(() => {});
  }
}

export async function notifyPortalContactsJobReady(params: {
  tenantId: string;
  clientId: string;
  briefingId: string;
  jobTitle: string;
}) {
  if (!isEmailConfigured()) return;
  const { tenantId, clientId, briefingId, jobTitle } = params;

  const res = await pool.query(
    `SELECT email, name FROM portal_contacts
     WHERE client_id = $1 AND tenant_id = $2
       AND role IN ('approver', 'admin') AND is_active = true`,
    [clientId, tenantId],
  );
  if (!res.rows.length) return;

  let portalBaseUrl = '';
  try { portalBaseUrl = resolvePortalBaseUrl(); } catch { /* */ }

  const jobUrl = portalBaseUrl ? `${portalBaseUrl}/jobs/${briefingId}` : '';

  for (const contact of res.rows) {
    await sendEmail({
      to: contact.email,
      tenantId,
      subject: `Aguardando sua aprovação — ${jobTitle}`,
      html: buildJobReadyEmail({ name: contact.name ?? contact.email, jobTitle, jobUrl }),
    }).catch(() => {});
  }
}

function buildInviteEmail(params: { name: string; clientName: string; inviteUrl: string; role: string }) {
  const { name, clientName, inviteUrl, role } = params;
  const roleLabel: Record<string, string> = {
    viewer: 'Visualizador', requester: 'Solicitante', approver: 'Aprovador', admin: 'Administrador',
  };
  return `
<div style="font-family: 'Space Grotesk', Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: #E85219; padding: 24px 32px;">
    <span style="color: white; font-size: 20px; font-weight: 700;">Edro Studio</span>
  </div>
  <div style="padding: 32px;">
    <h2 style="margin: 0 0 16px">Olá, ${name}!</h2>
    <p>Você foi convidado para acessar o portal da <strong>${clientName}</strong> como <strong>${roleLabel[role] ?? role}</strong>.</p>
    <p>Clique no botão abaixo para criar seu acesso:</p>
    <a href="${inviteUrl}" style="display:inline-block;background:#E85219;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin: 16px 0;">
      Acessar portal
    </a>
    <p style="color:#666;font-size:13px;margin-top:24px;">Este link é pessoal e expira após o primeiro uso.</p>
  </div>
</div>`;
}

function buildBriefingStatusEmail(params: {
  name: string; clientName: string; action: 'accept' | 'decline'; title: string; agencyNotes?: string;
}) {
  const { name, clientName, action, title, agencyNotes } = params;
  return `
<div style="font-family: 'Space Grotesk', Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: #E85219; padding: 24px 32px;">
    <span style="color: white; font-size: 20px; font-weight: 700;">Edro Studio</span>
  </div>
  <div style="padding: 32px;">
    <h2 style="margin: 0 0 16px">Olá, ${name}!</h2>
    ${action === 'accept'
      ? `<p>Sua solicitação <strong>"${title}"</strong> foi <strong style="color:#2e7d32">recebida</strong> pela ${clientName} e já entrou na fila de produção.</p>`
      : `<p>Sua solicitação <strong>"${title}"</strong> não pode ser processada no momento pela ${clientName}.</p>`
    }
    ${agencyNotes ? `<p style="background:#f5f5f5;padding:12px 16px;border-radius:8px;"><strong>Nota da agência:</strong> ${agencyNotes}</p>` : ''}
    <p style="color:#666;font-size:13px;margin-top:24px;">Em caso de dúvidas, entre em contato com sua agência.</p>
  </div>
</div>`;
}

function buildNewBriefingEmail(params: { clientName: string; briefingId: string; formData: any }) {
  const { clientName, briefingId, formData } = params;
  let adminUrl = '';
  try { adminUrl = resolvePortalBaseUrl().replace('cliente.', '').replace('/portal', '') + '/admin/solicitacoes'; } catch { /* */ }
  return `
<div style="font-family: 'Space Grotesk', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: #E85219; padding: 20px 32px; display:flex; align-items:center; justify-content:space-between;">
    <span style="color: white; font-size: 20px; font-weight: 700;">Edro Studio</span>
    <span style="background:rgba(255,255,255,0.2);color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;">🚨 NOVO JOB</span>
  </div>
  <div style="padding: 28px 32px;">
    <h2 style="margin: 0 0 4px; font-size:22px;">Nova solicitação de job</h2>
    <p style="color:#888; margin:0 0 20px; font-size:14px;">de <strong style="color:#1a1a1a">${clientName}</strong></p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 20px;border-radius:8px;overflow:hidden;">
      <tr><td style="padding:10px 14px;background:#fafafa;font-weight:600;font-size:13px;width:110px;border-bottom:1px solid #eee">Tipo</td><td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:13px">${formData.type ?? '—'}</td></tr>
      <tr><td style="padding:10px 14px;background:#fafafa;font-weight:600;font-size:13px;border-bottom:1px solid #eee">Plataforma</td><td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:13px">${formData.platform ?? '—'}</td></tr>
      <tr><td style="padding:10px 14px;background:#fafafa;font-weight:600;font-size:13px;border-bottom:1px solid #eee">Prazo</td><td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:13px">${formData.deadline ?? '—'}</td></tr>
      <tr><td style="padding:10px 14px;background:#fafafa;font-weight:600;font-size:13px;border-bottom:1px solid #eee">Orçamento</td><td style="padding:10px 14px;border-bottom:1px solid #eee;font-size:13px">${formData.budget_range ?? '—'}</td></tr>
      <tr><td style="padding:10px 14px;background:#fafafa;font-weight:600;font-size:13px;vertical-align:top">Objetivo</td><td style="padding:10px 14px;font-size:13px;line-height:1.5">${formData.objective ?? '—'}</td></tr>
    </table>
    ${adminUrl ? `<a href="${adminUrl}" style="display:inline-block;background:#E85219;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver solicitação →</a>` : ''}
    <p style="color:#aaa;font-size:11px;margin-top:20px;">O Jarvis está processando este briefing em background — conceito, copy e card no Trello estarão prontos em instantes.</p>
    <p style="color:#ccc;font-size:11px;">ID: ${briefingId}</p>
  </div>
</div>`;
}

function buildJobReadyEmail(params: { name: string; jobTitle: string; jobUrl: string }) {
  const { name, jobTitle, jobUrl } = params;
  return `
<div style="font-family: 'Space Grotesk', Arial, sans-serif; max-width: 520px; margin: 0 auto; color: #1a1a1a;">
  <div style="background: #E85219; padding: 24px 32px;">
    <span style="color: white; font-size: 20px; font-weight: 700;">Edro Studio</span>
  </div>
  <div style="padding: 32px;">
    <h2 style="margin: 0 0 16px">Olá, ${name}!</h2>
    <p>O job <strong>"${jobTitle}"</strong> está aguardando sua aprovação.</p>
    ${jobUrl ? `<a href="${jobUrl}" style="display:inline-block;background:#E85219;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0;">Ver e aprovar</a>` : ''}
    <p style="color:#666;font-size:13px;margin-top:24px;">Acesse o portal para revisar e aprovar o conteúdo.</p>
  </div>
</div>`;
}
