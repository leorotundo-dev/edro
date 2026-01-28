import Parser from 'rss-parser';
import crypto from 'crypto';
import { query } from '../db';
import { enqueueJob, fetchJobs, markJob } from '../jobs/jobQueue';
import { UrlScraper } from './urlScraper';

const parser = new Parser();

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
  type: string;
  segments?: string[] | null;
  country?: string | null;
  uf?: string | null;
  city?: string | null;
  score?: number | null;
  suggested_client_ids?: string[] | null;
};

const SEGMENT_KEYWORDS: Record<string, string[]> = {
  varejo: ['varejo', 'supermercado', 'atacado', 'cash&carry', 'promo', 'desconto'],
  moda: ['moda', 'fashion', 'roupa', 'calçado', 'vestuário'],
  saude: ['saude', 'farmacia', 'hospital', 'clinica', 'bem-estar'],
  fintech: ['fintech', 'banco', 'credito', 'pagamento', 'cartao'],
  mobilidade: ['mobilidade', 'transporte', 'rodovia', 'metro', 'onibus', 'trânsito'],
  logistica: ['logistica', 'transporte', 'frete', 'cadeia', 'supply'],
  educacao: ['educacao', 'escola', 'universidade', 'curso'],
  tecnologia: ['tecnologia', 'software', 'saas', 'app', 'inovacao'],
  imobiliario: ['imobiliario', 'imovel', 'condominio', 'construcao'],
  agronegocio: ['agro', 'agronegocio', 'fazenda', 'colheita'],
};

const ENRICH_SCRAPE_ENABLED = (process.env.CLIPPING_SCRAPE_ENRICH || 'false') === 'true';
const scraper = ENRICH_SCRAPE_ENABLED ? new UrlScraper({ timeout: 20000, maxRetries: 2 }) : null;

function normalize(value?: string | null) {
  return (value || '').toLowerCase();
}

function hashUrl(url: string) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

function inferSegments(text: string, base: string[] = []) {
  const found = new Set<string>(base.map((t) => t.toLowerCase()));
  const hay = normalize(text);
  Object.entries(SEGMENT_KEYWORDS).forEach(([segment, keywords]) => {
    if (keywords.some((k) => hay.includes(k))) {
      found.add(segment);
    }
  });
  return Array.from(found);
}

function recencyScore(publishedAt?: string | null) {
  if (!publishedAt) return 0;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return 0;
  const hours = (Date.now() - date.getTime()) / 36e5;
  if (hours <= 24) return 40;
  if (hours <= 72) return 30;
  if (hours <= 168) return 20;
  if (hours <= 720) return 10;
  return 0;
}

