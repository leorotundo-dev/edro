const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const dir = process.argv[2] || '/tmp/radar-urls-cs-infra-completo';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));

function mapSourceType(value) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'rss') return 'RSS';
  if (normalized === 'scrape') return 'URL';
  return normalized ? normalized.toUpperCase() : 'OTHER';
}

function pickUrl(source) {
  const mappedType = mapSourceType(source.type);
  const url = mappedType === 'RSS' && source.rss ? source.rss : source.url;
  return String(url || '').trim();
}

function collectSources(payload, file) {
  const collected = [];
  const clientId = payload.client_id || null;
  const clientName = payload.client || payload.client_id || file;

  const hasCategoryObjects = Array.isArray(payload.categories) && payload.categories.some((c) => c && typeof c === 'object' && Array.isArray(c.sources));
  if (hasCategoryObjects) {
    for (const category of payload.categories || []) {
      for (const source of category.sources || []) {
        const url = pickUrl(source);
        if (!url) continue;
        collected.push({
          file,
          client_id: clientId,
          client: clientName,
          category: category.name || 'General',
          name: source.name || url,
          type: mapSourceType(source.type),
          url,
        });
      }
    }
  } else if (Array.isArray(payload.sources)) {
    for (const source of payload.sources) {
      const url = pickUrl(source);
      if (!url) continue;
      collected.push({
        file,
        client_id: clientId,
        client: clientName,
        category: 'General',
        name: source.name || url,
        type: mapSourceType(source.type),
        url,
      });
    }
  }

  return collected;
}

(async () => {
  const payloads = files.map((file) => {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    return { file, data: JSON.parse(raw) };
  });

  let sources = [];
  for (const { file, data } of payloads) {
    sources = sources.concat(collectSources(data, file));
  }

  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  const { rows: allClients } = await db.query('SELECT id, tenant_id, name FROM clients');
  const clientByName = new Map(allClients.map((row) => [String(row.name || '').toLowerCase(), row]));
  const clientById = new Map(allClients.map((row) => [row.id, row]));

  for (const src of sources) {
    if (!src.client_id && src.client) {
      const match = clientByName.get(String(src.client).toLowerCase());
      if (match) src.client_id = match.id;
    }
  }

  const clientIds = Array.from(new Set(sources.map((s) => s.client_id).filter(Boolean)));
  const tenantByClient = new Map(clientIds.map((id) => [id, clientById.get(id)?.tenant_id]));

  const tenantUrls = new Map();
  for (const source of sources) {
    const tenantId = tenantByClient.get(source.client_id);
    if (!tenantId) continue;
    if (!tenantUrls.has(tenantId)) tenantUrls.set(tenantId, new Set());
    tenantUrls.get(tenantId).add(source.url);
  }

  const existingByTenant = new Map();
  for (const [tenantId, urlSet] of tenantUrls.entries()) {
    const urlList = Array.from(urlSet);
    const existing = new Map();
    const chunkSize = 400;
    for (let i = 0; i < urlList.length; i += chunkSize) {
      const chunk = urlList.slice(i, i + chunkSize);
      const { rows } = await db.query(
        'SELECT url, client_id, name, type, tenant_id FROM clipping_sources WHERE tenant_id=$1 AND url = ANY($2)',
        [tenantId, chunk]
      );
      rows.forEach((row) => existing.set(row.url, row));
    }
    existingByTenant.set(tenantId, existing);
  }

  const unknownUrls = Array.from(new Set(
    sources.filter((s) => !tenantByClient.get(s.client_id)).map((s) => s.url)
  ));
  const existingGlobal = new Map();
  if (unknownUrls.length) {
    const chunkSize = 400;
    for (let i = 0; i < unknownUrls.length; i += chunkSize) {
      const chunk = unknownUrls.slice(i, i + chunkSize);
      const { rows } = await db.query(
        'SELECT url, client_id, name, type, tenant_id FROM clipping_sources WHERE url = ANY($1)',
        [chunk]
      );
      rows.forEach((row) => existingGlobal.set(row.url, row));
    }
  }

  const results = sources.map((source) => {
    const tenantId = tenantByClient.get(source.client_id);
    if (tenantId) {
      const existing = existingByTenant.get(tenantId)?.get(source.url) || null;
      return { ...source, status: existing ? 'found' : 'missing', existing };
    }
    const existing = existingGlobal.get(source.url) || null;
    return { ...source, status: existing ? 'found_any' : 'missing', existing };
  });

  const total = results.length;
  const uniqueUrls = new Set(results.map((r) => r.url)).size;
  const found = results.filter((r) => r.status === 'found');
  const foundAny = results.filter((r) => r.status === 'found_any');
  const missing = results.filter((r) => r.status === 'missing');

  const byClient = new Map();
  for (const row of results) {
    const key = row.client_id ? row.client_id : `name:${row.client}`;
    if (!byClient.has(key)) {
      const name = row.client_id && clientById.get(row.client_id)?.name ? clientById.get(row.client_id).name : row.client || key;
      byClient.set(key, { name, total: 0, found: 0, foundAny: 0, missing: 0 });
    }
    const bucket = byClient.get(key);
    bucket.total += 1;
    if (row.status === 'found') bucket.found += 1;
    else if (row.status === 'found_any') bucket.foundAny += 1;
    else bucket.missing += 1;
  }

  console.log('Radar sources check');
  console.log(`Files: ${files.length}`);
  console.log(`Sources: ${total}`);
  console.log(`Unique URLs: ${uniqueUrls}`);
  console.log(`Found (tenant matched): ${found.length}`);
  console.log(`Found (any tenant): ${foundAny.length}`);
  console.log(`Missing: ${missing.length}`);
  console.log('');
  console.log('By client:');
  for (const [clientId, info] of Array.from(byClient.entries()).sort()) {
    console.log(`- ${clientId} (${info.name}): ${info.found}/${info.total} found, ${info.foundAny} found-any, ${info.missing} missing`);
  }

  fs.writeFileSync('/tmp/radar-check.json', JSON.stringify(results, null, 2));
  console.log('\nFull report: /tmp/radar-check.json');

  await db.end();
})();
