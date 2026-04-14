import crypto from 'crypto';
import { query } from '../db';
import type { LoopMessage } from './ai/toolUseLoop';

export type JarvisIntent =
  | 'operations_control'
  | 'creative_execution'
  | 'client_memory'
  | 'strategy_planning';

export type JarvisPrimaryMemory =
  | 'operations_memory'
  | 'client_memory';

export type JarvisRoutingDecision = {
  intent: JarvisIntent;
  route: 'operations' | 'planning';
  primaryMemory: JarvisPrimaryMemory;
  secondaryMemories: string[];
  retrievalBudget: {
    historyMessages: number;
    toolIterations: number;
    contextBlocks: number;
  };
};

export type JarvisAutonomyLevel =
  | 'auto'
  | 'review'
  | 'confirm';

export type JarvisToolGovernance = {
  toolName: string;
  level: JarvisAutonomyLevel;
  category: 'read' | 'write' | 'external' | 'destructive' | 'publishing' | 'operations';
  reason: string;
  policy?: {
    channel: 'read' | 'internal_write' | 'external_communication' | 'meeting' | 'publishing' | 'system';
    quietHoursActive: boolean;
    weekendActive: boolean;
    overrideQuietHours: boolean;
    overrideRiskGuard: boolean;
    riskBand: 'low' | 'medium' | 'high';
    riskTolerance: 'low' | 'medium' | 'high' | null;
    policyFlags: string[];
    blockedReason: 'quiet_hours' | 'weekend' | 'client_risk' | null;
    nextAllowedAt: string | null;
  };
  confirmed: boolean;
  executed: boolean;
};

export type JarvisAutonomySummary = {
  highestLevel: JarvisAutonomyLevel;
  requiresConfirmation: boolean;
  executedWithConfirmation: boolean;
  tools: JarvisToolGovernance[];
};

export type JarvisObservability = {
  intent: JarvisIntent;
  route: 'operations' | 'planning';
  primaryMemory: JarvisPrimaryMemory;
  secondaryMemories: string[];
  sourceLabels: {
    primary: string;
    secondary: string[];
  };
  retrievalBudget: {
    historyMessages: number;
    toolIterations: number;
    contextBlocks: number;
  };
  durationMs?: number;
  toolsUsed?: number;
  provider?: string;
  model?: string;
  loadedMemoryBlocks?: string[];
  autonomy?: JarvisAutonomySummary;
};

type ToolPolicyDraft = Omit<JarvisToolGovernance, 'confirmed' | 'executed'>;
type GovernanceContext = {
  tenantId?: string;
  edroClientId?: string | null;
};

const CONFIRMATION_PHRASES = [
  'sim',
  'confirma',
  'confirmo',
  'pode',
  'aplica',
  'executa',
  'manda',
  'publica',
  'agenda',
  'prossegue',
];

