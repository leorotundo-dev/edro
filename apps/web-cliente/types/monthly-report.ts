export type ReportStatus = 'draft' | 'pending_approval' | 'approved' | 'published';

export type BenchmarkZone = 'below' | 'in' | 'above';

export type KPI = {
  key: string;
  label: string;
  value: number;
  previous_value: number | null;
  trend: 'up' | 'down' | 'stable';
  context: string | null;
  /** Reference range — same unit as value */
  benchmark_min?: number | null;
  benchmark_max?: number | null;
  /** Human-readable label, e.g. "Ref. B2B: 3K–9K" */
  benchmark_label?: string | null;
  /** Where the client sits vs the reference range */
  benchmark_zone?: BenchmarkZone | null;
};

export type Channel = {
  platform: string;
  label: string;
  kpis: KPI[];
};

export type FeaturedDeliverable = {
  job_id?: string;
  title: string;
  category: string;
  description: string;
  image_url?: string | null;
};

export type Priority = { title: string; description: string };
export type Risk = { description: string; owner: string };

export type DeliverableCategory = {
  label: string;
  items: string[];
};

export type BusinessImpactItem = {
  title: string;
  description: string;
};

export type Pipeline = {
  short: string | null;
  medium: string | null;
  long: string | null;
  risk_window: string | null;
};

export type ExecutiveContext = {
  execution_narrative: string;
  focus_areas: string[];
};

export type ReportSections = {
  // ── Status ───────────────────────────────────────────────────────────────
  status: {
    color: 'green' | 'yellow' | 'red';
    headline: string;
    override: boolean;
    /** Bullet points of key highlights / facts of the month */
    facts?: string[];
    /** A single "ponto de atenção" warning */
    attention?: string | null;
  };

  // ── Executive Context (accountability) ───────────────────────────────────
  /** Summary of what was executed + focus areas that shaped the month */
  executive_context?: ExecutiveContext | null;

  // ── Deliverables ──────────────────────────────────────────────────────────
  deliverables: {
    featured: FeaturedDeliverable[];
    total_count: number;
    insight: string | null;
    /** Categorised breakdown of all deliverables */
    categories?: DeliverableCategory[];
  };

  // ── Business Impact ───────────────────────────────────────────────────────
  /** How the work moved the needle on actual business outcomes */
  business_impact?: BusinessImpactItem[] | null;

  // ── Metrics ───────────────────────────────────────────────────────────────
  metrics: {
    channels: Channel[];
    insight: string | null;
    /** Contextual narrative explaining rises / drops in KPIs */
    kpi_narrative?: string | null;
  };

  // ── Next Steps ────────────────────────────────────────────────────────────
  next_steps: {
    priorities: Priority[];
    risks: Risk[];
    director_action: string | null;
    /** Short / medium / long pipeline + risk window */
    pipeline?: Pipeline | null;
  };

  // ── Synthesis ─────────────────────────────────────────────────────────────
  /** Closing paragraph that ties everything together */
  synthesis?: string | null;
};

export type MonthlyReport = {
  id: string;
  client_id: string;
  client_name: string;
  period_month: string;
  status: ReportStatus;
  sections: ReportSections;
  access_token: string;
  approved_at: string | null;
  published_at: string | null;
};
