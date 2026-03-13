/**
 * Job Automation Worker
 *
 * Consumes tasks from the job_queue with type='job_automation'.
 * Each task carries a step: 'copy' | 'image' | 'assign' | 'eta'.
 * Steps are chained — copy completion enqueues image, image enqueues assign, etc.
 */

import { fetchJobs, markJob } from './jobQueue';
import {
  generateJobCopy,
  generateJobImage,
  autoAssignJob,
  recalculateOwnerETAs,
} from '../services/jobs/jobAutomationService';

let running = false;

export async function runJobAutomationWorkerOnce(): Promise<void> {
  if (running) return;
  running = true;

  try {
    const jobs = await fetchJobs('job_automation', 3);
    if (!jobs.length) return;

    for (const job of jobs) {
      const claimed = await markJob(job.id, 'processing');
      if (!claimed) continue;

      const payload = job.payload as { jobId?: string; step?: string; ownerId?: string };
      const tenantId = job.tenant_id;
      const jobId = payload.jobId;

      if (!tenantId || !jobId) {
        await markJob(job.id, 'failed', 'Missing tenantId or jobId');
        continue;
      }

      try {
        switch (payload.step) {
          case 'copy':
            await generateJobCopy(tenantId, jobId);
            break;
          case 'image':
            await generateJobImage(tenantId, jobId);
            break;
          case 'assign':
            await autoAssignJob(tenantId, jobId);
            break;
          case 'eta':
            if (payload.ownerId) {
              await recalculateOwnerETAs(tenantId, payload.ownerId);
            }
            break;
          default:
            await markJob(job.id, 'failed', `Unknown step: ${payload.step}`);
            continue;
        }
        await markJob(job.id, 'done');
      } catch (err: any) {
        await markJob(job.id, 'failed', err?.message || 'Unknown error');
      }
    }
  } finally {
    running = false;
  }
}
