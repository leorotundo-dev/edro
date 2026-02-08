import Parser from 'rss-parser';
import crypto from 'crypto';
import axios, { type AxiosRequestConfig } from 'axios';
import * as cheerio from 'cheerio';
import { query } from '../db';
import { enqueueJob, fetchJobs, markJob } from '../jobs/jobQueue';
import { UrlScraper } from './urlScraper';
import { scoreClippingItem, matchesWordBoundary } from './scoring';
import { computeScore, inferSegments } from './itemScoring';

const parser = new Parser({
  timeout: 20_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  },
});

type ClippingSource = {
  id: string;
  tenant_id: string;
  scope: string;
  client_id?: string | null;
  name: string;
  url: string;
  type: string;
  tags: string[] | null;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  fetch_interval_minutes?: number | null;
  include_keywords?: string[] | null;
  exclude_keywords?: string[] | null;
  min_content_length?: number | null;
};

type ClippingItem = {
  id: string;
  tenant_id: string;
  source_id: string;
  title: string;
  url: string;
  published_at?: string | null;
  snippet?: string | null;
  image_url?: string | null;
  summary?: string | null;
  content?: string | null;
  type: string;
  segments?: string[] | null;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  score?: number | null;
  suggested_client_ids?: string[] | null;
};

const ENRICH_SCRAPE_ENABLED = (process.env.CLIPPING_SCRAPE_ENRICH || 'true') === 'true';
const scraper = ENRICH_SCRAPE_ENABLED ? new UrlScraper({ timeout: 20000, maxRetries: 2 }) : null;

let lastStuckReapAt = 0;
let lastPurgeAt = 0;
let lastZeroScoreRepairAt = 0;

function getClientMinRelevanceScore() {
  const raw = Number(process.env.CLIPPING_CLIENT_MIN_SCORE ?? '0.6');
  if (!Number.isFinite(raw)) return 0.6;
  return Math.max(0, Math.min(1, raw));
}

function getFetchStuckMinutes() {
  const raw = Number(process.env.CLIPPING_FETCH_STUCK_MINUTES ?? '30');
  if (!Number.isFinite(raw)) return 30;
  // Clamp 1–1440 (1 day)
  return Math.max(1, Math.min(1440, Math.trunc(raw)));
}

