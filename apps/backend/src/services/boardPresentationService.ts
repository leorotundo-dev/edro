import PptxGenJS from 'pptxgenjs';
import { query } from '../db';
import { saveFile } from '../library/storage';
import { getReporteiConnector } from '../providers/reportei/reporteiConnector';
import { generateCompletion as generateClaudeCompletion } from './ai/claudeService';

export type BoardPresentationStatus = 'draft' | 'review' | 'approved' | 'exported';

export type BoardPresentationManualInputs = {
  diretriz_da_ultima_reuniao: string;
  leitura_geral_do_mes: string;
  ponto_de_atencao_do_mes: string;
  proximos_passos_para_o_board: string;
};

export type BoardPresentationMetricBlock = {
  label: string;
  value: string;
  footnote?: string;
  tone: 'neutral' | 'positive' | 'warning';
  source: string;
  platform?: string;
};

export type BoardPresentationSlideBlock = {
  heading: string;
  bullets: string[];
  body?: string;
};

export type BoardPresentationChart = {
  type: 'line' | 'bar';
  title: string;
  categories: string[];
  series: Array<{ name: string; values: number[] }>;
  y_label?: string;
  source: string;
};

export type BoardPresentationSlide = {
  key: string;
  order: number;
  title: string;
  subtitle?: string;
  kicker?: string;
  blocks: BoardPresentationSlideBlock[];
  big_numbers: BoardPresentationMetricBlock[];
  charts: BoardPresentationChart[];
  notes?: string;
  data_sources: string[];
};

export type BoardPresentationReadiness = {
  status: 'ready' | 'blocked';
  period_month: string;
  active_platforms: Array<{
    slug: string;
    label: string;
    snapshot_period_end: string | null;
    last_reportei_snapshot_at: string | null;
  }>;
  missing_metrics: Array<{
    platform: string;
    metric: string;
    reason: string;
  }>;
  blocking_reasons: string[];
  last_reportei_snapshot_at: string | null;
  checked_at: string;
};

export type BoardPresentationSourceSnapshot = {
  client: {
    id: string;
    name: string;
    segment_primary: string | null;
    city: string | null;
    uf: string | null;
  };
  period: {
    period_month: string;
    label: string;
    start_date: string;
    end_date: string;
    closed: boolean;
  };
  readiness: BoardPresentationReadiness;
  jobs: {
    summary: {
      total: number;
      completed: number;
      overdue: number;
      in_review: number;
      production: number;
    };
    by_stage: Array<{ status: string; count: number }>;
    highlights: Array<{
      id: string;
      title: string;
      status: string;
      due_at: string | null;
      updated_at: string | null;
      platform: string | null;
    }>;
  };
  reportei: {
    platforms: BoardPresentationPlatformSummary[];
    charts: {
      followers_trend: BoardPresentationChart;
      reach_comparison: BoardPresentationChart;
      engagement_comparison: BoardPresentationChart;
    };
  };
};

export type BoardPresentationRecord = {
  id: string;
  tenant_id: string;
  client_id: string;
  period_month: string;
  status: BoardPresentationStatus;
  template_version: string;
  source_snapshot: BoardPresentationSourceSnapshot;
  manual_inputs: BoardPresentationManualInputs;
  ai_draft: BoardPresentationSlide[];
  edited_slides: BoardPresentationSlide[];
  pptx_key: string | null;
  generated_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  exported_at: string | null;
  created_at: string;
  updated_at: string;
};

type ClientRow = {
  id: string;
  tenant_id: string;
  name: string;
  segment_primary: string | null;
  city: string | null;
  uf: string | null;
};

type BriefingSummaryRow = {
  total: string;
  completed: string;
  overdue: string;
  in_review: string;
  production: string;
};

type BriefingStageRow = {
  status: string;
  count: string;
};

type BriefingHighlightRow = {
  id: string;
  title: string | null;
  status: string | null;
  due_at: string | null;
  updated_at: string | null;
  platform: string | null;
};

type SnapshotRow = {
  platform: string;
  time_window: string;
  period_start: string;
  period_end: string;
  metrics: Record<string, any>;
  synced_at: string;
};

type BoardPresentationDbRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  period_month: string;
  status: BoardPresentationStatus;
  template_version: string;
  source_snapshot: BoardPresentationSourceSnapshot;
  manual_inputs: BoardPresentationManualInputs;
  ai_draft: BoardPresentationSlide[];
  edited_slides: BoardPresentationSlide[];
  pptx_key: string | null;
  generated_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  exported_at: string | null;
  created_at: string;
  updated_at: string;
};

type BoardPresentationPlatformSummary = {
  slug: string;
  label: string;
  snapshot_period_start: string;
  snapshot_period_end: string;
  last_reportei_snapshot_at: string;
  metrics: {
    followers_total: number;
    followers_delta_abs: number;
    followers_delta_pct: number;
    visibility: {
      key: string;
      label: string;
      value: number;
    };
    engagement: {
      key: string;
      label: string;
      value: number;
    };
  };
  trend: Array<{
    period_label: string;
    followers_total: number;
    visibility_value: number;
    engagement_value: number;
  }>;
};

type PlatformDefinition = {
  slug: 'instagram_business' | 'linkedin';
  label: 'Instagram' | 'LinkedIn';
  followersKeys: string[];
  followersDeltaKeys: string[];
  visibilityKeys: Array<{ key: string; label: string }>;
  engagementKeys: Array<{ key: string; label: string }>;
};

const TEMPLATE_VERSION = 'board-v1';
const PPTX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const ORANGE = 'E85219';
const ORANGE_LIGHT = 'FFF2EB';
const GREEN = '13DEB9';
const GREEN_LIGHT = 'E8FCF8';
const BLUE = '5D87FF';
const BLUE_LIGHT = 'EEF3FF';
const YELLOW = 'FFAE1F';
const YELLOW_LIGHT = 'FFF7E6';
const DARK = '1F2937';
const MUTED = '64748B';
const BORDER = 'E2E8F0';
const WHITE = 'FFFFFF';

const MONTH_LABELS_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const PLATFORM_DEFINITIONS: Record<string, PlatformDefinition> = {
  instagram_business: {
    slug: 'instagram_business',
    label: 'Instagram',
    followersKeys: ['ig:followers_count'],
    followersDeltaKeys: ['ig:new_followers_count'],
    visibilityKeys: [
      { key: 'ig:reach', label: 'Alcance' },
      { key: 'ig:impressions', label: 'Impressões' },
    ],
    engagementKeys: [
      { key: 'ig:feed_engagement_rate', label: 'Engajamento' },
      { key: 'ig:feed_engagement', label: 'Interações' },
    ],
  },
  linkedin: {
    slug: 'linkedin',
    label: 'LinkedIn',
    followersKeys: ['li:followers_count'],
    followersDeltaKeys: [],
    visibilityKeys: [
      { key: 'li:unique_impressions', label: 'Alcance único' },
      { key: 'li:impressions', label: 'Impressões' },
    ],
    engagementKeys: [
      { key: 'li:engagement_rate', label: 'Engajamento' },
      { key: 'li:engagement', label: 'Interações' },
    ],
  },
};

const SNAPSHOT_PLATFORM_TO_SLUG: Record<string, PlatformDefinition['slug']> = {
  Instagram: 'instagram_business',
  LinkedIn: 'linkedin',
};

const EMPTY_MANUAL_INPUTS: BoardPresentationManualInputs = {
  diretriz_da_ultima_reuniao: '',
  leitura_geral_do_mes: '',
  ponto_de_atencao_do_mes: '',
  proximos_passos_para_o_board: '',
};

const FIXED_SLIDE_ORDER = [
  'capa',
  'contexto-accountability',
  'status-geral',
  'entregas-chave',
  'impacto-negocio',
  'performance-presenca-digital',
  'riscos-gargalos',
  'prioridades-proximo-mes',
  'fechamento',
] as const;

function ensureMonthShape(periodMonth: string) {
  if (!/^\d{4}-\d{2}$/.test(periodMonth)) {
    throw new Error('invalid_period_month');
  }
}

