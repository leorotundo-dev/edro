import { env } from '../env';
import { generateCopy } from './ai/copyService';

/* ============================================================================
1) CORE TYPES
============================================================================ */

export type ISODate = `${number}-${string}-${string}`; // "YYYY-MM-DD"
export type YearMonth = `${number}-${string}`; // "YYYY-MM"
export type CountryCode = 'BR' | string;

export type ToneProfile = 'conservative' | 'balanced' | 'bold';
export type RiskTolerance = 'low' | 'medium' | 'high';

export type Platform =
  | 'Instagram'
  | 'TikTok'
  | 'LinkedIn'
  | 'YouTube'
  | 'X'
  | 'Pinterest'
  | 'MetaAds'
  | 'GoogleAds'
  | 'EmailMarketing';

export type Objective = 'awareness' | 'engagement' | 'conversion' | 'leads';

export type SegmentCode =
  // Retail
  | 'varejo_supermercado'
  | 'varejo_atacado_cashcarry'
  | 'varejo_ecommerce'
  | 'varejo_moda'
  | 'varejo_farmacia_saude'
  // Finance
  | 'banco_fintech'
  | 'seguros'
  | 'meios_pagamento'
  // Infra / Mobility / Logistics
  | 'mobilidade_urbana'
  | 'rodovias_concessao'
  | 'logistica_transporte'
  | 'agronegocio_logistica_graos'
  // Industry / B2B
  | 'industria_manufatura'
  | 'tecnologia_saas_b2b'
  | 'construcao_civil_b2b'
  // Real Estate
  | 'imobiliario_residencial_popular'
  | 'imobiliario_premium'
  // Public / Institutional
  | 'concessoes_ppp'
  | 'educacao'
  | 'saude'
  // Services
  | 'automotivo'
  | 'alimentacao_foodservice';

export type CalendarCategory =
  | 'oficial'
  | 'comercial'
  | 'cultural'
  | 'causa_social'
  | 'profissao'
  | 'sazonalidade'
  | 'esportivo'
  | 'geek_pop'
  | 'setorial'
  | 'local';

export type DateType = 'fixed' | 'movable_rule' | 'period';

export type Scope = 'global' | 'BR' | 'UF' | 'CITY';

export type TrendSource = 'google' | 'tiktok' | 'youtube' | 'pinterest' | 'exploding';

export type Tier = 'A' | 'B' | 'C';

export type CopyPack = {
  headline: string;
  body: string;
  cta: string;
};

export type Alternative = {
  format: string;
  copy: CopyPack;
  score: number;
  why: string;
};

export type LibrarySourceRef = {
  library_item_id: string;
  chunk_ids: string[];
  score?: number | null;
};

export type CalendarPost = {
  id: string;
  date: ISODate;
  platform: Platform;
  format: string;
  objective: Objective;
  theme: string;
  event_ids: string[];
  score: number;
  tier: Tier;
  why_this_exists: string;
  copy: CopyPack;
  alternatives: Alternative[];
  library_sources?: LibrarySourceRef[];
};

export type ClientProfile = {
  id: string;
  name: string;
  tenant_id?: string;
  country: CountryCode;
  uf?: string;
  city?: string;

  segment_primary: SegmentCode;
  segment_secondary: SegmentCode[];

  tone_profile: ToneProfile;
  risk_tolerance: RiskTolerance;

  keywords?: string[];
  pillars?: string[];
  knowledge_base?: Record<string, any>;

  calendar_profile: {
    enable_calendar_total: boolean;
    calendar_weight: number; // 0-100
    retail_mode: boolean;
    allow_cultural_opportunities: boolean;
    allow_geek_pop: boolean;
    allow_profession_days: boolean;
    restrict_sensitive_causes: boolean;
  };

  trend_profile: {
    enable_trends: boolean;
    trend_weight: number; // 0-100
    sources: TrendSource[];
  };

  platform_preferences?: Partial<
    Record<Platform, { preferredFormats?: string[]; blockedFormats?: string[] }>
  >;
};

export type CalendarOverride = {
  force_include: boolean;
  force_exclude: boolean;
  custom_priority?: number | null;
  notes?: string | null;
};

export type CalendarEvent = {
  id: string;
  name: string;
  slug: string;

  event_type?: string | null;
  recurrence?: string | null;

  date_type: DateType;

  // fixed
  date?: ISODate | null;
  // movable_rule
  rule?: string | null;
  // period
  start_date?: ISODate | null;
  end_date?: ISODate | null;

  scope: Scope;
  country?: CountryCode | null;
  uf?: string | null;
  city?: string | null;

  categories: CalendarCategory[];
  tags: string[];

  base_relevance: number; // 0-100

  risk_weight?: number | null; // 0-100 (risk/sensibilidade do evento)
  window_key?: string | null;
  window_phase?: string | null;
  locality_scope?: string | null;
  content_angles?: string[] | null;
  default_cta?: string | null;
  platform_fit?: Platform[] | null;
  notes?: string | null;
  source_hint?: string | null;

  segment_boosts: Partial<Record<SegmentCode, number>>; // 0-60
  platform_affinity: Partial<Record<Platform, number>>; // -20..+20

  avoid_segments: SegmentCode[];
  is_trend_sensitive: boolean;

  source: string;
};

export type ScoringRules = {
  id: string;
  name: string;
  tier_a_min: number;
  tier_b_min: number;

  weights: {
    base: number;
    segment: number;
    local: number;
    platform: number;
    trend: number;
    seasonality: number;
  };

  penalties: {
    saturation_2x: number;
    saturation_3x: number;
    saturation_4x: number;
    risk_block: number;
    risk_high: number;
    risk_medium: number;
  };
};

export type PlatformProfile = {
  platform: Platform;
  supportedFormats: string[];
  maxChars: Partial<Record<'headline' | 'caption' | 'body' | 'cta', number>>;
  languageStyle: string;
  bestPractices: string[];
  avoid: string[];
  defaultMix: Partial<Record<string, number>>; // format -> %
};

export type TrendSignal = {
  source: TrendSource;
  term: string;
  momentum: 'low' | 'medium' | 'high';
  stage: 'emerging' | 'growing' | 'peak' | 'cooling';
  relatedTags: string[];
  confidence: number; // 0..1
};

export type PerformanceSignal = {
  platform: Platform;
  format: string;
  themeTag?: string;
  performanceScore: number; // 0..100
  note: string;
};

/* ============================================================================
2) PLATFORM PROFILES (Fluency Layer)
============================================================================ */