function toolPolicyDraft(toolName: string, args?: Record<string, any> | null): ToolPolicyDraft {
  const normalizedStatus = String(args?.status || args?.to_status || '').toLowerCase();

  switch (toolName) {
    case 'delete_briefing':
    case 'archive_briefing':
    case 'archive_clipping_item':
    case 'apply_client_memory_governance':
    case 'reject_pauta':
      return {
        toolName,
        level: 'confirm',
        category: 'destructive',
        reason: 'Arquiva, substitui ou rejeita algo persistido e exige confirmação explícita.',
      };
    case 'publish_studio_post':
    case 'send_whatsapp_message':
    case 'send_email':
    case 'execute_multi_step_workflow':
    case 'run_system_repair':
    case 'schedule_meeting':
    case 'reschedule_meeting':
      return {
        toolName,
        level: 'confirm',
        category: toolName === 'publish_studio_post'
          ? 'publishing'
          : toolName === 'run_system_repair'
            ? 'operations'
          : ['schedule_meeting', 'reschedule_meeting'].includes(toolName)
            ? 'operations'
            : 'external',
        reason: toolName === 'publish_studio_post'
          ? 'Publica em canal real e precisa confirmação explícita.'
          : toolName === 'run_system_repair'
            ? 'Reexecuta rotinas operacionais do sistema e exige confirmação explícita.'
          : ['schedule_meeting', 'reschedule_meeting'].includes(toolName)
            ? 'Move agenda real do cliente e exige confirmação explícita.'
          : 'Dispara comunicação ou lote de ações reais e exige confirmação explícita.',
      };
    case 'cancel_meeting':
      return {
        toolName,
        level: 'confirm',
        category: 'destructive',
        reason: 'Cancela uma reunião real e exige confirmação explícita.',
      };
    case 'schedule_post_publication':
    case 'prepare_post_approval':
      return {
        toolName,
        level: 'confirm',
        category: toolName === 'schedule_post_publication' ? 'publishing' : 'external',
        reason: 'Dispara etapa externa do workflow e exige confirmação explícita.',
      };
    case 'apply_job_allocation_recommendation':
    case 'apply_creative_redistribution':
    case 'assign_job_owner':
    case 'manage_job_allocation':
      return {
        toolName,
        level: 'confirm',
        category: 'operations',
        reason: 'Move responsabilidade ou capacidade operacional e exige confirmação.',
      };
    case 'change_job_status':
      if (['cancelled', 'archived'].includes(normalizedStatus)) {
        return {
          toolName,
          level: 'confirm',
          category: 'destructive',
          reason: 'Muda o ciclo de vida do job para estado destrutivo.',
        };
      }
      return {
        toolName,
        level: 'review',
        category: 'operations',
        reason: 'Altera estado operacional; permitido, mas precisa rastreio.',
      };
    case 'update_briefing_status':
      if (normalizedStatus === 'cancelled') {
        return {
          toolName,
          level: 'confirm',
          category: 'destructive',
          reason: 'Cancela um briefing existente.',
        };
      }
      return {
        toolName,
        level: 'review',
        category: 'write',
        reason: 'Altera estado de briefing no sistema.',
      };
    case 'create_post_pipeline':
    case 'create_operations_job':
    case 'update_operations_job':
    case 'create_briefing':
    case 'create_campaign':
    case 'add_calendar_event':
    case 'add_library_note':
    case 'add_library_url':
    case 'create_trello_card':
    case 'create_briefing_from_clipping':
    case 'approve_job_briefing':
    case 'approve_creative_draft':
    case 'fill_job_briefing':
    case 'submit_job_briefing':
    case 'pin_clipping_item':
    case 'action_opportunity':
    case 'add_clipping_source':
    case 'pause_clipping_source':
    case 'resume_clipping_source':
    case 'resolve_operations_signal':
    case 'snooze_operations_signal':
    case 'regenerate_creative_draft':
      return {
        toolName,
        level: 'review',
        category: 'write',
        reason: 'Escreve no sistema, mas faz parte do fluxo normal do Jarvis.',
      };
    default:
      return {
        toolName,
        level: 'auto',
        category: 'read',
        reason: 'Consulta ou ação segura no contexto atual.',
      };
  }
}

function levelWeight(level: JarvisAutonomyLevel) {
  switch (level) {
    case 'confirm': return 3;
    case 'review': return 2;
    default: return 1;
  }
}

function getSaoPauloDateParts() {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    hour12: false,
    weekday: 'short',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/Sao_Paulo',
  }).formatToParts(new Date());

  const record = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const hour = Number(record.hour);
  const weekdayRaw = String(record.weekday || '').toLowerCase();
  const weekday = weekdayRaw.startsWith('sun')
    ? 0
    : weekdayRaw.startsWith('mon')
      ? 1
      : weekdayRaw.startsWith('tue')
        ? 2
        : weekdayRaw.startsWith('wed')
          ? 3
          : weekdayRaw.startsWith('thu')
            ? 4
            : weekdayRaw.startsWith('fri')
              ? 5
              : 6;

  return {
    hour: Number.isFinite(hour) ? hour : 12,
    year: Number(record.year),
    month: Number(record.month),
    day: Number(record.day),
    weekday,
  };
}

