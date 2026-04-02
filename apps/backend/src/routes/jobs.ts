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
import { notifyEvent } from '../services/notificationService';
import { sendWhatsAppText } from '../services/whatsappService';
import { proposeAllocations, updateFreelancerScores } from '../services/allocationService';
import { generateCalibrationReport, getCalibratedEstimate } from '../services/jobs/calibrationService';
import { notifyJobBlocked, notifyJobAssigned } from '../services/jobs/opsNotificationService';
import { audit } from '../audit/audit';
import { createBillingEntryForJob, consumeCapacitySlot, releaseCapacitySlot } from '../services/daBillingService';
import {
  buildArtDirectionFeedbackMetadata,
  getPrimaryArtDirectionReferenceId,
  recordArtDirectionFeedbackEvent,
  resolveArtDirectionCreativeContext,
} from '../services/ai/artDirectionMemoryService';

/** Send approval request directly to the client's primary WhatsApp contact. */
async function notifyClientApprovalNeeded(
  tenantId: string,
  clientId: string,
  jobTitle: string,
  deadlineAt?: string | null,
) {
  // Primary contact = first contact with a whatsapp_jid for this client
  const { rows } = await query<{ whatsapp_jid: string; name: string | null }>(
    `SELECT whatsapp_jid, name
       FROM client_contacts
      WHERE client_id = $1 AND tenant_id = $2
        AND whatsapp_jid IS NOT NULL
      ORDER BY created_at ASC
      LIMIT 1`,
    [clientId, tenantId],
  );
  const contact = rows[0];
  if (!contact?.whatsapp_jid) return;

  const deadline = deadlineAt ? new Date(deadlineAt).toLocaleDateString('pt-BR') : null;
  const lines = [
    `📋 *${jobTitle}*`,
    `Uma peça está pronta e aguarda sua aprovação.`,
    deadline ? `⏰ Prazo: ${deadline}` : null,
  ].filter(Boolean) as string[];

  await sendWhatsAppText(contact.whatsapp_jid, lines.join('\n'), {
    tenantId,
    event: 'approval_requested',
    meta: {
      channel: 'client_approval',
      client_id: clientId,
      job_title: jobTitle,
    },
  });
}

/** Look up owner's WhatsApp JID + email, then fire job_assigned notification. */
async function notifyOwnerAssigned(
  tenantId: string,
  ownerId: string,
  jobTitle: string,
  clientName?: string | null,
  deadlineAt?: string | null,
) {
  const { rows } = await query<{ whatsapp_jid: string | null; email: string | null }>(
    `SELECT fp.whatsapp_jid, u.email
       FROM edro_users u
       LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
      WHERE u.id = $1 LIMIT 1`,
    [ownerId],
  );
  const owner = rows[0];
  if (!owner) return;

  const deadline = deadlineAt ? new Date(deadlineAt).toLocaleDateString('pt-BR') : null;
  const body = [
    clientName ? `Cliente: ${clientName}` : null,
    deadline ? `Prazo: ${deadline}` : 'Sem prazo definido',
  ].filter(Boolean).join('\n');

  await notifyEvent({
    event: 'job_assigned',
    tenantId,
    userId: ownerId,
    title: `Novo escopo: ${jobTitle}`,
    body,
    link: '/jobs',
    recipientEmail: owner.email ?? undefined,
    recipientPhone: owner.whatsapp_jid ?? undefined,
  });
}

