import { query } from '../db';

type RawPayloadRow = {
  reportei_integration_id: number;
  integration_slug: string;
  time_window: string | null;
  client_id: string | null;
  reportei_project_id: number | null;
  period_start: string;
  period_end: string;
  response_payload: any;
  synced_at: string;
};

type SemanticMetric = {
  reference_key: string;
  family: string;
  value: number | null;
  comparison: number | null;
  delta_pct: number | null;
};

export type ReporteiSemanticSummary = {
  raw_payloads: number;
  integrations: number;
  family_summary: Array<{
    family: string;
    integrations: number;
    metrics: number;
  }>;
  top_metrics: Array<{
    integration_slug: string;
    family: string;
    reference_key: string;
    value: number | null;
    delta_pct: number | null;
  }>;
};

function formatMetricValue(value: number | null) {
  if (value == null || !Number.isFinite(value)) return 'sem valor';
  return Math.abs(value) >= 1000
    ? new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)
    : new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value);
}

export function buildReporteiSemanticPromptBlock(
  summary?: ReporteiSemanticSummary | null,
  heading = 'CONTEXTO QUANTITATIVO DO REPORTEI:',
) {
  if (!summary?.integrations || !summary.family_summary.length) return '';

  const families = summary.family_summary.map((item) => item.family).join(', ');
  const topMetrics = summary.top_metrics
    .slice(0, 4)
    .map((metric) => {
      const delta = metric.delta_pct == null ? '' : ` (${metric.delta_pct >= 0 ? '+' : ''}${metric.delta_pct.toFixed(1)}%)`;
      return `- ${metric.integration_slug}/${metric.family}: ${metric.reference_key} = ${formatMetricValue(metric.value)}${delta}`;
    });

  return [
    heading,
    `- Integrações cobertas: ${summary.integrations}`,
    `- Famílias disponíveis: ${families}`,
    ...topMetrics,
    '- Use esses sinais quantitativos para calibrar plataforma, gancho, CTA e tipo de mensagem com base no que realmente performa.',
  ].join('\n');
}

const SUFFIX_TO_FAMILY: Record<string, string> = {
  followers: 'audience',
  followers_count: 'audience',
  new_followers: 'audience',
  new_followers_count: 'audience',
  profile_views: 'audience',
  page_views: 'audience',
  views: 'reach',
  reach: 'reach',
  total_reach: 'reach',
  paid_reach: 'reach',
  organic_reach: 'reach',
  impressions: 'reach',
  unique_impressions: 'reach',
  page_reach: 'reach',
  page_reach_total: 'reach',
  engagement: 'engagement',
  engagement_rate: 'engagement',
  feed_engagement: 'engagement',
  feed_engagement_rate: 'engagement',
  likes: 'engagement',
  comments: 'engagement',
  saves: 'engagement',
  shares: 'engagement',
  sessions: 'traffic',
  all_sessions: 'traffic',
  pageviews: 'traffic',
  all_pageviews: 'traffic',
  total_users: 'traffic',
  all_users: 'traffic',
  new_users: 'traffic',
  returning_users: 'traffic',
  conversions: 'conversion',
  all_conversions: 'conversion',
  conversions_value: 'conversion',
  all_conversions_value: 'conversion',
  cost_per_conversion: 'conversion',
  abandoned_carts: 'conversion',
  view_product: 'conversion',
  spend: 'paid_media',
  cost: 'paid_media',
  cpc: 'paid_media',
  cpm: 'paid_media',
  ctr: 'paid_media',
  roas: 'paid_media',
  clicks: 'paid_media',
  campaigns: 'paid_media',
  count_campaigns: 'paid_media',
  count_ads: 'paid_media',
  page_messages_new: 'messaging',
  page_messages_reported: 'messaging',
};

const PLATFORM_TO_SLUGS: Record<string, string[]> = {
  Instagram: ['instagram_business'],
  LinkedIn: ['linkedin'],
  MetaAds: ['facebook_ads'],
  FacebookAds: ['facebook_ads'],
  GoogleAds: ['google_adwords'],
  GoogleAnalytics: ['google_analytics_4'],
  Facebook: ['facebook'],
};

const SLUG_TO_PLATFORM = Object.fromEntries(
  Object.entries(PLATFORM_TO_SLUGS).flatMap(([platform, slugs]) => slugs.map((slug) => [slug, platform])),
) as Record<string, string>;

