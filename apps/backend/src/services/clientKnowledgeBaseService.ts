import { query } from '../db';
import { listClientDocuments, getLatestClientInsight } from '../repos/clientIntelligenceRepo';
import { buildClientLivingMemory } from './clientLivingMemoryService';
import { listClientMemoryFacts } from './clientMemoryFactsService';
import { analyzeClientMemoryGovernance } from './clientMemoryGovernanceService';
import { buildClientCopyQualityScorecard, type ClientCopyQualityScorecard } from './copyQualityScorecardService';

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

type KnowledgeBaseCompactionWindow = {
  window_days: number;
  item_count: number;
  top_themes: string[];
  top_sources: Array<{ source_type: string; count: number }>;
  summary: string;
};

type KnowledgeBaseChangeItem = {
  kind: 'directive' | 'commitment' | 'evidence' | 'document';
  title: string;
  source_type: string | null;
  related_at: string | null;
  summary: string | null;
};

type ClientCopyPolicy = {
  tone: string | null;
  target_audience: string | null;
  brand_promise: string | null;
  mandatory_terms: string[];
  forbidden_terms: string[];
  preferred_themes: string[];
  repeated_topics_to_avoid: string[];
  preferred_platforms: string[];
  active_restrictions: string[];
  task_focus: string[];
  cta_mode: string | null;
  format_guardrails: string[];
  winning_patterns: string[];
  quality_state: string | null;
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
  governance: {
    governance_pressure: 'low' | 'medium' | 'high';
    active_conflicts: number;
    stale_facts: number;
    stale_directives: number;
    stale_commitments: number;
    archive_candidates: number;
    replace_candidates: number;
    suppressed_facts: number;
  };
  copy_quality_scorecard: ClientCopyQualityScorecard | null;
  copy_policy: ClientCopyPolicy;
  copy_policy_block: string;
  compaction: {
    last_7_days: KnowledgeBaseCompactionWindow;
    last_30_days: KnowledgeBaseCompactionWindow;
    recent_changes: KnowledgeBaseChangeItem[];
    compacted_memory_block: string;
  };
  recent_documents: Array<{
    id: string;
    source_type: string | null;
    title: string | null;
    excerpt: string | null;
    platform: string | null;
    url: string | null;
    published_at: string | null;
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

const COMPACTION_STOPWORDS = new Set([
  'cliente', 'clientes', 'briefing', 'campanha', 'copy', 'copies', 'post', 'posts', 'conteudo',
  'reuniao', 'reunioes', 'whatsapp', 'grupo', 'grupos', 'origem', 'fonte', 'sobre', 'mais',
  'menos', 'muito', 'para', 'com', 'sem', 'uma', 'umas', 'uns', 'esse', 'essa', 'isso', 'esta',
  'este', 'pela', 'pelo', 'pelos', 'pelas', 'entre', 'depois', 'antes', 'hoje', 'ontem',
]);

function shortText(value: unknown, max = 220) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > max ? `${normalized.slice(0, max - 1)}...` : normalized;
}

function firstMeaningful(...values: Array<unknown>) {
  for (const value of values) {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (text) return text;
  }
  return null;
}

function listify(value: unknown, limit = 8) {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[|,;\n]/) : [];
  return Array.from(
    new Set(
      raw
        .map((item) => String(item || '').replace(/\s+/g, ' ').trim())
        .filter(Boolean),
    ),
  ).slice(0, limit);
}

