// Reportei API v2 client
// Docs: https://developers.reportei.com
// Base URL: https://app.reportei.com/api/v2

export type ReporteiConfig = {
  baseUrl?: string;
  token: string;
};

export type ReporteiMetricRequest = {
  id: string;             // reference_key, e.g. "ig:impressions"
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

  async get(path: string, overrides?: Partial<ReporteiConfig>): Promise<any> {
    const cfg = this.resolveConfig(overrides);
    if (!cfg.token) throw new Error('Reportei token not configured');

    const base = cfg.baseUrl.replace(/\/$/, '');
    const url = `${base}${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Reportei GET ${path} → ${response.status}: ${text}`);
    }
    try { return JSON.parse(text); } catch { return text; }
  }

  async post(path: string, body: unknown, overrides?: Partial<ReporteiConfig>): Promise<any> {
    const cfg = this.resolveConfig(overrides);
    if (!cfg.token) throw new Error('Reportei token not configured');

    const base = cfg.baseUrl.replace(/\/$/, '');
    // Try both with and without token as query param (different Reportei API versions differ)
    const url = `${base}${path}`;
    const urlWithToken = `${url}?api_key=${encodeURIComponent(cfg.token)}`;

    console.log(`[reportei] POST ${url} token_len=${cfg.token.length} token_start=${cfg.token.slice(0, 6)}`);

    // First attempt: Bearer header only
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    // Fallback: also send token as query param if 401
    if (response.status === 401) {
      console.log(`[reportei] Bearer 401 — retrying with ?api_key query param`);
      response = await fetch(urlWithToken, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cfg.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      });
    }

    const text = await response.text();
    console.log(`[reportei] POST ${path} → ${response.status}`);
    if (!response.ok) {
      throw new Error(`Reportei POST ${path} → ${response.status}: ${text}`);
    }
    try { return JSON.parse(text); } catch { return text; }
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
   * Requires integration_slug (e.g. "instagram", "facebook_ads")
   */
  async getAvailableMetrics(integrationSlug: string, overrides?: Partial<ReporteiConfig>): Promise<any> {
    return this.get(`/metrics?integration_slug=${encodeURIComponent(integrationSlug)}`, overrides);
  }

  /**
   * Fetch aggregated metric values for an integration + date range.
   * Rate limit: 30 req/min.
   *
   * Reportei v2 may require the token both as Bearer header AND in the body.
   * We include it in both places for compatibility.
   */
  async getMetricsData(params: ReporteiGetDataParams, overrides?: Partial<ReporteiConfig>): Promise<any> {
    const cfg = this.resolveConfig(overrides);
    // Some Reportei API versions require the token in the request body as well
    return this.post('/metrics/get-data', { ...params, token: cfg.token }, overrides);
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
  { id: 'fb:impressions',            metrics: ['value'], component: 'number_v1' },
  { id: 'fb:reach',                  metrics: ['value'], component: 'number_v1' },
  { id: 'fb:clicks',                 metrics: ['value'], component: 'number_v1' },
  { id: 'fb:ctr',                    metrics: ['value'], component: 'number_v1' },
  { id: 'fb:cpc',                    metrics: ['value'], component: 'number_v1' },
  { id: 'fb:spend',                  metrics: ['value'], component: 'number_v1' },
  { id: 'fb:conversions',            metrics: ['value'], component: 'number_v1' },
];

export const PLATFORM_METRICS: Record<string, ReporteiMetricRequest[]> = {
  Instagram:   INSTAGRAM_METRICS,
  LinkedIn:    LINKEDIN_METRICS,
  MetaAds:     META_ADS_METRICS,
  FacebookAds: META_ADS_METRICS,
};