function computeScore(params: { publishedAt?: string | null; segments: string[]; type: string }) {
  const base = 30;
  const recency = recencyScore(params.publishedAt);
  const segmentScore = Math.min(30, params.segments.length * 8);
  const typeScore = params.type === 'TREND' ? 10 : 0;
  const score = base + recency + segmentScore + typeScore;
  return Math.max(0, Math.min(100, score));
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

async function suggestClients(tenantId: string, segments: string[]) {
  if (!segments.length) return [];
  const { rows } = await query<any>(
    `SELECT id, segment_primary, profile FROM clients WHERE tenant_id=$1`,
    [tenantId]
  );

  const scored = rows
    .map((client) => {
      const segPrimary = normalize(client.segment_primary);
      let score = segments.includes(segPrimary) ? 2 : 0;

      if (client.profile?.segment_secondary && Array.isArray(client.profile.segment_secondary)) {
        const secondary = client.profile.segment_secondary.map((s: string) => normalize(s));
        if (segments.some((s) => secondary.includes(s))) score += 1;
      }

      return { id: client.id, score };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, 5).map((c) => c.id);
}

async function enqueueDueSources() {
  const { rows } = await query<ClippingSource>(
    `
    SELECT * FROM clipping_sources
    WHERE is_active=true
      AND (
        last_fetched_at IS NULL OR
        last_fetched_at + (fetch_interval_minutes || ' minutes')::interval <= NOW()
      )
    ORDER BY last_fetched_at NULLS FIRST
    LIMIT 20
    `
  );

  for (const source of rows) {
    await enqueueJob(source.tenant_id, 'clipping_fetch_source', { source_id: source.id });
  }
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
    if (source.type !== 'RSS') {
      await query(
        `UPDATE clipping_sources SET last_fetched_at=NOW(), status='OK', last_error=NULL, updated_at=NOW() WHERE id=$1`,
        [source.id]
      );
      return;
    }

    const feed = await parser.parseURL(source.url);
    let inserted = 0;

    for (const item of feed.items || []) {
      const url = (item.link || item.guid || '').trim();
      if (!url) continue;
      const title = (item.title || 'Untitled').trim();
      const snippet =
        (item.contentSnippet || item.content || item.summary || '').toString().slice(0, 600);
      const publishedAt = item.isoDate || item.pubDate || null;
      const imageUrl = extractImageFromRssItem(item);

      const { rows: insertedRows } = await query<{ id: string }>(
        `
        INSERT INTO clipping_items
          (tenant_id, source_id, title, url, url_hash, published_at, snippet, image_url, type, segments, country, uf, city)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (tenant_id, url_hash) DO NOTHING
        RETURNING id
        `,
        [
          source.tenant_id,
          source.id,
          title,
          url,
          hashUrl(url),
          publishedAt ? new Date(publishedAt) : null,
          snippet,
          imageUrl,
          source.type === 'YOUTUBE' ? 'TREND' : 'NEWS',
          source.tags ?? [],
          source.country ?? null,
          source.uf ?? null,
          source.city ?? null,
        ]
      );

      if (insertedRows[0]) {
        inserted += 1;
        await enqueueJob(source.tenant_id, 'clipping_enrich_item', {
          item_id: insertedRows[0].id,
        });
      }
    }

    await query(
      `UPDATE clipping_sources SET last_fetched_at=NOW(), status='OK', last_error=NULL, updated_at=NOW() WHERE id=$1`,
      [source.id]
    );

    return inserted;
  } catch (error: any) {
    await query(
      `UPDATE clipping_sources SET status='ERROR', last_error=$2, updated_at=NOW() WHERE id=$1`,
      [source.id, error?.message || 'fetch_failed']
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
  const text = `${item.title} ${item.snippet || ''}`;
  const segments = inferSegments(text, baseSegments);

  const score = computeScore({
    publishedAt: item.published_at,
    segments,
    type: item.type,
  });

  const suggested = await suggestClients(item.tenant_id, segments);

  let imageUrl = item.image_url ?? null;
  let summary = null as string | null;
  let content = null as string | null;

  if (!imageUrl && scraper && item.url) {
    try {
      const scraped = await scraper.scrape(item.url);
      imageUrl = scraped.imageUrl || imageUrl;
      summary = scraped.excerpt || null;
      content = scraped.contentText || null;
    } catch {
      // ignore scrape failures
    }
  }

  await query(
    `
    UPDATE clipping_items
    SET segments=$3,
        score=$4,
        suggested_client_ids=$5,
        image_url=COALESCE($6, image_url),
        summary=COALESCE($7, summary),
        content=COALESCE($8, content),
        updated_at=NOW()
    WHERE id=$1 AND tenant_id=$2
    `,
    [item.id, item.tenant_id, segments, score, suggested, imageUrl, summary, content]
  );
}

export async function runClippingWorkerOnce() {
  await enqueueDueSources();

  const pendingFetchJobs = await fetchJobs('clipping_fetch_source', 3);
  for (const job of pendingFetchJobs) {
    await markJob(job.id, 'processing');
    try {
      await handleFetchSource(job);
      await markJob(job.id, 'done');
    } catch (error: any) {
      await markJob(job.id, 'failed', error?.message || 'fetch_failed');
    }
  }

  const pendingEnrichJobs = await fetchJobs('clipping_enrich_item', 5);
  for (const job of pendingEnrichJobs) {
    await markJob(job.id, 'processing');
    try {
      await handleEnrichItem(job);
      await markJob(job.id, 'done');
    } catch (error: any) {
      await markJob(job.id, 'failed', error?.message || 'enrich_failed');
    }
  }
}
