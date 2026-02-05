import crypto from 'crypto';
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
  data_comemorativa: ['sazonalidade'],
  politico_civico: ['oficial'],
  saude: ['causa_social'],
};

const SEGMENT_CODE_MAP: Record<string, string> = {
  agropecuario: 'agronegocio_logistica_graos',
  agronegocio: 'agronegocio_logistica_graos',
  tecnologia: 'tecnologia_saas_b2b',
  saude: 'saude',
  industria: 'industria_manufatura',
  manufatura: 'industria_manufatura',
  construcao: 'construcao_civil_b2b',
  automotivo: 'automotivo',
  logistica: 'logistica_transporte',
  educacao: 'educacao',
  varejo: 'varejo_supermercado',
  atacado: 'varejo_atacado_cashcarry',
  ecommerce: 'varejo_ecommerce',
  moda: 'varejo_moda',
  beleza: 'varejo_farmacia_saude',
  alimentos: 'alimentacao_foodservice',
  alimenticio: 'alimentacao_foodservice',
  financeiro: 'banco_fintech',
  fintech: 'banco_fintech',
  seguros: 'seguros',
  pagamentos: 'meios_pagamento',
  mobilidade: 'mobilidade_urbana',
  rodovias: 'rodovias_concessao',
  concessoes: 'concessoes_ppp',
  metal_mecanica: 'industria_manufatura',
  meio_ambiente: 'industria_manufatura',
  laboratorios: 'saude',
  mineracao: 'industria_manufatura',
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

function parseBoolean(value?: string) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ['true', '1', 'sim', 'yes', 'y'].includes(normalized);
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

function normalizeScopeFromCalendar(
  abrangencia?: string | null,
  territory?: string | null,
  city?: string | null,
  uf?: string | null,
  country?: string
) {
  const normalized = (abrangencia || '').trim().toLowerCase();
  if (normalized) {
    if (['national', 'nacional'].includes(normalized)) return 'BR';
    if (['municipal', 'city', 'cidade'].includes(normalized)) return 'CITY';
    if (['mundial', 'global', 'world', 'international'].includes(normalized)) return 'global';
    if (['state', 'uf', 'estado'].includes(normalized)) return 'UF';
  }
  if (territory && /^[a-z]{2}$/i.test(territory.trim())) return 'UF';
  return country || 'BR';
}

function normalizeImpactLevel(value?: string) {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  if (!raw) return null;
  if (raw === 'pico') return 'peak';
  if (raw === 'peak') return 'peak';
  if (raw === 'medio' || raw === 'médio') return 'medio';
  if (raw === 'alto') return 'alto';
  if (raw === 'pre') return 'pre';
  if (raw === 'post') return 'post';
  return raw;
}

function normalizePlatform(value: string) {
  const key = value.toLowerCase().trim();
  return PLATFORM_ALIASES[key] || null;
}

function normalizeSegmentKey(value?: string) {
  if (!value) return '';
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildSegmentBoosts(segmentLabel?: string | null, extraTags: string[] = []) {
  const boosts: Record<string, number> = {};
  const addBoost = (label?: string | null) => {
    const normalized = normalizeSegmentKey(label || '');
    if (!normalized) return;
    boosts[normalized] = Math.max(boosts[normalized] ?? 0, 18);
    const mapped = SEGMENT_CODE_MAP[normalized];
    if (mapped) boosts[mapped] = Math.max(boosts[mapped] ?? 0, 28);
  };

  addBoost(segmentLabel);
  extraTags.forEach((tag) => addBoost(tag));
  return boosts;
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
  const typeKey = (eventType || '').toLowerCase().trim();
  const mapped = EVENT_TYPE_CATEGORY[typeKey];
  const isFairLike = /feira|congresso|expo|exposicao|simp[oó]sio/.test(typeKey);
  const merged = mapped ? [...mapped, ...lower] : lower;
  if (isFairLike) merged.push('setorial');
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
    const name = getField(row, ['evento', 'event_name', 'name', 'nome', 'titulo', 'title'])?.trim();

    if (!name || !dateIso) {
      errors.push({ row: idx + 2, error: 'missing_name_or_date' });
      return;
    }

    const eventType = getField(row, ['event_type', 'tipo', 'tipo_evento'])?.trim();
    const segmentLabel = getField(row, ['segmento', 'segment', 'segmento_principal'])?.trim();
    const baseTags = splitValues(getField(row, ['segment_tags', 'segments', 'tags', 'tag']));
    const editorialTags = splitValues(getField(row, ['tags_editoriais', 'tags_editorial']));
    const segmentTags = Array.from(new Set([...baseTags, ...editorialTags]));
    if (segmentLabel) {
      segmentTags.push(segmentLabel);
      const normalizedSegment = normalizeSegmentKey(segmentLabel);
      if (normalizedSegment) segmentTags.push(normalizedSegment);
    }
    const territoryRaw = getField(row, ['territorio'])?.trim();
    let country = options.defaults?.country || 'BR';
    let uf = getField(row, ['state', 'uf', 'estado'])?.trim() || null;
    if (territoryRaw) {
      const territory = territoryRaw.trim().toUpperCase();
      if (territory === 'BR' || territory === 'BRA' || territory === 'BRASIL') {
        country = 'BR';
      } else if (/^[A-Z]{2}$/.test(territory)) {
        country = 'BR';
        uf = territory;
      } else {
        country = territory;
      }
    }
    const city = getField(row, ['city', 'cidade'])?.trim() || null;
    const recurrence = getField(row, ['periodicidade', 'recurrence', 'recorrencia'])?.trim() || null;
    const priorityRaw = parseNumber(
      getField(row, ['score_relevancia', 'priority_0_100', 'priority', 'peso', 'score', 'base_priority']),
      60,
    );
    const priority = clamp(priorityRaw <= 10 ? priorityRaw * 10 : priorityRaw, 0, 100);
    const riskWeight = clamp(
      parseNumber(getField(row, ['risk_weight_0_100', 'risk_weight', 'risk']), 50),
      0,
      100,
    );
    const windowKey = getField(row, ['janela_ativacao', 'window_key'])?.trim() || null;
    const windowPhase = getField(row, ['momento_no_ano', 'window_phase'])?.trim() || null;
    const abrangencia = getField(row, ['abrangencia'])?.trim() || null;
    const localityScope = abrangencia || getField(row, ['locality_scope', 'scope'])?.trim() || null;
    const contentAngles = splitValues(
      getField(row, ['abordagem_editorial', 'content_angles', 'angles', 'angulos'])
    );
    const defaultCta = getField(row, ['cta_sugerido', 'default_cta', 'cta'])?.trim() || null;
    const platformFit = parsePlatformFit(
      getField(row, ['canais_sugeridos', 'platform_fit', 'platforms', 'plataformas'])
    );
    const formatosSugeridos = splitValues(
      getField(row, ['formato_sugerido', 'formatos_sugeridos', 'format_suggestions'])
    );
    const notes = getField(row, ['notes', 'nota', 'observacao'])?.trim() || null;
    const sourceHint = getField(row, ['source_hint', 'fonte'])?.trim() || null;
    const scoreEditorialRaw = getField(row, ['score_editorial']);
    const scoreEditorial = scoreEditorialRaw
      ? clamp(parseNumber(scoreEditorialRaw, 0), 0, 100)
      : null;
    const impactLevel = normalizeImpactLevel(getField(row, ['nivel_impacto', 'impact_level']));
    const eventKeyRaw = getField(row, ['evento_key', 'event_key', 'slug'])?.trim();
    const eventCode = getField(row, ['codigo_evento', 'event_code'])?.trim() || null;
    const isOfficial = parseBoolean(getField(row, ['oficial']));
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
    if (isOfficial && !categories.includes('oficial')) {
      categories.push('oficial');
    }

    const slug = eventKeyRaw ? slugify(eventKeyRaw) : slugify(name);
    const hasCalendarScope = Boolean(abrangencia || territoryRaw);
    const scope = hasCalendarScope
      ? (normalizeScopeFromCalendar(localityScope, territoryRaw || null, city, uf, country) as Scope)
      : (normalizeScope(localityScope, country, uf, city) as Scope);
    const key = `${sourceLabel}|${dateIso}|${name}|${scope}|${uf || ''}|${city || ''}`;
    const id =
      getField(row, ['id'])?.trim() ||
      (eventCode ? `calendar_${eventCode}_${dateIso}` : hashId('calendar', key));

    events.push({
      id,
      name,
      slug,
      evento_key: eventKeyRaw || null,
      codigo_evento: eventCode,
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
      tags: Array.from(new Set(segmentTags.map((tag) => tag.toLowerCase().trim()))).filter(Boolean),
      base_relevance: priority,
      risk_weight: riskWeight,
      window_key: windowKey,
      window_phase: windowPhase,
      locality_scope: localityScope,
      content_angles: contentAngles,
      default_cta: defaultCta,
      platform_fit: platformFit,
      formatos_sugeridos: formatosSugeridos.length ? formatosSugeridos : null,
      notes,
      source_hint: sourceHint,
      impact_level: impactLevel,
      score_editorial: scoreEditorial,
      segment_boosts: buildSegmentBoosts(segmentLabel, segmentTags),
      platform_affinity: {},
      avoid_segments: [],
      is_trend_sensitive: true,
      source: sourceLabel,
    });
  });

  return { events, errors };
}
