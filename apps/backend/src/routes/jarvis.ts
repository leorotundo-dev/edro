import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, can, normalizeRole } from '../auth/rbac';
import { getJarvisAlerts, dismissAlert, snoozeAlert } from '../services/jarvisAlertEngine';
import { query } from '../db';
import { getFallbackProvider, type UsageContext } from '../services/ai/copyOrchestrator';
import { runToolUseLoop } from '../services/ai/toolUseLoop';
import { getAllToolDefinitions, getOperationsToolDefinitions } from '../services/ai/toolDefinitions';
import { executeOperationsTool, type OperationsToolContext, type ToolContext } from '../services/ai/toolExecutor';
import { getBriefingById } from '../repositories/edroBriefingRepository';
import {
  buildAgentSystemPrompt,
  mapProviderToCopy,
} from './planning';
import {
  buildClientContext,
  loadPerformanceContext,
  loadPsychContext,
  resolveEdroClientId,
} from '../services/jarvisContextService';
import { buildOperationsSystemPrompt } from './operations';
import { buildJarvisMemoryBlocks, formatJarvisMemoryBlocks } from '../services/jarvisMemoryFabricService';
import { buildClientLivingMemory } from '../services/clientLivingMemoryService';
import { buildBriefingDiagnostics } from '../services/briefingDiagnosticService';
import { analyzeClientMemoryGovernance, type ClientMemoryGovernanceAnalysis } from '../services/clientMemoryGovernanceService';
import { buildClientState } from '../services/jarvisDecisionEngine';
import { getJobById } from '../jobs/jobQueue';
import { buildJarvisBackgroundArtifact } from '../services/jarvisBackgroundJobService';
import {
  buildInlineAttachmentContext,
  buildJarvisObservability,
  buildJarvisRoutingDecision,
  detectExplicitConfirmation,
  detectJarvisIntent,
  loadUnifiedConversationHistory,
  saveUnifiedConversation,
  summarizeJarvisToolGovernance,
} from '../services/jarvisPolicyService';
import crypto from 'crypto';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type CreativeExecutionTarget = {
  jobId: string | null;
  jobTitle: string | null;
  clientId: string | null;
  briefingId: string | null;
  creativeSessionId: string | null;
};

const jarvisChatSchema = z.object({
  message: z.string().min(1),
  clientId: z.string().trim().min(1).optional().nullable(),
  provider: z.enum(['openai', 'anthropic', 'google', 'collaborative']).optional().default('openai'),
  conversationId: z.string().uuid().nullish(),
  context_page: z.string().optional().nullable(),
  studio_context: z.string().optional().nullable(),
  page_data: z.record(z.string(), z.unknown()).optional().nullable(),
  inline_attachments: z.array(z.object({
    name: z.string(),
    text: z.string(),
  })).optional(),
});

function buildPageDataContext(pageData?: Record<string, unknown> | null) {
  if (!pageData || typeof pageData !== 'object') return '';
  const lines = Object.entries(pageData)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
    .slice(0, 12)
    .map(([key, value]) => {
      const rendered = typeof value === 'string'
        ? value
        : JSON.stringify(value);
      return `- ${key}: ${rendered.slice(0, 500)}`;
    });
  if (!lines.length) return '';
  return `\n\nCONTEXTO DA TELA ATUAL:\n${lines.join('\n')}\nINSTRUÇÃO: trate job, briefing, sessão criativa e cliente atuais como contexto prioritário para agir sem pedir de novo o que já está visível na tela.`;
}