function nextOperationalWindowIso() {
  const now = new Date();
  const parts = getSaoPauloDateParts();
  const candidate = new Date(now);

  const setNextBusinessMorning = (daysToAdd: number) => {
    candidate.setUTCDate(candidate.getUTCDate() + daysToAdd);
    candidate.setUTCHours(10, 0, 0, 0); // 07:00 America/Sao_Paulo ~= 10:00 UTC without DST
  };

  if (parts.weekday === 6) {
    setNextBusinessMorning(2);
  } else if (parts.weekday === 0) {
    setNextBusinessMorning(1);
  } else if (parts.hour < 7) {
    candidate.setUTCHours(10, 0, 0, 0);
  } else if (parts.hour >= 20) {
    if (parts.weekday === 5) setNextBusinessMorning(3);
    else setNextBusinessMorning(1);
  } else {
    return null;
  }

  return candidate.toISOString();
}

async function resolveClientRiskTolerance(
  args?: Record<string, any> | null,
  context?: GovernanceContext,
): Promise<'low' | 'medium' | 'high' | null> {
  const explicitClientId = String(args?.client_id || context?.edroClientId || '').trim();
  if (!explicitClientId || !context?.tenantId) return null;

  const { rows } = await query<{ risk_tolerance: string | null }>(
    `SELECT NULLIF(COALESCE(profile->>'risk_tolerance', 'medium'), '') AS risk_tolerance
       FROM clients
      WHERE id = $1
        AND tenant_id = $2
      LIMIT 1`,
    [explicitClientId, context.tenantId],
  ).catch(() => ({ rows: [] as Array<{ risk_tolerance: string | null }> }));

  const value = String(rows[0]?.risk_tolerance || '').toLowerCase();
  if (value === 'low' || value === 'medium' || value === 'high') return value;
  return null;
}

async function buildToolPolicyMeta(toolName: string, args?: Record<string, any> | null, context?: GovernanceContext) {
  const dateParts = getSaoPauloDateParts();
  const quietHoursActive = dateParts.hour < 7 || dateParts.hour >= 20;
  const weekendActive = dateParts.weekday === 0 || dateParts.weekday === 6;
  const overrideQuietHours = args?.override_quiet_hours === true;
  const overrideRiskGuard = args?.override_risk_guard === true;

  const channel: JarvisToolGovernance['policy']['channel'] = (() => {
    if (['send_whatsapp_message', 'send_email'].includes(toolName)) return 'external_communication' as const;
    if (['schedule_meeting', 'reschedule_meeting', 'cancel_meeting'].includes(toolName)) return 'meeting' as const;
    if (['publish_studio_post', 'schedule_post_publication'].includes(toolName)) return 'publishing' as const;
    if (toolName === 'run_system_repair') return 'system' as const;
    const draft = toolPolicyDraft(toolName, args);
    return draft.category === 'read' ? 'read' : 'internal_write';
  })();

  const riskBand = (() => {
    if (['external_communication', 'meeting', 'publishing'].includes(channel)) return 'high' as const;
    if (channel === 'system' || channel === 'internal_write') return 'medium' as const;
    return 'low' as const;
  })();

  const riskTolerance = await resolveClientRiskTolerance(args, context);
  const policyFlags: string[] = [];
  if (quietHoursActive) policyFlags.push('quiet_hours');
  if (weekendActive) policyFlags.push('weekend');
  if (riskTolerance === 'low') policyFlags.push('client_low_risk_tolerance');
  if (riskTolerance === 'medium') policyFlags.push('client_medium_risk_tolerance');

  const blockedReason = (() => {
    if (weekendActive) return 'weekend' as const;
    if (quietHoursActive) return 'quiet_hours' as const;
    if (
      riskTolerance === 'low'
      && ['external_communication', 'publishing'].includes(channel)
      && !overrideRiskGuard
    ) {
      return 'client_risk' as const;
    }
    return null;
  })();

  return {
    channel,
    quietHoursActive,
    weekendActive,
    overrideQuietHours,
    overrideRiskGuard,
    riskBand,
    riskTolerance,
    policyFlags,
    blockedReason,
    nextAllowedAt: blockedReason ? nextOperationalWindowIso() : null,
  };
}

