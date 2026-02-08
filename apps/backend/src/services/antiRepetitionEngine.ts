import { query } from '../db';
import { OpenAIEmbeddings } from '../library/openaiEmbeddings';

const embedder = new OpenAIEmbeddings();

export type RepetitionCheckResult = {
  isOriginal: boolean;
  similarityScore: number;
  matchedCopies: Array<{
    id: string;
    output: string;
    similarity: number;
    created_at: string;
  }>;
  recommendation: 'approve' | 'review' | 'reject';
  reason: string;
};

/**
 * Check if copy is repetitive using semantic similarity
 * Threshold: 0.85+ = very similar (likely repetition)
 */
export async function detectRepetition(params: {
  client_id: string;
  copyText: string;
  threshold?: number;
}): Promise<RepetitionCheckResult> {
  const threshold = params.threshold || 0.85;

  // Generate embedding for new copy
  const [copyEmbedding] = await embedder.embed([params.copyText]);

  // Search similar copies in history (last 180 days)
  const { rows } = await query(`
    SELECT
      ecv.id,
      ecv.output,
      ecv.created_at,
      ecv.embedding,
      1 - (ecv.embedding <=> $1::vector) AS similarity
    FROM edro_copy_versions ecv
    JOIN edro_briefings eb ON eb.id = ecv.briefing_id
    WHERE eb.client_id = $2
      AND ecv.embedding IS NOT NULL
      AND ecv.created_at > NOW() - INTERVAL '180 days'
    ORDER BY ecv.embedding <=> $1::vector
    LIMIT 10
  `, [toVectorLiteral(copyEmbedding), params.client_id]);

  const similarCopies = rows.filter((r: any) => r.similarity >= threshold);
  const maxSimilarity = rows.length > 0 ? rows[0].similarity : 0;

  let recommendation: 'approve' | 'review' | 'reject' = 'approve';
  let reason = 'Copy appears original';

  if (maxSimilarity >= 0.95) {
    recommendation = 'reject';
    reason = 'Copy é quase idêntica a uma versão anterior';
  } else if (maxSimilarity >= threshold) {
    recommendation = 'review';
    reason = `Copy tem ${Math.round(maxSimilarity * 100)}% de similaridade com ${similarCopies.length} versões anteriores`;
  }

  return {
    isOriginal: maxSimilarity < threshold,
    similarityScore: maxSimilarity,
    matchedCopies: rows.slice(0, 5).map((r: any) => ({
      id: r.id,
      output: r.output,
      similarity: r.similarity,
      created_at: r.created_at,
    })),
    recommendation,
    reason,
  };
}

/**
 * Analyze angle/concept usage frequency
 */
export async function analyzeAngleUsage(params: {
  client_id: string;
  angle: string;
}): Promise<{
  usageCount: number;
  lastUsed: string | null;
  recommendation: string;
}> {
  // Simple keyword-based search
  const { rows } = await query(`
    SELECT ecv.id, ecv.output, ecv.created_at
    FROM edro_copy_versions ecv
    JOIN edro_briefings eb ON eb.id = ecv.briefing_id
    WHERE eb.client_id = $1
      AND ecv.created_at > NOW() - INTERVAL '180 days'
      AND LOWER(ecv.output) LIKE LOWER($2)
    ORDER BY ecv.created_at DESC
    LIMIT 20
  `, [params.client_id, `%${params.angle}%`]);

  const usageCount = rows.length;
  const lastUsed = rows.length > 0 ? rows[0].created_at : null;

  let recommendation = '';
  if (usageCount === 0) {
    recommendation = 'Ângulo novo - pode ser explorado';
  } else if (usageCount < 3) {
    recommendation = 'Ângulo usado poucas vezes - ainda tem potencial';
  } else if (usageCount < 10) {
    recommendation = 'Ângulo já usado - considere variações';
  } else {
    recommendation = 'Ângulo muito usado - busque abordagens diferentes';
  }

  return {
    usageCount,
    lastUsed,
    recommendation,
  };
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}
