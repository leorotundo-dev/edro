/**
 * Gmail Fallback Worker
 *
 * Keeps Gmail inbox ingestion alive even if Pub/Sub push is stalled or
 * misconfigured upstream. The worker checks the latest Gmail history cursor
 * and runs an incremental sync when it detects drift.
 */

import { query } from '../db';
import { syncGmailInboxFallback, watchGmailInbox } from '../services/integrations/gmailService';

let running = false;
let lastRunAt = 0;

const MIN_INTERVAL_MS = 120_000;

export async function runGmailFallbackWorkerOnce(): Promise<void> {
  if (running) return;
  if (Date.now() - lastRunAt < MIN_INTERVAL_MS) return;
  running = true;

  try {
    const { rows } = await query<{
      tenant_id: string;
      email_address: string;
      watch_expiry: string | null;
      last_sync_at: string | null;
    }>(
      `SELECT tenant_id, email_address, watch_expiry, last_sync_at
         FROM gmail_connections
        WHERE refresh_token IS NOT NULL
          AND (
            last_sync_at IS NULL
            OR last_sync_at < NOW() - INTERVAL '2 minutes'
          )
        ORDER BY last_sync_at ASC NULLS FIRST
        LIMIT 10`,
    ).catch(() => ({ rows: [] as Array<{
      tenant_id: string;
      email_address: string;
      watch_expiry: string | null;
      last_sync_at: string | null;
    }> }));

    for (const row of rows) {
      try {
        const watchExpiry = row.watch_expiry ? new Date(row.watch_expiry) : null;
        if (!watchExpiry || watchExpiry.getTime() < Date.now() + 60 * 60 * 1000) {
          await watchGmailInbox(row.tenant_id);
        }

        const outcome = await syncGmailInboxFallback(row.tenant_id);
        if (outcome !== 'noop') {
          console.log(`[gmailFallback] ${outcome} for ${row.email_address}`);
        }
      } catch (err: any) {
        console.error(`[gmailFallback] failed for ${row.email_address}:`, err?.message || err);
      }
    }
  } finally {
    lastRunAt = Date.now();
    running = false;
  }
}
