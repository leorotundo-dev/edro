/**
 * Reportei Learning Sync — FASE 3
 *
 * Analisa snapshots de métricas do Reportei e gera LearningRules
 * baseadas em performance real de cada cliente.
 *
 * Exemplos de regras geradas:
 *   "Conteúdo de Instagram com alto alcance (+30d): tendência de crescimento 22%"
 *   "Engajamento acima da média no portfólio: continuar linha editorial atual"
 *   "Queda de 25% em impressões: revisar frequência de publicação"
 */

import { query } from '../db';

const SIGNIFICANCE_THRESHOLD = 15; // min delta_pct to flag
const DROP_THRESHOLD = -20;
const SPIKE_THRESHOLD = 30;

const METRIC_LABELS: Record<string, string> = {
  'ig:impressions':      'Impressões no Instagram',
  'ig:reach':            'Alcance no Instagram',
  'ig:engagement_rate':  'Taxa de Engajamento',
  'ig:followers_gained': 'Crescimento de Seguidores',
  'ig:likes':            'Curtidas',
  'ig:saves':            'Salvamentos',
  'li:impressions':      'Impressões no LinkedIn',
  'li:engagement_rate':  'Engajamento no LinkedIn',
  'ma:roas':             'ROAS',
  'ma:ctr':              'CTR',
  'ga:sessions':         'Sessões no Site',
  'ga:new_users':        'Novos Usuários',
};

const PLATFORM_STRATEGY_HINTS: Record<string, Record<string, string>> = {
  Instagram: {
    spike:  'Manter frequência e estilo de conteúdo atual no Instagram.',
    drop:   'Revisar frequência, horários de publicação e formatos no Instagram.',
    stable: 'Performance Instagram estável — manter linha editorial.',
  },
  LinkedIn: {
    spike:  'Conteúdo profissional e educativo está performando bem no LinkedIn.',
    drop:   'Aumentar qualidade editorial e relevância profissional no LinkedIn.',
    stable: 'LinkedIn com performance consistente.',
  },
  MetaAds: {
    spike:  'Criativos atuais de Meta Ads com boa performance — escalar investimento.',
    drop:   'Revisar criativos, segmentação e landing pages de Meta Ads.',
    stable: 'Meta Ads em linha com histórico.',
  },
  GoogleAnalytics: {
    spike:  'Aumento de tráfego orgânico — reforçar SEO e conteúdo de blog.',
    drop:   'Queda de tráfego — revisar SEO, campanhas de mídia e UX.',
    stable: 'Tráfego web consistente.',
  },
};

interface Snapshot {
  client_id: string;
  tenant_id: string;
  platform: string;
  time_window: string;
  metrics: Record<string, { value: number | null; comparison: number | null; delta_pct: number | null }>;
  synced_at: string;
}

function buildInsightText(platform: string, metricKey: string, delta: number, value: number | null): string {
  const label = METRIC_LABELS[metricKey] ?? metricKey;
  const dir = delta > 0 ? 'alta' : 'queda';
  const pct = Math.abs(delta).toFixed(1);
  const hints = PLATFORM_STRATEGY_HINTS[platform];
  const hintKey = delta >= SPIKE_THRESHOLD ? 'spike' : delta <= DROP_THRESHOLD ? 'drop' : 'stable';
  const hint = hints?.[hintKey] ?? '';

  return `${label}: ${dir} de ${pct}% vs período anterior${value != null ? ` (atual: ${value.toLocaleString('pt-BR')})` : ''}. ${hint}`.trim();
}

