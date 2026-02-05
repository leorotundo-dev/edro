import type { PerformanceProvider, PerformanceBreakdown, TimeWindow, KPI } from '../contracts';
import type { ClientProfile, Platform } from '../../types';
import { ReporteiClient } from './reporteiClient';
import { getReporteiConnector } from './reporteiConnector';

function normalizeKPI(metric: string, value: any): KPI | null {
  const v = Number(value);
  if (Number.isNaN(v)) return null;

  const map: Record<string, KPI['metric']> = {
    impressions: 'impressions',
    reach: 'reach',
    engagement: 'engagements',
    engagement_rate: 'engagement_rate',
    clicks: 'clicks',
    ctr: 'ctr',
    cpc: 'cpc',
    cpm: 'cpm',
    conversions: 'conversions',
    cost: 'cost',
  };

  const m = map[metric] ?? null;
  if (!m) return null;

  return { metric: m, value: v };
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

    const baseUrl = connector?.baseUrl || process.env.REPORTEI_BASE_URL || '';
    const token = connector?.token || process.env.REPORTEI_TOKEN || '';

    if (!this.client.ok({ baseUrl, token })) {
      return {
        platform: params.platform,
        window: params.window,
        by_format: [],
        by_tag: [],
        observed_at: new Date().toISOString(),
        raw: { warning: 'Reportei not configured' },
      };
    }

    const reporteiAccountId =
      connector?.accountId || (params.client as any).reportei_account_id;
    if (!reporteiAccountId) {
      return {
        platform: params.platform,
        window: params.window,
        by_format: [],
        by_tag: [],
        observed_at: new Date().toISOString(),
        raw: { warning: 'client missing reportei_account_id' },
      };
    }

    let raw: any;
    try {
      raw = await this.client.get(
        `/v1/accounts/${reporteiAccountId}/performance?platform=${params.platform}&window=${params.window}`,
        { baseUrl, token }
      );
    } catch (error: any) {
      return {
        platform: params.platform,
        window: params.window,
        by_format: [],
        by_tag: [],
        observed_at: new Date().toISOString(),
        raw: { warning: 'Reportei request failed', error: error?.message ?? String(error) },
      };
    }

    const by_format = (raw.by_format ?? []).map((item: any) => ({
      format: String(item.format),
      score: Number(item.score ?? 50),
      kpis: Object.entries(item.kpis ?? {})
        .map(([key, value]) => normalizeKPI(key, value))
        .filter(Boolean) as KPI[],
      notes: item.notes ?? [],
    }));

    const by_tag = (raw.by_tag ?? []).map((item: any) => ({
      tag: String(item.tag).toLowerCase(),
      score: Number(item.score ?? 50),
      kpis: Object.entries(item.kpis ?? {})
        .map(([key, value]) => normalizeKPI(key, value))
        .filter(Boolean) as KPI[],
    }));

    return {
      platform: params.platform,
      window: params.window,
      by_format,
      by_tag,
      editorial_insights: raw.editorial_insights ?? [],
      observed_at: new Date().toISOString(),
      raw,
    };
  }
}
