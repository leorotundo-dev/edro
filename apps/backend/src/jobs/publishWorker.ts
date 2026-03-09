import { fetchDue, markProcessing, markPublished, markFailed } from '../repos/publishRepo';
import { tavilySearch, isTavilyConfigured } from '../services/tavilyService';
import { logTavilyUsage } from '../services/ai/aiUsageLogger';
import { publishLinkedInPost } from '../services/integrations/linkedinService';
import { publishTikTokVideo } from '../services/integrations/tiktokService';

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

// ── Direct publishing via platform services ────────────────────────────────

async function publishDirectly(job: any): Promise<void> {
  const channel   = (job.channel as string | undefined) ?? '';
  const payload   = (job.payload ?? {}) as Record<string, any>;
  const tenantId  = (job.tenant_id ?? payload.tenant_id ?? '') as string;
  const clientId  = (payload.client_id ?? '') as string;

  if (!tenantId || !clientId) {
    console.log(`[publishWorker] job=${job.id} no tenant/client — marking published without posting`);
    return;
  }

  const ch = channel.toLowerCase();

  if (ch === 'linkedin') {
    await publishLinkedInPost(tenantId, clientId, {
      caption:  payload.copy_text ?? payload.content ?? '',
      imageUrl: payload.image_url ?? '',
      title:    payload.title,
    });
    console.log(`[publishWorker] LinkedIn published job=${job.id}`);
    return;
  }

  if (ch === 'tiktok') {
    const videoUrl = payload.video_url as string | undefined;
    if (!videoUrl) throw new Error('tiktok_publish: video_url required');
    await publishTikTokVideo(tenantId, clientId, {
      videoUrl,
      caption:        payload.copy_text ?? payload.content ?? '',
      privacy:        payload.privacy,
      disableDuet:    payload.disable_duet,
      disableStitch:  payload.disable_stitch,
      disableComment: payload.disable_comment,
    });
    console.log(`[publishWorker] TikTok published job=${job.id}`);
    return;
  }

  if (ch === 'instagram' || ch === 'facebook' || ch === 'meta') {
    // Meta publishing is handled via PUBLISHER_GATEWAY_URL in production.
    // In dev/local mode, log and mark published without posting.
    console.log(`[publishWorker] Meta/Instagram job=${job.id} — no local gateway, marking done`);
    return;
  }

  // Unknown channel — mark published to avoid stuck jobs
  console.log(`[publishWorker] Unknown channel="${channel}" job=${job.id} — marking published`);
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
        await publishDirectly(job);
        await markPublished(job.id);
      }
    } catch (error: any) {
      await markFailed(job.id, error?.message ?? 'publish_failed');
    }
  }
}
