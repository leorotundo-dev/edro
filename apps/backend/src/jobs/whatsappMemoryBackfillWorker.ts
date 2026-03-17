import { fetchJobs, markJob } from './jobQueue';
import { backfillWhatsAppClientMemory } from '../services/whatsappClientMemoryService';

let running = false;

function isEnabled() {
  const flag = process.env.WHATSAPP_MEMORY_BACKFILL_ENABLED;
  if (flag === undefined) return true;
  return flag === 'true' || flag === '1';
}

export async function runWhatsAppMemoryBackfillWorkerOnce(): Promise<void> {
  if (!isEnabled() || running) return;
  running = true;

  try {
    const jobs = await fetchJobs('whatsapp.memory_backfill', 1);
    for (const job of jobs) {
      const claimed = await markJob(job.id, 'processing');
      if (!claimed) continue;

      try {
        const payload = job.payload || {};
        const tenantId = String(payload.tenant_id || job.tenant_id || '');
        const clientId = payload.client_id ? String(payload.client_id) : null;
        if (!tenantId) {
          throw new Error('invalid_job_payload');
        }

        const stats = await backfillWhatsAppClientMemory({
          tenantId,
          clientId,
        });

        console.log(
          `[whatsappMemoryBackfillWorker] completed tenant=${tenantId} client=${clientId ?? 'all'} direct=${stats.directMessages} group=${stats.groupMessages} insights=${stats.insights} digests=${stats.digests}`
        );

        await markJob(job.id, 'done');
      } catch (error: any) {
        await markJob(job.id, 'failed', error?.message || 'whatsapp_memory_backfill_failed');
      }
    }
  } finally {
    running = false;
  }
}
