import fs from 'fs';
import path from 'path';
import { query } from '../db';
import { createClient } from '../repos/clientsRepo';
import { runClippingWorkerOnce } from '../clipping/worker';
import { scoreClippingItem } from '../clipping/scoring';

type RadarSourceInput = {
  name: string;
  url: string;
  rss?: string;
  type?: string;
  frequency?: string;
  tags?: string[];
  priority?: string;
};

type RadarCategory = {
  name: string;
  sources: RadarSourceInput[];
};

type RadarPayload = {
  client: string;
  client_id: string;
  description?: string;
  categories: RadarCategory[];
  keywords?: string[];
  pillars?: string[];
};

const DEFAULT_PILLARS = ['mobilidade', 'transporte', 'zona leste'];

function mapFrequencyToMinutes(value?: string) {
  if (value === 'weekly') return 60 * 24 * 7;
  if (value === 'monthly') return 60 * 24 * 30;
  return 60 * 24;
}

function mapSourceType(value?: string) {
  const normalized = (value || '').toLowerCase();
  if (normalized === 'rss') return 'RSS';
  if (normalized === 'scrape') return 'URL';
  return 'OTHER';
}

function normalizeList(values?: string[]) {
  if (!values?.length) return [];
  const set = new Set<string>();
  values.forEach((value) => {
    const trimmed = String(value || '').trim();
    if (trimmed) set.add(trimmed);
  });
  return Array.from(set);
}

async function resolveTenantId(clientId: string) {
  const { rows: clients } = await query<any>(
    `SELECT id, tenant_id FROM clients WHERE id=$1 LIMIT 1`,
    [clientId]
  );
  if (clients[0]) return clients[0].tenant_id as string;

  const { rows: tenants } = await query<any>(
    `SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1`
  );
  if (!tenants[0]) throw new Error('No tenant found to attach client.');
  return tenants[0].id as string;
}

async function ensureClient(tenantId: string, payload: RadarPayload) {
  const { rows } = await query<any>(
    `SELECT id FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [payload.client_id, tenantId]
  );
  if (rows[0]) return;

  await createClient({
    tenantId,
    payload: {
      id: payload.client_id,
      name: payload.client || payload.client_id,
      segment_primary: 'mobilidade',
      country: 'BR',
      uf: 'SP',
      city: 'São Paulo',
      segment_secondary: ['mobilidade urbana', 'transporte publico', 'zona leste'],
    },
  });
}

async function updateClientProfile(
  tenantId: string,
  clientId: string,
  keywords: string[],
  pillars: string[]
) {
  const { rows } = await query<any>(
    `SELECT profile FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [clientId, tenantId]
  );
  const current = rows[0]?.profile || {};
  const next = {
    ...current,
    keywords,
    pillars,
  };
  await query(
    `UPDATE clients SET profile=$3::jsonb, updated_at=NOW() WHERE id=$1 AND tenant_id=$2`,
    [clientId, tenantId, JSON.stringify(next)]
  );
}

async function importSources(tenantId: string, payload: RadarPayload) {
  let created = 0;
  let skipped = 0;
  const rssSources: string[] = [];

  for (const category of payload.categories || []) {
    const categoryName = category.name || 'General';
    for (const source of category.sources || []) {
      const mappedType = mapSourceType(source.type);
      const url = mappedType === 'RSS' && source.rss ? source.rss : source.url;
      const tags = normalizeList(source.tags);
      const categories = normalizeList([categoryName]);
      const fetchInterval = mapFrequencyToMinutes(source.frequency);

      const { rows } = await query<any>(
        `
        INSERT INTO clipping_sources
          (tenant_id, scope, client_id, name, url, type, tags, categories, is_active, fetch_interval_minutes)
        VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (tenant_id, url) DO UPDATE SET
          name=EXCLUDED.name,
          scope=EXCLUDED.scope,
          client_id=EXCLUDED.client_id,
          type=EXCLUDED.type,
          tags=EXCLUDED.tags,
          categories=EXCLUDED.categories,
          fetch_interval_minutes=EXCLUDED.fetch_interval_minutes,
          updated_at=NOW()
        RETURNING id
        `,
        [
          tenantId,
          'CLIENT',
          payload.client_id,
          source.name,
          url,
          mappedType,
          tags,
          categories,
          true,
          fetchInterval,
        ]
      );

      if (rows[0]?.id) {
        created += 1;
        if (mappedType === 'RSS') rssSources.push(rows[0].id);
      } else {
        skipped += 1;
      }
    }
  }

  return { created, skipped, rssSources };
}