function readPageDataString(pageData: Record<string, unknown> | null | undefined, keys: string[]) {
  if (!pageData || typeof pageData !== 'object') return null;
  for (const key of keys) {
    const value = pageData[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function asUuid(value?: string | null) {
  const trimmed = String(value || '').trim();
  return UUID_PATTERN.test(trimmed) ? trimmed : null;
}

function shouldDelegateToCreativeExecutor(message: string, pageData?: Record<string, unknown> | null) {
  const hasContextTarget = Boolean(
    asUuid(readPageDataString(pageData, ['currentJobId', 'jobId']))
      || asUuid(readPageDataString(pageData, ['currentBriefingId', 'briefing_id', 'briefingId']))
      || asUuid(readPageDataString(pageData, ['creativeSessionId', 'creative_session_id', 'currentCreativeSessionId', 'sessionId']))
  );
  if (!hasContextTarget) return false;

  const haystack = message.toLowerCase();
  const actionSignals = ['resolve', 'resolva', 'gere', 'gera', 'crie', 'cria', 'faça', 'faz', 'monte', 'monta', 'escreva', 'escreve', 'desenvolva', 'desenvolve'];
  const creativeSignals = [
    'copy', 'legenda', 'headline', 'cta', 'roteiro', 'conceito',
    'visual brief', 'direção criativa', 'direcao criativa',
    'arte', 'imagem', 'criativo', 'carrossel',
  ];

  return actionSignals.some((token) => haystack.includes(token))
    && creativeSignals.some((token) => haystack.includes(token));
}

function shouldSkipArte(message: string) {
  const haystack = message.toLowerCase();
  const artSignals = ['arte', 'imagem', 'visual', 'mockup', 'direção de arte', 'direcao de arte', 'carrossel'];
  const copyOnlySignals = ['copy', 'legenda', 'headline', 'cta', 'texto', 'roteiro'];
  if (artSignals.some((token) => haystack.includes(token))) return false;
  return copyOnlySignals.some((token) => haystack.includes(token));
}

function emptyLivingMemoryPreflight() {
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

function emptyClientStatePreflight(tenantId: string, clientId: string | null) {
  return {
    client_id: clientId || '',
    tenant_id: tenantId,
    snapshot_at: new Date(),
    awareness: {
      trello: { active_jobs: 0, blocked: 0, stale: 0 },
      meetings: { pending_decisions: 0, last_meeting_days_ago: null },
      whatsapp: { days_without_client_response: null, pending_approval: false },
      calendar: { upcoming_orphan_dates: 0 },
      financial: { contract_renewal_days: null, invoices_overdue: 0 },
      learning: { active_rules: 0, new_patterns_24h: 0 },
      competitors: { active_in_48h: 0 },
      social: { mentions_24h: 0 },
      jobs: { without_briefing: 0, da_stale: 0 },
      living_memory: {
        active_directives: 0,
        evidence_signals_30d: 0,
        fresh_signals_7d: 0,
        pending_commitments: 0,
      },
    },
    open_alerts: 0,
    pending_decisions: [],
    living_memory_preview: {
      directives: [],
      evidence: [],
      pending_commitments: [],
    },
  };
}

function buildClientStatePreflightContext(state: ReturnType<typeof emptyClientStatePreflight>) {
  const parts = [
    'ESTADO DO CLIENTE PREFLIGHT:',
    `- Alertas abertos: ${state.open_alerts}`,
    `- Jobs sem briefing: ${state.awareness.jobs.without_briefing}`,
    `- Jobs DA stale: ${state.awareness.jobs.da_stale}`,
    `- Pendências de reunião: ${state.awareness.meetings.pending_decisions}`,
    `- WhatsApp sem resposta: ${state.awareness.whatsapp.days_without_client_response ?? 'sem dado'} dias`,
    `- Faturas vencidas: ${state.awareness.financial.invoices_overdue}`,
    `- Diretivas ativas: ${state.awareness.living_memory.active_directives}`,
    `- Sinais vivos 7d: ${state.awareness.living_memory.fresh_signals_7d}`,
    `- Compromissos pendentes: ${state.awareness.living_memory.pending_commitments}`,
  ];
  if (state.living_memory_preview.directives.length) {
    parts.push(`- Diretivas principais: ${state.living_memory_preview.directives.slice(0, 3).join(' | ')}`);
  }
  if (state.living_memory_preview.evidence.length) {
    const evidence = state.living_memory_preview.evidence
      .slice(0, 2)
      .map((item) => `${item.source_type}: ${item.title || item.excerpt}`)
      .join(' | ');
    parts.push(`- Evidências recentes: ${evidence}`);
  }
  return parts.join('\n');
}

function emptyBriefingDiagnosticsPreflight() {
  return {
    briefing_id: null as string | null,
    title: '',
    diagnostics: {
      gaps: [] as string[],
      tensions: [] as string[],
      recommendations: [] as string[],
      conflicts: [] as Array<{ type: string; severity: string; message: string }>,
      severity: 'none' as const,
      requires_confirmation: false,
      recommended_resolution: null as string | null,
      block: '',
    },
  };
}

function buildBriefingDiagnosticsPreflightContext(preflight: ReturnType<typeof emptyBriefingDiagnosticsPreflight>) {
  if (!preflight.diagnostics.block) return '';
  return [
    'DIAGNOSTICO DE BRIEFING PREFLIGHT:',
    preflight.diagnostics.block,
    preflight.diagnostics.requires_confirmation
      ? 'INSTRUÇÃO: conflito forte detectado. Não siga automaticamente sem confirmação explícita do usuário.'
      : 'INSTRUÇÃO: trate essas lacunas e tensões como restrições reais. Se o briefing estiver fraco, compense usando memória viva e estado do cliente antes de concluir.',
  ].join('\n');
}

function emptyMemoryGovernancePreflight(): ClientMemoryGovernanceAnalysis {
  return {
    summary: {
      active_facts: 0,
      archive_candidates: 0,
      replace_candidates: 0,
      high_severity: 0,
      stale_facts: 0,
      stale_directives: 0,
      stale_commitments: 0,
      active_conflicts: 0,
      governance_pressure: 'low',
    },
    suggestions: [],
    conflicts: [],
  };
}

function buildMemoryGovernancePreflightContext(preflight: ClientMemoryGovernanceAnalysis) {
  if (preflight.summary.governance_pressure === 'low' && !preflight.summary.active_conflicts && !preflight.summary.stale_facts) return '';
  const lines = [
    'GOVERNANÇA DA MEMÓRIA PREFLIGHT:',
    `- Pressão: ${preflight.summary.governance_pressure}`,
    `- Fatos envelhecidos: ${preflight.summary.stale_facts}`,
    `- Conflitos internos: ${preflight.summary.active_conflicts}`,
  ];
  if (preflight.suggestions.length) {
    lines.push(`- Sugestões de limpeza: ${preflight.suggestions.slice(0, 2).map((item) => `${item.action} ${item.target?.title}`).join(' | ')}`);
  }
  if (preflight.summary.governance_pressure === 'high') {
    lines.push('INSTRUÇÃO: a memória viva está sob pressão alta. Não confie cegamente no contexto acumulado; proponha limpeza/substituição antes de criar se isso puder contaminar a resposta.');
  }
  return lines.join('\n');
}

async function resolveCreativeExecutionTarget(params: {
  tenantId: string;
  bodyClientId?: string | null;
  pageData?: Record<string, unknown> | null;
}): Promise<CreativeExecutionTarget | null> {
  const sessionId = asUuid(readPageDataString(params.pageData, ['creativeSessionId', 'creative_session_id', 'currentCreativeSessionId', 'sessionId']));
  const pageJobId = asUuid(readPageDataString(params.pageData, ['currentJobId', 'jobId']));
  const pageBriefingId = asUuid(readPageDataString(params.pageData, ['currentBriefingId', 'briefing_id', 'briefingId']));

  let creativeSessionId = sessionId;
  let jobId = pageJobId;
  let briefingId = pageBriefingId;

  if (creativeSessionId) {
    const { rows } = await query<{ id: string; job_id: string; briefing_id: string | null }>(
      `SELECT id, job_id, briefing_id
         FROM creative_sessions
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1`,
      [params.tenantId, creativeSessionId],
    );
    const session = rows[0];
    if (session) {
      jobId = jobId || session.job_id;
      briefingId = briefingId || session.briefing_id || null;
    }
  }

  let jobTitle: string | null = null;
  let clientId = params.bodyClientId || readPageDataString(params.pageData, ['clientId', 'currentClientId']);

  if (jobId) {
    const { rows } = await query<{
      id: string;
      title: string;
      client_id: string | null;
      metadata: Record<string, any> | null;
    }>(
      `SELECT id, title, client_id, COALESCE(metadata, '{}'::jsonb) AS metadata
         FROM jobs
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1`,
      [params.tenantId, jobId],
    );
    const job = rows[0];
    if (!job) return null;
    jobTitle = job.title || null;
    clientId = clientId || job.client_id || null;
    briefingId = briefingId || asUuid(job.metadata?.briefing_id) || null;

    if (!briefingId) {
      const { rows: sessionRows } = await query<{ id: string; briefing_id: string | null }>(
        `SELECT id, briefing_id
           FROM creative_sessions
          WHERE tenant_id = $1
            AND job_id = $2
          ORDER BY updated_at DESC
          LIMIT 1`,
        [params.tenantId, jobId],
      );
      if (sessionRows[0]) {
        creativeSessionId = creativeSessionId || sessionRows[0].id;
        briefingId = sessionRows[0].briefing_id || null;
      }
    }
  }

  if (!briefingId) return null;

  if (!clientId) {
    const { rows } = await query<{ main_client_id: string | null }>(
      `SELECT main_client_id
         FROM edro_briefings
        WHERE tenant_id = $1
          AND id = $2
        LIMIT 1`,
      [params.tenantId, briefingId],
    );
    clientId = rows[0]?.main_client_id || null;
  }

  return {
    jobId,
    jobTitle,
    clientId: clientId || null,
    briefingId,
    creativeSessionId,
  };
}

function selectBestCopyVariant(copy: any) {
  const variants = Array.isArray(copy?.variants) ? copy.variants : [];
  if (!variants.length) return null;
  const approved = variants.filter((variant) => Boolean(variant?.audit?.approved));
  const pool = approved.length ? approved : variants;
  return [...pool].sort((left, right) => Number(right?.audit?.score || 0) - Number(left?.audit?.score || 0))[0] || variants[0];
}

async function runCreativeExecutionCapability(params: {
  tenantId: string;
  userId?: string | null;
  userRole?: string | null;
  explicitConfirmation?: boolean;
  message: string;
  bodyClientId?: string | null;
  pageData?: Record<string, unknown> | null;
}) {
  if (!can(normalizeRole(params.userRole), 'clients:write')) return null;

  const target = await resolveCreativeExecutionTarget({
    tenantId: params.tenantId,
    bodyClientId: params.bodyClientId,
    pageData: params.pageData,
  });
  if (!target?.briefingId) return null;

  const [{ runJarvisExecutor }, creativeSessionModule] = await Promise.all([
    import('../services/jarvisExecutor'),
    import('../services/jobs/creativeSessionService'),
  ]);
  const { openCreativeSession, updateCreativeSessionMetadata, addCreativeVersion, addCreativeAsset } = creativeSessionModule;

  const skipArte = shouldSkipArte(params.message);
  const briefing = await getBriefingById(target.briefingId, params.tenantId).catch(() => null);
  const briefingPayload = (briefing?.payload || {}) as Record<string, any>;
  const livingMemoryPreflight = target.clientId
    ? await buildClientLivingMemory({
        tenantId: params.tenantId,
        clientId: target.clientId,
        briefing: {
          title: briefing?.title ?? '',
          objective: briefingPayload.objective ?? briefingPayload.objetivo ?? '',
          context: briefingPayload.context ?? briefingPayload.notes ?? briefingPayload.additional_notes ?? null,
          payload: briefingPayload,
        },
        maxEvidence: 5,
        maxActions: 4,
      }).catch(() => null)
    : null;
  const memoryGovernancePreflight = target.clientId
    ? await analyzeClientMemoryGovernance({
        tenantId: params.tenantId,
        clientId: target.clientId,
        daysBack: 365,
        limit: 80,
      }).catch(() => null)
    : null;
  const briefingDiagnostics = briefing && livingMemoryPreflight
    ? buildBriefingDiagnostics({
        briefing: {
          title: briefing.title,
          objective: briefingPayload.objective ?? briefingPayload.objetivo ?? '',
          context: briefingPayload.context ?? briefingPayload.notes ?? briefingPayload.additional_notes ?? null,
          platform: briefingPayload.platform ?? briefingPayload.plataforma ?? null,
          format: briefingPayload.format ?? briefingPayload.formato ?? briefingPayload.creative_format ?? null,
          payload: briefingPayload,
        },
        livingMemory: livingMemoryPreflight,
        memoryGovernance: memoryGovernancePreflight,
      })
    : null;

  if (
    memoryGovernancePreflight?.summary.governance_pressure === 'high'
    && memoryGovernancePreflight.suggestions.length > 0
    && !params.explicitConfirmation
  ) {
    return {
      response: [
        'A memória viva deste cliente está sob pressão alta de governança.',
        'Não executei a criação automaticamente porque há fatos envelhecidos ou conflitantes que podem contaminar a peça.',
        'Posso seguir mesmo assim com sua confirmação explícita, ou primeiro limpar/substituir os fatos sugeridos.',
      ].join('\n'),
      artifacts: [
        {
          type: 'memory_governance_gate',
          message: target.jobTitle || 'Governança da memória bloqueou a criação automática',
          briefing_id: target.briefingId,
          job_id: target.jobId,
          memory_governance: memoryGovernancePreflight,
          requires_confirmation: true,
        },
      ],
      provider: 'studio_executor',
      model: 'jarvis_memory_governance_gate',
    };
  }

  if (briefingDiagnostics?.requires_confirmation && !params.explicitConfirmation) {
    return {
      response: [
        'Encontrei conflito forte entre o briefing atual e a memória viva do cliente.',
        'Não executei a criação automaticamente para evitar gerar uma peça desalinhada.',
        briefingDiagnostics.recommended_resolution || 'Revise o briefing e confirme explicitamente se devo seguir mesmo assim.',
      ].join('\n'),
      artifacts: [
        {
          type: 'creative_conflict_gate',
          message: target.jobTitle || 'Conflito detectado antes da execução criativa',
          briefing_id: target.briefingId,
          job_id: target.jobId,
          diagnostics: briefingDiagnostics,
          requires_confirmation: true,
        },
      ],
      provider: 'studio_executor',
      model: 'jarvis_conflict_gate',
    };
  }

  const creativeContext = target.jobId
    ? await openCreativeSession(params.tenantId, target.jobId, params.userId ?? null, { briefing_id: target.briefingId }).catch(() => null)
    : null;
  const sessionId = creativeContext?.session?.id || target.creativeSessionId || null;

  const result = await runJarvisExecutor({
    briefingId: target.briefingId,
    clientId: target.clientId,
    tenantId: params.tenantId,
    skipArte,
  });

  const bestVariant = selectBestCopyVariant(result.copy);

  if (target.jobId && sessionId) {
    await updateCreativeSessionMetadata(params.tenantId, sessionId, target.jobId, params.userId ?? null, {
      metadata: {
        jarvis_last_execution: {
          source: 'jarvis_chat',
          message: params.message,
          executed_at: new Date().toISOString(),
          briefing_id: target.briefingId,
          concept_id: result.conceito.chosen.concept_id,
          skip_arte: skipArte,
        },
      },
      reason: 'jarvis_global_creative_execution',
    }).catch(() => {});

    if (bestVariant) {
      await addCreativeVersion(params.tenantId, sessionId, target.jobId, params.userId ?? null, {
        version_type: 'copy',
        source: 'ai',
        select: true,
        payload: {
          title: bestVariant.title,
          body: bestVariant.body,
          cta: bestVariant.cta,
          legenda: bestVariant.legenda,
          hashtags: bestVariant.hashtags,
          final_text: bestVariant.audit?.final_text || [bestVariant.title, bestVariant.body, bestVariant.cta].filter(Boolean).join('\n\n'),
          audit: bestVariant.audit,
          concept: result.conceito.chosen,
          strategy: result.copy.strategy,
          brand_voice: result.copy.brandVoice,
          generated_by: 'jarvis_global',
        },
      }).catch(() => {});
    }

    await addCreativeVersion(params.tenantId, sessionId, target.jobId, params.userId ?? null, {
      version_type: 'layout',
      source: 'ai',
      payload: {
        concept: result.conceito.chosen,
        visual_brief: result.visual_brief,
        generated_by: 'jarvis_global',
      },
    }).catch(() => {});

    await addCreativeVersion(params.tenantId, sessionId, target.jobId, params.userId ?? null, {
      version_type: 'image_prompt',
      source: 'ai',
      payload: {
        concept: result.conceito.chosen,
        visual_brief: result.visual_brief,
        prompt: result.arte?.payload?.prompt ?? null,
        negative_prompt: result.arte?.payload?.negativePrompt ?? null,
        critique: result.arte?.critique ?? null,
        generated_by: 'jarvis_global',
      },
    }).catch(() => {});

    if (result.arte?.imageUrl) {
      await addCreativeAsset(params.tenantId, sessionId, target.jobId, params.userId ?? null, {
        asset_type: 'image',
        source: 'ai',
        file_url: result.arte.imageUrl,
        thumb_url: result.arte.imageUrl,
        select: true,
        metadata: {
          concept: result.conceito.chosen,
          critique: result.arte.critique,
          prompt: result.arte.payload?.prompt ?? null,
          generated_by: 'jarvis_global',
        },
      }).catch(() => {});
    }
  }

  const studioUrl = target.jobId
    ? `/studio/editor?jobId=${encodeURIComponent(target.jobId)}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''}`
    : `/studio/pipeline/${encodeURIComponent(target.briefingId)}`;

  const summaryLines = [
    `Resolvi a direção criativa de ${target.jobTitle ? `"${target.jobTitle}"` : 'esta demanda'} e já deixei o resultado salvo no Studio.`,
    `Conceito escolhido: ${result.conceito.chosen.headline_concept}.`,
    memoryGovernancePreflight?.summary.governance_pressure === 'high'
      ? 'A criação saiu com pressão alta de governança na memória viva; vale revisar e limpar fatos antigos ou conflitantes na sequência.'
      : memoryGovernancePreflight?.summary.governance_pressure === 'medium'
        ? 'A memória viva tem alguns fatos envelhecidos ou conflitantes; usei o contexto com cautela.'
        : null,
    result.briefing_diagnostics?.requires_confirmation
      ? 'Havia conflito forte no briefing, mas segui porque houve confirmação explícita.'
      : result.briefing_diagnostics?.severity && result.briefing_diagnostics.severity !== 'none'
        ? 'Também detectei e compensei tensões do briefing com base no contexto vivo do cliente.'
        : result.briefing_diagnostics
          ? 'Também detectei e compensei lacunas do briefing com base no contexto vivo do cliente.'
          : null,
    bestVariant?.title ? `Copy principal: ${bestVariant.title}.` : null,
    result.arte?.imageUrl
      ? 'A arte inicial também foi gerada e vinculada à sessão criativa.'
      : 'Gerei a copy e o visual brief; a arte pode ser refinada no Studio na sequência.',
    'Se quiser, posso continuar daqui mesmo refinando tom, CTA, formato ou ângulo criativo.',
  ].filter(Boolean);

  return {
    response: summaryLines.join('\n'),
    artifacts: [
      {
        type: 'creative_execution',
        message: target.jobTitle || 'Execução criativa concluída',
        studio_url: studioUrl,
        creative_session_id: sessionId,
        briefing_id: target.briefingId,
        job_id: target.jobId,
        concept_headline: result.conceito.chosen.headline_concept,
        copy_title: bestVariant?.title ?? null,
        image_url: result.arte?.imageUrl ?? null,
        has_arte: Boolean(result.arte?.imageUrl),
        briefing_diagnostics: result.briefing_diagnostics,
        memory_governance: memoryGovernancePreflight,
        duration_ms: result.duration_ms,
      },
    ],
    provider: 'studio_executor',
    model: skipArte ? 'jarvis_executor_copy' : 'jarvis_executor_full',
  };
}

export default async function jarvisRoutes(app: FastifyInstance) {
  app.post('/jarvis/chat', { preHandler: [authGuard] }, async (request: any, reply) => {
    const startMs = Date.now();
    const tenantId = request.user?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const userEmail = request.user?.email as string | undefined;
    const userRole = request.user?.role as string | undefined;

    let body: z.infer<typeof jarvisChatSchema>;
    try {
      body = jarvisChatSchema.parse(request.body);
    } catch {
      return reply.status(400).send({ success: false, error: 'Mensagem inválida.' });
    }

    const intent = detectJarvisIntent(body.message, body.context_page, body.page_data ?? undefined);
    const decision = buildJarvisRoutingDecision(intent);
    const pageDataClientId = typeof body.page_data?.clientId === 'string' ? body.page_data.clientId.trim() : '';
    const clientId = body.clientId ?? (pageDataClientId || null);
    const edroClientId = clientId ? await resolveEdroClientId(clientId) : null;
    const effectiveConversationId = body.conversationId || crypto.randomUUID();
    const conversationHistory = await loadUnifiedConversationHistory({
      route: decision.route,
      tenantId,
      conversationId: effectiveConversationId,
      edroClientId,
    });
    const attachmentContext = buildInlineAttachmentContext(body.inline_attachments);
    const studioContext = body.studio_context ? `\n\nCONTEXTO DO STUDIO:\n${body.studio_context}` : '';
    const pageDataContext = buildPageDataContext(body.page_data ?? undefined);
    const userContent = `${body.message}${attachmentContext}${studioContext}${pageDataContext}`;
    const explicitConfirmation = detectExplicitConfirmation(body.message);

    if (decision.route === 'planning' && !clientId) {
      return reply.status(400).send({
        success: false,
        error: 'Selecione um cliente para perguntas de estratégia, memória ou criação.',
      });
    }

    const copyProvider = body.provider === 'collaborative'
      ? 'openai'
      : mapProviderToCopy(body.provider);
    const resolvedProvider = getFallbackProvider(copyProvider);
    const usageCtx: UsageContext | undefined = tenantId && tenantId !== 'default'
      ? { tenant_id: tenantId, feature: 'jarvis_chat' }
      : undefined;

    try {
      let finalText = '';
      let resultProvider = '';
      let resultModel = '';
      let artifacts: Array<{ type: string; [key: string]: any }> = [];
      let toolsUsed = 0;

      if (decision.route === 'operations') {
        const memoryBlocks = await buildJarvisMemoryBlocks({
          tenantId,
          clientId,
          memories: [
            decision.primaryMemory,
            ...decision.secondaryMemories.filter((memory): memory is any => memory === 'client_memory' || memory === 'operations_memory'),
          ],
          maxBlocks: decision.retrievalBudget.contextBlocks,
        });
        const memoryFabric = formatJarvisMemoryBlocks(memoryBlocks);
        const toolCtx: OperationsToolContext = {
          tenantId,
          userId: userId ?? undefined,
          userEmail,
          role: userRole,
          explicitConfirmation,
        };
        const loopResult = await Promise.race([
          runToolUseLoop({
            messages: [...conversationHistory, { role: 'user', content: userContent }],
            systemPrompt: buildOperationsSystemPrompt(memoryFabric),
            tools: getOperationsToolDefinitions(),
            provider: resolvedProvider,
            toolContext: toolCtx,
            maxIterations: decision.retrievalBudget.toolIterations,
            temperature: 0.5,
            maxTokens: 4096,
            usageContext: usageCtx,
            toolExecutorFn: executeOperationsTool,
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('JARVIS_OPS_TIMEOUT_60s')), 60000)),
        ]);

        finalText = loopResult.finalText;
        resultProvider = loopResult.provider;
        resultModel = loopResult.model;
        toolsUsed = loopResult.toolCallsExecuted ?? 0;
        const loadedMemoryBlocks = memoryBlocks.map((block) => block.label);
        const durationMs = Date.now() - startMs;
        const observability = buildJarvisObservability(decision, {
          durationMs,
          toolsUsed,
          provider: resultProvider,
          model: resultModel,
          loadedMemoryBlocks,
          autonomy: summarizeJarvisToolGovernance(loopResult.toolResults),
        });
        const savedConversationId = await saveUnifiedConversation({
          route: decision.route,
          tenantId,
          edroClientId,
          userId,
          conversationId: effectiveConversationId,
          message: body.message,
          assistantContent: finalText,
          provider: resultProvider || body.provider,
          observability,
          artifacts,
        }).catch(() => effectiveConversationId);

        request.log?.info({
          event: 'jarvis_chat_completed',
          clientId,
          conversationId: savedConversationId,
          attachmentCount: body.inline_attachments?.length ?? 0,
          artifactsCount: artifacts.length,
          ...observability,
        });

        return reply.send({
          success: true,
          data: {
            response: finalText,
            provider: resultProvider,
            model: resultModel,
            conversationId: savedConversationId,
            artifacts,
            intent: decision.intent,
            route: decision.route,
            primaryMemory: decision.primaryMemory,
            secondaryMemories: decision.secondaryMemories,
            retrievalBudget: decision.retrievalBudget,
            durationMs,
            observability,
          },
        });
      } else {
        if (decision.intent === 'creative_execution' && shouldDelegateToCreativeExecutor(body.message, body.page_data ?? undefined)) {
          const creativeResult = await runCreativeExecutionCapability({
            tenantId,
            userId,
            userRole,
            explicitConfirmation,
            message: body.message,
            bodyClientId: clientId,
            pageData: body.page_data ?? undefined,
          });

          if (creativeResult) {
            finalText = creativeResult.response;
            resultProvider = creativeResult.provider;
            resultModel = creativeResult.model;
            artifacts = creativeResult.artifacts;
            toolsUsed = 0;

            const durationMs = Date.now() - startMs;
            const observability = buildJarvisObservability(decision, {
              durationMs,
              toolsUsed,
              provider: resultProvider,
              model: resultModel,
              loadedMemoryBlocks: ['CCO criativo do Studio', 'Direção de arte', 'Memória do cliente'],
            });

            const savedConversationId = await saveUnifiedConversation({
              route: decision.route,
              tenantId,
              edroClientId,
              userId,
              conversationId: effectiveConversationId,
              message: body.message,
              assistantContent: finalText,
              provider: resultProvider || body.provider,
              observability,
              artifacts,
            }).catch(() => effectiveConversationId);

            request.log?.info({
              event: 'jarvis_chat_completed',
              clientId,
              conversationId: savedConversationId,
              attachmentCount: body.inline_attachments?.length ?? 0,
              artifactsCount: artifacts.length,
              ...observability,
            });

            return reply.send({
              success: true,
              data: {
                response: finalText,
                provider: resultProvider,
                model: resultModel,
                conversationId: savedConversationId,
                artifacts,
                intent: decision.intent,
                route: decision.route,
                primaryMemory: decision.primaryMemory,
                secondaryMemories: decision.secondaryMemories,
                retrievalBudget: decision.retrievalBudget,
                durationMs,
                observability,
              },
            });
          }
        }

        const creativeTarget = await resolveCreativeExecutionTarget({
          tenantId,
          bodyClientId: clientId,
          pageData: body.page_data ?? undefined,
        }).catch(() => null);
        const resolvedBriefingId = creativeTarget?.briefingId
          || asUuid(readPageDataString(body.page_data, ['currentBriefingId', 'briefing_id', 'briefingId']));

        const [[clientContext, psychContext, perfContext, livingMemoryPreflight], clientStatePreflight, briefingDiagnosticsPreflight] = await Promise.all([
          Promise.race([
            Promise.all([
              buildClientContext(tenantId, clientId!),
              loadPsychContext(tenantId, clientId!),
              loadPerformanceContext(clientId!),
              buildClientLivingMemory({
                tenantId,
                clientId: clientId!,
                briefing: {
                  title: body.message,
                  objective: body.message,
                  context: [body.context_page, body.studio_context].filter(Boolean).join('\n'),
                  payload: body.page_data ? { page_data: body.page_data } : null,
                },
                daysBack: 60,
                maxDirectives: 8,
                maxEvidence: 5,
                maxActions: 4,
              }).catch(() => emptyLivingMemoryPreflight()),
            ]),
            new Promise<[string, string, string, ReturnType<typeof emptyLivingMemoryPreflight>]>((resolve) => setTimeout(() => resolve([
              '',
              '',
              '',
              emptyLivingMemoryPreflight(),
            ]), 3000)),
          ]),
          Promise.race([
            buildClientState(tenantId, clientId!).catch(() => emptyClientStatePreflight(tenantId, clientId!)),
            new Promise<ReturnType<typeof emptyClientStatePreflight>>((resolve) => setTimeout(() => resolve(
              emptyClientStatePreflight(tenantId, clientId!),
            ), 2500)),
          ]),
          Promise.race([
            (async () => {
              if (!resolvedBriefingId) return emptyBriefingDiagnosticsPreflight();
              const briefing = await getBriefingById(resolvedBriefingId, tenantId);
              if (!briefing) return emptyBriefingDiagnosticsPreflight();
              const payload = (briefing.payload || {}) as Record<string, any>;
              return {
                briefing_id: briefing.id,
                title: briefing.title,
                diagnostics: buildBriefingDiagnostics({
                  briefing: {
                    title: briefing.title,
                    objective: payload.objective ?? payload.objetivo ?? '',
                    context: payload.context ?? payload.notes ?? payload.additional_notes ?? null,
                    platform: payload.platform ?? payload.plataforma ?? null,
                    format: payload.format ?? payload.formato ?? payload.creative_format ?? null,
                    payload,
                  },
                  livingMemory: livingMemoryPreflight,
                  memoryGovernance: await analyzeClientMemoryGovernance({
                    tenantId,
                    clientId: clientId!,
                    daysBack: 365,
                    limit: 80,
                  }).catch(() => null),
                }),
              };
            })().catch(() => emptyBriefingDiagnosticsPreflight()),
            new Promise<ReturnType<typeof emptyBriefingDiagnosticsPreflight>>((resolve) => setTimeout(() => resolve(
              emptyBriefingDiagnosticsPreflight(),
            ), 2500)),
          ]),
        ]);
        const memoryGovernancePreflight = clientId
          ? await analyzeClientMemoryGovernance({
              tenantId,
              clientId,
              daysBack: 365,
              limit: 80,
            }).catch(() => emptyMemoryGovernancePreflight())
          : emptyMemoryGovernancePreflight();

        const toolCtx: ToolContext = {
          tenantId,
          clientId: clientId!,
          edroClientId,
          userId: userId ?? undefined,
          userEmail,
          role: userRole,
          explicitConfirmation,
          pageData: body.page_data ?? undefined,
        };
        const memoryBlocks = await buildJarvisMemoryBlocks({
          tenantId,
          clientId,
          memories: decision.secondaryMemories.filter((memory): memory is any =>
            memory === 'operations_memory'
            || memory === 'canon_edro'
            || memory === 'reference_memory'
            || memory === 'trend_memory'
          ),
          maxBlocks: decision.retrievalBudget.contextBlocks,
        });
        const memoryFabric = formatJarvisMemoryBlocks(memoryBlocks);
        const livingMemoryPreflightContext = livingMemoryPreflight.block
          ? `\n\nMEMÓRIA VIVA PREFLIGHT PARA ESTA PERGUNTA:\n${livingMemoryPreflight.block}\nINSTRUÇÃO: trate este preflight como contexto mais atual e prioritário do cliente antes de responder, recomendar ou criar.`
          : '';
        const briefingDiagnosticsPreflightContext = buildBriefingDiagnosticsPreflightContext(briefingDiagnosticsPreflight);
        const memoryGovernancePreflightContext = buildMemoryGovernancePreflightContext(memoryGovernancePreflight);
        const clientStatePreflightContext = `\n\n${buildClientStatePreflightContext(clientStatePreflight)}\nINSTRUÇÃO: trate este snapshot como retrato atual do cliente e use-o para calibrar prioridade, risco, oportunidade e timing da resposta.`;
        const planningSystemPrompt = `${buildAgentSystemPrompt(clientContext, psychContext, perfContext, memoryFabric)}${clientStatePreflightContext}${livingMemoryPreflightContext}${memoryGovernancePreflightContext ? `\n\n${memoryGovernancePreflightContext}` : ''}${briefingDiagnosticsPreflightContext ? `\n\n${briefingDiagnosticsPreflightContext}` : ''}`;
        const loopResult = await Promise.race([
          runToolUseLoop({
            messages: [...conversationHistory, { role: 'user', content: userContent }],
            systemPrompt: planningSystemPrompt,
            tools: getAllToolDefinitions(),
            provider: resolvedProvider,
            toolContext: {
              ...toolCtx,
              conversationId: effectiveConversationId,
              conversationRoute: decision.route,
            },
            maxIterations: decision.retrievalBudget.toolIterations,
            temperature: 0.7,
            maxTokens: 4096,
            usageContext: usageCtx,
          }),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('JARVIS_PLAN_TIMEOUT_60s')), 60000)),
        ]);

        finalText = loopResult.finalText;
        resultProvider = loopResult.provider;
        resultModel = loopResult.model;
        toolsUsed = loopResult.toolCallsExecuted ?? 0;
        artifacts = (loopResult.toolResults ?? [])
          .filter((result) => result.success && result.data)
          .map((result) => ({ type: result.toolName, ...result.data }));
        if (
          memoryGovernancePreflight.summary.governance_pressure !== 'low'
          || memoryGovernancePreflight.summary.active_conflicts
          || memoryGovernancePreflight.summary.stale_facts
        ) {
          artifacts.unshift({
            type: 'memory_governance_preflight',
            memory_governance: memoryGovernancePreflight,
          });
        }
        if (
          livingMemoryPreflight.snapshot.active_directives
          || livingMemoryPreflight.snapshot.evidence_signals
          || livingMemoryPreflight.snapshot.pending_commitments
        ) {
          artifacts.unshift({
            type: 'living_memory_preflight',
            summary: livingMemoryPreflight.snapshot,
            directives: livingMemoryPreflight.directives,
            evidence: livingMemoryPreflight.evidence,
            pending_actions: livingMemoryPreflight.pendingActions,
          });
        }
        if (
          briefingDiagnosticsPreflight.diagnostics.gaps.length
          || briefingDiagnosticsPreflight.diagnostics.tensions.length
          || briefingDiagnosticsPreflight.diagnostics.recommendations.length
          || briefingDiagnosticsPreflight.diagnostics.conflicts.length
        ) {
          artifacts.unshift({
            type: 'briefing_diagnostics_preflight',
            briefing_id: briefingDiagnosticsPreflight.briefing_id,
            title: briefingDiagnosticsPreflight.title,
            diagnostics: briefingDiagnosticsPreflight.diagnostics,
          });
        }
        artifacts.unshift({
          type: 'client_state_preflight',
          open_alerts: clientStatePreflight.open_alerts,
          awareness: clientStatePreflight.awareness,
          living_memory_preview: clientStatePreflight.living_memory_preview,
        });

        const durationMs = Date.now() - startMs;
        const observability = buildJarvisObservability(decision, {
          durationMs,
          toolsUsed,
          provider: resultProvider,
          model: resultModel,
          loadedMemoryBlocks: [
            ...(clientContext.trim() ? ['Memória do cliente'] : []),
            'Estado do cliente preflight',
            ...(livingMemoryPreflight.block ? ['Memória viva preflight'] : []),
            ...((memoryGovernancePreflight.summary.governance_pressure !== 'low' || memoryGovernancePreflight.summary.active_conflicts || memoryGovernancePreflight.summary.stale_facts) ? ['Governança da memória preflight'] : []),
            ...(briefingDiagnosticsPreflight.diagnostics.block ? ['Diagnóstico de briefing preflight'] : []),
            ...((psychContext.trim() || perfContext.trim()) ? ['Performance'] : []),
            ...memoryBlocks.map((block) => block.label),
          ],
          autonomy: summarizeJarvisToolGovernance(loopResult.toolResults),
        });

        const savedConversationId = await saveUnifiedConversation({
          route: decision.route,
          tenantId,
          edroClientId,
          userId,
          conversationId: effectiveConversationId,
          message: body.message,
          assistantContent: finalText,
          provider: resultProvider || body.provider,
          observability,
          artifacts,
        }).catch(() => effectiveConversationId);

        request.log?.info({
          event: 'jarvis_chat_completed',
          clientId,
          conversationId: savedConversationId,
          attachmentCount: body.inline_attachments?.length ?? 0,
          artifactsCount: artifacts.length,
          ...observability,
        });

        return reply.send({
          success: true,
          data: {
            response: finalText,
            provider: resultProvider,
            model: resultModel,
            conversationId: savedConversationId,
            artifacts,
            intent: decision.intent,
            route: decision.route,
            primaryMemory: decision.primaryMemory,
            secondaryMemories: decision.secondaryMemories,
            retrievalBudget: decision.retrievalBudget,
            durationMs,
            observability,
          },
        });
      }
    } catch (err: any) {
      const elapsed = Date.now() - startMs;
      request.log?.error({
        event: 'jarvis_chat_failed',
        clientId,
        intent: decision.intent,
        route: decision.route,
        durationMs: elapsed,
        error: err?.message || 'unknown',
      });
      return reply.status(500).send({
        success: false,
        error: `Falha no Jarvis (${err?.message || 'unknown'}). Tempo: ${elapsed}ms.`,
      });
    }
  });

  // GET /jarvis/alerts — alertas abertos do tenant (opcionalmente filtrado por client_id)
  app.get('/jarvis/background-jobs/:jobId', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { jobId } = request.params as { jobId: string };
    const job = await getJobById(jobId, tenantId);
    if (!job || job.type !== 'jarvis_background') {
      return reply.status(404).send({ success: false, error: 'Job não encontrado.' });
    }
    return reply.send({
      success: true,
      data: {
        id: job.id,
        status: job.status,
        error: job.error_message || null,
        artifact: buildJarvisBackgroundArtifact(job),
      },
    });
  });

  // GET /jarvis/alerts — alertas abertos do tenant (opcionalmente filtrado por client_id)
  app.get('/jarvis/alerts', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { client_id, limit } = request.query as { client_id?: string; limit?: string };
    const alerts = await getJarvisAlerts(tenantId, client_id, Number(limit) || 20);
    return reply.send({ success: true, data: alerts });
  });

  // POST /jarvis/alerts/:id/dismiss
  app.post('/jarvis/alerts/:id/dismiss', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { id } = request.params as { id: string };
    await dismissAlert(id, tenantId);
    return reply.send({ success: true });
  });

  // POST /jarvis/alerts/:id/snooze
  app.post('/jarvis/alerts/:id/snooze', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { id } = request.params as { id: string };
    const { hours = 24 } = request.body as { hours?: number };
    await snoozeAlert(id, tenantId, hours);
    return reply.send({ success: true });
  });

  // GET /jarvis/feed — unified decision queue for JarvisHomeSection
  app.get('/jarvis/feed', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;

    const [alertsRes, briefingPendingRes, autoBriefingsRes, proposalsRes, opportunitiesRes] = await Promise.allSettled([
      // Open Jarvis alerts
      getJarvisAlerts(tenantId, undefined, 10),

      // Jobs in briefing stage without a briefing submitted yet
      query(
        `SELECT j.id, j.title, c.name AS client_name
         FROM jobs j
         LEFT JOIN clients c ON c.id = j.client_id
         WHERE j.tenant_id = $1
           AND j.status IN ('intake','briefing')
           AND NOT EXISTS (SELECT 1 FROM job_briefings jb WHERE jb.job_id = j.id)
         ORDER BY j.created_at ASC LIMIT 5`,
        [tenantId],
      ),

      // Auto-generated briefings awaiting approval (fatigue alerts + auto-briefings)
      query(
        `SELECT b.id, b.title, b.drop_pct, c.name AS client_name
         FROM edro_briefings b
         LEFT JOIN clients c ON c.id = b.client_id
         WHERE b.tenant_id = $1
           AND b.status = 'draft'
           AND b.auto_generated = true
         ORDER BY b.created_at DESC LIMIT 5`,
        [tenantId],
      ),

      // Meeting proposals (Jarvis proposals from meeting summaries)
      query(
        `SELECT jp.id, jp.title, jp.meeting_title, c.name AS client_name
         FROM jarvis_proposals jp
         LEFT JOIN clients c ON c.id = jp.client_id
         WHERE jp.tenant_id = $1
           AND jp.status = 'pending'
         ORDER BY jp.created_at DESC LIMIT 5`,
        [tenantId],
      ),

      // High-confidence opportunities without a briefing yet
      query(
        `SELECT o.id, o.title, o.confidence, c.name AS client_name, o.client_id
         FROM opportunities o
         LEFT JOIN clients c ON c.id = o.client_id
         WHERE o.tenant_id = $1
           AND o.confidence >= 75
           AND o.status = 'open'
         ORDER BY o.confidence DESC LIMIT 5`,
        [tenantId],
      ),
    ]);

    const alerts           = alertsRes.status === 'fulfilled' ? alertsRes.value : [];
    const briefingPending  = briefingPendingRes.status === 'fulfilled' ? briefingPendingRes.value.rows : [];
    const autoBriefings    = autoBriefingsRes.status === 'fulfilled' ? autoBriefingsRes.value.rows : [];
    const proposals        = proposalsRes.status === 'fulfilled' ? proposalsRes.value.rows : [];
    const opportunities    = opportunitiesRes.status === 'fulfilled' ? opportunitiesRes.value.rows : [];

    const total_actions = alerts.length + briefingPending.length + autoBriefings.length + proposals.length + opportunities.length;

    return reply.send({
      alerts,
      briefing_pending: briefingPending,
      auto_briefings: autoBriefings,
      proposals,
      opportunities,
      total_actions,
    });
  });

  // POST /jarvis/alerts/run — trigger manual (admin)
  app.post('/jarvis/alerts/run', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    try {
      const { runJarvisAlertEngine } = await import('../services/jarvisAlertEngine') as any;
      const saved = await runJarvisAlertEngine(tenantId);
      return reply.send({ success: true, saved });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── GET /jarvis/decisions — classified decisions from Decision Engine ──────
  // Returns top-N JarvisDecisions sorted by weight desc, ready for Jarvis panel UI.
  app.get('/jarvis/decisions', { preHandler: [authGuard] }, async (request: any, reply) => {
    const tenantId = request.user?.tenant_id as string;
    const { limit = '20' } = request.query as { limit?: string };
    try {
      const { processAlerts } = await import('../services/jarvisDecisionEngine') as any;
      const decisions = await processAlerts(tenantId, Math.min(parseInt(limit) || 20, 100));
      return reply.send({ success: true, decisions, total: decisions.length });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message, decisions: [] });
    }
  });

  // ── GET /jarvis/client-state/:clientId — full awareness snapshot for a client ──
  app.get('/jarvis/client-state/:clientId', { preHandler: [authGuard] }, async (request: any, reply) => {
    const { clientId } = request.params as { clientId: string };
    const tenantId = request.user?.tenant_id as string;
    try {
      const { buildClientState } = await import('../services/jarvisDecisionEngine') as any;
      const state = await buildClientState(tenantId, clientId);
      return reply.send({ success: true, state });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── POST /jarvis/creation/run — trigger Jarvis creation loop manually (admin) ──
  app.post('/jarvis/creation/run', { preHandler: [authGuard] }, async (request: any, reply) => {
    try {
      const { triggerJarvisCreationNow } = await import('../jobs/jarvisCreationWorker') as any;
      await triggerJarvisCreationNow();
      return reply.send({ success: true });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });
}
