/**
 * behanceCrawlerWorker.ts
 *
 * Runs once per day at ~03h BRT.
 * Crawls Behance Featured across 8 design fields and inserts references
 * into da_references for all active tenants.
 *
 * No-op if BEHANCE_API_KEY is not set.
 */

import { query } from '../db';
import { isBehanceConfigured, crawlBehanceFeatured } from '../services/behanceCrawlerService';

let running = false;
let lastRunDate = '';

function todayBRT(): string {
  return new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}

export async function runBehanceCrawlerWorkerOnce(): Promise<void> {
  if (!isBehanceConfigured() || running) return;

  // Self-throttle: once per day
  const today = todayBRT();
  if (today === lastRunDate) return;

  // Run at 03h BRT window only
  const hour = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: 'numeric',
    hour12: false,
  });
  if (Number(hour) !== 3) return;

  running = true;
  lastRunDate = today;

  try {
    const { rows: tenants } = await query<{ tenant_id: string }>(
      `SELECT DISTINCT tenant_id FROM clients WHERE tenant_id IS NOT NULL LIMIT 20`,
    );

    let grandTotal = 0;
    for (const { tenant_id } of tenants) {
      try {
        grandTotal += await crawlBehanceFeatured(tenant_id);
      } catch (err: any) {
        console.error(`[behanceCrawler] tenant ${tenant_id} failed:`, err?.message);
      }
    }

    console.log(`[behanceCrawler] daily run complete — ${grandTotal} references ingested`);
  } catch (err: any) {
    console.error('[behanceCrawler] worker failed:', err?.message);
    lastRunDate = ''; // allow retry next tick
  } finally {
    running = false;
  }
}
