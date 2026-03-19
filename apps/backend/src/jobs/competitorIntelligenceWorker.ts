/**
 * Competitor Intelligence Worker
 *
 * Roda 1x/dia às 02:00 BRT (05:00 UTC).
 * Para cada cliente com ≥1 concorrente ativo, executa analyzeClientCompetitors:
 *   1. Coleta posts recentes dos concorrentes via social_listening_mentions
 *   2. Taga cada post com AgentTagger (AMD, triggers, emotional_tone)
 *   3. Computa dominant_amd, dominant_triggers, avg_engagement
 *   4. Gera differentiation_insight + counter_strategy via Claude
 *   5. Persiste em competitor_profiles
 *
 * Limita a 5 clientes por rodada para não sobrecarregar a API de IA.
 */

import { query } from '../db';
import { analyzeClientCompetitors } from '../services/competitorIntelligence';

const MAX_PER_TICK = 5;
let lastRunDate = '';

export async function triggerCompetitorIntelligenceNow(): Promise<void> {
  lastRunDate = '';
  return runCompetitorIntelligenceWorkerOnce();
}

export async function runCompetitorIntelligenceWorkerOnce(): Promise<void> {
  // Self-throttle: 1x/dia às 02:00 BRT (05:00 UTC)
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();
  if (hour < 5 || hour > 6) return;
  if (lastRunDate === dateKey) return;

  lastRunDate = dateKey;
  console.log('[competitorIntelligence] Starting daily run...');

  // Find clients with active competitors, prioritizing those not recently analyzed
  const clientsRes = await query<{ client_id: string; tenant_id: string; client_name: string; client_segment: string; last_analyzed: string | null }>(
    `SELECT DISTINCT
       cp.client_id::text,
       cp.tenant_id,
       c.name AS client_name,
       COALESCE(c.segment, '') AS client_segment,
       MAX(cp.last_analyzed_at) AS last_analyzed
     FROM competitor_profiles cp
     JOIN clients c ON c.id::text = cp.client_id::text
     WHERE cp.is_active = true
       AND (cp.last_analyzed_at IS NULL OR cp.last_analyzed_at < NOW() - INTERVAL '20 hours')
     GROUP BY cp.client_id, cp.tenant_id, c.name, c.segment
     ORDER BY last_analyzed ASC NULLS FIRST
     LIMIT $1`,
    [MAX_PER_TICK],
  );

  if (!clientsRes.rows.length) {
    console.log('[competitorIntelligence] No stale clients to analyze today.');
    return;
  }

  let analyzed = 0;
  for (const row of clientsRes.rows) {
    try {
      console.log(`[competitorIntelligence] Analyzing competitors for client "${row.client_name}"...`);
      const summary = await analyzeClientCompetitors(
        row.tenant_id,
        row.client_id,
        row.client_name,
        row.client_segment,
      );
      analyzed++;
      console.log(`[competitorIntelligence] Done for "${row.client_name}": ${summary.competitors.length} competitors, ${summary.differentiation_opportunities.length} opportunities`);
    } catch (err: any) {
      console.error(`[competitorIntelligence] Error for client "${row.client_name}":`, err?.message);
    }
  }

  console.log(`[competitorIntelligence] Done: ${analyzed}/${clientsRes.rows.length} clients analyzed.`);
}
