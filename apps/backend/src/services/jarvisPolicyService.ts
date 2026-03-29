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
};

export function detectJarvisIntent(message: string, contextPage?: string | null): JarvisIntent {
  const haystack = `${contextPage || ''}\n${message}`.toLowerCase();
  const operationsSignals = [
    'job', 'jobs', 'prazo', 'atras', 'fila', 'kanban', 'trello', 'card', 'cards', 'aloc',
    'responsavel', 'responsável', 'equipe', 'capacidade', 'sla', 'risco', 'riscos',
    'bloque', 'deadline', 'entrega', 'redistribu', 'sobrecarreg', 'operação', 'operacao',
    'sinais', 'sinal',
  ];
  const clientMemorySignals = [
    'reunião', 'reuniao', 'meeting', 'whatsapp', 'cliente falou', 'cliente disse', 'aprovação',
    'aprovacao', 'feedback', 'insight', 'memória', 'memoria',
  ];
  const creativeSignals = [
    'cria um post', 'criar um post', 'gera um post', 'briefing', 'copy', 'campanha',
    'pauta', 'conteúdo', 'conteudo', 'criativo', 'headline', 'cta',
  ];

  if (
    haystack.includes('/admin/operacoes')
    || haystack.includes('/operations')
    || operationsSignals.some((signal) => haystack.includes(signal))
  ) {
    return 'operations_control';
  }
  if (clientMemorySignals.some((signal) => haystack.includes(signal))) {
    return 'client_memory';
  }
  if (creativeSignals.some((signal) => haystack.includes(signal))) {
    return 'creative_execution';
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
        retrievalBudget: { historyMessages: 20, toolIterations: 5, contextBlocks: 2 },
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
  extras: Partial<Pick<JarvisObservability, 'durationMs' | 'toolsUsed' | 'provider' | 'model' | 'loadedMemoryBlocks'>> = {},
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
