/**
 * Scope Estimator — Fase 2 do ERP
 *
 * Estima horas e custo de um briefing com base em:
 * 1. Histórico de time_entries agrupados por labels + platform (se ≥ 3 jobs similares)
 * 2. Fallback para Gemini Flash via generateWithProvider() quando dados históricos insuficientes
 *
 * Resultado salvo em job_estimations para loop de aprendizado.
 */

import { query } from '../../db';
import { generateWithProvider } from './copyOrchestrator';

export type Complexity = 'simple' | 'medium' | 'complex' | 'premium';

export interface ScopeEstimateInput {
  title: string;
  labels?: string[];
  platform?: string;
  format?: string;
  clientId?: string;
  briefingId?: string;
  tenantId: string;
}

export interface ScopeEstimateResult {
  estimated_hours: number;
  estimated_cost_brl: number | null;
  complexity: Complexity;
  confidence: number;    // 0–1
  rationale: string;
  similar_jobs_count: number;
  factors?: Record<string, unknown>;
}

// ── Historical analysis ────────────────────────────────────────────────────────

async function getHistoricalData(input: ScopeEstimateInput): Promise<{
  avg_hours: number;
  stddev_hours: number;
  count: number;
  avg_rate: number | null;
}> {
  const { labels, platform, tenantId } = input;

  // Build label overlap condition: briefings whose labels array-contains ANY of the input labels
  const labelFilter = labels && labels.length > 0
    ? `AND b.labels @> ANY(ARRAY[${labels.map((_, i) => `$${i + 2}::jsonb`).join(',')}]::jsonb[])`
    : '';

  const platformFilter = platform
    ? `AND (b.labels @> $${(labels?.length ?? 0) + 2}::jsonb OR b.checklist::text ILIKE $${(labels?.length ?? 0) + 3})`
    : '';

  // Simpler approach: match by any overlapping label or same platform keyword
  const sql = `
    SELECT
      COUNT(DISTINCT b.id)::integer                    AS count,
      COALESCE(AVG(te_agg.total_hours), 0)             AS avg_hours,
      COALESCE(STDDEV(te_agg.total_hours), 0)          AS stddev_hours,
      AVG(fp.hourly_rate_brl)                          AS avg_rate
    FROM edro_briefings b
    JOIN (
      SELECT briefing_id, SUM(minutes)::numeric / 60 AS total_hours
      FROM time_entries
      GROUP BY briefing_id
      HAVING SUM(minutes) > 0
    ) te_agg ON te_agg.briefing_id = b.id
    LEFT JOIN time_entries te ON te.briefing_id = b.id
    LEFT JOIN freelancer_profiles fp ON fp.id = te.freelancer_id
    WHERE b.tenant_id = $1
      AND te_agg.total_hours BETWEEN 0.1 AND 200
  `;

  // Keep it simple — match by tenant and any shared label
  let labelSql = sql;
  const params: any[] = [tenantId];

  if (labels && labels.length > 0) {
    // Overlap: briefing labels contains at least one of the input labels
    labelSql += ` AND EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(b.labels) AS lbl
      WHERE lbl = ANY($2::text[])
    )`;
    params.push(labels);
  }

  const result = await query(labelSql, params);
  const row = result.rows[0];
  return {
    avg_hours: parseFloat(row.avg_hours) || 0,
    stddev_hours: parseFloat(row.stddev_hours) || 0,
    count: parseInt(row.count) || 0,
    avg_rate: row.avg_rate ? parseFloat(row.avg_rate) : null,
  };
}

// ── Complexity from hours ──────────────────────────────────────────────────────

function classifyComplexity(hours: number): Complexity {
  if (hours <= 2)  return 'simple';
  if (hours <= 6)  return 'medium';
  if (hours <= 16) return 'complex';
  return 'premium';
}

// ── AI fallback ────────────────────────────────────────────────────────────────

