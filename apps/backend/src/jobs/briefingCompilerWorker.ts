import { fetchJobs, markJob, mergeJobPayload, enqueueJob } from './jobQueue';
import { query } from '../db';
import { compileBriefingPacket } from '../services/briefingCompilerService';

let running = false;

export async function runBriefingCompilerWorkerOnce(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const jobs = await fetchJobs('briefing_compile', 3);
    if (!jobs.length) return;

    for (const job of jobs) {
      const claimed = await markJob(job.id, 'processing');
      if (!claimed) continue;

      try {
        const payload = (job.payload || {}) as any;
        const compiled = await compileBriefingPacket({
          tenantId: job.tenant_id,
          payload,
        });
        await mergeJobPayload(job.id, { briefing_packet: compiled });
        if (compiled.readiness === 'ready') {
          const existing = await query<{ id: string }>(
            `SELECT id
               FROM job_queue
              WHERE tenant_id = $1
                AND type = 'studio_autostart'
                AND payload->>'briefing_compile_job_id' = $2
                AND status IN ('queued', 'processing', 'done')
              LIMIT 1`,
            [job.tenant_id, job.id],
          ).catch(() => ({ rows: [] as Array<{ id: string }> }));
          if (!existing.rows.length) {
            await enqueueJob(job.tenant_id, 'studio_autostart', {
              ...payload,
              briefing_compile_job_id: job.id,
              briefing_packet: compiled,
            }).catch(() => {});
          }
        }
        await markJob(job.id, 'done');
      } catch (error: any) {
        await mergeJobPayload(job.id, {
          briefing_packet: {
            compiled_at: new Date().toISOString(),
            error: error?.message || 'briefing_compile_failed',
          },
        }).catch(() => {});
        await markJob(job.id, 'failed', error?.message || 'briefing_compile_failed');
      }
    }
  } finally {
    running = false;
  }
}
