import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { query } from '../db';
import { calculatePriority } from '../services/jobs/priorityService';
import { estimateMinutes } from '../services/jobs/estimationService';
import { syncOperationalSources } from '../services/jobs/sourceSyncService';
import { rebuildOperationalRuntime, syncOperationalRuntimeForJob } from '../services/jobs/operationsRuntimeService';
import { enqueueJob } from '../jobs/jobQueue';
import { getNextJobForOwner, recalculateOwnerETAs } from '../services/jobs/jobAutomationService';

const jobStatusValues = [
  'intake',
  'planned',
  'ready',
  'allocated',
  'in_progress',
  'blocked',
  'in_review',
  'awaiting_approval',
  'approved',
  'scheduled',
  'published',
  'done',
  'archived',
] as const;

const baseJobSchema = z.object({
  client_id: z.string().trim().min(1).nullable().optional(),
  title: z.string().trim().min(3),
  summary: z.string().trim().max(5000).optional().nullable(),
  job_type: z.string().trim().min(1),
  complexity: z.enum(['s', 'm', 'l']),
  channel: z.string().trim().optional().nullable(),
  source: z.string().trim().min(1),
  impact_level: z.number().int().min(0).max(5).optional().nullable(),
  dependency_level: z.number().int().min(0).max(5).optional().nullable(),
  required_skill: z.string().trim().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  deadline_at: z.string().datetime().optional().nullable(),
  estimated_minutes: z.number().int().positive().optional().nullable(),
  is_urgent: z.boolean().optional(),
  urgency_reason: z.string().trim().max(1000).optional().nullable(),
  urgency_approved_by: z.string().uuid().optional().nullable(),
  definition_of_done: z.string().trim().max(2000).optional().nullable(),
  metadata: z.record(z.string(), z.any()).optional(),
});

const createJobSchema = baseJobSchema.extend({
  status: z.enum(jobStatusValues).optional(),
});

const updateJobSchema = baseJobSchema.partial();

const statusSchema = z.object({
  status: z.enum(jobStatusValues),
  reason: z.string().trim().max(500).optional().nullable(),
});

function getClientWeight(metadata?: Record<string, any> | null) {
  const raw = Number(metadata?.client_weight ?? 3);
  return Number.isFinite(raw) ? Math.max(1, Math.min(5, raw)) : 3;
}

function isIntakeComplete(body: {
  client_id?: string | null;
  title?: string | null;
  job_type?: string | null;
  complexity?: string | null;
  source?: string | null;
  deadline_at?: string | null;
  required_skill?: string | null;
  owner_id?: string | null;
}) {
  return Boolean(
    body.client_id &&
    body.title &&
    body.job_type &&
    body.complexity &&
    body.source &&
    body.deadline_at &&
    body.required_skill &&
    body.owner_id
  );
}

function deriveBlocked(status: string) {
  return status === 'blocked' || status === 'awaiting_approval';
}

function canTransition(fromStatus: string, toStatus: string, row: any) {
  if (fromStatus === toStatus) return true;
  if (toStatus === 'blocked') return true;
  if (toStatus === 'archived') return fromStatus === 'done';
  if (toStatus === 'scheduled') return fromStatus === 'approved';
  if (toStatus === 'published') return fromStatus === 'scheduled' || fromStatus === 'approved';
  if (toStatus === 'done') return ['published', 'approved', 'in_review', 'in_progress'].includes(fromStatus);
  if (['ready', 'allocated', 'in_progress', 'in_review', 'awaiting_approval', 'approved'].includes(toStatus)) {
    if (!isIntakeComplete(row)) return false;
  }
  return true;
}

async function getSupportData(tenantId: string) {
  const [jobTypesRes, skillsRes, channelsRes, clientsRes, ownersRes] = await Promise.all([
    query(`SELECT code, label, default_skill, default_definition_of_done FROM job_types ORDER BY label ASC`),
    query(`SELECT code, label, category FROM skills ORDER BY label ASC`),
    query(`SELECT code, label FROM channels ORDER BY label ASC`),
    query(
      `SELECT
         id,
         name,
         profile->>'logo_url' AS logo_url,
         profile->'brand_colors'->>0 AS brand_color
         FROM clients
        WHERE tenant_id = $1
        ORDER BY name ASC`,
      [tenantId]
    ),
    query(
      `SELECT
         u.id,
         COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS name,
         u.email,
         tu.role,
         fp.specialty,
         CASE WHEN fp.id IS NOT NULL THEN 'freelancer' ELSE 'internal' END AS person_type
       FROM tenant_users tu
       JOIN edro_users u ON u.id = tu.user_id
       LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      WHERE tu.tenant_id = $1
      ORDER BY name ASC, u.email ASC`,
      [tenantId]
    ),
  ]);

  return {
    jobTypes: jobTypesRes.rows,
    skills: skillsRes.rows,
    channels: channelsRes.rows,
    clients: clientsRes.rows,
    owners: ownersRes.rows,
  };
}

