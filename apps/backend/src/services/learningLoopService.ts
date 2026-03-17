import { query } from '../db';

// ── Types ──────────────────────────────────────────────────────────

export type AmdPerformanceRow = {
  amd: string;
  momento: string;
  format: string;
  achieved: number;
  tracked: number;
  rate: number;
};

export type LearnedPreferences = {
  version: number;
  rebuilt_at: string;
  copy_feedback: {
    top_angles: { angle: string; avg_score: number; count: number }[];
    preferred_formats: { format: string; avg_score: number; count: number }[];
    anti_patterns: { pattern: string; avg_score: number; count: number }[];
    overall_avg_score: number;
    total_scored_copies: number;
  };
  reportei_performance: {
    top_formats: { platform: string; format: string; score: number }[];
    top_tags: { platform: string; tag: string; score: number }[];
    editorial_insights: string[];
  };
  amd_performance: AmdPerformanceRow[];
  directives: {
    boost: string[];
    avoid: string[];
  };
};

// ── Public API ─────────────────────────────────────────────────────

export async function getClientPreferences(params: {
  tenant_id: string;
  client_id: string;
}): Promise<LearnedPreferences | null> {
  const [prefsRows, directivesRows] = await Promise.all([
    query<any>(
      `SELECT preferences FROM copy_performance_preferences
       WHERE tenant_id = $1 AND client_id = $2`,
      [params.tenant_id, params.client_id],
    ),
    query<{ directive_type: string; directive: string }>(
      `SELECT directive_type, directive FROM client_directives
       WHERE tenant_id = $1 AND client_id = $2
       ORDER BY created_at DESC`,
      [params.tenant_id, params.client_id],
    ),
  ]);

  const base: LearnedPreferences | null = prefsRows.rows[0]?.preferences ?? null;
  if (directivesRows.rows.length === 0) return base;

  const humanBoost = directivesRows.rows.filter((d) => d.directive_type === 'boost').map((d) => d.directive);
  const humanAvoid = directivesRows.rows.filter((d) => d.directive_type === 'avoid').map((d) => d.directive);

  if (!base) {
    // No learning history yet, but we have permanent directives — return a minimal structure
    return {
      version: 1,
      rebuilt_at: new Date().toISOString(),
      copy_feedback: { top_angles: [], preferred_formats: [], anti_patterns: [], overall_avg_score: 0, total_scored_copies: 0, editorial_insights: [] },
      amd_performance: [],
      reportei_performance: { top_formats: [], period_insights: [] },
      directives: { boost: humanBoost, avoid: humanAvoid },
    } as any;
  }

  return {
    ...base,
    directives: {
      boost: [...humanBoost, ...(base.directives?.boost ?? [])],
      avoid: [...humanAvoid, ...(base.directives?.avoid ?? [])],
    },
  };
}

export async function rebuildClientPreferences(params: {
  tenant_id: string;
  client_id: string;
}): Promise<LearnedPreferences> {
  const [copyFeedback, reporteiPerf, amdPerf] = await Promise.all([
    aggregateCopyFeedback(params.client_id),
    aggregateReporteiPerformance(params.tenant_id, params.client_id),
    aggregateAmdPerformance(params.client_id),
  ]);

  const directives = generateDirectives(copyFeedback, reporteiPerf, amdPerf);

  const preferences: LearnedPreferences = {
    version: 1,
    rebuilt_at: new Date().toISOString(),
    copy_feedback: copyFeedback,
    reportei_performance: reporteiPerf,
    amd_performance: amdPerf,
    directives,
  };

  await query(
    `INSERT INTO copy_performance_preferences (tenant_id, client_id, preferences, rebuilt_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (tenant_id, client_id)
     DO UPDATE SET preferences = $3, rebuilt_at = NOW(), updated_at = NOW()`,
    [params.tenant_id, params.client_id, JSON.stringify(preferences)],
  );

  return preferences;
}

// ── Copy Feedback Aggregation ──────────────────────────────────────

type CopyFeedbackAggregation = LearnedPreferences['copy_feedback'];

