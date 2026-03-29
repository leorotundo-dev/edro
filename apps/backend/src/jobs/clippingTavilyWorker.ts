/**
 * clippingTavilyWorker.ts
 *
 * Supplements the clipping pipeline with Tavily web search results.
 * Runs every 6 hours per tenant, fetching news for each client's keywords
 * and injecting results as TREND-type clipping items.
 *
 * Pipeline: INSERT clipping_item → enqueue clipping_auto_score
 * (skip clipping_enrich_item since Tavily already provides snippet/content)
 */

import crypto from 'crypto';
import { query } from '../db';
import { enqueueJob } from './jobQueue';
import { tavilySearch, isTavilyConfigured } from '../services/tavilyService';
import { logTavilyUsage } from '../services/ai/aiUsageLogger';
import { computeScore, inferSegments } from '../clipping/itemScoring';

const INTERVAL_MS = Number(process.env.CLIPPING_TAVILY_INTERVAL_MS || 6 * 60 * 60 * 1000);

let lastRunAt = 0;
let running = false;

function hashUrl(url: string) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function hashTitle(title: string) {
  return crypto.createHash('md5').update(title.toLowerCase().trim().slice(0, 120)).digest('hex');
}

// Ensure a "tavily" source exists for the tenant (reuse pattern from clipping/ingest.ts)
async function ensureTavilySource(tenantId: string): Promise<string> {
  const tavilyUrl = 'tavily:global';
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM clipping_sources WHERE tenant_id=$1 AND url=$2 LIMIT 1`,
    [tenantId, tavilyUrl]
  );
  if (rows[0]) return rows[0].id;

  const inserted = await query<{ id: string }>(
    `INSERT INTO clipping_sources
       (tenant_id, scope, client_id, name, url, type, tags, is_active, fetch_interval_minutes)
     VALUES ($1,'GLOBAL',NULL,'Tavily Web Search',$2,'OTHER','{}',true,360)
     RETURNING id`,
    [tenantId, tavilyUrl]
  );
  return inserted.rows[0].id;
}

async function runSupplementForTenant(tenantId: string) {
  const sourceId = await ensureTavilySource(tenantId);

  // Get active clients with recent activity and keywords (last 30 days of jobs/briefings)
  const { rows: clients } = await query<{
    id: string;
    segment_primary: string | null;
    keywords: string[] | null;
  }>(
    `SELECT c.id, c.segment_primary,
            (c.profile->>'keywords')::jsonb AS keywords
     FROM clients c
     WHERE c.tenant_id=$1 AND c.status='active'
       AND EXISTS (
         SELECT 1 FROM jobs j
         WHERE j.tenant_id=$1 AND j.client_id=c.id
           AND j.created_at >= NOW() - INTERVAL '30 days'
         LIMIT 1
       )
     ORDER BY c.updated_at DESC
     LIMIT 10`,
    [tenantId]
  );

  for (const client of clients) {
    const keywords: string[] = Array.isArray(client.keywords)
      ? client.keywords.slice(0, 4)
      : [];
    const sector = client.segment_primary || '';

    if (keywords.length === 0 && !sector) continue;

    const searchQuery = keywords.length >= 2
      ? `${keywords.slice(0, 3).join(' ')} marketing tendência ${new Date().getFullYear()}`
      : `${sector || keywords[0]} tendência marketing conteúdo`;

    try {
      const t0 = Date.now();
      const res = await tavilySearch(searchQuery, { maxResults: 4, searchDepth: 'basic' });
      logTavilyUsage({
        tenant_id: tenantId,
        operation: 'search-basic',
        unit_count: 1,
        feature: 'clipping_supplement',
        duration_ms: Date.now() - t0,
        metadata: { client_id: client.id, query: searchQuery },
      });

      for (const r of res.results.slice(0, 3)) {
        if (!r.url || !r.title || !r.snippet || r.snippet.length < 50) continue;

        const urlHash = hashUrl(r.url);
        const titleHash = hashTitle(r.title);

        // Dedup check
        const { rows: existing } = await query<{ id: string }>(
          `SELECT id FROM clipping_items WHERE tenant_id=$1 AND url_hash=$2 LIMIT 1`,
          [tenantId, urlHash]
        );
        if (existing.length > 0) continue;

        const segments = inferSegments(`${r.title} ${r.snippet}`, []);
        const score = computeScore({ publishedAt: null, segments, type: 'TREND' });

        const { rows: inserted } = await query<{ id: string }>(
          `INSERT INTO clipping_items
             (tenant_id, source_id, title, url, url_hash, title_hash,
              published_at, snippet, type, segments, score)
           VALUES ($1,$2,$3,$4,$5,$6,NOW(),$7,'TREND',$8,$9)
           ON CONFLICT (tenant_id, url_hash) DO NOTHING
           RETURNING id`,
          [
            tenantId,
            sourceId,
            r.title.slice(0, 500),
            r.url,
            urlHash,
            titleHash,
            r.snippet.slice(0, 600),
            segments,
            score,
          ]
        );

        if (inserted[0]?.id) {
          const itemId = inserted[0].id;

          // Directly link this item to the originating client (whose keywords triggered the search).
          // We use a fixed base score of 0.5 ("fetched specifically for this client") so the item
          // surfaces in the client's clipping view even if the keyword scoring pass would miss it.
          await query(
            `INSERT INTO clipping_matches
               (tenant_id, clipping_item_id, client_id, score, matched_keywords, suggested_actions)
             VALUES ($1, $2, $3, 0.5, $4, '{}'::text[])
             ON CONFLICT (tenant_id, clipping_item_id, client_id) DO NOTHING`,
            [tenantId, itemId, client.id, keywords.slice(0, 3)]
          );

          // Also mark the client as suggested
          await query(
            `UPDATE clipping_items
             SET suggested_client_ids = COALESCE(suggested_client_ids, '{}') || $3::text
             WHERE id = $1 AND tenant_id = $2
               AND NOT (COALESCE(suggested_client_ids, '{}') @> ARRAY[$3])`,
            [itemId, tenantId, client.id]
          );

          // Still enqueue auto-score so other clients with matching keywords also see it
          await enqueueJob(tenantId, 'clipping_auto_score', { item_id: itemId });
        }
      }
    } catch (err: any) {
      console.warn(`[clippingTavily] client=${client.id} error="${err?.message}"`);
    }
  }
}

async function runSupplementJob() {
  if (!isTavilyConfigured()) return;

  const { rows: tenants } = await query<{ id: string }>('SELECT id FROM tenants');
  for (const tenant of tenants) {
    try {
      await runSupplementForTenant(tenant.id);
    } catch (err: any) {
      console.error(`[clippingTavily] tenant=${tenant.id} error:`, err?.message);
    }
  }

  console.log('[clippingTavily] supplement run complete');
}

export async function runClippingTavilyWorkerOnce() {
  if (!isTavilyConfigured()) return;
  if (running) return;

  const now = Date.now();
  if (now - lastRunAt < INTERVAL_MS) return;

  running = true;
  lastRunAt = now;

  try {
    await runSupplementJob();
  } catch (err: any) {
    console.error('[clippingTavily] job error:', err?.message || err);
  } finally {
    running = false;
  }
}