function normalizeUrlForHash(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hash = '';

    // Remove common tracking params without breaking legit query-based URLs (?p=123 etc).
    for (const key of Array.from(parsed.searchParams.keys())) {
      const lower = key.toLowerCase();
      if (lower.startsWith('utm_')) parsed.searchParams.delete(key);
      if (lower === 'fbclid') parsed.searchParams.delete(key);
      if (lower === 'gclid') parsed.searchParams.delete(key);
      if (lower === 'mc_cid') parsed.searchParams.delete(key);
      if (lower === 'mc_eid') parsed.searchParams.delete(key);
      if (lower === 'igshid') parsed.searchParams.delete(key);
    }

    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

function hashUrl(url: string) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function titleHash(title: string) {
  const normalized = title.toLowerCase().replace(/[^a-záàâãéèêíïóôõöúçñ0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
  return crypto.createHash('md5').update(normalized).digest('hex');
}

function isHttpUrl(value?: string | null) {
  if (!value) return false;
  return value.startsWith('http://') || value.startsWith('https://');
}

function extractImageFromHtml(html?: string | null) {
  if (!html) return null;
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  const src = match?.[1];
  return isHttpUrl(src) ? src : null;
}

function extractImageFromRssItem(item: any) {
  const candidates: Array<string | null | undefined> = [
    item?.enclosure?.url,
    item?.enclosure?.link,
    item?.enclosures?.[0]?.url,
    item?.image?.url,
    item?.itunes?.image,
    item?.['media:content']?.url,
    item?.['media:thumbnail']?.url,
  ];

  for (const candidate of candidates) {
    if (isHttpUrl(candidate)) return candidate as string;
  }

  const fromContent = extractImageFromHtml(item?.content || item?.contentSnippet || item?.summary);
  return fromContent || null;
}

/**
 * Check if an item passes source-level include/exclude filters.
 */
function shouldIngestItem(
  title: string,
  snippet: string,
  source: ClippingSource
): boolean {
  const text = `${title} ${snippet}`.toLowerCase();

  // Include filter: if set, at least one keyword must match
  const includes = (source.include_keywords || []).filter(Boolean);
  if (includes.length > 0) {
    const hasMatch = includes.some((kw) => matchesWordBoundary(text, kw));
    if (!hasMatch) return false;
  }

  // Exclude filter: if any keyword matches, skip
  const excludes = (source.exclude_keywords || []).filter(Boolean);
  if (excludes.length > 0) {
    const hasExclude = excludes.some((kw) => matchesWordBoundary(text, kw));
    if (hasExclude) return false;
  }

  // Min content length
  if (source.min_content_length && text.length < source.min_content_length) {
    return false;
  }

  return true;
}

/**
 * Check if an item with the same title hash exists in the last 7 days.
 */
async function isDuplicateTitle(tenantId: string, hash: string): Promise<boolean> {
  const { rows } = await query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM clipping_items
     WHERE tenant_id=$1 AND title_hash=$2 AND created_at > NOW() - INTERVAL '7 days'`,
    [tenantId, hash]
  );
  return Number(rows[0]?.cnt || 0) > 0;
}

/**
 * Auto-score a clipping item against all clients that have keywords configured.
 */
async function autoScoreClients(tenantId: string, item: ClippingItem) {
  const { rows: clients } = await query<any>(
    `SELECT id, profile FROM clients WHERE tenant_id=$1`,
    [tenantId]
  );

  const minClientScore = getClientMinRelevanceScore();

  for (const client of clients) {
    const profile = client.profile || {};
    const keywords: string[] = Array.isArray(profile.keywords) ? profile.keywords : [];
    const pillars: string[] = Array.isArray(profile.pillars) ? profile.pillars : [];
    const negativeKeywords: string[] = Array.isArray(profile.negative_keywords) ? profile.negative_keywords : [];

    // Skip clients without any keywords or pillars configured
    if (!keywords.length && !pillars.length) continue;

    const scoreResult = scoreClippingItem(
      {
        title: item.title,
        summary: item.snippet || item.summary || undefined,
        content: item.content || undefined,
        publishedAt: item.published_at,
        tags: item.segments,
      },
      { keywords, pillars, negativeKeywords }
    );

    // Only create match for scores that are meaningful to the client.
    if (scoreResult.score >= minClientScore) {
      const scorePercent = Math.max(0, Math.min(100, Math.round(scoreResult.score * 100)));

      // Add client to suggested_client_ids
      const currentSuggested: string[] = Array.isArray(item.suggested_client_ids) ? item.suggested_client_ids : [];
      if (!currentSuggested.includes(client.id)) {
        const updated = [...currentSuggested, client.id];
        await query(
          `UPDATE clipping_items SET suggested_client_ids=$3, relevance_score=GREATEST(COALESCE(relevance_score,0),$4), updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
          [item.id, tenantId, updated, scoreResult.score]
        );
        item.suggested_client_ids = updated;
      }

      // Upsert match
      await query(
        `INSERT INTO clipping_matches
           (tenant_id, clipping_item_id, client_id, score, matched_keywords, suggested_actions, negative_hits, relevance_factors)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT (tenant_id, clipping_item_id, client_id)
         DO UPDATE SET score=$4, matched_keywords=$5, suggested_actions=$6, negative_hits=$7, relevance_factors=$8, updated_at=NOW()`,
        [
          tenantId,
          item.id,
          client.id,
          scoreResult.score,
          scoreResult.matchedKeywords,
          scoreResult.suggestedActions,
          scoreResult.negativeHits,
          JSON.stringify(scoreResult.relevanceFactors),
        ]
      );
    }
  }
}

