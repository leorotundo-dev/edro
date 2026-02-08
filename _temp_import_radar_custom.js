const fs = require('fs');
const { Client } = require('pg');

function mapFrequencyToMinutes(value) {
  if (value === 'weekly') return 60 * 24 * 7;
  if (value === 'monthly') return 60 * 24 * 30;
  return 60 * 24;
}

function mapSourceType(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'rss') return 'RSS';
  if (normalized === 'scrape') return 'URL';
  return normalized ? normalized.toUpperCase() : 'OTHER';
}

function normalizeList(values) {
  if (!values?.length) return [];
  const set = new Set();
  values.forEach((value) => {
    const trimmed = String(value || '').trim();
    if (trimmed) set.add(trimmed);
  });
  return Array.from(set);
}

(async () => {
  const filePath = '/tmp/radar-cuiaba.json';
  const raw = fs.readFileSync(filePath, 'utf8');
  const payload = JSON.parse(raw);
  if (!payload?.client_id) throw new Error('payload missing client_id');

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const { rows: clientRows } = await db.query('SELECT id, tenant_id, profile FROM clients WHERE id=$1 LIMIT 1', [payload.client_id]);
  if (!clientRows[0]) throw new Error('client not found');
  const tenantId = clientRows[0].tenant_id;

  const keywords = normalizeList(payload.keywords);
  const pillars = normalizeList(payload.pillars);
  const currentProfile = clientRows[0].profile || {};
  const nextProfile = { ...currentProfile, keywords, pillars };
  await db.query('UPDATE clients SET profile=$3::jsonb, updated_at=NOW() WHERE id=$1 AND tenant_id=$2', [payload.client_id, tenantId, JSON.stringify(nextProfile)]);

  let created = 0;
  let updated = 0;

  for (const category of payload.categories || []) {
    const categoryName = category.name || 'General';
    for (const source of category.sources || []) {
      const mappedType = mapSourceType(source.type);
      const url = mappedType === 'RSS' && source.rss ? source.rss : source.url;
      const tags = normalizeList(source.tags);
      const categories = normalizeList([categoryName]);
      const fetchInterval = mapFrequencyToMinutes(source.frequency);

      const { rows } = await db.query(
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
        RETURNING (xmax = 0) AS inserted
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

      if (rows[0]?.inserted) created += 1; else updated += 1;
    }
  }

  console.log(`Radar sources imported for ${payload.client_id}: ${created} inserted, ${updated} updated.`);

  await db.end();
})();
