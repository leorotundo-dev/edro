import crypto from 'crypto';
import { parse } from 'csv-parse/sync';
import type { CalendarEvent, CalendarCategory, Scope, Platform } from './calendarTotal';

type CsvRow = Record<string, string>;

type ParseOptions = {
  sourceLabel?: string;
  sourceUrl?: string;
  defaults?: {
    country?: string;
    scope?: Scope;
    category?: CalendarCategory;
  };
};

type ParseResult = {
  events: CalendarEvent[];
  errors: Array<{ row: number; error: string; detail?: string }>;
};

const PLATFORM_ALIASES: Record<string, Platform> = {
  instagram: 'Instagram',
  ig: 'Instagram',
  tiktok: 'TikTok',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  x: 'X',
  twitter: 'X',
  pinterest: 'Pinterest',
  metaads: 'MetaAds',
  meta_ads: 'MetaAds',
  facebook: 'MetaAds',
  googleads: 'GoogleAds',
  google_ads: 'GoogleAds',
  emailmarketing: 'EmailMarketing',
  email: 'EmailMarketing',
  'email marketing': 'EmailMarketing',
  'email mkt': 'EmailMarketing',
};

const EVENT_TYPE_CATEGORY: Record<string, CalendarCategory[]> = {
  official: ['oficial'],
  retail: ['comercial'],
  cultural: ['cultural'],
  international: ['cultural'],
  seasonal: ['sazonalidade'],
  behavior: ['sazonalidade'],
  industry: ['setorial'],
  regional: ['local'],
};

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 80);
}

function hashId(source: string, key: string) {
  return `${source}_${crypto.createHash('sha256').update(key).digest('hex').slice(0, 24)}`;
}

function detectDelimiter(text: string) {
  const line = text.split(/\r?\n/).find((row) => row.trim().length) || '';
  const commas = (line.match(/,/g) || []).length;
  const semis = (line.match(/;/g) || []).length;
  return semis > commas ? ';' : ',';
}

function getField(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const found = Object.keys(row).find((k) => k.toLowerCase().trim() === key);
    if (found) return row[found];
  }
  return undefined;
}

function splitValues(value?: string, delimiter = /[|,]/) {
  if (!value) return [];
  return value
    .split(delimiter)
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseNumber(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value.replace(',', '.'));
  return Number.isNaN(parsed) ? fallback : parsed;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function normalizeDate(value?: string) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts.map((part) => part.padStart(2, '0'));
      if (year && month && day) return `${year}-${month}-${day}`;
    }
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return trimmed;
}

function normalizeScope(input?: string, country?: string, uf?: string | null, city?: string | null) {
  const normalized = (input || '').toLowerCase().trim();
  if (normalized === 'city' || normalized === 'cidade') return 'CITY';
  if (normalized === 'state' || normalized === 'uf' || normalized === 'estado') return 'UF';
  if (normalized === 'global') return 'global';
  if (normalized === 'national' || normalized === 'nacional') return country || 'BR';
  if (normalized === 'br') return 'BR';
  if (city) return 'CITY';
  if (uf) return 'UF';
  return country || 'BR';
}

function normalizePlatform(value: string) {
  const key = value.toLowerCase().trim();
  return PLATFORM_ALIASES[key] || null;
}

function parsePlatformFit(value?: string): Platform[] {
  if (!value) return [];
  const parts = splitValues(value, /[|,]/);
  const mapped = parts
    .map((part) => normalizePlatform(part))
    .filter((platform): platform is Platform => Boolean(platform));
  return Array.from(new Set(mapped));
}

function normalizeCategories(eventType?: string, rawCategories?: string): CalendarCategory[] {
  const categories = rawCategories ? splitValues(rawCategories) : [];
  const lower = categories.map((category) => category.toLowerCase().trim());
  const mapped = EVENT_TYPE_CATEGORY[(eventType || '').toLowerCase()];
  const merged = mapped ? [...mapped, ...lower] : lower;
  const unique = Array.from(new Set(merged)).filter(Boolean);
  return unique as CalendarCategory[];
}