function startOfMonth(periodMonth: string) {
  ensureMonthShape(periodMonth);
  const [year, month] = periodMonth.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1));
}

function endOfMonth(periodMonth: string) {
  ensureMonthShape(periodMonth);
  const [year, month] = periodMonth.split('-').map(Number);
  return new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPreviousMonth(periodMonth: string) {
  const current = startOfMonth(periodMonth);
  current.setUTCMonth(current.getUTCMonth() - 1);
  return `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getNextMonth(periodMonth: string) {
  const current = startOfMonth(periodMonth);
  current.setUTCMonth(current.getUTCMonth() + 1);
  return `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, '0')}`;
}

function getMonthLabel(periodMonth: string) {
  const date = startOfMonth(periodMonth);
  const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
}

function isClosedMonth(periodMonth: string) {
  const selectedStart = startOfMonth(periodMonth);
  const now = new Date();
  const currentMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return selectedStart < currentMonthStart;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d,.-]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (Array.isArray(value)) {
    for (let index = value.length - 1; index >= 0; index -= 1) {
      const parsed = asNumber(value[index]);
      if (parsed !== null) return parsed;
    }
  }
  if (value && typeof value === 'object') {
    const maybeValue = (value as Record<string, unknown>).value;
    if (maybeValue !== undefined) return asNumber(maybeValue);
  }
  return null;
}

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function formatInteger(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

function formatPercent(value: number) {
  return `${value.toLocaleString('pt-BR', { minimumFractionDigits: Math.abs(value) < 10 ? 1 : 0, maximumFractionDigits: 1 })}%`;
}

function formatNumberCompact(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  }
  return formatInteger(value);
}

function trendTone(value: number): BoardPresentationMetricBlock['tone'] {
  if (value > 0) return 'positive';
  if (value < 0) return 'warning';
  return 'neutral';
}

function getToneColor(tone: BoardPresentationMetricBlock['tone']) {
  if (tone === 'positive') return GREEN;
  if (tone === 'warning') return YELLOW;
  return BLUE;
}

function getToneFill(tone: BoardPresentationMetricBlock['tone']) {
  if (tone === 'positive') return GREEN_LIGHT;
  if (tone === 'warning') return YELLOW_LIGHT;
  return BLUE_LIGHT;
}

function getMetricValue(metrics: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    const entry = metrics?.[key];
    if (!entry) continue;
    const value = asNumber(entry.value);
    if (value !== null) {
      return {
        key,
        value,
        comparison: asNumber(entry.comparison),
        delta_pct: asNumber(entry.delta_pct),
      };
    }
  }
  return null;
}

function monthShortLabel(periodEnd: string) {
  const date = new Date(`${periodEnd}T00:00:00Z`);
  return `${MONTH_LABELS_PT[date.getUTCMonth()]}/${String(date.getUTCFullYear()).slice(-2)}`;
}

function normalizeManualInputs(input?: Partial<BoardPresentationManualInputs> | null): BoardPresentationManualInputs {
  return {
    diretriz_da_ultima_reuniao: safeString(input?.diretriz_da_ultima_reuniao),
    leitura_geral_do_mes: safeString(input?.leitura_geral_do_mes),
    ponto_de_atencao_do_mes: safeString(input?.ponto_de_atencao_do_mes),
    proximos_passos_para_o_board: safeString(input?.proximos_passos_para_o_board),
  };
}

function hasRequiredManualInputs(inputs: BoardPresentationManualInputs) {
  return Object.values(inputs).every((value) => value.trim().length > 0);
}

async function resolveClient(tenantId: string, clientId: string) {
  const { rows } = await query<ClientRow>(
    `SELECT id, tenant_id, name, segment_primary, city, uf
       FROM clients
      WHERE tenant_id = $1
        AND id = $2
      LIMIT 1`,
    [tenantId, clientId],
  );
  const client = rows[0] ?? null;
  if (!client) {
    throw new Error('client_not_found');
  }
  return client;
}

async function loadMonthJobs(clientId: string, periodMonth: string) {
  const startDate = startOfMonth(periodMonth);
  const endDate = endOfMonth(periodMonth);
  const nextMonthStart = addDays(endDate, 1);

  const [
    { rows: summaryRows },
    { rows: stageRows },
    { rows: highlightRows },
  ] = await Promise.all([
    query<BriefingSummaryRow>(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status IN ('done', 'concluido', 'entregue'))::int AS completed,
         COUNT(*) FILTER (
           WHERE due_at IS NOT NULL
             AND due_at < NOW()
             AND status NOT IN ('done', 'concluido', 'entregue', 'cancelled')
         )::int AS overdue,
         COUNT(*) FILTER (WHERE status IN ('review', 'aprovacao'))::int AS in_review,
         COUNT(*) FILTER (WHERE status IN ('producao', 'in_progress', 'copy_ia', 'copy', 'briefing'))::int AS production
       FROM edro_briefings
       WHERE main_client_id = $1
         AND created_at >= $2
         AND created_at < $3`,
      [clientId, startDate.toISOString(), nextMonthStart.toISOString()],
    ),
    query<BriefingStageRow>(
      `SELECT COALESCE(status, 'sem_status') AS status, COUNT(*)::int AS count
       FROM edro_briefings
       WHERE main_client_id = $1
         AND created_at >= $2
         AND created_at < $3
       GROUP BY status
       ORDER BY count DESC`,
      [clientId, startDate.toISOString(), nextMonthStart.toISOString()],
    ),
    query<BriefingHighlightRow>(
      `SELECT
         id::text,
         title,
         status,
         due_at::text,
         updated_at::text,
         COALESCE(payload->>'platform', payload->>'channel') AS platform
       FROM edro_briefings
       WHERE main_client_id = $1
         AND created_at >= $2
         AND created_at < $3
       ORDER BY updated_at DESC
       LIMIT 12`,
      [clientId, startDate.toISOString(), nextMonthStart.toISOString()],
    ),
  ]);

  const summary = summaryRows[0] ?? {
    total: '0',
    completed: '0',
    overdue: '0',
    in_review: '0',
    production: '0',
  };

  return {
    summary: {
      total: Number(summary.total || 0),
      completed: Number(summary.completed || 0),
      overdue: Number(summary.overdue || 0),
      in_review: Number(summary.in_review || 0),
      production: Number(summary.production || 0),
    },
    by_stage: stageRows.map((row) => ({
      status: row.status || 'sem_status',
      count: Number(row.count || 0),
    })),
    highlights: highlightRows.map((row) => ({
      id: row.id,
      title: row.title || 'Sem título',
      status: row.status || 'sem_status',
      due_at: row.due_at || null,
      updated_at: row.updated_at || null,
      platform: row.platform || null,
    })),
  };
}

async function resolveActivePlatformSlugs(clientId: string, tenantId: string) {
  const connector = await getReporteiConnector(tenantId, clientId);
  const platformKeys = Object.keys(connector?.platforms || {}).filter((slug) => slug in PLATFORM_DEFINITIONS);
  if (platformKeys.length > 0) {
    return {
      activeSlugs: platformKeys as PlatformDefinition['slug'][],
      connectorPresent: Boolean(connector),
      connectorTokenPresent: Boolean(connector?.token),
      unsupportedPlatformSlugs: Object.keys(connector?.platforms || {}).filter((slug) => !(slug in PLATFORM_DEFINITIONS)),
    };
  }

  const { rows } = await query<{ platform: string }>(
    `SELECT DISTINCT platform
       FROM reportei_metric_snapshots
      WHERE client_id = $1
        AND platform IN ('Instagram', 'LinkedIn')`,
    [clientId],
  );

  return {
    activeSlugs: rows
      .map((row) => SNAPSHOT_PLATFORM_TO_SLUG[row.platform])
      .filter(Boolean) as PlatformDefinition['slug'][],
    connectorPresent: Boolean(connector),
    connectorTokenPresent: Boolean(connector?.token),
    unsupportedPlatformSlugs: [],
  };
}

