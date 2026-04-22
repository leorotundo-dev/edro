import { query, pool } from '../db/db';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportStatus = 'draft' | 'pending_approval' | 'approved' | 'published';

type TrendDirection = 'up' | 'down' | 'stable';

interface KpiEntry {
  key: string;
  label: string;
  value: number;
  previous_value: number | null;
  trend: TrendDirection;
  context: null;
}

interface ChannelMetrics {
  platform: string;
  label: string;
  kpis: KpiEntry[];
}

interface ReportSections {
  status: {
    color: 'green' | 'yellow' | 'red';
    headline: string;
    override: boolean;
  };
  deliverables: {
    featured: unknown[];
    total_count: number;
    insight: null;
  };
  metrics: {
    channels: ChannelMetrics[];
    insight: null;
  };
  next_steps: {
    priorities: unknown[];
    risks: unknown[];
    director_action: null;
  };
}

interface MonthlyReport {
  id: string;
  tenant_id: string;
  client_id: string;
  period_month: string;
  title: string;
  status: ReportStatus;
  sections: ReportSections;
  auto_data: unknown;
  approved_by: string | null;
  approved_at: string | null;
  published_at: string | null;
  access_token: string;
  client_name: string | null;
  generated_at: string;
}

interface JobRow {
  id: string;
  title: string;
  job_type: string | null;
  channel: string | null;
  status: string;
  owner_name: string | null;
  completed_at: string | null;
  updated_at: string | null;
}

interface MetricSnapshotRow {
  platform: string;
  metrics: Record<string, unknown>;
  period_start: string;
  period_end: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function periodBounds(periodMonth: string): { start: Date; end: Date } {
  const [year, month] = periodMonth.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
}

function previousPeriod(periodMonth: string): string {
  const [year, month] = periodMonth.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 2, 1));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  linkedin:  'LinkedIn',
  facebook:  'Facebook',
};

const KPI_KEYS = [
  { key: 'reach',              label: 'Alcance',       aliases: ['reach'] },
  { key: 'engagements',        label: 'Engajamentos',  aliases: ['engagements', 'feed_engagement', 'engagement'] },
  { key: 'followers_count',    label: 'Novos seguidores', aliases: ['followers_count', 'new_followers_count', 'follower_count'] },
];

