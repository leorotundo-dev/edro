export type ReportStatus = 'draft' | 'pending_approval' | 'approved' | 'published';

export type KPI = {
  key: string;
  label: string;
  value: number;
  previous_value: number | null;
  trend: 'up' | 'down' | 'stable';
  context: string | null;
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

export type ReportSections = {
  status: { color: 'green' | 'yellow' | 'red'; headline: string; override: boolean };
  deliverables: { featured: FeaturedDeliverable[]; total_count: number; insight: string | null };
  metrics: { channels: Channel[]; insight: string | null };
  next_steps: { priorities: Priority[]; risks: Risk[]; director_action: string | null };
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
