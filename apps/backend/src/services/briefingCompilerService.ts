import { query } from '../db';
import { buildClientKnowledgeBase } from './clientKnowledgeBaseService';
import { buildBriefingPacketScores } from './briefingPacketScoringService';

type DemandQueuePayload = {
  fingerprint: string;
  source: {
    type: 'trello_webhook' | 'portal_briefing' | 'ai_opportunity' | 'meeting_action' | 'whatsapp_insight' | 'gmail_thread' | 'calendar_signal';
    id: string;
    occurredAt?: string | null;
    refs?: Record<string, any>;
  };
  client_id: string | null;
  summary: {
    title: string;
    description?: string | null;
    objective?: string | null;
    platform?: string | null;
    deadline?: string | null;
    priorityHint?: string | null;
  };
  payload?: Record<string, any> | null;
  intake_result?: {
    candidate?: {
      status?: string;
      demandKind?: string;
      title?: string;
      summary?: string;
      clientId?: string | null;
      priorityHint?: string | null;
      platform?: string | null;
      deadline?: string | null;
      nextStep?: string;
      reasons?: string[];
    };
  };
};

function normalizeText(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function inferPlatform(...values: Array<unknown>) {
  const haystack = values.map((value) => normalizeText(value).toLowerCase()).join(' ');
  if (!haystack) return null;
  if (haystack.includes('linkedin')) return 'linkedin';
  if (haystack.includes('tiktok')) return 'tiktok';
  if (haystack.includes('facebook')) return 'facebook';
  if (haystack.includes('instagram') || haystack.includes('reels') || haystack.includes('carrossel')) return 'instagram';
  return null;
}

function inferFormat(...values: Array<unknown>) {
  const haystack = values.map((value) => normalizeText(value).toLowerCase()).join(' ');
  if (!haystack) return null;
  if (haystack.includes('carrossel')) return 'carrossel';
  if (haystack.includes('reel') || haystack.includes('video')) return 'video_short';
  if (haystack.includes('story')) return 'story';
  if (haystack.includes('banner')) return 'banner';
  if (haystack.includes('post')) return 'post';
  return null;
}

function firstNonEmpty(...values: Array<unknown>) {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) return normalized;
  }
  return null;
}

function defaultFormatForPlatform(platform: string | null) {
  const normalized = normalizeText(platform).toLowerCase();
  if (!normalized) return null;
  if (normalized === 'instagram') return 'post';
  if (normalized === 'linkedin') return 'post';
  if (normalized === 'facebook') return 'post';
  if (normalized === 'tiktok') return 'video_short';
  return null;
}

function inferExecutionProfile(...values: Array<unknown>) {
  const haystack = values.map((value) => normalizeText(value).toLowerCase()).join(' ');
  if (!haystack) return 'copy_and_art' as const;
  if (/(adapt|adapta|desdobra|vers(a|ã)o|varia(c|ç)(a|ã)o|replica|atualiza)/.test(haystack)) {
    return 'adapt_existing' as const;
  }
  if (/(revisa|corrig|aprova|review)/.test(haystack)) {
    return 'review_existing' as const;
  }
  const copyHints = /(copy|legenda|texto|headline|cta|roteiro|caption|chamada)/.test(haystack);
  const visualHints = /(arte|imagem|mockup|visual|criativo|layout|design|banner|carrossel|reel|video)/.test(haystack);
  if (copyHints && !visualHints) {
    return 'copy_only' as const;
  }
  return 'copy_and_art' as const;
}

