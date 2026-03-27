import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../auth/rbac';
import { getJarvisAlerts, dismissAlert, snoozeAlert } from '../services/jarvisAlertEngine';
import { query } from '../db';
import { getFallbackProvider, type UsageContext } from '../services/ai/copyOrchestrator';
import { runToolUseLoop, type LoopMessage } from '../services/ai/toolUseLoop';
import { getAllToolDefinitions, getOperationsToolDefinitions } from '../services/ai/toolDefinitions';
import { executeOperationsTool, type OperationsToolContext, type ToolContext } from '../services/ai/toolExecutor';
import {
  buildAgentSystemPrompt,
  buildClientContext,
  loadPerformanceContext,
  loadPsychContext,
  mapProviderToCopy,
  resolveEdroClientId,
} from './planning';
import { buildOperationsSystemPrompt } from './operations';
import {
  buildInlineAttachmentContext,
  buildJarvisObservability,
  buildJarvisRoutingDecision,
  detectJarvisIntent,
  loadUnifiedConversationHistory,
  saveUnifiedConversation,
} from '../services/jarvisPolicyService';

const jarvisChatSchema = z.object({
  message: z.string().min(1),
  clientId: z.string().trim().min(1).optional().nullable(),
  provider: z.enum(['openai', 'anthropic', 'google', 'collaborative']).optional().default('openai'),
  conversationId: z.string().uuid().nullish(),
  context_page: z.string().optional().nullable(),
  studio_context: z.string().optional().nullable(),
  inline_attachments: z.array(z.object({
    name: z.string(),
    text: z.string(),
  })).optional(),
});

export default async function jarvisRoutes(app: FastifyInstance) {
  app.post('/jarvis/chat', { preHandler: [authGuard] }, async (request: any, reply) => {
    const startMs = Date.now();
    const tenantId = request.user?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const userEmail = request.user?.email as string | undefined;

    let body: z.infer<typeof jarvisChatSchema>;
    try {
      body = jarvisChatSchema.parse(request.body);
    } catch {
      return reply.status(400).send({ success: false, error: 'Mensagem inválida.' });
    }

    const intent = detectJarvisIntent(body.message, body.context_page);
    const decision = buildJarvisRoutingDecision(intent);
    const clientId = body.clientId ?? null;
    const edroClientId = clientId ? await resolveEdroClientId(clientId) : null;
    const conversationHistory = await loadUnifiedConversationHistory({
      route: decision.route,
      tenantId,
      conversationId: body.conversationId,
      edroClientId,
    });
    const attachmentContext = buildInlineAttachmentContext(body.inline_attachments);
    const studioContext = body.studio_context ? `\n\nCONTEXTO DO STUDIO:\n${body.studio_context}` : '';
    const userContent = `${body.message}${attachmentContext}${studioContext}`;

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
        const toolCtx: OperationsToolContext = { tenantId, userId: userId ?? undefined, userEmail };
        const loopResult = await Promise.race([
          runToolUseLoop({
            messages: [...conversationHistory, { role: 'user', content: userContent }],
            systemPrompt: buildOperationsSystemPrompt(),
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
      } else {
        const [clientContext, psychContext, perfContext] = await Promise.race([
          Promise.all([
            buildClientContext(tenantId, clientId!),
            loadPsychContext(tenantId, clientId!),
            loadPerformanceContext(clientId!),
          ]),
          new Promise<[string, string, string]>((resolve) => setTimeout(() => resolve(['', '', '']), 3000)),
        ]);

        const toolCtx: ToolContext = {
          tenantId,
          clientId: clientId!,
          edroClientId,
          userId: userId ?? undefined,
          userEmail,
        };
        const loopResult = await Promise.race([
          runToolUseLoop({
            messages: [...conversationHistory, { role: 'user', content: userContent }],
            systemPrompt: buildAgentSystemPrompt(clientContext, psychContext, perfContext),
            tools: getAllToolDefinitions(),
            provider: resolvedProvider,
            toolContext: toolCtx,
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
      }

      const durationMs = Date.now() - startMs;
      const observability = buildJarvisObservability(decision, {
        durationMs,
        toolsUsed,
        provider: resultProvider,
        model: resultModel,
      });

      const savedConversationId = await saveUnifiedConversation({
        route: decision.route,
        tenantId,
        edroClientId,
        userId,
        conversationId: body.conversationId,
        message: body.message,
        assistantContent: finalText,
        provider: resultProvider || body.provider,
        observability,
      }).catch(() => body.conversationId || null);

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
}
