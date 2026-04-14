import { query } from '../db';
import { fetchJobs, getJobById, markJob, mergeJobPayload, rescheduleJob } from './jobQueue';
import { runCreatePostPipelineNow, runExecuteMultiStepWorkflowNow, type ToolContext } from '../services/ai/toolExecutor';
import { buildJarvisBackgroundArtifact } from '../services/jarvisBackgroundJobService';
import { updateUnifiedConversationArtifact } from '../services/jarvisPolicyService';
import { recoverStaleJarvisBackgroundJobs, syncWorkflowBackgroundFailure } from '../services/jarvisBackgroundHealthService';
import { notifyEvent } from '../services/notificationService';

let running = false;

async function notifyWorkflowOutcome(params: {
  tenantId: string;
  userId?: string | null;
  userEmail?: string | null;
  workflowId?: string | null;
  backgroundJobId: string;
  outcome: 'completed' | 'failed';
  artifact?: Record<string, any> | null;
}) {
  const userId = String(params.userId || '').trim();
  if (!userId) return;

  const workflowShort = String(params.workflowId || '').trim().slice(0, 8) || params.backgroundJobId.slice(0, 8);
  const requiresManualFollowup = params.artifact?.requires_manual_followup === true;
  const failureClass = String(params.artifact?.failure_class || '').trim();
  const recommendedNextLabel = String(params.artifact?.recommended_next_label || '').trim();
  const lastError = String(params.artifact?.last_error || params.artifact?.error || '').trim();
  const title = params.outcome === 'completed'
    ? `Jarvis concluiu o workflow ${workflowShort}`
    : requiresManualFollowup
    ? `Jarvis exige follow-up no workflow ${workflowShort}`
    : `Jarvis falhou no workflow ${workflowShort}`;
  const body = params.outcome === 'completed'
    ? `${Number(params.artifact?.completed_steps || 0)} etapa(s) concluídas com sucesso.`
    : [
        requiresManualFollowup ? 'Ação manual necessária.' : null,
        recommendedNextLabel ? `Próxima ação: ${recommendedNextLabel}.` : null,
        failureClass ? `Classe: ${failureClass}.` : null,
        lastError || null,
      ].filter(Boolean).join(' ');

  await notifyEvent({
    event: params.outcome === 'completed'
      ? 'jarvis_workflow_completed'
      : requiresManualFollowup
      ? 'jarvis_workflow_attention'
      : 'jarvis_workflow_failed',
    tenantId: params.tenantId,
    userId,
    title,
    body,
    link: '/jarvis',
    recipientEmail: params.userEmail || undefined,
    defaultChannels: ['in_app'],
    payload: {
      workflow_id: params.workflowId || null,
      background_job_id: params.backgroundJobId,
      outcome: params.outcome,
      failure_class: failureClass || null,
      recommended_next_label: recommendedNextLabel || null,
    },
  }).catch(() => {});
}

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

function buildWorkflowDeadLetter(params: {
  kind?: string;
  failureData?: Record<string, any> | null;
  fallbackError?: string | null;
}) {
  if (params.kind !== 'execute_multi_step_workflow') return null;

  const failureData = params.failureData || {};
  const recommendedNextAction = String(failureData.recommended_next_action || '').trim();
  const requiresManualFollowup = failureData.requires_manual_followup === true;
  if (recommendedNextAction === 'retry' && !requiresManualFollowup) return null;

  let deadLetterReason = String(failureData.failure_resolution_hint || params.fallbackError || '').trim();
  if (!deadLetterReason) {
    deadLetterReason = requiresManualFollowup
      ? 'Workflow exige intervenção manual antes de qualquer nova tentativa.'
      : recommendedNextAction === 'fix_permissions'
      ? 'Workflow falhou por permissão e foi movido para a fila morta.'
      : recommendedNextAction === 'fix_input'
      ? 'Workflow falhou por regra de negócio e exige correção antes de repetir.'
      : 'Workflow movido para a fila morta do Jarvis.';
  }

  return {
    deadLetteredAt: new Date().toISOString(),
    deadLetterReason,
    deadLetterCategory: String(failureData.failure_class || '').trim() || (requiresManualFollowup ? 'manual_followup' : 'worker_failure'),
  };
}

