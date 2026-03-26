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
import { z } from 'zod';
import { pool } from '../db';
import { hasClientPerm, requireClientPerm } from '../auth/clientPerms';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { env } from '../env';
import {
  buildArtDirectionFeedbackMetadata,
  getPrimaryArtDirectionReferenceId,
  recordArtDirectionFeedbackEvent,
  resolveArtDirectionCreativeContext,
} from '../services/ai/artDirectionMemoryService';

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
  app.post('/portal/client/jobs/:id/approve', async (request: any, reply) => {
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
  app.post('/portal/client/jobs/request', async (request: any, reply) => {
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
  app.post('/portal/client/jobs/:id/revision', async (request: any, reply) => {
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
  app.get('/portal/token/:token', async (request: any, reply) => {
    const { token } = request.params as { token: string };

    const result = await pool.query(
      `SELECT cpt.id, cpt.tenant_id, cpt.client_id, cpt.expires_at,
              c.name AS client_name
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
}
