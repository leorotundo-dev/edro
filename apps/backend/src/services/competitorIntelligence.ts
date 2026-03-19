/**
 * Competitor Intelligence Service
 *
 * Monitora conteúdo de concorrentes, identifica padrão AMD deles,
 * e gera contra-posicionamento para o cliente.
 *
 * Fluxo:
 *   1. Para cada competitor_profile do cliente: coleta posts recentes via social listening
 *   2. Roda AgentTagger em cada post (AMD, triggers, emotional_tone)
 *   3. Agrega padrões: dominant_amd, dominant_triggers, top_themes
 *   4. Gera differentiation_insight + counter_strategy via Claude
 *   5. Persiste em competitor_profiles + competitor_posts
 */

import { query } from '../db';
import { tagCopy } from './ai/agentTagger';
import { generateWithProvider } from './ai/copyOrchestrator';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CompetitorProfile {
  id: string;
  tenant_id: string;
  client_id: string;
  handle: string;
  platform: string;
  display_name?: string;
  dominant_amd?: string;
  dominant_triggers?: string[];
  avg_engagement?: number;
  differentiation_insight?: string;
  counter_strategy?: string;
  last_analyzed_at?: string;
}

export interface CompetitorSummary {
  client_id: string;
  competitors: CompetitorProfile[];
  differentiation_opportunities: string[];
  client_recommended_amds: string[];
}

// ── Add competitor ────────────────────────────────────────────────────────────

export async function addCompetitor(params: {
  tenantId: string;
  clientId: string;
  handle: string;
  platform: string;
  displayName?: string;
}): Promise<CompetitorProfile> {
  const res = await query<any>(
    `INSERT INTO competitor_profiles (tenant_id, client_id, handle, platform, display_name)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, client_id, handle, platform) DO UPDATE
       SET display_name = COALESCE(EXCLUDED.display_name, competitor_profiles.display_name),
           updated_at = NOW()
     RETURNING *`,
    [params.tenantId, params.clientId, params.handle, params.platform, params.displayName ?? null],
  );
  return res.rows[0];
}

// ── List competitors for client ───────────────────────────────────────────────

export async function listCompetitors(tenantId: string, clientId: string): Promise<CompetitorProfile[]> {
  const res = await query<any>(
    `SELECT * FROM competitor_profiles
     WHERE tenant_id = $1 AND client_id = $2 AND is_active = true
     ORDER BY created_at DESC`,
    [tenantId, clientId],
  );
  return res.rows;
}

// ── Collect + analyze posts for a competitor ─────────────────────────────────

async function collectAndAnalyzePosts(
  profile: CompetitorProfile,
  tenantId: string,
): Promise<number> {
  // Query social_listening_mentions for posts by this handle
  const postsRes = await query<any>(
    `SELECT id, content, platform, published_at,
            engagement_likes as likes, engagement_comments as comments,
            engagement_shares as shares, external_id,
            CASE WHEN total_impressions > 0
                 THEN (engagement_likes + engagement_comments + engagement_shares)::numeric / total_impressions
                 ELSE 0 END as engagement_rate
     FROM social_listening_mentions
     WHERE tenant_id = $1
       AND (author ILIKE $2 OR content ILIKE $2)
       AND platform = $3
       AND collected_at >= NOW() - INTERVAL '30 days'
     ORDER BY published_at DESC
     LIMIT 20`,
    [tenantId, `%${profile.handle}%`, profile.platform],
  );

  if (!postsRes.rows.length) return 0;

  let analyzed = 0;
  for (const post of postsRes.rows) {
    if (!post.content || post.content.length < 20) continue;

    try {
      // Check if already analyzed
      const existing = await query<{ count: string }>(
        `SELECT COUNT(*) as count FROM competitor_posts
         WHERE competitor_profile_id = $1 AND external_id = $2`,
        [profile.id, post.external_id ?? post.id],
      );
      if (parseInt(existing.rows[0]?.count ?? '0') > 0) continue;

      // Tag with AgentTagger
      const tags = await tagCopy(post.content, post.platform ?? null);

      await query(
        `INSERT INTO competitor_posts
           (competitor_profile_id, tenant_id, external_id, content, platform, published_at,
            likes, comments, shares, engagement_rate,
            detected_amd, detected_triggers, emotional_tone, dark_social_potential, analyzed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
         ON CONFLICT (competitor_profile_id, external_id) DO NOTHING`,
        [
          profile.id,
          tenantId,
          post.external_id ?? post.id,
          post.content,
          post.platform,
          post.published_at ?? null,
          post.likes ?? 0,
          post.comments ?? 0,
          post.shares ?? 0,
          post.engagement_rate ?? 0,
          null,                                           // detected_amd: populated by pattern analysis
          tags?.semantic_topics ?? [],                   // detected_triggers: use semantic topics as proxy
          tags?.emotional_tone ?? null,
          tags?.dark_social_potential === 'high' ? 3
            : tags?.dark_social_potential === 'medium' ? 2
            : tags?.dark_social_potential === 'low' ? 1
            : null,
        ],
      );
      analyzed++;
    } catch {
      // individual post error doesn't stop the loop
    }
  }

  return analyzed;
}

// ── Compute dominant pattern from collected posts ────────────────────────────

