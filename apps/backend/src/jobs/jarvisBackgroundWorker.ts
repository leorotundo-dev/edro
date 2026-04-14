import { query } from '../db';
import { fetchJobs, getJobById, markJob, mergeJobPayload, rescheduleJob } from './jobQueue';
import { runCreatePostPipelineNow, runExecuteMultiStepWorkflowNow, type ToolContext } from '../services/ai/toolExecutor';
import { buildJarvisBackgroundArtifact } from '../services/jarvisBackgroundJobService';
import { updateUnifiedConversationArtifact } from '../services/jarvisPolicyService';

let running = false;
const JARVIS_BACKGROUND_STALE_MS = 45 * 60 * 1000;

async function scheduleWorkflowBackgroundRetry(params: {
  jobId: string;
  workflowId: string;
  workflowStateVersion: number;
  workflowJson: string;
  failureData: Record<string, any>;
}) {
  const retryAfterAt = String(params.failureData.retry_after_at || '').trim();
  const recommendedNextAction = String(params.failureData.recommended_next_action || '').trim();
  if (!retryAfterAt || recommendedNextAction !== 'retry') return false;

  const retryArgs = {
    workflow_json: String(params.failureData.workflow_json || params.workflowJson || '[]'),
    workflow_id: String(params.failureData.workflow_id || params.workflowId || '').trim(),
    workflow_state_version: Number(params.failureData.workflow_state_version || params.workflowStateVersion) || 0,
    resume_from_step: Math.max(1, Number(params.failureData.resume_from_step || 1)),
  };
  if (!retryArgs.workflow_id || retryArgs.workflow_state_version <= 0) return false;

  return rescheduleJob(params.jobId, retryAfterAt, {
    args: retryArgs,
    retry_scheduled_for: retryAfterAt,
    last_failure_error: String(params.failureData.last_error || 'Falha transitória').trim() || 'Falha transitória',
    auto_retry_pending: true,
  });
}

async function syncWorkflowBackgroundFailure(params: {
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
        AND COALESCE(metadata->>'status', '') IN ('queued', 'running')`,
    [params.tenantId, `jarvis_workflow:${workflowId}`, JSON.stringify({
      workflow_id: workflowId,
      workflow_state_version: workflowStateVersion,
      workflow_json: params.workflowJson || null,
      background_job_id: params.backgroundJobId,
      status: 'failed',
      workflow_status: 'failed',
      last_error: params.errorMessage,
      finished_at: new Date().toISOString(),
      last_activity_at: new Date().toISOString(),
      can_retry_now: false,
      retry_block_reason: 'Workflow falhou no worker antes de concluir a execução.',
    }), workflowStateVersion],
  ).catch(() => {});
}

async function syncWorkflowBackgroundQueuedRetry(params: {
  tenantId: string;
  workflowId?: string | null;
  workflowStateVersion?: number | null;
  workflowJson?: string | null;
  backgroundJobId: string;
  failureData: Record<string, any>;
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
        AND COALESCE((metadata->>'workflow_state_version')::int, 0) = $4`,
    [params.tenantId, `jarvis_workflow:${workflowId}`, JSON.stringify({
      workflow_id: workflowId,
      workflow_state_version: workflowStateVersion,
      workflow_json: params.workflowJson || null,
      background_job_id: params.backgroundJobId,
      status: 'queued',
      workflow_status: 'queued',
      auto_retry_pending: true,
      retry_after_at: params.failureData.retry_after_at || null,
      retry_attempts_remaining: params.failureData.retry_attempts_remaining ?? null,
      recommended_next_action: params.failureData.recommended_next_action || 'retry',
      recommended_next_label: 'Retry automático agendado',
      can_retry_now: false,
      retry_block_reason: 'O Jarvis vai retomar este workflow automaticamente após o cooldown.',
      last_error: params.failureData.last_error || null,
      last_activity_at: new Date().toISOString(),
      resume_from_step: params.failureData.resume_from_step ?? null,
      completed_steps: params.failureData.completed_steps ?? null,
      steps_preview: Array.isArray(params.failureData.steps_preview) ? params.failureData.steps_preview : undefined,
      steps_history: Array.isArray(params.failureData.steps_history) ? params.failureData.steps_history : undefined,
    }), workflowStateVersion],
  ).catch(() => {});
}

