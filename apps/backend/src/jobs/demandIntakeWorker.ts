import { fetchJobs, markJob, mergeJobPayload, enqueueJob } from './jobQueue';
import { query } from '../db';
import { processDemandIntakePayload } from '../services/demandIntakeService';

let running = false;

export async function runDemandIntakeWorkerOnce(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const jobs = await fetchJobs('demand_intake', 5);
    if (!jobs.length) return;

    for (const job of jobs) {
      const claimed = await markJob(job.id, 'processing');
      if (!claimed) continue;

      try {
        const result = await processDemandIntakePayload(job.tenant_id, (job.payload || {}) as any);
        await mergeJobPayload(job.id, { intake_result: result });
        if (result.candidate?.nextStep === 'briefing_compile') {
          const existing = await query<{ id: string }>(
            `SELECT id
               FROM job_queue
              WHERE tenant_id = $1
                AND type = 'briefing_compile'
                AND payload->>'intake_job_id' = $2
                AND status IN ('queued', 'processing', 'done')
              LIMIT 1`,
            [job.tenant_id, job.id],
          ).catch(() => ({ rows: [] as Array<{ id: string }> }));
          if (!existing.rows.length) {
            await enqueueJob(job.tenant_id, 'briefing_compile', {
              ...(job.payload || {}),
              intake_job_id: job.id,
              intake_result: result,
            }).catch(() => {});
          }
        }
        await markJob(job.id, 'done');
      } catch (error: any) {
        await mergeJobPayload(job.id, {
          intake_result: {
            processed_at: new Date().toISOString(),
            error: error?.message || 'demand_intake_failed',
          },
        }).catch(() => {});
        await markJob(job.id, 'failed', error?.message || 'demand_intake_failed');
      }
    }
  } finally {
    running = false;
  }
}