async function loadHistoricalCreativeContext(tenantId: string, clientId: string) {
  const [briefingsRes, datesRes] = await Promise.all([
    query<{
      id: string;
      title: string | null;
      platform: string | null;
      format: string | null;
      created_at: string | null;
      copy_preview: string | null;
    }>(
      `SELECT b.id::text AS id,
              b.title,
              NULLIF(COALESCE(b.payload->>'platform', ''), '') AS platform,
              NULLIF(COALESCE(b.payload->>'format', b.payload->>'production_type', ''), '') AS format,
              b.created_at::text AS created_at,
              (
                SELECT LEFT(cv.output, 220)
                  FROM edro_copy_versions cv
                 WHERE cv.briefing_id = b.id
                 ORDER BY cv.created_at DESC
                 LIMIT 1
              ) AS copy_preview
         FROM edro_briefings b
        WHERE b.tenant_id = $1
          AND b.main_client_id = $2
        ORDER BY b.created_at DESC
        LIMIT 4`,
      [tenantId, clientId],
    ).catch(() => ({ rows: [] as Array<any> })),
    query<{
      event_name: string | null;
      event_date: string | null;
      relevance_score: number | null;
    }>(
      `SELECT e.name AS event_name,
              e.date AS event_date,
              cer.relevance_score
         FROM calendar_event_relevance cer
         JOIN events e ON e.id = cer.calendar_event_id
        WHERE cer.tenant_id = $1
          AND cer.client_id = $2
          AND cer.is_relevant = true
          AND COALESCE(cer.relevance_score, 0) >= 55
          AND e.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
          AND e.date::date >= CURRENT_DATE
        ORDER BY e.date::date ASC, cer.relevance_score DESC
        LIMIT 3`,
      [tenantId, clientId],
    ).catch(() => ({ rows: [] as Array<any> })),
  ]);

  const lastPlatform = firstNonEmpty(...briefingsRes.rows.map((item) => item.platform));
  const lastFormat = firstNonEmpty(...briefingsRes.rows.map((item) => item.format));

  return {
    defaults: {
      platform: lastPlatform,
      format: lastFormat,
    },
    recent_briefings: briefingsRes.rows.map((item) => ({
      id: item.id,
      title: item.title,
      platform: item.platform,
      format: item.format,
      created_at: item.created_at,
      copy_preview: item.copy_preview,
    })),
    upcoming_dates: datesRes.rows.map((item) => ({
      title: item.event_name,
      date: item.event_date,
      relevance_score: item.relevance_score,
    })),
  };
}

function collectMissingInformation(payload: DemandQueuePayload, objective: string | null, platform: string | null, format: string | null) {
  const gaps: Array<{ field: string; ask_target: 'system' | 'internal' | 'client'; reason: string }> = [];
  if (!payload.client_id) {
    gaps.push({ field: 'client_id', ask_target: 'internal', reason: 'A demanda ainda não está vinculada a um cliente canônico.' });
  }
  if (!objective || objective.length < 10) {
    gaps.push({
      field: 'objective',
      ask_target: payload.source.type === 'portal_briefing' ? 'client' : 'internal',
      reason: 'O objetivo ainda está curto demais para iniciar a criação com segurança.',
    });
  }
  if (!platform) {
    gaps.push({
      field: 'platform',
      ask_target: payload.source.type === 'portal_briefing' ? 'client' : 'internal',
      reason: 'A plataforma de publicação ainda não foi inferida com confiança.',
    });
  }
  if (!format) {
    gaps.push({ field: 'format', ask_target: 'internal', reason: 'O formato final da peça ainda não está explícito na demanda.' });
  }
  return gaps;
}

