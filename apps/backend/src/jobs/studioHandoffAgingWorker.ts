import { processStudioHandoffAgingBatch } from '../services/studioHandoffService';

let running = false;

export async function runStudioHandoffAgingWorkerOnce(): Promise<void> {
  if (running) return;
  running = true;

  try {
    await processStudioHandoffAgingBatch(20);
  } finally {
    running = false;
  }
}