async function loadPlatformSnapshots(clientId: string, platformLabel: string, periodMonth: string) {
  const monthEnd = endOfMonth(periodMonth);
  const maxPeriodEnd = addDays(monthEnd, 7);
  const minPeriodEnd = addDays(monthEnd, -40);
  const { rows } = await query<SnapshotRow>(
    `SELECT platform, time_window, period_start::text, period_end::text, metrics, synced_at::text
       FROM reportei_metric_snapshots
      WHERE client_id = $1
        AND platform = $2
        AND time_window = '30d'
        AND period_end <= $3::date
        AND period_end >= $4::date
      ORDER BY period_end DESC, synced_at DESC
      LIMIT 8`,
    [clientId, platformLabel, toIsoDate(maxPeriodEnd), toIsoDate(minPeriodEnd)],
  );
  return rows;
}

function buildPlatformSummary(definition: PlatformDefinition, snapshots: SnapshotRow[], periodMonth: string) {
  const currentSnapshot = snapshots[0];
  if (!currentSnapshot) {
    return {
      summary: null,
      missing: [
        {
          platform: definition.label,
          metric: 'Reportei snapshot',
          reason: 'Não existe snapshot 30d compatível com o mês selecionado.',
        },
      ],
      blocking: [`${definition.label}: sem snapshot Reportei do mês fechado.`],
    };
  }

  const monthEnd = endOfMonth(periodMonth);
  const snapshotEnd = new Date(`${currentSnapshot.period_end}T00:00:00Z`);
  const missing: BoardPresentationReadiness['missing_metrics'] = [];
  const blocking: string[] = [];

  const followers = getMetricValue(currentSnapshot.metrics, definition.followersKeys);
  if (!followers) {
    missing.push({
      platform: definition.label,
      metric: 'Seguidores totais',
      reason: 'followers_count ausente no snapshot do mês.',
    });
  }

  const visibility = definition.visibilityKeys
    .map((candidate) => {
      const metric = getMetricValue(currentSnapshot.metrics, [candidate.key]);
      return metric ? { metric, label: candidate.label } : null;
    })
    .find(Boolean);
  if (!visibility) {
    missing.push({
      platform: definition.label,
      metric: 'Métrica de alcance/visibilidade',
      reason: 'Nenhum indicador de alcance disponível.',
    });
  }

  const engagement = definition.engagementKeys
    .map((candidate) => {
      const metric = getMetricValue(currentSnapshot.metrics, [candidate.key]);
      return metric ? { metric, label: candidate.label } : null;
    })
    .find(Boolean);
  if (!engagement) {
    missing.push({
      platform: definition.label,
      metric: 'Métrica de engajamento/interação',
      reason: 'Nenhum indicador de engajamento disponível.',
    });
  }

  const previousSnapshot = snapshots[1] ?? null;
  const newFollowersMetric = definition.followersDeltaKeys.length
    ? getMetricValue(currentSnapshot.metrics, definition.followersDeltaKeys)
    : null;

  const previousFollowers = followers?.comparison ?? (previousSnapshot ? getMetricValue(previousSnapshot.metrics, definition.followersKeys)?.value : null);
  const followersDeltaAbs = newFollowersMetric?.value ?? (followers && previousFollowers !== null ? followers.value - previousFollowers : null);
  const followersDeltaPct = followers?.delta_pct ?? (followers && previousFollowers && previousFollowers > 0 ? ((followers.value - previousFollowers) / previousFollowers) * 100 : null);

  if (followersDeltaAbs === null || followersDeltaPct === null) {
    missing.push({
      platform: definition.label,
      metric: 'Variação de seguidores',
      reason: 'Sem base comparativa suficiente para a variação mensal.',
    });
  }

  if (snapshotEnd < addDays(monthEnd, -7)) {
    blocking.push(`${definition.label}: snapshot desatualizado para o mês selecionado.`);
  }

  const trend = snapshots
    .slice()
    .reverse()
    .map((snapshot) => {
      const followerMetric = getMetricValue(snapshot.metrics, definition.followersKeys);
      const visibilityMetric = definition.visibilityKeys
        .map((candidate) => getMetricValue(snapshot.metrics, [candidate.key]))
        .find(Boolean);
      const engagementMetric = definition.engagementKeys
        .map((candidate) => getMetricValue(snapshot.metrics, [candidate.key]))
        .find(Boolean);
      return {
        period_label: monthShortLabel(snapshot.period_end),
        followers_total: followerMetric?.value ?? 0,
        visibility_value: visibilityMetric?.value ?? 0,
        engagement_value: engagementMetric?.value ?? 0,
      };
    });

  if (missing.length > 0 || !followers || !visibility || !engagement || followersDeltaAbs === null || followersDeltaPct === null) {
    return { summary: null, missing, blocking };
  }

  const summary: BoardPresentationPlatformSummary = {
    slug: definition.slug,
    label: definition.label,
    snapshot_period_start: currentSnapshot.period_start,
    snapshot_period_end: currentSnapshot.period_end,
    last_reportei_snapshot_at: currentSnapshot.synced_at,
    metrics: {
      followers_total: followers.value,
      followers_delta_abs: followersDeltaAbs,
      followers_delta_pct: followersDeltaPct,
      visibility: {
        key: visibility.metric.key,
        label: visibility.label,
        value: visibility.metric.value,
      },
      engagement: {
        key: engagement.metric.key,
        label: engagement.label,
        value: engagement.metric.value,
      },
    },
    trend,
  };

  return { summary, missing, blocking };
}

function buildChartsFromPlatforms(platforms: BoardPresentationPlatformSummary[]): BoardPresentationSourceSnapshot['reportei']['charts'] {
  const trendCategories = Array.from(
    new Set(platforms.flatMap((platform) => platform.trend.map((point) => point.period_label))),
  );

  const followersTrend: BoardPresentationChart = {
    type: 'line',
    title: 'Evolução de seguidores',
    categories: trendCategories,
    series: platforms.map((platform) => ({
      name: platform.label,
      values: trendCategories.map((label) => platform.trend.find((point) => point.period_label === label)?.followers_total ?? 0),
    })),
    y_label: 'Seguidores',
    source: 'Reportei',
  };

  const reachComparison: BoardPresentationChart = {
    type: 'bar',
    title: 'Alcance / visibilidade por rede',
    categories: platforms.map((platform) => platform.label),
    series: [
      {
        name: 'Alcance',
        values: platforms.map((platform) => platform.metrics.visibility.value),
      },
    ],
    y_label: 'Valor',
    source: 'Reportei',
  };

  const engagementComparison: BoardPresentationChart = {
    type: 'bar',
    title: 'Engajamento por rede',
    categories: platforms.map((platform) => platform.label),
    series: [
      {
        name: 'Engajamento',
        values: platforms.map((platform) => platform.metrics.engagement.value),
      },
    ],
    y_label: 'Valor',
    source: 'Reportei',
  };

  return {
    followers_trend: followersTrend,
    reach_comparison: reachComparison,
    engagement_comparison: engagementComparison,
  };
}

