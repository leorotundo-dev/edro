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

export async function runPerformanceAlertWorkerOnce() {
  if (running) return;
  if (!shouldRunToday()) return;
  running = true;

  try {
    await ensureNotificationLogsTable();

    // Fetch latest 30d snapshots for all clients
    const { rows: snapshots } = await query<any>(`
      SELECT s.client_id, s.tenant_id, s.platform, s.metrics, c.name AS client_name
      FROM reportei_metric_snapshots s
      JOIN clients c ON c.id = s.client_id
      WHERE s.time_window = '30d'
        AND s.synced_at > NOW() - INTERVAL '8 days'
    `).catch(() => ({ rows: [] }));

    if (!snapshots.length) {
      console.log('[perfAlerts] No recent snapshots found, skipping');
      return;
    }

    const candidates: AlertCandidate[] = [];

    for (const snap of snapshots) {
      const metrics = snap.metrics as Record<string, { value: number; comparison: number; delta_pct: number }>;
      const monitored = MONITORED_METRICS[snap.platform] ?? [];

      for (const metricKey of monitored) {
        const m = metrics[metricKey];
        if (!m || m.value == null || m.comparison == null || m.delta_pct == null) continue;

        const delta = m.delta_pct / 100; // stored as percentage
        if (delta <= DROP_THRESHOLD) {
          candidates.push({
            client_id: snap.client_id,
            client_name: snap.client_name,
            tenant_id: snap.tenant_id,
            platform: snap.platform,
            metric: metricKey,
            value: m.value,
            comparison: m.comparison,
            delta_pct: m.delta_pct,
            kind: 'drop',
          });
        } else if (delta >= SPIKE_THRESHOLD) {
          candidates.push({
            client_id: snap.client_id,
            client_name: snap.client_name,
            tenant_id: snap.tenant_id,
            platform: snap.platform,
            metric: metricKey,
            value: m.value,
            comparison: m.comparison,
            delta_pct: m.delta_pct,
            kind: 'spike',
          });
        }
      }
    }

    console.log(`[perfAlerts] ${candidates.length} alerts detected across ${snapshots.length} snapshots`);

    // Deduplicate: one alert per (client, platform, metric) per week
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { rows: recentAlerts } = await query<any>(
      `SELECT payload->>'client_id' AS client_id, payload->>'metric' AS metric
       FROM notification_logs
       WHERE type IN ('perf_drop', 'perf_spike')
         AND sent_at > $1`,
      [sevenDaysAgo.toISOString()]
    ).catch(() => ({ rows: [] }));

    const recentKeys = new Set(recentAlerts.map((r: any) => `${r.client_id}:${r.metric}`));

    let inserted = 0;
    for (const c of candidates) {
      const dedupeKey = `${c.client_id}:${c.metric}`;
      if (recentKeys.has(dedupeKey)) continue;

      const label = METRIC_LABELS[c.metric] ?? c.metric;
      const directionText = c.kind === 'drop'
        ? `queda de ${Math.abs(c.delta_pct).toFixed(1)}%`
        : `alta de ${c.delta_pct.toFixed(1)}%`;

      const title = c.kind === 'drop'
        ? `Queda detectada: ${label} em ${c.client_name}`
        : `Pico detectado: ${label} em ${c.client_name}`;

      const body = `${c.client_name} registrou ${directionText} em ${label} (${c.platform}) nos últimos 30 dias. `
        + `Período atual: ${c.value?.toLocaleString('pt-BR') ?? '—'} vs anterior: ${c.comparison?.toLocaleString('pt-BR') ?? '—'}.`;

      await query(
        `INSERT INTO notification_logs (tenant_id, client_id, type, severity, title, body, payload)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb)`,
        [
          c.tenant_id,
          c.client_id,
          c.kind === 'drop' ? 'perf_drop' : 'perf_spike',
          c.kind === 'drop' ? 'warning' : 'info',
          title,
          body,
          JSON.stringify({
            client_id: c.client_id,
            client_name: c.client_name,
            platform: c.platform,
            metric: c.metric,
            metric_label: label,
            value: c.value,
            comparison: c.comparison,
            delta_pct: c.delta_pct,
            kind: c.kind,
            window: '30d',
          }),
        ]
      );
      inserted++;
      recentKeys.add(dedupeKey);
    }

    console.log(`[perfAlerts] ${inserted} new alerts saved`);
  } catch (e: any) {
    console.error('[perfAlerts] Worker failed:', e.message);
  } finally {
    running = false;
  }
}
