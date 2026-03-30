/**
 * behanceCrawlerService.ts
 *
 * Crawls Behance featured projects via Adobe Behance API and ingests them
 * into da_references (source_kind = 'site', domain = 'behance.net').
 *
 * Each project is inserted as status = 'discovered'.
 * The artDirectionTrendWorker then analyzes them with Claude (with vision
 * if covers['404'] is available — gives Claude the actual image).
 *
 * trust_score is seeded from appreciations:
 *   < 500    → 0.60  (fresh/unknown)
 *   500–2k   → 0.70
 *   2k–10k   → 0.80
 *   > 10k    → 0.90
 *
 * Fields crawled (relevance to brand/advertising work):
 *   Branding, Graphic Design, Advertising, Photography,
 *   Illustration, Print, Packaging, Motion Graphics
 *
 * Requires env: BEHANCE_API_KEY (Adobe Developer Console → Behance API → Client ID)
 */

import { query } from '../db';
import { env } from '../env';

const BEHANCE_BASE = 'https://api.behance.net/v2';

// Fields to crawl — maps to Behance field names
const CRAWL_FIELDS = [
  'Branding',
  'Graphic Design',
  'Advertising',
  'Photography',
  'Illustration',
  'Print',
  'Packaging',
  'Motion Graphics',
];

type BehanceProject = {
  id: number;
  name: string;
  url: string;
  covers: Record<string, string>;
  fields: string[];
  owners: Array<{ username: string; display_name: string; url: string }>;
  stats: { views: number; appreciations: number; comments: number };
  created_on: number;
  modified_on: number;
};

type BehanceProjectsResponse = {
  projects: BehanceProject[];
  http_code: number;
};

export function isBehanceConfigured(): boolean {
  return !!(env.BEHANCE_API_KEY ?? process.env.BEHANCE_API_KEY);
}

function behanceKey(): string {
  return env.BEHANCE_API_KEY ?? process.env.BEHANCE_API_KEY ?? '';
}

function trustScoreFromAppreciations(appreciations: number): number {
  if (appreciations >= 10_000) return 0.90;
  if (appreciations >= 2_000)  return 0.80;
  if (appreciations >= 500)    return 0.70;
  return 0.60;
}

async function fetchFeaturedByField(field: string, perPage = 12): Promise<BehanceProject[]> {
  const params = new URLSearchParams({
    client_id: behanceKey(),
    sort: 'featured_date',
    field,
    per_page: String(perPage),
  });

  const res = await fetch(`${BEHANCE_BASE}/projects?${params}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Behance API [${field}] → ${res.status}: ${text.slice(0, 200)}`);
  }

  const json: BehanceProjectsResponse = await res.json();
  return json.projects ?? [];
}

/**
 * Crawl Behance featured projects and insert into da_references.
 * Returns total inserted/upserted count.
 */
export async function crawlBehanceFeatured(tenantId: string, perField = 12): Promise<number> {
  if (!isBehanceConfigured()) return 0;

  // Resolve (or create) the Behance source record
  const sourceId = await ensureBehanceSource(tenantId);

  let total = 0;

  for (const field of CRAWL_FIELDS) {
    let projects: BehanceProject[];
    try {
      projects = await fetchFeaturedByField(field, perField);
    } catch (err: any) {
      console.warn(`[behanceCrawler] field "${field}" failed:`, err?.message);
      continue;
    }

    for (const project of projects) {
      const imageUrl: string | null =
        project.covers?.['404'] ?? project.covers?.['230'] ?? project.covers?.['202'] ?? null;

      const owners = (project.owners ?? []).map((o) => o.display_name).join(', ');
      const snippet = `${project.name}${owners ? ` por ${owners}` : ''} · ${project.stats?.appreciations ?? 0} apreciações · campos: ${project.fields?.join(', ')}`;
      const trustScore = trustScoreFromAppreciations(project.stats?.appreciations ?? 0);

      const metadata = {
        source: 'behance',
        behance_id: project.id,
        behance_fields: project.fields ?? [],
        owners: (project.owners ?? []).map((o) => ({ username: o.username, display_name: o.display_name })),
        stats: project.stats ?? {},
        covers: project.covers ?? {},
        crawl_field: field,
        created_on: project.created_on,
      };

      try {
        const res = await query<{ id: string }>(
          `INSERT INTO da_references
             (tenant_id, source_id, source_url, canonical_url, domain,
              title, snippet, image_url, source_kind, status,
              segment, trust_score, metadata)
           VALUES ($1,$2,$3,$3,'behance.net',
                   $4,$5,$6,'site','discovered',
                   $7,$8,$9::jsonb)
           ON CONFLICT (tenant_id, source_url)
           DO UPDATE SET
             title      = EXCLUDED.title,
             snippet    = EXCLUDED.snippet,
             image_url  = COALESCE(EXCLUDED.image_url, da_references.image_url),
             trust_score = GREATEST(da_references.trust_score, EXCLUDED.trust_score),
             metadata   = COALESCE(da_references.metadata, '{}'::jsonb) || EXCLUDED.metadata,
             updated_at = now()
           RETURNING id`,
          [
            tenantId,
            sourceId,
            project.url,
            project.name,
            snippet,
            imageUrl,
            field,
            trustScore,
            JSON.stringify(metadata),
          ],
        );
        if (res.rows[0]?.id) total += 1;
      } catch (err: any) {
        console.warn(`[behanceCrawler] insert ${project.url} failed:`, err?.message);
      }
    }
  }

  if (total > 0) {
    console.log(`[behanceCrawler] ingested ${total} Behance projects across ${CRAWL_FIELDS.length} fields`);
  }

  return total;
}

async function ensureBehanceSource(tenantId: string): Promise<string | null> {
  const { rows } = await query<{ id: string }>(
    `INSERT INTO da_reference_sources
       (tenant_id, name, source_type, base_url, domain, trust_score, enabled, metadata)
     VALUES ($1, 'Behance Featured', 'site',
             'https://www.behance.net/galleries/best-of-behance',
             'behance.net', 0.85, true,
             '{"tier": 3, "description": "Adobe Behance — Best of Behance gallery"}'::jsonb)
     ON CONFLICT (tenant_id, name) DO UPDATE
       SET enabled = true, updated_at = now()
     RETURNING id`,
    [tenantId],
  );
  return rows[0]?.id ?? null;
}