/**
 * Delete all clipping items older than 7 days, regardless of status or score.
 * Also cleans up related matches, feedback, and completed/failed jobs.
 */
async function purgeExpiredItems() {
  // Delete matches for expired items
  await query(
    `DELETE FROM clipping_matches WHERE clipping_item_id IN (
       SELECT id FROM clipping_items WHERE created_at < NOW() - INTERVAL '7 days'
     )`
  );

  // Delete feedback for expired items
  await query(
    `DELETE FROM clipping_feedback WHERE clipping_item_id IN (
       SELECT id FROM clipping_items WHERE created_at < NOW() - INTERVAL '7 days'
     )`
  );

  // Delete the expired items themselves
  await query(
    `DELETE FROM clipping_items WHERE created_at < NOW() - INTERVAL '7 days'`
  );

  // Clean up old completed/failed clipping jobs (older than 3 days)
  await query(
    `DELETE FROM job_queue
     WHERE type LIKE 'clipping_%'
       AND status IN ('done','failed')
       AND updated_at < NOW() - INTERVAL '3 days'`
  );
}

async function maybePurgeExpiredItems() {
  // Purge queries can be heavy on large tables; avoid running on every 5s tick.
  if (Date.now() - lastPurgeAt < 10 * 60_000) return;
  lastPurgeAt = Date.now();
  try {
    await purgeExpiredItems();
  } catch (error: any) {
    console.error('[clipping] purge failed:', error?.message || error);
  }
}

async function maybeRepairZeroScoreItems() {
  // Older builds produced a batch of items with score=0. Those items pollute ordering/stats
  // and confuse users. Gradually re-enrich them to recompute score + matches.
  if (Date.now() - lastZeroScoreRepairAt < 60_000) return;
  lastZeroScoreRepairAt = Date.now();

  try {
    const { rows: pendingRows } = await query<{ cnt: number }>(
      `
      SELECT COUNT(*)::int AS cnt
      FROM job_queue
      WHERE type='clipping_enrich_item' AND status IN ('queued','processing')
      `
    );
    const pending = Number(pendingRows[0]?.cnt ?? 0);
    const pendingLimit = 200;
    if (pending >= pendingLimit) return;

    const batchSize = 200;
    const { rows } = await query<{ enqueued: number }>(
      `
      WITH picked AS (
        SELECT ci.id, ci.tenant_id
        FROM clipping_items ci
        WHERE ci.score=0
          AND ci.status='NEW'
          AND ci.created_at > NOW() - INTERVAL '7 days'
          AND NOT EXISTS (
            SELECT 1 FROM job_queue jq
            WHERE jq.tenant_id = ci.tenant_id
              AND jq.type='clipping_enrich_item'
              AND jq.status IN ('queued','processing')
              AND jq.payload->>'item_id' = ci.id::text
          )
        ORDER BY ci.created_at DESC
        LIMIT $1
      ),
      inserted AS (
        INSERT INTO job_queue (tenant_id, type, payload)
        SELECT tenant_id, 'clipping_enrich_item', jsonb_build_object('item_id', id)
        FROM picked
        RETURNING id
      )
      SELECT COUNT(*)::int AS enqueued FROM inserted
      `,
      [batchSize]
    );
    const enqueued = Number(rows[0]?.enqueued ?? 0);
    if (enqueued > 0) {
      console.log(`[clipping] auto-repair enqueued ${enqueued} score=0 items`);
    }
  } catch (error: any) {
    console.error('[clipping] auto-repair failed:', error?.message || error);
  }
}

