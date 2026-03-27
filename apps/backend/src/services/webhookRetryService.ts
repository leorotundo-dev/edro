/**
 * webhookRetryService.ts
 *
 * Persists failed webhook events and retries them with exponential backoff.
 * Retry schedule: 1min → 5min → 15min (3 attempts max, then status = 'failed').
 *
 * Supported sources:
 *   whatsapp  — payload: { msg, instanceId, tenantId }
 *   instagram — payload: { pageId, messaging }
 *   recall    — payload: { eventId }
 */

import { query } from '../db/db';

export type WebhookRetrySource = 'whatsapp' | 'instagram' | 'recall';

const BACKOFF_MINUTES = [1, 5, 15];

export async function enqueueWebhookRetry(
  source: WebhookRetrySource,
  payload: Record<string, any>,
  tenantId?: string | null,
  error?: string,
): Promise<void> {
  await query(
    `INSERT INTO webhook_retry_queue
       (source, tenant_id, payload, last_error, next_retry_at)
     VALUES ($1, $2, $3::jsonb, $4, now() + interval '1 minute')`,
    [source, tenantId ?? null, JSON.stringify(payload), error ?? null],
  ).catch((e) => console.error('[webhookRetry] enqueue failed:', e.message));
}

type RetryRow = {
  id: string;
  source: WebhookRetrySource;
  tenant_id: string | null;
  payload: any;
  attempt_count: number;
  max_attempts: number;
  last_error: string | null;
};

export async function ensureRetryTable(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS webhook_retry_queue (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      source        TEXT NOT NULL,
      tenant_id     TEXT,
      payload       JSONB NOT NULL,
      attempt_count INT NOT NULL DEFAULT 0,
      max_attempts  INT NOT NULL DEFAULT 3,
      next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '1 minute',
      last_error    TEXT,
      status        TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'processing', 'done', 'failed')),
      created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `).catch(() => {});
}

export async function processPendingRetries(): Promise<{ processed: number; failed: number }> {
  await ensureRetryTable();

  // Claim up to 20 due items atomically
  const { rows } = await query<RetryRow>(
    `UPDATE webhook_retry_queue
     SET status = 'processing', updated_at = now()
     WHERE id IN (
       SELECT id FROM webhook_retry_queue
       WHERE status = 'pending' AND next_retry_at <= now()
       ORDER BY next_retry_at ASC
       LIMIT 20
       FOR UPDATE SKIP LOCKED
     )
     RETURNING id, source, tenant_id, payload, attempt_count, max_attempts, last_error`,
  );

  if (!rows.length) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const row of rows) {
    const nextAttempt = row.attempt_count + 1;
    try {
      await dispatch(row.source, row.payload);
      // Success
      await query(
        `UPDATE webhook_retry_queue
         SET status = 'done', attempt_count = $1, last_error = NULL, updated_at = now()
         WHERE id = $2`,
        [nextAttempt, row.id],
      );
      processed++;
    } catch (err: any) {
      const errMsg = err?.message ?? String(err);
      if (nextAttempt >= row.max_attempts) {
        // Dead letter
        await query(
          `UPDATE webhook_retry_queue
           SET status = 'failed', attempt_count = $1, last_error = $2, updated_at = now()
           WHERE id = $3`,
          [nextAttempt, errMsg.slice(0, 500), row.id],
        );
        console.error(`[webhookRetry] dead letter — source=${row.source} id=${row.id} attempts=${nextAttempt}: ${errMsg}`);
        failed++;
      } else {
        // Schedule next retry with exponential backoff
        const delayMins = BACKOFF_MINUTES[nextAttempt] ?? 15;
        await query(
          `UPDATE webhook_retry_queue
           SET status = 'pending', attempt_count = $1, last_error = $2,
               next_retry_at = now() + ($3 || ' minutes')::interval, updated_at = now()
           WHERE id = $4`,
          [nextAttempt, errMsg.slice(0, 500), delayMins, row.id],
        );
        console.warn(`[webhookRetry] retry ${nextAttempt}/${row.max_attempts} — source=${row.source} id=${row.id} next=+${delayMins}min: ${errMsg}`);
      }
    }
  }

  return { processed, failed };
}

// ── Source dispatchers ────────────────────────────────────────────────────────

async function dispatch(source: WebhookRetrySource, payload: any): Promise<void> {
  switch (source) {
    case 'whatsapp': {
      const { processEvolutionMessage } = await import('../routes/webhookEvolution');
      await processEvolutionMessage(payload.msg, payload.instanceId, payload.tenantId);
      break;
    }
    case 'instagram': {
      const { processInstagramMessageRetry } = await import('../routes/webhookInstagram');
      await processInstagramMessageRetry(payload.pageId, payload.messaging);
      break;
    }
    case 'recall': {
      const { processRecallWebhookEvent } = await import('../services/integrations/recallWebhookService');
      await processRecallWebhookEvent(payload.eventId);
      break;
    }
    default:
      throw new Error(`Unknown webhook source: ${source}`);
  }
}
