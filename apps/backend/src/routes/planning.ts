import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { query } from '../db';
import { generateWithProvider, CopyProvider, getAvailableProvidersInfo, runCollaborativePipeline, UsageContext } from '../services/ai/copyOrchestrator';
import { generateCopy, generateCollaborativeCopy } from '../services/ai/copyService';
import { getClientById } from '../repos/clientsRepo';
import {
  createBriefing,
  createBriefingStages,
  createCopyVersion,
  ensureBriefingStages,
  getBriefingById,
  listBriefings,
  updateBriefingStageStatus,
} from '../repositories/edroBriefingRepository';
import { buildContextPack } from '../library/contextPack';
import { detectRepetition } from '../services/antiRepetitionEngine';
import { detectOpportunitiesForClient } from '../jobs/opportunityDetector';

type ConversationMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  provider?: string;
};

type Conversation = {
  id: string;
  tenant_id: string;
  client_id: string;
  user_id?: string;
  title?: string;
  provider: string;
  messages: ConversationMessage[];
  context_summary?: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const chatSchema = z.object({
  message: z.string().min(1),
  provider: z.enum(['openai', 'anthropic', 'google', 'collaborative']).optional().default('openai'),
  conversationId: z.string().uuid().optional(),
  mode: z.enum(['chat', 'command']).optional().default('chat'),
});

const createConversationSchema = z.object({
  title: z.string().optional(),
  provider: z.enum(['openai', 'anthropic', 'google', 'collaborative']).optional().default('openai'),
});

function mapProviderToCopy(provider: string): CopyProvider {
  switch (provider) {
    case 'anthropic': return 'claude';
    case 'google': return 'gemini';
    case 'openai':
    default: return 'openai';
  }
}

function safeJsonParse(text: string): Record<string, any> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildCommandPrompt(clientContext: string): string {
  return `Você é um assistente operacional do planejamento EDRO.
Sua tarefa é identificar comandos do usuário e retornar APENAS JSON válido.

Schema:
{
  "action": "create_briefing" | "generate_copy" | "none",
  "reason": "string",
  "briefing": {
    "title": "string",
    "objective": "string",
    "platform": "string",
    "format": "string",
    "deadline": "YYYY-MM-DD",
    "notes": "string",
    "channels": ["string"]
  },
  "copy": {
    "briefing_id": "uuid",
    "briefing_title": "string",
    "count": 3,
    "instructions": "string",
    "language": "pt"
  }
}

Regras:
- Se o pedido for criar briefing, use action=create_briefing.
- Se for gerar copy, use action=generate_copy.
- Se não houver comando claro, action=none.
- Se não souber briefing_id, use briefing_title (ou "latest").
- Não invente dados. Use null ou omita campos incertos.

CLIENT CONTEXT:
${clientContext || 'No client context available.'}`;
}

function normalizeCommandPayload(raw: Record<string, any> | null) {
  const action =
    raw?.action === 'create_briefing' || raw?.action === 'generate_copy' ? raw.action : 'none';
  const briefing = raw?.briefing && typeof raw.briefing === 'object' ? raw.briefing : {};
  const copy = raw?.copy && typeof raw.copy === 'object' ? raw.copy : {};
  return {
    action,
    reason: typeof raw?.reason === 'string' ? raw.reason : '',
    briefing: {
      title: typeof briefing.title === 'string' ? briefing.title : undefined,
      objective: typeof briefing.objective === 'string' ? briefing.objective : undefined,
      platform: typeof briefing.platform === 'string' ? briefing.platform : undefined,
      format: typeof briefing.format === 'string' ? briefing.format : undefined,
      deadline: typeof briefing.deadline === 'string' ? briefing.deadline : undefined,
      notes: typeof briefing.notes === 'string' ? briefing.notes : undefined,
      channels: Array.isArray(briefing.channels) ? briefing.channels.filter(Boolean) : undefined,
    },
    copy: {
      briefing_id: typeof copy.briefing_id === 'string' ? copy.briefing_id : undefined,
      briefing_title: typeof copy.briefing_title === 'string' ? copy.briefing_title : undefined,
      count: Number.isFinite(copy.count) ? Math.max(1, Number(copy.count)) : 3,
      instructions: typeof copy.instructions === 'string' ? copy.instructions : undefined,
      language: typeof copy.language === 'string' ? copy.language : 'pt',
    },
  };
}

async function resolveBriefingFromCommand(params: {
  clientId: string;
  briefingId?: string;
  briefingTitle?: string;
}) {
  if (params.briefingId) {
    const direct = await getBriefingById(params.briefingId);
    if (direct) return direct;
  }

  const briefings = await listBriefings({ clientId: params.clientId, limit: 20 });
  if (!briefings.length) return null;

  const title = (params.briefingTitle || '').trim().toLowerCase();
  if (title && title !== 'latest') {
    const match = briefings.find((b) => (b.title || '').toLowerCase().includes(title));
    if (match) return match;
  }

  return briefings[0] || null;
}

async function buildClientContext(tenantId: string, clientId: string): Promise<string> {
  const client = await getClientById(tenantId, clientId);
  if (!client) return '';

  const profile = client.profile || {};
  const knowledge = profile.knowledge_base || {};

  const parts: string[] = [];
  parts.push(`Client: ${client.name}`);
  if (client.segment_primary) parts.push(`Segment: ${client.segment_primary}`);
  if (knowledge.description) parts.push(`Description: ${knowledge.description}`);
  if (knowledge.audience) parts.push(`Target Audience: ${knowledge.audience}`);
  if (knowledge.brand_promise) parts.push(`Brand Promise: ${knowledge.brand_promise}`);
  if (knowledge.keywords?.length) parts.push(`Keywords: ${knowledge.keywords.join(', ')}`);
  if (knowledge.pillars?.length) parts.push(`Content Pillars: ${knowledge.pillars.join(', ')}`);

  return parts.join('\n');
}

function buildSystemPrompt(clientContext: string): string {
  return `You are an expert marketing and communications strategist for the EDRO platform.
You help create marketing plans, campaign strategies, and creative content for clients.

CLIENT CONTEXT:
${clientContext || 'No client context available.'}

GUIDELINES:
- Always consider the client's brand voice and target audience
- Provide actionable, specific recommendations
- Use Brazilian Portuguese when appropriate
- Focus on measurable outcomes and KPIs
- Be creative but strategic
- Consider the client's industry and market context`;
}

function parseDueAt(value?: string) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function buildPlanningCopyPrompt(params: {
  clientName: string;
  clientSegment?: string | null;
  briefing: { title: string; payload?: Record<string, any> | null };
  instructions?: string;
  count: number;
  language: string;
  contextPack?: string;
}) {
  const payload = params.briefing.payload || {};
  const lines = [
    `Cliente: ${params.clientName}`,
    params.clientSegment ? `Segmento: ${params.clientSegment}` : null,
    `Briefing: ${params.briefing.title}`,
    typeof payload.objective === 'string' ? `Objetivo: ${payload.objective}` : null,
    typeof payload.platform === 'string' ? `Plataforma: ${payload.platform}` : null,
    typeof payload.format === 'string' ? `Formato: ${payload.format}` : null,
    Array.isArray(payload.channels) && payload.channels.length ? `Canais: ${payload.channels.join(', ')}` : null,
    params.instructions ? `Instrucoes adicionais: ${params.instructions}` : null,
    `Gere ${params.count} opcoes completas de copy.`,
    `Cada opcao deve conter: Headline, Corpo e CTA.`,
    `Idioma: ${params.language}.`,
  ].filter(Boolean) as string[];

  if (params.contextPack) {
    lines.push('INSUMOS:');
    lines.push(params.contextPack);
  }

  return lines.join('\n');
}

export default async function planningRoutes(app: FastifyInstance) {
  // Get available providers
  app.get('/planning/providers', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const info = getAvailableProvidersInfo();
    return reply.send({
      success: true,
      data: {
        available: info.available.map(p => {
          switch (p) {
            case 'claude': return 'anthropic';
            case 'gemini': return 'google';
            default: return p;
          }
        }),
        providers: [
          { id: 'openai', name: 'OpenAI GPT-4', description: 'Creative and versatile' },
          { id: 'anthropic', name: 'Claude', description: 'Strategic and analytical' },
          { id: 'google', name: 'Gemini', description: 'Fast and efficient' },
          { id: 'collaborative', name: 'Colaborativo (3 IAs)', description: 'Gemini + OpenAI + Claude' },
        ],
      },
    });
  });

  // Chat with AI
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/chat', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';
    const userId = (request as any).userId;
    const user = (request as any).user;

    const body = chatSchema.parse(request.body);
    const { message, provider, conversationId, mode } = body;

    // Build client context (with timeouts to prevent hanging)
    const clientContext = await Promise.race([
      buildClientContext(tenantId, clientId),
      new Promise<string>((resolve) => setTimeout(() => resolve(''), 5000)),
    ]);
    let contextPack: { sources: any[]; packedText: string } = { sources: [], packedText: '' };
    try {
      contextPack = await Promise.race([
        buildContextPack({
          tenant_id: tenantId,
          client_id: clientId,
          query: message,
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Context pack timed out')), 10000)
        ),
      ]);
    } catch (error) {
      request.log?.warn({ err: error }, 'planning_context_pack_failed');
    }

    const combinedContext = [
      clientContext,
      contextPack.packedText ? `KNOWLEDGE BASE:\n${contextPack.packedText}` : '',
    ]
      .filter(Boolean)
      .join('\n\n');
    const systemPrompt =
      mode === 'command' ? buildCommandPrompt(combinedContext) : buildSystemPrompt(combinedContext);

    let conversation: Conversation | null = null;
    let messages: ConversationMessage[] = [];

    // Load or create conversation
    if (conversationId) {
      const result = await query(
        `SELECT * FROM planning_conversations WHERE id = $1 AND client_id = $2 AND tenant_id = $3`,
        [conversationId, clientId, tenantId]
      );
      if (result.rows.length) {
        conversation = result.rows[0] as Conversation;
        messages = (conversation.messages || []) as ConversationMessage[];
      }
    }

    // Add user message to history
    const userMessage: ConversationMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };
    messages.push(userMessage);

    // Build prompt with conversation history
    const historyContext = messages.slice(-10).map(m =>
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
    ).join('\n\n');

    const fullPrompt = `${historyContext}\n\nUser: ${message}`;

    // Generate AI response
    const copyProvider = provider === 'collaborative'
      ? ('gemini' as CopyProvider)
      : mapProviderToCopy(provider);
    let resultOutput = '';
    let resultProvider = '';
    let resultModel = '';
    let resultStages: any[] | undefined;

    const usageCtx: UsageContext | undefined = tenantId && tenantId !== 'default'
      ? { tenant_id: tenantId, feature: 'planning_chat' }
      : undefined;

    // 45s timeout on AI generation to prevent indefinite hanging
    const aiTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI generation timed out after 45s')), 45000)
    );

    try {
      if (provider === 'collaborative' && mode === 'chat') {
        // Pipeline colaborativo: Gemini analisa → OpenAI elabora → Claude refina
        const collabResult = await Promise.race([runCollaborativePipeline({
          usageContext: usageCtx,
          analysisPrompt: [
            'Voce e um analista estrategico de comunicacao de agencia.',
            'Analise o contexto do cliente e a conversa abaixo.',
            'Extraia os pontos mais relevantes e prepare um briefing de insights para o estrategista.',
            'Retorne texto estruturado com: insights-chave, contexto relevante do cliente, e abordagem recomendada.',
            '',
            'CONTEXTO DO CLIENTE:',
            combinedContext,
            '',
            'CONVERSA:',
            historyContext,
            '',
            'MENSAGEM ATUAL:',
            message,
          ].join('\n'),
          creativePrompt: (analysisOutput: string) => [
            'Voce e um estrategista de planejamento de comunicacao.',
            'Use os INSIGHTS DO ANALISTA abaixo para elaborar uma resposta completa, estrategica e criativa.',
            'Responda em portugues brasileiro, de forma clara, pratica e acionavel.',
            'Inclua sugestoes concretas e proximos passos quando relevante.',
            '',
            'INSIGHTS DO ANALISTA:',
            analysisOutput,
            '',
            'CONTEXTO DO CLIENTE:',
            combinedContext,
            '',
            'MENSAGEM DO USUARIO:',
            message,
          ].join('\n'),
          reviewPrompt: (analysisOutput: string, strategicOutput: string) => [
            'Voce e o diretor de planejamento de uma agencia de comunicacao premium.',
            'Revise e refine a resposta do estrategista abaixo.',
            'Garanta que esta:',
            '- Alinhada com o posicionamento e tom da marca do cliente',
            '- Pratica, acionavel e com proximos passos claros',
            '- Estrategicamente fundamentada nos insights do analista',
            '- Bem estruturada e em portugues brasileiro natural',
            'Se necessario, melhore a resposta. Retorne APENAS a resposta final refinada.',
            '',
            'INSIGHTS DO ANALISTA:',
            analysisOutput,
            '',
            'RESPOSTA DO ESTRATEGISTA:',
            strategicOutput,
          ].join('\n'),
        }), aiTimeout]);
        resultOutput = collabResult.output;
        resultProvider = 'collaborative';
        resultModel = collabResult.model;
        resultStages = collabResult.stages;
      } else {
        const singleResult = await Promise.race([generateWithProvider(copyProvider, {
          prompt: fullPrompt,
          systemPrompt,
          temperature: mode === 'command' ? 0.2 : 0.7,
          maxTokens: 2000,
        }, usageCtx), aiTimeout]);
        resultOutput = singleResult.output;
        resultProvider = singleResult.provider;
        resultModel = singleResult.model;
      }
    } catch (aiError: any) {
      request.log?.error({ err: aiError }, 'planning_chat_ai_failed');
      return reply.status(500).send({
        success: false,
        error: aiError?.message || 'Falha ao gerar resposta da IA.',
      });
    }

    let assistantContent = resultOutput;
    let actionResult: Record<string, any> | null = null;

    if (mode === 'command') {
      const parsed = normalizeCommandPayload(safeJsonParse(resultOutput));

      if (parsed.action === 'create_briefing') {
        const title =
          parsed.briefing.title ||
          `Briefing ${new Date().toLocaleDateString('pt-BR')}`;
        const briefingPayload: Record<string, any> = {
          objective: parsed.briefing.objective ?? null,
          platform: parsed.briefing.platform ?? null,
          format: parsed.briefing.format ?? null,
          notes: parsed.briefing.notes ?? null,
          channels: parsed.briefing.channels ?? null,
          source: 'planning_chat',
        };
        const dueAt = parseDueAt(parsed.briefing.deadline);

        const briefing = await createBriefing({
          clientId,
          title,
          payload: briefingPayload,
          createdBy: user?.email ?? null,
          dueAt: dueAt ?? undefined,
          source: 'planning_chat',
        });

        await createBriefingStages(briefing.id, user?.email ?? null);

        assistantContent = `Briefing criado: ${briefing.title}`;
        actionResult = {
          action: 'create_briefing',
          reason: parsed.reason,
          briefing: {
            id: briefing.id,
            title: briefing.title,
            status: briefing.status,
          },
        };
      } else if (parsed.action === 'generate_copy') {
        const briefing = await resolveBriefingFromCommand({
          clientId,
          briefingId: parsed.copy.briefing_id,
          briefingTitle: parsed.copy.briefing_title,
        });

        if (!briefing) {
          assistantContent = 'Nao encontrei um briefing para gerar o copy.';
          actionResult = {
            action: 'generate_copy',
            reason: parsed.reason,
            error: 'briefing_not_found',
          };
        } else {
          const client = await getClientById(tenantId, clientId);
          const prompt = buildPlanningCopyPrompt({
            clientName: client?.name || 'Cliente',
            clientSegment: client?.segment_primary ?? null,
            briefing,
            instructions: parsed.copy.instructions || message,
            count: parsed.copy.count,
            language: parsed.copy.language,
            contextPack: contextPack.packedText,
          });

          try {
            const copyResult = provider === 'collaborative'
              ? await generateCollaborativeCopy({
                  prompt,
                  count: parsed.copy.count,
                  knowledgeBlock: contextPack.packedText || undefined,
                  clientName: client?.name || undefined,
                  instructions: parsed.copy.instructions || message,
                })
              : await generateCopy({
                  prompt,
                  taskType: 'social_post',
                  forceProvider: copyProvider,
                });

            const copyVersion = await createCopyVersion({
              briefingId: briefing.id,
              language: parsed.copy.language || 'pt',
              model: copyResult.model,
              prompt,
              output: copyResult.output,
              payload: copyResult.payload,
              createdBy: user?.email ?? null,
            });

            await ensureBriefingStages(briefing.id, user?.email ?? null);
            await updateBriefingStageStatus({
              briefingId: briefing.id,
              stage: 'copy_ia',
              status: 'done',
              updatedBy: user?.email ?? null,
              metadata: { copyVersionId: copyVersion.id, source: 'planning_chat' },
            });

            assistantContent = `Copys geradas para "${briefing.title}".`;
            actionResult = {
              action: 'generate_copy',
              reason: parsed.reason,
              briefing: { id: briefing.id, title: briefing.title },
              copy: {
                id: copyVersion.id,
                model: copyResult.model,
                provider: copyResult.payload?.provider,
                preview: copyResult.output.slice(0, 400),
                count: parsed.copy.count,
              },
            };
          } catch (error: any) {
            assistantContent = 'Falha ao gerar copy agora. Tente novamente.';
            actionResult = {
              action: 'generate_copy',
              reason: parsed.reason,
              error: error?.message || 'copy_generation_failed',
            };
          }
        }
      } else {
        assistantContent = 'Nao identifiquei um comando claro. Posso criar um briefing ou gerar copy.';
        actionResult = {
          action: 'none',
          reason: parsed.reason,
        };
      }
    }

    const assistantMessage: ConversationMessage = {
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date().toISOString(),
      provider: resultProvider,
    };
    messages.push(assistantMessage);

    // Save conversation
    if (conversation) {
      await query(
        `UPDATE planning_conversations
         SET messages = $1, updated_at = now()
         WHERE id = $2`,
        [JSON.stringify(messages), conversation.id]
      );
    } else {
      const title = message.slice(0, 100);
      const insertResult = await query(
        `INSERT INTO planning_conversations (tenant_id, client_id, user_id, title, provider, messages)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [tenantId, clientId, userId, title, provider, JSON.stringify(messages)]
      );
      conversationId || (conversation = { id: insertResult.rows[0].id } as Conversation);
    }

    return reply.send({
      success: true,
      data: {
        response: assistantContent,
        provider: resultProvider,
        model: resultModel,
        stages: resultStages,
        action: actionResult,
        sources: contextPack.sources,
        conversationId: conversation?.id || (await query(
          `SELECT id FROM planning_conversations WHERE tenant_id = $1 AND client_id = $2 ORDER BY created_at DESC LIMIT 1`,
          [tenantId, clientId]
        )).rows[0]?.id,
      },
    });
  });

  // List conversations
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/planning/conversations', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';

    const result = await query(
      `SELECT id, title, provider, status, created_at, updated_at,
              (SELECT COUNT(*) FROM jsonb_array_elements(messages)) as message_count
       FROM planning_conversations
       WHERE client_id = $1 AND tenant_id = $2
       ORDER BY updated_at DESC
       LIMIT 50`,
      [clientId, tenantId]
    );

    return reply.send({
      success: true,
      data: { conversations: result.rows },
    });
  });

  // Get conversation detail
  app.get<{ Params: { clientId: string; conversationId: string } }>(
    '/clients/:clientId/planning/conversations/:conversationId',
    { preHandler: [authGuard, tenantGuard] },
    async (request, reply) => {
      const { clientId, conversationId } = request.params;
      const tenantId = (request as any).tenantId || 'default';

      const result = await query(
        `SELECT * FROM planning_conversations
         WHERE id = $1 AND client_id = $2 AND tenant_id = $3`,
        [conversationId, clientId, tenantId]
      );

      if (!result.rows.length) {
        return reply.status(404).send({ success: false, error: 'Conversation not found' });
      }

      return reply.send({
        success: true,
        data: { conversation: result.rows[0] },
      });
    }
  );

  // Create new conversation
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/conversations', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';
    const userId = (request as any).userId;

    const body = createConversationSchema.parse(request.body);

    const result = await query(
      `INSERT INTO planning_conversations (tenant_id, client_id, user_id, title, provider, messages)
       VALUES ($1, $2, $3, $4, $5, '[]'::jsonb)
       RETURNING *`,
      [tenantId, clientId, userId, body.title || 'New Planning Session', body.provider]
    );

    return reply.send({
      success: true,
      data: { conversation: result.rows[0] },
    });
  });

  // Delete conversation
  app.delete<{ Params: { clientId: string; conversationId: string } }>(
    '/clients/:clientId/planning/conversations/:conversationId',
    { preHandler: [authGuard, tenantGuard] },
    async (request, reply) => {
      const { clientId, conversationId } = request.params;
      const tenantId = (request as any).tenantId || 'default';

      await query(
        `DELETE FROM planning_conversations
         WHERE id = $1 AND client_id = $2 AND tenant_id = $3`,
        [conversationId, clientId, tenantId]
      );

      return reply.send({ success: true });
    }
  );

  // AI Opportunities endpoints
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/insights/opportunities', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';

    const result = await query(
      `SELECT * FROM ai_opportunities
       WHERE client_id = $1 AND tenant_id = $2 AND status != 'dismissed'
       ORDER BY
         CASE priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           ELSE 4
         END,
         created_at DESC
       LIMIT 20`,
      [clientId, tenantId]
    );

    return reply.send({
      success: true,
      data: { opportunities: result.rows },
    });
  });

  // Generate opportunities from clipping and trends
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/insights/opportunities/generate', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';

    // Gather context: clipping, trends, calendar
    const [clippingResult, trendsResult, calendarResult] = await Promise.all([
      query(
        `SELECT title, snippet, relevance_score, published_at
         FROM clipping_matches
         WHERE client_id = $1 AND tenant_id = $2
         ORDER BY relevance_score DESC, published_at DESC
         LIMIT 10`,
        [clientId, tenantId]
      ),
      query(
        `SELECT keyword, platform, mention_count, average_sentiment
         FROM social_listening_trends
         WHERE client_id = $1 AND tenant_id = $2
         ORDER BY mention_count DESC
         LIMIT 10`,
        [clientId, tenantId]
      ),
      query(
        `SELECT name, date_ref, description
         FROM edro_calendar_events
         WHERE date_ref BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'
         ORDER BY date_ref
         LIMIT 10`,
        []
      ),
    ]);

    const clientContext = await buildClientContext(tenantId, clientId);

    const contextParts = [
      'CLIPPING RECENTE:',
      clippingResult.rows.map(r => `- ${r.title}: ${r.snippet}`).join('\n'),
      '\nTENDÊNCIAS SOCIAIS:',
      trendsResult.rows.map(r => `- ${r.keyword} (${r.platform}): ${r.mention_count} menções`).join('\n'),
      '\nCALENDÁRIO PRÓXIMO:',
      calendarResult.rows.map(r => `- ${r.date_ref}: ${r.name}`).join('\n'),
    ].join('\n');

    const prompt = `Based on the following context, identify 3-5 marketing opportunities for the client.

CLIENT CONTEXT:
${clientContext}

${contextParts}

For each opportunity, provide:
1. Title (concise, action-oriented)
2. Description (2-3 sentences)
3. Source (clipping, trend, or calendar)
4. Suggested Action (specific next step)
5. Priority (urgent, high, medium, low)
6. Confidence (0-100)

Return as JSON array with keys: title, description, source, suggestedAction, priority, confidence`;

    const oppUsageCtx: UsageContext | undefined = tenantId && tenantId !== 'default'
      ? { tenant_id: tenantId, feature: 'opportunities_generate' }
      : undefined;
    const result = await generateWithProvider('claude', {
      prompt,
      systemPrompt: 'You are a strategic marketing analyst. Return only valid JSON.',
      temperature: 0.7,
      maxTokens: 2000,
    }, oppUsageCtx);

    // Parse AI response
    let opportunities: any[] = [];
    try {
      const jsonMatch = result.output.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        opportunities = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse opportunities:', e);
    }

    // Save opportunities
    for (const opp of opportunities) {
      await query(
        `INSERT INTO ai_opportunities
         (tenant_id, client_id, title, description, source, suggested_action, priority, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          tenantId,
          clientId,
          opp.title,
          opp.description,
          opp.source,
          opp.suggestedAction,
          opp.priority || 'medium',
          opp.confidence || 70,
        ]
      );
    }

    return reply.send({
      success: true,
      data: {
        generated: opportunities.length,
        opportunities,
      },
    });
  });

  // Update opportunity status
  app.patch<{ Params: { clientId: string; opportunityId: string } }>(
    '/clients/:clientId/insights/opportunities/:opportunityId',
    { preHandler: [authGuard, tenantGuard] },
    async (request, reply) => {
      const { clientId, opportunityId } = request.params;
      const tenantId = (request as any).tenantId || 'default';
      const userId = (request as any).userId;
      const { status } = request.body as { status: string };

      const updates: string[] = ['status = $4', 'updated_at = now()'];
      const params: any[] = [opportunityId, clientId, tenantId, status];

      if (status === 'actioned') {
        updates.push('actioned_at = now()');
        updates.push(`actioned_by = $${params.length + 1}`);
        params.push(userId);
      }

      await query(
        `UPDATE ai_opportunities SET ${updates.join(', ')}
         WHERE id = $1 AND client_id = $2 AND tenant_id = $3`,
        params
      );

      return reply.send({ success: true });
    }
  );

  // ── Full AI Analysis ──────────────────────────────────────────────
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/analyze', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';

    // Gather ALL data sources in parallel
    const [
      clientContext,
      contextPack,
      clippingResult,
      trendsResult,
      calendarResult,
      opportunitiesResult,
      briefingsResult,
      performanceResult,
    ] = await Promise.all([
      buildClientContext(tenantId, clientId),
      Promise.race([
        buildContextPack({ tenant_id: tenantId, client_id: clientId, query: 'analise estrategica completa do cliente' }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Context pack timed out')), 10000)),
      ]).catch(() => ({ sources: [], packedText: '' })),
      query(
        `SELECT cm.score, cm.matched_keywords, ci.title, ci.excerpt, ci.published_at
         FROM clipping_matches cm
         JOIN clipping_items ci ON ci.id = cm.clipping_item_id
         WHERE cm.client_id = $1 AND cm.tenant_id = $2
         ORDER BY cm.score DESC, cm.created_at DESC
         LIMIT 15`,
        [clientId, tenantId]
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT keyword, platform, mention_count, average_sentiment, positive_count, negative_count, total_engagement
         FROM social_listening_trends
         WHERE client_id = $1 AND tenant_id = $2
         ORDER BY mention_count DESC
         LIMIT 15`,
        [clientId, tenantId]
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT name, date, categories, tags, base_relevance
         FROM events
         WHERE date IS NOT NULL
         ORDER BY date
         LIMIT 20`,
        []
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT title, description, source, suggested_action, priority, confidence, status
         FROM ai_opportunities
         WHERE client_id = $1 AND tenant_id = $2 AND status != 'dismissed'
         ORDER BY CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, confidence DESC
         LIMIT 10`,
        [clientId, tenantId]
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT title, payload, created_at
         FROM edro_briefings
         WHERE client_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC
         LIMIT 10`,
        [clientId, tenantId]
      ).catch(() => ({ rows: [] })),
      query(
        `SELECT platform, time_window, payload, created_at
         FROM learned_insights
         WHERE client_id = $1 AND tenant_id = $2
         ORDER BY created_at DESC
         LIMIT 10`,
        [clientId, tenantId]
      ).catch(() => ({ rows: [] })),
    ]);

    const sourcesUsed = {
      clipping: clippingResult.rows.length,
      trends: trendsResult.rows.length,
      calendar: calendarResult.rows.length,
      library: contextPack.sources.length,
      opportunities: opportunitiesResult.rows.length,
      briefings: briefingsResult.rows.length,
      performance: performanceResult.rows.length,
    };

    // Format data for prompts
    const clippingText = clippingResult.rows.length
      ? clippingResult.rows.map((r: any) => `- [${r.score}] ${r.title}: ${r.excerpt || ''} (keywords: ${(r.matched_keywords || []).join(', ')})`).join('\n')
      : 'Nenhum clipping disponivel.';

    const trendsText = trendsResult.rows.length
      ? trendsResult.rows.map((r: any) => `- ${r.keyword} (${r.platform}): ${r.mention_count} mencoes, sentimento ${r.average_sentiment}/100, engajamento ${r.total_engagement}`).join('\n')
      : 'Nenhuma tendencia disponivel.';

    const calendarText = calendarResult.rows.length
      ? calendarResult.rows.map((r: any) => `- ${r.date}: ${r.name} [${(r.categories || []).join(', ')}] relevancia base: ${r.base_relevance}`).join('\n')
      : 'Nenhum evento proximo.';

    const opportunitiesText = opportunitiesResult.rows.length
      ? opportunitiesResult.rows.map((r: any) => `- [${r.priority}] ${r.title}: ${r.description || ''} → ${r.suggested_action || ''} (confianca: ${r.confidence}%)`).join('\n')
      : 'Nenhuma oportunidade identificada.';

    const briefingsText = briefingsResult.rows.length
      ? briefingsResult.rows.map((r: any) => {
          const p = r.payload || {};
          return `- ${r.title} (${new Date(r.created_at).toLocaleDateString('pt-BR')}) plataforma: ${p.platform || '?'}, formato: ${p.format || '?'}`;
        }).join('\n')
      : 'Nenhum briefing recente.';

    const libraryText = contextPack.packedText || 'Nenhum material na biblioteca.';

    const performanceText = performanceResult.rows.length
      ? performanceResult.rows.map((r: any) => {
          const p = r.payload || {};
          const kpis = p.kpis || p.summary || {};
          const parts = [`- ${r.platform} (${r.time_window || 'geral'}):`];
          if (kpis.impressions) parts.push(`impressoes: ${kpis.impressions}`);
          if (kpis.reach) parts.push(`alcance: ${kpis.reach}`);
          if (kpis.engagement) parts.push(`engajamento: ${kpis.engagement}`);
          if (kpis.clicks) parts.push(`cliques: ${kpis.clicks}`);
          if (kpis.followers) parts.push(`seguidores: ${kpis.followers}`);
          if (kpis.engagement_rate) parts.push(`taxa engaj.: ${kpis.engagement_rate}%`);
          if (p.by_format) parts.push(`formatos: ${JSON.stringify(p.by_format)}`);
          if (p.editorial_insights) parts.push(`insights: ${typeof p.editorial_insights === 'string' ? p.editorial_insights : JSON.stringify(p.editorial_insights)}`);
          return parts.join(' ');
        }).join('\n')
      : 'Nenhum dado de performance disponivel (Reportei nao sincronizado).';

    const analyzeUsageCtx: UsageContext | undefined = tenantId && tenantId !== 'default'
      ? { tenant_id: tenantId, feature: 'client_analysis' }
      : undefined;
    try {
      const result = await runCollaborativePipeline({
        usageContext: analyzeUsageCtx,
        analysisPrompt: [
          'Voce e um analista de dados senior de uma agencia de comunicacao.',
          'Analise TODOS os dados abaixo sobre o cliente e extraia insights estruturados.',
          '',
          'PERFIL DO CLIENTE:',
          clientContext || 'Perfil nao disponivel.',
          '',
          'BIBLIOTECA DE CONHECIMENTO:',
          libraryText,
          '',
          'CLIPPING RECENTE (noticias e mencoes):',
          clippingText,
          '',
          'TENDENCIAS SOCIAIS:',
          trendsText,
          '',
          'CALENDARIO PROXIMO:',
          calendarText,
          '',
          'OPORTUNIDADES JA IDENTIFICADAS:',
          opportunitiesText,
          '',
          'BRIEFINGS RECENTES:',
          briefingsText,
          '',
          'PERFORMANCE / METRICAS (Reportei):',
          performanceText,
          '',
          'Retorne um relatorio estruturado com:',
          '1. PONTOS FORTES da presenca digital do cliente',
          '2. PONTOS FRACOS e gaps identificados',
          '3. OPORTUNIDADES imediatas (proximos 14-30 dias)',
          '4. AMEACAS ou riscos identificados',
          '5. ANALISE DE SENTIMENTO e engajamento (se dados disponiveis)',
          '6. PERFORMANCE POR PLATAFORMA (metricas do Reportei: impressoes, alcance, engajamento, cliques)',
          '7. GAPS DE CONTEUDO (temas nao cobertos, plataformas subutilizadas)',
          '8. METRICAS-CHAVE resumidas',
        ].join('\n'),
        creativePrompt: (analysisOutput: string) => [
          'Voce e um estrategista senior de comunicacao de uma agencia premium.',
          'Use os INSIGHTS DO ANALISTA abaixo para criar recomendacoes estrategicas concretas.',
          '',
          'INSIGHTS DO ANALISTA:',
          analysisOutput,
          '',
          'PERFIL DO CLIENTE:',
          clientContext || 'Perfil nao disponivel.',
          '',
          'Elabore:',
          '1. PLANO DE ACAO para os proximos 30 dias (acoes concretas, priorizadas, com responsavel sugerido)',
          '2. OPORTUNIDADES DE CALENDARIO (como aproveitar as datas proximas para este cliente)',
          '3. RECOMENDACOES DE CONTEUDO (temas, formatos, plataformas especificas)',
          '4. QUICK WINS (acoes de baixo esforco e alto impacto, executaveis esta semana)',
          '5. ALERTAS (pontos de atencao urgentes que precisam de acao imediata)',
          '6. SUGESTOES DE BRIEFINGS (ideias concretas para proximos conteudos)',
        ].join('\n'),
        reviewPrompt: (analysisOutput: string, strategicOutput: string) => [
          'Voce e o diretor de planejamento de uma agencia de comunicacao premium.',
          'Revise e compile o relatorio final para apresentacao ao cliente.',
          '',
          'INSIGHTS DO ANALISTA:',
          analysisOutput,
          '',
          'ESTRATEGIA PROPOSTA:',
          strategicOutput,
          '',
          'Produza um relatorio final em portugues brasileiro com as secoes abaixo.',
          'Use markdown com titulos, listas, negrito e tabelas quando apropriado.',
          'Seja direto, acionavel e estrategico.',
          '',
          'Secoes obrigatorias:',
          '## Visao Geral',
          '(resumo executivo em 3-5 frases)',
          '',
          '## Analise de Presenca Digital',
          '(pontos fortes, fracos, sentimento, metricas de performance)',
          '',
          '## Oportunidades e Calendario',
          '(datas proximas + como aproveitar)',
          '',
          '## Plano de Acao',
          '(tabela: acao | prioridade | prazo | plataforma)',
          '',
          '## Recomendacoes de Conteudo',
          '(temas, formatos, ideias de briefing)',
          '',
          '## Quick Wins',
          '(acoes rapidas de alto impacto)',
          '',
          '## Alertas e Pontos de Atencao',
          '(riscos, ameacas, acoes urgentes)',
          '',
          '## Proximos Passos',
          '(o que fazer esta semana)',
        ].join('\n'),
        maxTokens: { analysis: 2000, creative: 2500, review: 3000 },
      });

      return reply.send({
        success: true,
        data: {
          analysis: result.output,
          stages: result.stages,
          sources_used: sourcesUsed,
          total_duration_ms: result.total_duration_ms,
        },
      });
    } catch (error: any) {
      request.log?.error({ err: error }, 'client_analysis_failed');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Falha ao gerar analise.',
      });
    }
  });

  // POST /clients/:id/planning/health - Check health of all intelligence sources
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/health', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';

    try {
      const healthChecks = await Promise.allSettled([
        // Library health
        query(`
          SELECT COUNT(*) as total,
                 COUNT(*) FILTER (WHERE status = 'ready') as ready,
                 COUNT(*) FILTER (WHERE status = 'processing') as processing,
                 COUNT(*) FILTER (WHERE status = 'error') as error
          FROM library_items
          WHERE client_id = $1 AND tenant_id = $2
        `, [clientId, tenantId]),

        // Clipping health
        query(`
          SELECT COUNT(*) as total,
                 COUNT(*) FILTER (WHERE ci.status = 'NEW') as new,
                 MAX(ci.published_at) as last_published,
                 AVG(cm.score) as avg_score
          FROM clipping_matches cm
          JOIN clipping_items ci ON ci.id = cm.clipping_item_id
          WHERE cm.client_id = $1 AND cm.tenant_id = $2
            AND cm.created_at > NOW() - INTERVAL '30 days'
        `, [clientId, tenantId]),

        // Social Listening health
        query(`
          SELECT COUNT(*) as total,
                 MAX(created_at) as last_update,
                 AVG(mention_count) as avg_mentions
          FROM social_listening_trends
          WHERE client_id = $1 AND tenant_id = $2
            AND created_at > NOW() - INTERVAL '7 days'
        `, [clientId, tenantId]),

        // Calendar health
        query(`
          SELECT COUNT(*) as total,
                 COUNT(*) FILTER (WHERE date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days') as upcoming,
                 AVG(base_relevance) as avg_relevance
          FROM events
          WHERE date > CURRENT_DATE
        `),

        // Opportunities health
        query(`
          SELECT COUNT(*) as total,
                 COUNT(*) FILTER (WHERE status = 'pending') as pending,
                 COUNT(*) FILTER (WHERE priority = 'urgent') as urgent,
                 MAX(created_at) as last_created
          FROM ai_opportunities
          WHERE client_id = $1 AND tenant_id = $2
            AND status != 'dismissed'
        `, [clientId, tenantId]),

        // Copy versions health (for anti-repetition)
        query(`
          SELECT COUNT(*) as total,
                 COUNT(*) FILTER (WHERE embedding IS NOT NULL) as with_embeddings,
                 MAX(ecv.created_at) as last_generated
          FROM edro_copy_versions ecv
          JOIN edro_briefings eb ON eb.id = ecv.briefing_id
          WHERE eb.client_id = $1
            AND ecv.created_at > NOW() - INTERVAL '90 days'
        `, [clientId]),

        // Briefings health
        query(`
          SELECT COUNT(*) as total,
                 COUNT(*) FILTER (WHERE status = 'pending') as pending,
                 MAX(created_at) as last_created
          FROM edro_briefings
          WHERE client_id = $1
            AND created_at > NOW() - INTERVAL '90 days'
        `, [clientId]),
      ]);

      const [libraryRes, clippingRes, socialRes, calendarRes, opportunitiesRes, copiesRes, briefingsRes] = healthChecks;

      // Build health status for each source
      const health = {
        overall: 'healthy' as 'healthy' | 'warning' | 'error',
        sources: {
          library: {
            status: 'healthy' as 'healthy' | 'warning' | 'error',
            data: libraryRes.status === 'fulfilled' ? libraryRes.value.rows[0] : null,
            message: '',
            lastCheck: new Date().toISOString(),
          },
          clipping: {
            status: 'healthy' as 'healthy' | 'warning' | 'error',
            data: clippingRes.status === 'fulfilled' ? clippingRes.value.rows[0] : null,
            message: '',
            lastCheck: new Date().toISOString(),
          },
          social: {
            status: 'healthy' as 'healthy' | 'warning' | 'error',
            data: socialRes.status === 'fulfilled' ? socialRes.value.rows[0] : null,
            message: '',
            lastCheck: new Date().toISOString(),
          },
          calendar: {
            status: 'healthy' as 'healthy' | 'warning' | 'error',
            data: calendarRes.status === 'fulfilled' ? calendarRes.value.rows[0] : null,
            message: '',
            lastCheck: new Date().toISOString(),
          },
          opportunities: {
            status: 'healthy' as 'healthy' | 'warning' | 'error',
            data: opportunitiesRes.status === 'fulfilled' ? opportunitiesRes.value.rows[0] : null,
            message: '',
            lastCheck: new Date().toISOString(),
          },
          antiRepetition: {
            status: 'healthy' as 'healthy' | 'warning' | 'error',
            data: copiesRes.status === 'fulfilled' ? copiesRes.value.rows[0] : null,
            message: '',
            lastCheck: new Date().toISOString(),
          },
          briefings: {
            status: 'healthy' as 'healthy' | 'warning' | 'error',
            data: briefingsRes.status === 'fulfilled' ? briefingsRes.value.rows[0] : null,
            message: '',
            lastCheck: new Date().toISOString(),
          },
        },
      };

      // Determine health status for Library
      if (libraryRes.status === 'rejected') {
        health.sources.library.status = 'error';
        health.sources.library.message = 'Falha ao carregar dados da library';
      } else if (libraryRes.value.rows[0].error > 0) {
        health.sources.library.status = 'warning';
        health.sources.library.message = `${libraryRes.value.rows[0].error} item(s) com erro`;
      } else if (libraryRes.value.rows[0].total === 0) {
        health.sources.library.status = 'warning';
        health.sources.library.message = 'Nenhum item na library';
      } else {
        health.sources.library.message = `${libraryRes.value.rows[0].ready} item(s) pronto(s)`;
      }

      // Determine health status for Clipping
      if (clippingRes.status === 'rejected') {
        health.sources.clipping.status = 'error';
        health.sources.clipping.message = 'Falha ao carregar clipping';
      } else if (clippingRes.value.rows[0].total === 0) {
        health.sources.clipping.status = 'warning';
        health.sources.clipping.message = 'Nenhum clipping nos últimos 30 dias';
      } else {
        const lastPublished = clippingRes.value.rows[0].last_published;
        const daysSinceLastPublish = lastPublished
          ? Math.floor((Date.now() - new Date(lastPublished).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceLastPublish > 7) {
          health.sources.clipping.status = 'warning';
          health.sources.clipping.message = `Último clipping há ${daysSinceLastPublish} dias`;
        } else {
          health.sources.clipping.message = `${clippingRes.value.rows[0].total} matches ativos`;
        }
      }

      // Determine health status for Social
      if (socialRes.status === 'rejected') {
        health.sources.social.status = 'error';
        health.sources.social.message = 'Falha ao carregar social listening';
      } else if (socialRes.value.rows[0].total === 0) {
        health.sources.social.status = 'warning';
        health.sources.social.message = 'Nenhum dado social nos últimos 7 dias';
      } else {
        const lastUpdate = socialRes.value.rows[0].last_update;
        const daysSinceLastUpdate = lastUpdate
          ? Math.floor((Date.now() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        if (daysSinceLastUpdate > 2) {
          health.sources.social.status = 'warning';
          health.sources.social.message = `Última atualização há ${daysSinceLastUpdate} dias`;
        } else {
          health.sources.social.message = `${socialRes.value.rows[0].total} trends detectadas`;
        }
      }

      // Determine health status for Calendar
      if (calendarRes.status === 'rejected') {
        health.sources.calendar.status = 'error';
        health.sources.calendar.message = 'Falha ao carregar calendar';
      } else if (calendarRes.value.rows[0].total === 0) {
        health.sources.calendar.status = 'warning';
        health.sources.calendar.message = 'Nenhum evento futuro cadastrado';
      } else {
        health.sources.calendar.message = `${calendarRes.value.rows[0].upcoming} eventos próximos`;
      }

      // Determine health status for Opportunities
      if (opportunitiesRes.status === 'rejected') {
        health.sources.opportunities.status = 'error';
        health.sources.opportunities.message = 'Falha ao carregar opportunities';
      } else {
        const urgent = opportunitiesRes.value.rows[0].urgent || 0;
        if (urgent > 0) {
          health.sources.opportunities.status = 'warning';
          health.sources.opportunities.message = `${urgent} oportunidade(s) urgente(s)`;
        } else {
          health.sources.opportunities.message = `${opportunitiesRes.value.rows[0].total} oportunidades ativas`;
        }
      }

      // Determine health status for Anti-Repetition
      if (copiesRes.status === 'rejected') {
        health.sources.antiRepetition.status = 'error';
        health.sources.antiRepetition.message = 'Falha ao carregar histórico de copies';
      } else {
        const total = copiesRes.value.rows[0].total || 0;
        const withEmbeddings = copiesRes.value.rows[0].with_embeddings || 0;
        const coverage = total > 0 ? (withEmbeddings / total) * 100 : 0;

        if (coverage < 50) {
          health.sources.antiRepetition.status = 'warning';
          health.sources.antiRepetition.message = `Apenas ${Math.round(coverage)}% das copies têm embeddings`;
        } else {
          health.sources.antiRepetition.message = `${withEmbeddings}/${total} copies com embeddings`;
        }
      }

      // Determine health status for Briefings
      if (briefingsRes.status === 'rejected') {
        health.sources.briefings.status = 'error';
        health.sources.briefings.message = 'Falha ao carregar briefings';
      } else {
        health.sources.briefings.message = `${briefingsRes.value.rows[0].total} briefings (últimos 90 dias)`;
      }

      // Determine overall health
      const errorCount = Object.values(health.sources).filter(s => s.status === 'error').length;
      const warningCount = Object.values(health.sources).filter(s => s.status === 'warning').length;

      if (errorCount > 0) {
        health.overall = 'error';
      } else if (warningCount > 2) {
        health.overall = 'warning';
      }

      return reply.send({
        success: true,
        data: health,
      });
    } catch (error: any) {
      request.log?.error({ error, clientId }, 'Failed to check intelligence health');
      return reply.status(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  // POST /clients/:id/planning/context - Load intelligence stats via direct DB queries
  // Avoids buildIntelligenceContext (which depends on OpenAI embeddings) for fast loading
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/context', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';

    try {
      // Fast parallel DB queries — no AI/embeddings, all simple COUNTs with 10s safety timeout
      const statsPromise = Promise.allSettled([
        // Library items count
        query(
          `SELECT COUNT(*) as total FROM library_items WHERE client_id = $1 AND tenant_id = $2 AND status = 'ready'`,
          [clientId, tenantId]
        ),
        // Clipping matches (últimos 30 dias)
        query(
          `SELECT COUNT(*) as total FROM clipping_matches WHERE client_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '30 days' AND score > 70`,
          [clientId, tenantId]
        ),
        // Social listening mentions (últimos 7 dias)
        query(
          `SELECT COALESCE(SUM(mention_count), 0) as total_mentions, COALESCE(AVG(average_sentiment), 50) as avg_sentiment FROM social_listening_trends WHERE client_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '7 days'`,
          [clientId, tenantId]
        ),
        // Calendar events (próximos 14 dias)
        query(
          `SELECT COUNT(*) as next14, COUNT(*) FILTER (WHERE base_relevance > 80) as high_rel FROM events WHERE date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '14 days'`,
          []
        ),
        // AI Opportunities
        query(
          `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE priority = 'urgent') as urgent, COUNT(*) FILTER (WHERE confidence >= 80) as high_conf FROM ai_opportunities WHERE client_id = $1 AND tenant_id = $2 AND status != 'dismissed'`,
          [clientId, tenantId]
        ),
        // Briefings (últimos 90 dias)
        query(
          `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE status NOT IN ('done', 'cancelled')) as pending FROM edro_briefings WHERE client_id = $1 AND created_at > NOW() - INTERVAL '90 days'`,
          [clientId]
        ),
        // Copy versions (últimos 90 dias)
        query(
          `SELECT COUNT(*) as total FROM edro_copy_versions ecv JOIN edro_briefings eb ON eb.id = ecv.briefing_id WHERE eb.client_id = $1 AND ecv.created_at > NOW() - INTERVAL '90 days'`,
          [clientId]
        ),
      ]);

      const results = await Promise.race([
        statsPromise,
        new Promise<PromiseSettledResult<any>[]>((resolve) =>
          setTimeout(() => resolve([]), 10000)
        ),
      ]);

      const getVal = (idx: number, field: string, fallback: number = 0) => {
        const r = results[idx];
        if (r?.status === 'fulfilled' && r.value?.rows?.[0]) {
          return Number(r.value.rows[0][field]) || fallback;
        }
        return fallback;
      };

      const stats = {
        library: { totalItems: getVal(0, 'total') },
        clipping: { totalMatches: getVal(1, 'total'), topKeywords: [] as string[] },
        social: { totalMentions: getVal(2, 'total_mentions'), sentimentAvg: getVal(2, 'avg_sentiment', 50) },
        calendar: { next14Days: getVal(3, 'next14'), highRelevance: getVal(3, 'high_rel') },
        opportunities: {
          active: getVal(4, 'total'),
          urgent: getVal(4, 'urgent'),
          highConfidence: getVal(4, 'high_conf'),
        },
        briefings: { recent: getVal(5, 'total'), pending: getVal(5, 'pending') },
        copies: { recentHashes: getVal(6, 'total'), usedAngles: 0 },
      };

      return reply.send({
        success: true,
        data: { stats },
      });
    } catch (error: any) {
      request.log?.error({ err: error }, 'planning_context_stats_failed');
      return reply.send({
        success: true,
        data: {
          stats: {
            library: { totalItems: 0 },
            clipping: { totalMatches: 0, topKeywords: [] },
            social: { totalMentions: 0, sentimentAvg: 0 },
            calendar: { next14Days: 0, highRelevance: 0 },
            opportunities: { active: 0, urgent: 0, highConfidence: 0 },
            briefings: { recent: 0, pending: 0 },
            copies: { recentHashes: 0, usedAngles: 0 },
          },
          partial: true,
          warning: error?.message || 'Contexto indisponível no momento.',
        },
      });
    }
  });

  // POST /clients/:id/planning/validate-copy - Anti-repetition + brand safety
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/validate-copy', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';
    const { copyText } = request.body as { copyText: string };

    if (!copyText || !copyText.trim()) {
      return reply.status(400).send({
        success: false,
        error: 'copyText is required',
      });
    }

    try {
      const repetitionCheck = await detectRepetition({
        client_id: clientId,
        copyText,
      });

      // Brand safety checks (simple for now)
      const client = await getClientById(tenantId, clientId);
      const negativeKeywords = client?.profile?.negative_keywords || [];
      const violations = negativeKeywords.filter((kw: string) =>
        copyText.toLowerCase().includes(kw.toLowerCase())
      );

      return reply.send({
        success: true,
        data: {
          repetition: repetitionCheck,
          brandSafety: {
            violations,
            isClean: violations.length === 0,
          },
          overall: {
            approved: repetitionCheck.recommendation === 'approve' && violations.length === 0,
            recommendation: violations.length > 0
              ? 'reject'
              : repetitionCheck.recommendation,
            reason: violations.length > 0
              ? `Contém palavras proibidas: ${violations.join(', ')}`
              : repetitionCheck.reason,
          },
        },
      });
    } catch (error: any) {
      request.log?.error({ err: error }, 'validate_copy_failed');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Falha ao validar copy.',
      });
    }
  });

  // POST /clients/:id/planning/opportunities/detect - Trigger opportunity detection
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/opportunities/detect', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';

    try {
      const count = await detectOpportunitiesForClient({
        tenant_id: tenantId,
        client_id: clientId,
      });

      return reply.send({
        success: true,
        data: {
          detected: count,
          message: `${count} novas oportunidades detectadas`,
        },
      });
    } catch (error: any) {
      request.log?.error({ err: error }, 'opportunity_detection_failed');
      return reply.status(500).send({
        success: false,
        error: error?.message || 'Falha ao detectar oportunidades.',
      });
    }
  });

  // POST /clients/:id/planning/opportunities/:oppId/action - Convert opportunity to briefing
  app.post<{ Params: { clientId: string; oppId: string } }>(
    '/clients/:clientId/planning/opportunities/:oppId/action',
    { preHandler: [authGuard, tenantGuard] },
    async (request, reply) => {
      const { clientId, oppId } = request.params;
      const tenantId = (request as any).tenantId || 'default';
      const user = (request as any).user;
      const { action } = request.body as { action: 'create_briefing' | 'dismiss' };

      // Get opportunity
      const { rows: oppRows } = await query(
        `SELECT * FROM ai_opportunities WHERE id = $1 AND client_id = $2 AND tenant_id = $3`,
        [oppId, clientId, tenantId]
      );

      if (!oppRows.length) {
        return reply.status(404).send({ success: false, error: 'Opportunity not found' });
      }

      const opp = oppRows[0];

      if (action === 'dismiss') {
        await query(
          `UPDATE ai_opportunities SET status = 'dismissed', updated_at = now() WHERE id = $1`,
          [oppId]
        );
        return reply.send({ success: true, data: { action: 'dismissed' } });
      }

      if (action === 'create_briefing') {
        // Create briefing from opportunity
        const briefing = await createBriefing({
          clientId,
          title: opp.title,
          payload: {
            objective: opp.description,
            source: 'ai_opportunity',
            opportunity_id: oppId,
            suggested_action: opp.suggested_action,
          },
          createdBy: user?.email || null,
          source: 'planning_opportunity',
        });

        // Link opportunity to briefing via source_opportunity_id
        // (This will be done when migration runs and column exists)

        // Mark opportunity as actioned
        await query(
          `UPDATE ai_opportunities
           SET status = 'actioned', actioned_at = now(), actioned_by = $2, updated_at = now()
           WHERE id = $1`,
          [oppId, user?.email || null]
        );

        return reply.send({
          success: true,
          data: {
            action: 'create_briefing',
            briefing: {
              id: briefing.id,
              title: briefing.title,
            },
          },
        });
      }

      return reply.status(400).send({ success: false, error: 'Invalid action' });
    }
  );

  // GET /clients/:clientId/briefings - List briefings for a specific client
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/briefings', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;

    const briefings = await listBriefings({ clientId, limit: 50 });

    return reply.send({
      success: true,
      briefings,
    });
  });

  // GET /clients/:clientId/copies - List copy versions for a specific client
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/copies', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;

    const result = await query(
      `SELECT ecv.*
       FROM edro_copy_versions ecv
       JOIN edro_briefings eb ON eb.id = ecv.briefing_id
       WHERE eb.client_id = $1
       ORDER BY ecv.created_at DESC
       LIMIT 50`,
      [clientId]
    );

    return reply.send({
      success: true,
      copies: result.rows,
    });
  });

  // GET /clients/:clientId/planning/opportunities - List opportunities (alias)
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/planning/opportunities', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';

    const result = await query(
      `SELECT * FROM ai_opportunities
       WHERE client_id = $1 AND tenant_id = $2 AND status != 'dismissed'
       ORDER BY
         CASE priority
           WHEN 'urgent' THEN 1
           WHEN 'high' THEN 2
           WHEN 'medium' THEN 3
           ELSE 4
         END,
         created_at DESC
       LIMIT 20`,
      [clientId, tenantId]
    );

    return reply.send({
      success: true,
      opportunities: result.rows,
    });
  });
}