export async function runBoardPresentationPreflight(params: {
  tenantId: string;
  clientId: string;
  periodMonth: string;
}): Promise<BoardPresentationReadiness> {
  const { tenantId, clientId, periodMonth } = params;
  ensureMonthShape(periodMonth);
  await resolveClient(tenantId, clientId);

  const { activeSlugs, connectorPresent, connectorTokenPresent, unsupportedPlatformSlugs } = await resolveActivePlatformSlugs(clientId, tenantId);

  const missing_metrics: BoardPresentationReadiness['missing_metrics'] = [];
  const blocking_reasons: string[] = [];
  const active_platforms: BoardPresentationReadiness['active_platforms'] = [];
  const syncedAtCandidates: string[] = [];

  if (!isClosedMonth(periodMonth)) {
    blocking_reasons.push('O mês de referência precisa estar fechado. A v1 não gera apresentações de mês corrente.');
  }
  if (!connectorPresent) {
    blocking_reasons.push('Cliente sem conector Reportei configurado.');
  } else if (!connectorTokenPresent) {
    blocking_reasons.push('Conector Reportei sem token configurado.');
  }
  if (unsupportedPlatformSlugs.length > 0) {
    blocking_reasons.push(`Plataformas sociais ainda não suportadas na v1: ${unsupportedPlatformSlugs.join(', ')}.`);
  }
  if (activeSlugs.length === 0) {
    blocking_reasons.push('Nenhuma rede social ativa com Reportei suportada foi encontrada para este cliente.');
  }

  for (const slug of activeSlugs) {
    const definition = PLATFORM_DEFINITIONS[slug];
    const snapshots = await loadPlatformSnapshots(clientId, definition.label, periodMonth);
    const currentSnapshot = snapshots[0] ?? null;
    const built = buildPlatformSummary(definition, snapshots, periodMonth);
    missing_metrics.push(...built.missing);
    blocking_reasons.push(...built.blocking);
    active_platforms.push({
      slug,
      label: definition.label,
      snapshot_period_end: currentSnapshot?.period_end ?? null,
      last_reportei_snapshot_at: currentSnapshot?.synced_at ?? null,
    });
    if (currentSnapshot?.synced_at) syncedAtCandidates.push(currentSnapshot.synced_at);
  }

  if (missing_metrics.length > 0) {
    blocking_reasons.push('Existem métricas obrigatórias ausentes no Reportei para gerar a apresentação do Board.');
  }

  const last_reportei_snapshot_at = syncedAtCandidates.sort().slice(-1)[0] ?? null;
  return {
    status: blocking_reasons.length > 0 ? 'blocked' : 'ready',
    period_month: periodMonth,
    active_platforms,
    missing_metrics,
    blocking_reasons,
    last_reportei_snapshot_at,
    checked_at: new Date().toISOString(),
  };
}

export async function buildBoardPresentationSourceSnapshot(params: {
  tenantId: string;
  clientId: string;
  periodMonth: string;
}): Promise<BoardPresentationSourceSnapshot> {
  const { tenantId, clientId, periodMonth } = params;
  const client = await resolveClient(tenantId, clientId);
  const readiness = await runBoardPresentationPreflight(params);
  const jobs = await loadMonthJobs(clientId, periodMonth);

  const platforms: BoardPresentationPlatformSummary[] = [];
  for (const activePlatform of readiness.active_platforms) {
    const definition = PLATFORM_DEFINITIONS[activePlatform.slug];
    const snapshots = await loadPlatformSnapshots(clientId, definition.label, periodMonth);
    const built = buildPlatformSummary(definition, snapshots, periodMonth);
    if (built.summary) platforms.push(built.summary);
  }

  return {
    client: {
      id: client.id,
      name: client.name,
      segment_primary: client.segment_primary,
      city: client.city,
      uf: client.uf,
    },
    period: {
      period_month: periodMonth,
      label: getMonthLabel(periodMonth),
      start_date: toIsoDate(startOfMonth(periodMonth)),
      end_date: toIsoDate(endOfMonth(periodMonth)),
      closed: isClosedMonth(periodMonth),
    },
    readiness,
    jobs,
    reportei: {
      platforms,
      charts: buildChartsFromPlatforms(platforms),
    },
  };
}

function sanitizeSlideBlocks(blocks: BoardPresentationSlideBlock[]) {
  return blocks
    .map((block) => ({
      heading: safeString(block.heading),
      body: safeString(block.body),
      bullets: Array.isArray(block.bullets)
        ? block.bullets.map((bullet) => safeString(bullet)).filter(Boolean).slice(0, 4)
        : [],
    }))
    .filter((block) => block.heading || block.body || block.bullets.length > 0)
    .slice(0, 3);
}

function fallbackBlock(heading: string, bullets: string[], body?: string): BoardPresentationSlideBlock {
  return {
    heading,
    bullets: bullets.filter(Boolean).slice(0, 4),
    body,
  };
}

