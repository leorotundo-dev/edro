// Reportei API v2 client
// Docs: https://developers.reportei.com
// Base URL: https://app.reportei.com/api/v2

export type ReporteiConfig = {
  baseUrl?: string;
  token: string;
};

export type ReporteiMetricRequest = {
  id: string;             // UUID from GET /metrics (preferred) or reference_key as fallback
  reference_key?: string; // e.g. "ig:impressions" — set when id is a UUID
  metrics: string[];      // sub-metrics, e.g. ["value"]
  component: 'number_v1' | 'chart_v1' | 'datatable_v1';
};

export type ReporteiGetDataParams = {
  integration_id: number; // Reportei integration ID (integer)
  start: string;          // YYYY-MM-DD
  end: string;            // YYYY-MM-DD
  metrics: ReporteiMetricRequest[];
  comparison_start?: string;
  comparison_end?: string;
};

const DEFAULT_BASE_URL = 'https://app.reportei.com/api/v2';

export class ReporteiClient {
  private cfg: Required<ReporteiConfig>;

  constructor() {
    this.cfg = {
      baseUrl: process.env.REPORTEI_BASE_URL || DEFAULT_BASE_URL,
      token: process.env.REPORTEI_TOKEN || '',
    };
  }

  private resolveConfig(overrides?: Partial<ReporteiConfig>): Required<ReporteiConfig> {
    const rawToken = overrides?.token ?? this.cfg.token;
    // Strip "Bearer " prefix if the env var was set with it included
    const token = rawToken.replace(/^Bearer\s+/i, '').trim();
    return {
      baseUrl: overrides?.baseUrl ?? this.cfg.baseUrl ?? DEFAULT_BASE_URL,
      token,
    };
  }

  ok(overrides?: Partial<ReporteiConfig>): boolean {
    return !!this.resolveConfig(overrides).token;
  }

  // ── Generic HTTP helpers ──────────────────────────────────────────────────

  private static async handleRateLimit(response: Response, label: string): Promise<void> {
    const retryAfter = response.headers.get('Retry-After') ?? response.headers.get('retry-after');
    const waitSecs = retryAfter ? parseInt(retryAfter, 10) : 60;
    const waitMs = (isNaN(waitSecs) ? 60 : Math.min(waitSecs, 300)) * 1000;
    console.warn(`[reporteiClient] 429 on ${label}, waiting ${waitMs / 1000}s before retry`);
    await new Promise(r => setTimeout(r, waitMs));
  }