export const PLATFORM_PROFILES: PlatformProfile[] = [
  {
    platform: 'Instagram',
    supportedFormats: ['Reels', 'Carrossel', 'Feed', 'Stories'],
    maxChars: { caption: 2200, headline: 125, cta: 30, body: 2200 },
    languageStyle: 'visual, humano, escaneavel; gancho no comeco; CTA leve',
    bestPractices: [
      'Gancho nos primeiros 2-3 segundos (Reels) / 1a linha (caption)',
      'Texto escaneavel (quebras, bullets)',
      '1 CTA principal',
      'Carrossel: promessa clara na capa + progressao logica',
      'Stories: interacao (enquete/caixinha) para alcance',
    ],
    avoid: ['texto longo sem quebra', 'CTA agressivo em excesso', 'jargao tecnico'],
    defaultMix: { Reels: 35, Carrossel: 30, Feed: 20, Stories: 15 },
  },
  {
    platform: 'TikTok',
    supportedFormats: ['Video', 'Carousel', 'Live'],
    maxChars: { caption: 2200, headline: 80, cta: 25, body: 2200 },
    languageStyle: 'direto, POV, ritmo rapido, humano; sem cara de anuncio',
    bestPractices: [
      'Comecar com conflito/curiosidade',
      'POV e bastidores performam',
      'Legenda curta e punchline',
      'Trend adaptada ao territorio da marca',
    ],
    avoid: ['institucional pesado', 'promocao dura', 'texto corporativo'],
    defaultMix: { Video: 70, Carousel: 20, Live: 10 },
  },
  {
    platform: 'LinkedIn',
    supportedFormats: ['Texto', 'Documento', 'Imagem', 'Video', 'Carrossel'],
    maxChars: { body: 3000, headline: 120, cta: 40 },
    languageStyle: 'profissional + humano; insight; clareza; autoridade sem soberba',
    bestPractices: [
      'Primeira linha forte',
      'Historia curta + aprendizado',
      'Dados/experiencia pratica',
      'CTA conversacional (comentarios/DM)',
    ],
    avoid: ['giria excessiva', 'meme vazio', 'emoji demais'],
    defaultMix: { Texto: 35, Documento: 25, Carrossel: 20, Video: 10, Imagem: 10 },
  },
  {
    platform: 'YouTube',
    supportedFormats: ['Shorts', 'VideoLongo', 'CommunityPost'],
    maxChars: { body: 5000, headline: 100, cta: 40 },
    languageStyle: 'didatico/entretenimento; titulos fortes; retencao manda',
    bestPractices: [
      'Shorts: hook imediato',
      'Titulo/thumbnail coerentes',
      'Estrutura em capitulos (longo)',
    ],
    avoid: ['comeco lento', 'titulo generico'],
    defaultMix: { Shorts: 60, CommunityPost: 25, VideoLongo: 15 },
  },
  {
    platform: 'X',
    supportedFormats: ['Post', 'Thread'],
    maxChars: { body: 280, headline: 0, cta: 30 },
    languageStyle: 'curto, afiado, opinativo com cuidado; timing',
    bestPractices: ['1 ideia por post', 'threads com valor real', 'ritmo e punchline'],
    avoid: ['texto longo sem estrutura'],
    defaultMix: { Post: 70, Thread: 30 },
  },
  {
    platform: 'Pinterest',
    supportedFormats: ['Pin', 'IdeaPin'],
    maxChars: { body: 500, headline: 100, cta: 25 },
    languageStyle: 'inspiracional, utilitario, busca/SEO visual',
    bestPractices: ['titulo descritivo', 'palavras-chave', 'beneficio pratico'],
    avoid: ['texto vago', 'sem utilidade'],
    defaultMix: { Pin: 70, IdeaPin: 30 },
  },
  {
    platform: 'MetaAds',
    supportedFormats: ['FeedAd', 'StoryAd', 'ReelAd', 'CarouselAd'],
    maxChars: { body: 125, headline: 40, cta: 20 },
    languageStyle: 'beneficio + prova + CTA; direto e claro',
    bestPractices: ['variacoes A/B', '1 promessa por criativo', 'oferta clara'],
    avoid: ['texto longo', 'promessa confusa'],
    defaultMix: { ReelAd: 30, CarouselAd: 30, FeedAd: 25, StoryAd: 15 },
  },
  {
    platform: 'GoogleAds',
    supportedFormats: ['RSA', 'Display'],
    maxChars: { headline: 30, body: 90, cta: 0 },
    languageStyle: 'intencao de busca; palavra-chave; clareza',
    bestPractices: ['beneficio direto', 'keyword', 'extensoes'],
    avoid: ['metafora demais', 'texto vago'],
    defaultMix: { RSA: 70, Display: 30 },
  },
  {
    platform: 'EmailMarketing',
    supportedFormats: ['Newsletter', 'Promo', 'Nurture', 'Lifecycle'],
    maxChars: { headline: 80, body: 2000, cta: 40 },
    languageStyle: 'claro, util, com objetivo; assunto direto',
    bestPractices: [
      'Assunto curto e objetivo',
      '1 CTA principal por email',
      'Hierarquia clara (titulo > beneficios > CTA)',
      'Personalizacao quando possivel',
    ],
    avoid: ['texto longo sem quebras', 'muitos CTAs', 'linguagem vaga'],
    defaultMix: { Newsletter: 35, Promo: 30, Nurture: 20, Lifecycle: 15 },
  },
];

export function getPlatformProfile(platform: Platform): PlatformProfile {
  const profile = PLATFORM_PROFILES.find((item) => item.platform === platform);
  if (!profile) throw new Error(`Missing platform profile: ${platform}`);
  return profile;
}

/* ============================================================================
3) SCORING RULES (default)
============================================================================ */

export const DEFAULT_SCORING: ScoringRules = {
  id: 'scoring_default_v1',
  name: 'default_v1',
  tier_a_min: 80,
  tier_b_min: 55,
  weights: {
    base: 1.0,
    segment: 1.0,
    local: 1.0,
    platform: 1.0,
    trend: 1.0,
    seasonality: 1.0,
  },
  penalties: {
    saturation_2x: 10,
    saturation_3x: 20,
    saturation_4x: 35,
    risk_block: 50,
    risk_high: 30,
    risk_medium: 20,
  },
};

/* ============================================================================
4) CALENDAR TOTAL - RETAIL BR SEED
============================================================================ */

