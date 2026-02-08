const fs = require('fs');
const path = require('path');

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

function normalizeList(values) {
  if (!values?.length) return [];
  const set = new Set();
  values.forEach((value) => {
    const trimmed = String(value || '').trim();
    if (trimmed) set.add(trimmed);
  });
  return Array.from(set);
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

function normalizePayload(payload, filePath) {
  const fileBase = path.basename(filePath, '.json');
  const fileSlug = slugify(fileBase.replace(/^radar-urls-/, '')) || slugify(fileBase);
  const clientName = payload.client_name || payload.client || payload.clientName || payload.name || fileBase;
  const clientId = payload.client_id || fileSlug;

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
    client: clientName,
    client_id: clientId,
    description: payload.description || payload.client_area || '',
    categories: normalizedCategories,
    keywords: normalizeList(payload.keywords || []),
    pillars: normalizeList(payload.pillars || []),
  };
}

const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node _temp_normalize_radar_file.js <file>');
  process.exit(1);
}
const raw = fs.readFileSync(filePath, 'utf8');
const payload = JSON.parse(raw);
const normalized = normalizePayload(payload, filePath);
process.stdout.write(JSON.stringify(normalized, null, 2));
