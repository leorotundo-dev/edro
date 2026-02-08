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

async function ensureCalendarEvents(): Promise<number> {
  const { rows } = await query(
    `SELECT COUNT(*) as total FROM events WHERE date IS NOT NULL AND length(date) = 10 AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD')`,
  );
  if (Number(rows[0]?.total) > 0) return 0;

  // No future events — import holidays for current and next year
  const years = [new Date().getFullYear(), new Date().getFullYear() + 1];
  let total = 0;
  for (const year of years) {
    try {
      const resp = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
      if (!resp.ok) continue;
      const holidays = (await resp.json()) as Array<{ date: string; name: string }>;
      for (const h of holidays) {
        const slug = h.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        await query(
          `INSERT INTO events (id, name, slug, date_type, date, scope, country, categories, tags, base_relevance, is_trend_sensitive, source)
           VALUES ($1, $2, $3, 'fixed', $4, 'BR', 'BR', ARRAY['oficial'], ARRAY[$3], 75, false, 'holiday_api:brasilapi')
           ON CONFLICT (id) DO NOTHING`,
          [`holiday_br_${year}_${slug}`, h.name, slug, h.date],
        );
        total++;
      }
    } catch { /* ignore import errors */ }
  }
  return total;
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
        `SELECT name, date, payload->>'description' as description
         FROM events
         WHERE date IS NOT NULL AND length(date) = 10
           AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD')
           AND date <= to_char(CURRENT_DATE + INTERVAL '14 days', 'YYYY-MM-DD')
         ORDER BY date
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
  // Single SQL with scalar subqueries — 1 DB connection, fast
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/health', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';
    const now = new Date().toISOString();

    const defaultHealth = {
      overall: 'warning' as const,
      sources: {
        library:        { status: 'warning' as const, data: null, message: 'Sem dados', lastCheck: now },
        clipping:       { status: 'warning' as const, data: null, message: 'Sem dados', lastCheck: now },
        social:         { status: 'warning' as const, data: null, message: 'Sem dados', lastCheck: now },
        calendar:       { status: 'warning' as const, data: null, message: 'Sem dados', lastCheck: now },
        opportunities:  { status: 'warning' as const, data: null, message: 'Sem dados', lastCheck: now },
        antiRepetition: { status: 'healthy' as const, data: null, message: '0 copies', lastCheck: now },
        briefings:      { status: 'healthy' as const, data: null, message: '0 briefings', lastCheck: now },
      },
    };

    try {
      const result = await Promise.race([
        query(`
          SELECT
            (SELECT COUNT(*) FROM library_items WHERE client_id = $1 AND tenant_id = $2) as lib_total,
            (SELECT COUNT(*) FROM library_items WHERE client_id = $1 AND tenant_id = $2 AND status = 'ready') as lib_ready,
            (SELECT COUNT(*) FROM library_items WHERE client_id = $1 AND tenant_id = $2 AND status = 'error') as lib_error,
            (SELECT COUNT(*) FROM clipping_matches WHERE client_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '30 days') as clip_total,
            (SELECT COUNT(*) FROM social_listening_trends WHERE client_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '7 days') as social_total,
            (SELECT COUNT(*) FROM events WHERE date IS NOT NULL AND length(date) = 10 AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD')) as cal_total,
            (SELECT COUNT(*) FROM events WHERE date IS NOT NULL AND length(date) = 10 AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD') AND date <= to_char(CURRENT_DATE + INTERVAL '14 days', 'YYYY-MM-DD')) as cal_upcoming,
            (SELECT COUNT(*) FROM ai_opportunities WHERE client_id = $1 AND tenant_id = $2 AND status != 'dismissed') as opp_total,
            (SELECT COUNT(*) FROM ai_opportunities WHERE client_id = $1 AND tenant_id = $2 AND status != 'dismissed' AND priority = 'urgent') as opp_urgent,
            (SELECT COUNT(*) FROM edro_copy_versions ecv JOIN edro_briefings eb ON eb.id = ecv.briefing_id WHERE eb.client_id = $1 AND ecv.created_at > NOW() - INTERVAL '90 days') as copies_total,
            (SELECT COUNT(*) FROM edro_briefings WHERE client_id = $1 AND created_at > NOW() - INTERVAL '90 days') as brief_total
        `, [clientId, tenantId]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Health timed out')), 8000)),
      ]);

      const r = result.rows?.[0] || {};
      const n = (v: any) => Number(v) || 0;

      type HS = 'healthy' | 'warning' | 'error';
      const src = (status: HS, message: string, data?: any) => ({ status, data: data ?? null, message, lastCheck: now });

      const libTotal = n(r.lib_total); const libReady = n(r.lib_ready); const libError = n(r.lib_error);
      const clipTotal = n(r.clip_total);
      const socialTotal = n(r.social_total);
      const calTotal = n(r.cal_total); const calUpcoming = n(r.cal_upcoming);
      const oppTotal = n(r.opp_total); const oppUrgent = n(r.opp_urgent);
      const copiesTotal = n(r.copies_total);
      const briefTotal = n(r.brief_total);

      const health = {
        overall: 'healthy' as HS,
        sources: {
          library: libError > 0
            ? src('warning', `${libError} item(s) com erro`)
            : libTotal === 0
              ? src('warning', 'Nenhum item na library')
              : src('healthy', `${libReady} item(s) pronto(s)`),
          clipping: clipTotal === 0
            ? src('warning', 'Nenhum clipping nos ultimos 30 dias')
            : src('healthy', `${clipTotal} matches ativos`),
          social: socialTotal === 0
            ? src('warning', 'Nenhum dado social nos ultimos 7 dias')
            : src('healthy', `${socialTotal} trends detectadas`),
          calendar: calTotal === 0
            ? src('warning', 'Nenhum evento futuro cadastrado')
            : src('healthy', `${calUpcoming} eventos proximos`),
          opportunities: oppUrgent > 0
            ? src('warning', `${oppUrgent} oportunidade(s) urgente(s)`)
            : src('healthy', `${oppTotal} oportunidades ativas`),
          antiRepetition: src('healthy', `${copiesTotal} copies recentes`),
          briefings: src('healthy', `${briefTotal} briefings (ultimos 90 dias)`),
        },
      };

      const warnCount = Object.values(health.sources).filter(s => s.status === 'warning').length;
      if (warnCount > 2) health.overall = 'warning';

      return reply.send({ success: true, data: health });
    } catch (error: any) {
      request.log?.error({ err: error, clientId }, 'health_check_failed');
      return reply.send({ success: true, data: defaultHealth });
    }
  });

  // POST /clients/:id/planning/context - Load intelligence stats via single DB query
  // Single SQL with scalar subqueries — uses 1 DB connection instead of 7
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/context', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';

    // Default zero stats — returned immediately if DB query fails
    const zeroStats = {
      library: { totalItems: 0 },
      clipping: { totalMatches: 0, topKeywords: [] as string[] },
      social: { totalMentions: 0, sentimentAvg: 50 },
      calendar: { next14Days: 0, highRelevance: 0 },
      opportunities: { active: 0, urgent: 0, highConfidence: 0 },
      briefings: { recent: 0, pending: 0 },
      copies: { recentHashes: 0, usedAngles: 0 },
    };

    try {
      // Single SQL query with scalar subqueries — 1 DB connection, fast
      const result = await Promise.race([
        query(`
          SELECT
            (SELECT COUNT(*) FROM library_items WHERE client_id = $1 AND tenant_id = $2 AND status = 'ready') as library_total,
            (SELECT COUNT(*) FROM clipping_matches WHERE client_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '30 days' AND score > 70) as clipping_total,
            (SELECT COALESCE(SUM(mention_count), 0) FROM social_listening_trends WHERE client_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '7 days') as social_mentions,
            (SELECT COALESCE(AVG(average_sentiment), 50) FROM social_listening_trends WHERE client_id = $1 AND tenant_id = $2 AND created_at > NOW() - INTERVAL '7 days') as social_sentiment,
            (SELECT COUNT(*) FROM events WHERE date IS NOT NULL AND length(date) = 10 AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD') AND date <= to_char(CURRENT_DATE + INTERVAL '14 days', 'YYYY-MM-DD')) as calendar_next14,
            (SELECT COUNT(*) FROM events WHERE date IS NOT NULL AND length(date) = 10 AND date >= to_char(CURRENT_DATE, 'YYYY-MM-DD') AND date <= to_char(CURRENT_DATE + INTERVAL '14 days', 'YYYY-MM-DD') AND base_relevance > 80) as calendar_high_rel,
            (SELECT COUNT(*) FROM ai_opportunities WHERE client_id = $1 AND tenant_id = $2 AND status != 'dismissed') as opps_total,
            (SELECT COUNT(*) FROM ai_opportunities WHERE client_id = $1 AND tenant_id = $2 AND status != 'dismissed' AND priority = 'urgent') as opps_urgent,
            (SELECT COUNT(*) FROM ai_opportunities WHERE client_id = $1 AND tenant_id = $2 AND status != 'dismissed' AND confidence >= 80) as opps_high,
            (SELECT COUNT(*) FROM edro_briefings WHERE client_id = $1 AND created_at > NOW() - INTERVAL '90 days') as briefings_total,
            (SELECT COUNT(*) FROM edro_briefings WHERE client_id = $1 AND created_at > NOW() - INTERVAL '90 days' AND status NOT IN ('done', 'cancelled')) as briefings_pending,
            (SELECT COUNT(*) FROM edro_copy_versions ecv JOIN edro_briefings eb ON eb.id = ecv.briefing_id WHERE eb.client_id = $1 AND ecv.created_at > NOW() - INTERVAL '90 days') as copies_total
        `, [clientId, tenantId]),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Context query timed out')), 8000)),
      ]);

      const row = result.rows?.[0] || {};
      const n = (val: any, fallback = 0) => Number(val) || fallback;

      const stats = {
        library: { totalItems: n(row.library_total) },
        clipping: { totalMatches: n(row.clipping_total), topKeywords: [] as string[] },
        social: { totalMentions: n(row.social_mentions), sentimentAvg: n(row.social_sentiment, 50) },
        calendar: { next14Days: n(row.calendar_next14), highRelevance: n(row.calendar_high_rel) },
        opportunities: {
          active: n(row.opps_total),
          urgent: n(row.opps_urgent),
          highConfidence: n(row.opps_high),
        },
        briefings: { recent: n(row.briefings_total), pending: n(row.briefings_pending) },
        copies: { recentHashes: n(row.copies_total), usedAngles: 0 },
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
          stats: zeroStats,
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

  // POST /clients/:id/planning/bootstrap - Seed initial data for a client
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/planning/bootstrap', {
    preHandler: [authGuard, tenantGuard],
  }, async (request, reply) => {
    const { clientId } = request.params;
    const tenantId = (request as any).tenantId || 'default';
    const results: Record<string, any> = {};

    // 1) Ensure calendar events exist
    try {
      results.calendar = { imported: await ensureCalendarEvents() };
    } catch (e: any) {
      results.calendar = { error: e?.message };
    }

    // 2) Run opportunity detection if none exist
    try {
      const { rows } = await query(
        `SELECT COUNT(*) as total FROM ai_opportunities WHERE client_id = $1 AND tenant_id = $2 AND status != 'dismissed'`,
        [clientId, tenantId],
      );
      if (Number(rows[0]?.total) === 0) {
        const count = await detectOpportunitiesForClient({ tenant_id: tenantId, client_id: clientId });
        results.opportunities = { detected: count };
      } else {
        results.opportunities = { existing: Number(rows[0]?.total) };
      }
    } catch (e: any) {
      results.opportunities = { error: e?.message };
    }

    return reply.send({ success: true, data: results });
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
