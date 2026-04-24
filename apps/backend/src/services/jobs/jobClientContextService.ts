import { query } from '../../db';

export type JobClientContextConfidence = 'high' | 'medium' | 'low' | 'none';
export type JobClientContextSource =
  | 'whatsapp'
  | 'meeting'
  | 'meeting_chat'
  | 'memory';

export type JobClientContextSignal = {
  id: string;
  source: JobClientContextSource;
  source_id: string;
  source_label: string;
  title: string;
  author_name: string | null;
  occurred_at: string | null;
  snippet: string;
  relevance_reason: string;
  match_type: 'direct' | 'probable';
  confidence: number;
  tags: string[];
};

export type JobClientContextResponse = {
  job: {
    id: string;
    title: string;
    client_id: string | null;
    client_name: string | null;
  };
  confidence: JobClientContextConfidence;
  summary: string | null;
  searched_sources: string[];
  signals: JobClientContextSignal[];
};

type JobRow = {
  id: string;
  title: string;
  summary: string | null;
  job_type: string | null;
  source: string | null;
  client_id: string | null;
  client_name: string | null;
  metadata: Record<string, unknown> | null;
};

type EvidenceCandidate = {
  source: JobClientContextSource;
  source_id: string;
  source_label: string;
  title: string;
  author_name?: string | null;
  occurred_at?: string | null;
  snippet?: string | null;
  haystack: string;
  base_score?: number;
  direct_match?: boolean;
  tags?: string[];
};

const SOURCE_LABELS: Record<JobClientContextSource, string> = {
  whatsapp: 'WhatsApp',
  meeting: 'Reuniao',
  meeting_chat: 'Chat da reuniao',
  memory: 'Memoria do cliente',
};

function normalizeText(value: unknown) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: unknown, limit = 12) {
  const stopwords = new Set([
    'a', 'o', 'os', 'as', 'de', 'do', 'da', 'das', 'dos', 'e', 'em', 'no', 'na', 'nos', 'nas',
    'um', 'uma', 'uns', 'umas', 'que', 'como', 'qual', 'quais', 'pra', 'para', 'com', 'sem',
    'foi', 'sao', 'por', 'sobre', 'cliente', 'job', 'card', 'demanda', 'peca', 'post', 'copy',
    'trello', 'edro', 'digital', 'studio',
  ]);

  return Array.from(new Set(
    normalizeText(value)
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !stopwords.has(token)),
  )).slice(0, limit);
}

function compact(value: unknown, maxChars = 360) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!text) return '';
  return text.length > maxChars ? `${text.slice(0, maxChars - 3)}...` : text;
}

function addRef(refs: Set<string>, value: unknown) {
  const ref = String(value || '').trim();
  if (ref) refs.add(ref);
}

function collectExactRefs(job: JobRow) {
  const refs = new Set<string>();
  const metadata = job.metadata || {};
  [
    'meeting_action_id',
    'meeting_id',
    'briefing_id',
    'whatsapp_digest_id',
    'whatsapp_message_id',
    'pipeline_share_token',
    'publication_schedule_id',
  ].forEach((key) => addRef(refs, metadata[key]));
  return refs;
}

function scoreCandidate(candidate: EvidenceCandidate, tokens: string[]) {
  const haystack = normalizeText(candidate.haystack);
  let tokenHits = 0;
  for (const token of tokens) {
    if (haystack.includes(token)) tokenHits += 1;
  }

  let score = Number(candidate.base_score || 0) + tokenHits * 5;
  if (candidate.direct_match) score += 18;
  if (candidate.occurred_at) {
    const timestamp = new Date(candidate.occurred_at).getTime();
    if (!Number.isNaN(timestamp)) {
      const daysAgo = (Date.now() - timestamp) / 86400000;
      if (daysAgo <= 14) score += 3;
      else if (daysAgo <= 45) score += 1;
    }
  }

  return { score, tokenHits };
}

