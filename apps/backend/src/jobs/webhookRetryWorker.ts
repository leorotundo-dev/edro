/**
 * webhookRetryWorker.ts
 *
 * Polls webhook_retry_queue every 30s and retries failed events (WhatsApp, Instagram, Recall).
 * Exponential backoff: 1min → 5min → 15min, then dead-letter after 3 attempts.
 */

import { processPendingRetries } from '../services/webhookRetryService';

export async function runWebhookRetryWorkerOnce(): Promise<void> {
  const result = await processPendingRetries();
  if (result.processed > 0 || result.failed > 0) {
    console.log(`[webhookRetry] processed=${result.processed} dead_letter=${result.failed}`);
  }
}