export async function buildJarvisToolGovernance(
  toolName: string,
  args?: Record<string, any> | null,
  context?: GovernanceContext,
): Promise<JarvisToolGovernance> {
  const draft = toolPolicyDraft(toolName, args);
  const confirmed = args?.confirmed === true;
  const policy = await buildToolPolicyMeta(toolName, args, context);
  return {
    ...draft,
    policy,
    confirmed,
    executed: draft.level !== 'confirm' || confirmed,
  };
}

export async function enforceJarvisToolGovernance(
  toolName: string,
  args?: Record<string, any> | null,
  context?: GovernanceContext,
) {
  const policy = await buildJarvisToolGovernance(toolName, args, context);
  if (
    (policy.policy?.quietHoursActive || policy.policy?.weekendActive)
    && policy.policy?.overrideQuietHours !== true
    && ['external_communication', 'meeting', 'publishing'].includes(policy.policy.channel)
  ) {
    const reason = policy.policy?.blockedReason === 'weekend'
      ? 'fora da janela operacional de fim de semana'
      : 'em quiet hours';
    const nextAllowed = policy.policy?.nextAllowedAt
      ? ` Próxima janela: ${policy.policy.nextAllowedAt}.`
      : '';
    return {
      policy: { ...policy, executed: false },
      error: `Política do Jarvis: ${toolName} está bloqueado ${reason}.${nextAllowed} Confirme com override_quiet_hours=true para seguir fora do horário operacional.`,
    };
  }
  if (policy.policy?.blockedReason === 'client_risk') {
    return {
      policy: { ...policy, executed: false },
      error: `Política do Jarvis: ${toolName} está bloqueado para cliente com tolerância a risco baixa. Confirme com override_risk_guard=true para seguir com ação externa/publicação.`,
    };
  }
  if (policy.level === 'confirm' && !policy.confirmed) {
    return {
      policy: { ...policy, executed: false },
      error: `Confirmação obrigatória para ${toolName}. ${policy.reason}`,
    };
  }
  return { policy };
}

export function summarizeJarvisToolGovernance(
  toolResults?: Array<{ toolName: string; success: boolean; metadata?: any }> | null,
): JarvisAutonomySummary | undefined {
  if (!Array.isArray(toolResults) || !toolResults.length) return undefined;

  const tools = toolResults
    .map((result) => result?.metadata?.governance as JarvisToolGovernance | undefined)
    .filter((item): item is JarvisToolGovernance => Boolean(item));

  if (!tools.length) return undefined;

  const highestLevel = tools
    .map((tool) => tool.level)
    .sort((a, b) => levelWeight(b) - levelWeight(a))[0] || 'auto';

  return {
    highestLevel,
    requiresConfirmation: tools.some((tool) => tool.level === 'confirm'),
    executedWithConfirmation: tools.some((tool) => tool.level === 'confirm' && tool.executed && tool.confirmed),
    tools,
  };
}

export function detectExplicitConfirmation(message?: string | null) {
  const haystack = String(message || '').toLowerCase();
  return CONFIRMATION_PHRASES.some((token) => haystack.includes(token));
}