function confidenceFromSignals(signals: JobClientContextSignal[]): JobClientContextConfidence {
  if (!signals.length) return 'none';
  const top = signals[0].confidence;
  if (top >= 0.82 || signals.some((signal) => signal.match_type === 'direct')) return 'high';
  if (top >= 0.58 || signals.length >= 3) return 'medium';
  return 'low';
}

function buildSummary(signals: JobClientContextSignal[]) {
  if (!signals.length) return null;
  const sourceCounts = signals.reduce<Record<string, number>>((acc, signal) => {
    acc[signal.source_label] = (acc[signal.source_label] || 0) + 1;
    return acc;
  }, {});
  const dominantSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => `${count} em ${source}`)
    .slice(0, 2)
    .join(', ');
  const top = signals[0];
  return `Jarvis encontrou ${signals.length} sinal${signals.length === 1 ? '' : 'es'} relacionado${signals.length === 1 ? '' : 's'} a este job (${dominantSources}). Principal evidência: ${top.snippet}`;
}

async function safeRows<T>(sql: string, values: unknown[]): Promise<T[]> {
  try {
    const result = await query<T>(sql, values);
    return result.rows;
  } catch (error: any) {
    console.warn('[jobClientContext] source query failed:', error?.message || error);
    return [];
  }
}