export function parseCalendarCsv(csvText: string, options: ParseOptions = {}): ParseResult {
  const delimiter = detectDelimiter(csvText);
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
    delimiter,
    relax_column_count: true,
  }) as CsvRow[];

  const events: CalendarEvent[] = [];
  const errors: Array<{ row: number; error: string; detail?: string }> = [];

  const sourceLabel = options.sourceLabel || 'calendar_csv';

  records.forEach((row, idx) => {
    const dateIso =
      normalizeDate(getField(row, ['date_iso', 'date', 'data', 'dia'])) ||
      normalizeDate(getField(row, ['start_date', 'data_inicio']));
    const name = getField(row, ['event_name', 'name', 'nome', 'titulo', 'title'])?.trim();

    if (!name || !dateIso) {
      errors.push({ row: idx + 2, error: 'missing_name_or_date' });
      return;
    }

    const eventType = getField(row, ['event_type', 'tipo', 'tipo_evento'])?.trim();
    const segmentTags = splitValues(getField(row, ['segment_tags', 'segments', 'tags', 'tag']));
    const country = getField(row, ['country', 'pais'])?.trim() || options.defaults?.country || 'BR';
    const uf = getField(row, ['state', 'uf', 'estado'])?.trim() || null;
    const city = getField(row, ['city', 'cidade'])?.trim() || null;
    const recurrence = getField(row, ['recurrence', 'recorrencia'])?.trim() || null;
    const priority = clamp(
      parseNumber(getField(row, ['priority_0_100', 'priority', 'peso', 'score']), 60),
      0,
      100,
    );
    const riskWeight = clamp(
      parseNumber(getField(row, ['risk_weight_0_100', 'risk_weight', 'risk']), 50),
      0,
      100,
    );
    const windowKey = getField(row, ['window_key'])?.trim() || null;
    const windowPhase = getField(row, ['window_phase'])?.trim() || null;
    const localityScope = getField(row, ['locality_scope', 'scope'])?.trim() || null;
    const contentAngles = splitValues(getField(row, ['content_angles', 'angles', 'angulos']));
    const defaultCta = getField(row, ['default_cta', 'cta'])?.trim() || null;
    const platformFit = parsePlatformFit(getField(row, ['platform_fit', 'platforms', 'plataformas']));
    const notes = getField(row, ['notes', 'nota', 'observacao'])?.trim() || null;
    const sourceHint = getField(row, ['source_hint', 'fonte'])?.trim() || null;
    const dateType =
      getField(row, ['date_type', 'tipo_data'])?.trim() ||
      (getField(row, ['rule']) ? 'movable_rule' : 'fixed');

    const rule = getField(row, ['rule'])?.trim() || null;
    const startDate = normalizeDate(getField(row, ['start_date', 'data_inicio']));
    const endDate = normalizeDate(getField(row, ['end_date', 'data_fim']));

    const rawCategories = getField(row, ['categories', 'category', 'categorias', 'categoria']);
    const categories = normalizeCategories(eventType, rawCategories);
    if (!categories.length && options.defaults?.category) {
      categories.push(options.defaults.category);
    }

    const slug = slugify(name);
    const scope = normalizeScope(localityScope, country, uf, city) as Scope;
    const key = `${sourceLabel}|${dateIso}|${name}|${scope}|${uf || ''}|${city || ''}`;
    const id = getField(row, ['id'])?.trim() || hashId('calendar', key);

    events.push({
      id,
      name,
      slug,
      event_type: eventType || null,
      recurrence,
      date_type: dateType as any,
      date: dateIso as any,
      rule,
      start_date: startDate as any,
      end_date: endDate as any,
      scope,
      country,
      uf,
      city,
      categories,
      tags: segmentTags,
      base_relevance: priority,
      risk_weight: riskWeight,
      window_key: windowKey,
      window_phase: windowPhase,
      locality_scope: localityScope,
      content_angles: contentAngles,
      default_cta: defaultCta,
      platform_fit: platformFit,
      notes,
      source_hint: sourceHint,
      segment_boosts: {},
      platform_affinity: {},
      avoid_segments: [],
      is_trend_sensitive: true,
      source: sourceLabel,
    });
  });

  return { events, errors };
}