export function detectJarvisIntent(message: string, contextPage?: string | null, pageData?: Record<string, unknown> | null): JarvisIntent {
  const pageDataText = pageData ? JSON.stringify(pageData).toLowerCase() : '';
  const haystack = `${contextPage || ''}\n${pageDataText}\n${message}`.toLowerCase();
  const operationsSignals = [
    'job', 'jobs', 'prazo', 'atras', 'fila', 'kanban', 'trello', 'card', 'cards', 'aloc',
    'responsavel', 'responsável', 'equipe', 'capacidade', 'sla', 'risco', 'riscos',
    'bloque', 'deadline', 'entrega', 'redistribu', 'sobrecarreg', 'operação', 'operacao',
    'sinais', 'sinal',
  ];
  const clientMemorySignals = [
    'reunião', 'reuniao', 'meeting', 'whatsapp', 'cliente falou', 'cliente disse', 'aprovação',
    'aprovacao', 'feedback', 'insight', 'memória', 'memoria', 'diretiva', 'diretriz',
    'restrição', 'restricao', 'promessa', 'compromisso',
  ];
  const creativeSignals = [
    'cria um post', 'criar um post', 'gera um post', 'briefing', 'copy', 'campanha',
    'pauta', 'conteúdo', 'conteudo', 'criativo', 'headline', 'cta', 'roteiro',
    'conceito', 'arte', 'visual brief', 'direção criativa', 'direcao criativa',
  ];

  if (
    haystack.includes('/studio')
    || haystack.includes('creative_session_id')
    || creativeSignals.some((signal) => haystack.includes(signal))
  ) {
    return 'creative_execution';
  }

  // page_data with ops_card forces ops route regardless of message content
  const hasOpsCardContext = Boolean(
    pageData && (
      typeof pageData['ops_card_id'] === 'string'
      || (typeof pageData['ops_card'] === 'object' && pageData['ops_card'] !== null)
    ),
  );

  if (
    hasOpsCardContext
    || haystack.includes('/admin/operacoes')
    || haystack.includes('/operations')
    || operationsSignals.some((signal) => haystack.includes(signal))
  ) {
    return 'operations_control';
  }
  if (clientMemorySignals.some((signal) => haystack.includes(signal))) {
    return 'client_memory';
  }
  return 'strategy_planning';
}

export function buildJarvisRoutingDecision(intent: JarvisIntent): JarvisRoutingDecision {
  switch (intent) {
    case 'operations_control':
      return {
        intent,
        route: 'operations',
        primaryMemory: 'operations_memory',
        secondaryMemories: ['client_memory'],
        retrievalBudget: { historyMessages: 20, toolIterations: 8, contextBlocks: 3 },
      };
    case 'client_memory':
      return {
        intent,
        route: 'planning',
        primaryMemory: 'client_memory',
        secondaryMemories: ['operations_memory'],
        retrievalBudget: { historyMessages: 20, toolIterations: 8, contextBlocks: 3 },
      };
    case 'creative_execution':
      return {
        intent,
        route: 'planning',
        primaryMemory: 'client_memory',
        secondaryMemories: ['canon_edro', 'reference_memory', 'performance_memory'],
        retrievalBudget: { historyMessages: 20, toolIterations: 8, contextBlocks: 4 },
      };
    case 'strategy_planning':
    default:
      return {
        intent,
        route: 'planning',
        primaryMemory: 'client_memory',
        secondaryMemories: ['performance_memory', 'operations_memory'],
        retrievalBudget: { historyMessages: 20, toolIterations: 8, contextBlocks: 3 },
      };
  }
}

export function describeJarvisMemory(memory: JarvisPrimaryMemory | string): string {
  switch (memory) {
    case 'operations_memory':
      return 'Operacoes';
    case 'client_memory':
      return 'Memoria do cliente';
    case 'canon_edro':
      return 'Canon Edro';
    case 'reference_memory':
      return 'Repertorio visual';
    case 'trend_memory':
      return 'Trend radar';
    case 'performance_memory':
      return 'Performance';
    default:
      return memory;
  }
}

export function describeJarvisIntent(intent: JarvisIntent): string {
  switch (intent) {
    case 'operations_control':
      return 'Controle operacional';
    case 'creative_execution':
      return 'Execucao criativa';
    case 'client_memory':
      return 'Memoria do cliente';
    case 'strategy_planning':
    default:
      return 'Planejamento';
  }
}

