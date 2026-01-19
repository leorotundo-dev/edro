import { query } from '../db';

export interface ProbabilityHeatmapRow {
  banca: string;
  subtopico: string;
  total_questoes: number;
  prob_freq: number;
  prob_media: number | null;
  prob_final: number;
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function round(value: number, decimals: number = 4): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export async function getProbabilityHeatmap(params?: {
  banca?: string;
  minCount?: number;
  limit?: number;
}): Promise<ProbabilityHeatmapRow[]> {
  const filters: string[] = [
    '(subtopico IS NOT NULL OR topic IS NOT NULL)',
  ];
  const values: any[] = [];

  if (params?.banca) {
    values.push(`%${params.banca}%`);
    filters.push('(banca ILIKE $1 OR exam_board ILIKE $1)');
  }

  const sql = `
    SELECT
      COALESCE(NULLIF(banca, ''), NULLIF(exam_board, ''), 'desconhecida') AS banca,
      COALESCE(NULLIF(subtopico, ''), NULLIF(topic, '')) AS subtopico,
      COUNT(*)::int AS total_questoes,
      AVG(probabilidade_prova) AS prob_media
    FROM questoes
    WHERE ${filters.join(' AND ')}
    GROUP BY 1, 2
  `;

  const { rows } = await query<{
    banca: string;
    subtopico: string;
    total_questoes: number;
    prob_media: number | null;
  }>(sql, values);

  const totalsByBanca = new Map<string, number>();
  rows.forEach((row) => {
    const banca = row.banca || 'desconhecida';
    const next = (totalsByBanca.get(banca) || 0) + Number(row.total_questoes || 0);
    totalsByBanca.set(banca, next);
  });

  const minCount = params?.minCount ?? 3;
  const limit = params?.limit ?? 500;

  const mapped = rows
    .filter((row) => row.subtopico && row.total_questoes >= minCount)
    .map((row) => {
      const banca = row.banca || 'desconhecida';
      const totalBanca = totalsByBanca.get(banca) || 0;
      const freq = totalBanca > 0 ? row.total_questoes / totalBanca : 0;
      const probMediaRaw = toNumber(row.prob_media);
      const probMedia = probMediaRaw !== null ? clamp01(probMediaRaw) : null;
      const probFinal = probMedia !== null
        ? clamp01(probMedia * 0.7 + freq * 0.3)
        : clamp01(freq);

      return {
        banca,
        subtopico: row.subtopico,
        total_questoes: Number(row.total_questoes || 0),
        prob_freq: round(freq),
        prob_media: probMedia !== null ? round(probMedia) : null,
        prob_final: round(probFinal),
      };
    })
    .sort((a, b) => b.prob_final - a.prob_final)
    .slice(0, limit);

  return mapped;
}

export default {
  getProbabilityHeatmap,
};