async function enqueueDueSources() {
  const { rows } = await query<ClippingSource>(
    `
    SELECT cs.* FROM clipping_sources cs
    WHERE cs.is_active=true
      AND (
        cs.last_fetched_at IS NULL OR
        cs.last_fetched_at + (COALESCE(cs.fetch_interval_minutes, 60)::text || ' minutes')::interval <= NOW()
      )
      AND NOT EXISTS (
        SELECT 1 FROM job_queue jq
        WHERE jq.type='clipping_fetch_source'
          AND jq.status IN ('queued','processing')
          AND jq.payload->>'source_id' = cs.id::text
      )
    ORDER BY cs.last_fetched_at NULLS FIRST
    LIMIT 20
    `
  );

  for (const source of rows) {
    await enqueueJob(source.tenant_id, 'clipping_fetch_source', { source_id: source.id });
  }
}

async function autoReapStuckFetchJobs() {
  // Avoid running this query on every runner tick (default tick is 5s).
  if (Date.now() - lastStuckReapAt < 60_000) return;
  lastStuckReapAt = Date.now();

  const minutes = getFetchStuckMinutes();

  try {
    await query(
      `WITH cancelled AS (
         UPDATE job_queue jq
         SET status='failed',
             error_message=$1,
             updated_at=NOW()
         WHERE jq.type='clipping_fetch_source'
           AND jq.status='processing'
           AND jq.updated_at < NOW() - ($2::text || ' minutes')::interval
         RETURNING jq.tenant_id, NULLIF(jq.payload->>'source_id','') AS source_id
       ),
       updated_sources AS (
         UPDATE clipping_sources cs
         SET status='ERROR',
             last_error=$3,
             last_fetched_at=NOW(),
             updated_at=NOW()
         FROM cancelled c
         WHERE c.source_id IS NOT NULL
           AND cs.id::text = c.source_id
           AND cs.tenant_id = c.tenant_id
         RETURNING cs.id
       )
       SELECT
         (SELECT COUNT(*)::int FROM cancelled) AS cancelled_jobs,
         (SELECT COUNT(*)::int FROM updated_sources) AS touched_sources`,
      ['fetch_stuck_timeout', minutes, 'fetch_stuck_timeout']
    );
  } catch {
    // ignore auto-reaper errors
  }
}

type UrlCandidate = { url: string; title: string; score: number };

const resolvedFeedUrlBySourceId = new Map<string, string>();

function safeErrorMessage(error: any, fallback: string) {
  const msg = String(error?.message || fallback || '').trim();
  if (!msg) return fallback;
  // Avoid storing huge HTML/CSS blobs in DB when parsers include bodies in error messages.
  const maxLen = 500;
  return msg.length > maxLen ? msg.slice(0, maxLen) : msg;
}

function isManualLikeUrl(url: string) {
  const u = (url || '').trim().toLowerCase();
  return u === 'manual' || u.startsWith('manual:');
}

function isProbablyAssetPath(pathname: string) {
  return /\.(jpg|jpeg|png|gif|webp|svg|pdf|mp4|mp3|css|js|ico|zip|rar|7z|gz|woff2?|ttf|eot)$/i.test(pathname);
}

function cleanAnchorText(raw: string) {
  return (raw || '').replace(/\s+/g, ' ').trim();
}

function scoreUrlCandidate(u: URL, title: string) {
  const path = (u.pathname || '').toLowerCase();
  const segs = path.split('/').filter(Boolean);
  const last = segs[segs.length - 1] || '';

  // Fast hard rejects
  if (isProbablyAssetPath(path)) return -1;
  if (path === '/' || path === '') return -1;
  if (path.startsWith('/wp-json')) return -1;
  if (path.includes('/tag/') || path.includes('/tags/')) return -1;
  if (path.includes('/category/') || path.includes('/categoria/')) return -1;
  if (path.includes('/author/') || path.includes('/autores/')) return -1;
  if (path.includes('/search') || path.includes('/busca')) return -1;
  if (path.includes('/login') || path.includes('/signin') || path.includes('/signup')) return -1;
  if (path.includes('/privacy') || path.includes('/termos') || path.includes('/terms')) return -1;

  const t = title.toLowerCase();
  if (
    t === 'home' ||
    t === 'início' ||
    t === 'inicio' ||
    t.includes('assine') ||
    t.includes('cadastre') ||
    t.includes('login') ||
    t.includes('entrar')
  ) {
    return -1;
  }

  let score = 0;
  if (segs.length >= 3) score += 3;
  if (segs.length === 2) score += 2;
  if (segs.length === 1 && last.length >= 20 && (last.includes('-') || /\d/.test(last))) score += 2;

  if (last.length >= 20) score += 2;
  if (/\d/.test(last)) score += 2;
  if (last.includes('-')) score += 1;
  if (/20\d{2}/.test(path)) score += 1;
  if (title.length >= 30) score += 1;
  if (title.length >= 60) score += 1;

  return score;
}

