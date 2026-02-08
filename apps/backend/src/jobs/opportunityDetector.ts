import { query } from '../db';
import { generateWithProvider } from '../services/ai/copyOrchestrator';
import crypto from 'crypto';

type OpportunitySource = {
  type: 'clipping' | 'social' | 'calendar';
  id: string;
  title: string;
  description: string;
  score: number;
  date?: string;
  metadata?: any;
};

/** Resolve clients.id (TEXT) → edro_clients.id (UUID) via name match */
async function resolveEdroId(clientId: string): Promise<string | null> {
  try {
    const { rows } = await query(
      `SELECT ec.id FROM edro_clients ec
       JOIN clients c ON LOWER(ec.name) = LOWER(c.name)
       WHERE c.id = $1 LIMIT 1`,
      [clientId]
    );
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Scan all data sources and detect opportunities for a specific client.
 * Accepts clients.id (TEXT) — resolves edro_clients UUID internally.
 * Sources: Clipping (score > 80), Social (trending UP), Calendar (next 14 days)
 */
export async function detectOpportunitiesForClient(params: {
  tenant_id: string;
  client_id: string;
}): Promise<number> {
  // Resolve edro_clients UUID for ai_opportunities (UUID client_id)
  const edroId = await resolveEdroId(params.client_id);
  if (!edroId) return 0;
  const sources: OpportunitySource[] = [];

  // 1. Scan clipping (high relevance, recent)
  const clippingResult = await query(`
    SELECT cm.id, ci.title, ci.snippet, cm.score, ci.published_at
    FROM clipping_matches cm
    JOIN clipping_items ci ON ci.id = cm.clipping_item_id
    WHERE cm.client_id = $1
      AND cm.tenant_id = $2
      AND ci.status = 'NEW'
      AND cm.score > 80
      AND ci.published_at > NOW() - INTERVAL '7 days'
    ORDER BY cm.score DESC
    LIMIT 10
  `, [params.client_id, params.tenant_id]);

  clippingResult.rows.forEach((row: any) => {
    sources.push({
      type: 'clipping',
      id: row.id,
      title: row.title,
      description: row.snippet || '',
      score: row.score,
      date: row.published_at,
    });
  });

  // 2. Scan social listening (trending keywords)
  const socialResult = await query(`
    SELECT
      keyword,
      platform,
      mention_count,
      average_sentiment,
      total_engagement,
      created_at,
      LAG(mention_count) OVER (PARTITION BY keyword ORDER BY created_at) as prev_count
    FROM social_listening_trends
    WHERE client_id = $1
      AND tenant_id = $2
      AND created_at > NOW() - INTERVAL '7 days'
    ORDER BY mention_count DESC
  `, [params.client_id, params.tenant_id]);

  socialResult.rows.forEach((row: any) => {
    const momentum = row.prev_count ? (row.mention_count - row.prev_count) / row.prev_count : 0;
    if (momentum > 0.3) {
      // 30% growth = trending UP
      sources.push({
        type: 'social',
        id: crypto.randomUUID(),
        title: `Tendência: ${row.keyword}`,
        description: `${row.mention_count} menções no ${row.platform}, crescimento de ${Math.round(momentum * 100)}%`,
        score: Math.min(100, 60 + momentum * 100),
        metadata: { platform: row.platform, sentiment: row.average_sentiment },
      });
    }
  });

  // 3. Scan calendar (upcoming high-relevance events)
  const calendarResult = await query(`
    SELECT
      id,
      name,
      date,
      description,
      base_relevance,
      categories
    FROM events
    WHERE date IS NOT NULL AND length(date) = 10
      AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD')
      AND date <= to_char(CURRENT_DATE + INTERVAL '14 days', 'YYYY-MM-DD')
      AND base_relevance > 70
    ORDER BY base_relevance DESC, date
    LIMIT 15
  `, []);

  calendarResult.rows.forEach((row: any) => {
    sources.push({
      type: 'calendar',
      id: row.id,
      title: row.name,
      description: row.description || '',
      score: row.base_relevance,
      date: row.date,
      metadata: { categories: row.categories },
    });
  });

  // Temporal scoring: boost opportunities closer to now
  const now = new Date();
  sources.forEach((source) => {
    if (source.date) {
      const date = new Date(source.date);
      const daysAway = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysAway <= 7) {
        source.score += 10; // Boost for next 7 days
      }
      if (daysAway <= 3) {
        source.score += 10; // Extra boost for next 3 days
      }
    }
  });

  // Sort by score
  sources.sort((a, b) => b.score - a.score);

  // If no sources, return early
  if (sources.length === 0) {
    return 0;
  }

  // Use AI (Claude) to generate opportunity descriptions
  const opportunitiesPrompt = `
Você é um analista de oportunidades de marketing.
Abaixo estão ${sources.length} fontes de dados (clipping, tendências sociais, calendário).
Para cada fonte, crie uma "oportunidade" concisa com:
- title: título acionável (max 80 chars)
- description: descrição (2-3 frases)
- suggested_action: ação concreta sugerida
- priority: urgent | high | medium | low
- confidence: 0-100

Retorne APENAS JSON array:
[
  {
    "source_type": "clipping|social|calendar",
    "source_id": "id",
    "title": "...",
    "description": "...",
    "suggested_action": "...",
    "priority": "high",
    "confidence": 85
  }
]

FONTES:
${sources.map((s, i) => `${i + 1}. [${s.type}] ${s.title} (score: ${s.score})\n   ${s.description}`).join('\n\n')}
`;

  const aiResult = await generateWithProvider('claude', {
    prompt: opportunitiesPrompt,
    systemPrompt: 'You are a strategic marketing analyst. Return only valid JSON.',
    temperature: 0.5,
    maxTokens: 2000,
  }, { tenant_id: params.tenant_id, feature: 'opportunity_detection' });

  // Parse AI output
  let opportunities: any[] = [];
  try {
    const jsonMatch = aiResult.output.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      opportunities = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error('Failed to parse opportunities:', e);
    // Fallback: create simple opportunities from sources
    opportunities = sources.slice(0, 5).map((s) => ({
      source_type: s.type,
      source_id: s.id,
      title: s.title,
      description: s.description,
      suggested_action: 'Analisar e criar briefing',
      priority: s.score > 90 ? 'urgent' : s.score > 80 ? 'high' : 'medium',
      confidence: s.score,
    }));
  }

  // Deduplication: hash title+description to avoid duplicates
  const existingHashes = new Set<string>();
  const { rows: existing } = await query(`
    SELECT
      MD5(LOWER(title || COALESCE(description, ''))) as hash
    FROM ai_opportunities
    WHERE client_id = $1::uuid
      AND tenant_id = $2::text
      AND created_at > NOW() - INTERVAL '30 days'
  `, [edroId, params.tenant_id]);
  existing.forEach((row: any) => existingHashes.add(row.hash));

  // Insert new opportunities
  let inserted = 0;
  for (const opp of opportunities) {
    const hash = crypto
      .createHash('md5')
      .update((opp.title + (opp.description || '')).toLowerCase())
      .digest('hex');

    if (existingHashes.has(hash)) {
      continue; // Skip duplicate
    }

    await query(`
      INSERT INTO ai_opportunities (
        tenant_id,
        client_id,
        title,
        description,
        source,
        source_ids,
        confidence,
        suggested_action,
        priority,
        opportunity_hash,
        score,
        trending_up
      ) VALUES ($1::text, $2::uuid, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      params.tenant_id,
      edroId,
      opp.title,
      opp.description,
      opp.source_type,
      [opp.source_id],
      opp.confidence || 70,
      opp.suggested_action,
      opp.priority || 'medium',
      hash,
      opp.confidence || 70,
      opp.source_type === 'social',
    ]);
    inserted++;
  }

  return inserted;
}

/**
 * Run detector for all active clients in a tenant
 */
export async function runOpportunityDetectorForAllClients(tenant_id: string): Promise<void> {
  const { rows: clients } = await query(`
    SELECT id FROM clients WHERE tenant_id = $1
  `, [tenant_id]);

  for (const client of clients) {
    try {
      const count = await detectOpportunitiesForClient({
        tenant_id,
        client_id: client.id,
      });
      console.log(`[OpportunityDetector] Client ${client.id}: ${count} new opportunities`);
    } catch (error) {
      console.error(`[OpportunityDetector] Failed for client ${client.id}:`, error);
    }
  }
}
