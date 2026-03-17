/**
 * copyRoiService.ts
 *
 * Computes a composite ROI score for each behavioral copy produced for a client.
 *
 * Score components:
 *   1. Fogg composite  — quality of the copy at generation time (fogg_motivation × ability × prompt)
 *   2. Engagement rate — real CTR from Meta performance metrics
 *   3. ROAS            — revenue / spend (if tracked); otherwise 0
 *   4. AI cost recovery — revenue_brl / ai_cost_brl ratio
 *
 * Final roi_score (0-100):
 *   - 70% weight from real performance data (if available), 30% from Fogg quality
 *   - Falls back to Fogg-only score (0-30 range) when no Meta data exists
 *
 * Called:
 *   - POST /clients/:clientId/reports/compute-copy-roi  (on-demand)
 *   - After Meta sync (non-blocking)
 */

import { query } from '../db/db';
import { generateWithProvider } from './ai/copyOrchestrator';

const USD_TO_BRL = 5.80;
// Conservative flat-rate estimate for copy generation AI cost
// (one agentWriter + agentAuditor pass ≈ 2000 input + 500 output tokens of claude-sonnet)
const COPY_AI_COST_USD_ESTIMATE = ((2000 * 3.00 + 500 * 15.00) / 1_000_000);

export interface CopyRoiResult {
  behavioral_copy_id: string;
  campaign_id: string;
  briefing_id: string | null;
  platform: string;
  hook_text: string | null;
  fogg_composite: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  total_spend_brl: number;
  total_revenue_brl: number;
  avg_ctr: number | null;
  avg_cpc_brl: number | null;
  avg_roas: number | null;
  ai_cost_brl: number;
  roi_score: number;
  roi_label: string;
  roi_pct: number | null;
  summary: string;
  computed_at: string;
}

// ── Fogg composite (geometric mean, clamped 0-10) ──────────────────────────
function foggComposite(m: number | null, a: number | null, p: number | null): number {
  const vals = [m, a, p].filter((v) => v !== null && v > 0) as number[];
  if (!vals.length) return 0;
  const product = vals.reduce((acc, v) => acc * v, 1);
  return parseFloat(Math.pow(product, 1 / vals.length).toFixed(2));
}

// ── Normalize a metric to 0-100 given a target ceiling ────────────────────
function norm(value: number, ceiling: number): number {
  return Math.min(100, Math.round((value / ceiling) * 100));
}

// ── Build roi_label and roi_score ──────────────────────────────────────────
function buildScore(
  fogg: number,            // 0-10
  ctr: number | null,      // 0-1
  roas: number | null,     // e.g. 3.5 means 3.5×
  hasPerf: boolean,
): { score: number; label: string } {
  if (!hasPerf) {
    // Fogg-only: max 40 points, normalized from 0-10
    const score = Math.round((fogg / 10) * 40);
    const label = score >= 32 ? 'good' : score >= 20 ? 'average' : 'poor';
    return { score, label };
  }

  // Fogg contribution: 25 points
  const foggPts = Math.round((fogg / 10) * 25);

  // CTR contribution: 35 points (ceiling = 3% CTR = excellent)
  const ctrPts = ctr !== null ? norm(ctr * 100, 3) * 0.35 : 0;

  // ROAS contribution: 40 points (ceiling = 10× ROAS = excellent)
  const roasPts = roas !== null && roas > 0 ? norm(roas, 10) * 0.40 : 0;

  const score = Math.min(100, Math.round(foggPts + ctrPts + roasPts));
  const label = score >= 75 ? 'excellent' : score >= 55 ? 'good' : score >= 35 ? 'average' : 'poor';
  return { score, label };
}

// ── Generate a short summary via Claude ────────────────────────────────────
async function generateSummary(data: {
  hook: string; platform: string; fogg: number;
  impressions: number; ctr: number | null; roas: number | null;
  roi_score: number; roi_label: string; roi_pct: number | null;
}): Promise<string> {
  const perfLine = data.impressions > 0
    ? `Alcançou ${data.impressions.toLocaleString('pt-BR')} impressões, CTR ${data.ctr !== null ? (data.ctr * 100).toFixed(2) + '%' : 'n/d'}, ROAS ${data.roas !== null ? data.roas.toFixed(1) + '×' : 'n/d'}.`
    : 'Sem dados de performance ainda.';

  const prompt = `Você é um analista de performance de marketing. Em 1-2 frases curtas em português, explique o resultado do copy abaixo.\n\nCopy (hook): "${data.hook?.slice(0, 100) || 'sem hook'}"\nPlataforma: ${data.platform}\nScore Fogg: ${data.fogg}/10\n${perfLine}\nROI Score: ${data.roi_score}/100 (${data.roi_label})\n${data.roi_pct !== null ? `ROI real: ${data.roi_pct.toFixed(0)}%` : ''}\n\nSeja direto e objetivo.`;
  try {
    const res = await generateWithProvider('gemini', { prompt, maxTokens: 80, temperature: 0.3 });
    return res.output.trim();
  } catch {
    return `Copy com ROI score ${data.roi_score}/100. ${perfLine}`;
  }
}

