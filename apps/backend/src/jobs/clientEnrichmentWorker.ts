import { fetchJobs, markJob } from './jobQueue';
import { enrichClientProfile, type EnrichmentSection } from '../services/clientEnrichmentService';

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
  } finally {
    running = false;
  }
}

