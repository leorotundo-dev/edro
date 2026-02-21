/**
 * Web Intelligence Worker
 * Processes 'web.market_intelligence' jobs and auto-schedules stale clients.
 * A client is considered "stale" if web intelligence hasn't run in 7+ days.
 */

import { fetchJobs, markJob, enqueueJob } from './jobQueue';
import { query } from '../db';
import { runMarketIntelligenceForClient } from '../services/webMarketIntelligenceService';
import { isTavilyConfigured } from '../services/tavilyService';

let running = false;

function isEnabled(): boolean {
  const flag = process.env.WEB_INTELLIGENCE_ENABLED;
  if (flag === undefined) return true;
  return flag === 'true' || flag === '1';
}

export async function runWebIntelligenceWorkerOnce(): Promise<void> {
  if (!isEnabled() || !isTavilyConfigured() || running) return;
  running = true;

  try {
    // ── Process queued jobs ──────────────────────────────────
    const jobs = await fetchJobs('web.market_intelligence', 2);
    for (const job of jobs) {
      const claimed = await markJob(job.id, 'processing');
      if (!claimed) continue;

      try {
        const payload = job.payload || {};
        const tenantId = String(payload.tenant_id || job.tenant_id || '');
        const clientId = String(payload.client_id || '');

        if (!tenantId || !clientId) {
          throw new Error('invalid_job_payload: missing tenant_id or client_id');
        }

        await runMarketIntelligenceForClient({
          tenantId,
          clientId,
          trigger: payload.trigger || 'weekly',
        });

        await markJob(job.id, 'done');
      } catch (err: any) {
        console.error('[webIntelligenceWorker] job failed:', err?.message);
        await markJob(job.id, 'failed', err?.message || 'web_intelligence_failed');
      }
    }

    // ── Auto-schedule stale clients (runs every tick, enqueues max 5) ──
    await scheduleStaleClients();
  } finally {
    running = false;
  }
}

async function scheduleStaleClients(): Promise<void> {
  try {
    // Find clients whose web intelligence is NULL or older than 7 days
    const { rows: stale } = await query<{ id: string; tenant_id: string }>(
      `SELECT c.id, c.tenant_id
       FROM clients c
       WHERE (
         c.sections_refreshed_at->>'web_intelligence' IS NULL
         OR (c.sections_refreshed_at->>'web_intelligence')::timestamptz < NOW() - INTERVAL '7 days'
       )
       AND NOT EXISTS (
         SELECT 1 FROM job_queue jq
         WHERE jq.type = 'web.market_intelligence'
           AND (jq.payload->>'client_id') = c.id
           AND jq.status IN ('queued', 'processing')
       )
       LIMIT 5`
    );

    for (const client of stale) {
      try {
        await enqueueJob(client.tenant_id, 'web.market_intelligence', {
          tenant_id: client.tenant_id,
          client_id: client.id,
          trigger: 'weekly',
        });
      } catch {
        // best-effort
      }
    }

    if (stale.length > 0) {
      console.log(`[webIntelligenceWorker] scheduled ${stale.length} stale clients`);
    }
  } catch (err: any) {
    // Don't crash the worker on scheduler errors
    console.error('[webIntelligenceWorker] scheduleStaleClients failed:', err?.message);
  }
}
