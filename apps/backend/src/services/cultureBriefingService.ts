/**
 * cultureBriefingService — Camada 1: Pesquisa de Cultura
 *
 * Antes de gerar conceito ou copy, injeta o que está acontecendo AGORA
 * relevante para o cliente: Google Trends + clipping recente.
 *
 * Produz um "culture block" de texto para injetar nos prompts de
 * agentConceito e agentRedator.
 */

import { query } from '../db';
import { queryGoogleTrends, isTrendsConfigured } from './googleTrendsService';

// ─── Types ────────────────────────────────────────────────────────────────────

export type CultureBriefing = {
  trending_topics: { topic: string; score: number }[];
  recent_news: { title: string; source: string; published_at: string }[];
  culture_block: string;   // Ready-to-inject text block for prompt
};

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function buildCultureBriefing(
  clientId: string,
  tenantId: string,
  segmentKeywords?: string[],
): Promise<CultureBriefing> {
  const [trends, news] = await Promise.allSettled([
    fetchTrends(segmentKeywords ?? []),
    fetchRecentClipping(clientId, tenantId),
  ]);

  const trending_topics = trends.status === 'fulfilled' ? trends.value : [];
  const recent_news = news.status === 'fulfilled' ? news.value : [];

  const culture_block = buildBlock(trending_topics, recent_news);

  return { trending_topics, recent_news, culture_block };
}

// ─── Internals ────────────────────────────────────────────────────────────────

async function fetchTrends(keywords: string[]): Promise<{ topic: string; score: number }[]> {
  if (!isTrendsConfigured() || keywords.length === 0) return [];
  const signals = await queryGoogleTrends(keywords.slice(0, 5), 'BR', 'today 7-d');
  return signals
    .filter((s) => s.score > 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

async function fetchRecentClipping(
  clientId: string,
  tenantId: string,
): Promise<{ title: string; source: string; published_at: string }[]> {
  try {
    const res = await query<{ title: string; source_name: string; published_at: string }>(
      `SELECT ci.title, cs.name AS source_name, ci.published_at
       FROM clipping_items ci
       JOIN clipping_sources cs ON cs.id = ci.source_id
       WHERE ci.tenant_id = $1
         AND cs.client_id = $2
         AND ci.published_at >= now() - interval '48 hours'
         AND ci.is_archived = false
       ORDER BY ci.published_at DESC
       LIMIT 5`,
      [tenantId, clientId],
    );
    return res.rows.map((r) => ({
      title: r.title,
      source: r.source_name,
      published_at: r.published_at,
    }));
  } catch {
    return [];
  }
}

function buildBlock(
  trends: { topic: string; score: number }[],
  news: { title: string; source: string; published_at: string }[],
): string {
  if (trends.length === 0 && news.length === 0) return '';

  const lines: string[] = ['MOMENTO ATUAL (use para ancoragem cultural da copy):'];

  if (trends.length > 0) {
    lines.push('\nTÓPICOS EM ALTA (Google Trends BR — últimos 7 dias):');
    for (const t of trends) {
      lines.push(`  - ${t.topic} (score ${t.score}/100)`);
    }
  }

  if (news.length > 0) {
    lines.push('\nNOTÍCIAS RECENTES DO SETOR (últimas 48h):');
    for (const n of news) {
      lines.push(`  - "${n.title}" — ${n.source}`);
    }
  }

  lines.push('\nSe algum desses temas for relevante para o briefing, ancore o conceito/copy nele.');

  return lines.join('\n');
}
