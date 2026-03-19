/**
 * Copy Intelligence Service
 *
 * Carrega inteligência histórica de copy_roi_scores para calibrar o Fogg
 * multiplier do resonanceScorer para este cliente específico.
 *
 * Lógica: se copies de alto ROI (≥70) têm Fogg composite mais alto que a
 * média geral, o modelo Fogg é mais preditivo para este cliente → aumentamos
 * o peso de Fogg nas pontuações.
 *
 * fogg_scale_factor:
 *   1.0 = sem calibração (padrão)
 *   >1.0 = Fogg mais preditivo para este cliente (ex: 1.3 = +30% de peso)
 *   <1.0 = Fogg menos preditivo (outros fatores dominam)
 *
 * Fonte: copy_roi_scores (últ. 180 dias)
 */

import { query } from '../../db';

export interface CopyIntelligenceContext {
  has_data: boolean;
  avg_fogg_composite: number | null;
  high_roi_avg_fogg: number | null;
  fogg_scale_factor: number;         // 0.7–1.5, applies to fogg_multiplier_scale
  avg_ctr: number | null;
  avg_roi_score: number | null;
  sample_size: number;
}

export async function loadCopyIntelligence(
  clientId: string,
  tenantId: string,
  platform?: string,
): Promise<CopyIntelligenceContext> {
  const empty: CopyIntelligenceContext = {
    has_data: false,
    avg_fogg_composite: null,
    high_roi_avg_fogg: null,
    fogg_scale_factor: 1.0,
    avg_ctr: null,
    avg_roi_score: null,
    sample_size: 0,
  };

  const res = await query<{
    avg_fogg: string | null;
    high_roi_avg_fogg: string | null;
    avg_ctr: string | null;
    avg_roi: string | null;
    n: string;
  }>(
    `SELECT
       AVG(fogg_composite)::numeric(6,3)                                       AS avg_fogg,
       AVG(CASE WHEN roi_score >= 70 THEN fogg_composite ELSE NULL END)::numeric(6,3)
                                                                                AS high_roi_avg_fogg,
       AVG(avg_ctr)::numeric(8,6)                                              AS avg_ctr,
       AVG(roi_score)::numeric(6,2)                                            AS avg_roi,
       COUNT(*)                                                                 AS n
     FROM copy_roi_scores
     WHERE tenant_id::text = $1
       AND client_id = $2
       AND ($3::text IS NULL OR platform ILIKE $3)
       AND computed_at >= NOW() - INTERVAL '180 days'
       AND fogg_composite IS NOT NULL`,
    [tenantId, clientId, platform ?? null],
  ).catch(() => ({ rows: [] as any[] }));

  if (!res.rows.length) return empty;

  const row = res.rows[0];
  const n = parseInt(row.n, 10) || 0;
  if (n < 3) return empty;

  const avgFogg       = row.avg_fogg            !== null ? parseFloat(row.avg_fogg)            : null;
  const highRoiFogg   = row.high_roi_avg_fogg    !== null ? parseFloat(row.high_roi_avg_fogg)    : null;
  const avgCtr        = row.avg_ctr              !== null ? parseFloat(row.avg_ctr)              : null;
  const avgRoi        = row.avg_roi              !== null ? parseFloat(row.avg_roi)              : null;

  // fogg_scale_factor: ratio of high-ROI Fogg vs overall avg Fogg
  // Clamp between 0.7–1.5 to avoid extreme corrections
  let foggScaleFactor = 1.0;
  if (avgFogg !== null && highRoiFogg !== null && avgFogg > 0 && n >= 5) {
    foggScaleFactor = Math.min(1.5, Math.max(0.7, highRoiFogg / avgFogg));
  }

  return {
    has_data: true,
    avg_fogg_composite: avgFogg,
    high_roi_avg_fogg:  highRoiFogg,
    fogg_scale_factor:  Math.round(foggScaleFactor * 100) / 100,
    avg_ctr:            avgCtr,
    avg_roi_score:      avgRoi,
    sample_size:        n,
  };
}