// ── Main: compute ROI for all copies of a client ───────────────────────────
export async function computeClientCopyRoi(
  tenantId: string,
  clientId: string,
): Promise<CopyRoiResult[]> {

  // 1. Fetch all behavioral copies linked to this client's campaigns
  const { rows: copies } = await query<{
    id: string; campaign_id: string; briefing_id: string | null;
    platform: string; hook_text: string | null;
    fogg_motivation: string | null; fogg_ability: string | null; fogg_prompt: string | null;
  }>(
    `SELECT cbc.id, cbc.campaign_id, cbc.briefing_id, cbc.platform,
            cbc.hook_text, cbc.fogg_motivation, cbc.fogg_ability, cbc.fogg_prompt
     FROM campaign_behavioral_copies cbc
     JOIN campaigns c ON c.id = cbc.campaign_id
     WHERE c.tenant_id = $1 AND c.client_id = $2
     ORDER BY cbc.created_at DESC
     LIMIT 100`,
    [tenantId, clientId],
  );

  if (!copies.length) return [];

  // 2. Fetch aggregate performance per campaign (sum across all formats)
  const campaignIds = [...new Set(copies.map((c) => c.campaign_id))];
  const perfMap = new Map<string, {
    impressions: number; clicks: number; conversions: number;
    spend_brl: number; revenue_brl: number; ctr: number | null;
    cpc_brl: number | null; roas: number | null;
  }>();

  if (campaignIds.length) {
    const placeholders = campaignIds.map((_, i) => `$${i + 3}`).join(',');
    const { rows: perfRows } = await query<{
      campaign_id: string;
      total_impressions: string; total_clicks: string; total_conversions: string;
      total_spend: string; total_revenue: string;
    }>(
      `SELECT
         cf.campaign_id,
         COALESCE(SUM(fpm.impressions), 0)   AS total_impressions,
         COALESCE(SUM(fpm.clicks), 0)        AS total_clicks,
         COALESCE(SUM(fpm.conversions), 0)   AS total_conversions,
         COALESCE(SUM(fpm.spend_brl), 0)     AS total_spend,
         COALESCE(SUM(fpm.revenue_brl), 0)   AS total_revenue
       FROM format_performance_metrics fpm
       JOIN campaign_formats cf ON cf.id = fpm.campaign_format_id
       WHERE fpm.tenant_id = $1 AND fpm.client_id = $2
         AND cf.campaign_id IN (${placeholders})
       GROUP BY cf.campaign_id`,
      [tenantId, clientId, ...campaignIds],
    ).catch(() => ({ rows: [] as any[] }));

    for (const row of perfRows) {
      const imp    = Number(row.total_impressions);
      const clicks = Number(row.total_clicks);
      const spend  = Number(row.total_spend);
      const rev    = Number(row.total_revenue);
      perfMap.set(row.campaign_id, {
        impressions: imp,
        clicks,
        conversions: Number(row.total_conversions),
        spend_brl: spend,
        revenue_brl: rev,
        ctr:     imp > 0 ? clicks / imp : null,
        cpc_brl: clicks > 0 && spend > 0 ? spend / clicks : null,
        roas:    spend > 0 && rev > 0 ? rev / spend : null,
      });
    }
  }

  const AI_COST_BRL = COPY_AI_COST_USD_ESTIMATE * USD_TO_BRL;

  // 3. Compute + persist score for each copy
  const results: CopyRoiResult[] = [];

  for (const copy of copies) {
    const fogg = foggComposite(
      copy.fogg_motivation !== null ? Number(copy.fogg_motivation) : null,
      copy.fogg_ability    !== null ? Number(copy.fogg_ability)    : null,
      copy.fogg_prompt     !== null ? Number(copy.fogg_prompt)     : null,
    );

    const perf     = perfMap.get(copy.campaign_id);
    const hasPerf  = !!(perf && perf.impressions > 0);
    const { score, label } = buildScore(fogg, perf?.ctr ?? null, perf?.roas ?? null, hasPerf);

    const roiPct = perf && perf.spend_brl > 0
      ? ((perf.revenue_brl - perf.spend_brl - AI_COST_BRL) / (perf.spend_brl + AI_COST_BRL)) * 100
      : null;

    const summary = await generateSummary({
      hook:       copy.hook_text || '',
      platform:   copy.platform,
      fogg,
      impressions: perf?.impressions ?? 0,
      ctr:        perf?.ctr ?? null,
      roas:       perf?.roas ?? null,
      roi_score:  score,
      roi_label:  label,
      roi_pct:    roiPct,
    });

    // Upsert into copy_roi_scores
    await query(
      `INSERT INTO copy_roi_scores (
         tenant_id, client_id, campaign_id, behavioral_copy_id, briefing_id,
         fogg_motivation, fogg_ability, fogg_prompt, fogg_composite,
         total_impressions, total_clicks, total_conversions,
         total_spend_brl, total_revenue_brl,
         avg_ctr, avg_cpc_brl, avg_roas,
         ai_cost_usd, ai_cost_brl,
         roi_score, roi_label, roi_pct, summary, computed_at
       ) VALUES (
         $1,$2,$3,$4,$5, $6,$7,$8,$9, $10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,now()
       )
       ON CONFLICT (behavioral_copy_id) DO UPDATE SET
         fogg_composite    = EXCLUDED.fogg_composite,
         total_impressions = EXCLUDED.total_impressions,
         total_clicks      = EXCLUDED.total_clicks,
         total_conversions = EXCLUDED.total_conversions,
         total_spend_brl   = EXCLUDED.total_spend_brl,
         total_revenue_brl = EXCLUDED.total_revenue_brl,
         avg_ctr           = EXCLUDED.avg_ctr,
         avg_cpc_brl       = EXCLUDED.avg_cpc_brl,
         avg_roas          = EXCLUDED.avg_roas,
         ai_cost_brl       = EXCLUDED.ai_cost_brl,
         roi_score         = EXCLUDED.roi_score,
         roi_label         = EXCLUDED.roi_label,
         roi_pct           = EXCLUDED.roi_pct,
         summary           = EXCLUDED.summary,
         computed_at       = now()`,
      [
        tenantId, clientId, copy.campaign_id, copy.id, copy.briefing_id ?? null,
        copy.fogg_motivation ?? null, copy.fogg_ability ?? null, copy.fogg_prompt ?? null, fogg,
        perf?.impressions ?? 0, perf?.clicks ?? 0, perf?.conversions ?? 0,
        perf?.spend_brl ?? 0, perf?.revenue_brl ?? 0,
        perf?.ctr ?? null, perf?.cpc_brl ?? null, perf?.roas ?? null,
        COPY_AI_COST_USD_ESTIMATE, AI_COST_BRL,
        score, label, roiPct ?? null, summary,
      ],
    );

    results.push({
      behavioral_copy_id: copy.id,
      campaign_id:        copy.campaign_id,
      briefing_id:        copy.briefing_id,
      platform:           copy.platform,
      hook_text:          copy.hook_text,
      fogg_composite:     fogg,
      total_impressions:  perf?.impressions ?? 0,
      total_clicks:       perf?.clicks ?? 0,
      total_conversions:  perf?.conversions ?? 0,
      total_spend_brl:    perf?.spend_brl ?? 0,
      total_revenue_brl:  perf?.revenue_brl ?? 0,
      avg_ctr:            perf?.ctr ?? null,
      avg_cpc_brl:        perf?.cpc_brl ?? null,
      avg_roas:           perf?.roas ?? null,
      ai_cost_brl:        AI_COST_BRL,
      roi_score:          score,
      roi_label:          label,
      roi_pct:            roiPct ?? null,
      summary,
      computed_at:        new Date().toISOString(),
    });
  }

  return results;
}