function getUrlSourceMaxItems() {
  const raw = Number(process.env.CLIPPING_URL_SOURCE_MAX_ITEMS ?? '5');
  if (!Number.isFinite(raw)) return 5;
  return Math.max(1, Math.min(20, Math.trunc(raw)));
}

const URL_SOURCE_HTTP_CONFIG: AxiosRequestConfig = {
  timeout: 20_000,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
  },
  maxRedirects: 5,
  validateStatus: (status) => status >= 200 && status < 400,
};

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string }> {
  const res = await axios.get(url, URL_SOURCE_HTTP_CONFIG);
  const finalUrl = (res.request as any)?.res?.responseUrl || url;
  const html = typeof res.data === 'string' ? res.data : String(res.data || '');
  return { html, finalUrl };
}

async function tryParseFeed(url: string) {
  try {
    return await parser.parseURL(url);
  } catch {
    return null;
  }
}

function extractFeedCandidatesFromHtml(html: string, baseUrl: string) {
  const candidates: string[] = [];
  const seen = new Set<string>();

  try {
    const $ = cheerio.load(html);
    const links = $('link[rel="alternate"][href][type]');
    links.each((_, el) => {
      const type = String($(el).attr('type') || '').toLowerCase();
      if (!type.includes('rss') && !type.includes('atom') && !type.includes('xml')) return;
      const href = String($(el).attr('href') || '').trim();
      if (!href) return;
      try {
        const abs = new URL(href, baseUrl);
        if (!['http:', 'https:'].includes(abs.protocol)) return;
        abs.hash = '';
        const v = abs.toString();
        if (seen.has(v)) return;
        seen.add(v);
        candidates.push(v);
      } catch {
        // ignore bad hrefs
      }
    });
  } catch {
    // ignore parse failures
  }

  // Common feed paths (WordPress etc.)
  try {
    const root = new URL(baseUrl);
    root.hash = '';
    root.search = '';
    root.pathname = '/';
    for (const path of ['/feed/', '/feed', '/rss', '/rss.xml', '/atom.xml', '/feed.xml', '/?feed=rss2']) {
      const u = new URL(path, root.toString()).toString();
      if (!seen.has(u)) {
        seen.add(u);
        candidates.push(u);
      }
    }
  } catch {
    // ignore
  }

  return candidates.slice(0, 8);
}

function extractUrlCandidatesFromHtml(html: string, baseUrl: string, sourceUrl: string): UrlCandidate[] {
  const base = new URL(baseUrl);
  const sourceNorm = normalizeUrlForHash(sourceUrl);

  const $ = cheerio.load(html);

  // Prefer "content-ish" areas to avoid nav/footer spam.
  const preferredSelector =
    'article a[href], main a[href], .post a[href], .entry a[href], .content a[href], .article a[href]';
  let anchors = $(preferredSelector);
  if (anchors.length < 5) anchors = $('a[href]');

  const seen = new Set<string>();
  const out: UrlCandidate[] = [];

  anchors.each((_, el) => {
    const href = String($(el).attr('href') || '').trim();
    if (!href) return;
    if (href.startsWith('#')) return;
    if (href.startsWith('mailto:') || href.startsWith('javascript:')) return;

    const title = cleanAnchorText($(el).text());
    if (!title || title.length < 8) return;

    let abs: URL;
    try {
      abs = new URL(href, base.toString());
    } catch {
      return;
    }

    if (!['http:', 'https:'].includes(abs.protocol)) return;
    if (abs.hostname !== base.hostname) return;

    abs.hash = '';
    // Keep legit query URLs, but strip common tracking params for dedupe.
    const absNorm = normalizeUrlForHash(abs.toString());
    if (!absNorm || absNorm === sourceNorm) return;

    const score = scoreUrlCandidate(abs, title);
    if (score < 4) return;

    if (seen.has(absNorm)) return;
    seen.add(absNorm);

    out.push({ url: absNorm, title, score });
  });

  out.sort((a, b) => b.score - a.score);
  return out.slice(0, 25);
}

