/**
 * loraMonitorWorker.ts
 *
 * Polls lora_training_jobs WHERE status = 'training' every 60s.
 * Calls checkTrainingStatus() for each in-flight job.
 * On completion the job status moves to 'completed' (or 'failed') and
 * the AM can then approve → fal_lora_id written to clients.profile.
 */

import { query } from '../db';
import { checkTrainingStatus } from '../services/loraService';

let running = false;

export async function runLoraMonitorWorkerOnce(): Promise<void> {
  if (running) return;
  running = true;
  try {
    await pollTrainingJobs();
  } catch (err: any) {
    console.error('[loraMonitor] failed:', err?.message);
  } finally {
    running = false;
  }
}

async function pollTrainingJobs(): Promise<void> {
  const { rows } = await query<{ id: string; client_id: string; fal_request_id: string }>(
    `SELECT id, client_id, fal_request_id
     FROM lora_training_jobs
     WHERE status = 'training'
       AND fal_request_id IS NOT NULL
     ORDER BY created_at ASC
     LIMIT 10`,
    [],
  );

  if (!rows.length) return;

  for (const job of rows) {
    try {
      await checkTrainingStatus(job.id);
    } catch (err: any) {
      console.error(
        `[loraMonitor] job ${job.id} (fal: ${job.fal_request_id}) poll error:`,
        err?.message,
      );
    }
  }

  console.log(`[loraMonitor] polled ${rows.length} in-flight training job(s)`);
}