function buildBaseSlides(source: BoardPresentationSourceSnapshot, manualInputs: BoardPresentationManualInputs): BoardPresentationSlide[] {
  const topPlatforms = source.reportei.platforms;
  const topPlatform = topPlatforms[0] ?? null;
  const totalVisibility = topPlatforms.reduce((sum, platform) => sum + platform.metrics.visibility.value, 0);
  const avgEngagement = topPlatforms.length > 0
    ? topPlatforms.reduce((sum, platform) => sum + platform.metrics.engagement.value, 0) / topPlatforms.length
    : 0;
  const totalFollowers = topPlatforms.reduce((sum, platform) => sum + platform.metrics.followers_total, 0);
  const totalFollowerDelta = topPlatforms.reduce((sum, platform) => sum + platform.metrics.followers_delta_abs, 0);
  const totalFollowerDeltaPct = topPlatforms.length > 0
    ? topPlatforms.reduce((sum, platform) => sum + platform.metrics.followers_delta_pct, 0) / topPlatforms.length
    : 0;

  const topJobs = source.jobs.highlights.slice(0, 4);
  const topJobBullets = topJobs.map((job) => `${job.title} (${job.status || 'sem status'})`);
  const stageSummary = source.jobs.by_stage.slice(0, 4).map((item) => `${item.status}: ${item.count}`);
  const nextMonthLabel = getMonthLabel(getNextMonth(source.period.period_month));

  return [
    {
      key: 'capa',
      order: 1,
      kicker: 'Board presentation',
      title: `${source.client.name} · ${source.period.label}`,
      subtitle: 'Relatório Gerencial de Comunicação',
      blocks: [
        fallbackBlock('Escopo', [
          'Prestação de contas executiva da área de Comunicação.',
          `Mês fechado de referência: ${source.period.label}.`,
        ]),
      ],
      big_numbers: [
        { label: 'Entregas no mês', value: formatInteger(source.jobs.summary.total), tone: 'neutral', source: 'Edro' },
        { label: 'Seguidores totais', value: formatInteger(totalFollowers), tone: trendTone(totalFollowerDelta), source: 'Reportei' },
      ],
      charts: [],
      data_sources: ['Edro', 'Reportei'],
    },
    {
      key: 'contexto-accountability',
      order: 2,
      kicker: 'Slide 2',
      title: 'Contexto Executivo e Accountability',
      subtitle: 'O que foi assumido e como o mês foi conduzido.',
      blocks: [
        fallbackBlock('Diretriz da última reunião', [manualInputs.diretriz_da_ultima_reuniao]),
        fallbackBlock('Leitura geral do mês', [manualInputs.leitura_geral_do_mes]),
      ],
      big_numbers: [],
      charts: [],
      data_sources: ['Inputs manuais'],
    },
    {
      key: 'status-geral',
      order: 3,
      kicker: 'Slide 3',
      title: 'Status Geral do Mês',
      subtitle: 'Visão consolidada do fluxo e do volume entregue.',
      blocks: [
        fallbackBlock('Leituras principais', stageSummary.length ? stageSummary : ['Sem volume relevante no mês.']),
        fallbackBlock('Ponto de atenção', [manualInputs.ponto_de_atencao_do_mes]),
      ],
      big_numbers: [
        { label: 'Demandas do mês', value: formatInteger(source.jobs.summary.total), tone: 'neutral', source: 'Edro' },
        { label: 'Concluídas', value: formatInteger(source.jobs.summary.completed), tone: 'positive', source: 'Edro' },
        { label: 'Em aprovação', value: formatInteger(source.jobs.summary.in_review), tone: source.jobs.summary.in_review > 0 ? 'warning' : 'neutral', source: 'Edro' },
      ],
      charts: [],
      data_sources: ['Edro'],
    },
    {
      key: 'entregas-chave',
      order: 4,
      kicker: 'Slide 4',
      title: 'Entregas-Chave',
      subtitle: 'O que efetivamente foi produzido no período.',
      blocks: [
        fallbackBlock('Frentes do mês', topJobBullets.length ? topJobBullets : ['Sem entregas relevantes registradas no mês.']),
      ],
      big_numbers: [],
      charts: [],
      data_sources: ['Edro'],
    },
    {
      key: 'impacto-negocio',
      order: 5,
      kicker: 'Slide 5',
      title: 'Impacto no Negócio',
      subtitle: 'O que a operação de comunicação habilitou em visibilidade e presença.',
      blocks: [
        fallbackBlock('Leitura de impacto', [
          totalVisibility > 0
            ? `A operação gerou ${formatNumberCompact(totalVisibility)} em visibilidade agregada nas redes monitoradas.`
            : 'Dado insuficiente para leitura de visibilidade do período.',
          totalFollowerDelta !== 0
            ? `A base acompanhada evoluiu em ${formatInteger(totalFollowerDelta)} seguidores no período.`
            : 'Sem variação relevante de base no período.',
        ]),
      ],
      big_numbers: [
        { label: 'Visibilidade agregada', value: formatNumberCompact(totalVisibility), tone: totalVisibility > 0 ? 'positive' : 'neutral', source: 'Reportei' },
        { label: 'Delta de seguidores', value: `${totalFollowerDelta >= 0 ? '+' : ''}${formatInteger(totalFollowerDelta)}`, tone: trendTone(totalFollowerDelta), source: 'Reportei' },
        { label: 'Variação média', value: `${totalFollowerDeltaPct >= 0 ? '+' : ''}${formatPercent(totalFollowerDeltaPct)}`, tone: trendTone(totalFollowerDeltaPct), source: 'Reportei' },
      ],
      charts: [],
      data_sources: ['Reportei', 'Edro'],
    },
    {
      key: 'performance-presenca-digital',
      order: 6,
      kicker: 'Slide 6',
      title: 'Performance e Presença Digital',
      subtitle: 'Slide obrigatório com Reportei, seguidores e gráficos didáticos.',
      blocks: topPlatforms.map((platform) =>
        fallbackBlock(platform.label, [
          `Seguidores: ${formatInteger(platform.metrics.followers_total)} (${platform.metrics.followers_delta_abs >= 0 ? '+' : ''}${formatInteger(platform.metrics.followers_delta_abs)} | ${platform.metrics.followers_delta_pct >= 0 ? '+' : ''}${formatPercent(platform.metrics.followers_delta_pct)})`,
          `${platform.metrics.visibility.label}: ${formatNumberCompact(platform.metrics.visibility.value)}`,
          `${platform.metrics.engagement.label}: ${formatNumberCompact(platform.metrics.engagement.value)}`,
        ]),
      ),
      big_numbers: [
        { label: 'Seguidores totais', value: formatInteger(totalFollowers), tone: trendTone(totalFollowerDelta), source: 'Reportei' },
        { label: 'Visibilidade', value: formatNumberCompact(totalVisibility), tone: totalVisibility > 0 ? 'positive' : 'neutral', source: 'Reportei' },
        { label: 'Engajamento médio', value: avgEngagement > 0 ? formatNumberCompact(avgEngagement) : '0', tone: avgEngagement > 0 ? 'positive' : 'neutral', source: 'Reportei' },
      ],
      charts: [
        source.reportei.charts.followers_trend,
        source.reportei.charts.reach_comparison,
        source.reportei.charts.engagement_comparison,
      ],
      data_sources: ['Reportei'],
    },
    {
      key: 'riscos-gargalos',
      order: 7,
      kicker: 'Slide 7',
      title: 'Riscos e Gargalos',
      subtitle: 'O que pode comprometer a comunicação se não for tratado.',
      blocks: [
        fallbackBlock('Riscos do mês', [
          source.jobs.summary.overdue > 0
            ? `${source.jobs.summary.overdue} demanda(s) ficaram atrasadas no período.`
            : 'Sem atrasos críticos registrados no período.',
          manualInputs.ponto_de_atencao_do_mes,
          source.readiness.active_platforms.some((platform) => !platform.last_reportei_snapshot_at)
            ? 'Existe risco de leitura incompleta de performance por falta de snapshot.'
            : 'A leitura de performance está respaldada por snapshots válidos do Reportei.',
        ]),
      ],
      big_numbers: [
        { label: 'Atrasadas', value: formatInteger(source.jobs.summary.overdue), tone: source.jobs.summary.overdue > 0 ? 'warning' : 'neutral', source: 'Edro' },
      ],
      charts: [],
      data_sources: ['Edro', 'Inputs manuais', 'Reportei'],
    },
    {
      key: 'prioridades-proximo-mes',
      order: 8,
      kicker: 'Slide 8',
      title: 'Prioridades do Próximo Mês',
      subtitle: 'O que precisa receber foco executivo na próxima janela.',
      blocks: [
        fallbackBlock(`Próximo ciclo (${nextMonthLabel})`, [manualInputs.proximos_passos_para_o_board]),
        fallbackBlock('Princípio de execução', [
          topPlatform
            ? `Priorizar continuidade do trabalho em ${topPlatform.label}, onde já existe leitura consistente de base e performance.`
            : 'Priorizar a consolidação da próxima pauta mensal.',
        ]),
      ],
      big_numbers: [],
      charts: [],
      data_sources: ['Inputs manuais', 'Reportei'],
    },
    {
      key: 'fechamento',
      order: 9,
      kicker: 'Slide 9',
      title: 'Fechamento',
      subtitle: 'Síntese executiva do mês para o Board.',
      blocks: [
        fallbackBlock('Tese do mês', [
          manualInputs.leitura_geral_do_mes,
          totalVisibility > 0
            ? `A presença digital fechou o período com ${formatNumberCompact(totalVisibility)} em alcance agregado.`
            : 'A operação fecha o mês com leitura priorizada em consistência de execução.',
        ]),
        fallbackBlock('Próximos passos', [manualInputs.proximos_passos_para_o_board]),
      ],
      big_numbers: [],
      charts: [],
      data_sources: ['Inputs manuais', 'Reportei', 'Edro'],
    },
  ];
}

function tryExtractJson(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const candidateStarts = [trimmed.indexOf('['), trimmed.indexOf('{')].filter((index) => index >= 0).sort((a, b) => a - b);
  for (const start of candidateStarts) {
    const endBracket = trimmed.lastIndexOf(']');
    const endBrace = trimmed.lastIndexOf('}');
    const end = endBracket > start ? endBracket : endBrace;
    if (end <= start) continue;
    const slice = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      // ignore and try next candidate
    }
  }
  return null;
}

function mergeAiSlides(baseSlides: BoardPresentationSlide[], generatedSlides: unknown) {
  if (!Array.isArray(generatedSlides)) return baseSlides;
  const generatedMap = new Map<string, any>();
  for (const slide of generatedSlides) {
    const key = safeString((slide as Record<string, unknown>)?.key);
    if (key) generatedMap.set(key, slide);
  }

  return baseSlides.map((slide) => {
    const patch = generatedMap.get(slide.key);
    if (!patch || typeof patch !== 'object') return slide;
    const patchObject = patch as Record<string, any>;
    return {
      ...slide,
      title: safeString(patchObject.title) || slide.title,
      subtitle: safeString(patchObject.subtitle) || slide.subtitle,
      kicker: safeString(patchObject.kicker) || slide.kicker,
      notes: safeString(patchObject.notes) || slide.notes,
      blocks: patchObject.blocks ? sanitizeSlideBlocks(patchObject.blocks) : slide.blocks,
    };
  });
}

function getEffectiveSlides(record: BoardPresentationRecord) {
  if (Array.isArray(record.edited_slides) && record.edited_slides.length > 0) return record.edited_slides;
  if (Array.isArray(record.ai_draft) && record.ai_draft.length > 0) return record.ai_draft;
  return buildBaseSlides(record.source_snapshot, record.manual_inputs);
}