async function ingestFeedItems(feed: any, source: ClippingSource) {
  let inserted = 0;

  for (const item of feed.items || []) {
    const url = (item.link || item.guid || '').trim();
    if (!url) continue;
    const title = (item.title || 'Untitled').trim();
    const snippet = (item.contentSnippet || item.content || item.summary || '').toString().slice(0, 600);

    // Source-level include/exclude filter
    if (!shouldIngestItem(title, snippet, source)) continue;

    // Title dedup check
    const tHash = titleHash(title);
    const isDupe = await isDuplicateTitle(source.tenant_id, tHash);
    if (isDupe) continue;

    const publishedAt = item.isoDate || item.pubDate || null;
    const imageUrl = extractImageFromRssItem(item);
    const type = source.type === 'YOUTUBE' ? 'TREND' : 'NEWS';
    const segments = inferSegments(`${title} ${snippet}`, source.tags ?? []);
    const score = computeScore({ publishedAt, segments, type });

    const { rows: insertedRows } = await query<{ id: string }>(
      `
      INSERT INTO clipping_items
        (tenant_id, source_id, title, url, url_hash, title_hash, published_at, snippet, image_url, type, segments, score, country, uf, city)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (tenant_id, url_hash) DO NOTHING
      RETURNING id
      `,
      [
        source.tenant_id,
        source.id,
        title,
        url,
        hashUrl(normalizeUrlForHash(url)),
        tHash,
        publishedAt ? new Date(publishedAt) : null,
        snippet,
        imageUrl,
        type,
        segments,
        score,
        source.country ?? null,
        source.uf ?? null,
        source.city ?? null,
      ]
    );

    if (insertedRows[0]) {
      inserted += 1;
      await enqueueJob(source.tenant_id, 'clipping_enrich_item', { item_id: insertedRows[0].id });
    }
  }

  return inserted;
}

