/**
 * Job Briefing Routes — Briefing Inteligente
 *
 * Rotas:
 *   GET  /jobs/:jobId/briefing          — carrega briefing + contexto do cliente pré-preenchido
 *   POST /jobs/:jobId/briefing          — cria/atualiza briefing (upsert)
 *   POST /jobs/:jobId/briefing/submit   — submete para aprovação → status = submitted
 *   POST /jobs/:jobId/briefing/approve  — aprova → status = approved, job → copy_ia
 *
 * O GET retorna também `client_context` com dados do perfil do cliente
 * para pré-preencher blocos read-only no formulário.
 */

import type { FastifyInstance } from 'fastify';
import { authGuard } from '../auth/rbac';
import { query } from '../db';

export default async function jobBriefingsRoutes(app: FastifyInstance) {

  // ── GET /jobs/:jobId/briefing — carrega briefing + perfil cliente ──────────
  app.get('/jobs/:jobId/briefing', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };

    // Job + client_id
    const jobRes = await query<{ id: string; client_id: string; job_size: string; title: string }>(
      `SELECT id, client_id, job_size, title FROM jobs WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [jobId, tenantId],
    );
    if (!jobRes.rows.length) return reply.status(404).send({ success: false, error: 'Job não encontrado.' });
    const job = jobRes.rows[0];

    // Briefing (may not exist yet)
    const briefingRes = await query(
      `SELECT b.*, COALESCE(
        (SELECT json_agg(p ORDER BY p.sort_order) FROM job_briefing_pieces p WHERE p.briefing_id = b.id),
        '[]'
      ) AS pieces
       FROM job_briefings b WHERE b.job_id = $1 AND b.tenant_id = $2 LIMIT 1`,
      [jobId, tenantId],
    );
    const briefing = briefingRes.rows[0] ?? null;

    // Client context (pré-preenchimento)
    let clientContext: Record<string, any> = {};
    if (job.client_id) {
      const [profileRes, clustersRes, rulesRes, visualRes] = await Promise.all([
        query(
          `SELECT profile, knowledge_base FROM clients WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
          [job.client_id, tenantId],
        ),
        query(
          `SELECT id, cluster_type AS type, cluster_label AS label,
                  preferred_amd, preferred_triggers, sample_size
           FROM client_behavior_profiles
           WHERE client_id = $1 AND tenant_id = $2
           ORDER BY sample_size DESC LIMIT 6`,
          [job.client_id, tenantId],
        ),
        query(
          `SELECT rule_type, rule_text, uplift_pct
           FROM learning_rules
           WHERE client_id = $1 AND tenant_id = $2 AND is_active = true
           ORDER BY uplift_pct DESC LIMIT 10`,
          [job.client_id, tenantId],
        ),
        query(
          `SELECT style_summary FROM client_visual_style
           WHERE client_id = $1 AND tenant_id = $2
           ORDER BY analyzed_at DESC LIMIT 1`,
          [job.client_id, tenantId],
        ),
      ]);

      const profile = profileRes.rows[0];
      const p = profile?.profile ?? {};
      const kb = profile?.knowledge_base ?? {};

      clientContext = {
        tone_description: p.tone_description ?? kb.tone ?? null,
        personality_traits: p.personality_traits ?? [],
        formality_level: p.formality_level ?? null,
        forbidden_claims: kb.forbidden_claims ?? [],
        negative_keywords: p.negative_keywords ?? [],
        pillars: p.pillars ?? [],
        visual_style: visualRes.rows[0]?.style_summary ?? null,
        behavior_clusters: clustersRes.rows,
        learning_rules: rulesRes.rows,
      };
    }

    return reply.send({
      success: true,
      data: {
        job: { id: job.id, title: job.title, job_size: job.job_size, client_id: job.client_id },
        briefing,
        client_context: clientContext,
      },
    });
  });

  // ── POST /jobs/:jobId/briefing — upsert briefing ──────────────────────────
  app.post('/jobs/:jobId/briefing', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };

    // Verify job exists
    const jobRes = await query(
      `SELECT id, client_id FROM jobs WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [jobId, tenantId],
    );
    if (!jobRes.rows.length) return reply.status(404).send({ success: false, error: 'Job não encontrado.' });
    const job = jobRes.rows[0];

    const body = request.body as {
      context_trigger?: string;
      consumer_moment?: string;
      main_risk?: string;
      main_objective?: string;
      success_metrics?: string[];
      target_cluster_ids?: string[];
      specific_barriers?: string[];
      message_structure?: string;
      desired_emotion?: string[];
      desired_amd?: string;
      tone_override?: Record<string, any>;
      regulatory_flags?: string[];
      ref_links?: string[];
      ref_notes?: string;
      pieces?: Array<{
        format_type: string;
        platform?: string;
        versions?: number;
        priority?: string;
        notes?: string;
        sort_order?: number;
      }>;
    };

    // Upsert briefing
    const { rows } = await query(
      `INSERT INTO job_briefings (
         job_id, tenant_id, client_id,
         context_trigger, consumer_moment, main_risk,
         main_objective, success_metrics,
         target_cluster_ids, specific_barriers,
         message_structure, desired_emotion, desired_amd,
         tone_override, regulatory_flags,
         ref_links, ref_notes
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       ON CONFLICT (job_id) DO UPDATE SET
         context_trigger    = EXCLUDED.context_trigger,
         consumer_moment    = EXCLUDED.consumer_moment,
         main_risk          = EXCLUDED.main_risk,
         main_objective     = EXCLUDED.main_objective,
         success_metrics    = EXCLUDED.success_metrics,
         target_cluster_ids = EXCLUDED.target_cluster_ids,
         specific_barriers  = EXCLUDED.specific_barriers,
         message_structure  = EXCLUDED.message_structure,
         desired_emotion    = EXCLUDED.desired_emotion,
         desired_amd        = EXCLUDED.desired_amd,
         tone_override      = EXCLUDED.tone_override,
         regulatory_flags   = EXCLUDED.regulatory_flags,
         ref_links          = EXCLUDED.ref_links,
         ref_notes          = EXCLUDED.ref_notes,
         updated_at         = now()
       RETURNING *`,
      [
        jobId, tenantId, job.client_id,
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

    const briefingId = rows[0].id;

    // Upsert pieces if provided
    if (body.pieces?.length) {
      await query(`DELETE FROM job_briefing_pieces WHERE briefing_id = $1`, [briefingId]);
      for (const piece of body.pieces) {
        await query(
          `INSERT INTO job_briefing_pieces
             (briefing_id, format_type, platform, versions, priority, notes, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            briefingId,
            piece.format_type,
            piece.platform ?? null,
            piece.versions ?? 1,
            piece.priority ?? 'media',
            piece.notes ?? null,
            piece.sort_order ?? 0,
          ],
        );
      }
    }

    return reply.send({ success: true, data: rows[0] });
  });

  // ── POST /jobs/:jobId/briefing/submit — submete para aprovação ────────────
  app.post('/jobs/:jobId/briefing/submit', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };

    const { rows } = await query(
      `UPDATE job_briefings
       SET status = 'submitted', submitted_at = now(), updated_at = now()
       WHERE job_id = $1 AND tenant_id = $2 AND status = 'draft'
       RETURNING *`,
      [jobId, tenantId],
    );

    if (!rows.length) return reply.status(400).send({ success: false, error: 'Briefing não encontrado ou já submetido.' });

    // Advance job status to aprovacao_briefing
    await query(
      `UPDATE jobs SET status = 'aprovacao_briefing', updated_at = now()
       WHERE id = $1 AND tenant_id = $2`,
      [jobId, tenantId],
    );

    return reply.send({ success: true, data: rows[0] });
  });

  // ── POST /jobs/:jobId/briefing/approve — aprova briefing ─────────────────
  app.post('/jobs/:jobId/briefing/approve', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const userId = request.user?.id as string;
    const { jobId } = request.params as { jobId: string };

    const { rows } = await query(
      `UPDATE job_briefings
       SET status = 'approved', approved_at = now(), approved_by = $3, updated_at = now()
       WHERE job_id = $1 AND tenant_id = $2 AND status = 'submitted'
       RETURNING *`,
      [jobId, tenantId, userId],
    );

    if (!rows.length) return reply.status(400).send({ success: false, error: 'Briefing não encontrado ou não submetido.' });

    // Advance job to copy_ia (triggers automation)
    await query(
      `UPDATE jobs
       SET status = 'copy_ia', automation_status = 'copy_pending', updated_at = now()
       WHERE id = $1 AND tenant_id = $2`,
      [jobId, tenantId],
    );

    return reply.send({ success: true, data: rows[0] });
  });
}