// ── Fetch cached scores for a client ───────────────────────────────────────
export async function getClientCopyRoiScores(
  tenantId: string,
  clientId: string,
): Promise<CopyRoiResult[]> {
  const { rows } = await query<any>(
    `SELECT
       crs.behavioral_copy_id, crs.campaign_id, crs.briefing_id,
       cbc.platform, cbc.hook_text,
       crs.fogg_composite,
       crs.total_impressions, crs.total_clicks, crs.total_conversions,
       crs.total_spend_brl, crs.total_revenue_brl,
       crs.avg_ctr, crs.avg_cpc_brl, crs.avg_roas,
       crs.ai_cost_brl, crs.roi_score, crs.roi_label, crs.roi_pct,
       crs.summary, crs.computed_at
     FROM copy_roi_scores crs
     LEFT JOIN campaign_behavioral_copies cbc ON cbc.id = crs.behavioral_copy_id
     WHERE crs.tenant_id = $1 AND crs.client_id = $2
     ORDER BY crs.roi_score DESC NULLS LAST, crs.computed_at DESC
     LIMIT 50`,
    [tenantId, clientId],
  );

  return rows.map((r) => ({
    behavioral_copy_id: r.behavioral_copy_id,
    campaign_id:        r.campaign_id,
    briefing_id:        r.briefing_id,
    platform:           r.platform,
    hook_text:          r.hook_text,
    fogg_composite:     Number(r.fogg_composite),
    total_impressions:  Number(r.total_impressions),
    total_clicks:       Number(r.total_clicks),
    total_conversions:  Number(r.total_conversions),
    total_spend_brl:    Number(r.total_spend_brl),
    total_revenue_brl:  Number(r.total_revenue_brl),
    avg_ctr:            r.avg_ctr !== null ? Number(r.avg_ctr) : null,
    avg_cpc_brl:        r.avg_cpc_brl !== null ? Number(r.avg_cpc_brl) : null,
    avg_roas:           r.avg_roas !== null ? Number(r.avg_roas) : null,
    ai_cost_brl:        Number(r.ai_cost_brl),
    roi_score:          Number(r.roi_score),
    roi_label:          r.roi_label,
    roi_pct:            r.roi_pct !== null ? Number(r.roi_pct) : null,
    summary:            r.summary,
    computed_at:        r.computed_at,
  }));
}