function tokenizeForCompaction(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .match(/[a-z0-9]{4,}/g)?.filter((token) => !COMPACTION_STOPWORDS.has(token)) || [];
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
  governance: ClientKnowledgeBaseSnapshot['governance'];
  copyPolicyBlock: string;
  copyQualitySummary?: ClientCopyQualityScorecard['summary'] | null;
  compaction: ClientKnowledgeBaseSnapshot['compaction'];
}) {
  const parts: string[] = ['BASE DE CONHECIMENTO DO CLIENTE:'];
  if (input.clientName) parts.push(`Cliente: ${input.clientName}`);
  parts.push(
    `Radar de comunicacao (${input.radar.window_days}d): ${input.radar.meetings} reunioes, ${input.radar.whatsapp_messages} mensagens WhatsApp, ${input.radar.whatsapp_group_messages} mensagens em grupos, ${input.radar.active_commitments} compromissos ativos.`,
  );
  if (input.latestInsightSummary) {
    parts.push(`Insight consolidado: ${input.latestInsightSummary}`);
  }
  if (input.copyQualitySummary) {
    parts.push(
      `Qualidade de copy (${input.radar.window_days}d): estado ${input.copyQualitySummary.overall_state}, aprovação ${Math.round((input.copyQualitySummary.approval_rate || 0) * 100)}%, critic ${input.copyQualitySummary.critic_gate_avg ?? 'n/a'}.`,
    );
  }
  if (input.copyPolicyBlock) {
    parts.push(input.copyPolicyBlock);
  }
  if (input.compaction.compacted_memory_block) {
    parts.push(input.compaction.compacted_memory_block);
  }
  if (input.governance.governance_pressure !== 'low') {
    parts.push(
      `Governanca da memoria: pressao ${input.governance.governance_pressure}, conflitos ativos ${input.governance.active_conflicts}, fatos suprimidos ${input.governance.suppressed_facts}.`,
    );
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

function shouldSuppressFact(fact: KnowledgeBaseFact, suggestion: { severity: string; action: string; staleness_score: number } | undefined) {
  if (!suggestion) return false;
  if (suggestion.severity === 'high') return true;
  if (suggestion.action === 'replace') return true;
  if (fact.source_type === 'meeting_action' && suggestion.staleness_score >= 60) return true;
  if (fact.metadata?.directive_type && suggestion.staleness_score >= 60) return true;
  return false;
}

function parseTime(value: string | null | undefined) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function buildCompactionWindow(params: {
  windowDays: number;
  items: KnowledgeBaseChangeItem[];
}) {
  const cutoff = Date.now() - params.windowDays * 86400000;
  const filtered = params.items.filter((item) => {
    const timestamp = parseTime(item.related_at);
    return timestamp !== null && timestamp >= cutoff;
  });
  const themeCounts = new Map<string, number>();
  const sourceCounts = new Map<string, number>();
  for (const item of filtered) {
    for (const token of tokenizeForCompaction(`${item.title} ${item.summary || ''}`)) {
      themeCounts.set(token, (themeCounts.get(token) || 0) + 1);
    }
    const sourceType = item.source_type || item.kind;
    sourceCounts.set(sourceType, (sourceCounts.get(sourceType) || 0) + 1);
  }
  const topThemes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([token]) => token);
  const topSources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 3)
    .map(([source_type, count]) => ({ source_type, count }));
  const summaryParts: string[] = [];
  if (filtered.length) {
    summaryParts.push(`${filtered.length} sinal(is) consolidados`);
    if (topSources.length) {
      summaryParts.push(`fontes dominantes: ${topSources.map((item) => `${item.source_type} (${item.count})`).join(', ')}`);
    }
    if (topThemes.length) {
      summaryParts.push(`temas: ${topThemes.join(', ')}`);
    }
  } else {
    summaryParts.push('sem sinais relevantes');
  }
  return {
    window_days: params.windowDays,
    item_count: filtered.length,
    top_themes: topThemes,
    top_sources: topSources,
    summary: summaryParts.join(' | '),
  } satisfies KnowledgeBaseCompactionWindow;
}

function buildCompactionBlock(params: {
  last7Days: KnowledgeBaseCompactionWindow;
  last30Days: KnowledgeBaseCompactionWindow;
  recentChanges: KnowledgeBaseChangeItem[];
}) {
  const parts: string[] = ['MEMORIA COMPACTADA:'];
  parts.push(`- Resumo 7d: ${params.last7Days.summary}.`);
  parts.push(`- Resumo 30d: ${params.last30Days.summary}.`);
  if (params.recentChanges.length) {
    parts.push('Mudancas recentes:');
    params.recentChanges.slice(0, 4).forEach((item) => {
      parts.push(`- [${item.kind}] ${item.title}`);
    });
  }
  return parts.join('\n');
}

