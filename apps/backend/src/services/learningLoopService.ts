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
  post_level_performance: {
    top_formats: { platform: string; format: string; avg_score: number; sample_size: number }[];
    top_angles: { angle: string; avg_score: number; sample_size: number }[];
    linked_posts: number;
  };
  segment_feedback: {
    liked_patterns: { text: string; count: number }[];
    disliked_patterns: { text: string; count: number }[];
  };
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
      copy_feedback: { top_angles: [], preferred_formats: [], anti_patterns: [], overall_avg_score: 0, total_scored_copies: 0 },
      amd_performance: [],
      post_level_performance: { top_formats: [], top_angles: [], linked_posts: 0 },
      segment_feedback: { liked_patterns: [], disliked_patterns: [] },
      reportei_performance: { top_formats: [], top_tags: [], editorial_insights: [] },
      directives: { boost: humanBoost, avoid: humanAvoid },
    };
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
  const [copyFeedback, reporteiPerf, amdPerf, postLevelPerf, segmentFeedback, regenerationPatterns] = await Promise.all([
    aggregateCopyFeedback(params.client_id),
    aggregateReporteiPerformance(params.tenant_id, params.client_id),
    aggregateAmdPerformance(params.client_id),
    aggregatePostLevelPerformance(params.tenant_id, params.client_id),
    aggregateSegmentPatterns(params.tenant_id, params.client_id),
    aggregateRegenerationPatterns(params.tenant_id, params.client_id),
  ]);

  const directives = generateDirectives(copyFeedback, reporteiPerf, amdPerf, postLevelPerf, segmentFeedback, regenerationPatterns);

  const preferences: LearnedPreferences = {
    version: 1,
    rebuilt_at: new Date().toISOString(),
    copy_feedback: copyFeedback,
    reportei_performance: reporteiPerf,
    amd_performance: amdPerf,
    post_level_performance: postLevelPerf,
    segment_feedback: segmentFeedback,
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
       AND client_id = $2
       AND created_at > NOW() - INTERVAL '90 days'
     ORDER BY created_at DESC
     LIMIT 20`,
    [tenantId, clientId],
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

    const semanticTopMetrics = Array.isArray(payload?.semantic_summary?.top_metrics)
      ? payload.semantic_summary.top_metrics
      : [];
    for (const metric of semanticTopMetrics.slice(0, 3)) {
      if (metric?.family && typeof metric.family === 'string') {
        insightsSet.add(`${r.platform}: família quantitativa forte em ${metric.family} (${metric.reference_key})`);
      }
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

async function aggregateRegenerationPatterns(
  tenantId: string,
  clientId: string,
): Promise<string[]> {
  const { rows } = await query<{ instruction: string }>(
    `SELECT BTRIM(regeneration_instruction) AS instruction
     FROM preference_feedback
     WHERE tenant_id = $1
       AND client_id = $2
       AND regeneration_instruction IS NOT NULL
       AND BTRIM(regeneration_instruction) <> ''
       AND created_at > NOW() - INTERVAL '90 days'
     GROUP BY BTRIM(regeneration_instruction)
     ORDER BY COUNT(*) DESC, MAX(created_at) DESC
     LIMIT 5`,
    [tenantId, clientId],
  );

  return rows
    .map((row) => row.instruction?.trim())
    .filter((instruction): instruction is string => Boolean(instruction));
}

async function aggregatePostLevelPerformance(
  tenantId: string,
  clientId: string,
): Promise<LearnedPreferences['post_level_performance']> {
  const { rows } = await query<{
    platform: string;
    format: string | null;
    output: string | null;
    engagement_rate: number | null;
    impressions: number | null;
    engagement: number | null;
    saves: number | null;
    shares: number | null;
  }>(
    `SELECT
       bpm.platform,
       COALESCE(bpm.format, eb.payload->>'format', eb.payload->>'channels', 'desconhecido') AS format,
       cv.output,
       bpm.engagement_rate,
       bpm.impressions,
       bpm.engagement,
       bpm.saves,
       bpm.shares
     FROM briefing_post_metrics bpm
     JOIN edro_briefings eb ON eb.id = bpm.briefing_id
     LEFT JOIN LATERAL (
       SELECT output
       FROM edro_copy_versions
       WHERE briefing_id = eb.id
       ORDER BY
         CASE status
           WHEN 'approved' THEN 0
           WHEN 'draft' THEN 1
           ELSE 2
         END,
         created_at DESC
       LIMIT 1
     ) cv ON TRUE
     WHERE eb.tenant_id = $1
       AND COALESCE(eb.main_client_id::text, eb.client_id::text) = $2
       AND bpm.match_source = 'platform_post_id'
       AND bpm.published_at > NOW() - INTERVAL '180 days'
     ORDER BY bpm.published_at DESC
     LIMIT 150`,
    [tenantId, clientId],
  );

  if (!rows.length) {
    return { top_formats: [], top_angles: [], linked_posts: 0 };
  }

  const formatMap = new Map<string, { platform: string; format: string; total: number; count: number }>();
  const angleMap = new Map<string, { angle: string; total: number; count: number }>();

  for (const row of rows) {
    const impressions = Number(row.impressions || 0);
    const engagement = Number(row.engagement || 0);
    const saves = Number(row.saves || 0);
    const shares = Number(row.shares || 0);
    const engagementRate = Number(row.engagement_rate || 0);
    const saveRate = impressions > 0 ? (saves / impressions) * 100 : 0;
    const shareRate = impressions > 0 ? (shares / impressions) * 100 : 0;
    const fallbackRate = impressions > 0 ? (engagement / impressions) * 100 : 0;
    const score = +(engagementRate || fallbackRate || 0) + saveRate * 2 + shareRate * 2;

    const formatKey = `${row.platform}:${row.format || 'desconhecido'}`;
    const prevFormat = formatMap.get(formatKey) || {
      platform: row.platform,
      format: row.format || 'desconhecido',
      total: 0,
      count: 0,
    };
    formatMap.set(formatKey, {
      ...prevFormat,
      total: prevFormat.total + score,
      count: prevFormat.count + 1,
    });

    const angle = extractAngle(row.output || '');
    if (angle) {
      const prevAngle = angleMap.get(angle) || { angle, total: 0, count: 0 };
      angleMap.set(angle, {
        angle,
        total: prevAngle.total + score,
        count: prevAngle.count + 1,
      });
    }
  }

  return {
    top_formats: Array.from(formatMap.values())
      .map((item) => ({
        platform: item.platform,
        format: item.format,
        avg_score: +(item.total / item.count).toFixed(2),
        sample_size: item.count,
      }))
      .sort((left, right) => right.avg_score - left.avg_score)
      .slice(0, 6),
    top_angles: Array.from(angleMap.values())
      .map((item) => ({
        angle: item.angle,
        avg_score: +(item.total / item.count).toFixed(2),
        sample_size: item.count,
      }))
      .sort((left, right) => right.avg_score - left.avg_score)
      .slice(0, 6),
    linked_posts: rows.length,
  };
}

async function aggregateSegmentPatterns(
  tenantId: string,
  clientId: string,
): Promise<LearnedPreferences['segment_feedback']> {
  const loadBySentiment = async (sentiment: 'like' | 'dislike') => {
    const { rows } = await query<{ segment_text: string; count: number }>(
      `SELECT csf.segment_text, COUNT(*)::int AS count
       FROM copy_segment_feedback csf
       JOIN edro_briefings eb ON eb.id = csf.briefing_id
       WHERE csf.tenant_id = $1
         AND COALESCE(eb.main_client_id::text, eb.client_id::text) = $2
         AND csf.sentiment = $3
         AND csf.created_at > NOW() - INTERVAL '90 days'
       GROUP BY csf.segment_text
       HAVING COUNT(*) >= 2
       ORDER BY count DESC
       LIMIT 8`,
      [tenantId, clientId, sentiment],
    );
    return rows.map((row) => ({ text: row.segment_text, count: Number(row.count || 0) }));
  };

  const [likedPatterns, dislikedPatterns] = await Promise.all([
    loadBySentiment('like'),
    loadBySentiment('dislike'),
  ]);

  return {
    liked_patterns: likedPatterns,
    disliked_patterns: dislikedPatterns,
  };
}

// ── Directive Generation ───────────────────────────────────────────

function generateDirectives(
  copyFeedback: CopyFeedbackAggregation,
  reporteiPerf: ReporteiPerformanceAggregation,
  amdPerf: AmdPerformanceRow[] = [],
  postLevelPerf: LearnedPreferences['post_level_performance'],
  segmentFeedback: LearnedPreferences['segment_feedback'],
  regenerationPatterns: string[] = [],
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

  for (const format of postLevelPerf.top_formats.filter((item) => item.sample_size >= 1).slice(0, 3)) {
    boost.push(
      `Posts reais linkados performaram melhor em ${format.platform}/${format.format} (score ${format.avg_score}, ${format.sample_size} posts)`
    );
  }
  for (const angle of postLevelPerf.top_angles.filter((item) => item.sample_size >= 1).slice(0, 2)) {
    boost.push(
      `Ângulo com performance real positiva: "${angle.angle}" (score ${angle.avg_score}, ${angle.sample_size} posts)`
    );
  }

  for (const pattern of segmentFeedback.liked_patterns.slice(0, 2)) {
    boost.push(`Trecho marcado positivamente pelo cliente: "${pattern.text}" (${pattern.count}x)`);
  }
  for (const pattern of segmentFeedback.disliked_patterns.slice(0, 3)) {
    avoid.push(`Evitar trecho recorrente reprovado: "${pattern.text}" (${pattern.count}x)`);
  }

  for (const pattern of regenerationPatterns.slice(0, 3)) {
    boost.push(`Ajuste frequente pedido pelo cliente: "${pattern}"`);
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
