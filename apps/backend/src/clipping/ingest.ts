import crypto from 'crypto';
import { query } from '../db';
import { UrlScraper } from './urlScraper';

export type IngestUrlInput = {
  url: string;
  sourceId?: string | null;
  tags?: string[];
  categories?: string[];
};

export type IngestUrlResult = {
  success: boolean;
  itemId?: string;
  error?: string;
};

const scraper = new UrlScraper({ timeout: 30000, maxRetries: 3, useReadability: true });

function hashUrl(url: string) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

export async function ensureManualSource(tenantId: string) {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM clipping_sources WHERE tenant_id=$1 AND url=$2 LIMIT 1`,
    [tenantId, 'manual']
  );
  if (rows[0]) return rows[0].id;

  const inserted = await query<{ id: string }>(
    `
    INSERT INTO clipping_sources
      (tenant_id, scope, client_id, name, url, type, tags, categories, is_active, fetch_interval_minutes)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    RETURNING id
    `,
    [tenantId, 'GLOBAL', null, 'Manual', 'manual', 'URL', [], [], true, 1440]
  );
  return inserted.rows[0].id;
}

export async function ingestUrl(tenantId: string, input: IngestUrlInput): Promise<IngestUrlResult> {
  try {
    const url = input.url.trim();
    const urlHash = hashUrl(url);
    const { rows: existing } = await query<{ id: string }>(
      `SELECT id FROM clipping_items WHERE tenant_id=$1 AND url_hash=$2 LIMIT 1`,
      [tenantId, urlHash]
    );
    if (existing[0]) {
      return { success: false, error: 'url_already_ingested', itemId: existing[0].id };
    }

    const sourceId = input.sourceId || (await ensureManualSource(tenantId));
    const scraped = await scraper.scrape(url);

    const summary = scraped.excerpt || null;
    const snippet = summary ? summary.slice(0, 600) : null;

    const { rows } = await query<{ id: string }>(
      `
      INSERT INTO clipping_items
        (tenant_id, source_id, title, url, url_hash, published_at, snippet, type,
         segments, country, uf, city, score, suggested_client_ids, assigned_client_ids,
         status, used_count, summary, content, author, image_url, tags, categories, metadata)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24::jsonb)
      RETURNING id
      `,
      [
        tenantId,
        sourceId,
        scraped.title || 'Untitled',
        url,
        urlHash,
        scraped.publishedAt || null,
        snippet,
        'NEWS',
        [],
        null,
        null,
        null,
        0,
        [],
        [],
        'NEW',
        0,
        summary,
        scraped.contentText || null,
        scraped.author || null,
        scraped.imageUrl || null,
        input.tags || scraped.tags || [],
        input.categories || [],
        JSON.stringify({
          siteName: scraped.siteName,
          metadata: scraped.metadata,
        }),
      ]
    );

    return { success: true, itemId: rows[0].id };
  } catch (error: any) {
    return { success: false, error: error?.message || 'ingest_failed' };
  }
}

export async function refreshItem(tenantId: string, itemId: string): Promise<boolean> {
  const { rows } = await query<{ url: string; url_hash: string }>(
    `SELECT url, url_hash FROM clipping_items WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [itemId, tenantId]
  );
  const item = rows[0];
  if (!item) throw new Error('item_not_found');

  const scraped = await scraper.scrape(item.url);
  const summary = scraped.excerpt || null;
  const snippet = summary ? summary.slice(0, 600) : null;

  await query(
    `
    UPDATE clipping_items
    SET title=$3,
        snippet=$4,
        summary=$5,
        content=$6,
        author=$7,
        image_url=$8,
        metadata=$9::jsonb,
        updated_at=NOW()
    WHERE id=$1 AND tenant_id=$2
    `,
    [
      itemId,
      tenantId,
      scraped.title || 'Untitled',
      snippet,
      summary,
      scraped.contentText || null,
      scraped.author || null,
      scraped.imageUrl || null,
      JSON.stringify({ siteName: scraped.siteName, metadata: scraped.metadata }),
    ]
  );

  return true;
}