async function ingestUrlSource(source: ClippingSource) {
  // Manual sources are a special "bucket" for one-off ingests; they are not crawlers.
  if (isManualLikeUrl(source.url)) {
    return { inserted: 0, status: 'OK' as const, lastError: null as string | null };
  }

  // 1) If we already discovered a feed URL for this source, try it first.
  const cachedFeedUrl = resolvedFeedUrlBySourceId.get(source.id);
  if (cachedFeedUrl) {
    const feed = await tryParseFeed(cachedFeedUrl);
    if (feed) {
      const inserted = await ingestFeedItems(feed, source);
      return { inserted, status: 'OK' as const, lastError: null as string | null };
    }
    resolvedFeedUrlBySourceId.delete(source.id);
  }

  // 2) Try to parse the URL directly as an RSS/Atom feed (helps when user marked a feed as URL).
  const directFeed = await tryParseFeed(source.url);
  if (directFeed) {
    const inserted = await ingestFeedItems(directFeed, source);
    return { inserted, status: 'OK' as const, lastError: null as string | null };
  }

  // 3) Try to discover RSS/Atom links from HTML + common feed paths.
  const { html, finalUrl } = await fetchHtml(source.url);
  const feedCandidates = extractFeedCandidatesFromHtml(html, finalUrl);

  for (const candidate of feedCandidates) {
    const feed = await tryParseFeed(candidate);
    if (feed) {
      resolvedFeedUrlBySourceId.set(source.id, candidate);
      const inserted = await ingestFeedItems(feed, source);
      return { inserted, status: 'OK' as const, lastError: null as string | null };
    }
  }

  // 4) Fallback: treat as a HTML list page and ingest a small number of likely article links.
  const candidates = extractUrlCandidatesFromHtml(html, finalUrl, source.url);
  const maxInsert = getUrlSourceMaxItems();
  let inserted = 0;

  for (const candidate of candidates) {
    if (inserted >= maxInsert) break;

    const snippet = '';

    if (!shouldIngestItem(candidate.title, snippet, source)) continue;

    const tHash = titleHash(candidate.title);
    const isDupe = await isDuplicateTitle(source.tenant_id, tHash);
    if (isDupe) continue;

    const type = 'NEWS';
    const segments = inferSegments(candidate.title, source.tags ?? []);
    const score = computeScore({ publishedAt: null, segments, type });

    const { rows: insertedRows } = await query<{ id: string }>(
      `
      INSERT INTO clipping_items
        (tenant_id, source_id, title, url, url_hash, title_hash, published_at, snippet, image_url, type, segments, score, country, uf, city)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (tenant_id, url_hash) DO NOTHING
      RETURNING id
      `,
      [
        source.tenant_id,
        source.id,
        candidate.title,
        candidate.url,
        hashUrl(normalizeUrlForHash(candidate.url)),
        tHash,
        null,
        snippet,
        null,
        type,
        segments,
        score,
        source.country ?? null,
        source.uf ?? null,
        source.city ?? null,
      ]
    );

    if (insertedRows[0]) {
      inserted += 1;
      await enqueueJob(source.tenant_id, 'clipping_enrich_item', { item_id: insertedRows[0].id });
    }
  }

  if (!candidates.length) {
    return { inserted, status: 'ERROR' as const, lastError: 'url_no_links_found' };
  }

  // If we found candidates but inserted none, it's usually because everything was already ingested.
  return { inserted, status: 'OK' as const, lastError: null as string | null };
}

