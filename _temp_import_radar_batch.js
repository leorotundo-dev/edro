const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');

const DEFAULT_CALENDAR_PROFILE = {
  enable_calendar_total: true,
  calendar_weight: 60,
  retail_mode: true,
  allow_cultural_opportunities: true,
  allow_geek_pop: true,
  allow_profession_days: true,
  restrict_sensitive_causes: false,
};

const DEFAULT_TREND_PROFILE = {
  enable_trends: false,
  trend_weight: 40,
  sources: [],
};

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .trim();
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function mapFrequencyToMinutes(value) {
  if (value === 'weekly') return 60 * 24 * 7;
  if (value === 'monthly') return 60 * 24 * 30;
  return 60 * 24;
}

function mapSourceType(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'rss') return 'RSS';
  if (normalized === 'scrape') return 'URL';
  if (normalized === 'url') return 'URL';
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

function inferSegment(name) {
  const text = normalizeText(name);
  if (text.includes('mobi') || text.includes('mobil')) return 'mobilidade';
  if (text.includes('brt')) return 'mobilidade';
  if (text.includes('porto') || text.includes('portu')) return 'portos';
  if (text.includes('rodovia')) return 'rodovias';
  if (text.includes('grao') || text.includes('agroneg')) return 'agronegocio';
  if (text.includes('ponte')) return 'infraestrutura';
  return 'infraestrutura';
}

function matchCategory(tags, categoryName) {
  if (!categoryName) return false;
  const cat = normalizeText(categoryName);
  if (!cat) return false;
  return (tags || []).some((tag) => {
    const t = normalizeText(tag);
    return t === cat || t.includes(cat) || cat.includes(t);
  });
}

function normalizePayload(payload, fileName) {
  const clientName = payload.client_name || payload.client || payload.clientName || payload.name || fileName;
  const clientId = payload.client_id || null;

  let categories = payload.categories;
  const sources = payload.sources || [];

  let categoryNames = [];
  if (Array.isArray(categories)) {
    categoryNames = categories
      .map((item) => (typeof item === 'string' ? item : item?.name))
      .filter(Boolean);
  }

  let normalizedCategories = [];

  if (Array.isArray(categories) && categories.some((item) => item && item.sources)) {
    normalizedCategories = categories.map((item) => ({
      name: item.name || 'Geral',
      sources: Array.isArray(item.sources) ? item.sources : [],
    }));
  } else if (sources.length) {
    const map = new Map();
    const fallbackName = 'Geral';
    for (const source of sources) {
      let assigned = null;
      for (const name of categoryNames) {
        if (matchCategory(source.tags, name)) {
          assigned = name;
          break;
        }
      }
      const target = assigned || fallbackName;
      if (!map.has(target)) map.set(target, []);
      map.get(target).push(source);
    }
    normalizedCategories = Array.from(map.entries()).map(([name, items]) => ({ name, sources: items }));
  }

  if (!normalizedCategories.length && sources.length) {
    normalizedCategories = [{ name: 'Geral', sources }];
  }

  return {
    clientName,
    clientId,
    keywords: normalizeList(payload.keywords || []),
    pillars: normalizeList(payload.pillars || []),
    categories: normalizedCategories,
  };
}

async function ensureClient(db, tenantId, clientId, clientName, keywords, pillars) {
  let existing = null;
  if (clientId) {
    const res = await db.query('SELECT id, tenant_id, profile FROM clients WHERE id=$1 LIMIT 1', [clientId]);
    existing = res.rows[0] || null;
  }
  if (!existing && clientName) {
    const res = await db.query('SELECT id, tenant_id, profile FROM clients WHERE LOWER(name)=LOWER($1) LIMIT 1', [clientName]);
    existing = res.rows[0] || null;
  }

  let finalId = clientId;
  let finalTenant = tenantId;

  if (existing) {
    finalId = existing.id;
    finalTenant = existing.tenant_id;
  } else {
    if (!finalId) {
      const slug = slugify(clientName || `cliente-${crypto.randomUUID().slice(0, 6)}`);
      finalId = `cli_${slug}_${crypto.randomUUID().slice(0, 6)}`;
    }

    const profile = {
      keywords,
      pillars,
      calendar_profile: DEFAULT_CALENDAR_PROFILE,
      trend_profile: DEFAULT_TREND_PROFILE,
    };

    await db.query(
      `INSERT INTO clients (
        id, name, country, uf, city, segment_primary, segment_secondary, reportei_account_id, profile, tenant_id, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,NOW())`,
      [
        finalId,
        clientName || finalId,
        'BR',
        null,
        null,
        inferSegment(clientName),
        [],
        null,
        JSON.stringify(profile),
        finalTenant,
      ]
    );
  }

  if (keywords.length || pillars.length) {
    const res = await db.query('SELECT profile FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1', [finalId, finalTenant]);
    const current = res.rows[0]?.profile || {};
    const next = {
      ...current,
      keywords: keywords.length ? keywords : current.keywords || [],
      pillars: pillars.length ? pillars : current.pillars || [],
      calendar_profile: current.calendar_profile || DEFAULT_CALENDAR_PROFILE,
      trend_profile: current.trend_profile || DEFAULT_TREND_PROFILE,
    };
    await db.query('UPDATE clients SET profile=$3::jsonb, updated_at=NOW() WHERE id=$1 AND tenant_id=$2', [
      finalId,
      finalTenant,
      JSON.stringify(next),
    ]);
  }

  return { clientId: finalId, tenantId: finalTenant };
}

async function importFile(db, tenantId, filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const payload = JSON.parse(raw);
  const normalized = normalizePayload(payload, path.basename(filePath, '.json'));

  const tenantRes = await db.query('SELECT id FROM tenants ORDER BY created_at ASC LIMIT 1');
  const baseTenant = tenantRes.rows[0]?.id;
  if (!baseTenant) throw new Error('No tenant found');

  const client = await ensureClient(db, tenantId || baseTenant, normalized.clientId, normalized.clientName, normalized.keywords, normalized.pillars);

  let inserted = 0;
  let updated = 0;

  for (const category of normalized.categories) {
    const categoryName = category.name || 'Geral';
    for (const source of category.sources || []) {
      const mappedType = mapSourceType(source.type);
      const url = mappedType === 'RSS' && source.rss ? source.rss : source.url;
      if (!url) continue;
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
          client.tenantId,
          'CLIENT',
          client.clientId,
          source.name,
          url,
          mappedType,
          tags,
          categories,
          true,
          fetchInterval,
        ]
      );

      if (rows[0]?.inserted) inserted += 1; else updated += 1;
    }
  }

  return { clientId: client.clientId, clientName: normalized.clientName, inserted, updated };
}

async function main() {
  const dir = process.argv[2];
  if (!dir) throw new Error('Usage: node _temp_import_radar_batch.js <dir>');

  const fullDir = path.resolve(process.cwd(), dir);
  const files = fs.readdirSync(fullDir).filter((file) => file.endsWith('.json'));
  if (!files.length) throw new Error('No JSON files found in directory');

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const results = [];
  for (const file of files) {
    const filePath = path.join(fullDir, file);
    console.log(`Importing ${filePath}...`);
    try {
      const res = await importFile(db, null, filePath);
      results.push(res);
      console.log(` -> ${res.clientId}: ${res.inserted} inserted, ${res.updated} updated`);
    } catch (error) {
      console.error(`Failed ${filePath}:`, error.message || error);
    }
  }

  await db.end();
  console.log('Batch import finished');
}

main().catch((error) => {
  console.error('Batch import failed:', error);
  process.exit(1);
});
