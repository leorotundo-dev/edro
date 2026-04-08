import { query } from '../db';
import { buildClientLivingMemory } from '../services/clientLivingMemoryService';
import { materializeCanonicalClientMemoryFacts } from '../services/clientMemoryCanonicalizationService';

const MAX_CLIENTS_PER_RUN = 30;
let running = false;
let lastRunHourKey = '';

function isEnabled() {
  const flag = process.env.CLIENT_LIVING_MEMORY_WORKER_ENABLED;
  if (flag === undefined) return true;
  return flag === 'true' || flag === '1';
}

function currentHourKey(now: Date) {
  return now.toISOString().slice(0, 13);
}

export async function runClientLivingMemoryWorkerOnce(): Promise<void> {
  if (!isEnabled() || running) return;

  const now = new Date();
  const hourKey = currentHourKey(now);
  if (lastRunHourKey === hourKey) return;

  running = true;
  lastRunHourKey = hourKey;

  try {
    const { rows } = await query<{ tenant_id: string; client_id: string }>(
      `WITH recent_clients AS (
         SELECT tenant_id::text AS tenant_id, client_id::text AS client_id, MAX(created_at) AS touched_at
           FROM client_documents
          WHERE source_type = ANY($1::text[])
            AND created_at > NOW() - INTERVAL '24 hours'
          GROUP BY tenant_id, client_id

         UNION ALL

         SELECT tenant_id::text AS tenant_id, client_id::text AS client_id, MAX(created_at) AS touched_at
           FROM meeting_actions
          WHERE created_at > NOW() - INTERVAL '14 days'
          GROUP BY tenant_id, client_id

         UNION ALL

         SELECT tenant_id::text AS tenant_id, client_id::text AS client_id, MAX(created_at) AS touched_at
           FROM client_directives
          WHERE created_at > NOW() - INTERVAL '30 days'
          GROUP BY tenant_id, client_id

         UNION ALL

         SELECT tenant_id::text AS tenant_id, client_id::text AS client_id, MAX(created_at) AS touched_at
           FROM whatsapp_message_insights
          WHERE created_at > NOW() - INTERVAL '30 days'
            AND COALESCE(confirmation_status, 'pending') IN ('confirmed', 'corrected')
          GROUP BY tenant_id, client_id
       )
       SELECT tenant_id, client_id
         FROM recent_clients
        GROUP BY tenant_id, client_id
        ORDER BY MAX(touched_at) DESC
        LIMIT $2`,
      [[
        'gmail_message',
        'whatsapp_message',
        'whatsapp_insight',
        'whatsapp_digest',
        'meeting',
        'meeting_chat',
      ], MAX_CLIENTS_PER_RUN],
    );

    if (!rows.length) return;

    let refreshed = 0;
    let canonicalPromotions = 0;
    for (const row of rows) {
      try {
        await buildClientLivingMemory({
          tenantId: row.tenant_id,
          clientId: row.client_id,
          daysBack: 60,
          maxDirectives: 8,
          maxEvidence: 8,
          maxActions: 6,
        });
        const canonical = await materializeCanonicalClientMemoryFacts({
          tenantId: row.tenant_id,
          clientId: row.client_id,
        });
        refreshed += 1;
        canonicalPromotions += canonical.promoted;
      } catch (error: any) {
        console.error(`[clientLivingMemoryWorker] failed tenant=${row.tenant_id} client=${row.client_id}:`, error?.message || error);
      }
    }

    console.log(`[clientLivingMemoryWorker] refreshed ${refreshed}/${rows.length} clients | canonical promotions=${canonicalPromotions}`);
  } finally {
    running = false;
  }
}
