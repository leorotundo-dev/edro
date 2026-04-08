import { query } from '../db';

const MEMORY_SOURCE_TYPES = [
  'gmail_message',
  'whatsapp_message',
  'whatsapp_insight',
  'whatsapp_digest',
  'meeting',
  'meeting_chat',
] as const;

const SOURCE_LABELS: Record<string, string> = {
  gmail_message: 'Email',
  whatsapp_message: 'WhatsApp',
  whatsapp_insight: 'Insight de WhatsApp',
  whatsapp_digest: 'Digest de WhatsApp',
  meeting: 'Reuniao',
  meeting_chat: 'Chat de reuniao',
};

const STOPWORDS = new Set([
  'para', 'com', 'sem', 'uma', 'uns', 'umas', 'dos', 'das', 'que', 'por', 'mais', 'menos',
  'sobre', 'entre', 'depois', 'antes', 'isso', 'essa', 'esse', 'esta', 'este', 'ser', 'vai',
  'job', 'briefing', 'copy', 'post', 'cliente', 'campanha', 'pra', 'pro', 'the', 'and',
]);

type LivingMemoryDirective = {
  directive_type: 'boost' | 'avoid';
  directive: string;
  source: string;
  created_at: string | null;
};

type LivingMemoryEvidence = {
  source_type: string;
  title: string | null;
  excerpt: string;
  occurred_at: string | null;
  score: number;
};

type LivingMemoryAction = {
  title: string;
  description: string | null;
  responsible: string | null;
  deadline: string | null;
  priority: string | null;
  meeting_title: string | null;
};

export type ClientLivingMemory = {
  block: string;
  directives: LivingMemoryDirective[];
  evidence: LivingMemoryEvidence[];
  pendingActions: LivingMemoryAction[];
  snapshot: {
    active_directives: number;
    evidence_signals: number;
    fresh_signals_7d: number;
    pending_commitments: number;
    evidence_by_source: Record<string, number>;
  };
};

function tokenize(text: string) {
  return Array.from(
    new Set(
      String(text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .match(/[a-z0-9]{4,}/g) || [],
    ),
  ).filter((token) => !STOPWORDS.has(token));
}

function normalizeHaystack(value: string) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function scoreEvidence(tokens: string[], haystack: string, occurredAt: string | null) {
  if (!haystack.trim()) return 0;
  const normalized = normalizeHaystack(haystack);
  let score = 0;
  for (const token of tokens) {
    if (normalized.includes(token)) score += token.length >= 8 ? 2 : 1;
  }
  if (occurredAt) {
    const ms = new Date(occurredAt).getTime();
    if (!Number.isNaN(ms)) {
      const ageDays = (Date.now() - ms) / 86400000;
      score += Math.max(0, 2 - ageDays / 14);
    }
  }
  return Number(score.toFixed(2));
}

function shortText(value: string, max = 180) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  return normalized.length > max ? `${normalized.slice(0, max - 1)}...` : normalized;
}

function buildBriefingQueryText(params: {
  title?: string | null;
  objective?: string | null;
  context?: string | null;
  payload?: Record<string, any> | null;
}) {
  const payload = params.payload || {};
  return [
    params.title,
    params.objective,
    params.context,
    payload.notes,
    payload.additional_notes,
    payload.key_message,
    payload.target_audience,
    payload.references,
    payload.cta,
  ].filter(Boolean).join(' \n ');
}