function serializeSlides(slides: unknown): BoardPresentationSlide[] {
  if (!Array.isArray(slides)) return [];
  return slides
    .map((slide, index) => {
      const input = slide as Record<string, any>;
      const key = safeString(input.key);
      if (!key) return null;
      return {
        key,
        order: Number(input.order ?? index + 1),
        title: safeString(input.title),
        subtitle: safeString(input.subtitle) || undefined,
        kicker: safeString(input.kicker) || undefined,
        blocks: sanitizeSlideBlocks(Array.isArray(input.blocks) ? input.blocks : []),
        big_numbers: Array.isArray(input.big_numbers)
          ? input.big_numbers
              .map((item) => ({
                label: safeString(item.label),
                value: safeString(item.value),
                footnote: safeString(item.footnote) || undefined,
                tone: item.tone === 'positive' || item.tone === 'warning' ? item.tone : 'neutral',
                source: safeString(item.source) || 'Edro',
                platform: safeString(item.platform) || undefined,
              }))
              .filter((item) => item.label && item.value)
          : [],
        charts: Array.isArray(input.charts)
          ? (input.charts
              .map((chart): BoardPresentationChart => ({
                type: chart.type === 'line' ? 'line' : 'bar',
                title: safeString(chart.title),
                categories: Array.isArray(chart.categories) ? chart.categories.map((value: unknown) => safeString(value)).filter(Boolean) : [],
                series: Array.isArray(chart.series)
                  ? chart.series.map((series: any) => ({
                      name: safeString(series.name),
                      values: Array.isArray(series.values) ? series.values.map((value: unknown) => Number(value) || 0) : [],
                    }))
                  : [],
                y_label: safeString(chart.y_label) || undefined,
                source: safeString(chart.source) || 'Edro',
              }))
              .filter((chart) => chart.title && chart.series.length > 0)
          ) : [],
        notes: safeString(input.notes) || undefined,
        data_sources: Array.isArray(input.data_sources) ? input.data_sources.map((value: unknown) => safeString(value)).filter(Boolean) : [],
      } satisfies BoardPresentationSlide;
    })
    .filter(Boolean)
    .sort((a, b) => a!.order - b!.order) as BoardPresentationSlide[];
}

function normalizeRecord(row: BoardPresentationDbRow): BoardPresentationRecord {
  return {
    ...row,
    manual_inputs: normalizeManualInputs(row.manual_inputs),
    ai_draft: serializeSlides(row.ai_draft),
    edited_slides: serializeSlides(row.edited_slides),
  };
}

async function fetchBoardPresentationById(tenantId: string, clientId: string, presentationId: string) {
  const { rows } = await query<BoardPresentationDbRow>(
    `SELECT *
       FROM client_board_presentations
      WHERE tenant_id = $1
        AND client_id = $2
        AND id = $3
      LIMIT 1`,
    [tenantId, clientId, presentationId],
  );
  const row = rows[0];
  if (!row) throw new Error('presentation_not_found');
  return normalizeRecord(row);
}

async function fetchBoardPresentationByMonth(tenantId: string, clientId: string, periodMonth: string) {
  const { rows } = await query<BoardPresentationDbRow>(
    `SELECT *
       FROM client_board_presentations
      WHERE tenant_id = $1
        AND client_id = $2
        AND period_month = $3
        AND template_version = $4
      LIMIT 1`,
    [tenantId, clientId, periodMonth, TEMPLATE_VERSION],
  );
  const row = rows[0];
  return row ? normalizeRecord(row) : null;
}

export async function listBoardPresentations(params: {
  tenantId: string;
  clientId: string;
  periodMonth?: string;
}) {
  const { tenantId, clientId, periodMonth } = params;
  const values: any[] = [tenantId, clientId, TEMPLATE_VERSION];
  let sql = `
    SELECT id, client_id, period_month, status, template_version, pptx_key,
           generated_at::text, reviewed_at::text, approved_at::text, exported_at::text,
           created_at::text, updated_at::text, source_snapshot
      FROM client_board_presentations
     WHERE tenant_id = $1
       AND client_id = $2
       AND template_version = $3`;
  if (periodMonth) {
    sql += ' AND period_month = $4';
    values.push(periodMonth);
  }
  sql += ' ORDER BY period_month DESC';

  const { rows } = await query<any>(sql, values);
  return rows.map((row) => ({
    id: row.id,
    client_id: row.client_id,
    period_month: row.period_month,
    status: row.status as BoardPresentationStatus,
    template_version: row.template_version,
    pptx_key: row.pptx_key ?? null,
    generated_at: row.generated_at ?? null,
    reviewed_at: row.reviewed_at ?? null,
    approved_at: row.approved_at ?? null,
    exported_at: row.exported_at ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    readiness: (row.source_snapshot as BoardPresentationSourceSnapshot | undefined)?.readiness ?? null,
  }));
}

export async function createOrRefreshBoardPresentationDraft(params: {
  tenantId: string;
  clientId: string;
  periodMonth: string;
  userId?: string | null;
  manualInputs?: Partial<BoardPresentationManualInputs>;
}) {
  const { tenantId, clientId, periodMonth, userId, manualInputs } = params;
  const sourceSnapshot = await buildBoardPresentationSourceSnapshot({ tenantId, clientId, periodMonth });
  if (sourceSnapshot.readiness.status !== 'ready') {
    const error = new Error('board_presentation_blocked');
    (error as Error & { readiness?: BoardPresentationReadiness }).readiness = sourceSnapshot.readiness;
    throw error;
  }

  const existing = await fetchBoardPresentationByMonth(tenantId, clientId, periodMonth);
  const mergedManualInputs = normalizeManualInputs({ ...(existing?.manual_inputs || EMPTY_MANUAL_INPUTS), ...(manualInputs || {}) });

  const { rows } = await query<BoardPresentationDbRow>(
    `INSERT INTO client_board_presentations (
       tenant_id,
       client_id,
       period_month,
       status,
       template_version,
       source_snapshot,
       manual_inputs,
       ai_draft,
       edited_slides,
       created_by,
       updated_by,
       generated_at,
       updated_at
     )
     VALUES ($1, $2, $3, 'draft', $4, $5::jsonb, $6::jsonb, COALESCE($7::jsonb, '[]'::jsonb), COALESCE($8::jsonb, '[]'::jsonb), $9, $9, NULL, NOW())
     ON CONFLICT (client_id, period_month, template_version)
     DO UPDATE SET
       source_snapshot = EXCLUDED.source_snapshot,
       manual_inputs = EXCLUDED.manual_inputs,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()
     RETURNING *`,
    [
      tenantId,
      clientId,
      periodMonth,
      TEMPLATE_VERSION,
      JSON.stringify(sourceSnapshot),
      JSON.stringify(mergedManualInputs),
      JSON.stringify(existing?.ai_draft ?? []),
      JSON.stringify(existing?.edited_slides ?? []),
      userId ?? null,
    ],
  );

  return normalizeRecord(rows[0]);
}

export async function getBoardPresentationDetail(params: {
  tenantId: string;
  clientId: string;
  presentationId: string;
}) {
  const record = await fetchBoardPresentationById(params.tenantId, params.clientId, params.presentationId);
  return {
    ...record,
    effective_slides: getEffectiveSlides(record),
  };
}

export async function updateBoardPresentationManualInputs(params: {
  tenantId: string;
  clientId: string;
  presentationId: string;
  manualInputs: Partial<BoardPresentationManualInputs>;
  userId?: string | null;
}) {
  const record = await fetchBoardPresentationById(params.tenantId, params.clientId, params.presentationId);
  const nextManualInputs = normalizeManualInputs({
    ...record.manual_inputs,
    ...params.manualInputs,
  });

  const { rows } = await query<BoardPresentationDbRow>(
    `UPDATE client_board_presentations
        SET manual_inputs = $4::jsonb,
            updated_by = $5,
            updated_at = NOW()
      WHERE tenant_id = $1
        AND client_id = $2
        AND id = $3
      RETURNING *`,
    [
      params.tenantId,
      params.clientId,
      params.presentationId,
      JSON.stringify(nextManualInputs),
      params.userId ?? null,
    ],
  );

  const updated = normalizeRecord(rows[0]);
  return {
    ...updated,
    effective_slides: getEffectiveSlides(updated),
  };
}

