import { query } from '../db';
import { markJob, mergeJobPayload } from '../jobs/jobQueue';

export const JARVIS_BACKGROUND_STALE_MS = 45 * 60 * 1000;

export type JarvisBackgroundQueueHealth = {
  queued: number;
  processing: number;
  stale_processing: number;
  auto_retry_pending: number;
  failed_recent: number;
  last_failed_at: string | null;
};

export async function getJarvisBackgroundQueueHealth(tenantId: string): Promise<JarvisBackgroundQueueHealth> {
  const staleSeconds = Math.max(60, Math.floor(JARVIS_BACKGROUND_STALE_MS / 1000));
  const { rows } = await query<any>(
    `SELECT COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
            COUNT(*) FILTER (WHERE status = 'processing')::int AS processing,
            COUNT(*) FILTER (
              WHERE status = 'processing'
                AND updated_at < NOW() - ($2 || ' seconds')::interval
            )::int AS stale_processing,
            COUNT(*) FILTER (
              WHERE status = 'queued'
                AND COALESCE((payload->>'auto_retry_pending')::boolean, false)
            )::int AS auto_retry_pending,
            COUNT(*) FILTER (
              WHERE status = 'failed'
                AND updated_at >= NOW() - interval '24 hours'
            )::int AS failed_recent,
            (MAX(updated_at) FILTER (WHERE status = 'failed'))::text AS last_failed_at
       FROM job_queue
      WHERE tenant_id = $1::uuid
        AND type = 'jarvis_background'`,
    [tenantId, String(staleSeconds)],
  ).catch(() => ({
    rows: [{
      queued: 0,
      processing: 0,
      stale_processing: 0,
      auto_retry_pending: 0,
      failed_recent: 0,
      last_failed_at: null,
    }] as any[],
  }));

  const row = rows[0] || {};
  return {
    queued: Number(row.queued || 0),
    processing: Number(row.processing || 0),
    stale_processing: Number(row.stale_processing || 0),
    auto_retry_pending: Number(row.auto_retry_pending || 0),
    failed_recent: Number(row.failed_recent || 0),
    last_failed_at: row.last_failed_at || null,
  };
}

export async function syncWorkflowBackgroundFailure(params: {
  tenantId: string;
  workflowId?: string | null;
  workflowStateVersion?: number | null;
  workflowJson?: string | null;
  backgroundJobId: string;
  errorMessage: string;
  deadLetteredAt?: string | null;
  deadLetterReason?: string | null;
  deadLetterCategory?: string | null;
}) {
  const workflowId = String(params.workflowId || '').trim();
  const workflowStateVersion = Math.max(0, Number(params.workflowStateVersion || 0));
  if (!workflowId || workflowStateVersion <= 0) return;

  await query(
    `UPDATE agent_action_log
        SET fired_at = now(),
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
      WHERE tenant_id = $1::uuid
        AND trigger_key = $2
        AND COALESCE((metadata->>'workflow_state_version')::int, 0) = $4
        AND COALESCE(metadata->>'status', '') IN ('queued', 'running')`,
    [params.tenantId, `jarvis_workflow:${workflowId}`, JSON.stringify({
      workflow_id: workflowId,
      workflow_state_version: workflowStateVersion,
      workflow_json: params.workflowJson || null,
      background_job_id: params.backgroundJobId,
      status: 'failed',
      workflow_status: 'failed',
      last_error: params.errorMessage,
      is_dead_letter: Boolean(params.deadLetteredAt),
      dead_lettered_at: params.deadLetteredAt || null,
      dead_letter_reason: params.deadLetterReason || null,
      dead_letter_category: params.deadLetterCategory || null,
      finished_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      can_retry_now: false,
      retry_block_reason: 'Workflow falhou no worker antes de concluir a execução.',
    }), workflowStateVersion],
  ).catch(() => {});
}

export async function syncWorkflowBackgroundCancelled(params: {
  tenantId: string;
  workflowId?: string | null;
  workflowStateVersion?: number | null;
  workflowJson?: string | null;
  backgroundJobId: string;
  errorMessage: string;
}) {
  const workflowId = String(params.workflowId || '').trim();
  const workflowStateVersion = Math.max(0, Number(params.workflowStateVersion || 0));
  if (!workflowId || workflowStateVersion <= 0) return;

  await query(
    `UPDATE agent_action_log
        SET fired_at = now(),
            metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
      WHERE tenant_id = $1::uuid
        AND trigger_key = $2
        AND COALESCE((metadata->>'workflow_state_version')::int, 0) = $4
        AND COALESCE(metadata->>'status', '') = 'queued'`,
    [params.tenantId, `jarvis_workflow:${workflowId}`, JSON.stringify({
      workflow_id: workflowId,
      workflow_state_version: workflowStateVersion,
      workflow_json: params.workflowJson || null,
      background_job_id: params.backgroundJobId,
      status: 'cancelled',
      workflow_status: 'cancelled',
      last_error: params.errorMessage,
      finished_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      recommended_next_action: null,
      recommended_next_label: 'Cancelado',
      can_retry_now: false,
      retry_block_reason: 'Workflow cancelado manualmente antes da execução.',
      is_dead_letter: false,
      dead_lettered_at: null,
      dead_letter_reason: null,
      dead_letter_category: null,
      requires_manual_followup: false,
      manual_followup: [],
    }), workflowStateVersion],
  ).catch(() => {});
}

export async function recoverStaleJarvisBackgroundJobs(options?: { tenantId?: string | null }) {
  const staleSeconds = Math.max(60, Math.floor(JARVIS_BACKGROUND_STALE_MS / 1000));
  const tenantFilter = String(options?.tenantId || '').trim();
  const { rows } = await query<any>(
    `SELECT id, tenant_id, payload
       FROM job_queue
      WHERE type = 'jarvis_background'
        AND status = 'processing'
        AND updated_at < NOW() - ($1 || ' seconds')::interval
        AND ($2 = '' OR tenant_id = $2::uuid)
      ORDER BY updated_at ASC
      LIMIT 20`,
    [String(staleSeconds), tenantFilter],
  );

  let recovered = 0;
  for (const job of rows) {
    const payload = (job.payload || {}) as { args?: Record<string, any> };
    const workflowId = String(payload.args?.workflow_id || '').trim();
    const workflowStateVersion = Number(payload.args?.workflow_state_version || 0) || 0;
    const workflowJson = String(payload.args?.workflow_json || '');
    const errorMessage = 'Jarvis background job expirou sem concluir a execução.';
    const failedAt = new Date().toISOString();

    await mergeJobPayload(job.id, {
      result_error: errorMessage,
      failed_at: failedAt,
      stale_failed_at: failedAt,
    }).catch(() => {});
    await syncWorkflowBackgroundFailure({
      tenantId: job.tenant_id,
      workflowId,
      workflowStateVersion,
      workflowJson,
      backgroundJobId: job.id,
      errorMessage,
    });
    const marked = await markJob(job.id, 'failed', errorMessage).catch(() => false);
    if (marked) recovered += 1;
  }

  return {
    scanned: rows.length,
    recovered,
  };
}
