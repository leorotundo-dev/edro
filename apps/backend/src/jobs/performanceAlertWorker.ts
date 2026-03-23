/**
 * Performance Alert Worker — FASE 6
 *
 * Roda toda segunda-feira, detecta variações significativas
 * nas métricas vs período anterior e grava em notification_logs.
 *
 * Drops  >20%  → alerta "queda"
 * Spikes >50%  → alerta "pico"
 */

import { query } from '../db';

const DROP_THRESHOLD  = -0.20; // -20%
const SPIKE_THRESHOLD =  0.50; //  50%

const MONITORED_METRICS: Record<string, string[]> = {
  Instagram:       ['ig:impressions', 'ig:reach', 'ig:engagement_rate', 'ig:followers_gained'],
  LinkedIn:        ['li:impressions', 'li:engagement_rate', 'li:followers_gained'],
  MetaAds:         ['ma:spend', 'ma:reach', 'ma:ctr', 'ma:roas'],
  GoogleAnalytics: ['ga:sessions', 'ga:new_users', 'ga:bounce_rate'],
};

const METRIC_LABELS: Record<string, string> = {
  'ig:impressions':       'Impressões Instagram',
  'ig:reach':             'Alcance Instagram',
  'ig:engagement_rate':   'Taxa de Engajamento',
  'ig:followers_gained':  'Novos Seguidores',
  'li:impressions':       'Impressões LinkedIn',
  'li:engagement_rate':   'Engajamento LinkedIn',
  'li:followers_gained':  'Seguidores LinkedIn',
  'ma:spend':             'Investimento Meta Ads',
  'ma:reach':             'Alcance Meta Ads',
  'ma:ctr':               'CTR Meta Ads',
  'ma:roas':              'ROAS',
  'ga:sessions':          'Sessões',
  'ga:new_users':         'Novos Usuários',
  'ga:bounce_rate':       'Taxa de Rejeição',
};

let running = false;
let lastRunDate = '';

function shouldRunToday(): boolean {
  if (process.env.PERF_ALERT_FORCE === 'true') return true;
  return new Date().getDay() === 1; // Monday
}