async function failStaleJarvisBackgroundJobs() {
  const staleSeconds = Math.max(60, Math.floor(JARVIS_BACKGROUND_STALE_MS / 1000));
  const { rows } = await query<any>(
    `SELECT id, tenant_id, payload
       FROM job_queue
      WHERE type = 'jarvis_background'
        AND status = 'processing'
        AND updated_at < NOW() - ($1 || ' seconds')::interval
      ORDER BY updated_at ASC
      LIMIT 5`,
    [String(staleSeconds)],
  );

  for (const job of rows) {
    const payload = (job.payload || {}) as {
      args?: Record<string, any>;
    };
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
    await markJob(job.id, 'failed', errorMessage).catch(() => {});
  }
}

export async function runJarvisBackgroundWorkerOnce(): Promise<void> {
  if (running) return;
  running = true;

  try {
    await failStaleJarvisBackgroundJobs();
    const jobs = await fetchJobs('jarvis_background', 2);
    if (!jobs.length) return;

    for (const job of jobs) {
      const claimed = await markJob(job.id, 'processing');
      if (!claimed) continue;

      const payload = (job.payload || {}) as {
        kind?: string;
        args?: Record<string, any>;
        context?: ToolContext;
        conversation?: {
          route?: 'operations' | 'planning';
          conversationId?: string | null;
          edroClientId?: string | null;
        };
      };

      const route = payload.conversation?.route === 'operations' ? 'operations' : 'planning';
      const conversationId = payload.conversation?.conversationId || null;
      const edroClientId = payload.conversation?.edroClientId || payload.context?.edroClientId || null;
      const workflowId = String(payload.args?.workflow_id || '').trim();
      const workflowStateVersion = Number(payload.args?.workflow_state_version || 0) || 0;
      const workflowJson = String(payload.args?.workflow_json || '');

      try {
        if (!payload.context || !['create_post_pipeline', 'execute_multi_step_workflow'].includes(String(payload.kind || ''))) {
          await syncWorkflowBackgroundFailure({
            tenantId: job.tenant_id,
            workflowId,
            workflowStateVersion,
            workflowJson,
            backgroundJobId: job.id,
            errorMessage: 'Unsupported Jarvis background job',
          });
          await markJob(job.id, 'failed', 'Unsupported Jarvis background job');
          continue;
        }

        await mergeJobPayload(job.id, { started_at: new Date().toISOString() });

        const result = payload.kind === 'execute_multi_step_workflow'
          ? await runExecuteMultiStepWorkflowNow(payload.args || {}, payload.context)
          : await runCreatePostPipelineNow(payload.args || {}, payload.context);
        const artifactType = payload.kind === 'execute_multi_step_workflow'
          ? 'execute_multi_step_workflow'
          : 'create_post_pipeline';
        const failureMessage = payload.kind === 'execute_multi_step_workflow'
          ? 'O Jarvis não conseguiu concluir o workflow em background.'
          : 'O Jarvis não conseguiu concluir o pipeline criativo.';
        if (!result.success) {
          const failureData = result.data && typeof result.data === 'object' ? result.data : null;
          const retryScheduled = payload.kind === 'execute_multi_step_workflow'
            ? await scheduleWorkflowBackgroundRetry({
                jobId: job.id,
                workflowId,
                workflowStateVersion,
                workflowJson,
                failureData: failureData || {},
              })
            : false;
          const failureArtifact = {
            ...(buildJarvisBackgroundArtifact(await getJobById(job.id, job.tenant_id)) || {
              type: artifactType,
              background_job_id: job.id,
            }),
            job_status: retryScheduled ? 'queued' : 'failed',
            ...(failureData || {}),
            message: retryScheduled
              ? 'O Jarvis reagendou este workflow automaticamente após o cooldown.'
              : failureMessage,
            error: result.error || 'Falha desconhecida',
          };
          if (retryScheduled) {
            await syncWorkflowBackgroundQueuedRetry({
              tenantId: job.tenant_id,
              workflowId,
              workflowStateVersion: Number(failureData?.workflow_state_version || workflowStateVersion) || workflowStateVersion,
              workflowJson: String(failureData?.workflow_json || workflowJson || ''),
              backgroundJobId: job.id,
              failureData: failureData || {},
            });
            if (conversationId) {
              await updateUnifiedConversationArtifact({
                route,
                tenantId: job.tenant_id,
                conversationId,
                edroClientId,
                backgroundJobId: job.id,
                artifact: failureArtifact,
              }).catch(() => {});
            }
            continue;
          }
          await mergeJobPayload(job.id, {
            result: failureData,
            result_error: result.error || 'Falha desconhecida',
            failed_at: new Date().toISOString(),
          });
          await syncWorkflowBackgroundFailure({
            tenantId: job.tenant_id,
            workflowId,
            workflowStateVersion,
            workflowJson,
            backgroundJobId: job.id,
            errorMessage: result.error || 'Falha desconhecida',
          });
          if (conversationId) {
            await updateUnifiedConversationArtifact({
              route,
              tenantId: job.tenant_id,
              conversationId,
              edroClientId,
              backgroundJobId: job.id,
              artifact: failureArtifact,
            }).catch(() => {});
          }
          await markJob(job.id, 'failed', result.error || 'Falha desconhecida');
          continue;
        }

        await mergeJobPayload(job.id, {
          result: result.data || {},
          completed_at: new Date().toISOString(),
        });
        await markJob(job.id, 'done');

        const completedJob = await getJobById(job.id, job.tenant_id);
        const completedArtifact = buildJarvisBackgroundArtifact(completedJob) || {
          ...(result.data || {}),
          type: artifactType,
          background_job_id: job.id,
          job_status: 'done',
        };

        if (conversationId) {
          await updateUnifiedConversationArtifact({
            route,
            tenantId: job.tenant_id,
            conversationId,
            edroClientId,
            backgroundJobId: job.id,
            artifact: completedArtifact,
          }).catch(() => {});
        }
      } catch (error: any) {
        const artifactType = payload.kind === 'execute_multi_step_workflow'
          ? 'execute_multi_step_workflow'
          : 'create_post_pipeline';
        const failureMessage = payload.kind === 'execute_multi_step_workflow'
          ? 'O Jarvis não conseguiu concluir o workflow em background.'
          : 'O Jarvis não conseguiu concluir o pipeline criativo.';
        const failureArtifact = {
          ...(buildJarvisBackgroundArtifact(await getJobById(job.id, job.tenant_id)) || {
            type: artifactType,
            background_job_id: job.id,
          }),
          job_status: 'failed',
          message: failureMessage,
          error: error?.message || 'Falha desconhecida',
        };
        await mergeJobPayload(job.id, {
          result_error: error?.message || 'Falha desconhecida',
          failed_at: new Date().toISOString(),
        }).catch(() => {});
        await syncWorkflowBackgroundFailure({
          tenantId: job.tenant_id,
          workflowId,
          workflowStateVersion,
          workflowJson,
          backgroundJobId: job.id,
          errorMessage: error?.message || 'Falha desconhecida',
        });
        await markJob(job.id, 'failed', error?.message || 'Falha desconhecida');
        if (conversationId) {
          await updateUnifiedConversationArtifact({
            route,
            tenantId: job.tenant_id,
            conversationId,
            edroClientId,
            backgroundJobId: job.id,
            artifact: failureArtifact,
          }).catch(() => {});
        }
      }
    }
  } finally {
    running = false;
  }
}