export function buildJarvisObservability(
  decision: JarvisRoutingDecision,
  extras: Partial<Pick<JarvisObservability, 'durationMs' | 'toolsUsed' | 'provider' | 'model' | 'loadedMemoryBlocks' | 'autonomy'>> = {},
): JarvisObservability {
  return {
    intent: decision.intent,
    route: decision.route,
    primaryMemory: decision.primaryMemory,
    secondaryMemories: decision.secondaryMemories,
    sourceLabels: {
      primary: describeJarvisMemory(decision.primaryMemory),
      secondary: decision.secondaryMemories.map(describeJarvisMemory),
    },
    retrievalBudget: decision.retrievalBudget,
    durationMs: extras.durationMs,
    toolsUsed: extras.toolsUsed,
    provider: extras.provider,
    model: extras.model,
    loadedMemoryBlocks: extras.loadedMemoryBlocks,
    autonomy: extras.autonomy,
  };
}

export function buildInlineAttachmentContext(inlineAttachments?: Array<{ name?: string; text?: string }>): string {
  if (!inlineAttachments?.length) return '';
  const inlineParts = inlineAttachments
    .filter((attachment): attachment is { name: string; text: string } => Boolean(attachment?.name && attachment?.text))
    .map((attachment) => {
      const preview = attachment.text.length > 4000
        ? `${attachment.text.slice(0, 4000)}...(truncado)`
        : attachment.text;
      return `[Arquivo: ${attachment.name}]\n${preview}`;
    });
  if (!inlineParts.length) return '';
  return '\n\nDOCUMENTOS ANEXADOS PELO USUARIO:\n' + inlineParts.join('\n\n');
}

function buildArtifactHistorySummary(artifacts?: Array<Record<string, any>> | null): string {
  if (!Array.isArray(artifacts) || !artifacts.length) return '';

  const lines = artifacts.slice(0, 4).map((artifact, index) => {
    const pairs = [
      ['type', artifact.type],
      ['background_job_id', artifact.background_job_id],
      ['briefing_id', artifact.briefing_id],
      ['job_id', artifact.job_id],
      ['creative_session_id', artifact.creative_session_id],
      ['copy_id', artifact.copy_id],
      ['channel', artifact.channel],
      ['scheduled_for', artifact.scheduled_for],
      ['job_status', artifact.job_status],
      ['approvalUrl', artifact.approvalUrl],
      ['studio_url', artifact.studio_url],
      ['post_url', artifact.post_url],
      ['post_id', artifact.post_id],
    ]
      .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '')
      .map(([label, value]) => `${label}=${String(value).trim()}`);

    return `ARTEFATO ${index + 1}: ${pairs.join(' | ')}`;
  });

  return lines.length ? `\n\nCONTEXTO DE WORKFLOW:\n${lines.join('\n')}` : '';
}

export async function loadUnifiedConversationHistory(params: {
  route: 'operations' | 'planning';
  tenantId: string;
  conversationId: string | null | undefined;
  edroClientId: string | null;
}): Promise<LoopMessage[]> {
  const { route, tenantId, conversationId, edroClientId } = params;
  if (!conversationId) return [];
  try {
    const result = route === 'operations'
      ? await query(
        `SELECT messages FROM operations_conversations WHERE id = $1 AND tenant_id = $2`,
        [conversationId, tenantId],
      )
      : edroClientId
        ? await query(
          `SELECT messages FROM planning_conversations WHERE id = $1 AND client_id = $2::uuid`,
          [conversationId, edroClientId],
        )
        : { rows: [] as any[] };
    if (!result.rows[0]?.messages) return [];
    return (result.rows[0].messages as any[])
      .filter((message: any) => message.role === 'user' || message.role === 'assistant')
      .slice(-20)
      .map((message: any) => {
        const content = typeof message.content === 'string' ? message.content : JSON.stringify(message.content);
        const artifactSummary = message.role === 'assistant'
          ? buildArtifactHistorySummary(message?.metadata?.artifacts)
          : '';
        return {
          role: message.role,
          content: `${content}${artifactSummary}`,
        };
      });
  } catch {
    return [];
  }
}

