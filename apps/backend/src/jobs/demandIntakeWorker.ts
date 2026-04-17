import { fetchJobs, markJob, mergeJobPayload } from './jobQueue';
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
