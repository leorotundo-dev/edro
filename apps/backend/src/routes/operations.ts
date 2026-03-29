import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import {
  buildOverviewSnapshot,
  buildCalendarSnapshot,
  buildPlannerSnapshot,
  buildRiskSnapshot,
  dropJobAllocation,
  rebuildOperationalRuntime,
  syncOperationalRuntimeForJob,
  upsertJobAllocation,
} from '../services/jobs/operationsRuntimeService';
import { query } from '../db';
import { rebuildOperationalSignals } from '../services/signalService';
import { getOperationsToolDefinitions } from '../services/ai/toolDefinitions';
import { executeOperationsTool, type OperationsToolContext } from '../services/ai/toolExecutor';
import { runToolUseLoop } from '../services/ai/toolUseLoop';
import { getFallbackProvider, type UsageContext } from '../services/ai/copyOrchestrator';
import {
  buildJarvisObservability,
  buildJarvisRoutingDecision,
  detectJarvisIntent,
  loadUnifiedConversationHistory,
  saveUnifiedConversation,
} from '../services/jarvisPolicyService';
import { buildJarvisMemoryBlocks, formatJarvisMemoryBlocks } from '../services/jarvisMemoryFabricService';

const allocationSchema = z.object({
  job_id: z.string().uuid(),
  owner_id: z.string().uuid(),
  status: z.enum(['tentative', 'committed', 'blocked', 'done', 'dropped']).default('committed'),
  planned_minutes: z.number().int().min(0).max(10080).optional(),
  starts_at: z.string().datetime().optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable(),
});

