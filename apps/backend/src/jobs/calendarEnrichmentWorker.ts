/**
 * calendarEnrichmentWorker.ts
 *
 * Background worker that enriches calendar events in the `events` table:
 *  - Confirms date accuracy for 2026 via Tavily web search
 *  - Generates: descricao_ai, origem_ai, curiosidade_ai, hashtags_ai, angulo_editorial
 *  - All stored in events.payload (JSONB merge, no migration required)
 *
 * Rate: BATCH_SIZE events per BATCH_INTERVAL_MS (default: 20/hour)
 */

import { query } from '../db';
import { tavilySearch, isTavilyConfigured } from '../services/tavilyService';
import { logTavilyUsage } from '../services/ai/aiUsageLogger';
import { generateCompletion } from '../services/ai/openaiService';
import { env } from '../env';

const BATCH_SIZE = Number(process.env.CALENDAR_ENRICHMENT_BATCH_SIZE || 20);
const BATCH_INTERVAL_MS = Number(process.env.CALENDAR_ENRICHMENT_INTERVAL_MS || 60 * 60 * 1000);

let lastRunAt = 0;
let running = false;

type EventRow = {
  id: string;
  name: string;
  date: string;
  date_type: string | null;
};

export type EnrichmentResult = {
  id: string;
  name: string;
  ok: boolean;
  error?: string;
};

// ── Core enrichment logic (shared by worker + manual endpoint) ───────────────

export async function enrichCalendarEvent(event: EventRow): Promise<EnrichmentResult> {
  try {
    // 1. Tavily search: enriquecimento + validação de data numa só busca
    const searchQuery = `"${event.name}" data comemorativa história origem significado 2026 Brasil`;
    const t0 = Date.now();
    const searchRes = await tavilySearch(searchQuery, { maxResults: 3, searchDepth: 'basic' });
    logTavilyUsage({
      tenant_id: 'system',
      operation: 'search-basic',
      unit_count: 1,
      feature: 'calendar_enrichment',
      duration_ms: Date.now() - t0,
      metadata: { event_id: event.id, event_name: event.name },
    });

    const snippets = searchRes.results
      .filter((r: any) => r.snippet && r.snippet.length > 40)
      .slice(0, 3)
      .map((r: any) => `Fonte: ${r.url}\nTítulo: ${r.title}\n${r.snippet}`)
      .join('\n\n---\n\n');

    const topSource = searchRes.results[0];

    // 2. LLM estrutura o resultado (gpt-4o-mini — rápido e barato)
    let enriched: any = null;

    if (env.OPENAI_API_KEY && snippets.length > 50) {
      const systemPrompt = `Você é um especialista em datas comemorativas do Brasil e do mundo.
Analise os trechos de pesquisa fornecidos e responda APENAS com JSON válido, sem markdown.`;

      const prompt = `Evento: ${event.name}
Data no sistema: ${event.date}

Trechos de pesquisa:
${snippets}

Com base nesses trechos, responda APENAS com este JSON:
{
  "descricao_ai": "<50 a 150 palavras explicando o evento em português>",
  "origem_ai": "<breve história ou origem da data, em português>",
  "curiosidade_ai": "<um fato interessante sobre a data, em português>",
  "hashtags_ai": ["#HashtagPrincipal", "#SegundaHashtag", "#TerceiraHashtag"],
  "angulo_editorial": "<um dos: educativo | emocional | comercial | institucional | cultural>",
  "date_confirmed": <true se os trechos confirmam que ${event.name} é celebrado em ${event.date}, false se indicam data diferente ou não confirmam>,
  "date_source": "<url da fonte mais relevante ou null>"
}`;

      try {
        const llmRes = await generateCompletion({
          systemPrompt,
          prompt,
          temperature: 0.2,
          maxTokens: 600,
          model: 'gpt-4o-mini',
        });

        const text = llmRes.text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          enriched = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // LLM falhou — salvar só validação básica com snippet
      }
    }

    // Fallback sem LLM: usa o snippet diretamente
    if (!enriched && topSource?.snippet) {
      enriched = {
        descricao_ai: topSource.snippet.slice(0, 400),
        origem_ai: '',
        curiosidade_ai: '',
        hashtags_ai: [],
        angulo_editorial: 'cultural',
        date_confirmed: null,
        date_source: topSource.url,
      };
    }

    if (!enriched) {
      return { id: event.id, name: event.name, ok: false, error: 'no_content_found' };
    }

    // 3. Salvar no events.payload (JSONB merge)
    const now = new Date().toISOString();
    const patch = {
      descricao_ai: (enriched.descricao_ai || '').slice(0, 1000),
      origem_ai: (enriched.origem_ai || '').slice(0, 500),
      curiosidade_ai: (enriched.curiosidade_ai || '').slice(0, 500),
      hashtags_ai: Array.isArray(enriched.hashtags_ai) ? enriched.hashtags_ai.slice(0, 5) : [],
      angulo_editorial: enriched.angulo_editorial || 'cultural',
      date_confirmed: enriched.date_confirmed ?? null,
      date_source: enriched.date_source || topSource?.url || null,
      date_checked_at: now,
      enriched_at: now,
    };

    await query(
      `UPDATE events
       SET payload = COALESCE(payload, '{}'::jsonb) || $1::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(patch), event.id]
    );

    return { id: event.id, name: event.name, ok: true };
  } catch (err: any) {
    return { id: event.id, name: event.name, ok: false, error: err?.message ?? 'unknown_error' };
  }
}

// ── Worker entry point ───────────────────────────────────────────────────────

async function runBatch() {
  if (!isTavilyConfigured()) return;

  // Find events missing enrichment (or date validation), ordered by relevance
  const { rows: events } = await query<EventRow>(
    `SELECT id, name, date, date_type FROM events
     WHERE date IS NOT NULL
       AND (
         payload IS NULL
         OR payload->>'descricao_ai' IS NULL
         OR payload->>'descricao_ai' = ''
       )
     ORDER BY base_relevance DESC NULLS LAST
     LIMIT $1`,
    [BATCH_SIZE]
  );

  if (events.length === 0) {
    console.log('[calendarEnrichment] no pending events — all enriched');
    return;
  }

  console.log(`[calendarEnrichment] starting batch of ${events.length} events`);
  let processed = 0;
  let errors = 0;

  for (const event of events) {
    const result = await enrichCalendarEvent(event);
    if (result.ok) {
      processed++;
    } else {
      errors++;
      console.log(`[calendarEnrichment] skip event="${event.name}" reason="${result.error}"`);
    }

    // 3s between events to respect rate limits
    if (events.indexOf(event) < events.length - 1) {
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  console.log(`[calendarEnrichment] batch done processed=${processed} errors=${errors}`);
}

export async function runCalendarEnrichmentWorkerOnce() {
  if (!isTavilyConfigured()) return;
  if (running) return;

  const now = Date.now();
  if (now - lastRunAt < BATCH_INTERVAL_MS) return;

  running = true;
  lastRunAt = now;

  try {
    await runBatch();
  } catch (err: any) {
    console.error('[calendarEnrichment] batch error:', err?.message || err);
  } finally {
    running = false;
  }
}