export const RETAIL_BR_EVENTS: CalendarEvent[] = [
  // ---- ANCHORS ----
  {
    id: 'evt_ano_novo',
    name: 'Ano Novo',
    slug: 'ano-novo',
    date_type: 'fixed',
    date: 'YYYY-01-01' as unknown as ISODate,
    scope: 'BR',
    country: 'BR',
    categories: ['oficial', 'comercial'],
    tags: ['familia', 'celebracao', 'planejamento', 'economia'],
    base_relevance: 90,
    segment_boosts: {
      varejo_supermercado: 25,
      varejo_atacado_cashcarry: 20,
      varejo_ecommerce: 15,
    },
    platform_affinity: { Instagram: 10, TikTok: 5, LinkedIn: -5 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_volta_aulas_q1',
    name: 'Volta as Aulas (Q1)',
    slug: 'volta-as-aulas-q1',
    date_type: 'period',
    start_date: 'YYYY-01-10' as unknown as ISODate,
    end_date: 'YYYY-02-28' as unknown as ISODate,
    scope: 'BR',
    country: 'BR',
    categories: ['sazonalidade', 'comercial'],
    tags: ['material_escolar', 'familia', 'organizacao', 'economia'],
    base_relevance: 85,
    segment_boosts: {
      varejo_supermercado: 15,
      varejo_atacado_cashcarry: 20,
      varejo_ecommerce: 25,
    },
    platform_affinity: { Instagram: 10, TikTok: 5, LinkedIn: 0 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_dia_consumidor',
    name: 'Dia do Consumidor',
    slug: 'dia-do-consumidor',
    date_type: 'fixed',
    date: 'YYYY-03-15' as unknown as ISODate,
    scope: 'BR',
    country: 'BR',
    categories: ['comercial'],
    tags: ['promocao', 'economia', 'desconto', 'oportunidade'],
    base_relevance: 95,
    segment_boosts: {
      varejo_supermercado: 20,
      varejo_atacado_cashcarry: 25,
      varejo_ecommerce: 30,
      varejo_moda: 25,
    },
    platform_affinity: { Instagram: 10, TikTok: 10, LinkedIn: 0 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_pascoa',
    name: 'Pascoa',
    slug: 'pascoa',
    date_type: 'movable_rule',
    rule: 'easter',
    scope: 'BR',
    country: 'BR',
    categories: ['comercial', 'cultural', 'sazonalidade'],
    tags: ['chocolate', 'familia', 'mesa', 'presente'],
    base_relevance: 95,
    segment_boosts: {
      varejo_supermercado: 30,
      varejo_atacado_cashcarry: 20,
      varejo_ecommerce: 15,
    },
    platform_affinity: { Instagram: 10, TikTok: 5, LinkedIn: -5 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_dia_maes',
    name: 'Dia das Maes',
    slug: 'dia-das-maes',
    date_type: 'movable_rule',
    rule: 'brazil_mothers_day',
    scope: 'BR',
    country: 'BR',
    categories: ['comercial'],
    tags: ['familia', 'presente', 'emocao'],
    base_relevance: 100,
    segment_boosts: {
      varejo_supermercado: 20,
      varejo_ecommerce: 25,
      varejo_moda: 35,
      varejo_farmacia_saude: 25,
    },
    platform_affinity: { Instagram: 15, TikTok: 5, LinkedIn: 0 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_namorados',
    name: 'Dia dos Namorados (Brasil)',
    slug: 'dia-dos-namorados',
    date_type: 'fixed',
    date: 'YYYY-06-12' as unknown as ISODate,
    scope: 'BR',
    country: 'BR',
    categories: ['comercial'],
    tags: ['presente', 'romance', 'experiencia'],
    base_relevance: 90,
    segment_boosts: {
      varejo_moda: 30,
      varejo_ecommerce: 25,
      varejo_supermercado: 10,
    },
    platform_affinity: { Instagram: 15, TikTok: 10, LinkedIn: -5 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_pais',
    name: 'Dia dos Pais',
    slug: 'dia-dos-pais',
    date_type: 'movable_rule',
    rule: 'brazil_fathers_day',
    scope: 'BR',
    country: 'BR',
    categories: ['comercial'],
    tags: ['presente', 'familia'],
    base_relevance: 90,
    segment_boosts: {
      varejo_moda: 30,
      varejo_ecommerce: 25,
      varejo_supermercado: 10,
    },
    platform_affinity: { Instagram: 10, TikTok: 5, LinkedIn: 0 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_dia_cliente',
    name: 'Dia do Cliente',
    slug: 'dia-do-cliente',
    date_type: 'fixed',
    date: 'YYYY-09-15' as unknown as ISODate,
    scope: 'BR',
    country: 'BR',
    categories: ['comercial'],
    tags: ['fidelidade', 'promocao', 'agradecimento'],
    base_relevance: 85,
    segment_boosts: {
      varejo_supermercado: 20,
      varejo_atacado_cashcarry: 20,
      varejo_ecommerce: 25,
    },
    platform_affinity: { Instagram: 10, TikTok: 5, LinkedIn: 0 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_semana_brasil',
    name: 'Semana do Brasil',
    slug: 'semana-do-brasil',
    date_type: 'period',
    start_date: 'YYYY-09-01' as unknown as ISODate,
    end_date: 'YYYY-09-10' as unknown as ISODate,
    scope: 'BR',
    country: 'BR',
    categories: ['comercial'],
    tags: ['promocao', 'desconto', 'brasil'],
    base_relevance: 80,
    segment_boosts: {
      varejo_supermercado: 20,
      varejo_ecommerce: 25,
      varejo_moda: 20,
    },
    platform_affinity: { Instagram: 10, TikTok: 5, LinkedIn: 0 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_criancas',
    name: 'Dia das Criancas',
    slug: 'dia-das-criancas',
    date_type: 'fixed',
    date: 'YYYY-10-12' as unknown as ISODate,
    scope: 'BR',
    country: 'BR',
    categories: ['comercial', 'cultural'],
    tags: ['familia', 'presente', 'brinquedos'],
    base_relevance: 95,
    segment_boosts: {
      varejo_supermercado: 15,
      varejo_ecommerce: 25,
      varejo_moda: 20,
    },
    platform_affinity: { Instagram: 10, TikTok: 10, LinkedIn: -10 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_black_friday',
    name: 'Black Friday',
    slug: 'black-friday',
    date_type: 'movable_rule',
    rule: 'black_friday',
    scope: 'BR',
    country: 'BR',
    categories: ['comercial'],
    tags: ['promocao', 'desconto', 'urgencia'],
    base_relevance: 100,
    segment_boosts: {
      varejo_supermercado: 25,
      varejo_atacado_cashcarry: 20,
      varejo_ecommerce: 35,
      varejo_moda: 30,
    },
    platform_affinity: { Instagram: 10, TikTok: 10, LinkedIn: 0 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_cyber_monday',
    name: 'Cyber Monday',
    slug: 'cyber-monday',
    date_type: 'movable_rule',
    rule: 'cyber_monday',
    scope: 'BR',
    country: 'BR',
    categories: ['comercial'],
    tags: ['ecommerce', 'promocao', 'tecnologia'],
    base_relevance: 85,
    segment_boosts: {
      varejo_ecommerce: 35,
      varejo_supermercado: 10,
    },
    platform_affinity: { Instagram: 5, TikTok: 10, LinkedIn: 0 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_natal',
    name: 'Natal',
    slug: 'natal',
    date_type: 'fixed',
    date: 'YYYY-12-25' as unknown as ISODate,
    scope: 'BR',
    country: 'BR',
    categories: ['oficial', 'comercial', 'cultural'],
    tags: ['presente', 'familia', 'mesa', 'celebracao'],
    base_relevance: 100,
    segment_boosts: {
      varejo_supermercado: 35,
      varejo_atacado_cashcarry: 20,
      varejo_ecommerce: 25,
      varejo_moda: 25,
    },
    platform_affinity: { Instagram: 15, TikTok: 5, LinkedIn: 0 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },

  // ---- OPPORTUNITIES ----
  {
    id: 'evt_carnaval',
    name: 'Carnaval',
    slug: 'carnaval',
    date_type: 'movable_rule',
    rule: 'carnival',
    scope: 'BR',
    country: 'BR',
    categories: ['cultural', 'comercial', 'sazonalidade'],
    tags: ['bebidas', 'snacks', 'festa', 'verao'],
    base_relevance: 90,
    segment_boosts: {
      varejo_supermercado: 25,
      varejo_atacado_cashcarry: 20,
    },
    platform_affinity: { Instagram: 10, TikTok: 15, LinkedIn: -10 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_festas_juninas',
    name: 'Festas Juninas',
    slug: 'festas-juninas',
    date_type: 'period',
    start_date: 'YYYY-06-01' as unknown as ISODate,
    end_date: 'YYYY-06-30' as unknown as ISODate,
    scope: 'BR',
    country: 'BR',
    categories: ['cultural', 'comercial', 'sazonalidade'],
    tags: ['milho', 'doces', 'bebidas', 'decoracao'],
    base_relevance: 85,
    segment_boosts: {
      varejo_supermercado: 25,
      varejo_atacado_cashcarry: 15,
    },
    platform_affinity: { Instagram: 10, TikTok: 10, LinkedIn: -10 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_halloween',
    name: 'Halloween',
    slug: 'halloween',
    date_type: 'fixed',
    date: 'YYYY-10-31' as unknown as ISODate,
    scope: 'BR',
    country: 'BR',
    categories: ['geek_pop', 'cultural', 'comercial'],
    tags: ['fantasia', 'doces', 'decoracao'],
    base_relevance: 70,
    segment_boosts: {
      varejo_supermercado: 10,
      varejo_ecommerce: 15,
      varejo_moda: 20,
    },
    platform_affinity: { Instagram: 10, TikTok: 15, LinkedIn: -15 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },

  // ---- ALWAYS-ON SEASONAL COMMERCE PERIODS ----
  {
    id: 'evt_ferias_julho',
    name: 'Ferias Escolares (Julho)',
    slug: 'ferias-julho',
    date_type: 'period',
    start_date: 'YYYY-07-01' as unknown as ISODate,
    end_date: 'YYYY-07-31' as unknown as ISODate,
    scope: 'BR',
    country: 'BR',
    categories: ['sazonalidade'],
    tags: ['familia', 'lazer', 'rotina'],
    base_relevance: 65,
    segment_boosts: { varejo_supermercado: 15, varejo_ecommerce: 10 },
    platform_affinity: { Instagram: 5, TikTok: 10, LinkedIn: -10 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
  {
    id: 'evt_volta_aulas_q3',
    name: 'Volta as Aulas (Q3)',
    slug: 'volta-as-aulas-q3',
    date_type: 'period',
    start_date: 'YYYY-08-01' as unknown as ISODate,
    end_date: 'YYYY-08-31' as unknown as ISODate,
    scope: 'BR',
    country: 'BR',
    categories: ['sazonalidade', 'comercial'],
    tags: ['material_escolar', 'organizacao', 'economia'],
    base_relevance: 70,
    segment_boosts: {
      varejo_supermercado: 10,
      varejo_atacado_cashcarry: 15,
      varejo_ecommerce: 20,
    },
    platform_affinity: { Instagram: 5, TikTok: 5, LinkedIn: 0 },
    avoid_segments: [],
    is_trend_sensitive: true,
    source: 'edro_seed_varejo',
  },
];

/* ============================================================================
5) DATE RULES (Movable Dates)
============================================================================ */

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`;
}

function toISODate(year: number, month: number, day: number): ISODate {
  return `${year}-${pad2(month)}-${pad2(day)}` as ISODate;
}

function parseYearFromYearMonth(ym: YearMonth): number {
  const [year] = ym.split('-');
  return Number(year);
}

function replaceYYYY(dateLike: string, year: number): ISODate {
  return dateLike.replace('YYYY', String(year)) as ISODate;
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysUTC(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function nthWeekdayOfMonthUTC(
  year: number,
  month1to12: number,
  weekday0Sun: number,
  nth: number
): Date {
  const first = new Date(Date.UTC(year, month1to12 - 1, 1));
  const firstWeekday = first.getUTCDay();
  const delta = (weekday0Sun - firstWeekday + 7) % 7;
  const day = 1 + delta + (nth - 1) * 7;
  return new Date(Date.UTC(year, month1to12 - 1, day));
}

function blackFridayUTC(year: number): Date {
  return nthWeekdayOfMonthUTC(year, 11, 5, 4); // Friday=5, nth=4
}

function dateToISO(date: Date): ISODate {
  return toISODate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function resolveRule(rule: string, year: number): ISODate {
  const key = rule.trim();

  if (key === 'easter') return dateToISO(easterSunday(year));
  if (key === 'carnival') return dateToISO(addDaysUTC(easterSunday(year), -47));
  if (key === 'good_friday') return dateToISO(addDaysUTC(easterSunday(year), -2));

  if (key === 'brazil_mothers_day') {
    return dateToISO(nthWeekdayOfMonthUTC(year, 5, 0, 2));
  }
  if (key === 'brazil_fathers_day') {
    return dateToISO(nthWeekdayOfMonthUTC(year, 8, 0, 2));
  }

  if (key === 'black_friday') return dateToISO(blackFridayUTC(year));
  if (key === 'cyber_monday') return dateToISO(addDaysUTC(blackFridayUTC(year), 3));

  throw new Error(`Unknown rule: ${rule}`);
}

/* ============================================================================
6) EVENT EXPANSION (for a month)
============================================================================ */

function inMonth(dateISO: ISODate, yearMonth: YearMonth): boolean {
  return dateISO.startsWith(yearMonth);
}

function daysInMonth(year: number, month1to12: number): number {
  return new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
}

function monthFromYearMonth(ym: YearMonth): number {
  const [, month] = ym.split('-');
  return Number(month);
}

function listDatesInMonth(ym: YearMonth): ISODate[] {
  const year = parseYearFromYearMonth(ym);
  const month = monthFromYearMonth(ym);
  const dim = daysInMonth(year, month);
  const out: ISODate[] = [];
  for (let day = 1; day <= dim; day += 1) out.push(toISODate(year, month, day));
  return out;
}

export type ExpandedEventHit = {
  event: CalendarEvent;
  hitDates: ISODate[];
};

export function expandEventsForMonth(events: CalendarEvent[], ym: YearMonth): ExpandedEventHit[] {
  const year = parseYearFromYearMonth(ym);
  const month = monthFromYearMonth(ym);
  const hits: ExpandedEventHit[] = [];

  for (const ev of events) {
    if (ev.date_type === 'fixed' && ev.date) {
      const recurrence = (ev.recurrence || '').toLowerCase().trim();
      let resolved: ISODate | null = null;

      if (recurrence === 'monthly') {
        const parts = ev.date.split('-');
        const day = Number(parts[2]);
        const dim = daysInMonth(year, month);
        if (Number.isFinite(day) && day >= 1 && day <= dim) {
          resolved = toISODate(year, month, day);
        }
      } else {
        if (ev.date.includes('YYYY')) {
          resolved = replaceYYYY(ev.date, year);
        } else {
          const parts = ev.date.split('-');
          const parsedMonth = Number(parts[1]);
          const parsedDay = Number(parts[2]);
          if (Number.isFinite(parsedMonth) && Number.isFinite(parsedDay)) {
            resolved = toISODate(year, parsedMonth, parsedDay);
          } else {
            resolved = replaceYYYY(ev.date, year);
          }
        }
      }

      if (resolved && inMonth(resolved, ym)) hits.push({ event: ev, hitDates: [resolved] });
    }

    if (ev.date_type === 'movable_rule' && ev.rule) {
      const resolved = resolveRule(ev.rule, year);
      if (inMonth(resolved, ym)) hits.push({ event: ev, hitDates: [resolved] });
    }

    if (ev.date_type === 'period' && ev.start_date && ev.end_date) {
      const start = replaceYYYY(ev.start_date, year);
      const end = replaceYYYY(ev.end_date, year);
      const monthDates = listDatesInMonth(ym);
      const inside = monthDates.filter((date) => date >= start && date <= end);
      if (inside.length) hits.push({ event: ev, hitDates: inside });
    }
  }

  return hits;
}

/* ============================================================================
7) LOCALITY FILTERING
============================================================================ */

export function matchesLocality(ev: CalendarEvent, client: ClientProfile): boolean {
  if (ev.scope === 'global') return true;
  if (ev.scope === 'BR') return client.country === 'BR';

  if (ev.scope === 'UF') {
    return (
      client.country === 'BR' &&
      !!client.uf &&
      ev.uf?.toUpperCase() === client.uf.toUpperCase()
    );
  }

  if (ev.scope === 'CITY') {
    return (
      client.country === 'BR' &&
      !!client.city &&
      (ev.city || '').toLowerCase() === client.city.toLowerCase() &&
      (!ev.uf || !client.uf || ev.uf.toUpperCase() === client.uf.toUpperCase())
    );
  }

  return false;
}

function filterEventsByCalendarProfile(
  events: CalendarEvent[],
  client: ClientProfile
): CalendarEvent[] {
  if (!client.calendar_profile.enable_calendar_total) return [];
  if (!client.calendar_profile.retail_mode) return [];

  return events.filter((event) => {
    if (!client.calendar_profile.allow_cultural_opportunities && event.categories.includes('cultural')) {
      return false;
    }
    if (!client.calendar_profile.allow_geek_pop && event.categories.includes('geek_pop')) {
      return false;
    }
    if (!client.calendar_profile.allow_profession_days && event.categories.includes('profissao')) {
      return false;
    }
    if (client.calendar_profile.restrict_sensitive_causes && event.categories.includes('causa_social')) {
      return false;
    }
    return true;
  });
}

/* ============================================================================
8) RETAIL BOOSTS & CATEGORY BOOSTS
============================================================================ */

function categoryBoost(ev: CalendarEvent, client: ClientProfile): number {
  let boost = 0;
  const cats = new Set(ev.categories);

  if (cats.has('comercial')) boost += 25;
  if (cats.has('sazonalidade')) boost += 20;

  const isGastro =
    cats.has('cultural') &&
    ev.tags.some((tag) =>
      ['pizza', 'hamburguer', 'chocolate', 'cafe', 'gastronomia', 'doces'].includes(tag)
    );
  if (isGastro) boost += 15;

  if (cats.has('causa_social')) {
    boost += client.calendar_profile.restrict_sensitive_causes ? 0 : 5;
  }

  if (cats.has('profissao')) boost += 5;

  if (cats.has('geek_pop')) boost += client.calendar_profile.allow_geek_pop ? 8 : -20;

  return boost;
}

function segmentBoost(ev: CalendarEvent, client: ClientProfile): number {
  const primary = ev.segment_boosts[client.segment_primary] ?? 0;
  const secondary = client.segment_secondary.map((segment) => ev.segment_boosts[segment] ?? 0);
  const bestSecondary = secondary.length ? Math.max(...secondary) : 0;
  return primary + bestSecondary;
}

function platformAffinity(ev: CalendarEvent, platform: Platform): number {
  return ev.platform_affinity[platform] ?? 0;
}

/* ============================================================================
9) TREND + PERFORMANCE STUBS (LIVE inputs)
============================================================================ */

async function fetchTrendSignals(
  _client: ClientProfile,
  _platform: Platform,
  _ym: YearMonth
): Promise<TrendSignal[]> {
  // TODO: call Trend Aggregator API
  return [];
}

async function fetchPerformanceSignals(
  _client: ClientProfile,
  _platform: Platform
): Promise<PerformanceSignal[]> {
  // TODO: call Reportei or platform APIs
  return [];
}

function trendBoostForEvent(
  ev: CalendarEvent,
  client: ClientProfile,
  trendSignals: TrendSignal[]
): number {
  if (!client.trend_profile.enable_trends) return 0;
  if (!ev.is_trend_sensitive) return 0;

  const evTags = new Set(ev.tags);
  let matchScore = 0;

  for (const ts of trendSignals) {
    const overlap = ts.relatedTags.filter((tag) => evTags.has(tag)).length;
    if (!overlap) continue;

    const momentumBoost = ts.momentum === 'high' ? 18 : ts.momentum === 'medium' ? 10 : 5;
    const stageBoost =
      ts.stage === 'emerging' ? 12 : ts.stage === 'growing' ? 8 : ts.stage === 'peak' ? 5 : 0;
    matchScore += (momentumBoost + stageBoost) * ts.confidence;
  }

  const boosted = Math.min(30, Math.round(matchScore));
  return Math.round(boosted * (client.trend_profile.trend_weight / 100));
}

function seasonalityBoost(_ev: CalendarEvent, client: ClientProfile): number {
  return Math.round(20 * (client.calendar_profile.calendar_weight / 100));
}

/* ============================================================================
10) SATURATION & RISK PENALTIES
============================================================================ */

export type SaturationState = {
  tagCounts: Record<string, number>;
  formatCounts: Record<string, number>;
};

function saturationPenalty(ev: CalendarEvent, state: SaturationState, rules: ScoringRules): number {
  let penalty = 0;
  const tags = ev.tags;

  const maxCount = tags.reduce((max, tag) => Math.max(max, state.tagCounts[tag] ?? 0), 0);

  if (maxCount >= 4) penalty += rules.penalties.saturation_4x;
  else if (maxCount === 3) penalty += rules.penalties.saturation_3x;
  else if (maxCount === 2) penalty += rules.penalties.saturation_2x;

  return penalty;
}

function riskPenalty(ev: CalendarEvent, client: ClientProfile, rules: ScoringRules): number {
  if (ev.avoid_segments.includes(client.segment_primary)) return rules.penalties.risk_block;

  let penalty = 0;
  if (client.tone_profile === 'conservative') {
    if (ev.categories.includes('geek_pop')) penalty += rules.penalties.risk_medium;
    if (ev.categories.includes('causa_social') && client.calendar_profile.restrict_sensitive_causes) {
      penalty += rules.penalties.risk_high;
    }
  }

  if (client.risk_tolerance === 'low' && ev.categories.includes('geek_pop')) penalty += 10;

  if (ev.risk_weight != null) {
    const weight = Math.max(0, Math.min(100, ev.risk_weight));
    const base = (weight / 100) * rules.penalties.risk_high;
    const factor = client.risk_tolerance === 'low' ? 1 : client.risk_tolerance === 'medium' ? 0.6 : 0.3;
    penalty += Math.round(base * factor);
  }

  return penalty;
}

/* ============================================================================
11) SCORE EVENT FOR CLIENT + PLATFORM
============================================================================ */

export type EventScore = {
  event: CalendarEvent;
  score: number;
  tier: Tier;
  why: string;
};

function computeTier(score: number, rules: ScoringRules): Tier {
  if (score >= rules.tier_a_min) return 'A';
  if (score >= rules.tier_b_min) return 'B';
  return 'C';
}

export function scoreEvent(
  ev: CalendarEvent,
  client: ClientProfile,
  platform: Platform,
  rules: ScoringRules,
  trends: TrendSignal[],
  state: SaturationState
): EventScore {
  const base = ev.base_relevance * rules.weights.base;
  const seg = segmentBoost(ev, client) * rules.weights.segment;
  const loc = 0;
  const plat = platformAffinity(ev, platform) * rules.weights.platform;
  const cat = categoryBoost(ev, client);
  const trb = trendBoostForEvent(ev, client, trends) * rules.weights.trend;
  const seas = seasonalityBoost(ev, client) * rules.weights.seasonality;

  const sat = saturationPenalty(ev, state, rules);
  const risk = riskPenalty(ev, client, rules);

  const scoreRaw = base + seg + loc + plat + cat + trb + seas - sat - risk;
  const score = Math.max(0, Math.min(100, Math.round(scoreRaw)));

  const tier = computeTier(score, rules);

  const why = [
    `base:${ev.base_relevance}`,
    `segment:+${seg}`,
    `platform:${plat >= 0 ? '+' : ''}${plat}`,
    `category:+${cat}`,
    trb ? `trend:+${trb}` : 'trend:+0',
    `season:+${seas}`,
    sat ? `sat:-${sat}` : '',
    risk ? `risk:-${risk}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  return { event: ev, score, tier, why };
}

export function scoreEventRelevance(
  ev: CalendarEvent,
  client: ClientProfile,
  override?: CalendarOverride | null,
  rules: ScoringRules = DEFAULT_SCORING
) {
  if (override?.force_exclude) {
    return { score: 0, tier: 'C', why: 'override:exclude' };
  }

  const baseRelevance =
    override?.custom_priority != null
      ? Math.max(1, Math.min(10, override.custom_priority)) * 10
      : ev.base_relevance;

  const base = baseRelevance * rules.weights.base;
  const seg = segmentBoost(ev, client) * rules.weights.segment;
  const cat = categoryBoost(ev, client);
  const seas = seasonalityBoost(ev, client) * rules.weights.seasonality;
  const risk = riskPenalty(ev, client, rules);

  let scoreRaw = base + seg + cat + seas - risk;
  if (override?.force_include) {
    scoreRaw = Math.max(scoreRaw, rules.tier_b_min);
  }
  const score = Math.max(0, Math.min(100, Math.round(scoreRaw)));
  const tier = computeTier(score, rules);

  const why = [
    `base:${baseRelevance}`,
    `segment:+${seg}`,
    `category:+${cat}`,
    `season:+${seas}`,
    risk ? `risk:-${risk}` : '',
    override?.force_include ? 'override:include' : '',
    override?.custom_priority != null ? `override:priority:${override.custom_priority}` : '',
  ]
    .filter(Boolean)
    .join(' | ');

  return { score, tier, why };
}

/* ============================================================================
12) FORMAT MIX ENGINE (within chosen platform)
============================================================================ */

function chooseFormatMix(platform: Platform, client: ClientProfile): string[] {
  const profile = getPlatformProfile(platform);

  const pref = client.platform_preferences?.[platform];
  const preferred =
    pref?.preferredFormats?.filter((format) => profile.supportedFormats.includes(format)) ?? [];
  const blocked = new Set(pref?.blockedFormats ?? []);

  const formats = profile.supportedFormats.filter((format) => !blocked.has(format));

  const weights = profile.defaultMix;
  const weighted: string[] = [];

  for (const format of formats) {
    const weight = Math.max(0, Math.round((weights[format] ?? 10) / 5));
    for (let i = 0; i < weight; i += 1) weighted.push(format);
  }

  if (preferred.length) {
    for (const format of preferred) for (let i = 0; i < 10; i += 1) weighted.push(format);
  }

  if (!weighted.length) return formats.length ? formats : ['Post'];

  return weighted;
}

function pickFormat(weightedFormats: string[], idx: number): string {
  return weightedFormats[idx % weightedFormats.length];
}

/* ============================================================================
13) COPY GENERATION
============================================================================ */

type CopyContext = {
  client: ClientProfile;
  platform: Platform;
  format: string;
  objective: Objective;
  theme: string;
  event: CalendarEvent;
  platformProfile: PlatformProfile;
};

const normalizeList = (value: any): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item) => String(item || '').trim()).filter(Boolean);
};

function buildClientKnowledgeSummary(client: ClientProfile) {
  const knowledge = client.knowledge_base || {};
  const notes: string[] = [];

  if (knowledge.description) notes.push(`Descrição: ${knowledge.description}`);
  if (knowledge.website) notes.push(`Site: ${knowledge.website}`);
  if (knowledge.audience) notes.push(`Público-alvo: ${knowledge.audience}`);
  if (knowledge.brand_promise) notes.push(`Proposta de valor: ${knowledge.brand_promise}`);
  if (knowledge.differentiators) notes.push(`Diferenciais: ${knowledge.differentiators}`);
  if (knowledge.notes) notes.push(`Observações: ${knowledge.notes}`);

  const mustMentions = normalizeList(knowledge.must_mentions);
  const approvedTerms = normalizeList(knowledge.approved_terms);
  const hashtags = normalizeList(knowledge.hashtags);
  const forbiddenClaims = normalizeList(knowledge.forbidden_claims);

  const tags = Array.from(
    new Set([
      ...normalizeList(client.keywords),
      ...normalizeList(client.pillars),
      ...hashtags,
      ...approvedTerms,
    ])
  );

  return { notes, tags, mustMentions, approvedTerms, hashtags, forbiddenClaims };
}

function buildCalendarCopyPrompt(ctx: CopyContext): string {
  const limits = ctx.platformProfile.maxChars;
  const headlineLimit = limits.headline ?? 80;
  const bodyLimit = limits.caption ?? limits.body ?? 1000;
  const ctaLimit = limits.cta ?? 30;
  const knowledge = buildClientKnowledgeSummary(ctx.client);

  const lines = [
    'Voce e um redator senior de agencia.',
    'Crie 1 copy (headline, body, cta) para redes sociais.',
    `Cliente: ${ctx.client.name}.`,
    `Segmento: ${ctx.client.segment_primary}.`,
    `Tom de voz: ${ctx.client.tone_profile}.`,
    `Objetivo: ${ctx.objective}.`,
    `Evento: ${ctx.event.name}.`,
    `Tema: ${ctx.theme}.`,
    `Plataforma: ${ctx.platform}.`,
    `Formato: ${ctx.format}.`,
    knowledge.notes.length ? `Base do cliente:\n- ${knowledge.notes.join('\n- ')}` : '',
    knowledge.tags.length ? `Palavras-chave: ${knowledge.tags.join(', ')}.` : '',
    knowledge.mustMentions.length ? `Menções obrigatórias: ${knowledge.mustMentions.join(', ')}.` : '',
    knowledge.approvedTerms.length ? `Termos aprovados: ${knowledge.approvedTerms.join(', ')}.` : '',
    knowledge.hashtags.length ? `Hashtags oficiais: ${knowledge.hashtags.join(', ')}.` : '',
    knowledge.forbiddenClaims.length ? `Claims proibidos: ${knowledge.forbiddenClaims.join('; ')}.` : '',
    ctx.event.window_key
      ? `Janela: ${ctx.event.window_key}${ctx.event.window_phase ? ` (${ctx.event.window_phase})` : ''}.`
      : '',
    ctx.event.content_angles?.length ? `Angulos recomendados: ${ctx.event.content_angles.join('; ')}.` : '',
    ctx.event.default_cta ? `CTA sugerido: ${ctx.event.default_cta}.` : '',
    `Boas praticas: ${ctx.platformProfile.bestPractices.join('; ')}.`,
    `Evitar: ${ctx.platformProfile.avoid.join('; ')}.`,
    `Limites: headline <= ${headlineLimit}, body <= ${bodyLimit}, cta <= ${ctaLimit}.`,
    'Responda em portugues do Brasil.',
    'Formato de resposta:',
    'Headline: ...',
    'Body: ...',
    'CTA: ...',
  ];

  return lines.filter(Boolean).join('\n');
}

function buildValidationPrompt(copy: CopyPack, ctx: CopyContext): string {
  const limits = ctx.platformProfile.maxChars;
  const headlineLimit = limits.headline ?? 80;
  const bodyLimit = limits.caption ?? limits.body ?? 1000;
  const ctaLimit = limits.cta ?? 30;
  const knowledge = buildClientKnowledgeSummary(ctx.client);

  return [
    'Voce e um revisor tecnico de copy.',
    'Nao reescreva. Apenas valide, organize e pontue o texto recebido.',
    'Retorne APENAS JSON valido com a estrutura:',
    '{',
    '  \"score\": 0,',
    '  \"copy\": { \"headline\": \"...\", \"body\": \"...\", \"cta\": \"...\" },',
    '  \"notes\": [\"...\"]',
    '}',
    '',
    `Limites: headline <= ${headlineLimit}, body <= ${bodyLimit}, cta <= ${ctaLimit}.`,
    knowledge.forbiddenClaims.length ? `Claims proibidos: ${knowledge.forbiddenClaims.join('; ')}.` : '',
    knowledge.mustMentions.length ? `Menções obrigatórias: ${knowledge.mustMentions.join(', ')}.` : '',
    '',
    'COPY ORIGINAL:',
    `Headline: ${copy.headline}`,
    `Body: ${copy.body}`,
    `CTA: ${copy.cta}`,
  ].join('\n');
}

function parseJsonFromText<T = any>(text: string): T {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as T;
    }
    throw new Error('Invalid JSON response');
  }
}

async function chatgptGenerateCopy(ctx: CopyContext): Promise<CopyPack> {
  const prompt = buildCalendarCopyPrompt(ctx);
  let response = '';
  try {
    const result = await generateCopy({
      prompt,
      taskType: 'social_post',
      tier: 'creative',
      temperature: 0.6,
      maxTokens: 700,
    });
    response = result.output;
  } catch {
    response = '';
  }

  if (!response) {
    return {
      headline: ctx.theme,
      body: `Copy placeholder para ${ctx.client.name} - ${ctx.platform}/${ctx.format}. Evento: ${ctx.event.name}.`,
      cta: 'Saiba mais',
    };
  }

  const lines = response
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  const headline = lines
    .find((line) => line.toLowerCase().startsWith('headline:'))
    ?.split(':')
    .slice(1)
    .join(':')
    .trim();
  const body = lines
    .find((line) => line.toLowerCase().startsWith('body:'))
    ?.split(':')
    .slice(1)
    .join(':')
    .trim();
  const cta = lines
    .find((line) => line.toLowerCase().startsWith('cta:'))
    ?.split(':')
    .slice(1)
    .join(':')
    .trim();

  return {
    headline: headline || ctx.theme,
    body: body || response.trim(),
    cta: cta || 'Saiba mais',
  };
}

async function geminiValidateAndFormatCopy(
  copy: CopyPack,
  ctx: CopyContext
): Promise<{ copy: CopyPack; score: number; notes: string[] }> {
  const limits = ctx.platformProfile.maxChars;
  const notes: string[] = [];

  const bodyLimit = limits.caption ?? limits.body ?? 99999;
  const headlineLimit = limits.headline ?? 99999;
  const ctaLimit = limits.cta ?? 99999;

  if (copy.body.length > bodyLimit) notes.push(`Body acima do limite (${copy.body.length}/${bodyLimit}).`);
  if (copy.headline.length > headlineLimit) {
    notes.push(`Headline acima do limite (${copy.headline.length}/${headlineLimit}).`);
  }
  if (copy.cta.length > ctaLimit) notes.push(`CTA acima do limite (${copy.cta.length}/${ctaLimit}).`);

  try {
    const prompt = buildValidationPrompt(copy, ctx);
    const result = await generateCopy({
      prompt,
      taskType: 'validation',
      tier: 'fast',
      temperature: 0.2,
      maxTokens: 600,
    });
    const parsed = parseJsonFromText<{ score: number; copy: CopyPack; notes?: string[] }>(result.output);
    return {
      copy: parsed.copy || copy,
      score: typeof parsed.score === 'number' ? parsed.score : notes.length ? 70 : 85,
      notes: parsed.notes ?? notes,
    };
  } catch {
    const score = notes.length ? 70 : 85;
    return { copy, score, notes };
  }
}

/* ============================================================================
14) MONTHLY CALENDAR GENERATION
============================================================================ */

export type GenerateCalendarInput = {
  client: ClientProfile;
  platform: Platform;
  month: YearMonth;
  objective: Objective;
  postsPerWeek: number;
};

function estimatePostCount(_month: YearMonth, postsPerWeek: number): number {
  const count = Math.round(postsPerWeek * 4.3);
  return Math.max(4, Math.min(31, count));
}

function spreadDates(month: YearMonth, count: number): ISODate[] {
  const all = listDatesInMonth(month);
  const step = Math.max(1, Math.floor(all.length / count));
  const dates: ISODate[] = [];
  for (let i = 0; i < all.length && dates.length < count; i += step) {
    dates.push(all[i]);
  }
  const unique = Array.from(new Set(dates));
  while (unique.length < count) {
    unique.push(all[Math.min(all.length - 1, unique.length)]);
  }
  return unique.slice(0, count);
}

function pickThemeForEvent(ev: CalendarEvent, objective: Objective, platform: Platform): string {
  const core = ev.categories.includes('comercial')
    ? 'Oferta/Condicao'
    : ev.categories.includes('sazonalidade')
      ? 'Dica de temporada'
      : 'Conteudo leve';
  const twist =
    platform === 'LinkedIn'
      ? 'com insight'
      : platform === 'TikTok'
        ? 'no ritmo da trend'
        : 'com gancho forte';
  const obj = objective === 'conversion' ? 'para conversao' : objective;
  return `${core} ${twist} (${obj}) - ${ev.name}`;
}

export async function generateMonthlyCalendar(
  input: GenerateCalendarInput,
  rules: ScoringRules = DEFAULT_SCORING
): Promise<CalendarPost[]> {
  const { client, platform, month, objective, postsPerWeek } = input;

  const platformProfile = getPlatformProfile(platform);

  const sourceEvents = filterEventsByCalendarProfile(RETAIL_BR_EVENTS, client);
  const expanded = expandEventsForMonth(sourceEvents, month)
    .map((hit) => hit.event)
    .filter((event) => matchesLocality(event, client));

  const [trends, perf] = await Promise.all([
    fetchTrendSignals(client, platform, month),
    fetchPerformanceSignals(client, platform),
  ]);
  void perf;

  const state: SaturationState = { tagCounts: {}, formatCounts: {} };

  const scored = expanded.map((ev) => scoreEvent(ev, client, platform, rules, trends, state));
  const tierA = scored.filter((s) => s.tier === 'A').sort((a, b) => b.score - a.score);
  const tierB = scored.filter((s) => s.tier === 'B').sort((a, b) => b.score - a.score);

  const postCount = estimatePostCount(month, postsPerWeek);
  const dates = spreadDates(month, postCount);

  const weightedFormats = chooseFormatMix(platform, client);

  const pool = [...tierA, ...tierB];
  if (!pool.length) {
    return dates.map((date, idx) => ({
      id: `post_${month}_${idx}`,
      date,
      platform,
      format: pickFormat(weightedFormats, idx),
      objective,
      theme: 'Post editorial (sem evento)',
      event_ids: [],
      score: 60,
      tier: 'B',
      why_this_exists: 'Sem eventos relevantes; usando posts editoriais padrao.',
      copy: {
        headline: 'Ideia do dia',
        body: 'Conteudo editorial gerado sem data especifica.',
        cta: 'Comente',
      },
      alternatives: [],
    }));
  }

  const posts: CalendarPost[] = [];

  for (let i = 0; i < dates.length; i += 1) {
    const chosen = pool[i % pool.length];
    const ev = chosen.event;

    for (const tag of ev.tags) state.tagCounts[tag] = (state.tagCounts[tag] ?? 0) + 1;

    const format = pickFormat(weightedFormats, i);
    const theme = pickThemeForEvent(ev, objective, platform);

    const ctx: CopyContext = {
      client,
      platform,
      format,
      objective,
      theme,
      event: ev,
      platformProfile,
    };

    const rawCopy = await chatgptGenerateCopy(ctx);
    const validated = await geminiValidateAndFormatCopy(rawCopy, ctx);

    const altFormats = platformProfile.supportedFormats.filter((fmt) => fmt !== format).slice(0, 2);
    const alternatives: Alternative[] = [];

    for (const altFormat of altFormats) {
      const altCtx: CopyContext = { ...ctx, format: altFormat };
      const altRaw = await chatgptGenerateCopy(altCtx);
      const altVal = await geminiValidateAndFormatCopy(altRaw, altCtx);
      alternatives.push({
        format: altFormat,
        copy: altVal.copy,
        score: altVal.score,
        why: `Variacao de formato sugerida para ${platform}.`,
      });
    }

    posts.push({
      id: `post_${month}_${i}`,
      date: dates[i],
      platform,
      format,
      objective,
      theme,
      event_ids: [ev.id],
      score: validated.score,
      tier: chosen.tier,
      why_this_exists: chosen.why,
      copy: validated.copy,
      alternatives,
    });
  }

  return posts;
}
