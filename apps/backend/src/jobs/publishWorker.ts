import { fetchDue, markProcessing, markPublished, markFailed } from '../repos/publishRepo';
import { tavilySearch, isTavilyConfigured } from '../services/tavilyService';
import { logTavilyUsage } from '../services/ai/aiUsageLogger';

async function publishToGateway(job: any): Promise<'gateway' | 'local'> {
  const endpoint = process.env.PUBLISHER_GATEWAY_URL;
  if (!endpoint) {
    return 'local';
  }

  const callback = process.env.PUBLIC_API_URL
    ? `${process.env.PUBLIC_API_URL}/api/webhooks/publisher`
    : undefined;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId: job.id,
      tenant_id: job.tenant_id ?? null,
      post_asset_id: job.post_asset_id,
      provider: job.channel,
      payload: job.payload,
      callback_url: callback,
    }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`gateway_failed:${response.status}:${text}`);
  }

  void text;
  return 'gateway';
}

export async function runPublishWorkerOnce() {
  const due = await fetchDue(20);
  for (const job of due) {
    try {
      await markProcessing(job.id);

      // ── Soft topic validation (never blocks publish) ──────────
      if (isTavilyConfigured() && typeof job.payload?.content === 'string') {
        const contentPreview = (job.payload.content as string).slice(0, 150);
        setImmediate(async () => {
          try {
            const t0 = Date.now();
            const checkRes = await tavilySearch(`${contentPreview} polêmica crise marca`, { maxResults: 2, searchDepth: 'basic' });
            logTavilyUsage({ tenant_id: job.tenant_id || 'system', operation: 'search-basic', unit_count: 1, feature: 'publish_validation', duration_ms: Date.now() - t0, metadata: { job_id: job.id } });
            const hit = checkRes.results.find((r: any) => /polêmica|crise|boicote|escândalo/i.test(r.snippet || ''));
            if (hit) console.warn(`[publishWorker] SOFT ALERT: job=${job.id} tema_sensivel="${hit.title.slice(0, 80)}"`);
          } catch { /* never blocks */ }
        });
      }

      const mode = await publishToGateway(job);
      if (mode === 'local') {
        await markPublished(job.id);
      }
    } catch (error: any) {
      await markFailed(job.id, error?.message ?? 'publish_failed');
    }
  }
}
