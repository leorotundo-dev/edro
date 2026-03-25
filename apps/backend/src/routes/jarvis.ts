import type { FastifyInstance } from 'fastify';
import { authGuard } from '../auth/rbac';
import { getJarvisAlerts, dismissAlert, snoozeAlert } from '../services/jarvisAlertEngine';
import { query } from '../db';

export default async function jarvisRoutes(app: FastifyInstance) {

  // GET /jarvis/alerts — alertas abertos do tenant (opcionalmente filtrado por client_id)
  app.get('/jarvis/alerts', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { client_id, limit } = request.query as { client_id?: string; limit?: string };
    const alerts = await getJarvisAlerts(tenantId, client_id, Number(limit) || 20);
    return reply.send({ success: true, data: alerts });
  });

  // POST /jarvis/alerts/:id/dismiss
  app.post('/jarvis/alerts/:id/dismiss', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { id } = request.params as { id: string };
    await dismissAlert(id, tenantId);
    return reply.send({ success: true });
  });

  // POST /jarvis/alerts/:id/snooze
  app.post('/jarvis/alerts/:id/snooze', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { id } = request.params as { id: string };
    const { hours = 24 } = request.body as { hours?: number };
    await snoozeAlert(id, tenantId, hours);
    return reply.send({ success: true });
  });

  // GET /jarvis/feed — unified decision queue for JarvisHomeSection
  app.get('/jarvis/feed', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;

    const [alertsRes, briefingPendingRes, autoBriefingsRes, proposalsRes, opportunitiesRes] = await Promise.allSettled([
      // Open Jarvis alerts
      getJarvisAlerts(tenantId, undefined, 10),

      // Jobs in briefing stage without a briefing submitted yet
      query(
        `SELECT j.id, j.title, c.name AS client_name
         FROM jobs j
         LEFT JOIN clients c ON c.id = j.client_id
         WHERE j.tenant_id = $1
           AND j.status IN ('intake','briefing')
           AND NOT EXISTS (SELECT 1 FROM job_briefings jb WHERE jb.job_id = j.id)
         ORDER BY j.created_at ASC LIMIT 5`,
        [tenantId],
      ),

      // Auto-generated briefings awaiting approval (fatigue alerts + auto-briefings)
      query(
        `SELECT b.id, b.title, b.drop_pct, c.name AS client_name
         FROM edro_briefings b
         LEFT JOIN clients c ON c.id = b.client_id
         WHERE b.tenant_id = $1
           AND b.status = 'draft'
           AND b.auto_generated = true
         ORDER BY b.created_at DESC LIMIT 5`,
        [tenantId],
      ),

      // Meeting proposals (Jarvis proposals from meeting summaries)
      query(
        `SELECT jp.id, jp.title, jp.meeting_title, c.name AS client_name
         FROM jarvis_proposals jp
         LEFT JOIN clients c ON c.id = jp.client_id
         WHERE jp.tenant_id = $1
           AND jp.status = 'pending'
         ORDER BY jp.created_at DESC LIMIT 5`,
        [tenantId],
      ),

      // High-confidence opportunities without a briefing yet
      query(
        `SELECT o.id, o.title, o.confidence, c.name AS client_name, o.client_id
         FROM opportunities o
         LEFT JOIN clients c ON c.id = o.client_id
         WHERE o.tenant_id = $1
           AND o.confidence >= 75
           AND o.status = 'open'
         ORDER BY o.confidence DESC LIMIT 5`,
        [tenantId],
      ),
    ]);

    const alerts           = alertsRes.status === 'fulfilled' ? alertsRes.value : [];
    const briefingPending  = briefingPendingRes.status === 'fulfilled' ? briefingPendingRes.value.rows : [];
    const autoBriefings    = autoBriefingsRes.status === 'fulfilled' ? autoBriefingsRes.value.rows : [];
    const proposals        = proposalsRes.status === 'fulfilled' ? proposalsRes.value.rows : [];
    const opportunities    = opportunitiesRes.status === 'fulfilled' ? opportunitiesRes.value.rows : [];

    const total_actions = alerts.length + briefingPending.length + autoBriefings.length + proposals.length + opportunities.length;

    return reply.send({
      alerts,
      briefing_pending: briefingPending,
      auto_briefings: autoBriefings,
      proposals,
      opportunities,
      total_actions,
    });
  });

  // POST /jarvis/alerts/run — trigger manual (admin)
  app.post('/jarvis/alerts/run', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    try {
      const { runJarvisAlertEngine } = await import('../services/jarvisAlertEngine') as any;
      const saved = await runJarvisAlertEngine(tenantId);
      return reply.send({ success: true, saved });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });
}