export async function saveUnifiedConversation(params: {
  route: 'operations' | 'planning';
  tenantId: string;
  edroClientId: string | null;
  userId: string | null;
  conversationId?: string | null;
  message: string;
  assistantContent: string;
  provider: string;
  observability?: JarvisObservability | null;
  artifacts?: Array<Record<string, any>> | null;
}): Promise<string | null> {
  const { route, tenantId, edroClientId, userId, conversationId, message, assistantContent, provider, observability, artifacts } = params;

  const messagesPayload = [
    { role: 'user', content: message, timestamp: new Date().toISOString() },
    {
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date().toISOString(),
      provider,
      metadata: observability || artifacts?.length ? { observability, artifacts: artifacts || [] } : undefined,
    },
  ];

  if (route === 'operations') {
    const resolvedConversationId = conversationId || crypto.randomUUID();
    await query(
      `INSERT INTO operations_conversations (id, tenant_id, user_id, messages, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, now())
       ON CONFLICT (id) DO UPDATE SET messages = operations_conversations.messages || $4::jsonb, updated_at = now()`,
      [resolvedConversationId, tenantId, userId, JSON.stringify(messagesPayload)],
    );
    return resolvedConversationId;
  }

  if (!edroClientId) return conversationId || null;

  if (conversationId) {
    await query(
      `UPDATE planning_conversations
       SET messages = messages || $1::jsonb, updated_at = now()
       WHERE id = $2 AND client_id = $3::uuid`,
      [JSON.stringify(messagesPayload), conversationId, edroClientId],
    );
    return conversationId;
  }

  const newConversationId = crypto.randomUUID();
  await query(
    `INSERT INTO planning_conversations (id, tenant_id, client_id, user_id, title, provider, messages)
     VALUES ($1, $2, $3::uuid, $4, $5, $6, $7::jsonb)`,
    [newConversationId, tenantId, edroClientId, userId, message.slice(0, 100), provider, JSON.stringify(messagesPayload)],
  );
  return newConversationId;
}

export async function updateUnifiedConversationArtifact(params: {
  route: 'operations' | 'planning';
  tenantId: string;
  conversationId: string;
  backgroundJobId: string;
  edroClientId?: string | null;
  artifact: Record<string, any>;
}): Promise<boolean> {
  const { route, tenantId, conversationId, backgroundJobId, edroClientId, artifact } = params;
  const selectSql = route === 'operations'
    ? `SELECT messages FROM operations_conversations WHERE id = $1 AND tenant_id = $2 LIMIT 1`
    : `SELECT messages FROM planning_conversations WHERE id = $1 AND tenant_id = $2 AND client_id = $3::uuid LIMIT 1`;
  const selectParams = route === 'operations'
    ? [conversationId, tenantId]
    : [conversationId, tenantId, edroClientId];

  const { rows } = await query<{ messages: any[] }>(selectSql, selectParams);
  if (!rows[0]?.messages || !Array.isArray(rows[0].messages)) return false;

  let changed = false;
  const nextMessages = rows[0].messages.map((message: any) => {
    if (!message?.metadata?.artifacts || !Array.isArray(message.metadata.artifacts)) return message;

    let messageChanged = false;
    const nextArtifacts = message.metadata.artifacts.map((item: any) => {
      if (String(item?.background_job_id || '') !== backgroundJobId) return item;
      messageChanged = true;
      changed = true;
      return {
        ...item,
        ...artifact,
        background_job_id: backgroundJobId,
      };
    });

    if (!messageChanged) return message;
    return {
      ...message,
      metadata: {
        ...message.metadata,
        artifacts: nextArtifacts,
      },
    };
  });

  if (!changed) return false;

  const updateSql = route === 'operations'
    ? `UPDATE operations_conversations SET messages = $1::jsonb, updated_at = now() WHERE id = $2 AND tenant_id = $3`
    : `UPDATE planning_conversations SET messages = $1::jsonb, updated_at = now() WHERE id = $2 AND tenant_id = $3 AND client_id = $4::uuid`;
  const updateParams = route === 'operations'
    ? [JSON.stringify(nextMessages), conversationId, tenantId]
    : [JSON.stringify(nextMessages), conversationId, tenantId, edroClientId];

  await query(updateSql, updateParams);
  return true;
}
