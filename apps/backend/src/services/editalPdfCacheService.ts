import { query } from '../db';

export interface EditalPdfCacheEntry {
  id: string;
  edital_id: string | null;
  source_url: string;
  content_hash: string | null;
  text_content: string | null;
  classification: string | null;
  ocr_meta: Record<string, any> | null;
  created_at: string | Date;
  updated_at: string | Date;
}

const DEFAULT_TTL_HOURS = toPositiveInt(process.env.EDITAL_PDF_CACHE_TTL_HOURS, 168);

function toPositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed > 0 ? Math.floor(parsed) : fallback;
}

function normalizeTextContent(text?: string | null): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  return trimmed.length > 0 ? text : null;
}

function normalizeOcrMeta(meta?: Record<string, any> | null): Record<string, any> | null {
  if (!meta) return null;
  if (typeof meta !== 'object') return null;
  return Object.keys(meta).length ? meta : null;
}

export function isPdfCacheFresh(entry: EditalPdfCacheEntry, ttlHours: number = DEFAULT_TTL_HOURS): boolean {
  if (!entry) return false;
  if (ttlHours <= 0) return false;
  const stamp: any = entry.updated_at || entry.created_at;
  const parsed = stamp instanceof Date ? stamp.getTime() : Date.parse(String(stamp));
  if (!Number.isFinite(parsed)) return false;
  const ageMs = Date.now() - parsed;
  return ageMs <= ttlHours * 60 * 60 * 1000;
}

export async function getPdfCacheByUrl(url: string): Promise<EditalPdfCacheEntry | null> {
  if (!url) return null;
  const { rows } = await query<EditalPdfCacheEntry>(
    `SELECT * FROM edital_pdf_cache WHERE source_url = $1 LIMIT 1`,
    [url]
  );
  return rows[0] || null;
}

export async function upsertPdfCache(params: {
  sourceUrl: string;
  editalId?: string | null;
  contentHash?: string | null;
  textContent?: string | null;
  classification?: string | null;
  ocrMeta?: Record<string, any> | null;
}): Promise<EditalPdfCacheEntry> {
  const normalizedText = normalizeTextContent(params.textContent ?? null);
  const normalizedMeta = normalizeOcrMeta(params.ocrMeta ?? null);
  const { rows } = await query<EditalPdfCacheEntry>(
    `
      INSERT INTO edital_pdf_cache (
        source_url,
        edital_id,
        content_hash,
        text_content,
        classification,
        ocr_meta
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (source_url) DO UPDATE SET
        edital_id = COALESCE(EXCLUDED.edital_id, edital_pdf_cache.edital_id),
        content_hash = COALESCE(EXCLUDED.content_hash, edital_pdf_cache.content_hash),
        text_content = COALESCE(EXCLUDED.text_content, edital_pdf_cache.text_content),
        classification = COALESCE(EXCLUDED.classification, edital_pdf_cache.classification),
        ocr_meta = COALESCE(EXCLUDED.ocr_meta, edital_pdf_cache.ocr_meta),
        updated_at = NOW()
      RETURNING *
    `,
    [
      params.sourceUrl,
      params.editalId ?? null,
      params.contentHash ?? null,
      normalizedText,
      params.classification ?? null,
      normalizedMeta ? JSON.stringify(normalizedMeta) : null,
    ]
  );
  return rows[0];
}

export async function linkPdfCacheToEdital(sourceUrl: string, editalId: string): Promise<void> {
  if (!sourceUrl || !editalId) return;
  await query(
    `UPDATE edital_pdf_cache SET edital_id = $1, updated_at = NOW() WHERE source_url = $2`,
    [editalId, sourceUrl]
  );
}

export async function listPdfCacheByEdital(
  editalId: string,
  options?: { url?: string }
): Promise<EditalPdfCacheEntry[]> {
  if (!editalId) return [];
  const params: any[] = [editalId];
  let sql = `SELECT * FROM edital_pdf_cache WHERE edital_id = $1`;
  if (options?.url) {
    sql += ' AND source_url = $2';
    params.push(options.url);
  }
  sql += ' ORDER BY updated_at DESC';
  const { rows } = await query<EditalPdfCacheEntry>(sql, params);
  return rows;
}

export default {
  getPdfCacheByUrl,
  upsertPdfCache,
  linkPdfCacheToEdital,
  listPdfCacheByEdital,
  isPdfCacheFresh,
};