async function aggregateCopyFeedback(clientId: string): Promise<CopyFeedbackAggregation> {
  // Get scored copies from last 180 days
  const { rows } = await query<any>(
    `SELECT ecv.output, ecv.score, ecv.status, ecv.model,
            eb.payload AS briefing_payload
     FROM edro_copy_versions ecv
     JOIN edro_briefings eb ON eb.id = ecv.briefing_id
     WHERE eb.client_id = $1
       AND ecv.score IS NOT NULL
       AND ecv.created_at > NOW() - INTERVAL '180 days'
     ORDER BY ecv.score DESC`,
    [clientId],
  );

  if (!rows.length) {
    return { top_angles: [], preferred_formats: [], anti_patterns: [], overall_avg_score: 0, total_scored_copies: 0 };
  }

  // Aggregate by angle (first ~60 chars of copy)
  const angleMap = new Map<string, { total: number; count: number }>();
  const formatMap = new Map<string, { total: number; count: number }>();

  for (const r of rows) {
    // Angle: first meaningful chunk of the copy
    const angle = extractAngle(r.output);
    if (angle) {
      const prev = angleMap.get(angle) || { total: 0, count: 0 };
      angleMap.set(angle, { total: prev.total + r.score, count: prev.count + 1 });
    }

    // Format from briefing payload
    const format = r.briefing_payload?.format || r.briefing_payload?.channels?.[0] || 'unknown';
    const prevFmt = formatMap.get(format) || { total: 0, count: 0 };
    formatMap.set(format, { total: prevFmt.total + r.score, count: prevFmt.count + 1 });
  }

  const toSorted = (map: Map<string, { total: number; count: number }>) =>
    Array.from(map.entries())
      .map(([key, v]) => ({ key, avg_score: +(v.total / v.count).toFixed(2), count: v.count }))
      .sort((a, b) => b.avg_score - a.avg_score);

  const sortedAngles = toSorted(angleMap);
  const sortedFormats = toSorted(formatMap);

  const totalScore = rows.reduce((s: number, r: any) => s + r.score, 0);

  return {
    top_angles: sortedAngles
      .filter((a) => a.avg_score >= 3.5)
      .slice(0, 8)
      .map((a) => ({ angle: a.key, avg_score: a.avg_score, count: a.count })),
    preferred_formats: sortedFormats
      .filter((f) => f.avg_score >= 3.5)
      .slice(0, 6)
      .map((f) => ({ format: f.key, avg_score: f.avg_score, count: f.count })),
    anti_patterns: sortedAngles
      .filter((a) => a.avg_score <= 2 && a.count >= 2)
      .slice(0, 5)
      .map((a) => ({ pattern: a.key, avg_score: a.avg_score, count: a.count })),
    overall_avg_score: +(totalScore / rows.length).toFixed(2),
    total_scored_copies: rows.length,
  };
}

// ── Reportei Performance Aggregation ───────────────────────────────

type ReporteiPerformanceAggregation = LearnedPreferences['reportei_performance'];

async function aggregateReporteiPerformance(
  tenantId: string,
  clientId: string,
): Promise<ReporteiPerformanceAggregation> {
  const { rows } = await query<any>(
    `SELECT platform, payload, created_at
     FROM learned_insights
     WHERE tenant_id = $1
       AND created_at > NOW() - INTERVAL '90 days'
     ORDER BY created_at DESC
     LIMIT 20`,
    [tenantId],
  );

  if (!rows.length) {
    return { top_formats: [], top_tags: [], editorial_insights: [] };
  }

  const formatScores: { platform: string; format: string; score: number }[] = [];
  const tagScores: { platform: string; tag: string; score: number }[] = [];
  const insightsSet = new Set<string>();

  for (const r of rows) {
    const payload = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
    if (!payload) continue;

    // by_format
    const byFormat = Array.isArray(payload.by_format) ? payload.by_format : [];
    for (const f of byFormat) {
      if (f.format && typeof f.score === 'number') {
        formatScores.push({ platform: r.platform, format: f.format, score: f.score });
      }
    }

    // by_tag
    const byTag = Array.isArray(payload.by_tag) ? payload.by_tag : [];
    for (const t of byTag) {
      if (t.tag && typeof t.score === 'number') {
        tagScores.push({ platform: r.platform, tag: t.tag, score: t.score });
      }
    }

    // editorial_insights
    const insights = Array.isArray(payload.editorial_insights) ? payload.editorial_insights : [];
    for (const ins of insights) {
      if (typeof ins === 'string' && ins.length > 5) insightsSet.add(ins);
    }
  }

  // Deduplicate and sort by score
  const dedup = <T extends { score: number }>(arr: T[], key: (t: T) => string) => {
    const map = new Map<string, T>();
    for (const item of arr) {
      const k = key(item);
      const existing = map.get(k);
      if (!existing || item.score > existing.score) map.set(k, item);
    }
    return Array.from(map.values()).sort((a, b) => b.score - a.score);
  };

  return {
    top_formats: dedup(formatScores, (f) => `${f.platform}:${f.format}`).slice(0, 8),
    top_tags: dedup(tagScores, (t) => `${t.platform}:${t.tag}`).slice(0, 8),
    editorial_insights: Array.from(insightsSet).slice(0, 10),
  };
}