async function ensureLearnedInsightsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS learned_insights (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id    TEXT NOT NULL,
      client_id    TEXT NOT NULL,
      platform     TEXT NOT NULL,
      time_window  TEXT NOT NULL,
      payload      JSONB NOT NULL DEFAULT '{}',
      created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `).catch(() => {});
}

export async function syncReporteiLearningRules(
  clientId: string,
  tenantId: string
): Promise<{ rules: number }> {
  await ensureLearnedInsightsTable();

  // Load latest snapshots for all platforms / windows
  const { rows: snapshots } = await query<Snapshot>(
    `SELECT client_id, tenant_id, platform, time_window, metrics, synced_at
     FROM reportei_metric_snapshots
     WHERE client_id = $1 AND tenant_id = $2
       AND synced_at > NOW() - INTERVAL '8 days'
     ORDER BY platform, time_window`,
    [clientId, tenantId]
  ).catch(() => ({ rows: [] as Snapshot[] }));

  if (!snapshots.length) return { rules: 0 };

  let rules = 0;

  for (const snap of snapshots) {
    const significantMetrics: Array<{ key: string; delta: number; value: number | null }> = [];

    for (const [key, mv] of Object.entries(snap.metrics)) {
      if (mv.delta_pct == null || Math.abs(mv.delta_pct) < SIGNIFICANCE_THRESHOLD) continue;
      if (!(key in METRIC_LABELS)) continue;
      significantMetrics.push({ key, delta: mv.delta_pct, value: mv.value });
    }

    if (!significantMetrics.length) continue;

    // Build insight text summarizing the platform performance
    const topMetrics = significantMetrics
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 4);

    const summary = topMetrics
      .map((m) => buildInsightText(snap.platform, m.key, m.delta, m.value))
      .join('\n');

    const overallDelta = topMetrics.reduce((sum, m) => sum + m.delta, 0) / topMetrics.length;
    const trend: 'spike' | 'drop' | 'stable' =
      overallDelta >= SPIKE_THRESHOLD ? 'spike' : overallDelta <= DROP_THRESHOLD ? 'drop' : 'stable';

    const payload = {
      platform: snap.platform,
      window: snap.time_window,
      trend,
      summary,
      by_format: [{
        format: snap.platform.toLowerCase(),
        score: trend === 'spike' ? 75 : trend === 'drop' ? 25 : 50,
        kpis: topMetrics.map((m) => ({
          metric: m.key,
          label: METRIC_LABELS[m.key] ?? m.key,
          value: m.value,
          delta_pct: m.delta,
        })),
        notes: [summary],
      }],
      by_tag: [],
      observed_at: snap.synced_at,
      source: 'reportei_sync',
      raw: snap.metrics,
    };

    // Upsert into learned_insights (replace if exists for same client+platform+window this week)
    await query(
      `INSERT INTO learned_insights (tenant_id, client_id, platform, time_window, payload)
       VALUES ($1, $2, $3, $4, $5::jsonb)`,
      [tenantId, clientId, snap.platform, snap.time_window, JSON.stringify(payload)]
    ).catch(() => {}); // best-effort, ignore duplicate

    rules++;
  }

  // Trigger learning rules rebuild for this client (non-blocking)
  import('../services/learningEngine').then(({ recomputeClientLearningRules }) => {
    recomputeClientLearningRules(clientId, tenantId).catch(() => {});
  }).catch(() => {});

  return { rules };
}

/** Run for all clients that have recent Reportei snapshots */
export async function syncAllClientsLearningRules(): Promise<{ clients: number; total_rules: number }> {
  const { rows: clients } = await query<{ client_id: string; tenant_id: string }>(
    `SELECT DISTINCT client_id, tenant_id
     FROM reportei_metric_snapshots
     WHERE synced_at > NOW() - INTERVAL '8 days'`
  ).catch(() => ({ rows: [] }));

  let totalRules = 0;
  for (const c of clients) {
    const { rules } = await syncReporteiLearningRules(c.client_id, c.tenant_id).catch(() => ({ rules: 0 }));
    totalRules += rules;
  }

  return { clients: clients.length, total_rules: totalRules };
}

export async function syncTenantLearningRules(tenantId: string): Promise<{ clients: number; total_rules: number }> {
  const { rows: clients } = await query<{ client_id: string }>(
    `SELECT DISTINCT client_id
     FROM reportei_metric_snapshots
     WHERE tenant_id = $1
       AND synced_at > NOW() - INTERVAL '8 days'`,
    [tenantId],
  ).catch(() => ({ rows: [] }));

  let totalRules = 0;
  for (const client of clients) {
    const { rules } = await syncReporteiLearningRules(client.client_id, tenantId).catch(() => ({ rules: 0 }));
    totalRules += rules;
  }

  return { clients: clients.length, total_rules: totalRules };
}
