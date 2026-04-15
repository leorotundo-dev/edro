import { query } from '../db';
import { listClientDocuments, getLatestClientInsight } from '../repos/clientIntelligenceRepo';
import { buildClientLivingMemory } from './clientLivingMemoryService';
import { listClientMemoryFacts } from './clientMemoryFactsService';

type KnowledgeBaseFact = {
  title: string;
  summary: string | null;
  fact_text: string;
  source_type: string | null;
  source_id: string | null;
  related_at: string | null;
  confidence_score: number;
  metadata?: Record<string, any>;
};

type CommunicationRadar = {
  window_days: number;
  meetings: number;
  whatsapp_messages: number;
  whatsapp_group_messages: number;
  active_commitments: number;
  active_directives: number;
};

export type ClientKnowledgeBaseIntent =
  | 'general'
  | 'copy'
  | 'creative'
  | 'strategy'
  | 'ops'
  | 'relationship';

export type ClientKnowledgeBaseSnapshot = {
  client_id: string;
  client_name: string | null;
  generated_at: string;
  intent_profile: ClientKnowledgeBaseIntent;
  radar: CommunicationRadar;
  living_memory_summary: Record<string, any>;
  latest_insight: Record<string, any> | null;
  directives: KnowledgeBaseFact[];
  commitments: KnowledgeBaseFact[];
  evidence: KnowledgeBaseFact[];
  recent_documents: Array<{
    id: string;
    source_type: string | null;
    title: string | null;
    excerpt: string | null;
    created_at: string | null;
  }>;
  memory_block: string;
  knowledge_base_block: string;
};

const INTENT_SOURCE_PRIORITY: Record<ClientKnowledgeBaseIntent, string[]> = {
  general: ['meeting', 'whatsapp_insight', 'whatsapp_message', 'meeting_chat', 'gmail_message'],
  copy: ['whatsapp_insight', 'meeting', 'whatsapp_message', 'meeting_chat', 'social'],
  creative: ['meeting', 'whatsapp_insight', 'social', 'meeting_chat', 'whatsapp_message'],
  strategy: ['meeting', 'whatsapp_insight', 'gmail_message', 'whatsapp_message', 'meeting_chat'],
  ops: ['meeting_action', 'meeting', 'whatsapp_insight', 'whatsapp_message', 'meeting_chat'],
  relationship: ['whatsapp_message', 'whatsapp_insight', 'meeting_chat', 'meeting', 'gmail_message'],
};

function shortText(value: unknown, max = 220) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > max ? `${normalized.slice(0, max - 1)}...` : normalized;
}

function summarizeInsight(summary: Record<string, any> | null) {
  if (!summary || typeof summary !== 'object') return '';
  const candidates = [
    summary.summary,
    summary.positioning,
    summary.description,
    summary.brand_promise,
    summary.audience,
    summary.tone_of_voice,
  ].filter(Boolean);
  if (candidates.length) return shortText(candidates.join(' | '), 320);
  return shortText(JSON.stringify(summary), 320);
}

function toFact(item: any): KnowledgeBaseFact {
  return {
    title: String(item.title || ''),
    summary: item.summary || null,
    fact_text: String(item.fact_text || ''),
    source_type: item.source_type || null,
    source_id: item.source_id || null,
    related_at: item.related_at || null,
    confidence_score: Number(item.confidence_score ?? 0),
    metadata: item.metadata || {},
  };
}