export async function runJarvisBackgroundWorkerOnce(): Promise<void> {
  if (running) return;
  running = true;

  try {
    await recoverStaleJarvisBackgroundJobs();
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
      const initiatedByUserId = String((payload.context as any)?.userId || '').trim() || null;
      const initiatedByUserEmail = String((payload.context as any)?.userEmail || '').trim() || null;
      const workflowId = String(payload.args?.workflow_id || '').trim();
      const workflowStateVersion = Number(payload.args?.workflow_state_version || 0) || 0;
      const workflowJson = String(payload.args?.workflow_json || '');

      try {
        if (!payload.context || !['create_post_pipeline', 'execute_multi_step_workflow'].includes(String(payload.kind || ''))) {
          const deadLetter = buildWorkflowDeadLetter({
            kind: String(payload.kind || ''),
            fallbackError: 'Unsupported Jarvis background job',
          });
          await syncWorkflowBackgroundFailure({
            tenantId: job.tenant_id,
            workflowId,
            workflowStateVersion,
            workflowJson,
            backgroundJobId: job.id,
            errorMessage: 'Unsupported Jarvis background job',
            deadLetteredAt: deadLetter?.deadLetteredAt || null,
            deadLetterReason: deadLetter?.deadLetterReason || null,
            deadLetterCategory: deadLetter?.deadLetterCategory || null,
          });
          await mergeJobPayload(job.id, {
            dead_lettered_at: deadLetter?.deadLetteredAt || null,
            dead_letter_reason: deadLetter?.deadLetterReason || null,
            dead_letter_category: deadLetter?.deadLetterCategory || null,
          }).catch(() => {});
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
          const deadLetter = buildWorkflowDeadLetter({
            kind: String(payload.kind || ''),
            failureData,
            fallbackError: result.error || 'Falha desconhecida',
          });
          await mergeJobPayload(job.id, {
            result: failureData,
            result_error: result.error || 'Falha desconhecida',
            failed_at: new Date().toISOString(),
            dead_lettered_at: deadLetter?.deadLetteredAt || null,
            dead_letter_reason: deadLetter?.deadLetterReason || null,
            dead_letter_category: deadLetter?.deadLetterCategory || null,
          });
          await syncWorkflowBackgroundFailure({
            tenantId: job.tenant_id,
            workflowId,
            workflowStateVersion,
            workflowJson,
            backgroundJobId: job.id,
            errorMessage: result.error || 'Falha desconhecida',
            deadLetteredAt: deadLetter?.deadLetteredAt || null,
            deadLetterReason: deadLetter?.deadLetterReason || null,
            deadLetterCategory: deadLetter?.deadLetterCategory || null,
          });
          const failedArtifact = {
            ...failureArtifact,
            is_dead_letter: Boolean(deadLetter?.deadLetteredAt),
            dead_lettered_at: deadLetter?.deadLetteredAt || null,
            dead_letter_reason: deadLetter?.deadLetterReason || null,
            dead_letter_category: deadLetter?.deadLetterCategory || null,
          };
          if (conversationId) {
            await updateUnifiedConversationArtifact({
              route,
              tenantId: job.tenant_id,
              conversationId,
              edroClientId,
              backgroundJobId: job.id,
              artifact: failedArtifact,
            }).catch(() => {});
          }
          await notifyWorkflowOutcome({
            tenantId: job.tenant_id,
            userId: initiatedByUserId,
            userEmail: initiatedByUserEmail,
            workflowId,
            backgroundJobId: job.id,
            outcome: 'failed',
            artifact: failedArtifact,
          });
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
        await notifyWorkflowOutcome({
          tenantId: job.tenant_id,
          userId: initiatedByUserId,
          userEmail: initiatedByUserEmail,
          workflowId,
          backgroundJobId: job.id,
          outcome: 'completed',
          artifact: completedArtifact,
        });
      } catch (error: any) {
        const artifactType = payload.kind === 'execute_multi_step_workflow'
          ? 'execute_multi_step_workflow'
          : 'create_post_pipeline';
        const failureMessage = payload.kind === 'execute_multi_step_workflow'
          ? 'O Jarvis não conseguiu concluir o workflow em background.'
          : 'O Jarvis não conseguiu concluir o pipeline criativo.';
        const deadLetter = buildWorkflowDeadLetter({
          kind: String(payload.kind || ''),
          fallbackError: error?.message || 'Falha desconhecida',
        });
        const failureArtifact = {
          ...(buildJarvisBackgroundArtifact(await getJobById(job.id, job.tenant_id)) || {
            type: artifactType,
            background_job_id: job.id,
          }),
          job_status: 'failed',
          is_dead_letter: Boolean(deadLetter?.deadLetteredAt),
          dead_lettered_at: deadLetter?.deadLetteredAt || null,
          dead_letter_reason: deadLetter?.deadLetterReason || null,
          dead_letter_category: deadLetter?.deadLetterCategory || null,
          message: failureMessage,
          error: error?.message || 'Falha desconhecida',
        };
        await mergeJobPayload(job.id, {
          result_error: error?.message || 'Falha desconhecida',
          failed_at: new Date().toISOString(),
          dead_lettered_at: deadLetter?.deadLetteredAt || null,
          dead_letter_reason: deadLetter?.deadLetterReason || null,
          dead_letter_category: deadLetter?.deadLetterCategory || null,
        }).catch(() => {});
        await syncWorkflowBackgroundFailure({
          tenantId: job.tenant_id,
          workflowId,
          workflowStateVersion,
          workflowJson,
          backgroundJobId: job.id,
          errorMessage: error?.message || 'Falha desconhecida',
          deadLetteredAt: deadLetter?.deadLetteredAt || null,
          deadLetterReason: deadLetter?.deadLetterReason || null,
          deadLetterCategory: deadLetter?.deadLetterCategory || null,
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
        await notifyWorkflowOutcome({
          tenantId: job.tenant_id,
          userId: initiatedByUserId,
          userEmail: initiatedByUserEmail,
          workflowId,
          backgroundJobId: job.id,
          outcome: 'failed',
          artifact: failureArtifact,
        });
      }
    }
  } finally {
    running = false;
  }
}