function buildAiPrompt(source: BoardPresentationSourceSnapshot, manualInputs: BoardPresentationManualInputs, baseSlides: BoardPresentationSlide[]) {
  return `
Você está escrevendo um deck executivo mensal para Board.

Regras obrigatórias:
- Use SOMENTE os dados abaixo.
- Não invente métricas.
- Não mude big numbers nem charts.
- Mantenha títulos curtos.
- Cada slide pode ter no máximo 3 blocos.
- Cada bloco pode ter no máximo 4 bullets.
- Nada de parágrafos longos.
- Português brasileiro.
- Retorne APENAS JSON com um array de slides.

Formato:
[
  {
    "key": "contexto-accountability",
    "title": "string opcional",
    "subtitle": "string opcional",
    "blocks": [
      {
        "heading": "string",
        "bullets": ["string", "string"]
      }
    ],
    "notes": "string opcional"
  }
]

Slides que você pode reescrever narrativamente:
- contexto-accountability
- status-geral
- entregas-chave
- impacto-negocio
- riscos-gargalos
- prioridades-proximo-mes
- fechamento

Dados do mês:
${JSON.stringify({
  period: source.period,
  client: source.client,
  jobs: source.jobs,
  reportei: source.reportei.platforms.map((platform) => ({
    label: platform.label,
    followers_total: platform.metrics.followers_total,
    followers_delta_abs: platform.metrics.followers_delta_abs,
    followers_delta_pct: platform.metrics.followers_delta_pct,
    visibility: platform.metrics.visibility,
    engagement: platform.metrics.engagement,
  })),
  manual_inputs: manualInputs,
}, null, 2)}

Base dos slides:
${JSON.stringify(baseSlides, null, 2)}
`.trim();
}

export async function generateBoardPresentationAiDraft(params: {
  tenantId: string;
  clientId: string;
  presentationId: string;
  userId?: string | null;
}) {
  const record = await fetchBoardPresentationById(params.tenantId, params.clientId, params.presentationId);
  if (record.source_snapshot.readiness.status !== 'ready') {
    const error = new Error('board_presentation_blocked');
    (error as Error & { readiness?: BoardPresentationReadiness }).readiness = record.source_snapshot.readiness;
    throw error;
  }
  if (!hasRequiredManualInputs(record.manual_inputs)) {
    throw new Error('manual_inputs_incomplete');
  }

  const baseSlides = buildBaseSlides(record.source_snapshot, record.manual_inputs);
  let aiSlides = baseSlides;

  try {
    const completion = await generateClaudeCompletion({
      prompt: buildAiPrompt(record.source_snapshot, record.manual_inputs, baseSlides),
      systemPrompt: 'Você é um redator executivo de board presentations para agência de comunicação. Seja curto, assertivo e fiel aos dados.',
      temperature: 0.35,
      maxTokens: 2400,
    });
    const parsed = tryExtractJson(completion.text);
    aiSlides = mergeAiSlides(baseSlides, parsed);
  } catch {
    aiSlides = baseSlides;
  }

  const { rows } = await query<BoardPresentationDbRow>(
    `UPDATE client_board_presentations
        SET ai_draft = $4::jsonb,
            status = 'review',
            generated_at = NOW(),
            updated_by = $5,
            updated_at = NOW()
      WHERE tenant_id = $1
        AND client_id = $2
        AND id = $3
      RETURNING *`,
    [
      params.tenantId,
      params.clientId,
      params.presentationId,
      JSON.stringify(aiSlides),
      params.userId ?? null,
    ],
  );

  const updated = normalizeRecord(rows[0]);
  return {
    ...updated,
    effective_slides: getEffectiveSlides(updated),
  };
}

export async function updateBoardPresentationSlides(params: {
  tenantId: string;
  clientId: string;
  presentationId: string;
  slides: BoardPresentationSlide[];
  userId?: string | null;
}) {
  const record = await fetchBoardPresentationById(params.tenantId, params.clientId, params.presentationId);
  const slides = serializeSlides(params.slides);
  const { rows } = await query<BoardPresentationDbRow>(
    `UPDATE client_board_presentations
        SET edited_slides = $4::jsonb,
            status = CASE WHEN status = 'draft' THEN 'review' ELSE status END,
            reviewed_at = NOW(),
            updated_by = $5,
            updated_at = NOW()
      WHERE tenant_id = $1
        AND client_id = $2
        AND id = $3
      RETURNING *`,
    [
      params.tenantId,
      params.clientId,
      params.presentationId,
      JSON.stringify(slides.length > 0 ? slides : getEffectiveSlides(record)),
      params.userId ?? null,
    ],
  );

  const updated = normalizeRecord(rows[0]);
  return {
    ...updated,
    effective_slides: getEffectiveSlides(updated),
  };
}

export async function approveBoardPresentation(params: {
  tenantId: string;
  clientId: string;
  presentationId: string;
  userId?: string | null;
}) {
  const record = await fetchBoardPresentationById(params.tenantId, params.clientId, params.presentationId);
  if (record.source_snapshot.readiness.status !== 'ready') {
    throw new Error('board_presentation_blocked');
  }
  const { rows } = await query<BoardPresentationDbRow>(
    `UPDATE client_board_presentations
        SET status = 'approved',
            approved_at = NOW(),
            updated_by = $4,
            updated_at = NOW()
      WHERE tenant_id = $1
        AND client_id = $2
        AND id = $3
      RETURNING *`,
    [params.tenantId, params.clientId, params.presentationId, params.userId ?? null],
  );

  const updated = normalizeRecord(rows[0]);
  return {
    ...updated,
    effective_slides: getEffectiveSlides(updated),
  };
}

function addSlideHeader(slide: any, title: string, kicker?: string, subtitle?: string) {
  slide.addText(kicker || '', {
    x: 0.6,
    y: 0.4,
    w: 3.5,
    h: 0.2,
    fontFace: 'Aptos',
    fontSize: 10,
    color: ORANGE,
    bold: true,
  });
  slide.addText(title, {
    x: 0.6,
    y: 0.75,
    w: 8.6,
    h: 0.45,
    fontFace: 'Aptos Display',
    fontSize: 22,
    color: DARK,
    bold: true,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.6,
      y: 1.2,
      w: 8.9,
      h: 0.25,
      fontFace: 'Aptos',
      fontSize: 10,
      color: MUTED,
    });
  }
}

function addBigNumberCards(slide: any, bigNumbers: BoardPresentationMetricBlock[], startY: number) {
  if (!bigNumbers.length) return startY;
  const cardWidth = bigNumbers.length >= 3 ? 3.95 : 6.1;
  const gap = 0.25;
  let x = 0.6;
  bigNumbers.slice(0, 3).forEach((item) => {
    slide.addShape(PptxGenJS.ShapeType.roundRect, {
      x,
      y: startY,
      w: cardWidth,
      h: 1.1,
      rectRadius: 0.08,
      line: { color: getToneColor(item.tone), width: 1 },
      fill: { color: getToneFill(item.tone) },
    });
    slide.addText(item.label.toUpperCase(), {
      x: x + 0.16,
      y: startY + 0.12,
      w: cardWidth - 0.32,
      h: 0.16,
      fontFace: 'Aptos',
      fontSize: 8,
      color: MUTED,
      bold: true,
    });
    slide.addText(item.value, {
      x: x + 0.16,
      y: startY + 0.34,
      w: cardWidth - 0.32,
      h: 0.32,
      fontFace: 'Aptos Display',
      fontSize: 22,
      color: getToneColor(item.tone),
      bold: true,
    });
    if (item.footnote) {
      slide.addText(item.footnote, {
        x: x + 0.16,
        y: startY + 0.76,
        w: cardWidth - 0.32,
        h: 0.16,
        fontFace: 'Aptos',
        fontSize: 7,
        color: MUTED,
      });
    }
    x += cardWidth + gap;
  });
  return startY + 1.3;
}