function buildKnowledgeBaseBlock(input: {
  intent: ClientKnowledgeBaseIntent;
  clientName: string | null;
  radar: CommunicationRadar;
  latestInsightSummary: string;
  directives: KnowledgeBaseFact[];
  commitments: KnowledgeBaseFact[];
  evidence: KnowledgeBaseFact[];
  recentDocuments: ClientKnowledgeBaseSnapshot['recent_documents'];
}) {
  const parts: string[] = ['BASE DE CONHECIMENTO DO CLIENTE:'];
  if (input.clientName) parts.push(`Cliente: ${input.clientName}`);
  parts.push(
    `Radar de comunicacao (${input.radar.window_days}d): ${input.radar.meetings} reunioes, ${input.radar.whatsapp_messages} mensagens WhatsApp, ${input.radar.whatsapp_group_messages} mensagens em grupos, ${input.radar.active_commitments} compromissos ativos.`,
  );
  if (input.latestInsightSummary) {
    parts.push(`Insight consolidado: ${input.latestInsightSummary}`);
  }
  if (input.directives.length) {
    parts.push('Diretivas ativas:');
    input.directives.slice(0, 6).forEach((item) => parts.push(`- ${item.title}`));
  }
  if (input.commitments.length) {
    parts.push('Compromissos em aberto:');
    input.commitments.slice(0, 4).forEach((item) => parts.push(`- ${item.title}`));
  }
  if (input.evidence.length) {
    parts.push('Sinais e evidencias recentes:');
    input.evidence.slice(0, input.intent === 'ops' ? 4 : 5).forEach((item) => parts.push(`- ${shortText(item.summary || item.fact_text, 180)}`));
  }
  if (input.recentDocuments.length) {
    parts.push('Documentos recentes:');
    input.recentDocuments.slice(0, 4).forEach((item) => parts.push(`- ${item.title || 'Sem titulo'} (${item.source_type || 'source'})`));
  }
  return parts.join('\n');
}

function rankSource(intent: ClientKnowledgeBaseIntent, sourceType: string | null | undefined) {
  const list = INTENT_SOURCE_PRIORITY[intent];
  const idx = list.indexOf(String(sourceType || ''));
  return idx >= 0 ? idx : list.length + 1;
}

function sortFacts(intent: ClientKnowledgeBaseIntent, items: KnowledgeBaseFact[]) {
  return [...items].sort((a, b) => {
    const sourceDelta = rankSource(intent, a.source_type) - rankSource(intent, b.source_type);
    if (sourceDelta !== 0) return sourceDelta;
    const confidenceDelta = Number(b.confidence_score || 0) - Number(a.confidence_score || 0);
    if (confidenceDelta !== 0) return confidenceDelta;
    return String(b.related_at || '').localeCompare(String(a.related_at || ''));
  });
}

function sortDocuments(intent: ClientKnowledgeBaseIntent, items: ClientKnowledgeBaseSnapshot['recent_documents']) {
  return [...items].sort((a, b) => {
    const sourceDelta = rankSource(intent, a.source_type) - rankSource(intent, b.source_type);
    if (sourceDelta !== 0) return sourceDelta;
    return String(b.created_at || '').localeCompare(String(a.created_at || ''));
  });
}

