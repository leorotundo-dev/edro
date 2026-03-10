/**
 * Group Intelligence Worker.
 * Polls for unprocessed WhatsApp group messages and extracts insights via Claude.
 * Follows the clientEnrichmentWorker pattern (running guard + env toggle + self-throttle).
 */

import { query } from '../db';
import { extractInsightsFromBatch } from '../services/groupIntelligenceService';

let running = false;

function isEnabled(): boolean {
  const flag = process.env.GROUP_INTELLIGENCE_ENABLED;
  if (flag === undefined) return true;
  return flag === 'true' || flag === '1';
}

export async function runGroupIntelligenceWorkerOnce(): Promise<void> {
  if (!isEnabled() || running) return;
  running = true;

  try {
    // Find distinct (tenant_id, client_id) pairs with unprocessed messages
    const { rows: pending } = await query<{ tenant_id: string; client_id: string; cnt: string }>(
      `SELECT m.tenant_id, m.client_id, COUNT(*) as cnt
       FROM whatsapp_group_messages m
       JOIN whatsapp_groups g ON g.id = m.group_id
       WHERE m.insight_extracted = false
         AND m.client_id IS NOT NULL
         AND m.content IS NOT NULL
         AND m.content != ''
         AND g.notify_jarvis = true
       GROUP BY m.tenant_id, m.client_id
       ORDER BY cnt DESC
       LIMIT 5`,
    );

    if (!pending.length) return;

    for (const { tenant_id, client_id } of pending) {
      try {
        const count = await extractInsightsFromBatch(tenant_id, client_id);
        if (count > 0) {
          console.log(`[groupIntelligence] extracted ${count} insights for client ${client_id}`);
        }
      } catch (err: any) {
        console.error(`[groupIntelligence] failed for client ${client_id}: ${err.message}`);
      }
    }
  } finally {
    running = false;
  }
}