async function ensureNotificationLogsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS notification_logs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id   TEXT NOT NULL,
      client_id   TEXT,
      type        TEXT NOT NULL,
      severity    TEXT NOT NULL DEFAULT 'info',
      title       TEXT NOT NULL,
      body        TEXT,
      payload     JSONB NOT NULL DEFAULT '{}',
      sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
      read_at     TIMESTAMPTZ
    )
  `).catch(() => {});
  await query(`
    CREATE INDEX IF NOT EXISTS idx_notification_logs_tenant
    ON notification_logs (tenant_id, sent_at DESC)
  `).catch(() => {});
}

interface AlertCandidate {
  client_id: string;
  client_name: string;
  tenant_id: string;
  platform: string;
  metric: string;
  value: number;
  comparison: number;
  delta_pct: number;
  kind: 'drop' | 'spike';
}

async function runPerformanceAlertWorker(params?: {
  tenantId?: string;
  force?: boolean;
  skipSchedule?: boolean;
}): Promise<{ processed: number; inserted: number }> {
  const { tenantId, force = false, skipSchedule = false } = params || {};

  if (running) return { processed: 0, inserted: 0 };
  if (!skipSchedule && !force && !shouldRunToday()) return { processed: 0, inserted: 0 };

  const today = new Date().toISOString().slice(0, 10);
  if (!skipSchedule && lastRunDate === today) return { processed: 0, inserted: 0 };
  running = true;

  try {
    await ensureNotificationLogsTable();

    const scopeClause = tenantId ? ` AND s.tenant_id = $1` : '';
    const scopeParams = tenantId ? [tenantId] : [];

    const { rows: snapshots } = await query<any>(
      `
      SELECT s.client_id, s.tenant_id, s.platform, s.metrics, c.name AS client_name
      FROM reportei_metric_snapshots s
      JOIN clients c ON c.id = s.client_id
      WHERE s.time_window = '30d'
        AND s.synced_at > NOW() - INTERVAL '8 days'
        ${scopeClause}
      `,
      scopeParams,
    ).catch(() => ({ rows: [] }));

    if (!snapshots.length) {
      console.log('[perfAlerts] No recent snapshots found, skipping');
      return { processed: 0, inserted: 0 };
    }

    const candidates: AlertCandidate[] = [];

    for (const snap of snapshots) {
      const metrics = snap.metrics as Record<string, { value: number; comparison: number; delta_pct: number }>;
      const monitored = MONITORED_METRICS[snap.platform] ?? [];

      for (const metricKey of monitored) {
        const metric = metrics[metricKey];
        if (!metric || metric.value == null || metric.comparison == null || metric.delta_pct == null) continue;

        const delta = metric.delta_pct / 100;
        if (delta <= DROP_THRESHOLD) {
          candidates.push({
            client_id: snap.client_id,
            client_name: snap.client_name,
            tenant_id: snap.tenant_id,
            platform: snap.platform,
            metric: metricKey,
            value: metric.value,
            comparison: metric.comparison,
            delta_pct: metric.delta_pct,
            kind: 'drop',
          });
        } else if (delta >= SPIKE_THRESHOLD) {
          candidates.push({
            client_id: snap.client_id,
            client_name: snap.client_name,
            tenant_id: snap.tenant_id,
            platform: snap.platform,
            metric: metricKey,
            value: metric.value,
            comparison: metric.comparison,
            delta_pct: metric.delta_pct,
            kind: 'spike',
          });
        }
      }
    }

    console.log(`[perfAlerts] ${candidates.length} alerts detected across ${snapshots.length} snapshots`);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAlertsQuery = tenantId
      ? query<any>(
        `SELECT payload->>'client_id' AS client_id, payload->>'metric' AS metric
         FROM notification_logs
         WHERE tenant_id = $2
           AND type IN ('perf_drop', 'perf_spike')
           AND sent_at > $1`,
        [sevenDaysAgo.toISOString(), tenantId],
      )
      : query<any>(
        `SELECT payload->>'client_id' AS client_id, payload->>'metric' AS metric
         FROM notification_logs
         WHERE type IN ('perf_drop', 'perf_spike')
           AND sent_at > $1`,
        [sevenDaysAgo.toISOString()],
      );

    const { rows: recentAlerts } = await recentAlertsQuery.catch(() => ({ rows: [] }));
    const recentKeys = new Set(recentAlerts.map((row: any) => `${row.client_id}:${row.metric}`));

    let inserted = 0;
    for (const candidate of candidates) {
      const dedupeKey = `${candidate.client_id}:${candidate.metric}`;
      if (recentKeys.has(dedupeKey)) continue;

      const label = METRIC_LABELS[candidate.metric] ?? candidate.metric;
      const directionText = candidate.kind === 'drop'
        ? `queda de ${Math.abs(candidate.delta_pct).toFixed(1)}%`
        : `alta de ${candidate.delta_pct.toFixed(1)}%`;

      const title = candidate.kind === 'drop'
        ? `Queda detectada: ${label} em ${candidate.client_name}`
        : `Pico detectado: ${label} em ${candidate.client_name}`;

      const body = `${candidate.client_name} registrou ${directionText} em ${label} (${candidate.platform}) nos últimos 30 dias. `
        + `Período atual: ${candidate.value?.toLocaleString('pt-BR') ?? '—'} vs anterior: ${candidate.comparison?.toLocaleString('pt-BR') ?? '—'}.`;

      await query(
        `INSERT INTO notification_logs (tenant_id, client_id, type, severity, title, body, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [
          candidate.tenant_id,
          candidate.client_id,
          candidate.kind === 'drop' ? 'perf_drop' : 'perf_spike',
          candidate.kind === 'drop' ? 'warning' : 'info',
          title,
          body,
          JSON.stringify({
            client_id: candidate.client_id,
            client_name: candidate.client_name,
            platform: candidate.platform,
            metric: candidate.metric,
            metric_label: label,
            value: candidate.value,
            comparison: candidate.comparison,
            delta_pct: candidate.delta_pct,
            kind: candidate.kind,
            window: '30d',
          }),
        ],
      );
      inserted++;
      recentKeys.add(dedupeKey);
    }

    console.log(`[perfAlerts] ${inserted} new alerts saved`);
    if (!skipSchedule) lastRunDate = today;
    return { processed: candidates.length, inserted };
  } catch (error: any) {
    console.error('[perfAlerts] Worker failed:', error.message);
    throw error;
  } finally {
    running = false;
  }
}

export async function runPerformanceAlertWorkerOnce() {
  return runPerformanceAlertWorker();
}

export async function runPerformanceAlertWorkerForTenant(tenantId: string) {
  return runPerformanceAlertWorker({ tenantId, force: true, skipSchedule: true });
}
