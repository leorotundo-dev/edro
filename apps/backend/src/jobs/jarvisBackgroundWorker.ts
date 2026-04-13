import { fetchJobs, getJobById, markJob, mergeJobPayload } from './jobQueue';
import { runCreatePostPipelineNow, runExecuteMultiStepWorkflowNow, type ToolContext } from '../services/ai/toolExecutor';
import { buildJarvisBackgroundArtifact } from '../services/jarvisBackgroundJobService';
import { updateUnifiedConversationArtifact } from '../services/jarvisPolicyService';

let running = false;

export async function runJarvisBackgroundWorkerOnce(): Promise<void> {
  if (running) return;
  running = true;

  try {
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

      try {
        if (!payload.context || !['create_post_pipeline', 'execute_multi_step_workflow'].includes(String(payload.kind || ''))) {
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
          const failureArtifact = {
            ...(buildJarvisBackgroundArtifact(await getJobById(job.id, job.tenant_id)) || {
              type: artifactType,
              background_job_id: job.id,
            }),
            job_status: 'failed',
            ...(result.data && typeof result.data === 'object' ? result.data : {}),
            message: failureMessage,
            error: result.error || 'Falha desconhecida',
          };
          await mergeJobPayload(job.id, {
            result: result.data && typeof result.data === 'object' ? result.data : null,
            result_error: result.error || 'Falha desconhecida',
            failed_at: new Date().toISOString(),
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