async function loadCandidates(params: {
  tenantId: string;
  clientId: string;
  tokens: string[];
  exactRefs: Set<string>;
  daysBack: number;
}) {
  const { tenantId, clientId, daysBack } = params;

  const [
    memoryRows,
    groupMessageRows,
    directMessageRows,
    whatsappInsightRows,
    whatsappDigestRows,
    meetingRows,
    meetingActionRows,
    meetingChatRows,
  ] = await Promise.all([
    safeRows<any>(
      `SELECT id, fact_type, source_type, source_id, title, summary, fact_text, related_at, created_at, confidence_score
         FROM client_memory_facts
        WHERE tenant_id = $1
          AND client_id = $2
          AND status = 'active'
          AND (related_at IS NULL OR related_at > NOW() - make_interval(days => $3))
        ORDER BY COALESCE(related_at, created_at) DESC
        LIMIT 40`,
      [tenantId, clientId, daysBack],
    ),
    safeRows<any>(
      `SELECT wgm.id,
              wg.group_name,
              wgm.sender_name,
              wgm.sender_jid,
              wgm.content,
              wgm.briefing_id,
              wgm.created_at,
              p.is_internal
         FROM whatsapp_group_messages wgm
         JOIN whatsapp_groups wg ON wg.id = wgm.group_id
         LEFT JOIN people p ON p.id = wgm.sender_person_id
        WHERE wgm.tenant_id = $1
          AND COALESCE(wgm.client_id, wg.client_id) = $2
          AND wgm.content IS NOT NULL
          AND wgm.created_at > NOW() - make_interval(days => $3)
          AND COALESCE(p.is_internal, false) = false
        ORDER BY wgm.created_at DESC
        LIMIT 80`,
      [tenantId, clientId, daysBack],
    ),
    safeRows<any>(
      `SELECT wm.id,
              wm.sender_phone,
              wm.raw_text,
              wm.briefing_id,
              wm.created_at,
              p.display_name AS sender_name,
              p.is_internal
         FROM whatsapp_messages wm
         LEFT JOIN people p ON p.id = wm.sender_person_id
        WHERE wm.tenant_id = $1
          AND wm.client_id = $2
          AND wm.direction = 'inbound'
          AND wm.raw_text IS NOT NULL
          AND wm.created_at > NOW() - make_interval(days => $3)
          AND COALESCE(p.is_internal, false) = false
        ORDER BY wm.created_at DESC
        LIMIT 60`,
      [tenantId, clientId, daysBack],
    ),
    safeRows<any>(
      `SELECT wmi.id,
              wmi.message_id,
              wmi.insight_type,
              wmi.summary,
              wmi.sentiment,
              wmi.urgency,
              wmi.created_at,
              wgm.sender_name,
              wg.group_name
         FROM whatsapp_message_insights wmi
         LEFT JOIN whatsapp_group_messages wgm ON wgm.id = wmi.message_id
         LEFT JOIN whatsapp_groups wg ON wg.id = wgm.group_id
        WHERE wmi.tenant_id = $1
          AND wmi.client_id = $2
          AND wmi.created_at > NOW() - make_interval(days => $3)
        ORDER BY wmi.created_at DESC
        LIMIT 40`,
      [tenantId, clientId, daysBack],
    ),
    safeRows<any>(
      `SELECT id, period, summary, key_decisions, pending_actions, period_end, created_at
         FROM whatsapp_group_digests
        WHERE tenant_id = $1
          AND client_id = $2
          AND period_end > NOW() - make_interval(days => $3)
        ORDER BY period_end DESC
        LIMIT 20`,
      [tenantId, clientId, daysBack],
    ),
    safeRows<any>(
      `SELECT id, title, summary, LEFT(transcript, 12000) AS transcript, recorded_at
         FROM meetings
        WHERE tenant_id = $1
          AND client_id = $2
          AND recorded_at > NOW() - make_interval(days => $3)
        ORDER BY recorded_at DESC
        LIMIT 30`,
      [tenantId, clientId, daysBack],
    ),
    safeRows<any>(
      `SELECT ma.id,
              ma.title,
              ma.description,
              ma.raw_excerpt,
              ma.created_at,
              ma.priority,
              m.title AS meeting_title,
              m.recorded_at
         FROM meeting_actions ma
         LEFT JOIN meetings m ON m.id = ma.meeting_id
        WHERE ma.tenant_id = $1
          AND ma.client_id = $2
          AND ma.created_at > NOW() - make_interval(days => $3)
        ORDER BY ma.created_at DESC
        LIMIT 50`,
      [tenantId, clientId, daysBack],
    ),
    safeRows<any>(
      `SELECT mcm.id,
              mcm.sender_name,
              mcm.sender_email,
              mcm.message_text,
              COALESCE(mcm.sent_at, mcm.created_at) AS occurred_at,
              m.title AS meeting_title
         FROM meeting_chat_messages mcm
         JOIN meetings m ON m.id = mcm.meeting_id
        WHERE mcm.tenant_id = $1
          AND mcm.client_id = $2
          AND COALESCE(mcm.sent_at, mcm.created_at) > NOW() - make_interval(days => $3)
          AND mcm.message_text IS NOT NULL
        ORDER BY COALESCE(mcm.sent_at, mcm.created_at) DESC
        LIMIT 50`,
      [tenantId, clientId, daysBack],
    ),
  ]);

  const candidates: EvidenceCandidate[] = [];

  for (const row of memoryRows) {
    candidates.push({
      source: 'memory',
      source_id: String(row.id),
      source_label: SOURCE_LABELS.memory,
      title: row.title || 'Memoria do cliente',
      author_name: null,
      occurred_at: row.related_at || row.created_at || null,
      snippet: compact(row.fact_text || row.summary),
      haystack: [row.title, row.summary, row.fact_text, row.source_type].filter(Boolean).join(' \n '),
      base_score: Math.max(0, Math.min(4, Number(row.confidence_score || 0.7) * 4)),
      direct_match: params.exactRefs.has(String(row.source_id || '')) || params.exactRefs.has(String(row.id || '')),
      tags: [row.fact_type, row.source_type].filter(Boolean).map(String),
    });
  }

  for (const row of groupMessageRows) {
    candidates.push({
      source: 'whatsapp',
      source_id: String(row.id),
      source_label: SOURCE_LABELS.whatsapp,
      title: row.group_name || 'WhatsApp do cliente',
      author_name: row.sender_name || row.sender_jid || null,
      occurred_at: row.created_at || null,
      snippet: compact(row.content),
      haystack: [row.group_name, row.sender_name, row.content].filter(Boolean).join(' \n '),
      direct_match: params.exactRefs.has(String(row.id || '')) || params.exactRefs.has(String(row.briefing_id || '')),
      tags: ['grupo'],
    });
  }

  for (const row of directMessageRows) {
    candidates.push({
      source: 'whatsapp',
      source_id: String(row.id),
      source_label: SOURCE_LABELS.whatsapp,
      title: 'WhatsApp direto',
      author_name: row.sender_name || row.sender_phone || null,
      occurred_at: row.created_at || null,
      snippet: compact(row.raw_text),
      haystack: [row.sender_name, row.sender_phone, row.raw_text].filter(Boolean).join(' \n '),
      direct_match: params.exactRefs.has(String(row.id || '')) || params.exactRefs.has(String(row.briefing_id || '')),
      tags: ['direto'],
    });
  }

  for (const row of whatsappInsightRows) {
    candidates.push({
      source: 'whatsapp',
      source_id: String(row.id),
      source_label: SOURCE_LABELS.whatsapp,
      title: row.group_name ? `${row.group_name} - insight` : 'Insight de WhatsApp',
      author_name: row.sender_name || null,
      occurred_at: row.created_at || null,
      snippet: compact(row.summary),
      haystack: [row.group_name, row.sender_name, row.insight_type, row.summary, row.sentiment, row.urgency].filter(Boolean).join(' \n '),
      base_score: 1,
      direct_match: params.exactRefs.has(String(row.id || '')) || params.exactRefs.has(String(row.message_id || '')),
      tags: ['insight', row.insight_type, row.urgency].filter(Boolean).map(String),
    });
  }

  for (const row of whatsappDigestRows) {
    const digestContext = [
      row.summary,
      JSON.stringify(row.key_decisions || []),
      JSON.stringify(row.pending_actions || []),
    ].filter(Boolean).join(' \n ');
    candidates.push({
      source: 'whatsapp',
      source_id: String(row.id),
      source_label: SOURCE_LABELS.whatsapp,
      title: `Digest ${row.period || 'WhatsApp'}`,
      author_name: null,
      occurred_at: row.period_end || row.created_at || null,
      snippet: compact(row.summary),
      haystack: digestContext,
      base_score: 1,
      direct_match: params.exactRefs.has(String(row.id || '')),
      tags: ['digest', row.period].filter(Boolean).map(String),
    });
  }

  for (const row of meetingRows) {
    candidates.push({
      source: 'meeting',
      source_id: String(row.id),
      source_label: SOURCE_LABELS.meeting,
      title: row.title || 'Reuniao',
      author_name: null,
      occurred_at: row.recorded_at || null,
      snippet: compact(row.summary || row.transcript),
      haystack: [row.title, row.summary, row.transcript].filter(Boolean).join(' \n '),
      direct_match: params.exactRefs.has(String(row.id || '')),
      tags: ['resumo'],
    });
  }

  for (const row of meetingActionRows) {
    candidates.push({
      source: 'meeting',
      source_id: String(row.id),
      source_label: SOURCE_LABELS.meeting,
      title: row.meeting_title ? `${row.meeting_title} - ${row.title}` : (row.title || 'Acao de reuniao'),
      author_name: null,
      occurred_at: row.recorded_at || row.created_at || null,
      snippet: compact(row.raw_excerpt || row.description || row.title),
      haystack: [row.meeting_title, row.title, row.description, row.raw_excerpt, row.priority].filter(Boolean).join(' \n '),
      base_score: 1.5,
      direct_match: params.exactRefs.has(String(row.id || '')),
      tags: ['acao'],
    });
  }

  for (const row of meetingChatRows) {
    candidates.push({
      source: 'meeting_chat',
      source_id: String(row.id),
      source_label: SOURCE_LABELS.meeting_chat,
      title: row.meeting_title || 'Chat da reuniao',
      author_name: row.sender_name || row.sender_email || null,
      occurred_at: row.occurred_at || null,
      snippet: compact(row.message_text),
      haystack: [row.meeting_title, row.sender_name, row.sender_email, row.message_text].filter(Boolean).join(' \n '),
      direct_match: params.exactRefs.has(String(row.id || '')),
      tags: ['chat'],
    });
  }

  return candidates.filter((candidate) => candidate.snippet);
}

