import { fetchJobs, markJob, enqueueJob } from './jobQueue';
import { enrichClientProfile, type EnrichmentSection } from '../services/clientEnrichmentService';
import { query } from '../db';

let running = false;

function isEnabled() {
  const flag = process.env.CLIENT_ENRICHMENT_ENABLED;
  if (flag === undefined) return true;
  return flag === 'true' || flag === '1';
}

function normalizeSections(value: any): EnrichmentSection[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const allowed = new Set<EnrichmentSection>([
    'identity',
    'voice',
    'strategy',
    'competitors',
    'calendar',
  ]);
  const sections = value
    .map((item) => String(item || '').trim() as EnrichmentSection)
    .filter((item) => allowed.has(item));
  return sections.length ? sections : undefined;
}

export async function runClientEnrichmentWorkerOnce() {
  if (!isEnabled() || running) return;
  running = true;
  try {
    const jobs = await fetchJobs('client.enrich', 3);
    for (const job of jobs) {
      const claimed = await markJob(job.id, 'processing');
      if (!claimed) continue;
      try {
        const payload = job.payload || {};
        const tenantId = String(payload.tenant_id || job.tenant_id || '');
        const clientId = String(payload.client_id || '');
        if (!tenantId || !clientId) {
          throw new Error('invalid_job_payload');
        }
        await enrichClientProfile({
          tenant_id: tenantId,
          client_id: clientId,
          sections: normalizeSections(payload.sections),
          trigger: payload.trigger || 'scheduled',
        });
        await markJob(job.id, 'done');
      } catch (error: any) {
        await markJob(job.id, 'failed', error?.message || 'client_enrichment_failed');
      }
    }

    // Auto-schedule clients whose enrichment is stale (>7 days old or never enriched)
    await scheduleStaleClients();
  } finally {
    running = false;
  }
}

async function scheduleStaleClients(): Promise<void> {
  try {
    const { rows: stale } = await query<{ id: string; tenant_id: string }>(
      `SELECT c.id, c.tenant_id
       FROM clients c
       WHERE (
         c.enrichment_status IS NULL
         OR c.enrichment_status = 'pending'
         OR c.intelligence_refreshed_at IS NULL
         OR c.intelligence_refreshed_at < NOW() - INTERVAL '7 days'
       )
       AND NOT EXISTS (
         SELECT 1 FROM job_queue jq
         WHERE jq.type = 'client.enrich'
           AND (jq.payload->>'client_id') = c.id
           AND jq.status IN ('queued', 'processing')
       )
       LIMIT 5`
    );

    for (const client of stale) {
      try {
        await enqueueJob(client.tenant_id, 'client.enrich', {
          tenant_id: client.tenant_id,
          client_id: client.id,
          trigger: 'scheduled',
        });
      } catch {
        // best-effort
      }
    }

    if (stale.length > 0) {
      console.log(`[clientEnrichmentWorker] scheduled ${stale.length} stale clients`);
    }
  } catch (err: any) {
    console.error('[clientEnrichmentWorker] scheduleStaleClients failed:', err?.message);
  }
}