async function handleFetchSource(job: any) {
  const sourceId = job.payload?.source_id;
  if (!sourceId) return;

  const { rows } = await query<ClippingSource>(
    `SELECT * FROM clipping_sources WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [sourceId, job.tenant_id]
  );
  const source = rows[0];
  if (!source) return;

  try {
    if (source.type === 'URL') {
      const res = await ingestUrlSource(source);
      await query(
        `UPDATE clipping_sources cs
         SET last_fetched_at=NOW(),
             status=$4,
             last_error=$5,
             updated_at=NOW()
         FROM job_queue jq
         WHERE cs.id=$1
           AND cs.tenant_id=$2
           AND jq.id=$3
           AND jq.tenant_id=$2
           AND jq.status='processing'`,
        [source.id, job.tenant_id, job.id, res.status, res.lastError]
      );
      return res.inserted;
    }

    const feed = await parser.parseURL(source.url);
    const inserted = await ingestFeedItems(feed, source);

    await query(
      `UPDATE clipping_sources cs
       SET last_fetched_at=NOW(), status='OK', last_error=NULL, updated_at=NOW()
       FROM job_queue jq
       WHERE cs.id=$1
         AND cs.tenant_id=$2
         AND jq.id=$3
         AND jq.tenant_id=$2
         AND jq.status='processing'`,
      [source.id, job.tenant_id, job.id]
    );

    return inserted;
  } catch (error: any) {
    const msg = safeErrorMessage(error, 'fetch_failed');
    await query(
      `UPDATE clipping_sources cs
       SET last_fetched_at=NOW(), status='ERROR', last_error=$4, updated_at=NOW()
       FROM job_queue jq
       WHERE cs.id=$1
         AND cs.tenant_id=$2
         AND jq.id=$3
         AND jq.tenant_id=$2
         AND jq.status='processing'`,
      [source.id, job.tenant_id, job.id, msg]
    );
    throw error;
  }
}

async function handleEnrichItem(job: any) {
  const itemId = job.payload?.item_id;
  if (!itemId) return;

  const { rows } = await query<ClippingItem>(
    `SELECT * FROM clipping_items WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [itemId, job.tenant_id]
  );
  const item = rows[0];
  if (!item) return;

  const baseSegments = Array.isArray(item.segments) ? item.segments : [];
  let text = `${item.title} ${item.snippet || ''}`;
  const segments = inferSegments(text, baseSegments);

  let imageUrl = item.image_url ?? null;
  let summary = null as string | null;
  let content = null as string | null;

  // Always scrape when scraper is available and item has a URL
  if (scraper && item.url) {
    try {
      const scraped = await scraper.scrape(item.url);
      imageUrl = scraped.imageUrl || imageUrl;
      summary = scraped.excerpt || null;
      content = scraped.contentText || null;
      // Re-infer segments with richer content
      if (content) {
        text = `${item.title} ${summary || ''} ${content}`;
        const enrichedSegments = inferSegments(text, segments);
        segments.length = 0;
        enrichedSegments.forEach((s) => segments.push(s));
      }
    } catch {
      // ignore scrape failures
    }
  }

  const score = computeScore({
    publishedAt: item.published_at,
    segments,
    type: item.type,
  });

  await query(
    `
    UPDATE clipping_items
    SET segments=$3,
        score=$4,
        image_url=COALESCE($5, image_url),
        summary=COALESCE($6, summary),
        content=COALESCE($7, content),
        updated_at=NOW()
    WHERE id=$1 AND tenant_id=$2
    `,
    [item.id, item.tenant_id, segments, score, imageUrl, summary, content]
  );

  // Enqueue auto-score job
  await enqueueJob(item.tenant_id, 'clipping_auto_score', { item_id: item.id });
}

async function handleAutoScore(job: any) {
  const itemId = job.payload?.item_id;
  if (!itemId) return;

  const { rows } = await query<ClippingItem>(
    `SELECT * FROM clipping_items WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [itemId, job.tenant_id]
  );
  const item = rows[0];
  if (!item) return;

  await autoScoreClients(job.tenant_id, item);
}

export async function runClippingWorkerOnce() {
  await autoReapStuckFetchJobs();

  await maybePurgeExpiredItems();

  await maybeRepairZeroScoreItems();

  try {
    await enqueueDueSources();
  } catch (error: any) {
    console.error('[clipping] enqueueDueSources failed:', error?.message || error);
  }

  const pendingFetchJobs = await fetchJobs('clipping_fetch_source', 3);
  for (const job of pendingFetchJobs) {
    const started = await markJob(job.id, 'processing');
    if (!started) continue;
    try {
      await handleFetchSource(job);
      await markJob(job.id, 'done');
    } catch (error: any) {
      await markJob(job.id, 'failed', error?.message || 'fetch_failed');
    }
  }

  const pendingEnrichJobs = await fetchJobs('clipping_enrich_item', 5);
  for (const job of pendingEnrichJobs) {
    const started = await markJob(job.id, 'processing');
    if (!started) continue;
    try {
      await handleEnrichItem(job);
      await markJob(job.id, 'done');
    } catch (error: any) {
      await markJob(job.id, 'failed', error?.message || 'enrich_failed');
    }
  }

  const pendingAutoScoreJobs = await fetchJobs('clipping_auto_score', 10);
  for (const job of pendingAutoScoreJobs) {
    const started = await markJob(job.id, 'processing');
    if (!started) continue;
    try {
      await handleAutoScore(job);
      await markJob(job.id, 'done');
    } catch (error: any) {
      await markJob(job.id, 'failed', error?.message || 'auto_score_failed');
    }
  }
}