export async function getJobClientContext(params: {
  tenantId: string;
  jobId: string;
  daysBack?: number;
  limit?: number;
}): Promise<JobClientContextResponse | null> {
  const jobRows = await query<JobRow>(
    `SELECT j.id,
            j.title,
            j.summary,
            j.job_type,
            j.source,
            j.client_id,
            c.name AS client_name,
            j.metadata
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
      WHERE j.tenant_id = $1
        AND j.id = $2
      LIMIT 1`,
    [params.tenantId, params.jobId],
  );

  let job = jobRows.rows[0];

  if (!job) {
    const cardRows = await query<JobRow>(
      `SELECT pc.id::text AS id,
              pc.title,
              pc.description AS summary,
              NULL::text AS job_type,
              'trello'::text AS source,
              pb.client_id,
              c.name AS client_name,
              jsonb_build_object(
                'project_card_id', pc.id::text,
                'trello_card_id', pc.trello_card_id,
                'trello_url', pc.trello_url
              ) AS metadata
         FROM project_cards pc
         JOIN project_boards pb ON pb.id = pc.board_id
         LEFT JOIN clients c ON c.id = pb.client_id
        WHERE pc.tenant_id = $1
          AND (pc.id::text = $2 OR pc.trello_card_id = $2)
        LIMIT 1`,
      [params.tenantId, params.jobId],
    );
    job = cardRows.rows[0];
  }

  if (!job) return null;

  const responseJob = {
    id: job.id,
    title: job.title,
    client_id: job.client_id,
    client_name: job.client_name,
  };

  if (!job.client_id) {
    return {
      job: responseJob,
      confidence: 'none',
      summary: null,
      searched_sources: [],
      signals: [],
    };
  }

  const queryText = [
    job.title,
    job.summary,
    job.job_type,
    job.source,
    typeof job.metadata?.trello_card_id === 'string' ? job.metadata.trello_card_id : null,
    typeof job.metadata?.trello_url === 'string' ? job.metadata.trello_url : null,
  ].filter(Boolean).join(' ');

  const tokens = tokenize(queryText);
  const exactRefs = collectExactRefs(job);
  const candidates = await loadCandidates({
    tenantId: params.tenantId,
    clientId: job.client_id,
    exactRefs,
    tokens,
    daysBack: Math.min(Math.max(Number(params.daysBack || 120), 7), 365),
  });

  const minScore = tokens.length ? 5 : 3;
  const signals = candidates
    .map((candidate) => {
      const { score, tokenHits } = scoreCandidate(candidate, tokens);
      const matchType = candidate.direct_match ? 'direct' : 'probable';
      return {
        candidate,
        score,
        tokenHits,
        signal: {
          id: `${candidate.source}:${candidate.source_id}`,
          source: candidate.source,
          source_id: candidate.source_id,
          source_label: candidate.source_label,
          title: candidate.title,
          author_name: candidate.author_name || null,
          occurred_at: candidate.occurred_at || null,
          snippet: candidate.snippet || '',
          relevance_reason: candidate.direct_match
            ? 'fonte vinculada diretamente a este job'
            : tokenHits > 0
            ? `${tokenHits} termo${tokenHits === 1 ? '' : 's'} do job encontrado${tokenHits === 1 ? '' : 's'} na fonte`
            : 'contexto recente do mesmo cliente',
          match_type: matchType,
          confidence: Math.max(0.25, Math.min(0.96, score / 24)),
          tags: Array.from(new Set(candidate.tags || [])).slice(0, 4),
        } satisfies JobClientContextSignal,
      };
    })
    .filter((item) => item.score >= minScore)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return new Date(right.signal.occurred_at || 0).getTime() - new Date(left.signal.occurred_at || 0).getTime();
    })
    .slice(0, Math.min(Math.max(Number(params.limit || 8), 1), 12))
    .map((item) => item.signal);

  return {
    job: responseJob,
    confidence: confidenceFromSignals(signals),
    summary: buildSummary(signals),
    searched_sources: ['whatsapp', 'meeting', 'meeting_chat', 'memory'],
    signals,
  };
}
