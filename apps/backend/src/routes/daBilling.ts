/**
 * DA Billing Routes — Jarvis Bedel
 *
 * Endpoints:
 *   GET  /da-billing/rates/:freelancerId            — lista rates do DA
 *   PUT  /da-billing/rates/:freelancerId/:size       — upsert rate
 *   GET  /da-billing/entries/:freelancerId           — extrato do DA (?period=YYYY-MM)
 *   GET  /da-billing/summary/:period                 — resumo admin por período
 *   POST /da-billing/entries/:entryId/approve        — aprovar entrada
 *   POST /da-billing/entries/:entryId/paid           — marcar como pago
 *   GET  /da-billing/capacity                        — slots disponíveis esta semana (?week=YYYY-MM-DD)
 *   GET  /da-billing/available-das                   — DAs disponíveis ranqueados (?skill=copy)
 */

import type { FastifyInstance } from 'fastify';
import { authGuard } from '../auth/rbac';
import { query } from '../db';
import {
  getFreelancerRates,
  upsertFreelancerRate,
  getFreelancerBillingEntries,
  getBillingPeriodSummary,
  approveBillingEntry,
  markBillingEntryPaid,
  getWeeklyCapacity,
  getAvailableDAs,
  type JobSize,
} from '../services/daBillingService';

export default async function daBillingRoutes(app: FastifyInstance) {

  // ── DA Portal: extrato do próprio DA ─────────────────────────────────────
  app.get('/da-billing/me', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const userId = request.user?.id ?? request.user?.sub as string;
    const { period } = request.query as { period?: string };
    if (!userId) return reply.status(401).send({ success: false, error: 'Unauthorized' });
    const entries = await getFreelancerBillingEntries(userId, tenantId, period);
    return reply.send({ success: true, data: entries });
  });

  // ── Rates ──────────────────────────────────────────────────────────────────

  app.get('/da-billing/rates/:freelancerId', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { freelancerId } = request.params as { freelancerId: string };
    const rates = await getFreelancerRates(freelancerId, tenantId);
    return reply.send({ success: true, data: rates });
  });

  app.put('/da-billing/rates/:freelancerId/:size', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { freelancerId, size } = request.params as { freelancerId: string; size: string };
    const { rate_cents, effective_from, notes } = request.body as {
      rate_cents: number;
      effective_from?: string;
      notes?: string;
    };

    if (!['P', 'M', 'G'].includes(size)) {
      return reply.status(400).send({ success: false, error: 'size must be P, M or G' });
    }
    if (typeof rate_cents !== 'number' || rate_cents < 0) {
      return reply.status(400).send({ success: false, error: 'rate_cents must be a non-negative number' });
    }

    const rate = await upsertFreelancerRate(
      tenantId, freelancerId, size as JobSize, rate_cents, effective_from, notes,
    );
    return reply.send({ success: true, data: rate });
  });

  // ── Entries ────────────────────────────────────────────────────────────────

  app.get('/da-billing/entries/:freelancerId', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { freelancerId } = request.params as { freelancerId: string };
    const { period } = request.query as { period?: string };
    const entries = await getFreelancerBillingEntries(freelancerId, tenantId, period);
    return reply.send({ success: true, data: entries });
  });

  app.get('/da-billing/summary/:period', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { period } = request.params as { period: string };
    const summary = await getBillingPeriodSummary(tenantId, period);
    return reply.send({ success: true, data: summary });
  });

  app.post('/da-billing/entries/:entryId/approve', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const userId = request.user?.id as string;
    const { entryId } = request.params as { entryId: string };
    await approveBillingEntry(entryId, tenantId, userId);
    return reply.send({ success: true });
  });

  app.post('/da-billing/entries/:entryId/paid', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { entryId } = request.params as { entryId: string };
    await markBillingEntryPaid(entryId, tenantId);
    return reply.send({ success: true });
  });

  // ── Bulk approve all pending entries for a freelancer in a period ─────────
  app.post('/da-billing/approve-period', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const userId = request.user?.id as string;
    const { freelancer_id, period_month } = request.body as { freelancer_id: string; period_month: string };

    const { rowCount } = await query(
      `UPDATE da_billing_entries
       SET status = 'approved', approved_at = now(), approved_by = $4, updated_at = now()
       WHERE tenant_id = $1 AND freelancer_id = $2 AND period_month = $3 AND status = 'pending'`,
      [tenantId, freelancer_id, period_month, userId],
    );
    return reply.send({ success: true, updated: rowCount ?? 0 });
  });

  // ── Capacity ───────────────────────────────────────────────────────────────

  app.get('/da-billing/capacity', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { week } = request.query as { week?: string };
    const slots = await getWeeklyCapacity(tenantId, week);
    return reply.send({ success: true, data: slots });
  });

  app.get('/da-billing/available-das', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { skill } = request.query as { skill?: string };
    const das = await getAvailableDAs(tenantId, skill);
    return reply.send({ success: true, data: das });
  });
}
