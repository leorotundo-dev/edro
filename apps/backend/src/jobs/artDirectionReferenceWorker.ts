import { query } from '../db';
import { discoverArtDirectionReferences } from '../services/ai/artDirectionMemoryService';

let running = false;
let lastRunBucket = '';

function isEnabled() {
  const flag = process.env.ART_DIRECTION_REFERENCE_ENABLED;
  if (flag === undefined) return false;
  return flag === 'true' || flag === '1';
}

function bucketNow() {
  const now = new Date();
  const bucketHour = Math.floor(now.getHours() / 6) * 6;
  return `${now.toISOString().slice(0, 10)}-${bucketHour}`;
}

export async function runArtDirectionReferenceWorkerOnce(): Promise<void> {
  if (!isEnabled() || running) return;
  const bucket = bucketNow();
  if (bucket === lastRunBucket) return;

  running = true;
  lastRunBucket = bucket;
  try {
    const { rows: clients } = await query<{
      id: string;
      tenant_id: string;
      name: string;
      segment_primary: string | null;
    }>(
      `SELECT id, tenant_id, name, segment_primary
         FROM clients
        WHERE tenant_id IS NOT NULL
          AND name IS NOT NULL
        ORDER BY updated_at DESC NULLS LAST, created_at DESC
        LIMIT 8`,
    );

    let totalInserted = 0;
    for (const client of clients) {
      const segment = client.segment_primary || 'marketing';
      const queries = [
        `${segment} advertising design references ${new Date().getFullYear()}`,
        `${segment} instagram campaign visual direction examples`,
        `${client.name} brand campaign design inspiration`,
      ];

      try {
        totalInserted += await discoverArtDirectionReferences({
          tenantId: client.tenant_id,
          clientId: client.id,
          clientName: client.name,
          segment,
          platform: 'Instagram',
          queries,
          maxResultsPerQuery: 3,
        });
      } catch (error: any) {
        console.error(`[artDirectionReferenceWorker] client ${client.id} failed:`, error?.message || error);
      }
    }

    if (totalInserted > 0) {
      console.log(`[artDirectionReferenceWorker] discovered ${totalInserted} references`);
    }
  } finally {
    running = false;
  }
}
