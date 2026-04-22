import { query, pool } from '../db/db';
import { generateCompletion } from './ai/claudeService';

// ─── Types ────────────────────────────────────────────────────────────────────

type ReportStatus = 'draft' | 'pending_approval' | 'approved' | 'published';

type TrendDirection = 'up' | 'down' | 'stable';

type BenchmarkZone = 'below' | 'in' | 'above';

interface KpiEntry {
  key: string;
  label: string;
  value: number;
  previous_value: number | null;
  trend: TrendDirection;
  context: null;
  /** Reference range min value (same unit as value) */
  benchmark_min: number | null;
  /** Reference range max value (same unit as value) */
  benchmark_max: number | null;
  /** Human-readable label, e.g. "Ref. B2B: 1.5–4%" */
  benchmark_label: string | null;
  /** Where the client sits relative to the reference range */
  benchmark_zone: BenchmarkZone | null;
}

interface ChannelMetrics {
  platform: string;
  label: string;
  kpis: KpiEntry[];
}

interface Priority {
  title: string;
  description: string;
}

interface Risk {
  description: string;
  owner: string;
}

interface DeliverableCategory {
  label: string;
  items: string[];
}

interface BusinessImpactItem {
  title: string;
  description: string;
}

interface Pipeline {
  short: string | null;
  medium: string | null;
  long: string | null;
  risk_window: string | null;
}

interface ExecutiveContext {
  execution_narrative: string;
  focus_areas: string[];
}

interface ReportSections {
  status: {
    color: 'green' | 'yellow' | 'red';
    headline: string;
    override: boolean;
    facts: string[];
    attention: string | null;
  };
  executive_context: ExecutiveContext | null;
  deliverables: {
    featured: unknown[];
    total_count: number;
    categories: DeliverableCategory[];
    insight: string | null;
  };
  business_impact: BusinessImpactItem[] | null;
  metrics: {
    channels: ChannelMetrics[];
    insight: string | null;
    kpi_narrative: string | null;
  };
  next_steps: {
    priorities: Priority[];
    risks: Risk[];
    director_action: string | null;
    pipeline: Pipeline | null;
  };
  synthesis: string | null;
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
        key:             kpiDef.key,
        label:           kpiDef.label,
        value,
        previous_value,
        trend:           computeTrend(value, previous_value),
        context:         null,
        benchmark_min:   null,
        benchmark_max:   null,
        benchmark_label: null,
        benchmark_zone:  null,
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
      color:     statusColor,
      headline:  '',
      override:  false,
      facts:     [],
      attention: null,
    },
    executive_context: null,
    deliverables: {
      featured:    [],
      total_count: jobs.length,
      categories:  [],
      insight:     null,
    },
    business_impact: null,
    metrics: {
      channels,
      insight:       null,
      kpi_narrative: null,
    },
    next_steps: {
      priorities:      [] as Priority[],
      risks:           [] as Risk[],
      director_action: null,
      pipeline:        null,
    },
    synthesis: null,
  };
}

// ─── AI Enrichment ────────────────────────────────────────────────────────────

