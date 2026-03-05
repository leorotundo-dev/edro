import type { PerformanceProvider, PerformanceBreakdown, TimeWindow, KPI } from '../contracts';
import type { ClientProfile, Platform } from '../../types';
import { ReporteiClient, PLATFORM_METRICS } from './reporteiClient';
import { getReporteiConnector } from './reporteiConnector';

// ── Window → date range ───────────────────────────────────────────────────────
function windowToDates(window: string): { start: string; end: string } {
  const end = new Date();
  const start = new Date(end);
  const match = window.match(/^(\d+)d$/);
  if (match) {
    start.setDate(start.getDate() - parseInt(match[1], 10));
  } else {
    start.setDate(start.getDate() - 30);
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

// ── Map metric id to KPI metric name ─────────────────────────────────────────
const METRIC_MAP: Record<string, KPI['metric']> = {
  'ig:impressions':          'impressions',
  'ig:reach':                'reach',
  'ig:feed_engagement':      'engagements',
  'ig:feed_engagement_rate': 'engagement_rate',
  'ig:followers_count':      'reach',
  'ig:new_followers_count':  'reach',
  'li:impressions':          'impressions',
  'li:unique_impressions':   'reach',
  'li:engagement':           'engagements',
  'li:engagement_rate':      'engagement_rate',
  'li:followers_count':      'reach',
  'fb:impressions':          'impressions',
  'fb:reach':                'reach',
  'fb:clicks':               'clicks',
  'fb:ctr':                  'ctr',
  'fb:cpc':                  'cpc',
  'fb:spend':                'cost',
  'fb:conversions':          'conversions',
};

function extractKPIs(metricsData: any[]): KPI[] {
  const kpis: KPI[] = [];
  for (const item of metricsData ?? []) {
    const refKey: string = item.id ?? item.reference_key ?? '';
    const mapped = METRIC_MAP[refKey];
    if (!mapped) continue;
    const value = item.data?.value ?? item.value ?? null;
    if (value == null || isNaN(Number(value))) continue;
    kpis.push({ metric: mapped, value: Number(value) });
  }
  return kpis;
}

function buildBreakdown(
  platform: Platform,
  window: TimeWindow,
  kpis: KPI[],
  raw: any
): PerformanceBreakdown {
  return {
    platform,
    window,
    by_format: [{ format: 'all', score: 50, kpis, notes: [] }],
    by_tag: [],
    editorial_insights: [],
    observed_at: new Date().toISOString(),
    raw,
  };
}

export class ReporteiPerformanceProvider implements PerformanceProvider {
  name = 'reportei_performance';
  private client = new ReporteiClient();

  async health() {
    return { ok: this.client.ok() };
  }

  async getPerformance(params: {
    client: ClientProfile;
    platform: Platform;
    window: TimeWindow;
  }): Promise<PerformanceBreakdown> {
    const tenantId = params.client?.tenant_id;
    const connector =
      tenantId && params.client?.id
        ? await getReporteiConnector(tenantId, params.client.id)
        : null;

    const token = connector?.token || process.env.REPORTEI_TOKEN || '';
    if (!token) {
      return buildBreakdown(params.platform, params.window, [], { warning: 'Reportei token not configured' });
    }

    const integrationId =
      connector?.integrationId ||
      (params.client as any).reportei_integration_id ||
      (params.client as any).reportei_account_id;

    if (!integrationId) {
      return buildBreakdown(params.platform, params.window, [], { warning: 'client missing reportei integration_id' });
    }

    const metricDefs = PLATFORM_METRICS[params.platform];
    if (!metricDefs?.length) {
      return buildBreakdown(params.platform, params.window, [], { warning: `No metric definitions for platform: ${params.platform}` });
    }

    const overrides = { baseUrl: connector?.baseUrl, token };
    const { start, end } = windowToDates(params.window as string);

    let raw: any;
    try {
      raw = await this.client.getMetricsData(
        { integration_id: Number(integrationId), start, end, metrics: metricDefs },
        overrides
      );
    } catch (error: any) {
      return buildBreakdown(params.platform, params.window, [], {
        warning: 'Reportei request failed',
        error: error?.message ?? String(error),
      });
    }

    const metricsArray: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.metrics ?? []);
    const kpis = extractKPIs(metricsArray);
    return buildBreakdown(params.platform, params.window, kpis, raw);
  }
}
