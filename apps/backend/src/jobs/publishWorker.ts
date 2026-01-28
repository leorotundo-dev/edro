import { fetchDue, markProcessing, markPublished, markFailed } from '../repos/publishRepo';

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
      const mode = await publishToGateway(job);
      if (mode === 'local') {
        await markPublished(job.id);
      }
    } catch (error: any) {
      await markFailed(job.id, error?.message ?? 'publish_failed');
    }
  }
}