// ── AMD Performance Aggregation ────────────────────────────────────

async function aggregateAmdPerformance(clientId: string): Promise<AmdPerformanceRow[]> {
  const { rows } = await query<any>(
    `SELECT amd,
       COALESCE(momento_consciencia, 'desconhecido') AS momento,
       COALESCE(copy_format, 'desconhecido')         AS format,
       COUNT(*) FILTER (WHERE amd_achieved = 'sim')::int AS achieved,
       COUNT(*) FILTER (WHERE amd_achieved IS NOT NULL)::int AS tracked,
       ROUND(
         COUNT(*) FILTER (WHERE amd_achieved = 'sim')::numeric
         / NULLIF(COUNT(*) FILTER (WHERE amd_achieved IS NOT NULL), 0) * 100,
         1
       ) AS rate
     FROM preference_feedback
     WHERE client_id = $1
       AND amd IS NOT NULL
       AND amd_achieved IS NOT NULL
     GROUP BY amd, momento_consciencia, copy_format
     ORDER BY rate DESC NULLS LAST
     LIMIT 10`,
    [clientId],
  );
  return rows.map((r: any) => ({
    amd:      r.amd,
    momento:  r.momento,
    format:   r.format,
    achieved: Number(r.achieved),
    tracked:  Number(r.tracked),
    rate:     Number(r.rate ?? 0),
  }));
}

// ── Directive Generation ───────────────────────────────────────────

function generateDirectives(
  copyFeedback: CopyFeedbackAggregation,
  reporteiPerf: ReporteiPerformanceAggregation,
  amdPerf: AmdPerformanceRow[] = [],
): { boost: string[]; avoid: string[] } {
  const boost: string[] = [];
  const avoid: string[] = [];

  // Copy feedback directives
  for (const f of copyFeedback.preferred_formats.slice(0, 3)) {
    boost.push(`Formato "${f.format}" tem score medio ${f.avg_score}/5 (${f.count} copies avaliadas)`);
  }
  for (const a of copyFeedback.top_angles.slice(0, 3)) {
    boost.push(`Abordagem bem avaliada: "${a.angle}" (${a.avg_score}/5)`);
  }
  for (const p of copyFeedback.anti_patterns.slice(0, 3)) {
    avoid.push(`Evitar abordagem: "${p.pattern}" (score ${p.avg_score}/5)`);
  }

  // Reportei performance directives
  for (const f of reporteiPerf.top_formats.filter((f) => f.score >= 70).slice(0, 3)) {
    boost.push(`${f.format} tem alta performance em ${f.platform} (score ${f.score})`);
  }
  for (const t of reporteiPerf.top_tags.filter((t) => t.score >= 70).slice(0, 2)) {
    boost.push(`Tag "${t.tag}" performa bem em ${t.platform} (score ${t.score})`);
  }

  // Editorial insights as boost
  for (const ins of reporteiPerf.editorial_insights.slice(0, 2)) {
    boost.push(ins);
  }

  // AMD performance directives — AMD com alta taxa de conversão
  for (const a of amdPerf.filter((r) => r.rate >= 70 && r.tracked >= 3).slice(0, 3)) {
    boost.push(`AMD "${a.amd}" no momento "${a.momento}" atinge ${a.rate}% de sucesso (${a.tracked} amostras)`);
  }

  return {
    boost: boost.slice(0, 10),
    avoid: avoid.slice(0, 5),
  };
}

// ── Helpers ────────────────────────────────────────────────────────

function extractAngle(output: string): string | null {
  if (!output) return null;
  // Take first line or first ~60 chars as the "angle"
  const firstLine = output.split('\n')[0].trim();
  const angle = firstLine.slice(0, 60).trim();
  return angle.length >= 10 ? angle : null;
}
