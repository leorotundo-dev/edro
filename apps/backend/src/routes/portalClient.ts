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

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { pool } from '../db';

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

// ── Routes ─────────────────────────────────────────────────────────────────────

export default async function portalClientRoutes(app: FastifyInstance) {

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

  // GET /portal/client/reports — relatórios do cliente (placeholder — futuro: auto-generate from Reportei)
  app.get('/portal/client/reports', async (request: any, reply) => {
    const clientId = requireClient(request, reply);
    if (!clientId) return;

    // For now, return invoices as proxy for reports.
    // Future: query a reports table generated by reporteiSyncWorker per client.
    return reply.send({ reports: [] });
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