const jobStatusValues = [
  'intake',
  'planned',
  'ready',
  'allocated',
  'in_progress',
  'blocked',
  'in_review',
  'adjustment',
  'copy_review',
  'billing',
  'finalizing',
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
  assignee_ids: z.array(z.string().uuid()).optional().nullable(),
  external_link: z.string().max(2000).optional().nullable(),
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

/** Sync job_assignees for a job. Replaces all current assignees with the given list. */
async function syncAssignees(jobId: string, assigneeIds: string[], assignedBy: string | null) {
  await query(`DELETE FROM job_assignees WHERE job_id = $1`, [jobId]);
  if (!assigneeIds.length) return;
  const values: any[] = [];
  const placeholders = assigneeIds.map((uid, i) => {
    values.push(jobId, uid, assignedBy);
    const base = i * 3;
    return `($${base + 1}, $${base + 2}, $${base + 3})`;
  });
  await query(
    `INSERT INTO job_assignees (job_id, user_id, assigned_by) VALUES ${placeholders.join(', ')}
     ON CONFLICT (job_id, user_id) DO NOTHING`,
    values
  );
}

function canTransition(fromStatus: string, toStatus: string, row: any) {
  if (fromStatus === toStatus) return true;
  if (toStatus === 'blocked') return true;
  if (toStatus === 'archived') return fromStatus === 'done';
  if (toStatus === 'scheduled') return fromStatus === 'approved';
  if (toStatus === 'published') return fromStatus === 'scheduled' || fromStatus === 'approved';
  if (toStatus === 'done') return ['published', 'approved', 'in_review', 'in_progress'].includes(fromStatus);
  // B2B kanban transitions
  if (toStatus === 'adjustment') return fromStatus === 'in_review';
  if (toStatus === 'approved')   return ['in_review', 'awaiting_approval', 'adjustment'].includes(fromStatus);
  if (['ready', 'allocated', 'in_progress', 'in_review', 'awaiting_approval', 'copy_review', 'billing', 'finalizing'].includes(toStatus)) {
    if (!isIntakeComplete(row)) return false;
  }
  return true;
}

function hasDaFeedbackSignal(metadata?: Record<string, any> | null) {
  return Boolean(
    metadata?.visual_intent ||
    metadata?.strategy_summary ||
    metadata?.reference_ids?.length ||
    metadata?.reference_urls?.length ||
    metadata?.concept_slugs?.length ||
    metadata?.trend_tags?.length
  );
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
         fp.skills,
         fp.id AS freelancer_profile_id,
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

  // ── GET /jobs/calibration ── estimation accuracy report
  // ── GET /jobs/sla — SLA report: on-time delivery rate by client and owner ──
  app.get('/jobs/sla', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { days = '90', client_id, owner_id } = request.query as Record<string, string | undefined>;
    const daysNum = Math.min(Math.max(Number(days) || 90, 7), 365);

    const filters: string[] = [`tenant_id = $1`, `completed_at > NOW() - INTERVAL '${daysNum} days'`];
    const values: any[] = [tenantId];
    if (client_id) { values.push(client_id); filters.push(`client_id = $${values.length}`); }
    if (owner_id) { values.push(owner_id); filters.push(`owner_id = $${values.length}`); }

    const whereClause = filters.join(' AND ');

    const [overallRes, byClientRes, byOwnerRes, recentRes] = await Promise.all([
      query(
        `SELECT
           COUNT(*) FILTER (WHERE sla_met = true)  AS met,
           COUNT(*) FILTER (WHERE sla_met = false) AS missed,
           COUNT(*) FILTER (WHERE sla_met IS NULL) AS open,
           COUNT(*)                                AS total,
           ROUND(AVG(days_variance)::numeric, 1)   AS avg_days_variance,
           ROUND(AVG(actual_minutes)::numeric)      AS avg_actual_minutes,
           ROUND(AVG(estimated_minutes)::numeric)   AS avg_estimated_minutes
         FROM job_sla_view
        WHERE ${whereClause}`,
        values
      ),
      query(
        `SELECT
           client_id, client_name,
           COUNT(*) FILTER (WHERE sla_met = true)  AS met,
           COUNT(*) FILTER (WHERE sla_met = false) AS missed,
           COUNT(*)                                AS total,
           ROUND(AVG(days_variance)::numeric, 1)   AS avg_days_variance
         FROM job_sla_view
        WHERE ${whereClause}
        GROUP BY client_id, client_name
        ORDER BY missed DESC, total DESC
        LIMIT 20`,
        values
      ),
      query(
        `SELECT
           owner_id, owner_name,
           COUNT(*) FILTER (WHERE sla_met = true)  AS met,
           COUNT(*) FILTER (WHERE sla_met = false) AS missed,
           COUNT(*)                                AS total,
           ROUND(AVG(days_variance)::numeric, 1)   AS avg_days_variance,
           ROUND(AVG(revision_count)::numeric, 1)  AS avg_revisions
         FROM job_sla_view
        WHERE ${whereClause}
        GROUP BY owner_id, owner_name
        ORDER BY missed DESC, total DESC
        LIMIT 20`,
        values
      ),
      query(
        `SELECT job_id, title, client_name, owner_name, priority_band,
                deadline_at, completed_at, sla_met, days_variance, revision_count
           FROM job_sla_view
          WHERE ${whereClause} AND sla_met = false
          ORDER BY days_variance DESC NULLS LAST
          LIMIT 10`,
        values
      ),
    ]);

    const o = overallRes.rows[0] || {};
    const total = Number(o.met || 0) + Number(o.missed || 0);
    return {
      data: {
        period_days: daysNum,
        overall: {
          met: Number(o.met || 0),
          missed: Number(o.missed || 0),
          open: Number(o.open || 0),
          total: Number(o.total || 0),
          rate: total > 0 ? Math.round((Number(o.met || 0) / total) * 100) : null,
          avg_days_variance: Number(o.avg_days_variance || 0),
          avg_actual_minutes: Number(o.avg_actual_minutes || 0),
          avg_estimated_minutes: Number(o.avg_estimated_minutes || 0),
        },
        by_client: byClientRes.rows.map((r) => ({
          ...r,
          met: Number(r.met), missed: Number(r.missed), total: Number(r.total),
          rate: Number(r.total) > 0 ? Math.round((Number(r.met) / Number(r.total)) * 100) : null,
        })),
        by_owner: byOwnerRes.rows.map((r) => ({
          ...r,
          met: Number(r.met), missed: Number(r.missed), total: Number(r.total),
          rate: Number(r.total) > 0 ? Math.round((Number(r.met) / Number(r.total)) * 100) : null,
        })),
        worst_misses: recentRes.rows,
      },
    };
  });

  app.get('/jobs/calibration', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { days } = request.query as { days?: string };
    const report = await generateCalibrationReport(tenantId, days ? Number(days) : 90);
    return { data: report };
  });

  // ── GET /jobs/calibration/estimate ── single calibrated estimate
  app.get('/jobs/calibration/estimate', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { job_type, complexity } = request.query as { job_type: string; complexity: string };
    if (!job_type || !complexity) return { data: null };
    const result = await getCalibratedEstimate(tenantId, job_type, complexity);
    return { data: result };
  });

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
    if (params.assignee_id) {
      values.push(params.assignee_id);
      where.push(`EXISTS (SELECT 1 FROM job_assignees jassign WHERE jassign.job_id = j.id AND jassign.user_id = $${values.length})`);
    }
    if (params.client_id) {
      values.push(params.client_id);
      where.push(`j.client_id = $${values.length}`);
    }
    if (params.urgent === 'true') {
      where.push(`j.is_urgent = true`);
    }
    if (params.unassigned === 'true') {
      where.push(`j.owner_id IS NULL AND NOT EXISTS (SELECT 1 FROM job_assignees jassign WHERE jassign.job_id = j.id)`);
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
         u.email AS owner_email,
         ja.estimated_delivery_at,
         ja.queue_position,
         COALESCE(
           (SELECT jsonb_agg(jsonb_build_object(
             'user_id', eu.id,
             'name', COALESCE(NULLIF(eu.name,''), split_part(eu.email,'@',1)),
             'email', eu.email
           ) ORDER BY jassign.assigned_at)
           FROM job_assignees jassign
           JOIN edro_users eu ON eu.id = jassign.user_id
           WHERE jassign.job_id = j.id),
           '[]'::jsonb
         ) AS assignees
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       LEFT JOIN edro_users u ON u.id = j.owner_id
       LEFT JOIN job_allocations ja ON ja.job_id = j.id AND ja.allocation_kind = 'primary'
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

  // GET /jobs/mine — jobs assigned to the current user (DA portal)
  app.get('/jobs/mine', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId   = (request.user as any)?.id ?? (request.user as any)?.sub as string;
    if (!userId) return reply.status(401).send({ success: false });

    const { rows } = await query<any>(
      `SELECT j.id, j.title, c.name AS client_name, j.status, j.job_size,
              j.deadline_at, j.estimated_minutes, j.created_at
         FROM jobs j
         LEFT JOIN clients c ON c.id = j.client_id
        WHERE j.tenant_id = $1
          AND j.owner_id  = $2
        ORDER BY
          CASE WHEN j.status IN ('done','archived') THEN 1 ELSE 0 END,
          j.deadline_at ASC NULLS LAST,
          j.created_at DESC`,
      [tenantId, userId],
    );
    return reply.send({ success: true, data: rows });
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
         u.email AS owner_email,
         COALESCE(
           (SELECT jsonb_agg(jsonb_build_object(
             'user_id', eu.id,
             'name', COALESCE(NULLIF(eu.name,''), split_part(eu.email,'@',1)),
             'email', eu.email
           ) ORDER BY jassign.assigned_at)
           FROM job_assignees jassign
           JOIN edro_users eu ON eu.id = jassign.user_id
           WHERE jassign.job_id = j.id),
           '[]'::jsonb
         ) AS assignees
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
         metadata,
         external_link
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23::jsonb,$24
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
        body.external_link ?? null,
      ]
    );

    // Sync multiple assignees
    const assigneeIds = body.assignee_ids?.length
      ? body.assignee_ids
      : body.owner_id ? [body.owner_id] : [];
    if (assigneeIds.length) {
      await syncAssignees(rows[0].id, assigneeIds, userId);
    }

    await query(
      `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [rows[0].id, null, initialStatus, userId, 'job_created']
    );
    await syncOperationalRuntimeForJob(tenantId, rows[0].id);

    // ── Briefing gate: all jobs with a client go to briefing first ──
    // Copy generation only fires after briefing is approved (POST /jobs/:id/briefing/approve)
    if (body.client_id) {
      query(`UPDATE jobs SET automation_status = 'briefing_pending' WHERE id = $1 AND tenant_id = $2`, [rows[0].id, tenantId]).catch(() => {});
    }

    audit({
      actor_user_id: userId,
      actor_email: (request.user as any)?.email ?? null,
      action: 'JOB_CREATED',
      entity_type: 'jobs',
      entity_id: rows[0].id,
      after: { title: rows[0].title, job_type: rows[0].job_type, status: rows[0].status, client_id: rows[0].client_id },
      ip: request.ip,
    }).catch(() => {});

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
              metadata = $22::jsonb,
              external_link = $23,
              allocated_at = CASE WHEN $15 IS NOT NULL AND (owner_id IS NULL OR owner_id != $15) THEN now() ELSE allocated_at END
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
        merged.external_link ?? null,
      ]
    );

    // Sync assignees if explicitly provided in the patch
    if (patch.assignee_ids !== undefined) {
      const patchUserId = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
      const assigneeIds = patch.assignee_ids?.length
        ? patch.assignee_ids
        : merged.owner_id ? [merged.owner_id] : [];
      await syncAssignees(jobId, assigneeIds, patchUserId);
    }

    await syncOperationalRuntimeForJob(tenantId, jobId);

    // Notify new owner via in-app + WhatsApp when assignment changes
    const newOwnerId = rows[0].owner_id as string | null;
    if (newOwnerId && newOwnerId !== existing.owner_id) {
      const clientId = rows[0].client_id as string | null;
      const jobTitle = rows[0].title as string;
      const deadlineAt = rows[0].deadline_at as string | null;
      (async () => {
        try {
          let clientName: string | null = null;
          if (clientId) {
            const cr = await query<{ name: string }>(`SELECT name FROM clients WHERE id = $1 LIMIT 1`, [clientId]);
            clientName = cr.rows[0]?.name ?? null;
          }
          await notifyOwnerAssigned(tenantId, newOwnerId, jobTitle, clientName, deadlineAt);
        } catch (err: any) {
          console.error('[jobs] notify owner assigned failed:', err?.message || err);
        }
      })();
    }

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

    // revision_count: increment every time job is sent back to in_review (re-review)
    const isReReview = body.status === 'in_review' && current.status !== 'in_review';
    const hadPreviousReview = isReReview && (current.revision_count ?? 0) > 0;
    const revisionIncrement = hadPreviousReview ? 1 : 0;

    // actual_minutes: compute elapsed time from first in_progress → done
    let actualMinutes: number | null = current.actual_minutes ?? null;
    if (body.status === 'done' && !actualMinutes) {
      const startRow = await query<{ changed_at: string }>(
        `SELECT changed_at FROM job_status_history
          WHERE job_id = $1 AND to_status = 'in_progress'
          ORDER BY changed_at ASC LIMIT 1`,
        [jobId]
      );
      if (startRow.rows[0]) {
        actualMinutes = Math.round(
          (Date.now() - new Date(startRow.rows[0].changed_at).getTime()) / 60000
        );
      }
    }

    const { rows } = await query(
      `UPDATE jobs
          SET status = $3,
              completed_at = $4,
              archived_at = $5,
              revision_count = revision_count + $6,
              actual_minutes = COALESCE($7, actual_minutes)
        WHERE tenant_id = $1 AND id = $2
        RETURNING *`,
      [tenantId, jobId, body.status, completedAt, archivedAt, revisionIncrement, actualMinutes]
    );

    await query(
      `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [jobId, current.status, body.status, userId, body.reason ?? null]
    );
    await syncOperationalRuntimeForJob(tenantId, jobId);

    // ── Notify client when job needs their approval ──
    if (body.status === 'awaiting_approval' && current.client_id) {
      notifyClientApprovalNeeded(tenantId, current.client_id, current.title, current.deadline_at)
        .catch((e: any) => console.error('[jobs] notify client approval failed:', e?.message));
    }

    // ── Notify team when job is blocked ──
    if (body.status === 'blocked') {
      notifyJobBlocked(tenantId, { id: jobId, title: current.title, client_name: current.client_name, owner_id: current.owner_id }, body.reason ?? null)
        .catch((e: any) => console.error('[jobs] notify blocked failed:', e?.message));
    }

    // ── Score tracking: update freelancer punctuality + approval when job is done ──
    if ((body.status === 'done' || body.status === 'published') && current.owner_id) {
      const wasLate = current.deadline_at ? new Date() > new Date(current.deadline_at) : false;
      const wasRevised = (current.revision_count ?? 0) > 0;
      updateFreelancerScores(tenantId, jobId, { wasLate, wasRevised }).catch((e: any) =>
        console.error('[jobs] updateFreelancerScores failed:', e?.message),
      );

      // ── DA Billing: auto-create billing entry when job is completed ──
      if (current.job_size) {
        createBillingEntryForJob(tenantId, jobId, current.owner_id, current.job_size).catch(
          (e: any) => console.error('[jobs] createBillingEntry failed:', e?.message),
        );
      }
    }

    // ── Response time EMA: compute when freelancer moves job to in_progress ──
    if (body.status === 'in_progress' && current.owner_id && current.allocated_at) {
      const responseMins = (Date.now() - new Date(current.allocated_at).getTime()) / 60000;
      query(
        `UPDATE freelancer_profiles
            SET avg_response_minutes = CASE
              WHEN avg_response_minutes IS NULL THEN $2
              ELSE ROUND((0.3 * $2 + 0.7 * avg_response_minutes)::numeric, 2)
            END,
            updated_at = now()
          WHERE user_id = $1`,
        [current.owner_id, Math.round(responseMins)],
      ).catch(() => {});
    }

    // ── Capacity: consume slot when a job is assigned; release if cancelled ──
    if (body.status === 'allocated' && current.owner_id) {
      consumeCapacitySlot(tenantId, current.owner_id).catch(() => {});
    }
    if (body.status === 'archived' && current.status === 'allocated' && current.owner_id) {
      releaseCapacitySlot(tenantId, current.owner_id).catch(() => {});
    }

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
            // Notify owner that their next job auto-started
            await notifyOwnerAssigned(
              tenantId, current.owner_id, nextJob.title, nextJob.client_name ?? null, null,
            ).catch((e: any) => console.error('[jobs] notify auto-next failed:', e?.message));
          }
          await recalculateOwnerETAs(tenantId, current.owner_id);
        } catch (err: any) {
          console.error('[jobs] post-done automation failed:', err?.message || err);
        }
      })();
    }

    audit({
      actor_user_id: userId,
      actor_email: (request.user as any)?.email ?? null,
      action: 'JOB_STATUS_CHANGED',
      entity_type: 'jobs',
      entity_id: jobId,
      before: { status: current.status },
      after: { status: body.status, reason: body.reason ?? null },
      ip: request.ip,
    }).catch(() => {});

    return { data: rows[0] };
  });

  app.delete('/jobs/:jobId', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
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

    audit({
      actor_user_id: userId,
      actor_email: (request.user as any)?.email ?? null,
      action: 'JOB_DELETED',
      entity_type: 'jobs',
      entity_id: jobId,
      before: { id: jobId, owner_id: current.owner_id },
      ip: request.ip,
    }).catch(() => {});

    return { success: true, deleted: jobId };
  });

  // ── GET /jobs/:jobId/allocation-proposals ──
  app.get('/jobs/:jobId/allocation-proposals', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };
    try {
      const proposals = await proposeAllocations(tenantId, jobId);
      return { data: proposals };
    } catch (err: any) {
      if (err.message === 'job_not_found') return reply.status(404).send({ error: 'Job não encontrado.' });
      throw err;
    }
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
    await query(`UPDATE jobs SET automation_status = $2 WHERE id = $1 AND tenant_id = $3`, [jobId, automationStatus, tenantId]);
    await enqueueJob(tenantId, 'job_automation', { jobId, step: body.step });

    return { success: true, step: body.step };
  });

  // ── POST /jobs/:jobId/creative-drafts/:draftId/approve ──
  app.post('/jobs/:jobId/creative-drafts/:draftId/approve', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const { jobId, draftId } = request.params as { jobId: string; draftId: string };

    const { rows } = await query(
      `UPDATE job_creative_drafts
          SET draft_approved_by = $3,
              draft_approved_at = now(),
              approval_status = 'approved'
        WHERE tenant_id = $1 AND id = $2 AND job_id = $4
        RETURNING *`,
      [tenantId, draftId, userId, jobId]
    );
    if (!rows.length) return reply.status(404).send({ error: 'Rascunho não encontrado.' });

    // If job is still in_review, auto-advance to approved
    const jobRes = await query(
      `SELECT status, client_id FROM jobs WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, jobId]
    );
    if (jobRes.rows[0]?.status === 'in_review') {
      await query(
        `UPDATE jobs SET status = 'approved' WHERE tenant_id = $1 AND id = $2`,
        [tenantId, jobId]
      );
      await query(
        `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
         VALUES ($1, 'in_review', 'approved', $2, 'draft_approved')`,
        [jobId, userId]
      );
      await syncOperationalRuntimeForJob(tenantId, jobId);
    }

    const creativeContext = await resolveArtDirectionCreativeContext({ tenantId, jobId }).catch(() => null);
    const daMetadata = buildArtDirectionFeedbackMetadata({
      context: creativeContext,
      metadata: {
        ...(rows[0]?.art_direction || {}),
        layout: rows[0]?.layout || null,
      },
      source: 'job_creative_draft_review',
      reviewActor: 'internal',
      reviewStage: 'draft_approve',
      draftId,
      briefingId: rows[0]?.briefing_id || creativeContext?.briefingId || null,
      jobId,
      clientId: jobRes.rows[0]?.client_id || creativeContext?.clientId || null,
    });
    if (hasDaFeedbackSignal(daMetadata)) {
      await recordArtDirectionFeedbackEvent({
        tenantId,
        clientId: jobRes.rows[0]?.client_id || creativeContext?.clientId || null,
        creativeSessionId: creativeContext?.creativeSessionId || null,
        referenceId: getPrimaryArtDirectionReferenceId(daMetadata),
        eventType: 'approved',
        notes: 'job_creative_draft_approved',
        metadata: daMetadata,
        createdBy: userId,
      }).catch(() => {});
    }

    return { success: true, draft: rows[0] };
  });

  // ── POST /jobs/:jobId/creative-drafts/:draftId/reject ──
  app.post('/jobs/:jobId/creative-drafts/:draftId/reject', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const { jobId, draftId } = request.params as { jobId: string; draftId: string };
    const { reason } = z.object({ reason: z.string().max(500).optional() }).parse(request.body ?? {});

    const { rows } = await query(
      `UPDATE job_creative_drafts
          SET approval_status = 'rejected',
              draft_approved_by = NULL,
              draft_approved_at = NULL
        WHERE tenant_id = $1 AND id = $2 AND job_id = $3
        RETURNING *`,
      [tenantId, draftId, jobId]
    );
    if (!rows.length) return reply.status(404).send({ error: 'Rascunho não encontrado.' });

    // Send back to in_progress (needs revision)
    const jobRes = await query(
      `SELECT status, revision_count, client_id FROM jobs WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, jobId]
    );
    if (jobRes.rows[0] && ['in_review', 'approved'].includes(jobRes.rows[0].status)) {
      await query(
        `UPDATE jobs
            SET status = 'in_progress',
                revision_count = revision_count + 1
          WHERE tenant_id = $1 AND id = $2`,
        [tenantId, jobId]
      );
      await query(
        `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
         VALUES ($1, $2, 'in_progress', $3, $4)`,
        [jobId, jobRes.rows[0].status, userId, reason ?? 'draft_rejected']
      );
      await syncOperationalRuntimeForJob(tenantId, jobId);
    }

    const creativeContext = await resolveArtDirectionCreativeContext({ tenantId, jobId }).catch(() => null);
    const daMetadata = buildArtDirectionFeedbackMetadata({
      context: creativeContext,
      metadata: {
        ...(rows[0]?.art_direction || {}),
        layout: rows[0]?.layout || null,
      },
      source: 'job_creative_draft_review',
      reviewActor: 'internal',
      reviewStage: 'draft_reject',
      rejectionReason: reason ?? null,
      draftId,
      briefingId: rows[0]?.briefing_id || creativeContext?.briefingId || null,
      jobId,
      clientId: jobRes.rows[0]?.client_id || creativeContext?.clientId || null,
    });
    if (hasDaFeedbackSignal(daMetadata)) {
      await recordArtDirectionFeedbackEvent({
        tenantId,
        clientId: jobRes.rows[0]?.client_id || creativeContext?.clientId || null,
        creativeSessionId: creativeContext?.creativeSessionId || null,
        referenceId: getPrimaryArtDirectionReferenceId(daMetadata),
        eventType: 'rejected',
        notes: reason ?? 'job_creative_draft_rejected',
        metadata: daMetadata,
        createdBy: userId,
      }).catch(() => {});
    }

    return { success: true, draft: rows[0] };
  });

  /* ── Time Entries ─────────────────────────────────────────────────── */

  app.get('/jobs/:jobId/time-entries', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };
    const { rows } = await query(
      `SELECT te.*, COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS user_name
         FROM job_time_entries te
         JOIN edro_users u ON u.id = te.user_id
        WHERE te.tenant_id = $1 AND te.job_id = $2
        ORDER BY te.logged_at DESC`,
      [tenantId, jobId]
    );
    const total = rows.reduce((acc, r) => acc + Number(r.minutes), 0);
    return { data: rows, total_minutes: total };
  });

  app.post('/jobs/:jobId/time-entries', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id) as string;
    const { jobId } = request.params as { jobId: string };
    const { minutes, notes, logged_at } = z.object({
      minutes: z.number().int().min(1).max(1440),
      notes: z.string().max(500).optional(),
      logged_at: z.string().datetime().optional(),
    }).parse(request.body ?? {});

    const { rows } = await query(
      `INSERT INTO job_time_entries (tenant_id, job_id, user_id, minutes, notes, logged_at)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, NOW()))
       RETURNING *`,
      [tenantId, jobId, userId, minutes, notes ?? null, logged_at ?? null]
    );
    return reply.status(201).send({ data: rows[0] });
  });

  app.delete('/jobs/:jobId/time-entries/:entryId', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id) as string;
    const { jobId, entryId } = request.params as { jobId: string; entryId: string };
    const { rows } = await query(
      `DELETE FROM job_time_entries
        WHERE tenant_id = $1 AND job_id = $2 AND id = $3 AND user_id = $4
        RETURNING id`,
      [tenantId, jobId, entryId, userId]
    );
    if (!rows.length) return reply.status(404).send({ error: 'Entrada não encontrada.' });
    return { success: true };
  });

  /* ── Job Briefings ─────────────────────────────────────────────────── */

  // GET /jobs/:jobId/briefing
  // Returns the briefing + pieces + client context (pre-filled from profile)
  app.get('/jobs/:jobId/briefing', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };

    // Fetch job (to get client_id)
    const { rows: jobRows } = await query<any>(
      `SELECT j.*, c.name AS client_name FROM jobs j
         LEFT JOIN clients c ON c.id = j.client_id
        WHERE j.id = $1 AND j.tenant_id = $2`,
      [jobId, tenantId],
    );
    if (!jobRows.length) return reply.status(404).send({ error: 'Job não encontrado.' });
    const job = jobRows[0];

    // Fetch existing briefing + pieces (may not exist yet)
    const { rows: briefRows } = await query<any>(
      `SELECT * FROM job_briefings WHERE job_id = $1 AND tenant_id = $2`,
      [jobId, tenantId],
    );
    const briefing = briefRows[0] ?? null;

    const pieces = briefing
      ? (await query<any>(
          `SELECT * FROM job_briefing_pieces WHERE briefing_id = $1 ORDER BY sort_order, created_at`,
          [briefing.id],
        )).rows
      : [];

    // Build client_context from profile + behavior clusters + learning rules
    let clientContext: Record<string, any> = {};
    if (job.client_id) {
      const { rows: clientRows } = await query<any>(
        `SELECT profile, profile_suggestions FROM clients WHERE id = $1 AND tenant_id = $2`,
        [job.client_id, tenantId],
      );
      const clientRow = clientRows[0];
      const profile = clientRow?.profile ?? {};
      const kb = profile.knowledge_base ?? {};
      const bt = profile.brand_tokens ?? {};

      // Behavior clusters
      const { rows: clusterRows } = await query<any>(
        `SELECT id, cluster_type, cluster_label, preferred_amd, preferred_triggers,
                avg_save_rate, avg_click_rate, avg_engagement_rate, preferred_format
           FROM client_behavior_profiles
          WHERE client_id = $1 AND tenant_id = $2
          ORDER BY confidence_score DESC`,
        [job.client_id, tenantId],
      );

      // Visual style
      const { rows: vsRows } = await query<any>(
        `SELECT style_summary, photo_style, mood, dominant_colors
           FROM client_visual_style
          WHERE client_id = $1 AND tenant_id = $2
          ORDER BY analyzed_at DESC LIMIT 1`,
        [job.client_id, tenantId],
      );

      // Learning rules (top 5 active)
      const { rows: ruleRows } = await query<any>(
        `SELECT rule_type, rule_text, uplift_pct, confidence_score
           FROM learning_rules
          WHERE client_id = $1 AND tenant_id = $2 AND is_active = true
          ORDER BY uplift_pct DESC LIMIT 5`,
        [job.client_id, tenantId],
      );

      clientContext = {
        tone_description: profile.tone_description ?? null,
        personality_traits: profile.personality_traits ?? [],
        formality_level: profile.formality_level ?? null,
        emoji_usage: profile.emoji_usage ?? null,
        tone_profile: profile.tone_profile ?? null,
        reference_brands: bt.referenceStyles ?? [],
        forbidden_claims: kb.forbidden_claims ?? [],
        negative_keywords: profile.negative_keywords ?? [],
        pillars: profile.pillars ?? [],
        audience: kb.audience ?? null,
        brand_promise: kb.brand_promise ?? null,
        visual_style: vsRows[0]?.style_summary ?? null,
        visual_mood: vsRows[0]?.mood ?? null,
        dominant_colors: vsRows[0]?.dominant_colors ?? [],
        behavior_clusters: clusterRows,
        learning_rules: ruleRows,
      };
    }

    return {
      job: { id: job.id, title: job.title, job_type: job.job_type, client_id: job.client_id, client_name: job.client_name },
      briefing,
      pieces,
      client_context: clientContext,
    };
  });

  // POST /jobs/:jobId/briefing
  // Creates or fully replaces the briefing (upsert by job_id)
  app.post('/jobs/:jobId/briefing', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };

    const bodySchema = z.object({
      context_trigger: z.string().optional().nullable(),
      consumer_moment: z.string().optional().nullable(),
      main_risk: z.string().optional().nullable(),
      main_objective: z.string().optional().nullable(),
      success_metrics: z.array(z.string()).optional().nullable(),
      target_cluster_ids: z.array(z.string().uuid()).optional().nullable(),
      specific_barriers: z.array(z.string()).optional().nullable(),
      message_structure: z.string().optional().nullable(),
      desired_emotion: z.array(z.string()).max(2).optional().nullable(),
      desired_amd: z.string().optional().nullable(),
      tone_override: z.record(z.any()).optional().nullable(),
      regulatory_flags: z.array(z.string()).optional().nullable(),
      ref_links: z.array(z.string()).optional().nullable(),
      ref_notes: z.string().optional().nullable(),
      pieces: z.array(z.object({
        format_type: z.string(),
        platform: z.string().optional().nullable(),
        versions: z.number().int().min(1).max(10).default(1),
        priority: z.enum(['alta', 'media', 'baixa']).default('media'),
        notes: z.string().optional().nullable(),
        sort_order: z.number().int().optional().default(0),
      })).optional(),
    });

    const body = bodySchema.parse(request.body ?? {});

    // Verify job belongs to tenant
    const { rows: jobRows } = await query<any>(
      `SELECT id, client_id FROM jobs WHERE id = $1 AND tenant_id = $2`,
      [jobId, tenantId],
    );
    if (!jobRows.length) return reply.status(404).send({ error: 'Job não encontrado.' });
    const clientId = jobRows[0].client_id;
    if (!clientId) return reply.status(400).send({ error: 'Job sem cliente associado.' });

    // Upsert briefing (only allowed in draft status)
    const { rows: existing } = await query<any>(
      `SELECT id, status FROM job_briefings WHERE job_id = $1 AND tenant_id = $2`,
      [jobId, tenantId],
    );
    if (existing.length && existing[0].status !== 'draft') {
      return reply.status(409).send({ error: 'Briefing já submetido. Solicite rejeição para editar.' });
    }

    const { rows: briefRows } = await query<any>(
      `INSERT INTO job_briefings (
          job_id, tenant_id, client_id,
          context_trigger, consumer_moment, main_risk,
          main_objective, success_metrics,
          target_cluster_ids, specific_barriers,
          message_structure, desired_emotion, desired_amd,
          tone_override, regulatory_flags,
          ref_links, ref_notes
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb,$15,$16,$17)
        ON CONFLICT (job_id) DO UPDATE SET
          context_trigger   = EXCLUDED.context_trigger,
          consumer_moment   = EXCLUDED.consumer_moment,
          main_risk         = EXCLUDED.main_risk,
          main_objective    = EXCLUDED.main_objective,
          success_metrics   = EXCLUDED.success_metrics,
          target_cluster_ids = EXCLUDED.target_cluster_ids,
          specific_barriers = EXCLUDED.specific_barriers,
          message_structure = EXCLUDED.message_structure,
          desired_emotion   = EXCLUDED.desired_emotion,
          desired_amd       = EXCLUDED.desired_amd,
          tone_override     = EXCLUDED.tone_override,
          regulatory_flags  = EXCLUDED.regulatory_flags,
          ref_links         = EXCLUDED.ref_links,
          ref_notes         = EXCLUDED.ref_notes,
          updated_at        = now()
        RETURNING *`,
      [
        jobId, tenantId, clientId,
        body.context_trigger ?? null,
        body.consumer_moment ?? null,
        body.main_risk ?? null,
        body.main_objective ?? null,
        body.success_metrics ?? null,
        body.target_cluster_ids ?? null,
        body.specific_barriers ?? null,
        body.message_structure ?? null,
        body.desired_emotion ?? null,
        body.desired_amd ?? null,
        body.tone_override ? JSON.stringify(body.tone_override) : null,
        body.regulatory_flags ?? null,
        body.ref_links ?? null,
        body.ref_notes ?? null,
      ],
    );
    const briefing = briefRows[0];

    // Replace pieces
    if (body.pieces !== undefined) {
      await query(`DELETE FROM job_briefing_pieces WHERE briefing_id = $1`, [briefing.id]);
      for (const [i, p] of (body.pieces ?? []).entries()) {
        await query(
          `INSERT INTO job_briefing_pieces
             (briefing_id, format_type, platform, versions, priority, notes, sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [briefing.id, p.format_type, p.platform ?? null, p.versions, p.priority, p.notes ?? null, p.sort_order ?? i],
        );
      }
    }

    const { rows: pieces } = await query<any>(
      `SELECT * FROM job_briefing_pieces WHERE briefing_id = $1 ORDER BY sort_order`,
      [briefing.id],
    );
    return reply.status(201).send({ briefing, pieces });
  });

  // POST /jobs/:jobId/briefing/submit
  // Submits briefing for approval; job automation_status → briefing_pending
  app.post('/jobs/:jobId/briefing/submit', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };

    const { rows } = await query<any>(
      `UPDATE job_briefings
          SET status = 'submitted', submitted_at = now()
        WHERE job_id = $1 AND tenant_id = $2 AND status = 'draft'
        RETURNING *`,
      [jobId, tenantId],
    );
    if (!rows.length) return reply.status(400).send({ error: 'Briefing não encontrado ou não está em rascunho.' });

    await query(
      `UPDATE jobs SET automation_status = 'briefing_pending', updated_at = now()
        WHERE id = $1 AND tenant_id = $2`,
      [jobId, tenantId],
    );

    return { success: true, briefing: rows[0] };
  });

  // POST /jobs/:jobId/briefing/approve
  // Approves briefing; triggers AI copy generation
  app.post('/jobs/:jobId/briefing/approve', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id) as string;
    const { jobId } = request.params as { jobId: string };

    const { rows } = await query<any>(
      `UPDATE job_briefings
          SET status = 'approved', approved_at = now(), approved_by = $3::uuid
        WHERE job_id = $1 AND tenant_id = $2 AND status = 'submitted'
        RETURNING *`,
      [jobId, tenantId, userId],
    );
    if (!rows.length) return reply.status(400).send({ error: 'Briefing não encontrado ou não está submetido.' });

    // Advance job status to in_progress if still at intake/planned/ready
    await query(
      `UPDATE jobs SET status = 'in_progress', automation_status = 'copy_pending', updated_at = now()
        WHERE id = $1 AND tenant_id = $2 AND status IN ('intake', 'planned', 'ready', 'allocated')`,
      [jobId, tenantId],
    );

    // Enqueue copy generation
    await enqueueJob(tenantId, 'job_automation', { jobId, step: 'copy' });

    audit({
      actor_user_id: userId,
      actor_email: (request.user as any)?.email ?? null,
      action: 'JOB_BRIEFING_APPROVED',
      entity_type: 'job_briefings',
      entity_id: rows[0].id,
      after: { job_id: jobId, approved_at: rows[0].approved_at },
      ip: request.ip,
    }).catch(() => {});

    return { success: true, briefing: rows[0] };
  });

  // POST /jobs/:jobId/briefing/reject
  // Rejects briefing; returns to draft for editing
  app.post('/jobs/:jobId/briefing/reject', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };
    const { reason } = z.object({ reason: z.string().max(500).optional() }).parse(request.body ?? {});

    const { rows } = await query<any>(
      `UPDATE job_briefings
          SET status = 'draft', rejection_reason = $3, submitted_at = NULL
        WHERE job_id = $1 AND tenant_id = $2 AND status = 'submitted'
        RETURNING *`,
      [jobId, tenantId, reason ?? null],
    );
    if (!rows.length) return reply.status(400).send({ error: 'Briefing não encontrado ou não está submetido.' });

    await query(
      `UPDATE jobs SET automation_status = 'none', updated_at = now()
        WHERE id = $1 AND tenant_id = $2`,
      [jobId, tenantId],
    );

    return { success: true, briefing: rows[0] };
  });

  // ── POST /jobs/:jobId/b2b-approve — admin approves freelancer delivery ──────
  app.post('/jobs/:jobId/b2b-approve', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId   = (request.user as any)?.sub as string;
    const { jobId } = request.params as { jobId: string };

    const { rows } = await query(
      `UPDATE jobs
          SET status       = 'approved',
              approved_at  = now(),
              sla_paused_at = NULL,
              updated_at   = now()
        WHERE id = $1 AND tenant_id = $2
          AND status IN ('in_review', 'adjustment')
        RETURNING id, title, owner_id, fee_brl, client_id`,
      [jobId, tenantId],
    );
    if (!rows.length) return reply.status(404).send({ error: 'Job não encontrado ou não está em revisão' });

    // Log status transition
    await query(
      `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, tenant_id, reason)
       VALUES ($1, 'in_review', 'approved', $2::uuid, $3, 'b2b_approved')
       ON CONFLICT DO NOTHING`,
      [jobId, userId, tenantId],
    ).catch(() => {}); // table may not exist, ignore

    audit({
      actor_user_id: userId,
      actor_email: (request.user as any)?.email ?? null,
      action: 'JOB_B2B_APPROVED',
      entity_type: 'jobs',
      entity_id: jobId,
      after: { title: rows[0].title, fee_brl: rows[0].fee_brl },
      ip: request.ip,
    }).catch(() => {});

    const creativeContext = await resolveArtDirectionCreativeContext({ tenantId, jobId }).catch(() => null);
    const daMetadata = buildArtDirectionFeedbackMetadata({
      context: creativeContext,
      source: 'job_b2b_review',
      reviewActor: 'internal',
      reviewStage: 'b2b_approve',
      jobId,
      clientId: rows[0]?.client_id || creativeContext?.clientId || null,
    });
    if (hasDaFeedbackSignal(daMetadata)) {
      await recordArtDirectionFeedbackEvent({
        tenantId,
        clientId: rows[0]?.client_id || creativeContext?.clientId || null,
        creativeSessionId: creativeContext?.creativeSessionId || null,
        referenceId: getPrimaryArtDirectionReferenceId(daMetadata),
        eventType: 'approved',
        notes: 'job_b2b_approved',
        metadata: daMetadata,
        createdBy: userId,
      }).catch(() => {});
    }

    return reply.send({ ok: true, job: rows[0] });
  });

  // ── POST /jobs/:jobId/b2b-adjustment — admin sends back with feedback ───────
  app.post('/jobs/:jobId/b2b-adjustment', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const { jobId } = request.params as { jobId: string };
    const { feedback } = request.body as { feedback: string };

    if (!feedback?.trim()) return reply.status(400).send({ error: 'Feedback é obrigatório para solicitar ajuste' });

    const { rows } = await query(
      `UPDATE jobs
          SET status              = 'adjustment',
              adjustment_feedback = $3,
              updated_at          = now()
        WHERE id = $1 AND tenant_id = $2
          AND status = 'in_review'
        RETURNING id, title, owner_id, client_id`,
      [jobId, tenantId, feedback.trim()],
    );
    if (!rows.length) return reply.status(404).send({ error: 'Job não encontrado ou não está em revisão' });

    const creativeContext = await resolveArtDirectionCreativeContext({ tenantId, jobId }).catch(() => null);
    const daMetadata = buildArtDirectionFeedbackMetadata({
      context: creativeContext,
      metadata: {
        adjustment_feedback: feedback.trim(),
      },
      source: 'job_b2b_review',
      reviewActor: 'internal',
      reviewStage: 'b2b_adjustment',
      rejectionReason: feedback.trim(),
      jobId,
      clientId: rows[0]?.client_id || creativeContext?.clientId || null,
    });
    if (hasDaFeedbackSignal(daMetadata)) {
      await recordArtDirectionFeedbackEvent({
        tenantId,
        clientId: rows[0]?.client_id || creativeContext?.clientId || null,
        creativeSessionId: creativeContext?.creativeSessionId || null,
        referenceId: getPrimaryArtDirectionReferenceId(daMetadata),
        eventType: 'rejected',
        notes: feedback.trim(),
        metadata: daMetadata,
        createdBy: userId,
      }).catch(() => {});
    }

    return reply.send({ ok: true, job: rows[0] });
  });

  // ── PATCH /jobs/:jobId/pool-visibility — admin configures pool visibility ──
  app.patch('/jobs/:jobId/pool-visibility', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };
    const { pool_visible, fee_brl, job_size, job_category } = request.body as {
      pool_visible: boolean;
      fee_brl?: number;
      job_size?: string;
      job_category?: string;
    };

    const sets: string[] = ['pool_visible = $3', 'updated_at = now()'];
    const vals: any[] = [jobId, tenantId, pool_visible];

    if (fee_brl !== undefined)      { sets.push(`fee_brl = $${vals.length + 1}`);      vals.push(fee_brl); }
    if (job_size !== undefined)     { sets.push(`job_size = $${vals.length + 1}`);     vals.push(job_size); }
    if (job_category !== undefined) { sets.push(`job_category = $${vals.length + 1}`); vals.push(job_category); }

    // When making visible, ensure status allows pool self-selection
    if (pool_visible) {
      sets.push(`status = CASE WHEN status IN ('intake','planned') THEN 'ready' ELSE status END`);
    }

    const { rows } = await query(
      `UPDATE jobs SET ${sets.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING id, title, pool_visible, status, fee_brl, job_size, job_category`,
      vals,
    );
    if (!rows.length) return reply.status(404).send({ error: 'Job não encontrado' });

    return reply.send({ ok: true, job: rows[0] });
  });

  // ── GET /jobs/pool-queue — jobs available for pool management ──────────────
  app.get('/jobs/pool-queue', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { status: statusFilter } = request.query as { status?: string };

    let where = `WHERE j.tenant_id = $1 AND j.owner_id IS NULL`;
    const vals: any[] = [tenantId];

    if (statusFilter === 'in_pool') {
      where += ` AND j.pool_visible = true`;
    } else if (statusFilter === 'ready_to_pool') {
      where += ` AND j.pool_visible = false AND j.status IN ('intake','planned','ready')`;
    } else {
      where += ` AND (j.pool_visible = true OR j.status IN ('intake','planned','ready'))`;
    }

    const { rows } = await query(
      `SELECT j.id, j.title, j.status, j.pool_visible, j.fee_brl, j.job_size, j.job_category,
              j.deadline_at, j.created_at,
              c.name AS client_name
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       ${where}
       ORDER BY j.created_at DESC
       LIMIT 100`,
      vals,
    );

    return reply.send({ jobs: rows });
  });
}