async function scoreClient(tenantId: string, clientId: string, keywords: string[], pillars: string[]) {
  const { rows: items } = await query<any>(
    `
    SELECT id, title, summary, content, published_at, tags, suggested_client_ids
    FROM clipping_items
    WHERE tenant_id=$1
      AND status IN ('NEW','TRIAGED')
    ORDER BY created_at DESC
    LIMIT 200
    `,
    [tenantId]
  );

  for (const item of items) {
    const scoreResult = scoreClippingItem(
      {
        title: item.title,
        summary: item.summary,
        content: item.content,
        publishedAt: item.published_at,
        tags: item.tags,
      },
      { keywords, pillars }
    );

    const scorePercent = Math.max(0, Math.min(100, Math.round(scoreResult.score * 100)));
    const suggested = Array.from(
      new Set([
        ...(item.suggested_client_ids || []),
        scoreResult.score >= 0.3 ? clientId : null,
      ].filter(Boolean))
    );

    await query(
      `
      UPDATE clipping_items
      SET score=$3,
          relevance_score=$4,
          suggested_client_ids=$5,
          updated_at=NOW()
      WHERE id=$1 AND tenant_id=$2
      `,
      [item.id, tenantId, scorePercent, scoreResult.score, suggested]
    );

    await query(
      `
      INSERT INTO clipping_matches
        (tenant_id, clipping_item_id, client_id, score, matched_keywords, suggested_actions)
      VALUES ($1,$2,$3,$4,$5,$6)
      ON CONFLICT (tenant_id, clipping_item_id, client_id)
      DO UPDATE SET score=$4, matched_keywords=$5, suggested_actions=$6, updated_at=NOW()
      `,
      [
        tenantId,
        item.id,
        clientId,
        scoreResult.score,
        scoreResult.matchedKeywords,
        scoreResult.suggestedActions,
      ]
    );
  }
}

async function main() {
  const args = process.argv.slice(2);
  const fileArg = args.find((arg) => !arg.startsWith('--'));
  const skipWorker = args.includes('--skip-worker');
  const skipScore = args.includes('--skip-score');
  const runsArg = args.find((arg) => arg.startsWith('--runs='));
  const runsEnv = process.env.RADAR_WORKER_RUNS;
  const workerRuns = Math.min(
    10,
    Math.max(
      0,
      Number(runsArg?.split('=')[1] || runsEnv || 3) || 0
    )
  );
  const filePath = fileArg
    ? path.resolve(process.cwd(), fileArg)
    : path.resolve(__dirname, '../../docs/radar-urls-cs-mobi.json');

  const raw = fs.readFileSync(filePath, 'utf-8');
  const payload = JSON.parse(raw) as RadarPayload;
  if (!payload?.client_id) throw new Error('JSON missing client_id');

  const tenantId = await resolveTenantId(payload.client_id);
  await ensureClient(tenantId, payload);

  const keywords = normalizeList(payload.keywords);
  const pillars = normalizeList(payload.pillars || DEFAULT_PILLARS);
  if (keywords.length || pillars.length) {
    await updateClientProfile(tenantId, payload.client_id, keywords, pillars);
  }

  const { created, skipped } = await importSources(tenantId, payload);
  console.log(`Imported sources: ${created}. Updated/Skipped: ${skipped}.`);

  if (!skipWorker && workerRuns > 0) {
    for (let i = 0; i < workerRuns; i += 1) {
      await runClippingWorkerOnce();
    }
  }

  if (!skipScore && (keywords.length || pillars.length)) {
    await scoreClient(tenantId, payload.client_id, keywords, pillars);
  }

  console.log('Radar import completed.');
}

main().catch((error) => {
  console.error('Radar import failed:', error);
  process.exit(1);
});