export async function buildClientKnowledgeBase(params: {
  tenantId: string;
  clientId: string;
  question?: string | null;
  daysBack?: number;
  limitDocuments?: number;
  intent?: ClientKnowledgeBaseIntent;
}) {
  const intent = params.intent ?? 'general';
  const daysBack = Math.min(params.daysBack ?? 60, 180);
  const limitDocuments = Math.min(params.limitDocuments ?? 6, 12);
  const question = String(params.question || '').trim();

  const [clientResult, radarResult, livingMemory, facts, latestInsight, documents] = await Promise.all([
    query<{ name: string | null }>(
      `SELECT name FROM clients WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [params.tenantId, params.clientId],
    ),
    query<{
      meetings: string;
      whatsapp_messages: string;
      whatsapp_group_messages: string;
      active_commitments: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM meetings WHERE tenant_id = $1 AND client_id = $2 AND recorded_at > NOW() - make_interval(days => $3)) AS meetings,
         (SELECT COUNT(*)::text FROM whatsapp_messages WHERE tenant_id = $1 AND client_id = $2 AND created_at > NOW() - make_interval(days => $3)) AS whatsapp_messages,
         (SELECT COUNT(*)::text FROM whatsapp_group_messages WHERE tenant_id = $1 AND client_id = $2 AND created_at > NOW() - make_interval(days => $3)) AS whatsapp_group_messages,
         (SELECT COUNT(*)::text FROM client_memory_facts WHERE tenant_id = $1 AND client_id = $2 AND fact_type = 'commitment' AND status = 'active') AS active_commitments`,
      [params.tenantId, params.clientId, daysBack],
    ).catch(async () =>
      query<{
        meetings: string;
        whatsapp_messages: string;
        whatsapp_group_messages: string;
        active_commitments: string;
      }>(
        `SELECT
           (SELECT COUNT(*)::text FROM meetings WHERE tenant_id = $1 AND client_id = $2 AND recorded_at > NOW() - make_interval(days => $3)) AS meetings,
           (SELECT COUNT(*)::text FROM whatsapp_messages WHERE tenant_id = $1 AND client_id = $2 AND created_at > NOW() - make_interval(days => $3)) AS whatsapp_messages,
           (SELECT COUNT(*)::text FROM whatsapp_group_messages WHERE tenant_id = $1 AND client_id = $2 AND created_at > NOW() - make_interval(days => $3)) AS whatsapp_group_messages,
           '0'::text AS active_commitments`,
        [params.tenantId, params.clientId, daysBack],
      ),
    ),
    buildClientLivingMemory({
      tenantId: params.tenantId,
      clientId: params.clientId,
      briefing: question
        ? { title: question, objective: question, context: question, payload: { notes: question } }
        : null,
      daysBack,
      maxDirectives: 8,
      maxEvidence: 6,
      maxActions: 6,
    }),
    listClientMemoryFacts({
      tenantId: params.tenantId,
      clientId: params.clientId,
      daysBack,
      limit: 24,
    }),
    getLatestClientInsight({ tenantId: params.tenantId, clientId: params.clientId }).catch(() => null),
    listClientDocuments({ tenantId: params.tenantId, clientId: params.clientId, limit: limitDocuments }).catch(() => []),
  ]);

  const factRows = facts || [];
  const directives = sortFacts(intent, factRows.filter((item) => item.fact_type === 'directive').map(toFact));
  const commitments = sortFacts(intent, factRows.filter((item) => item.fact_type === 'commitment').map(toFact));
  const evidence = sortFacts(intent, factRows.filter((item) => item.fact_type === 'evidence').map(toFact));
  const recentDocuments = sortDocuments(intent, documents.map((item) => ({
    id: item.id,
    source_type: item.source_type || null,
    title: item.title || null,
    excerpt: item.content_excerpt || shortText(item.content_text, 200) || null,
    created_at: item.created_at || null,
  })));

  const latestInsightSummary = summarizeInsight((latestInsight?.summary || null) as Record<string, any> | null);
  const radarRow = radarResult.rows[0] || {
    meetings: '0',
    whatsapp_messages: '0',
    whatsapp_group_messages: '0',
    active_commitments: String(commitments.length),
  };
  const radar: CommunicationRadar = {
    window_days: daysBack,
    meetings: Number(radarRow.meetings || 0),
    whatsapp_messages: Number(radarRow.whatsapp_messages || 0),
    whatsapp_group_messages: Number(radarRow.whatsapp_group_messages || 0),
    active_commitments: Number(radarRow.active_commitments || 0),
    active_directives: directives.length || livingMemory.snapshot.active_directives || 0,
  };

  return {
    client_id: params.clientId,
    client_name: clientResult.rows[0]?.name || null,
    generated_at: new Date().toISOString(),
    intent_profile: intent,
    radar,
    living_memory_summary: livingMemory.snapshot,
    latest_insight: (latestInsight?.summary || null) as Record<string, any> | null,
    directives,
    commitments,
    evidence,
    recent_documents: recentDocuments,
    memory_block: livingMemory.block,
    knowledge_base_block: buildKnowledgeBaseBlock({
      intent,
      clientName: clientResult.rows[0]?.name || null,
      radar,
      latestInsightSummary,
      directives,
      commitments,
      evidence,
      recentDocuments,
    }),
  } satisfies ClientKnowledgeBaseSnapshot;
}