export default async function operationsRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.post('/operations/rebuild', { preHandler: [requirePerm('clients:write'), requirePerm('portfolio:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const data = await rebuildOperationalRuntime(tenantId);
    return { success: true, data };
  });

  app.post('/operations/allocations', { preHandler: [requirePerm('clients:write'), requirePerm('portfolio:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const changedBy = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const body = allocationSchema.parse(request.body);
    const data = await upsertJobAllocation(tenantId, {
      jobId: body.job_id,
      ownerId: body.owner_id,
      status: body.status,
      plannedMinutes: body.planned_minutes,
      startsAt: body.starts_at ?? null,
      endsAt: body.ends_at ?? null,
      notes: body.notes ?? null,
      changedBy,
    });
    await syncOperationalRuntimeForJob(tenantId, body.job_id);
    return { success: true, data };
  });

  app.delete('/operations/allocations/:jobId', { preHandler: [requirePerm('clients:write'), requirePerm('portfolio:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const changedBy = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const { jobId } = request.params as { jobId: string };
    const data = await dropJobAllocation(tenantId, jobId, changedBy);
    await syncOperationalRuntimeForJob(tenantId, jobId);
    return { success: true, data };
  });

  app.get('/operations/planner', { preHandler: [requirePerm('clients:read'), requirePerm('portfolio:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const data = await buildPlannerSnapshot(tenantId);
    return { success: true, data };
  });

  app.get('/operations/overview', { preHandler: [requirePerm('clients:read'), requirePerm('portfolio:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const data = await buildOverviewSnapshot(tenantId);
    return { success: true, data };
  });

  app.get('/operations/calendar', { preHandler: [requirePerm('clients:read'), requirePerm('portfolio:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const data = await buildCalendarSnapshot(tenantId);
    return { success: true, data };
  });

  app.get('/operations/risks', { preHandler: [requirePerm('clients:read'), requirePerm('portfolio:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const data = await buildRiskSnapshot(tenantId);
    return { success: true, data };
  });

  // ─── Signals feed ───

  app.get('/operations/signals', { preHandler: [requirePerm('clients:read'), requirePerm('portfolio:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const qs = request.query as { limit?: string };
    const limit = Math.min(Number(qs.limit || 30), 100);

    const { rows } = await query(
      `SELECT id, domain, signal_type, severity, title, summary,
              entity_type, entity_id, client_id, client_name,
              actions, created_at, snoozed_until
       FROM operational_signals
       WHERE tenant_id = $1
         AND resolved_at IS NULL
         AND (snoozed_until IS NULL OR snoozed_until < now())
       ORDER BY severity DESC, created_at DESC
       LIMIT $2`,
      [tenantId, limit],
    );

    return { success: true, data: rows };
  });

  app.post('/operations/signals/:id/resolve', { preHandler: [requirePerm('clients:write'), requirePerm('portfolio:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const { id } = request.params as { id: string };

    await query(
      `UPDATE operational_signals SET resolved_at = now(), resolved_by = $3
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId, userId],
    );
    return { success: true };
  });

  app.post('/operations/signals/:id/snooze', { preHandler: [requirePerm('clients:write'), requirePerm('portfolio:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const { id } = request.params as { id: string };
    const body = request.body as { hours?: number };
    const hours = Math.min(Number(body.hours || 4), 72);

    await query(
      `UPDATE operational_signals SET snoozed_until = now() + ($3 || ' hours')::interval
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId, String(hours)],
    );
    return { success: true };
  });

  app.post('/operations/signals/rebuild', { preHandler: [requirePerm('clients:write'), requirePerm('portfolio:read')] }, async (request: any) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    await rebuildOperationalSignals(tenantId);
    return { success: true };
  });

  // ─── Jarvis Operations Chat ───

  const opsChatSchema = z.object({
    message: z.string().min(1),
    provider: z.enum(['openai', 'anthropic', 'google']).optional().default('openai'),
    conversationId: z.string().uuid().nullish(),
  });

  app.post('/operations/chat', { preHandler: [requirePerm('clients:write'), requirePerm('portfolio:read')] }, async (request: any, reply) => {
    const startMs = Date.now();
    const tenantId = (request.user as any)?.tenant_id as string;
    const userId = ((request.user as any)?.sub || (request.user as any)?.id || null) as string | null;
    const userEmail = (request.user as any)?.email as string | undefined;

    let body: z.infer<typeof opsChatSchema>;
    try {
      body = opsChatSchema.parse(request.body);
    } catch {
      return reply.status(400).send({ success: false, error: 'Mensagem inválida.' });
    }

    const providerMap: Record<string, 'openai' | 'claude' | 'gemini'> = {
      openai: 'openai', anthropic: 'claude', google: 'gemini',
    };
    const resolvedProvider = getFallbackProvider(providerMap[body.provider] || 'openai');

    const usageCtx: UsageContext | undefined = tenantId && tenantId !== 'default'
      ? { tenant_id: tenantId, feature: 'operations_chat' }
      : undefined;
    const intent = detectJarvisIntent(body.message, '/operations');
    const decision = buildJarvisRoutingDecision(intent);
    const conversationHistory = await loadUnifiedConversationHistory({
      route: 'operations',
      tenantId,
      conversationId: body.conversationId,
      edroClientId: null,
    });

    const toolCtx: OperationsToolContext = { tenantId, userId: userId ?? undefined, userEmail };

    const loopMessages = [
      ...conversationHistory,
      { role: 'user' as const, content: body.message },
    ];

    const memoryBlocks = await buildJarvisMemoryBlocks({
      tenantId,
      memories: [decision.primaryMemory, ...decision.secondaryMemories.filter((memory): memory is any => memory === 'client_memory' || memory === 'operations_memory')],
      maxBlocks: decision.retrievalBudget.contextBlocks,
    });
    const systemPrompt = buildOperationsSystemPrompt(formatJarvisMemoryBlocks(memoryBlocks));

    try {
      const agentTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('OPS_AGENT_TIMEOUT_60s')), 60000),
      );
      const loopResult = await Promise.race([
        runToolUseLoop({
          messages: loopMessages,
          systemPrompt,
          tools: getOperationsToolDefinitions(),
          provider: resolvedProvider,
          toolContext: toolCtx,
          maxIterations: decision.retrievalBudget.toolIterations,
          temperature: 0.5,
          maxTokens: 4096,
          usageContext: usageCtx,
          toolExecutorFn: executeOperationsTool,
        }),
        agentTimeout,
      ]);

      const convId = await saveUnifiedConversation({
        route: 'operations',
        tenantId,
        edroClientId: null,
        userId,
        conversationId: body.conversationId,
        message: body.message,
        assistantContent: loopResult.finalText,
        provider: loopResult.provider,
        observability: buildJarvisObservability(decision, {
          durationMs: Date.now() - startMs,
          toolsUsed: loopResult.toolCallsExecuted,
          provider: loopResult.provider,
          model: loopResult.model,
          loadedMemoryBlocks: memoryBlocks.map((block) => block.label),
        }),
      }).catch(() => body.conversationId || null);

      const elapsed = Date.now() - startMs;
      const observability = buildJarvisObservability(decision, {
        durationMs: elapsed,
        toolsUsed: loopResult.toolCallsExecuted,
        provider: loopResult.provider,
        model: loopResult.model,
        loadedMemoryBlocks: memoryBlocks.map((block) => block.label),
      });
      request.log?.info({
        event: 'operations_chat_completed',
        conversationId: convId,
        iterations: loopResult.iterations,
        ...observability,
      });

      return {
        success: true,
        data: {
          message: loopResult.finalText,
          conversationId: convId,
          provider: loopResult.provider,
          model: loopResult.model,
          toolsUsed: loopResult.toolCallsExecuted,
          intent: decision.intent,
          primaryMemory: decision.primaryMemory,
          secondaryMemories: decision.secondaryMemories,
          durationMs: elapsed,
          observability,
        },
      };
    } catch (err: any) {
      const elapsed = Date.now() - startMs;
      request.log?.error({
        event: 'operations_chat_failed',
        intent: decision.intent,
        route: decision.route,
        durationMs: elapsed,
        error: err?.message || 'unknown',
      });
      return reply.status(500).send({
        success: false,
        error: `Falha no agente de operações (${err?.message || 'unknown'}). Tempo: ${elapsed}ms.`,
      });
    }
  });
}

export function buildOperationsSystemPrompt(memoryFabric?: string): string {
  return `Você é o Jarvis — diretor de operações da agência EDRO, com controle total sobre a central de operações.
Você gerencia jobs, alocações, prazos, status, riscos e sinais operacionais.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAPACIDADES (use ferramentas)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 JOBS — listar, criar, atualizar, mudar status, atribuir responsável
👥 EQUIPE — ver membros, capacidade, carga de trabalho
⚠️ RISCOS — ver jobs em risco, atrasados, bloqueados, sem dono
🔔 SINAIS — alertas operacionais (resolver, adiar)
📊 VISÃO GERAL — snapshot completo da operação
🗓️ ALOCAÇÕES — gerenciar alocação de jobs para membros da equipe
🧑‍🎨 CREATIVE OPS — medir carga criativa, ver capacidade dos DAs/freelas, ler risco por responsável, qualidade/retrabalho, gargalos por etapa e sugerir melhor responsável por job e redistribuição de carga
🔧 LOOKUPS — tipos de job, skills, canais, clientes e owners disponíveis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGRAS DE OPERAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔧 Use ferramentas para acessar dados reais. Nunca invente jobs, membros ou métricas.
📋 Quando pedido for ambíguo (ex: "o que tá pegando?"), consulte riscos E sinais para dar uma visão completa.
👤 Para atribuir alguém, primeiro consulte a equipe (get_operations_team) para saber quem está disponível.
⚡ Para criar um job, primeiro consulte lookups (get_operations_lookups) para validar tipos, clientes e owners.
📊 Quando perguntarem sobre a operação em geral, use get_operations_overview para dados consolidados.
🧠 Quando perguntarem sobre sobrecarga, capacidade, melhor DA, risco criativo, retrabalho, aprovação ou gargalos, use get_creative_ops_workload, get_da_capacity, get_creative_ops_risk_report, get_creative_ops_quality, get_creative_ops_bottlenecks, suggest_job_allocation e suggest_creative_redistribution.
🛡️ Para redistribuir carga, sugira primeiro; só execute assign_job_owner/manage_job_allocation se o usuário pedir explicitamente para aplicar.
✅ Quando o usuário confirmar explicitamente "aplica", "pode mover", "executa" ou equivalente, use apply_job_allocation_recommendation ou apply_creative_redistribution para materializar a mudança.
♻️ Quando a conversa estiver continuando um workflow já iniciado, reutilize os IDs e o CONTEXTO DE WORKFLOW carregado do histórico em vez de pedir os mesmos dados de novo.

📋 SEMPRE:
- Responda em português brasileiro
- Seja direto e operacional — entregue resultado, não instruções
- Confirme ações realizadas com detalhes (ex: "Job 'Post Instagram Ciclus' movido de in_progress → in_review")
- Quando listar jobs, formate como tabela ou lista organizada com cliente, status e prazo
- Use emojis para status: 🔴 bloqueado/atrasado 🟡 em risco 🟢 em dia ⚪ não iniciado
${memoryFabric ? `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nMEMÓRIAS CANÔNICAS CARREGADAS\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${memoryFabric}` : ''}`;
}
