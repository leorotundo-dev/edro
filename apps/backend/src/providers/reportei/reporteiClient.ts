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

  ok() {
    return !!this.cfg.baseUrl && !!this.cfg.token;
  }

  async get(path: string) {
    const url = `${this.cfg.baseUrl.replace(/\/$/, '')}${path}`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.cfg.token}`,
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