async function computePattern(profileId: string): Promise<{
  dominant_amd: string | null;
  dominant_triggers: string[];
  avg_engagement: number;
  top_themes: string[];
}> {
  const postsRes = await query<any>(
    `SELECT detected_amd, detected_triggers, emotional_tone, engagement_rate
     FROM competitor_posts
     WHERE competitor_profile_id = $1 AND detected_amd IS NOT NULL
     ORDER BY collected_at DESC
     LIMIT 30`,
    [profileId],
  );

  if (!postsRes.rows.length) {
    return { dominant_amd: null, dominant_triggers: [], avg_engagement: 0, top_themes: [] };
  }

  // Count AMD frequency
  const amdFreq: Record<string, number> = {};
  const triggerFreq: Record<string, number> = {};
  const toneFreq: Record<string, number> = {};
  let totalEng = 0;

  for (const post of postsRes.rows) {
    if (post.detected_amd) amdFreq[post.detected_amd] = (amdFreq[post.detected_amd] ?? 0) + 1;
    for (const t of post.detected_triggers ?? []) {
      triggerFreq[t] = (triggerFreq[t] ?? 0) + 1;
    }
    if (post.emotional_tone) toneFreq[post.emotional_tone] = (toneFreq[post.emotional_tone] ?? 0) + 1;
    totalEng += parseFloat(post.engagement_rate ?? '0');
  }

  const dominant_amd = Object.entries(amdFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const dominant_triggers = Object.entries(triggerFreq).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([t]) => t);
  const top_themes = Object.entries(toneFreq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([t]) => t);
  const avg_engagement = totalEng / postsRes.rows.length;

  return { dominant_amd, dominant_triggers, avg_engagement, top_themes };
}

// ── Generate differentiation insight ─────────────────────────────────────────

async function generateDifferentiationInsight(params: {
  clientName: string;
  clientSegment: string;
  competitorHandle: string;
  dominantAmd: string;
  dominantTriggers: string[];
  clientCompetitors: CompetitorProfile[];
}): Promise<{ insight: string; counter_strategy: string }> {
  const competitorPattern = `AMD dominante: ${params.dominantAmd}, gatilhos: ${params.dominantTriggers.join(', ')}`;
  const otherCompetitorAmds = params.clientCompetitors
    .filter(c => c.dominant_amd && c.handle !== params.competitorHandle)
    .map(c => c.dominant_amd!)
    .filter((v, i, a) => a.indexOf(v) === i);

  const prompt = `Você é um estrategista de conteúdo digital.

Cliente: ${params.clientName} (segmento: ${params.clientSegment})
Concorrente monitorado: @${params.competitorHandle}
Padrão do concorrente: ${competitorPattern}
Outros concorrentes também usam: ${otherCompetitorAmds.join(', ') || 'dados insuficientes'}

Com base no padrão de AMD e gatilhos que os concorrentes estão usando, gere:
1. Um insight de diferenciação (1-2 frases): onde está a oportunidade não explorada?
2. Uma estratégia de contra-posicionamento (1-2 frases): como o cliente deve se posicionar?

Responda em JSON: { "insight": "...", "counter_strategy": "..." }`;

  const result = await generateWithProvider('claude', { prompt, temperature: 0.5, maxTokens: 300 });
  try {
    const parsed = JSON.parse(result.output.trim().replace(/```json|```/g, ''));
    return { insight: parsed.insight ?? '', counter_strategy: parsed.counter_strategy ?? '' };
  } catch {
    return {
      insight: `Concorrente @${params.competitorHandle} usa predominantemente AMD="${params.dominantAmd}". Oportunidade de diferenciação com AMD alternativo.`,
      counter_strategy: `Posicionar com abordagem diferente de "${params.dominantAmd}" — especialmente com conteúdo mais educativo ou de prova social.`,
    };
  }
}

// ── Public: analyze all competitors for a client ─────────────────────────────

export async function analyzeClientCompetitors(
  tenantId: string,
  clientId: string,
  clientName: string,
  clientSegment: string,
): Promise<CompetitorSummary> {
  const competitors = await listCompetitors(tenantId, clientId);
  if (!competitors.length) {
    return { client_id: clientId, competitors: [], differentiation_opportunities: [], client_recommended_amds: [] };
  }

  for (const competitor of competitors) {
    try {
      await collectAndAnalyzePosts(competitor, tenantId);

      const pattern = await computePattern(competitor.id);
      if (!pattern.dominant_amd) continue;

      const { insight, counter_strategy } = await generateDifferentiationInsight({
        clientName,
        clientSegment,
        competitorHandle: competitor.handle,
        dominantAmd: pattern.dominant_amd,
        dominantTriggers: pattern.dominant_triggers,
        clientCompetitors: competitors,
      });

      await query(
        `UPDATE competitor_profiles SET
           dominant_amd = $1,
           dominant_triggers = $2,
           avg_engagement = $3,
           top_content_themes = $4,
           differentiation_insight = $5,
           counter_strategy = $6,
           last_analyzed_at = NOW(),
           updated_at = NOW()
         WHERE id = $7`,
        [
          pattern.dominant_amd,
          pattern.dominant_triggers,
          pattern.avg_engagement,
          JSON.stringify(pattern.top_themes),
          insight,
          counter_strategy,
          competitor.id,
        ],
      );
    } catch (err: any) {
      console.error(`[competitorIntelligence] Error for @${competitor.handle}:`, err?.message);
    }
  }

  // Reload with updated data
  const updated = await listCompetitors(tenantId, clientId);

  // Compute differentiation opportunities
  const competitorAmds = updated.map(c => c.dominant_amd).filter(Boolean) as string[];
  const allAmds = ['salvar', 'compartilhar', 'clicar', 'responder', 'pedir_proposta'];
  const unusedAmds = allAmds.filter(amd => !competitorAmds.includes(amd));

  const opportunities = updated
    .filter(c => c.differentiation_insight)
    .map(c => c.differentiation_insight!);

  return {
    client_id: clientId,
    competitors: updated,
    differentiation_opportunities: opportunities,
    client_recommended_amds: unusedAmds,
  };
}