function buildClientCopyPolicy(params: {
  profile: Record<string, any>;
  latestInsight: Record<string, any> | null;
  directives: KnowledgeBaseFact[];
  recentDocuments: ClientKnowledgeBaseSnapshot['recent_documents'];
  compaction: ClientKnowledgeBaseSnapshot['compaction'];
  governance: ClientKnowledgeBaseSnapshot['governance'];
  scorecard?: ClientCopyQualityScorecard | null;
  taskContext?: {
    platform?: string | null;
    objective?: string | null;
    format?: string | null;
    momento?: string | null;
  };
}) {
  const profile = params.profile || {};
  const knowledge = profile.knowledge_base || {};
  const brandVoice = profile.brand_voice || profile.brandVoice || {};
  const forbiddenClaims = listify(knowledge.forbidden_claims || knowledge.banned_words || [], 6);
  const avoidDirectives = params.directives
    .filter((item) => item.metadata?.directive_type === 'avoid')
    .map((item) => item.title);
  const platform = String(params.taskContext?.platform || '').trim().toLowerCase();
  const objective = String(params.taskContext?.objective || '').trim();
  const format = String(params.taskContext?.format || '').trim().toLowerCase();
  const momento = String(params.taskContext?.momento || '').trim().toLowerCase();
  const taskFocus = listify([
    objective,
    format ? `adaptar ao formato ${format}` : '',
    platform ? `respeitar a linguagem nativa de ${platform}` : '',
    momento === 'problema' ? 'abrir com dor latente e urgência concreta' : '',
    momento === 'solucao' ? 'mostrar mecanismo, clareza e prova de solução' : '',
    momento === 'decisao' ? 'reduzir fricção, reforçar prova e CTA forte' : '',
  ], 6);
  const ctaMode = (() => {
    if (momento === 'decisao') return 'CTA direto, específico e orientado a ação imediata.';
    if (momento === 'solucao') return 'CTA para avanço claro, sem agressividade artificial.';
    if (momento === 'problema') return 'CTA leve, orientado a descoberta ou conversa.';
    if (/lead|venda|convers/i.test(objective)) return 'CTA de conversão com próximo passo explícito.';
    if (/engaj|alcance|awareness|topo/i.test(objective)) return 'CTA de interação, comentário ou salvamento.';
    return null;
  })();
  const formatGuardrails = listify([
    format.includes('story') ? 'frases curtas, leitura instantânea e uma ideia por bloco' : '',
    format.includes('carrossel') ? 'headline sequencial e progressão de narrativa entre slides' : '',
    format.includes('reel') || format.includes('video') ? 'gancho imediato nos primeiros segundos e ritmo oral' : '',
    format.includes('linkedin') ? 'mais densidade argumentativa e autoridade concreta' : '',
    platform === 'instagram' ? 'texto mais escaneável, com ritmo visual e sem jargão pesado' : '',
  ], 5);
  const winningPatterns = listify([
    ...(params.scorecard?.leaderboard.top_angles || []).map((item) => item.angle),
    ...(params.scorecard?.policy_signals.boost || []),
  ], 5);
  const copyPolicy = {
    tone: firstMeaningful(knowledge.tone_of_voice, brandVoice.personality, profile.tone, params.latestInsight?.tone_of_voice),
    target_audience: firstMeaningful(knowledge.audience, params.latestInsight?.audience, profile.audience),
    brand_promise: firstMeaningful(knowledge.brand_promise, params.latestInsight?.brand_promise, params.latestInsight?.positioning),
    mandatory_terms: listify([
      ...(brandVoice.must_mentions || []),
      ...(knowledge.keywords || []),
      ...(knowledge.pillars || []),
    ], 8),
    forbidden_terms: listify([
      ...(brandVoice.donts || []),
      ...(profile.forbidden_terms || []),
      ...forbiddenClaims,
    ], 10),
    preferred_themes: listify([
      ...(params.compaction.last_30_days.top_themes || []),
      ...(knowledge.pillars || []),
    ], 6),
    repeated_topics_to_avoid: params.recentDocuments
      .slice(0, 3)
      .map((item) => shortText(item.title || item.excerpt || '', 90))
      .filter(Boolean),
    preferred_platforms: listify(params.recentDocuments.map((item) => item.platform).filter(Boolean), 4),
    active_restrictions: listify([
      ...avoidDirectives,
      ...((params.scorecard?.policy_signals.avoid || []).slice(0, 3)),
      ...((params.scorecard?.policy_signals.disliked_patterns || []).slice(0, 2).map((item) => item.text)),
      params.governance.active_conflicts ? `${params.governance.active_conflicts} conflito(s) ativos na memória` : '',
      params.governance.governance_pressure !== 'low' ? `pressão de governança ${params.governance.governance_pressure}` : '',
      params.scorecard?.summary.overall_state === 'fragile' ? 'qualidade recente instável; manter copy mais disciplinada e menos experimental' : '',
    ], 6),
    task_focus: taskFocus,
    cta_mode: ctaMode,
    format_guardrails: formatGuardrails,
    winning_patterns: winningPatterns,
    quality_state: params.scorecard?.summary.overall_state || null,
  } satisfies ClientCopyPolicy;

  const parts = ['POLITICA DE COPY CANONICA:'];
  if (copyPolicy.tone) parts.push(`- Tom obrigatório: ${copyPolicy.tone}`);
  if (copyPolicy.target_audience) parts.push(`- Público prioritário: ${copyPolicy.target_audience}`);
  if (copyPolicy.brand_promise) parts.push(`- Promessa central: ${copyPolicy.brand_promise}`);
  if (copyPolicy.mandatory_terms.length) parts.push(`- Must mention / vocabulário prioritário: ${copyPolicy.mandatory_terms.join(' | ')}`);
  if (copyPolicy.forbidden_terms.length) parts.push(`- Termos e claims proibidos: ${copyPolicy.forbidden_terms.join(' | ')}`);
  if (copyPolicy.preferred_themes.length) parts.push(`- Temas que mais conectam: ${copyPolicy.preferred_themes.join(' | ')}`);
  if (copyPolicy.preferred_platforms.length) parts.push(`- Plataformas com histórico recente: ${copyPolicy.preferred_platforms.join(' | ')}`);
  if (copyPolicy.repeated_topics_to_avoid.length) parts.push(`- Evitar repetir agora: ${copyPolicy.repeated_topics_to_avoid.join(' | ')}`);
  if (copyPolicy.active_restrictions.length) parts.push(`- Restrições ativas: ${copyPolicy.active_restrictions.join(' | ')}`);
  if (copyPolicy.task_focus.length) parts.push(`- Foco desta tarefa: ${copyPolicy.task_focus.join(' | ')}`);
  if (copyPolicy.cta_mode) parts.push(`- Regra de CTA: ${copyPolicy.cta_mode}`);
  if (copyPolicy.format_guardrails.length) parts.push(`- Guardrails de formato: ${copyPolicy.format_guardrails.join(' | ')}`);
  if (copyPolicy.winning_patterns.length) parts.push(`- Padrões vencedores recentes: ${copyPolicy.winning_patterns.join(' | ')}`);
  if (copyPolicy.quality_state) parts.push(`- Estado atual de qualidade: ${copyPolicy.quality_state}`);

  return {
    copyPolicy,
    copyPolicyBlock: parts.join('\n'),
  };
}

