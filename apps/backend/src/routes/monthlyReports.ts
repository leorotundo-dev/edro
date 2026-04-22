import { FastifyInstance } from 'fastify';
import { authGuard, requirePerm } from '../auth/rbac';
import { query } from '../db/db';
import {
  approveReport,
  autoGenerateReport,
  getReport,
  getReportByToken,
  listReports,
  publishReport,
  submitForApproval,
  updateReport,
} from '../services/monthlyReportService';

export default async function monthlyReportsRoutes(app: FastifyInstance) {
  const guards = [authGuard, requirePerm('clients:read')];

  // POST /monthly-reports/generate — body: { clientId, periodMonth }
  app.post('/monthly-reports/generate', { preHandler: guards }, async (req: any, reply) => {
    const tenantId = req.user?.tenant_id as string;
    if (!tenantId) return reply.status(401).send({ error: 'missing_tenant' });

    const { clientId, periodMonth } = (req.body as any) || {};
    if (!clientId || !periodMonth) {
      return reply.status(400).send({ error: 'clientId and periodMonth are required' });
    }
    if (!/^\d{4}-\d{2}$/.test(periodMonth)) {
      return reply.status(400).send({ error: 'periodMonth must be YYYY-MM' });
    }

    const report = await autoGenerateReport(clientId, periodMonth, tenantId);
    return reply.send({ report });
  });

  // POST /monthly-reports/generate-all — body: { periodMonth } — gera para todos os clientes ativos
  app.post('/monthly-reports/generate-all', { preHandler: guards }, async (req: any, reply) => {
    const tenantId = req.user?.tenant_id as string;
    if (!tenantId) return reply.status(401).send({ error: 'missing_tenant' });

    const { periodMonth } = (req.body as any) || {};
    if (!periodMonth || !/^\d{4}-\d{2}$/.test(periodMonth)) {
      return reply.status(400).send({ error: 'periodMonth is required (YYYY-MM)' });
    }

    const { rows: clients } = await query<{ id: string }>(
      `SELECT id FROM clients WHERE tenant_id = $1 AND active = true`,
      [tenantId],
    );

    let generated = 0;
    let failed = 0;
    for (const client of clients) {
      try {
        await autoGenerateReport(client.id, periodMonth, tenantId);
        generated++;
      } catch {
        failed++;
      }
    }

    return reply.send({ generated, failed, month: periodMonth });
  });

  // GET /monthly-reports — query: ?clientId=&status=&limit=
  app.get('/monthly-reports', { preHandler: guards }, async (req: any, reply) => {
    const tenantId = req.user?.tenant_id as string;
    if (!tenantId) return reply.status(401).send({ error: 'missing_tenant' });

    const qs = req.query as Record<string, string>;
    const reports = await listReports(tenantId, {
      clientId: qs.clientId || undefined,
      status:   qs.status   || undefined,
      limit:    qs.limit    ? parseInt(qs.limit, 10) : undefined,
    });

    return reply.send({ reports });
  });

  // GET /monthly-reports/:clientId/:month
  app.get('/monthly-reports/:clientId/:month', { preHandler: guards }, async (req: any, reply) => {
    const tenantId = req.user?.tenant_id as string;
    if (!tenantId) return reply.status(401).send({ error: 'missing_tenant' });

    const { clientId, month } = req.params as { clientId: string; month: string };
    const report = await getReport(clientId, month, tenantId);
    if (!report) return reply.status(404).send({ error: 'report_not_found' });

    return reply.send({ report });
  });

  // PUT /monthly-reports/:id — body: { sections }
  app.put('/monthly-reports/:id', { preHandler: guards }, async (req: any, reply) => {
    const tenantId = req.user?.tenant_id as string;
    if (!tenantId) return reply.status(401).send({ error: 'missing_tenant' });

    const { id } = req.params as { id: string };
    const { sections } = (req.body as any) || {};
    if (!sections) return reply.status(400).send({ error: 'sections is required' });

    const report = await updateReport(id, sections, tenantId);
    if (!report) return reply.status(404).send({ error: 'report_not_found' });

    return reply.send({ report });
  });

  // POST /monthly-reports/:id/submit
  app.post('/monthly-reports/:id/submit', { preHandler: guards }, async (req: any, reply) => {
    const tenantId = req.user?.tenant_id as string;
    if (!tenantId) return reply.status(401).send({ error: 'missing_tenant' });

    const { id } = req.params as { id: string };
    const report = await submitForApproval(id, tenantId);
    if (!report) return reply.status(404).send({ error: 'report_not_found_or_not_draft' });

    return reply.send({ report });
  });

  // POST /monthly-reports/:id/approve — body: { approvedBy }
  app.post('/monthly-reports/:id/approve', { preHandler: guards }, async (req: any, reply) => {
    const tenantId = req.user?.tenant_id as string;
    if (!tenantId) return reply.status(401).send({ error: 'missing_tenant' });

    const { id } = req.params as { id: string };
    const { approvedBy } = (req.body as any) || {};
    if (!approvedBy) return reply.status(400).send({ error: 'approvedBy is required' });

    const report = await approveReport(id, approvedBy, tenantId);
    if (!report) return reply.status(404).send({ error: 'report_not_found_or_not_pending' });

    return reply.send({ report });
  });

  // POST /monthly-reports/:id/publish
  app.post('/monthly-reports/:id/publish', { preHandler: guards }, async (req: any, reply) => {
    const tenantId = req.user?.tenant_id as string;
    if (!tenantId) return reply.status(401).send({ error: 'missing_tenant' });

    const { id } = req.params as { id: string };
    const report = await publishReport(id, tenantId);
    if (!report) return reply.status(404).send({ error: 'report_not_found_or_not_approved' });

    return reply.send({ report });
  });

  // GET /r/:token — PUBLIC, no auth
  app.get('/r/:token', async (req: any, reply) => {
    const { token } = req.params as { token: string };
    const report = await getReportByToken(token);
    if (!report) return reply.status(404).send({ error: 'report_not_found' });

    return reply.send({ report });
  });
}