export default async function jobsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.post('/jobs/sync-sources', { preHandler: [requirePerm('clients:write')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const result = await syncOperationalSources(tenantId);
    await rebuildOperationalRuntime(tenantId);
    return { success: true, data: result };
  });

  app.get('/jobs/lookups', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    return getSupportData(tenantId);
  });

  app.get('/jobs', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const params = request.query as Record<string, string | undefined>;
    const values: any[] = [tenantId];
    const where = [`j.tenant_id = $1`];

    if (params.status) {
      values.push(params.status);
      where.push(`j.status = $${values.length}`);
    }
    if (params.priority_band) {
      values.push(params.priority_band);
      where.push(`j.priority_band = $${values.length}`);
    }
    if (params.owner_id) {
      values.push(params.owner_id);
      where.push(`j.owner_id = $${values.length}`);
    }
    if (params.client_id) {
      values.push(params.client_id);
      where.push(`j.client_id = $${values.length}`);
    }
    if (params.urgent === 'true') {
      where.push(`j.is_urgent = true`);
    }
    if (params.unassigned === 'true') {
      where.push(`j.owner_id IS NULL`);
    }
    if (params.active !== 'false') {
      where.push(`j.status <> 'archived'`);
    }

    const { rows } = await query(
      `SELECT
         j.*,
         c.name AS client_name,
         c.profile->>'logo_url' AS client_logo_url,
         c.profile->'brand_colors'->>0 AS client_brand_color,
         COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
         u.email AS owner_email
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       LEFT JOIN edro_users u ON u.id = j.owner_id
      WHERE ${where.join(' AND ')}
      ORDER BY
        CASE j.priority_band
          WHEN 'p0' THEN 0
          WHEN 'p1' THEN 1
          WHEN 'p2' THEN 2
          WHEN 'p3' THEN 3
          ELSE 4
        END,
        j.deadline_at ASC NULLS LAST,
        j.created_at DESC`,
      values
    );

    return { data: rows };
  });

  app.get('/jobs/:jobId', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };
    const { rows } = await query(
      `SELECT
         j.*,
         c.name AS client_name,
         c.profile->>'logo_url' AS client_logo_url,
         c.profile->'brand_colors'->>0 AS client_brand_color,
         COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
         u.email AS owner_email
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       LEFT JOIN edro_users u ON u.id = j.owner_id
      WHERE j.tenant_id = $1 AND j.id = $2
      LIMIT 1`,
      [tenantId, jobId]
    );

    if (!rows.length) {
      return reply.status(404).send({ error: 'Job não encontrado.' });
    }

    const history = await query(
      `SELECT h.*, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS changed_by_name
         FROM job_status_history h
         LEFT JOIN edro_users u ON u.id = h.changed_by
        WHERE h.job_id = $1
        ORDER BY h.changed_at DESC`,
      [jobId]
    );
    const comments = await query(
      `SELECT jc.*, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS author_name
         FROM job_comments jc
         LEFT JOIN edro_users u ON u.id = jc.author_id
        WHERE jc.job_id = $1
        ORDER BY jc.created_at DESC`,
      [jobId]
    );

    return {
      data: {
        ...rows[0],
        history: history.rows,
        comments: comments.rows,
      },
    };
  });

  app.post('/jobs', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const body = createJobSchema.parse(request.body);

    const support = await query(
      `SELECT code, default_skill, default_definition_of_done
         FROM job_types
        WHERE code = $1
        LIMIT 1`,
      [body.job_type]
    );
    if (!support.rows.length) {
      return reply.status(400).send({ error: 'Tipo de job inválido.' });
    }

    const typeRow = support.rows[0];
    const requiredSkill = body.required_skill || typeRow.default_skill || null;
    const definitionOfDone = body.definition_of_done || typeRow.default_definition_of_done || null;
    const estimatedMinutes = body.estimated_minutes || estimateMinutes({
      jobType: body.job_type,
      complexity: body.complexity,
      channel: body.channel,
    });
    const intakeComplete = isIntakeComplete({
      ...body,
      required_skill: requiredSkill,
    });
    const { priorityScore, priorityBand } = calculatePriority({
      deadlineAt: body.deadline_at,
      impactLevel: body.impact_level,
      dependencyLevel: body.dependency_level,
      clientWeight: getClientWeight(body.metadata),
      isUrgent: body.is_urgent,
      intakeComplete,
      blocked: deriveBlocked(body.status || 'intake'),
    });

    const initialStatus = body.status || 'intake';

    const { rows } = await query(
      `INSERT INTO jobs (
         tenant_id,
         client_id,
         title,
         summary,
         job_type,
         complexity,
         channel,
         source,
         status,
         priority_score,
         priority_band,
         impact_level,
         dependency_level,
         required_skill,
         owner_id,
         deadline_at,
         estimated_minutes,
         is_urgent,
         urgency_reason,
         urgency_approved_by,
         definition_of_done,
         created_by,
         metadata
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23::jsonb
       )
       RETURNING *`,
      [
        tenantId,
        body.client_id ?? null,
        body.title,
        body.summary ?? null,
        body.job_type,
        body.complexity,
        body.channel ?? null,
        body.source,
        initialStatus,
        priorityScore,
        priorityBand,
        body.impact_level ?? 2,
        body.dependency_level ?? 2,
        requiredSkill,
        body.owner_id ?? null,
        body.deadline_at ?? null,
        estimatedMinutes,
        body.is_urgent ?? false,
        body.urgency_reason ?? null,
        body.urgency_approved_by ?? null,
        definitionOfDone,
        userId,
        JSON.stringify(body.metadata || {}),
      ]
    );

    await query(
      `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [rows[0].id, null, initialStatus, userId, 'job_created']
    );
    await syncOperationalRuntimeForJob(tenantId, rows[0].id);

    // ── Automation hook: auto-generate copy for visual jobs with a client ──
    const VISUAL_JOB_TYPES = ['copy', 'design_static', 'design_carousel', 'campaign', 'stories', 'reels', 'video'];
    if (VISUAL_JOB_TYPES.includes(body.job_type) && body.client_id) {
      enqueueJob(tenantId, 'job_automation', { jobId: rows[0].id, step: 'copy' }).catch(() => {});
      query(`UPDATE jobs SET automation_status = 'copy_pending' WHERE id = $1`, [rows[0].id]).catch(() => {});
    }

    return reply.status(201).send({ data: rows[0] });
  });

  app.patch('/jobs/:jobId', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };
    const patch = updateJobSchema.parse(request.body);

    const existingRes = await query(`SELECT * FROM jobs WHERE tenant_id = $1 AND id = $2 LIMIT 1`, [tenantId, jobId]);
    if (!existingRes.rows.length) {
      return reply.status(404).send({ error: 'Job não encontrado.' });
    }
    const existing = existingRes.rows[0];

    const merged = {
      ...existing,
      ...patch,
      metadata: patch.metadata ? { ...(existing.metadata || {}), ...patch.metadata } : existing.metadata,
    };

    const typeRes = await query(
      `SELECT code, default_skill, default_definition_of_done
         FROM job_types
        WHERE code = $1
        LIMIT 1`,
      [merged.job_type]
    );
    if (!typeRes.rows.length) {
      return reply.status(400).send({ error: 'Tipo de job inválido.' });
    }

    const typeRow = typeRes.rows[0];
    const requiredSkill = merged.required_skill || typeRow.default_skill || null;
    const definitionOfDone = merged.definition_of_done || typeRow.default_definition_of_done || null;
    const estimatedMinutes = patch.estimated_minutes ?? estimateMinutes({
      jobType: merged.job_type,
      complexity: merged.complexity,
      channel: merged.channel,
    });
    const intakeComplete = isIntakeComplete({
      client_id: merged.client_id,
      title: merged.title,
      job_type: merged.job_type,
      complexity: merged.complexity,
      source: merged.source,
      deadline_at: merged.deadline_at,
      required_skill: requiredSkill,
      owner_id: merged.owner_id,
    });
    const { priorityScore, priorityBand } = calculatePriority({
      deadlineAt: merged.deadline_at,
      impactLevel: merged.impact_level,
      dependencyLevel: merged.dependency_level,
      clientWeight: getClientWeight(merged.metadata),
      isUrgent: merged.is_urgent,
      intakeComplete,
      blocked: deriveBlocked(merged.status),
    });

    const { rows } = await query(
      `UPDATE jobs
          SET client_id = $3,
              title = $4,
              summary = $5,
              job_type = $6,
              complexity = $7,
              channel = $8,
              source = $9,
              priority_score = $10,
              priority_band = $11,
              impact_level = $12,
              dependency_level = $13,
              required_skill = $14,
              owner_id = $15,
              deadline_at = $16,
              estimated_minutes = $17,
              is_urgent = $18,
              urgency_reason = $19,
              urgency_approved_by = $20,
              definition_of_done = $21,
              metadata = $22::jsonb
        WHERE tenant_id = $1 AND id = $2
        RETURNING *`,
      [
        tenantId,
        jobId,
        merged.client_id ?? null,
        merged.title,
        merged.summary ?? null,
        merged.job_type,
        merged.complexity,
        merged.channel ?? null,
        merged.source,
        priorityScore,
        priorityBand,
        merged.impact_level ?? 2,
        merged.dependency_level ?? 2,
        requiredSkill,
        merged.owner_id ?? null,
        merged.deadline_at ?? null,
        estimatedMinutes,
        merged.is_urgent ?? false,
        merged.urgency_reason ?? null,
        merged.urgency_approved_by ?? null,
        definitionOfDone,
        JSON.stringify(merged.metadata || {}),
      ]
    );
    await syncOperationalRuntimeForJob(tenantId, jobId);

    return { data: rows[0] };
  });

  app.post('/jobs/:jobId/status', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const { jobId } = request.params as { jobId: string };
    const body = statusSchema.parse(request.body);

    const currentRes = await query(`SELECT * FROM jobs WHERE tenant_id = $1 AND id = $2 LIMIT 1`, [tenantId, jobId]);
    if (!currentRes.rows.length) {
      return reply.status(404).send({ error: 'Job não encontrado.' });
    }
    const current = currentRes.rows[0];

    if (!canTransition(current.status, body.status, current)) {
      return reply.status(400).send({
        error: 'Transição bloqueada. Complete cliente, owner, prazo, skill e contexto mínimo antes de avançar.',
      });
    }

    const completedAt = body.status === 'done' ? new Date().toISOString() : current.completed_at;
    const archivedAt = body.status === 'archived' ? new Date().toISOString() : current.archived_at;

    const { rows } = await query(
      `UPDATE jobs
          SET status = $3,
              completed_at = $4,
              archived_at = $5
        WHERE tenant_id = $1 AND id = $2
        RETURNING *`,
      [tenantId, jobId, body.status, completedAt, archivedAt]
    );

    await query(
      `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [jobId, current.status, body.status, userId, body.reason ?? null]
    );
    await syncOperationalRuntimeForJob(tenantId, jobId);

    // ── Automation hook: when job is done, auto-pull next for owner + recalc ETAs ──
    if (body.status === 'done' && current.owner_id) {
      (async () => {
        try {
          const nextJob = await getNextJobForOwner(tenantId, current.owner_id);
          if (nextJob) {
            await query(
              `UPDATE jobs SET status = 'in_progress' WHERE tenant_id = $1 AND id = $2`,
              [tenantId, nextJob.id]
            );
            await query(
              `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
               VALUES ($1, $2, 'in_progress', $3, 'auto_next_job')`,
              [nextJob.id, 'allocated', userId]
            );
            await syncOperationalRuntimeForJob(tenantId, nextJob.id);
          }
          await recalculateOwnerETAs(tenantId, current.owner_id);
        } catch (err: any) {
          console.error('[jobs] post-done automation failed:', err?.message || err);
        }
      })();
    }

    return { data: rows[0] };
  });

  app.delete('/jobs/:jobId', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };

    const currentRes = await query(
      `SELECT id, owner_id
         FROM jobs
        WHERE tenant_id = $1 AND id = $2
        LIMIT 1`,
      [tenantId, jobId]
    );

    if (!currentRes.rows.length) {
      return reply.status(404).send({ error: 'Job não encontrado.' });
    }

    const current = currentRes.rows[0];

    await query(`DELETE FROM jobs WHERE tenant_id = $1 AND id = $2`, [tenantId, jobId]);
    await rebuildOperationalRuntime(tenantId);

    if (current.owner_id) {
      await recalculateOwnerETAs(tenantId, current.owner_id).catch((err: any) => {
        console.error('[jobs] delete recalculateOwnerETAs failed:', err?.message || err);
      });
    }

    return { success: true, deleted: jobId };
  });

  // ── GET /jobs/:jobId/creative-drafts ──
  app.get('/jobs/:jobId/creative-drafts', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };

    const { rows } = await query(
      `SELECT * FROM job_creative_drafts
        WHERE tenant_id = $1 AND job_id = $2
        ORDER BY created_at DESC`,
      [tenantId, jobId]
    );

    return { data: rows };
  });

  // ── POST /jobs/:jobId/creative-drafts/regenerate ──
  app.post('/jobs/:jobId/creative-drafts/regenerate', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };
    const body = z.object({ step: z.enum(['copy', 'image']) }).parse(request.body);

    const jobRes = await query(`SELECT id FROM jobs WHERE tenant_id = $1 AND id = $2 LIMIT 1`, [tenantId, jobId]);
    if (!jobRes.rows.length) {
      return reply.status(404).send({ error: 'Job não encontrado.' });
    }

    const automationStatus = body.step === 'copy' ? 'copy_pending' : 'image_pending';
    await query(`UPDATE jobs SET automation_status = $2 WHERE id = $1`, [jobId, automationStatus]);
    await enqueueJob(tenantId, 'job_automation', { jobId, step: body.step });

    return { success: true, step: body.step };
  });
}
