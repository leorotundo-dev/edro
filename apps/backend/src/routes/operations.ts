import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import {
  buildOverviewSnapshot,
  buildCalendarSnapshot,
  buildPlannerSnapshot,
  buildRiskSnapshot,
  dropJobAllocation,
  rebuildOperationalRuntime,
  syncOperationalRuntimeForJob,
  upsertJobAllocation,
} from '../services/jobs/operationsRuntimeService';
import { query } from '../db';
import { rebuildOperationalSignals } from '../services/signalService';

const allocationSchema = z.object({
  job_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  status: z.enum(['tentative', 'committed', 'blocked', 'done', 'dropped']).default('committed'),
  planned_minutes: z.number().int().min(0).max(10080).optional(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export default async function operationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.post('/operations/rebuild', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const data = await rebuildOperationalRuntime(tenantId);
    return { success: true, data };
  });

  app.post('/operations/allocations', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const changedBy = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const body = allocationSchema.parse(request.body);
    const data = await upsertJobAllocation(tenantId, {
      jobId: body.job_id,
      ownerId: body.owner_id,
      status: body.status,
      plannedMinutes: body.planned_minutes,
      startsAt: body.starts_at ?? null,
      endsAt: body.ends_at ?? null,
      notes: body.notes ?? null,
      changedBy,
    });
    await syncOperationalRuntimeForJob(tenantId, body.job_id);
    return { success: true, data };
  });

  app.delete('/operations/allocations/:jobId', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const changedBy = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const { jobId } = request.params as { jobId: string };
    const data = await dropJobAllocation(tenantId, jobId, changedBy);
    await syncOperationalRuntimeForJob(tenantId, jobId);
    return { success: true, data };
  });

  app.get('/operations/planner', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const data = await buildPlannerSnapshot(tenantId);
    return { success: true, data };
  });

  app.get('/operations/overview', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const data = await buildOverviewSnapshot(tenantId);
    return { success: true, data };
  });

  app.get('/operations/calendar', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const data = await buildCalendarSnapshot(tenantId);
    return { success: true, data };
  });

  app.get('/operations/risks', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const data = await buildRiskSnapshot(tenantId);
    return { success: true, data };
  });

  // ─── Signals feed ───

  app.get('/operations/signals', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const qs = request.query as { limit?: string };
    const limit = Math.min(Number(qs.limit || 30), 100);

    const { rows } = await query(
      `SELECT id, domain, signal_type, severity, title, summary,
              entity_type, entity_id, client_id, client_name,
              actions, created_at, snoozed_until
       FROM operational_signals
       WHERE tenant_id = $1
         AND resolved_at IS NULL
         AND (snoozed_until IS NULL OR snoozed_until < now())
       ORDER BY severity DESC, created_at DESC
       LIMIT $2`,
      [tenantId, limit],
    );

    return { success: true, data: rows };
  });

  app.post('/operations/signals/:id/resolve', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const { id } = request.params as { id: string };

    await query(
      `UPDATE operational_signals SET resolved_at = now(), resolved_by = $3
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId, userId],
    );
    return { success: true };
  });

  app.post('/operations/signals/:id/snooze', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { id } = request.params as { id: string };
    const body = request.body as { hours?: number };
    const hours = Math.min(Number(body.hours || 4), 72);

    await query(
      `UPDATE operational_signals SET snoozed_until = now() + ($3 || ' hours')::interval
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId, String(hours)],
    );
    return { success: true };
  });

  app.post('/operations/signals/rebuild', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    await rebuildOperationalSignals(tenantId);
    return { success: true };
  });
}
