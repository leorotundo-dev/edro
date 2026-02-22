/**
 * Web Market Intelligence Service
 * Automatically researches a client's market using Tavily:
 * - Extracts their website content
 * - Searches for industry trends
 * - Searches competitor activity
 * - Saves results as library items for AI use
 *
 * RAG Evaluation: before saving each search result, a fast LLM call
 * (gpt-4o-mini) scores relevance 0-10. Items scoring < 6 are discarded,
 * preventing noise from polluting the client's library and embeddings.
 */

import { query } from '../db';
import { enqueueJob } from '../jobs/jobQueue';
import { tavilySearch, tavilyExtract, isTavilyConfigured } from './tavilyService';
import { generateCompletion } from './ai/openaiService';
import { logTavilyUsage } from './ai/aiUsageLogger';
import { env } from '../env';

export type MarketIntelligenceResult = {
  itemsSaved: number;
  skipped: number;
  searches: string[];
  errors: string[];
};

type ClientRow = {
  id: string;
  name: string;
  tenant_id: string;
  segment_primary?: string | null;
  profile?: Record<string, any> | null;
};

// ── Main orchestrator ───────────────────────────────────────────

export async function runMarketIntelligenceForClient(params: {
  tenantId: string;
  clientId: string;
  trigger: 'onboarding' | 'weekly' | 'manual';
}): Promise<MarketIntelligenceResult> {
  const { tenantId, clientId, trigger } = params;

  if (!isTavilyConfigured()) {
    return { itemsSaved: 0, skipped: 0, searches: [], errors: ['TAVILY_API_KEY nao configurado'] };
  }

  // Load client data
  const { rows } = await query<ClientRow>(
    `SELECT id, name, tenant_id, segment_primary, profile FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [clientId, tenantId]
  );
  if (!rows.length) return { itemsSaved: 0, skipped: 0, searches: [], errors: ['Cliente nao encontrado'] };

  const client = rows[0];
  const profile = client.profile ?? {};
  const kb = profile.knowledge_base ?? {};
  const website: string | null = kb.website || null;
  const keywords: string[] = Array.isArray(profile.keywords) ? profile.keywords.slice(0, 5) : [];
  const competitors: string[] = Array.isArray(profile.competitors) ? profile.competitors.slice(0, 3) : [];
  const sector = client.segment_primary || kb.industry || '';

  const savedIds: string[] = [];
  const searches: string[] = [];
  const errors: string[] = [];
  let skipped = 0;

  // ── 1. Extract client website ───────────────────────────────
  if (website) {
    try {
      const t0 = Date.now();
      const extracted = await tavilyExtract([website], { timeoutMs: 12000 });
      logTavilyUsage({ tenant_id: tenantId, operation: 'extract', unit_count: 1, feature: 'web_intelligence', duration_ms: Date.now() - t0, metadata: { client_id: clientId, trigger } });
      for (const item of extracted.results) {
        if (!item.content || item.content.length < 100) continue;
        const id = await saveLibraryItem({
          tenantId,
          clientId,
          title: item.title || `Site: ${client.name}`,
          description: `Conteúdo extraído do site oficial de ${client.name}`,
          notes: item.content.slice(0, 3000),
          sourceUrl: item.url,
          category: 'posicionamento',
          tags: ['ai_research', 'website', 'posicionamento'],
        });
        if (id) savedIds.push(id);
      }
      searches.push(`website:${website}`);
    } catch (err: any) {
      errors.push(`website_extract: ${err.message}`);
    }
  }

  // ── 2. Industry trends ──────────────────────────────────────
  if (sector || keywords.length > 0) {
    const trendQuery = sector
      ? `${sector} tendências conteúdo digital marketing 2026`
      : `${keywords.slice(0, 2).join(' ')} tendências marketing digital 2026`;
    try {
      const t1 = Date.now();
      const trendResult = await tavilySearch(trendQuery, { maxResults: 5, searchDepth: 'basic', includeAnswer: false });
      logTavilyUsage({ tenant_id: tenantId, operation: 'search-basic', unit_count: 1, feature: 'web_intelligence', duration_ms: Date.now() - t1, metadata: { client_id: clientId, query: trendQuery } });
      const top = trendResult.results.slice(0, 3);
      for (const r of top) {
        if (!r.snippet || r.snippet.length < 50) continue;
        const score = await scoreContentRelevance(client, { title: r.title, snippet: r.snippet }, 'tendencia');
        if (score < 6) { skipped++; continue; }
        const id = await saveLibraryItem({
          tenantId,
          clientId,
          title: r.title || trendQuery,
          description: r.snippet.slice(0, 300),
          notes: `${r.title}\n\n${r.snippet}\n\nFonte: ${r.url}`,
          sourceUrl: r.url,
          category: 'tendencia',
          tags: ['ai_research', 'tendencia', `relevance_${score}`, sector.toLowerCase().slice(0, 20)].filter(Boolean),
        });
        if (id) savedIds.push(id);
      }
      searches.push(`trends:${trendQuery}`);
    } catch (err: any) {
      errors.push(`trends: ${err.message}`);
    }
  }

  // ── 3. Competitor research ──────────────────────────────────
  if (competitors.length > 0) {
    const compQuery = `${competitors.slice(0, 2).join(' OR ')} estratégia conteúdo marketing`;
    try {
      const t2 = Date.now();
      const compResult = await tavilySearch(compQuery, { maxResults: 4, searchDepth: 'basic' });
      logTavilyUsage({ tenant_id: tenantId, operation: 'search-basic', unit_count: 1, feature: 'web_intelligence', duration_ms: Date.now() - t2, metadata: { client_id: clientId, query: compQuery } });
      for (const r of compResult.results.slice(0, 2)) {
        if (!r.snippet || r.snippet.length < 50) continue;
        const score = await scoreContentRelevance(client, { title: r.title, snippet: r.snippet }, 'concorrente');
        if (score < 6) { skipped++; continue; }
        const id = await saveLibraryItem({
          tenantId,
          clientId,
          title: r.title || `Concorrente: ${compQuery}`,
          description: r.snippet.slice(0, 300),
          notes: `${r.title}\n\n${r.snippet}\n\nFonte: ${r.url}`,
          sourceUrl: r.url,
          category: 'concorrente',
          tags: ['ai_research', 'concorrente', `relevance_${score}`],
        });
        if (id) savedIds.push(id);
      }
      searches.push(`competitors:${compQuery}`);
    } catch (err: any) {
      errors.push(`competitors: ${err.message}`);
    }
  }

  // ── 4. Keywords search ──────────────────────────────────────
  if (keywords.length >= 2) {
    const kwQuery = `${keywords.slice(0, 3).join(' ')} conteúdo viral tendência`;
    try {
      const t3 = Date.now();
      const kwResult = await tavilySearch(kwQuery, { maxResults: 3, searchDepth: 'basic' });
      logTavilyUsage({ tenant_id: tenantId, operation: 'search-basic', unit_count: 1, feature: 'web_intelligence', duration_ms: Date.now() - t3, metadata: { client_id: clientId, query: kwQuery } });
      for (const r of kwResult.results.slice(0, 2)) {
        if (!r.snippet || r.snippet.length < 50) continue;
        const score = await scoreContentRelevance(client, { title: r.title, snippet: r.snippet }, 'referencia');
        if (score < 6) { skipped++; continue; }
        const id = await saveLibraryItem({
          tenantId,
          clientId,
          title: r.title || `Keywords: ${kwQuery}`,
          description: r.snippet.slice(0, 300),
          notes: `${r.title}\n\n${r.snippet}\n\nFonte: ${r.url}`,
          sourceUrl: r.url,
          category: 'referencia',
          tags: ['ai_research', 'keywords', 'referencia', `relevance_${score}`],
        });
        if (id) savedIds.push(id);
      }
      searches.push(`keywords:${kwQuery}`);
    } catch (err: any) {
      errors.push(`keywords: ${err.message}`);
    }
  }

  // ── 5. Content Gap Analysis ──────────────────────────────────
  // O que o concorrente publica que o cliente ainda não cobre?
  if (competitors.length > 0 && (sector || keywords.length > 0)) {
    const gapQuery = `${competitors[0]} ${sector} conteúdo estratégia publicação`;
    try {
      const t4 = Date.now();
      const gapResult = await tavilySearch(gapQuery, { maxResults: 3, searchDepth: 'basic' });
      logTavilyUsage({ tenant_id: tenantId, operation: 'search-basic', unit_count: 1, feature: 'web_intelligence_gap', duration_ms: Date.now() - t4, metadata: { client_id: clientId } });
      for (const r of gapResult.results.slice(0, 1)) {
        if (!r.snippet || r.snippet.length < 50) continue;
        const score = await scoreContentRelevance(client, { title: r.title, snippet: r.snippet }, 'gap_analysis');
        if (score < 5) { skipped++; continue; }
        const id = await saveLibraryItem({
          tenantId,
          clientId,
          title: `Gap: ${r.title.slice(0, 180)}`,
          description: r.snippet.slice(0, 300),
          notes: `ANÁLISE DE GAP DE CONTEÚDO\n\nConcorrente: ${competitors[0]}\n\n${r.title}\n\n${r.snippet}\n\nFonte: ${r.url}`,
          sourceUrl: r.url,
          category: 'gap_analise',
          tags: ['ai_research', 'gap_analysis', `relevance_${score}`],
        });
        if (id) savedIds.push(id);
      }
      searches.push(`gap:${gapQuery}`);
    } catch (err: any) {
      errors.push(`gap: ${err.message}`);
    }
  }

  // ── 7. Queue embedding for all saved items ──────────────────
  for (const itemId of savedIds) {
    try {
      await enqueueJob(tenantId, 'process_library_item', { library_item_id: itemId, tenant_id: tenantId, client_id: clientId });
    } catch {
      // best-effort
    }
  }

  // ── 8. Update last-run timestamp ────────────────────────────
  const now = new Date().toISOString();
  await query(
    `UPDATE clients
     SET sections_refreshed_at = COALESCE(sections_refreshed_at, '{}'::jsonb) || $1::jsonb,
         updated_at = NOW()
     WHERE id=$2 AND tenant_id=$3`,
    [JSON.stringify({ web_intelligence: now, web_intelligence_trigger: trigger }), clientId, tenantId]
  ).catch(() => {});

  console.log(`[webMarketIntelligence] client=${clientId} trigger=${trigger} saved=${savedIds.length} skipped=${skipped} searches=${searches.length} errors=${errors.length}`);

  return { itemsSaved: savedIds.length, skipped, searches, errors };
}

// ── RAG Evaluation: score relevance before saving ───────────────
// Uses gpt-4o-mini for speed and low cost (~0.0001 USD per call).
// Returns 0-10. If scoring fails, returns 7 (save by default).
// The website extraction (section 1) is always relevant — not scored.

async function scoreContentRelevance(
  client: ClientRow,
  content: { title: string; snippet: string },
  category: string
): Promise<number> {
  if (!env.OPENAI_API_KEY) return 7; // no LLM available — save everything

  try {
    const result = await generateCompletion({
      systemPrompt: 'Você é um avaliador de relevância para marketing de conteúdo. Responda APENAS com JSON.',
      prompt: `Cliente: ${client.name}
Setor: ${client.segment_primary || 'não informado'}
Categoria: ${category}

Título: ${content.title.slice(0, 150)}
Trecho: ${content.snippet.slice(0, 400)}

Avalie de 0 a 10 a relevância deste conteúdo para embasar a estratégia de marketing do cliente.
- 0-5: irrelevante, genérico demais ou sem relação com o setor
- 6-7: relevante, útil como referência
- 8-10: excelente, específico e acionável para o cliente

Responda APENAS: {"score": <número inteiro>}`,
      temperature: 0,
      maxTokens: 20,
    });

    const match = result.text.match(/"score"\s*:\s*(\d+)/);
    if (match) {
      const score = Math.min(10, Math.max(0, parseInt(match[1], 10)));
      return score;
    }
  } catch {
    // best-effort: if scoring fails, save the item
  }

  return 7;
}

// ── Helper: save as library item (deduplicates by source_url) ──

async function saveLibraryItem(params: {
  tenantId: string;
  clientId: string;
  title: string;
  description: string;
  notes: string;
  sourceUrl: string;
  category: string;
  tags: string[];
}): Promise<string | null> {
  const { tenantId, clientId, title, description, notes, sourceUrl, category, tags } = params;

  // Deduplicate: skip if we already have this URL for this client
  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM library_items WHERE client_id=$1 AND source_url=$2 AND created_by='ai_research' LIMIT 1`,
    [clientId, sourceUrl]
  );
  if (existing.length > 0) return null;

  const { rows } = await query<{ id: string }>(
    `INSERT INTO library_items
       (tenant_id, client_id, type, title, description, category, tags, weight, use_in_ai, source_url, notes, created_by, status)
     VALUES ($1, $2, 'note', $3, $4, $5, $6, 'high', true, $7, $8, 'ai_research', 'pending')
     RETURNING id`,
    [tenantId, clientId, title.slice(0, 200), description.slice(0, 500), category, tags, sourceUrl, notes.slice(0, 3000)]
  );

  return rows[0]?.id ?? null;
}
