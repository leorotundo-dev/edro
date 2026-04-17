import { fetchJobs, markJob, mergeJobPayload } from './jobQueue';
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
