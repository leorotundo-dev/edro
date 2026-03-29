import { fetchJobs, getJobById, markJob, mergeJobPayload } from './jobQueue';
import { runCreatePostPipelineNow, type ToolContext } from '../services/ai/toolExecutor';
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
        if (payload.kind !== 'create_post_pipeline' || !payload.context) {
          await markJob(job.id, 'failed', 'Unsupported Jarvis background job');
          continue;
        }

        await mergeJobPayload(job.id, { started_at: new Date().toISOString() });

        const result = await runCreatePostPipelineNow(payload.args || {}, payload.context);
        if (!result.success) {
          const failureArtifact = {
            ...(buildJarvisBackgroundArtifact(await getJobById(job.id, job.tenant_id)) || {
              type: 'create_post_pipeline',
              background_job_id: job.id,
            }),
            job_status: 'failed',
            message: 'O Jarvis não conseguiu concluir o pipeline criativo.',
            error: result.error || 'Falha desconhecida',
          };
          await mergeJobPayload(job.id, {
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
          type: 'create_post_pipeline',
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
        const failureArtifact = {
          ...(buildJarvisBackgroundArtifact(await getJobById(job.id, job.tenant_id)) || {
            type: 'create_post_pipeline',
            background_job_id: job.id,
          }),
          job_status: 'failed',
          message: 'O Jarvis não conseguiu concluir o pipeline criativo.',
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
