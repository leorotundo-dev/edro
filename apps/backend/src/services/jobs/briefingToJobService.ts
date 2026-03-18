/**
 * briefingToJobService.ts
 *
 * Quando um briefing entra em produção, cria automaticamente um ops Job
 * com status 'intake' na Central de Operações.
 *
 * Garante idempotência via `source_ref_id` (não cria duplicatas).
 */

import { query } from '../../db';
import { calculatePriority } from './priorityService';
import { estimateMinutes } from './estimationService';
import { syncOperationalRuntimeForJob } from './operationsRuntimeService';

export async function autoCreateJobFromBriefing(
  tenantId: string,
  briefing: {
    id: string;
    title: string;
    main_client_id?: string | null;
    due_at?: string | null;
    brief_context?: string | null;
    summary?: string | null;
    content_type?: string | null;
  }
): Promise<{ created: boolean; jobId?: string }> {
  // Idempotência: só cria se não existe job com esse source_ref_id
  const existing = await query(
    `SELECT id FROM jobs WHERE tenant_id = $1 AND source_ref_id = $2 LIMIT 1`,
    [tenantId, briefing.id]
  );
  if (existing.rows.length) return { created: false, jobId: existing.rows[0].id };

  const jobType = mapContentTypeToJobType(briefing.content_type);
  const complexity = 'm';
  const estimatedMinutes = estimateMinutes({ jobType, complexity, channel: null });
  const { priorityScore, priorityBand } = calculatePriority({
    deadlineAt: briefing.due_at ?? null,
    impactLevel: 2,
    dependencyLevel: 2,
    clientWeight: 5,
    isUrgent: false,
    intakeComplete: false,
    blocked: false,
  });

  const summary = briefing.brief_context || briefing.summary || null;

  const { rows } = await query(
    `INSERT INTO jobs (
       tenant_id, client_id, title, summary, job_type, complexity,
       source, source_ref_id,
       status, priority_score, priority_band,
       estimated_minutes, deadline_at, metadata
     ) VALUES (
       $1, $2, $3, $4, $5, $6,
       'briefing', $7,
       'intake', $8, $9,
       $10, $11,
       jsonb_build_object('created_from_briefing', true)
     )
     RETURNING id`,
    [
      tenantId,
      briefing.main_client_id ?? null,
      briefing.title,
      summary,
      jobType,
      complexity,
      briefing.id,
      priorityScore,
      priorityBand,
      estimatedMinutes,
      briefing.due_at ?? null,
    ]
  );

  const jobId = rows[0].id as string;
  await syncOperationalRuntimeForJob(tenantId, jobId).catch(() => {});
  return { created: true, jobId };
}

function mapContentTypeToJobType(contentType?: string | null): string {
  if (!contentType) return 'copy';
  const t = contentType.toLowerCase();
  if (t.includes('design') || t.includes('visual') || t.includes('arte')) return 'design_static';
  if (t.includes('video') || t.includes('reels') || t.includes('reel')) return 'video_short';
  if (t.includes('story')) return 'story_set';
  if (t.includes('carrossel') || t.includes('carousel')) return 'carousel';
  if (t.includes('copy') || t.includes('texto') || t.includes('post')) return 'copy';
  return 'copy';
}