function addBlocks(slide: any, blocks: BoardPresentationSlideBlock[], startY: number, twoColumns = false) {
  if (!blocks.length) return startY;
  const layoutBlocks = blocks.slice(0, 3);
  if (!twoColumns || layoutBlocks.length === 1) {
    let cursorY = startY;
    layoutBlocks.forEach((block) => {
      slide.addShape(PptxGenJS.ShapeType.roundRect, {
        x: 0.6,
        y: cursorY,
        w: 12.1,
        h: 1.35,
        rectRadius: 0.06,
        line: { color: BORDER, width: 1 },
        fill: { color: WHITE },
      });
      slide.addText(block.heading, {
        x: 0.82,
        y: cursorY + 0.14,
        w: 11.6,
        h: 0.18,
        fontFace: 'Aptos',
        fontSize: 10,
        color: ORANGE,
        bold: true,
      });
      const bullets = block.bullets.slice(0, 4).map((bullet) => ({ text: bullet, options: { bullet: { indent: 10 } } }));
      slide.addText(
        bullets.length > 0 ? (bullets as any) : block.body || 'Dado insuficiente.',
        {
          x: 0.82,
          y: cursorY + 0.36,
          w: 11.4,
          h: 0.72,
          fontFace: 'Aptos',
          fontSize: 10,
          color: DARK,
          breakLine: true,
          margin: 0,
        },
      );
      cursorY += 1.55;
    });
    return cursorY;
  }

  const columnWidth = 5.8;
  const gap = 0.3;
  let cursorY = startY;
  layoutBlocks.forEach((block, index) => {
    const x = 0.6 + (index % 2) * (columnWidth + gap);
    const y = cursorY + Math.floor(index / 2) * 1.75;
    slide.addShape(PptxGenJS.ShapeType.roundRect, {
      x,
      y,
      w: columnWidth,
      h: 1.55,
      rectRadius: 0.06,
      line: { color: BORDER, width: 1 },
      fill: { color: WHITE },
    });
    slide.addText(block.heading, {
      x: x + 0.18,
      y: y + 0.14,
      w: columnWidth - 0.36,
      h: 0.18,
      fontFace: 'Aptos',
      fontSize: 10,
      color: ORANGE,
      bold: true,
    });
    const bullets = block.bullets.slice(0, 4).map((bullet) => ({ text: bullet, options: { bullet: { indent: 10 } } }));
    slide.addText(
      bullets.length > 0 ? (bullets as any) : block.body || 'Dado insuficiente.',
      {
        x: x + 0.18,
        y: y + 0.36,
        w: columnWidth - 0.36,
        h: 0.9,
        fontFace: 'Aptos',
        fontSize: 9.5,
        color: DARK,
        breakLine: true,
        margin: 0,
      },
    );
  });
  return startY + Math.ceil(layoutBlocks.length / 2) * 1.8;
}

function addCharts(slide: any, charts: BoardPresentationChart[], startY: number) {
  if (!charts.length) return;
  const topCharts = charts.slice(0, 2);
  const chartWidth = topCharts.length > 1 ? 5.8 : 12.0;
  const gap = 0.3;
  topCharts.forEach((chart, index) => {
    const x = 0.6 + index * (chartWidth + gap);
    slide.addShape(PptxGenJS.ShapeType.roundRect, {
      x,
      y: startY,
      w: chartWidth,
      h: 2.15,
      rectRadius: 0.06,
      line: { color: BORDER, width: 1 },
      fill: { color: WHITE },
    });
    slide.addText(chart.title, {
      x: x + 0.16,
      y: startY + 0.14,
      w: chartWidth - 0.32,
      h: 0.2,
      fontFace: 'Aptos',
      fontSize: 10,
      color: DARK,
      bold: true,
    });

    const chartType = chart.type === 'line' ? PptxGenJS.ChartType.line : PptxGenJS.ChartType.bar;
    const data = chart.series.map((series) => ({
      name: series.name,
      labels: chart.categories,
      values: series.values,
    }));
    slide.addChart(chartType as any, data as any, {
      x: x + 0.12,
      y: startY + 0.42,
      w: chartWidth - 0.24,
      h: 1.52,
      showLegend: true,
      legendPos: 'b',
      fontFace: 'Aptos',
      catAxisLabelFontSize: 8,
      valAxisLabelFontSize: 8,
      showTitle: false,
      chartColors: [ORANGE, BLUE, GREEN],
      lineSize: 2,
      showValue: false,
      dataLabelPosition: 'outEnd',
      valAxisTitle: chart.y_label,
      showCatName: false,
      showSerName: false,
      showPercent: false,
      showLeaderLines: false,
      catAxisLabelRotate: 0,
    } as any);
  });
}

function renderBoardPresentationPptx(params: {
  clientName: string;
  periodLabel: string;
  slides: BoardPresentationSlide[];
}) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Edro Digital';
  pptx.company = 'Edro Digital';
  pptx.subject = 'Board presentation mensal';
  pptx.title = `${params.clientName} — ${params.periodLabel}`;
  pptx.theme = {
    headFontFace: 'Aptos Display',
    bodyFontFace: 'Aptos',
  };

  params.slides
    .slice()
    .sort((a, b) => a.order - b.order)
    .forEach((slideData) => {
      const slide = pptx.addSlide();
      slide.background = { color: WHITE };
      slide.addShape(PptxGenJS.ShapeType.rect, {
        x: 0,
        y: 0,
        w: 13.33,
        h: 7.5,
        fill: { color: WHITE },
        line: { color: WHITE, transparency: 100 },
      });
      slide.addShape(PptxGenJS.ShapeType.rect, {
        x: 0.32,
        y: 0.32,
        w: 12.69,
        h: 0.06,
        fill: { color: ORANGE },
        line: { color: ORANGE, transparency: 100 },
      });

      addSlideHeader(slide, slideData.title, slideData.kicker, slideData.subtitle);

      let cursorY = 1.65;
      cursorY = addBigNumberCards(slide, slideData.big_numbers, cursorY);

      if (slideData.key === 'performance-presenca-digital' && slideData.charts.length > 0) {
        cursorY = addBlocks(slide, slideData.blocks, cursorY, true);
        addCharts(slide, slideData.charts, cursorY + 0.08);
      } else {
        cursorY = addBlocks(slide, slideData.blocks, cursorY, slideData.blocks.length > 1);
        if (slideData.charts.length > 0) {
          addCharts(slide, slideData.charts, Math.min(cursorY + 0.12, 4.75));
        }
      }

      slide.addText(`Fontes: ${slideData.data_sources.join(' · ')}`, {
        x: 0.6,
        y: 7.08,
        w: 12.1,
        h: 0.12,
        fontFace: 'Aptos',
        fontSize: 7,
        color: MUTED,
      });
    });

  return pptx;
}

function ensureBuffer(content: string | ArrayBuffer | Blob | Uint8Array) {
  if (Buffer.isBuffer(content)) return content;
  if (content instanceof Uint8Array) return Buffer.from(content);
  if (content instanceof ArrayBuffer) return Buffer.from(content);
  throw new Error('unsupported_pptx_output');
}

export async function exportBoardPresentationPptx(params: {
  tenantId: string;
  clientId: string;
  presentationId: string;
  userId?: string | null;
}) {
  const record = await fetchBoardPresentationById(params.tenantId, params.clientId, params.presentationId);
  if (record.source_snapshot.readiness.status !== 'ready') {
    const error = new Error('board_presentation_blocked');
    (error as Error & { readiness?: BoardPresentationReadiness }).readiness = record.source_snapshot.readiness;
    throw error;
  }

  const slides = getEffectiveSlides(record);
  if (slides.length !== FIXED_SLIDE_ORDER.length) {
    throw new Error('invalid_slide_count');
  }

  const pptx = renderBoardPresentationPptx({
    clientName: record.source_snapshot.client.name,
    periodLabel: record.source_snapshot.period.label,
    slides,
  });
  const output = await pptx.write({ outputType: 'nodebuffer', compression: true });
  const buffer = ensureBuffer(output);
  const safeClient = record.source_snapshot.client.name.replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase();
  const fileName = `board-${safeClient}-${record.period_month}.pptx`;
  const key = `board-presentations/${record.tenant_id}/${record.client_id}/${record.period_month}/${fileName}`;
  await saveFile(buffer, key);

  const { rows } = await query<BoardPresentationDbRow>(
    `UPDATE client_board_presentations
        SET pptx_key = $4,
            status = 'exported',
            exported_at = NOW(),
            updated_by = $5,
            updated_at = NOW()
      WHERE tenant_id = $1
        AND client_id = $2
        AND id = $3
      RETURNING *`,
    [params.tenantId, params.clientId, params.presentationId, key, params.userId ?? null],
  );

  const updated = normalizeRecord(rows[0]);
  return {
    record: {
      ...updated,
      effective_slides: getEffectiveSlides(updated),
    },
    key,
    fileName,
    contentType: PPTX_CONTENT_TYPE,
    buffer,
  };
}