function formatDeadline(value: string | null) {
  if (!value) return 'sem prazo definido';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

export async function buildClientLivingMemory(params: {
  tenantId: string;
  clientId?: string | null;
  briefing?: {
    title?: string | null;
    objective?: string | null;
    context?: string | null;
    payload?: Record<string, any> | null;
  } | null;
  daysBack?: number;
  maxDirectives?: number;
  maxEvidence?: number;
  maxActions?: number;
}): Promise<ClientLivingMemory> {
  if (!params.clientId) {
    return {
      block: '',
      directives: [],
      evidence: [],
      pendingActions: [],
      snapshot: {
        active_directives: 0,
        evidence_signals: 0,
        fresh_signals_7d: 0,
        pending_commitments: 0,
        evidence_by_source: {},
      },
    };
  }

  const daysBack = Math.min(params.daysBack ?? 60, 120);
  const maxDirectives = Math.min(params.maxDirectives ?? 6, 10);
  const maxEvidence = Math.min(params.maxEvidence ?? 6, 10);
  const maxActions = Math.min(params.maxActions ?? 4, 8);
  const tokens = tokenize(buildBriefingQueryText(params.briefing || {}));

  const [directiveRes, docsRes, actionRes] = await Promise.all([
    query<LivingMemoryDirective>(
      `SELECT directive_type, directive, source, created_at::text
         FROM client_directives
        WHERE tenant_id = $1
          AND client_id = $2
        ORDER BY created_at DESC
        LIMIT $3`,
      [params.tenantId, params.clientId, maxDirectives],
    ).catch(() => ({ rows: [] })),
    query<any>(
      `SELECT source_type, title, content_excerpt, content_text,
              COALESCE(published_at, created_at)::text AS occurred_at
         FROM client_documents
        WHERE tenant_id = $1
          AND client_id = $2
          AND source_type = ANY($3::text[])
          AND COALESCE(published_at, created_at) > NOW() - make_interval(days => $4)
        ORDER BY COALESCE(published_at, created_at) DESC
        LIMIT 80`,
      [params.tenantId, params.clientId, MEMORY_SOURCE_TYPES, daysBack],
    ).catch(() => ({ rows: [] })),
    query<LivingMemoryAction>(
      `SELECT ma.title,
              ma.description,
              ma.responsible,
              ma.deadline::text,
              ma.priority,
              m.title AS meeting_title
         FROM meeting_actions ma
         LEFT JOIN meetings m ON m.id = ma.meeting_id
        WHERE ma.tenant_id = $1
          AND ma.client_id = $2
          AND ma.status = 'pending'
          AND ma.created_at > NOW() - INTERVAL '120 days'
        ORDER BY
          CASE ma.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
          ma.deadline ASC NULLS LAST,
          ma.created_at DESC
        LIMIT $3`,
      [params.tenantId, params.clientId, maxActions],
    ).catch(() => ({ rows: [] })),
  ]);

  const evidence = docsRes.rows
    .map((row): LivingMemoryEvidence => {
      const excerpt = shortText(row.content_excerpt || row.content_text || '', 220);
      const score = scoreEvidence(tokens, `${row.title || ''}\n${row.content_excerpt || ''}\n${row.content_text || ''}`, row.occurred_at);
      return {
        source_type: String(row.source_type || ''),
        title: row.title || null,
        excerpt,
        occurred_at: row.occurred_at || null,
        score,
      };
    })
    .filter((row) => row.excerpt)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return String(b.occurred_at || '').localeCompare(String(a.occurred_at || ''));
    })
    .filter((row, index) => index < maxEvidence && (tokens.length === 0 || row.score > 0));

  const directives = directiveRes.rows;
  const pendingActions = actionRes.rows;
  const evidenceBySource = evidence.reduce<Record<string, number>>((acc, item) => {
    acc[item.source_type] = (acc[item.source_type] || 0) + 1;
    return acc;
  }, {});
  const freshSignals7d = evidence.filter((item) => {
    if (!item.occurred_at) return false;
    const timestamp = new Date(item.occurred_at).getTime();
    if (Number.isNaN(timestamp)) return false;
    return (Date.now() - timestamp) / 86400000 <= 7;
  }).length;

  const parts: string[] = [];

  if (directives.length) {
    const boost = directives.filter((item) => item.directive_type === 'boost').map((item) => item.directive);
    const avoid = directives.filter((item) => item.directive_type === 'avoid').map((item) => item.directive);
    parts.push('MEMORIA VIVA DO CLIENTE:');
    if (boost.length) parts.push(`- Potencializar: ${boost.join(' | ')}`);
    if (avoid.length) parts.push(`- Evitar: ${avoid.join(' | ')}`);
  }

  if (evidence.length) {
    if (!parts.length) parts.push('MEMORIA VIVA DO CLIENTE:');
    parts.push('Evidencias relacionadas a este briefing:');
    evidence.forEach((item) => {
      const label = SOURCE_LABELS[item.source_type] || item.source_type;
      const when = item.occurred_at ? new Date(item.occurred_at).toLocaleDateString('pt-BR') : 'sem data';
      parts.push(`- [${label}] ${when} | ${item.title || 'Sem titulo'} | ${item.excerpt}`);
    });
  }

  if (pendingActions.length) {
    if (!parts.length) parts.push('MEMORIA VIVA DO CLIENTE:');
    parts.push('Compromissos e pendencias em aberto:');
    pendingActions.forEach((item) => {
      const owner = item.responsible || 'sem responsavel';
      const deadline = formatDeadline(item.deadline);
      const meeting = item.meeting_title ? ` | origem: ${item.meeting_title}` : '';
      parts.push(`- ${item.title} | ${owner} | prazo ${deadline}${meeting}`);
    });
  }

  return {
    block: parts.join('\n'),
    directives,
    evidence,
    pendingActions,
    snapshot: {
      active_directives: directives.length,
      evidence_signals: evidence.length,
      fresh_signals_7d: freshSignals7d,
      pending_commitments: pendingActions.length,
      evidence_by_source: evidenceBySource,
    },
  };
}