export async function buildClientKnowledgeBase(params: {
  tenantId: string;
  clientId: string;
  question?: string | null;
  daysBack?: number;
  limitDocuments?: number;
  intent?: ClientKnowledgeBaseIntent;
  platform?: string | null;
  objective?: string | null;
  format?: string | null;
  momento?: string | null;
}) {
  const intent = params.intent ?? 'general';
  const daysBack = Math.min(params.daysBack ?? 60, 180);
  const limitDocuments = Math.min(params.limitDocuments ?? 6, 12);
  const question = String(params.question || '').trim();

  const [clientResult, radarResult, livingMemory, facts, latestInsight, documents, governance, copyQualityScorecard] = await Promise.all([
    query<{ name: string | null; profile: Record<string, any> | null }>(
      `SELECT name, profile FROM clients WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
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
    analyzeClientMemoryGovernance({
      tenantId: params.tenantId,
      clientId: params.clientId,
      daysBack: Math.min(daysBack * 2, 365),
      limit: 80,
    }).catch(() => ({
      summary: {
        active_facts: 0,
        archive_candidates: 0,
        replace_candidates: 0,
        high_severity: 0,
        stale_facts: 0,
        stale_directives: 0,
        stale_commitments: 0,
        active_conflicts: 0,
        governance_pressure: 'low' as const,
      },
      suggestions: [],
      conflicts: [],
    })),
    buildClientCopyQualityScorecard({
      tenantId: params.tenantId,
      clientId: params.clientId,
      daysBack,
    }).catch(() => null),
  ]);

  const factRows = facts || [];
  const suppressedFingerprints = new Set(
    (governance?.suggestions || [])
      .filter((item) => item?.target?.fingerprint)
      .map((item) => [item.target.fingerprint, item] as const)
      .filter(([fingerprint, suggestion]) => {
        const row = factRows.find((fact) => String(fact.fingerprint || '') === fingerprint);
        return row ? shouldSuppressFact(toFact(row), suggestion) : false;
      })
      .map(([fingerprint]) => fingerprint),
  );

  const activeFactRows = factRows.filter((item) => !suppressedFingerprints.has(String(item.fingerprint || '')));
  const directives = sortFacts(intent, activeFactRows.filter((item) => item.fact_type === 'directive').map(toFact));
  const commitments = sortFacts(intent, activeFactRows.filter((item) => item.fact_type === 'commitment').map(toFact));
  const evidence = sortFacts(intent, activeFactRows.filter((item) => item.fact_type === 'evidence').map(toFact));
  const recentDocuments = sortDocuments(intent, documents.map((item) => ({
    id: item.id,
    source_type: item.source_type || null,
    title: item.title || null,
    excerpt: item.content_excerpt || shortText(item.content_text, 200) || null,
    platform: item.platform || null,
    url: item.url || null,
    published_at: item.published_at || null,
    created_at: item.created_at || null,
  })));
  const compactionItems = [
    ...directives.map((item) => ({
      kind: 'directive' as const,
      title: item.title,
      source_type: item.source_type,
      related_at: item.related_at,
      summary: item.summary || item.fact_text,
    })),
    ...commitments.map((item) => ({
      kind: 'commitment' as const,
      title: item.title,
      source_type: item.source_type,
      related_at: item.related_at,
      summary: item.summary || item.fact_text,
    })),
    ...evidence.map((item) => ({
      kind: 'evidence' as const,
      title: item.title,
      source_type: item.source_type,
      related_at: item.related_at,
      summary: item.summary || item.fact_text,
    })),
    ...recentDocuments.map((item) => ({
      kind: 'document' as const,
      title: item.title || 'Sem titulo',
      source_type: item.source_type,
      related_at: item.published_at || item.created_at,
      summary: item.excerpt || null,
    })),
  ].sort((a, b) => String(b.related_at || '').localeCompare(String(a.related_at || '')));
  const recentChanges = compactionItems.slice(0, 6);
  const last7Days = buildCompactionWindow({ windowDays: 7, items: compactionItems });
  const last30Days = buildCompactionWindow({ windowDays: 30, items: compactionItems });
  const compaction = {
    last_7_days: last7Days,
    last_30_days: last30Days,
    recent_changes: recentChanges,
    compacted_memory_block: buildCompactionBlock({
      last7Days,
      last30Days,
      recentChanges,
    }),
  };
  const { copyPolicy, copyPolicyBlock } = buildClientCopyPolicy({
    profile: clientResult.rows[0]?.profile || {},
    latestInsight: (latestInsight?.summary || null) as Record<string, any> | null,
    directives,
    recentDocuments,
    compaction,
    governance: {
      governance_pressure: governance.summary.governance_pressure,
      active_conflicts: governance.summary.active_conflicts,
      stale_facts: governance.summary.stale_facts,
      stale_directives: governance.summary.stale_directives,
      stale_commitments: governance.summary.stale_commitments,
      archive_candidates: governance.summary.archive_candidates,
      replace_candidates: governance.summary.replace_candidates,
      suppressed_facts: suppressedFingerprints.size,
    },
    scorecard: copyQualityScorecard,
    taskContext: {
      platform: params.platform,
      objective: params.objective,
      format: params.format,
      momento: params.momento,
    },
  });

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
    governance: {
      governance_pressure: governance.summary.governance_pressure,
      active_conflicts: governance.summary.active_conflicts,
      stale_facts: governance.summary.stale_facts,
      stale_directives: governance.summary.stale_directives,
      stale_commitments: governance.summary.stale_commitments,
      archive_candidates: governance.summary.archive_candidates,
      replace_candidates: governance.summary.replace_candidates,
      suppressed_facts: suppressedFingerprints.size,
    },
    copy_quality_scorecard: copyQualityScorecard,
    copy_policy: copyPolicy,
    copy_policy_block: copyPolicyBlock,
    compaction,
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
      governance: {
        governance_pressure: governance.summary.governance_pressure,
        active_conflicts: governance.summary.active_conflicts,
        stale_facts: governance.summary.stale_facts,
        stale_directives: governance.summary.stale_directives,
        stale_commitments: governance.summary.stale_commitments,
        archive_candidates: governance.summary.archive_candidates,
        replace_candidates: governance.summary.replace_candidates,
        suppressed_facts: suppressedFingerprints.size,
      },
      copyPolicyBlock,
      copyQualitySummary: copyQualityScorecard?.summary || null,
      compaction,
    }),
  } satisfies ClientKnowledgeBaseSnapshot;
}