function pickNumeric(value: any): number | null {
  if (value == null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  if (Array.isArray(value)) {
    for (const entry of value) {
      const picked = pickNumeric(entry);
      if (picked != null) return picked;
    }
  }
  if (typeof value === 'object') {
    for (const key of ['value', 'values', 'comparison', 'difference']) {
      const picked = pickNumeric((value as any)[key]);
      if (picked != null) return picked;
    }
  }
  return null;
}

function familyFromReferenceKey(referenceKey: string): string {
  const suffix = referenceKey.includes(':') ? referenceKey.split(':')[1] : referenceKey;
  return SUFFIX_TO_FAMILY[suffix] ?? 'other';
}

function normalizeMetricsFromResponse(responsePayload: any): SemanticMetric[] {
  const items: SemanticMetric[] = [];
  const data = responsePayload?.data;

  if (data && typeof data === 'object' && !Array.isArray(data)) {
    for (const [referenceKey, raw] of Object.entries<any>(data)) {
      items.push({
        reference_key: referenceKey,
        family: familyFromReferenceKey(referenceKey),
        value: pickNumeric(raw?.values ?? raw?.value ?? raw),
        comparison: pickNumeric(raw?.comparison?.values ?? raw?.comparison),
        delta_pct: pickNumeric(raw?.comparison?.difference ?? raw?.delta_pct),
      });
    }
    return items;
  }

  const candidates: any[] = Array.isArray(data)
    ? data
    : Array.isArray(responsePayload)
    ? responsePayload
    : Array.isArray(responsePayload?.metrics)
    ? responsePayload.metrics
    : Array.isArray(responsePayload?.items)
    ? responsePayload.items
    : [];

  for (const raw of candidates) {
    const referenceKey = raw.reference_key ?? raw.id;
    if (!referenceKey) continue;
    items.push({
      reference_key: String(referenceKey),
      family: familyFromReferenceKey(String(referenceKey)),
      value: pickNumeric(raw?.data?.value ?? raw?.values ?? raw?.value),
      comparison: pickNumeric(raw?.data?.comparison ?? raw?.comparison),
      delta_pct: pickNumeric(raw?.data?.delta_pct ?? raw?.delta_pct),
    });
  }

  return items;
}

export function reporteiPlatformFromSlug(slug?: string | null) {
  return slug ? (SLUG_TO_PLATFORM[slug] ?? null) : null;
}

export function buildReporteiEditorialInsights(
  summary?: ReporteiSemanticSummary | null,
  platform?: string | null,
) {
  if (!summary?.integrations || !summary.family_summary.length) return [] as string[];

  const scope = platform || 'este cliente';
  const families = new Set(summary.family_summary.map((item) => item.family));
  const insights: string[] = [];

  if (families.has('reach') && families.has('engagement')) {
    insights.push(`${scope}: há sinais quantitativos de alcance e engajamento; vale priorizar ganchos fortes e valor claro logo na abertura.`);
  } else if (families.has('reach')) {
    insights.push(`${scope}: a base quantitativa aponta mais para visibilidade do que para conversão direta; calibrar a peça para atenção e lembrança.`);
  }

  if (families.has('traffic') || families.has('conversion')) {
    insights.push(`${scope}: existem sinais de tráfego/conversão; a peça deve ter CTA explícito e destino coerente.`);
  }

  if (families.has('paid_media')) {
    insights.push(`${scope}: há mídia paga ativa; manter clareza de proposta de valor e promessa principal ajuda consistência entre orgânico e campanha.`);
  }

  const topMetrics = summary.top_metrics.slice(0, 2).map((metric) => {
    const delta = metric.delta_pct == null ? '' : ` (${metric.delta_pct >= 0 ? '+' : ''}${metric.delta_pct.toFixed(1)}%)`;
    return `${metric.integration_slug}/${metric.family}: ${metric.reference_key}${delta}`;
  });
  if (topMetrics.length) {
    insights.push(`Métricas mais fortes observadas: ${topMetrics.join(' | ')}.`);
  }

  return insights.slice(0, 4);
}

function summarizeFamily(metrics: SemanticMetric[]) {
  const withValues = metrics.filter((metric) => metric.value != null);
  const topMetrics = withValues
    .sort((left, right) => Math.abs(right.value ?? 0) - Math.abs(left.value ?? 0))
    .slice(0, 5)
    .map((metric) => ({
      reference_key: metric.reference_key,
      value: metric.value,
      delta_pct: metric.delta_pct,
    }));

  return {
    count: metrics.length,
    with_values: withValues.length,
    top_metrics: topMetrics,
  };
}

export async function buildReporteiSemanticPreview(options: {
  tenantId: string;
  clientId?: string | null;
  projectId?: number | null;
  timeWindow?: string | null;
  limit?: number;
  platform?: string | null;
}) {
  const conditions = ['tenant_id = $1'];
  const params: any[] = [options.tenantId];

  if (options.clientId) {
    params.push(options.clientId);
    conditions.push(`client_id = $${params.length}`);
  }
  if (options.projectId) {
    params.push(options.projectId);
    conditions.push(`reportei_project_id = $${params.length}`);
  }
  if (options.timeWindow) {
    params.push(options.timeWindow);
    conditions.push(`time_window = $${params.length}`);
  }

  params.push(options.limit ?? 200);
  const whereClause = conditions.join(' AND ');

  const { rows } = await query<RawPayloadRow>(
    `SELECT reportei_integration_id, integration_slug, time_window, client_id, reportei_project_id,
            period_start, period_end, response_payload, synced_at
       FROM reportei_metric_raw_payloads
      WHERE ${whereClause}
      ORDER BY synced_at DESC
      LIMIT $${params.length}`,
    params,
  );

  const byIntegration = new Map<string, {
    integration_id: number;
    integration_slug: string;
    time_window: string | null;
    latest_synced_at: string;
    periods: Array<{ start: string; end: string }>;
    metrics: SemanticMetric[];
  }>();

  for (const row of rows) {
    const key = `${row.reportei_integration_id}:${row.integration_slug}:${row.time_window ?? 'none'}`;
    const existing = byIntegration.get(key) ?? {
      integration_id: row.reportei_integration_id,
      integration_slug: row.integration_slug,
      time_window: row.time_window,
      latest_synced_at: row.synced_at,
      periods: [],
      metrics: [],
    };
    existing.latest_synced_at = existing.latest_synced_at > row.synced_at ? existing.latest_synced_at : row.synced_at;
    existing.periods.push({ start: row.period_start, end: row.period_end });
    existing.metrics.push(...normalizeMetricsFromResponse(row.response_payload));
    byIntegration.set(key, existing);
  }

  const integrations = Array.from(byIntegration.values()).map((integration) => {
    const families = integration.metrics.reduce<Record<string, SemanticMetric[]>>((acc, metric) => {
      if (!acc[metric.family]) acc[metric.family] = [];
      acc[metric.family].push(metric);
      return acc;
    }, {});

    const familySummary = Object.fromEntries(
      Object.entries(families).map(([family, metrics]) => [family, summarizeFamily(metrics)]),
    );

    return {
      integration_id: integration.integration_id,
      integration_slug: integration.integration_slug,
      time_window: integration.time_window,
      latest_synced_at: integration.latest_synced_at,
      periods: integration.periods.slice(0, 5),
      total_metrics: integration.metrics.length,
      families: familySummary,
    };
  }).filter((integration) => {
    if (!options.platform) return true;
    const slugs = PLATFORM_TO_SLUGS[options.platform] ?? [options.platform.toLowerCase()];
    return slugs.includes(integration.integration_slug);
  });

  const familyTotals: Record<string, { integrations: number; metrics: number }> = {};
  for (const integration of integrations) {
    for (const [family, summary] of Object.entries<any>(integration.families)) {
      if (!familyTotals[family]) familyTotals[family] = { integrations: 0, metrics: 0 };
      familyTotals[family].integrations += 1;
      familyTotals[family].metrics += Number(summary.count ?? 0);
    }
  }

  return {
    scope: {
      tenant_id: options.tenantId,
      client_id: options.clientId ?? null,
      project_id: options.projectId ?? null,
      time_window: options.timeWindow ?? null,
    },
    raw_payloads: rows.length,
    integrations: integrations.length,
    family_totals: familyTotals,
    integration_previews: integrations,
  };
}

export async function buildReporteiSemanticSummary(options: {
  tenantId: string;
  clientId: string;
  timeWindow?: string | null;
  platform?: string | null;
}): Promise<ReporteiSemanticSummary> {
  const preview = await buildReporteiSemanticPreview({
    tenantId: options.tenantId,
    clientId: options.clientId,
    timeWindow: options.timeWindow ?? null,
    platform: options.platform ?? null,
    limit: 300,
  });

  const keyFamilies = ['audience', 'reach', 'engagement', 'traffic', 'conversion', 'paid_media', 'messaging'];
  const familySummary = keyFamilies
    .filter((family) => preview.family_totals[family])
    .map((family) => ({
      family,
      integrations: preview.family_totals[family].integrations,
      metrics: preview.family_totals[family].metrics,
    }));

  const topMetrics = preview.integration_previews.flatMap((integration) =>
    Object.entries<any>(integration.families).flatMap(([family, summary]) =>
      (summary.top_metrics ?? []).map((metric: any) => ({
        integration_slug: integration.integration_slug,
        family,
        reference_key: metric.reference_key,
        value: metric.value,
        delta_pct: metric.delta_pct,
      })),
    ),
  )
    .filter((metric) => metric.value != null)
    .sort((left, right) => Math.abs(right.value ?? 0) - Math.abs(left.value ?? 0))
    .slice(0, 12);

  return {
    raw_payloads: preview.raw_payloads,
    integrations: preview.integrations,
    family_summary: familySummary,
    top_metrics: topMetrics,
  };
}