function extractKpiValue(metrics: Record<string, unknown>, aliases: string[]): number | null {
  for (const alias of aliases) {
    const val = metrics[alias];
    if (val !== undefined && val !== null) {
      const n = Number(val);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

function computeTrend(current: number, previous: number | null): TrendDirection {
  if (previous === null) return 'stable';
  if (current > previous * 1.02) return 'up';
  if (current < previous * 0.98) return 'down';
  return 'stable';
}

function buildChannelMetrics(
  snapshots: MetricSnapshotRow[],
  prevSnapshots: MetricSnapshotRow[],
): ChannelMetrics[] {
  // Group by platform, keep the latest snapshot per platform
  const byPlatform = new Map<string, MetricSnapshotRow>();
  for (const snap of snapshots) {
    if (!byPlatform.has(snap.platform)) {
      byPlatform.set(snap.platform, snap);
    }
  }

  const prevByPlatform = new Map<string, MetricSnapshotRow>();
  for (const snap of prevSnapshots) {
    if (!prevByPlatform.has(snap.platform)) {
      prevByPlatform.set(snap.platform, snap);
    }
  }

  const channels: ChannelMetrics[] = [];

  for (const [platform, snap] of byPlatform) {
    const label = PLATFORM_LABELS[platform] ?? platform;
    const prevSnap = prevByPlatform.get(platform);

    const kpis: KpiEntry[] = [];
    for (const kpiDef of KPI_KEYS) {
      const value = extractKpiValue(snap.metrics, kpiDef.aliases);
      if (value === null) continue;

      const previous_value = prevSnap
        ? extractKpiValue(prevSnap.metrics, kpiDef.aliases)
        : null;

      kpis.push({
        key:            kpiDef.key,
        label:          kpiDef.label,
        value,
        previous_value,
        trend:          computeTrend(value, previous_value),
        context:        null,
      });
    }

    if (kpis.length > 0) {
      channels.push({ platform, label, kpis });
    }
  }

  return channels;
}

function buildSections(jobs: JobRow[], snapshots: MetricSnapshotRow[], prevSnapshots: MetricSnapshotRow[]): ReportSections {
  let statusColor: 'green' | 'yellow' | 'red';
  if (jobs.length === 0) {
    statusColor = 'red';
  } else if (jobs.length <= 2) {
    statusColor = 'yellow';
  } else {
    statusColor = 'green';
  }

  const channels = buildChannelMetrics(snapshots, prevSnapshots);

  return {
    status: {
      color:    statusColor,
      headline: '',
      override: false,
    },
    deliverables: {
      featured:    [],
      total_count: jobs.length,
      insight:     null,
    },
    metrics: {
      channels,
      insight: null,
    },
    next_steps: {
      priorities:      [],
      risks:           [],
      director_action: null,
    },
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function autoGenerateReport(
  clientId: string,
  periodMonth: string,
  tenantId: string,
): Promise<MonthlyReport> {
  const { start, end } = periodBounds(periodMonth);
  const prevMonth       = previousPeriod(periodMonth);
  const { start: prevStart, end: prevEnd } = periodBounds(prevMonth);

  const startIso    = start.toISOString();
  const endIso      = end.toISOString();
  const prevStartIso = prevStart.toISOString();
  const prevEndIso   = prevEnd.toISOString();

  const [jobsRes, snapshotsRes, prevSnapshotsRes, clientRes] = await Promise.all([
    query<JobRow>(
      `SELECT id, title, job_type, channel, status, owner_name, completed_at, updated_at
       FROM edro_jobs
       WHERE client_id = $1
         AND tenant_id = $2
         AND status IN ('done','published','approved','awaiting_approval')
         AND (
           (completed_at >= $3 AND completed_at <= $4)
           OR (completed_at IS NULL AND updated_at >= $3 AND updated_at <= $4)
         )
       ORDER BY completed_at DESC NULLS LAST`,
      [clientId, tenantId, startIso, endIso],
    ),
    query<MetricSnapshotRow>(
      `SELECT platform, metrics, period_start, period_end
       FROM reportei_metric_snapshots
       WHERE client_id = $1
         AND period_start >= $2
         AND period_end <= $3
       ORDER BY platform, period_end DESC`,
      [clientId, startIso, endIso],
    ),
    query<MetricSnapshotRow>(
      `SELECT platform, metrics, period_start, period_end
       FROM reportei_metric_snapshots
       WHERE client_id = $1
         AND period_start >= $2
         AND period_end <= $3
       ORDER BY platform, period_end DESC`,
      [clientId, prevStartIso, prevEndIso],
    ),
    query<{ name: string }>(
      `SELECT name FROM clients WHERE id = $1 LIMIT 1`,
      [clientId],
    ),
  ]);

  const jobs         = jobsRes.rows;
  const snapshots    = snapshotsRes.rows;
  const prevSnapshots = prevSnapshotsRes.rows;
  const clientName   = clientRes.rows[0]?.name ?? null;

  const sections  = buildSections(jobs, snapshots, prevSnapshots);
  const autoData  = { jobs_snapshot: jobs, snapshots_raw: snapshots };
  const title     = `Relatório ${periodMonth}`;

  const { rows } = await query<MonthlyReport>(
    `INSERT INTO client_monthly_reports
       (tenant_id, client_id, period_month, title, status, sections, auto_data, client_name)
     VALUES ($1, $2, $3, $4, 'draft', $5::jsonb, $6::jsonb, $7)
     ON CONFLICT (client_id, period_month) DO UPDATE SET
       auto_data   = EXCLUDED.auto_data,
       client_name = EXCLUDED.client_name,
       title       = EXCLUDED.title,
       sections    = CASE
                       WHEN client_monthly_reports.status = 'draft'
                       THEN EXCLUDED.sections
                       ELSE client_monthly_reports.sections
                     END
     RETURNING *`,
    [tenantId, clientId, periodMonth, title, JSON.stringify(sections), JSON.stringify(autoData), clientName],
  );

  return rows[0];
}

export async function getReport(
  clientId: string,
  periodMonth: string,
  tenantId: string,
): Promise<MonthlyReport | null> {
  const { rows } = await query<MonthlyReport>(
    `SELECT * FROM client_monthly_reports
     WHERE client_id = $1 AND period_month = $2 AND tenant_id = $3
     LIMIT 1`,
    [clientId, periodMonth, tenantId],
  );
  return rows[0] ?? null;
}

export async function updateReport(
  id: string,
  sections: ReportSections,
  tenantId: string,
): Promise<MonthlyReport | null> {
  const { rows } = await query<MonthlyReport>(
    `UPDATE client_monthly_reports
     SET sections = $1::jsonb
     WHERE id = $2 AND tenant_id = $3
     RETURNING *`,
    [JSON.stringify(sections), id, tenantId],
  );
  return rows[0] ?? null;
}

export async function submitForApproval(
  id: string,
  tenantId: string,
): Promise<MonthlyReport | null> {
  const { rows } = await query<MonthlyReport>(
    `UPDATE client_monthly_reports
     SET status = 'pending_approval'
     WHERE id = $1 AND tenant_id = $2 AND status = 'draft'
     RETURNING *`,
    [id, tenantId],
  );
  return rows[0] ?? null;
}

export async function approveReport(
  id: string,
  approvedBy: string,
  tenantId: string,
): Promise<MonthlyReport | null> {
  const { rows } = await query<MonthlyReport>(
    `UPDATE client_monthly_reports
     SET status = 'approved', approved_by = $1, approved_at = NOW()
     WHERE id = $2 AND tenant_id = $3 AND status = 'pending_approval'
     RETURNING *`,
    [approvedBy, id, tenantId],
  );
  return rows[0] ?? null;
}

export async function publishReport(
  id: string,
  tenantId: string,
): Promise<MonthlyReport | null> {
  const { rows } = await query<MonthlyReport>(
    `UPDATE client_monthly_reports
     SET status = 'published', published_at = NOW()
     WHERE id = $1 AND tenant_id = $2 AND status = 'approved'
     RETURNING *`,
    [id, tenantId],
  );
  return rows[0] ?? null;
}

export async function getReportByToken(token: string): Promise<MonthlyReport | null> {
  const { rows } = await query<MonthlyReport>(
    `SELECT cmr.*, c.name AS client_name
     FROM client_monthly_reports cmr
     LEFT JOIN clients c ON c.id = cmr.client_id
     WHERE cmr.access_token = $1
       AND cmr.status = 'published'
     LIMIT 1`,
    [token],
  );
  return rows[0] ?? null;
}

export async function listReports(
  tenantId: string,
  filters?: { clientId?: string; status?: string; limit?: number },
): Promise<MonthlyReport[]> {
  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[]    = [tenantId];
  let idx = 2;

  if (filters?.clientId) {
    conditions.push(`client_id = $${idx++}`);
    params.push(filters.clientId);
  }

  if (filters?.status) {
    conditions.push(`status = $${idx++}`);
    params.push(filters.status);
  }

  const limit = filters?.limit ?? 50;
  params.push(limit);

  const { rows } = await query<MonthlyReport>(
    `SELECT * FROM client_monthly_reports
     WHERE ${conditions.join(' AND ')}
     ORDER BY period_month DESC, generated_at DESC
     LIMIT $${idx}`,
    params,
  );

  return rows;
}
