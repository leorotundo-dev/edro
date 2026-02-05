type ReporteiConfig = {
  baseUrl: string;
  token: string;
};

export class ReporteiClient {
  private cfg: ReporteiConfig;

  constructor() {
    this.cfg = {
      baseUrl: process.env.REPORTEI_BASE_URL || '',
      token: process.env.REPORTEI_TOKEN || '',
    };
  }

  private resolveConfig(overrides?: Partial<ReporteiConfig>) {
    return {
      baseUrl: overrides?.baseUrl ?? this.cfg.baseUrl,
      token: overrides?.token ?? this.cfg.token,
    };
  }

  ok(overrides?: Partial<ReporteiConfig>) {
    const cfg = this.resolveConfig(overrides);
    return !!cfg.baseUrl && !!cfg.token;
  }

  async get(path: string, overrides?: Partial<ReporteiConfig>) {
    const cfg = this.resolveConfig(overrides);
    if (!cfg.baseUrl || !cfg.token) {
      throw new Error('Reportei not configured');
    }

    const url = `${cfg.baseUrl.replace(/\/$/, '')}${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`Reportei GET ${path} failed: ${response.status} ${text}`);
    }
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
}
