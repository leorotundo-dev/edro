import { buildClientKnowledgeBase } from './clientKnowledgeBaseService';

type DemandQueuePayload = {
  fingerprint: string;
  source: {
    type: 'trello_webhook' | 'portal_briefing' | 'ai_opportunity';
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
  const objective = normalizeText(params.payload.summary.objective || candidate.summary || params.payload.summary.description) || null;
  const platform = params.payload.summary.platform || candidate.platform || inferPlatform(params.payload.summary.title, params.payload.summary.description, objective);
  const format = inferFormat(params.payload.summary.title, params.payload.summary.description, objective);
  const priorityHint = params.payload.summary.priorityHint || candidate.priorityHint || null;
  const deadline = params.payload.summary.deadline || candidate.deadline || null;
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

  const readiness = missingInformation.some((gap) => gap.ask_target === 'client')
    ? 'needs_client_input'
    : missingInformation.length
      ? 'needs_internal_triage'
      : 'ready';

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
    title: normalizeText(candidate.title || params.payload.summary.title),
    objective,
    platform,
    format,
    deadline,
    priority_hint: priorityHint,
    summary: normalizeText(candidate.summary || params.payload.summary.description || objective),
    missing_information: missingInformation,
    knowledge: knowledge ? {
      client_name: knowledge.client_name,
      intent_profile: knowledge.intent_profile,
      topic_maps: knowledge.topic_maps.slice(0, 4),
      communication_radar: knowledge.radar,
      copy_policy_block: knowledge.copy_policy_block,
      knowledge_base_block: knowledge.knowledge_base_block,
    } : null,
  };
}
