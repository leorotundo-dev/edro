import { env } from '../env';
import { logAiUsage } from './ai/aiUsageLogger';

// ── Types ──────────────────────────────────────────────────────────

export type PerplexitySearchResult = {
  title: string;
  url: string;
  snippet: string;
  date?: string;
};

export type PerplexityResponse = {
  content: string;
  citations: string[];
  search_results: PerplexitySearchResult[];
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

type PerplexitySearchOptions = {
  query: string;
  system_prompt?: string;
  model?: 'sonar' | 'sonar-pro' | 'sonar-reasoning-pro';
  search_recency_filter?: 'hour' | 'day' | 'week' | 'month' | 'year';
  search_domain_filter?: string[];
  language?: string;
  max_tokens?: number;
};

// ── Core API Client ────────────────────────────────────────────────

const API_URL = 'https://api.perplexity.ai/chat/completions';

function getApiKey(): string {
  const key = env.PERPLEXITY_API_KEY;
  if (!key) throw new Error('PERPLEXITY_API_KEY not configured');
  return key;
}

// Edro tenant ID for cost logging
const EDRO_TENANT_ID = '81fe2f7f-69d7-441a-9a2e-5c4f5d4c5cc5';

export async function searchPerplexity(options: PerplexitySearchOptions): Promise<PerplexityResponse> {
  const apiKey = getApiKey();
  const startMs = Date.now();

  const body: Record<string, any> = {
    model: options.model || 'sonar',
    messages: [
      ...(options.system_prompt
        ? [{ role: 'system', content: options.system_prompt }]
        : []),
      { role: 'user', content: options.query },
    ],
    max_tokens: options.max_tokens || 1024,
    language_preference: options.language || 'pt-BR',
  };

  if (options.search_recency_filter) {
    body.search_recency_filter = options.search_recency_filter;
  }
  if (options.search_domain_filter?.length) {
    body.search_domain_filter = options.search_domain_filter;
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Perplexity API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  const durationMs = Date.now() - startMs;
  const usage = data.usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
  const modelUsed = data.model || options.model || 'sonar';

  // Log cost (fire-and-forget)
  logAiUsage({
    tenant_id: EDRO_TENANT_ID,
    provider: 'perplexity',
    model: modelUsed,
    feature: 'perplexity_search',
    input_tokens: usage.prompt_tokens || 0,
    output_tokens: usage.completion_tokens || 0,
    duration_ms: durationMs,
    metadata: { query: options.query.slice(0, 200) },
  }).catch(() => {});

  return {
    content: data.choices?.[0]?.message?.content || '',
    citations: data.citations || [],
    search_results: (data.search_results || []).map((sr: any) => ({
      title: sr.title || '',
      url: sr.url || '',
      snippet: sr.snippet || '',
      date: sr.date || undefined,
    })),
    model: modelUsed,
    usage,
  };
}

// ── High-Level Search Functions ────────────────────────────────────

/**
 * Search for trending topics relevant to a client's profile
 */
export async function searchTrendingTopics(params: {
  client_name: string;
  keywords: string[];
  segment?: string;
  language?: string;
}): Promise<PerplexityResponse> {
  const keywordList = params.keywords.slice(0, 10).join(', ');
  const query = `Quais as tendencias e noticias mais recentes sobre ${keywordList} no segmento ${params.segment || 'geral'} no Brasil? Liste as 5 principais tendencias com fontes.`;

  return searchPerplexity({
    query,
    system_prompt: `Você é um analista de tendências de mercado especializado no segmento de ${params.segment || 'marketing digital'}. Responda de forma objetiva, com dados e fontes.`,
    search_recency_filter: 'week',
    language: params.language || 'pt-BR',
  });
}

/**
 * Enrich a clipping item with additional context from the web
 */
export async function enrichClippingItem(params: {
  title: string;
  snippet: string;
  url: string;
  client_keywords?: string[];
}): Promise<PerplexityResponse> {
  const keywords = params.client_keywords?.slice(0, 5).join(', ') || '';
  const query = `Analise esta noticia e seu impacto no mercado: "${params.title}". ${params.snippet ? `Resumo: ${params.snippet.slice(0, 300)}` : ''} ${keywords ? `Contexto: relevante para ${keywords}.` : ''} Encontre informacoes adicionais, dados e impactos relacionados.`;

  return searchPerplexity({
    query,
    system_prompt: 'Você é um analista de clipping e inteligência de mercado. Enriqueça a análise com dados complementares, fontes relevantes e impacto no mercado.',
    max_tokens: 800,
    language: 'pt-BR',
  });
}

/**
 * Research competitor activity for content intelligence
 */
export async function researchCompetitorActivity(params: {
  client_name: string;
  segment: string;
  platforms?: string[];
}): Promise<PerplexityResponse> {
  const platformList = params.platforms?.join(', ') || 'Instagram, LinkedIn, YouTube';
  const query = `Quais as estrategias de marketing digital mais eficazes no segmento ${params.segment} nas plataformas ${platformList} no Brasil em 2026? Quais formatos e abordagens estao tendo mais engajamento?`;

  return searchPerplexity({
    query,
    system_prompt: 'Você é um estrategista de marketing digital. Analise tendências de conteúdo, formatos e engajamento com dados reais.',
    search_recency_filter: 'month',
    language: 'pt-BR',
  });
}

/**
 * Quick fact-check or research for copy generation context
 */
export async function researchForCopy(params: {
  topic: string;
  platform: string;
  objective: string;
}): Promise<PerplexityResponse> {
  const query = `Pesquise dados e informacoes relevantes sobre "${params.topic}" para criar conteudo de ${params.objective} na plataforma ${params.platform}. Inclua estatisticas, dados recentes e exemplos de abordagens eficazes.`;

  return searchPerplexity({
    query,
    system_prompt: 'Você é um pesquisador de conteúdo para redes sociais. Forneça dados factuais, estatísticas e insights que possam ser usados na criação de copies.',
    max_tokens: 600,
    language: 'pt-BR',
  });
}

// ── Availability Check ─────────────────────────────────────────────

export function isPerplexityConfigured(): boolean {
  return !!env.PERPLEXITY_API_KEY;
}
