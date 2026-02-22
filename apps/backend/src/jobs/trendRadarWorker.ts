/**
 * trendRadarWorker.ts
 *
 * Runs every minute but only executes on Mondays at 08:00.
 * For each tenant, finds unique sectors and searches for weekly
 * trends via Tavily, saving results as library items.
 */

import { query } from '../db';
import { tavilySearch, isTavilyConfigured } from '../services/tavilyService';
import { logTavilyUsage } from '../services/ai/aiUsageLogger';

let lastRadarDate = ''; // 'YYYY-MM-DD'

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

async function runTrendRadarJob() {
  console.log('[trendRadar] running weekly trend radar');

  if (!isTavilyConfigured()) {
    console.log('[trendRadar] Tavily not configured — skipping');
    return;
  }

  const { rows: tenants } = await query<{ tenant_id: string }>(
    `SELECT DISTINCT tenant_id FROM clients WHERE tenant_id IS NOT NULL`
  );

  for (const { tenant_id } of tenants) {
    const { rows: sectors } = await query<{ segment_primary: string }>(
      `SELECT DISTINCT segment_primary FROM clients
       WHERE tenant_id=$1 AND segment_primary IS NOT NULL AND segment_primary != ''
       LIMIT 5`,
      [tenant_id]
    );

    for (const { segment_primary } of sectors) {
      try {
        const trendQ = `${segment_primary} tendências conteúdo digital semana`;
        const t0 = Date.now();
        const res = await tavilySearch(trendQ, { maxResults: 4, searchDepth: 'basic' });
        logTavilyUsage({
          tenant_id,
          operation: 'search-basic',
          unit_count: 1,
          feature: 'trend_radar',
          duration_ms: Date.now() - t0,
          metadata: { sector: segment_primary },
        });

        for (const r of res.results.slice(0, 2)) {
          if (!r.snippet || r.snippet.length < 80) continue;

          // Deduplica: pular se já existe este URL na última semana para este tenant
          const { rows: ex } = await query<{ id: string }>(
            `SELECT id FROM library_items
             WHERE source_url=$1 AND created_by='radar_semanal'
               AND created_at > NOW() - INTERVAL '8 days'
               AND tenant_id=$2
             LIMIT 1`,
            [r.url, tenant_id]
          );
          if (ex.length > 0) continue;

          const title = (r.title || trendQ).slice(0, 200);
          const notes = `${r.title}\n\n${r.snippet}\n\nFonte: ${r.url}`.slice(0, 3000);
          const tags = JSON.stringify(['radar', 'semanal', segment_primary.toLowerCase().slice(0, 20)]);

          // Inserir para todos os clientes deste tenant+setor
          await query(
            `INSERT INTO library_items
               (tenant_id, client_id, type, title, description, category, tags,
                weight, use_in_ai, source_url, notes, created_by, status)
             SELECT $1, id, 'note', $2, $3, 'radar_tendencias', $4::jsonb,
               'medium', true, $5, $6, 'radar_semanal', 'pending'
             FROM clients
             WHERE tenant_id=$1 AND segment_primary=$7
             ON CONFLICT DO NOTHING`,
            [tenant_id, title, r.snippet.slice(0, 500), tags, r.url, notes, segment_primary]
          );
        }
      } catch (err: any) {
        console.error(`[trendRadar] sector="${segment_primary}" tenant="${tenant_id}" error:`, err?.message);
      }
    }
  }

  console.log('[trendRadar] done');
}

/** Called every minute by jobsRunner. Runs only on Mondays at 08:00. */
export async function runTrendRadarWorkerOnce() {
  const h = new Date().getHours();
  const dow = new Date().getDay(); // 0=Sunday, 1=Monday
  const today = todayStr();

  if (dow !== 1 || h !== 8 || lastRadarDate === today) return;

  lastRadarDate = today;
  await runTrendRadarJob().catch((err) =>
    console.error('[trendRadar] job error:', err?.message || err)
  );
}