async function estimateWithAI(input: ScopeEstimateInput): Promise<ScopeEstimateResult> {
  const prompt = `Você é um especialista em estimativas de projetos de agência de marketing digital.

Estime as horas necessárias para o seguinte briefing:

Título: ${input.title}
Labels/Tipo: ${(input.labels ?? []).join(', ') || 'não especificado'}
Plataforma: ${input.platform || 'não especificado'}
Formato: ${input.format || 'não especificado'}

Responda SOMENTE com JSON válido no formato:
{
  "estimated_hours": <número decimal>,
  "complexity": "<simple|medium|complex|premium>",
  "rationale": "<explicação curta em português>"
}

Referência de complexidade:
- simple: posts simples, carrossel básico (0.5–2h)
- medium: vídeo curto, campanha com variações (2–6h)
- complex: série de conteúdo, estratégia + copy + revisões (6–16h)
- premium: campanha completa, múltiplas plataformas e formatos (16h+)`;

  try {
    const { output } = await generateWithProvider('gemini', {
      prompt,
      temperature: 0.2,
      maxTokens: 300,
    });

    const jsonMatch = output.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in AI response');
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      estimated_hours: parseFloat(parsed.estimated_hours) || 2,
      estimated_cost_brl: null,
      complexity: parsed.complexity || 'medium',
      confidence: 0.4,
      rationale: parsed.rationale || 'Estimativa por IA (sem histórico suficiente)',
      similar_jobs_count: 0,
      factors: {
        source: 'ai',
        labels: input.labels ?? [],
        platform: input.platform ?? null,
        format: input.format ?? null,
      },
    };
  } catch {
    return {
      estimated_hours: 2,
      estimated_cost_brl: null,
      complexity: 'medium',
      confidence: 0.2,
      rationale: 'Estimativa padrão (IA indisponível)',
      similar_jobs_count: 0,
      factors: {
        source: 'fallback',
        labels: input.labels ?? [],
        platform: input.platform ?? null,
        format: input.format ?? null,
      },
    };
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function estimateScope(input: ScopeEstimateInput): Promise<ScopeEstimateResult> {
  const hist = await getHistoricalData(input);

  let result: ScopeEstimateResult;

  if (hist.count >= 3) {
    // Use historical data
    const hours = hist.avg_hours;
    const complexity = classifyComplexity(hours);
    const costBrl = hist.avg_rate ? hours * hist.avg_rate : null;

    // Confidence based on sample size and stddev
    const cv = hist.stddev_hours / (hist.avg_hours || 1); // coefficient of variation
    const confidence = Math.min(0.95, Math.max(0.5, 1 - cv * 0.5) * Math.min(1, hist.count / 10));

    result = {
      estimated_hours: Math.round(hours * 4) / 4, // round to nearest 0.25h
      estimated_cost_brl: costBrl ? Math.round(costBrl * 100) / 100 : null,
      complexity,
      confidence: Math.round(confidence * 100) / 100,
      rationale: `Baseado em ${hist.count} jobs similares (média ${hours.toFixed(1)}h ± ${hist.stddev_hours.toFixed(1)}h)`,
      similar_jobs_count: hist.count,
      factors: {
        source: 'historical',
        labels: input.labels ?? [],
        platform: input.platform ?? null,
        format: input.format ?? null,
        avg_hours: Math.round(hist.avg_hours * 100) / 100,
        stddev_hours: Math.round(hist.stddev_hours * 100) / 100,
        avg_rate: hist.avg_rate,
      },
    };
  } else {
    // AI fallback
    result = await estimateWithAI(input);
  }

  // Persist to job_estimations (best-effort, no-throw)
  if (input.briefingId) {
    const costParam = result.estimated_cost_brl ?? null;
    query(
      `INSERT INTO job_estimations
         (briefing_id, estimated_hours, estimated_cost_brl, complexity, factors)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (briefing_id) DO NOTHING`,
      [
        input.briefingId,
        result.estimated_hours,
        costParam,
        result.complexity,
        JSON.stringify({
          labels: input.labels,
          platform: input.platform,
          format: input.format,
          confidence: result.confidence,
          similar_jobs_count: result.similar_jobs_count,
          rationale: result.rationale,
        }),
      ]
    ).catch(() => {});
  }

  return result;
}