function periodLabel(periodMonth: string): string {
  const [y, m] = periodMonth.split('-').map(Number);
  const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('pt-BR', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

async function enrichSectionsWithAI(
  sections: ReportSections,
  jobs: JobRow[],
  periodMonth: string,
): Promise<ReportSections> {
  const channels = sections.metrics.channels;
  const hasData  = jobs.length > 0 || channels.length > 0;
  if (!hasData) return sections;

  const period = periodLabel(periodMonth);

  // ── Build context block ──────────────────────────────────────────────────
  const contextLines: string[] = [
    `Período: ${period}`,
    `Total de entregas concluídas: ${jobs.length}`,
  ];

  if (jobs.length > 0) {
    const byType: Record<string, string[]> = {};
    for (const j of jobs) {
      const t = j.job_type ?? 'Outros';
      if (!byType[t]) byType[t] = [];
      byType[t].push(j.title);
    }
    for (const [type, titles] of Object.entries(byType)) {
      contextLines.push(`  ${type}: ${titles.join(', ')}`);
    }
  }

  if (channels.length > 0) {
    contextLines.push('\nMétricas por canal:');
    for (const ch of channels) {
      const kpiStr = ch.kpis
        .map((k) => {
          const prevTxt = k.previous_value !== null
            ? `, ant: ${k.previous_value.toLocaleString('pt-BR')}`
            : '';
          return `${k.label}: ${k.value.toLocaleString('pt-BR')}${prevTxt} (${k.trend})`;
        })
        .join('; ');
      contextLines.push(`  ${ch.label}: ${kpiStr}`);
    }
  } else {
    contextLines.push('\nMétricas de canal: não disponíveis neste período');
  }

  const context = contextLines.join('\n');

  const prompt = `Você é o analista estratégico sênior de uma agência de comunicação digital de alto desempenho.
Com base nos dados reais abaixo, gere o conteúdo completo de um relatório executivo mensal para o cliente.

DADOS DO MÊS:
${context}

Responda APENAS com JSON válido, sem markdown, no seguinte formato:
{
  "headline": "síntese executiva do mês em 1 frase impactante (máx. 110 chars)",
  "status_facts": [
    "fato relevante 1 (ex: 'X entregas concluídas com foco em Y')",
    "fato relevante 2",
    "fato relevante 3"
  ],
  "status_attention": "1 frase sobre o principal ponto de atenção ou risco operacional (null se tudo verde)",
  "execution_narrative": "2-3 frases descrevendo como foi a execução do mês — o que foi priorizado, como a equipe atuou e qual foi o resultado geral",
  "focus_areas": [
    "área estratégica 1 que guiou o mês (ex: 'Expansão B2B')",
    "área estratégica 2",
    "área estratégica 3"
  ],
  "deliverable_categories": [
    {
      "label": "Nome da categoria (ex: 'Infraestrutura', 'Conteúdo Orgânico', 'Materiais Comerciais')",
      "items": ["item 1", "item 2"]
    }
  ],
  "business_impact": [
    {
      "title": "Título do impacto (ex: 'Redução de Custo Operacional')",
      "description": "1-2 frases explicando o impacto real no negócio do cliente"
    }
  ],
  "kpi_narrative": "2-3 frases explicando o que os números de performance significam na prática — contextualize quedas e altas (se não há métricas, escreva null)",
  "metrics_insight": "1-2 frases com a principal leitura das métricas para o cliente",
  "priorities": [
    { "title": "Prioridade para o próximo mês", "description": "descrição objetiva (máx. 80 chars)" }
  ],
  "risks": [
    { "description": "descrição do risco", "owner": "Equipe Edro" }
  ],
  "director_action": "1 frase sobre a ação que o diretor/cliente precisa tomar (null se não houver)",
  "pipeline_short": "foco do próximo mês em 1 frase",
  "pipeline_medium": "foco dos próximos 2-3 meses em 1 frase",
  "pipeline_long": "visão de longo prazo / posicionamento estratégico em 1 frase",
  "pipeline_risk_window": "principal janela de risco que pode travar o pipeline (null se não identificado)",
  "synthesis": "parágrafo de fechamento (3-4 frases) — o que o mês representou, o que foi aprendido e o que isso significa para o próximo ciclo",
  "kpi_benchmarks": [
    {
      "platform": "instagram",
      "kpi_key": "reach",
      "min": 3000,
      "max": 9000,
      "label": "Ref. setor: 3K–9K"
    }
  ]
}

Regras obrigatórias:
- Resposta em português brasileiro, tom executivo direto
- Não invente dados numéricos — baseie-se apenas no que foi informado
- status_facts: 2-4 bullet points com os fatos mais relevantes do mês
- deliverable_categories: agrupe as entregas por tipo de trabalho (2-4 categorias)
- business_impact: 2-3 impactos concretos no negócio do cliente (não na agência)
- priorities: 2-3 itens para o próximo mês
- risks: 0-2 riscos reais (omita ou use [] se não houver risco evidente)
- synthesis: deve ser o parágrafo mais reflexivo e estratégico do relatório
- kpi_benchmarks: para cada KPI de canal disponível nos dados, forneça uma faixa de referência de mercado
  adequada ao porte e setor do cliente (inferido a partir das entregas e contexto).
  Use sempre a MESMA unidade do KPI (ex: se reach é número absoluto, benchmark em número absoluto).
  kpi_key deve ser exatamente: "reach", "engagements" ou "followers_count".
  Exemplos de referências por setor (adapte ao porte estimado da conta):
    Instagram B2B institucional (1K–10K seguidores): reach 2K–8K, engagements 100–600, followers_count 30–120/mês
    Instagram varejo/consumo (5K–50K seguidores): reach 5K–25K, engagements 300–2000, followers_count 50–300/mês
    LinkedIn B2B (500–5K seguidores): engagements 200–1200, followers_count 20–80/mês`;

  try {
    const result = await generateCompletion({ prompt, maxTokens: 2200, temperature: 0.35 });
    const match  = result.text.match(/\{[\s\S]*\}/);
    if (!match) return sections;

    interface AiBenchmark {
      platform: string;
      kpi_key: string;
      min: number;
      max: number;
      label: string;
    }

    const ai = JSON.parse(match[0]) as {
      headline?:               string;
      status_facts?:           string[];
      status_attention?:       string | null;
      execution_narrative?:    string;
      focus_areas?:            string[];
      deliverable_categories?: { label: string; items: string[] }[];
      business_impact?:        { title: string; description: string }[];
      kpi_narrative?:          string | null;
      metrics_insight?:        string;
      priorities?:             Priority[];
      risks?:                  Risk[];
      director_action?:        string | null;
      pipeline_short?:         string | null;
      pipeline_medium?:        string | null;
      pipeline_long?:          string | null;
      pipeline_risk_window?:   string | null;
      synthesis?:              string | null;
      kpi_benchmarks?:         AiBenchmark[];
    };

    const str = (v: unknown): string | null =>
      typeof v === 'string' && v.trim() ? v.trim() : null;

    // ── Build benchmark lookup: platform+key → benchmark ─────────────────────
    const bmLookup = new Map<string, AiBenchmark>();
    if (Array.isArray(ai.kpi_benchmarks)) {
      for (const bm of ai.kpi_benchmarks) {
        if (bm.platform && bm.kpi_key) {
          bmLookup.set(`${bm.platform.toLowerCase()}__${bm.kpi_key}`, bm);
        }
      }
    }

    function computeZone(value: number, min: number, max: number): BenchmarkZone {
      if (value < min) return 'below';
      if (value > max) return 'above';
      return 'in';
    }

    // ── Enrich channels with benchmark data ───────────────────────────────────
    const enrichedChannels = sections.metrics.channels.map((ch) => ({
      ...ch,
      kpis: ch.kpis.map((kpi) => {
        const bm = bmLookup.get(`${ch.platform.toLowerCase()}__${kpi.key}`);
        if (!bm || typeof bm.min !== 'number' || typeof bm.max !== 'number') return kpi;
        return {
          ...kpi,
          benchmark_min:   bm.min,
          benchmark_max:   bm.max,
          benchmark_label: bm.label ?? null,
          benchmark_zone:  computeZone(kpi.value, bm.min, bm.max),
        };
      }),
    }));

    return {
      ...sections,
      status: {
        ...sections.status,
        headline:  str(ai.headline)  ?? sections.status.headline,
        facts:     Array.isArray(ai.status_facts) ? ai.status_facts.slice(0, 5) : [],
        attention: str(ai.status_attention),
      },
      executive_context: str(ai.execution_narrative) ? {
        execution_narrative: str(ai.execution_narrative)!,
        focus_areas: Array.isArray(ai.focus_areas) ? ai.focus_areas.slice(0, 4) : [],
      } : null,
      deliverables: {
        ...sections.deliverables,
        categories: Array.isArray(ai.deliverable_categories)
          ? ai.deliverable_categories.slice(0, 5)
          : [],
      },
      business_impact: Array.isArray(ai.business_impact) && ai.business_impact.length > 0
        ? ai.business_impact.slice(0, 3)
        : null,
      metrics: {
        ...sections.metrics,
        channels:      enrichedChannels,
        insight:       str(ai.metrics_insight),
        kpi_narrative: str(ai.kpi_narrative),
      },
      next_steps: {
        ...sections.next_steps,
        priorities:      Array.isArray(ai.priorities) ? ai.priorities.slice(0, 3) : [],
        risks:           Array.isArray(ai.risks)      ? ai.risks.slice(0, 2)      : [],
        director_action: str(ai.director_action),
        pipeline: (ai.pipeline_short || ai.pipeline_medium || ai.pipeline_long) ? {
          short:        str(ai.pipeline_short),
          medium:       str(ai.pipeline_medium),
          long:         str(ai.pipeline_long),
          risk_window:  str(ai.pipeline_risk_window),
        } : null,
      },
      synthesis: str(ai.synthesis),
    };
  } catch {
    // Claude unavailable — return sections without enrichment
    return sections;
  }
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

  const rawSections = buildSections(jobs, snapshots, prevSnapshots);
  const sections    = await enrichSectionsWithAI(rawSections, jobs, periodMonth);
  const autoData    = { jobs_snapshot: jobs, snapshots_raw: snapshots };
  const title       = `Relatório ${periodMonth}`;

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
