import fs from 'fs';
import path from 'path';
import type { ProductionFormat } from './types';

type RawCatalogItem = {
  production_type?: string;
  platform?: string;
  format_name?: string;
  specs?: Record<string, any>;
  outputs?: string[];
  production_cost?: {
    production_cost_brl?: {
      min?: number;
      max?: number;
    };
  };
  production_effort?: {
    estimated_hours?: number;
    complexity?: number | string;
    complexity_level?: string;
    skill_level?: string;
  };
  measurability_score?: number;
  available_metrics?: string[];
  trackable_metrics?: string[];
  ml_performance_score?: Record<string, any>;
  reusability?: {
    reusability_score?: number;
  };
  reusability_score?: number;
  market_trend?: {
    market_trend?: string;
    trend_score?: number;
  };
  target_audience?: {
    segment?: string;
    demographics?: {
      age?: string;
    };
  };
  funnel_stages?: string[];
  best_for_objectives?: string[];
  description?: string;
  notes?: string;
  [key: string]: any;
};

const PLATFORM_ALIASES: Record<string, string> = {
  twitter: 'Twitter/X',
  'twitter/x': 'Twitter/X',
  x: 'Twitter/X',
  'google ads': 'Google Display',
  'google display': 'Google Display',
  google: 'Google Display',
  'meta ads': 'Meta Audience Network',
  'meta audience': 'Meta Audience Network',
  'meta audience network': 'Meta Audience Network',
  'facebook ads': 'Facebook',
  'instagram ads': 'Instagram',
};

const PRODUCTION_TYPE_ALIASES: Record<string, string> = {
  'midia on': 'midia-on',
  'midia-on': 'midia-on',
  'midia off': 'midia-off',
  'midia-off': 'midia-off',
  eventos: 'eventos-ativacoes',
  'eventos e ativacoes': 'eventos-ativacoes',
  'eventos-ativacoes': 'eventos-ativacoes',
  'eventos_ativacoes': 'eventos-ativacoes',
};

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'pdf']);
const VIDEO_EXTS = new Set(['mp4', 'mov', 'avi', 'mpeg', 'mkv', 'webm']);

let cachedCatalog: ProductionFormat[] | null = null;

function normalizePlatform(value?: string | null) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return trimmed;
  const key = trimmed.toLowerCase();
  return PLATFORM_ALIASES[key] || trimmed;
}

function normalizeProductionType(value?: string | null) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return trimmed;
  const key = trimmed.toLowerCase();
  return PRODUCTION_TYPE_ALIASES[key] || trimmed;
}

function extractOutputs(outputs?: string[]) {
  const imageFormats: string[] = [];
  const videoFormats: string[] = [];

  (outputs || []).forEach((output) => {
    const value = String(output || '').trim();
    if (!value) return;
    const key = value.replace('.', '').toLowerCase();
    if (VIDEO_EXTS.has(key)) {
      videoFormats.push(value);
      return;
    }
    if (IMAGE_EXTS.has(key)) {
      imageFormats.push(value);
      return;
    }
    imageFormats.push(value);
  });

  return { imageFormats, videoFormats };
}

function adaptCatalogItem(raw: RawCatalogItem): ProductionFormat {
  const specs = raw.specs || {};
  const { imageFormats, videoFormats } = extractOutputs(raw.outputs);

  const minCost = raw.production_cost?.production_cost_brl?.min;
  const maxCost = raw.production_cost?.production_cost_brl?.max;
  const productionCost =
    minCost != null || maxCost != null
      ? {
          min_brl: minCost,
          max_brl: maxCost,
          currency: 'BRL',
        }
      : undefined;

  const effort = raw.production_effort || {};
  const complexityValue = effort.complexity_level ?? effort.complexity ?? effort.skill_level;
  const productionEffort =
    effort.estimated_hours != null || complexityValue != null
      ? {
          estimated_hours: effort.estimated_hours,
          complexity_level: complexityValue != null ? String(complexityValue) : undefined,
        }
      : undefined;

  const segment = raw.target_audience?.segment;
  const age = raw.target_audience?.demographics?.age;

  const targetAudience =
    segment || age
      ? {
          age_groups: age ? [String(age)] : undefined,
          segments: segment ? [String(segment)] : undefined,
        }
      : undefined;

  const dimensions =
    specs.width_px && specs.height_px
      ? {
          width: Number(specs.width_px),
          height: Number(specs.height_px),
          unit: 'px',
          aspect_ratio: specs.ratio ? String(specs.ratio) : undefined,
        }
      : undefined;

  const fileFormat =
    imageFormats.length || videoFormats.length || specs.file_max_mb
      ? {
          image_formats: imageFormats.length ? imageFormats : undefined,
          video_formats: videoFormats.length ? videoFormats : undefined,
          max_file_size: specs.file_max_mb ? `${specs.file_max_mb}MB` : undefined,
          video_duration: specs.duration_s ? `${specs.duration_s}s` : undefined,
        }
      : undefined;

  const description = raw.description || raw.notes;
  const reusabilityScore = raw.reusability_score ?? raw.reusability?.reusability_score;

  return {
    ...raw,
    production_type: normalizeProductionType(raw.production_type),
    platform: normalizePlatform(raw.platform),
    format_name: String(raw.format_name || '').trim(),
    dimensions,
    file_format: fileFormat,
    production_cost: productionCost,
    production_effort: productionEffort,
    measurability_score: raw.measurability_score,
    trackable_metrics: raw.trackable_metrics || raw.available_metrics,
    ml_performance_score: raw.ml_performance_score,
    reusability_score: reusabilityScore,
    market_trend: raw.market_trend,
    target_audience: targetAudience,
    funnel_stages: raw.funnel_stages,
    best_for_objectives: raw.best_for_objectives,
    description,
  };
}

export function loadRecommendationCatalog(): ProductionFormat[] {
  if (cachedCatalog) return cachedCatalog;
  const catalogPath = path.resolve(__dirname, '../data/productionCatalog.json');
  try {
    const raw = fs.readFileSync(catalogPath, 'utf-8');
    const items = JSON.parse(raw) as RawCatalogItem[];
    cachedCatalog = items.map(adaptCatalogItem);
  } catch (error) {
    console.error('Erro ao carregar catalogo de producao', error);
    cachedCatalog = [];
  }
  return cachedCatalog;
}

export function getRecommendationCatalogStats() {
  const catalog = loadRecommendationCatalog();
  const byType: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  catalog.forEach((item) => {
    if (item.production_type) {
      byType[item.production_type] = (byType[item.production_type] || 0) + 1;
    }
    if (item.platform) {
      byPlatform[item.platform] = (byPlatform[item.platform] || 0) + 1;
    }
  });
  return {
    total: catalog.length,
    by_type: byType,
    by_platform: byPlatform,
  };
}