  async get(path: string, overrides?: Partial<ReporteiConfig>): Promise<any> {
    const cfg = this.resolveConfig(overrides);
    if (!cfg.token) throw new Error('Reportei token not configured');

    const base = cfg.baseUrl.replace(/\/$/, '');
    const url = `${base}${path}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });
      if (response.status === 429 && attempt === 0) {
        await ReporteiClient.handleRateLimit(response, `GET ${path}`);
        continue;
      }
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Reportei GET ${path} → ${response.status}: ${text}`);
      }
      try { return JSON.parse(text); } catch { return text; }
    }
  }

  async post(path: string, body: unknown, overrides?: Partial<ReporteiConfig>): Promise<any> {
    const cfg = this.resolveConfig(overrides);
    if (!cfg.token) throw new Error('Reportei token not configured');

    // connect.reportei.com is an embed product, not the data API.
    // Always use app.reportei.com/api/v2 for metrics/get-data.
    const correctBase = cfg.baseUrl.includes('connect.reportei.com')
      ? DEFAULT_BASE_URL
      : cfg.baseUrl.replace(/\/$/, '');
    const url = `${correctBase}${path}`;

    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (response.status === 429 && attempt === 0) {
        await ReporteiClient.handleRateLimit(response, `POST ${path}`);
        continue;
      }
      const text = await response.text();
      if (!response.ok) {
        throw new Error(`Reportei POST ${path} → ${response.status}: ${text}`);
      }
      try { return JSON.parse(text); } catch { return text; }
    }
  }

  // ── Reportei API v2 endpoints ─────────────────────────────────────────────

  /** Verify token and get company info */
  async getCompanySettings(overrides?: Partial<ReporteiConfig>): Promise<any> {
    return this.get('/companies/settings', overrides);
  }

  /** List projects (paginated) */
  async getProjects(params?: { page?: number; per_page?: number; q?: string }, overrides?: Partial<ReporteiConfig>): Promise<any> {
    const qs = new URLSearchParams();
    if (params?.page)     qs.set('page', String(params.page));
    if (params?.per_page) qs.set('per_page', String(params.per_page));
    if (params?.q)        qs.set('q', params.q);
    return this.get(`/projects${qs.toString() ? '?' + qs : ''}`, overrides);
  }

  /** Get a specific project */
  async getProject(projectId: string | number, overrides?: Partial<ReporteiConfig>): Promise<any> {
    return this.get(`/projects/${projectId}`, overrides);
  }

  /** List integrations, optionally filtered by project */
  async getIntegrations(params?: { project_id?: number; name?: string; slug?: string; page?: number; per_page?: number }, overrides?: Partial<ReporteiConfig>): Promise<any> {
    const qs = new URLSearchParams();
    if (params?.project_id) qs.set('project_id', String(params.project_id));
    if (params?.name)       qs.set('name', params.name);
    if (params?.slug)       qs.set('slug', params.slug);
    if (params?.page)       qs.set('page', String(params.page));
    if (params?.per_page)   qs.set('per_page', String(params.per_page));
    return this.get(`/integrations${qs.toString() ? '?' + qs : ''}`, overrides);
  }

  /** Get a specific integration */
  async getIntegration(integrationId: number, overrides?: Partial<ReporteiConfig>): Promise<any> {
    return this.get(`/integrations/${integrationId}`, overrides);
  }

  /**
   * List available metrics for an integration.
   * Requires integration_slug (e.g. "instagram_business", "facebook_ads")
   */
  async getAvailableMetrics(integrationSlug: string, overrides?: Partial<ReporteiConfig>): Promise<any> {
    return this.get(`/metrics?integration_slug=${encodeURIComponent(integrationSlug)}`, overrides);
  }

  /**
   * Fetch real metric definitions for a slug and map them to ReporteiMetricRequest[].
   * Returns null if the API call fails (caller should fall back to hardcoded defs).
   *
   * Reportei returns UUIDs as metric `id` — these are required in get-data calls.
   * We filter to only metrics whose reference_key matches one of our desired keys.
   */
  async fetchMetricDefs(
    slug: string,
    desiredKeys: string[],
    overrides?: Partial<ReporteiConfig>
  ): Promise<ReporteiMetricRequest[] | null> {
    try {
      const res = await this.getAvailableMetrics(slug, overrides);
      const items: any[] = res?.data ?? (Array.isArray(res) ? res : []);
      if (!items.length) return null;

      const keySet = new Set(desiredKeys);
      const defs: ReporteiMetricRequest[] = [];
      for (const item of items) {
        const refKey: string = item.reference_key ?? item.id ?? '';
        if (!refKey || !keySet.has(refKey)) continue;
        const uuid: string = item.id ?? refKey;
        // Use the first available sub-metric; Reportei commonly exposes "value"
        const subMetrics: string[] = Array.isArray(item.metrics) && item.metrics.length
          ? item.metrics.slice(0, 1)
          : ['value'];
        const component = item.component ?? 'number_v1';
        defs.push({ id: uuid, metrics: subMetrics, component });
      }
      return defs.length ? defs : null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch aggregated metric values for an integration + date range.
   * Rate limit: 30 req/min.
   *
   * Reportei v2 may require the token both as Bearer header AND in the body.
   * We include it in both places for compatibility.
   */
  async getMetricsData(params: ReporteiGetDataParams, overrides?: Partial<ReporteiConfig>): Promise<any> {
    // Reportei API v2: `id` = UUID from /metrics endpoint, `reference_key` = the string key
    // When using hardcoded defs (id IS the reference_key), send it in both fields.
    const body = {
      ...params,
      metrics: params.metrics.map(m => ({
        id: m.id,
        reference_key: m.reference_key ?? m.id,
        metrics: m.metrics,
        component: m.component,
      })),
    };
    return this.post('/metrics/get-data', body, overrides);
  }
}

// ── Preset metric sets by platform slug ──────────────────────────────────────
// reference_key format: "{platform_slug}:{metric_name}"
// These are common slugs — actual available metrics depend on the integration.

export const INSTAGRAM_METRICS: ReporteiMetricRequest[] = [
  { id: 'ig:impressions',            metrics: ['value'], component: 'number_v1' },
  { id: 'ig:reach',                  metrics: ['value'], component: 'number_v1' },
  { id: 'ig:followers_count',        metrics: ['value'], component: 'number_v1' },
  { id: 'ig:new_followers_count',    metrics: ['value'], component: 'number_v1' },
  { id: 'ig:feed_engagement',        metrics: ['value'], component: 'number_v1' },
  { id: 'ig:feed_engagement_rate',   metrics: ['value'], component: 'number_v1' },
];

export const LINKEDIN_METRICS: ReporteiMetricRequest[] = [
  { id: 'li:impressions',            metrics: ['value'], component: 'number_v1' },
  { id: 'li:unique_impressions',     metrics: ['value'], component: 'number_v1' },
  { id: 'li:engagement',             metrics: ['value'], component: 'number_v1' },
  { id: 'li:engagement_rate',        metrics: ['value'], component: 'number_v1' },
  { id: 'li:followers_count',        metrics: ['value'], component: 'number_v1' },
];

export const META_ADS_METRICS: ReporteiMetricRequest[] = [
  { id: 'fb_ads:impressions',        metrics: ['value'], component: 'number_v1' },
  { id: 'fb_ads:reach',              metrics: ['value'], component: 'number_v1' },
  { id: 'fb_ads:clicks',             metrics: ['value'], component: 'number_v1' },
  { id: 'fb_ads:ctr',                metrics: ['value'], component: 'number_v1' },
  { id: 'fb_ads:cpc',                metrics: ['value'], component: 'number_v1' },
  { id: 'fb_ads:spend',              metrics: ['value'], component: 'number_v1' },
  { id: 'fb_ads:conversions',        metrics: ['value'], component: 'number_v1' },
];

export const GOOGLE_ADS_METRICS: ReporteiMetricRequest[] = [
  { id: 'ga_ads:impressions',   metrics: ['value'], component: 'number_v1' },
  { id: 'ga_ads:clicks',        metrics: ['value'], component: 'number_v1' },
  { id: 'ga_ads:ctr',           metrics: ['value'], component: 'number_v1' },
  { id: 'ga_ads:cpc',           metrics: ['value'], component: 'number_v1' },
  { id: 'ga_ads:cost',          metrics: ['value'], component: 'number_v1' },
  { id: 'ga_ads:conversions',   metrics: ['value'], component: 'number_v1' },
];

export const GOOGLE_ANALYTICS_METRICS: ReporteiMetricRequest[] = [
  { id: 'ga_4:sessions',             metrics: ['value'], component: 'number_v1' },
  { id: 'ga_4:new_users',            metrics: ['value'], component: 'number_v1' },
  { id: 'ga_4:pageviews',            metrics: ['value'], component: 'number_v1' },
  { id: 'ga_4:bounce_rate',          metrics: ['value'], component: 'number_v1' },
  { id: 'ga_4:avg_session_duration', metrics: ['value'], component: 'number_v1' },
];

export const PLATFORM_METRICS: Record<string, ReporteiMetricRequest[]> = {
  Instagram:       INSTAGRAM_METRICS,
  LinkedIn:        LINKEDIN_METRICS,
  MetaAds:         META_ADS_METRICS,
  FacebookAds:     META_ADS_METRICS,
  GoogleAds:       GOOGLE_ADS_METRICS,
  GoogleAnalytics: GOOGLE_ANALYTICS_METRICS,
};