export async function compileBriefingPacket(params: {
  tenantId: string;
  payload: DemandQueuePayload;
}) {
  const candidate = params.payload.intake_result?.candidate ?? {};
  const clientId = params.payload.client_id ?? candidate.clientId ?? null;
  const historicalContext = clientId
    ? await loadHistoricalCreativeContext(params.tenantId, clientId).catch(() => ({
        defaults: { platform: null, format: null },
        recent_briefings: [],
        upcoming_dates: [],
      }))
    : { defaults: { platform: null, format: null }, recent_briefings: [], upcoming_dates: [] };
  const objective = firstNonEmpty(
    params.payload.summary.objective,
    candidate.summary,
    params.payload.summary.description,
  );
  const platform = firstNonEmpty(
    params.payload.summary.platform,
    candidate.platform,
    inferPlatform(
      params.payload.summary.title,
      params.payload.summary.description,
      objective,
      params.payload.payload?.platform,
      params.payload.source.refs?.platform,
    ),
    historicalContext.defaults.platform,
  );
  const format = firstNonEmpty(
    inferFormat(
      params.payload.summary.title,
      params.payload.summary.description,
      objective,
      params.payload.payload?.format,
      params.payload.source.refs?.format,
    ),
    historicalContext.defaults.format,
    defaultFormatForPlatform(platform),
  );
  const priorityHint = params.payload.summary.priorityHint || candidate.priorityHint || null;
  const deadline = firstNonEmpty(
    params.payload.summary.deadline,
    candidate.deadline,
    historicalContext.upcoming_dates[0]?.date,
  );
  const executionProfile = inferExecutionProfile(
    candidate.demandKind,
    params.payload.summary.title,
    params.payload.summary.description,
    objective,
    platform,
    format,
    params.payload.payload?.request_type,
  );
  const missingInformation = collectMissingInformation({ ...params.payload, client_id: clientId }, objective, platform, format);

  const knowledge = clientId
    ? await buildClientKnowledgeBase({
        tenantId: params.tenantId,
        clientId,
        question: [params.payload.summary.title, params.payload.summary.description, objective].filter(Boolean).join(' '),
        daysBack: 60,
        limitDocuments: 4,
        intent: 'creative',
        platform,
        objective,
        format,
      }).catch(() => null)
    : null;
  const fieldSources = {
    client_id: clientId ? (params.payload.client_id ? 'explicit_client' : candidate.clientId ? 'candidate_client' : null) : null,
    summary: candidate.summary ? 'candidate_summary' : params.payload.summary.description ? 'explicit_summary' : params.payload.summary.title ? 'title_only' : null,
    objective: params.payload.summary.objective ? 'explicit_objective' : candidate.summary ? 'candidate_summary' : params.payload.summary.description ? 'summary_inference' : null,
    platform: params.payload.summary.platform ? 'explicit_platform' : candidate.platform ? 'candidate_platform' : historicalContext.defaults.platform && historicalContext.defaults.platform === platform ? 'history_platform' : platform ? 'text_inference_platform' : null,
    format: historicalContext.defaults.format && historicalContext.defaults.format === format ? 'history_format' : defaultFormatForPlatform(platform) === format ? 'platform_default_format' : format ? 'text_inference_format' : null,
    deadline: params.payload.summary.deadline ? 'explicit_deadline' : candidate.deadline ? 'candidate_deadline' : historicalContext.upcoming_dates[0]?.date === deadline ? 'calendar_deadline' : null,
  };

  const readiness = missingInformation.some((gap) => gap.ask_target === 'client')
    ? 'needs_client_input'
    : missingInformation.length
      ? 'needs_internal_triage'
      : 'ready';
  const scores = buildBriefingPacketScores({
    readiness,
    values: {
      client_id: clientId,
      summary: normalizeText(candidate.summary || params.payload.summary.description || objective),
      objective,
      platform,
      format,
      deadline,
    },
    fieldSources,
    missingInformation,
    knowledgeAvailable: Boolean(knowledge),
    historicalSignals: historicalContext.recent_briefings.length + historicalContext.upcoming_dates.length,
    executionProfile,
  });

  return {
    compiled_at: new Date().toISOString(),
    readiness,
    source: {
      type: params.payload.source.type,
      id: params.payload.source.id,
      occurred_at: params.payload.source.occurredAt ?? null,
      refs: params.payload.source.refs ?? {},
    },
    client_id: clientId,
    demand_kind: candidate.demandKind ?? 'unknown',
    execution_profile: executionProfile,
    title: normalizeText(candidate.title || params.payload.summary.title),
    objective,
    platform,
    format,
    deadline,
    priority_hint: priorityHint,
    summary: normalizeText(candidate.summary || params.payload.summary.description || objective),
    field_sources: fieldSources,
    field_confidence: scores.field_confidence,
    completeness_score: scores.completeness_score,
    missing_information: missingInformation,
    inferable_fields: scores.inferable_fields,
    internal_questions: scores.internal_questions,
    client_questions: scores.client_questions,
    autostart_recommendation: scores.autostart_recommendation,
    historical_context: {
      defaults: historicalContext.defaults,
      recent_briefings: historicalContext.recent_briefings,
      upcoming_dates: historicalContext.upcoming_dates,
    },
    knowledge: knowledge ? {
      client_name: knowledge.client_name,
      intent_profile: knowledge.intent_profile,
      topic_maps: knowledge.topic_maps.slice(0, 4),
      communication_radar: knowledge.radar,
      preferred_themes: knowledge.topic_maps.slice(0, 4).map((item) => item.topic),
      copy_policy_block: knowledge.copy_policy_block,
      knowledge_base_block: knowledge.knowledge_base_block,
    } : null,
  };
}
