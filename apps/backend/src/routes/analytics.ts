import { FastifyInstance } from 'fastify';
import { query } from '../db/db';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { buildContentIntelligenceReport } from '../services/contentIntelligenceService';
import { GeminiService } from '../services/ai/geminiService';
import { OpenAIService } from '../services/ai/openaiService';
import { ClaudeService } from '../services/ai/claudeService';
import { logAiUsage, logTavilyUsage } from '../services/ai/aiUsageLogger';
import { tavilySearch, isTavilyConfigured } from '../services/tavilyService';
import { getFallbackProvider, type CopyProvider } from '../services/ai/copyOrchestrator';

// ── Helpers ─────────────────────────────────────────────────────────────────

type CompletionParams = { prompt: string; systemPrompt?: string; temperature?: number; maxTokens?: number };

async function runAi(preferred: CopyProvider, params: CompletionParams) {
  const provider = getFallbackProvider(preferred);
  switch (provider) {
    case 'gemini':  return { ...(await GeminiService.generateCompletion(params)), provider };
    case 'openai':  return { ...(await OpenAIService.generateCompletion(params)), provider };
    case 'claude':  return { ...(await ClaudeService.generateCompletion(params)), provider };
    default: throw new Error(`Unknown provider: ${String(provider)}`);
  }
}

async function resolveEdroClient(tenantId: string, clientRef: string) {
  const { rows } = await query<{ id: string; name: string; segment: string | null; edro_id: string | null }>(
    `SELECT c.id, c.name, c.segment_primary AS segment,
       (SELECT ec.id::text FROM edro_clients ec WHERE LOWER(ec.name) = LOWER(c.name) LIMIT 1) AS edro_id
     FROM clients c
     WHERE c.tenant_id = $1 AND (c.id::text = $2 OR LOWER(c.name) = LOWER($2))
     LIMIT 1`,
    [tenantId, clientRef]
  );
  return rows[0] ?? null;
}

// ── Plugin ───────────────────────────────────────────────────────────────────

export default async function analyticsRoutes(app: FastifyInstance) {

  // ────────────────────────────────────────────────────────────────────────────
  // 1. HEALTH SCORE
  // Composite score (0-100) measuring client relationship health
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/clients/:clientId/health-score', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;

    const client = await resolveEdroClient(tenantId, clientId);
    if (!client || !client.edro_id) {
      return reply.status(404).send({ error: 'Client not found or not linked to Edro' });
    }
    const edroId = client.edro_id;

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 3600 * 1000).toISOString();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString();

    // --- On-time delivery rate (30%) ---
    const { rows: onTimeRows } = await query<{ total: string; on_time: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'done') AS total,
         COUNT(*) FILTER (WHERE status = 'done' AND (due_at IS NULL OR updated_at <= due_at)) AS on_time
       FROM edro_briefings
       WHERE client_id = $1 AND created_at >= $2`,
      [edroId, thirtyDaysAgo]
    );
    const totalCompleted = parseInt(onTimeRows[0]?.total || '0');
    const onTimeCount = parseInt(onTimeRows[0]?.on_time || '0');
    const onTimeRate = totalCompleted > 0 ? onTimeCount / totalCompleted : 0.5; // default 50% if no data

    // --- Stage velocity score (25%) ---
    // Compare avg stage duration vs benchmark of 24h
    const { rows: velocityRows } = await query<{ avg_hours: string }>(
      `SELECT AVG(
         EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600
       ) AS avg_hours
       FROM edro_briefing_stages
       WHERE briefing_id IN (
         SELECT id FROM edro_briefings WHERE client_id = $1 AND created_at >= $2
       ) AND updated_at > created_at`,
      [edroId, thirtyDaysAgo]
    );
    const avgHours = parseFloat(velocityRows[0]?.avg_hours || '24');
    // 0h=100pts, 24h=80pts, 48h=60pts, 72h=40pts, 96h+=0pts
    const velocityScore = Math.max(0, Math.min(100, 100 - (avgHours / 96) * 100));

    // --- Copy approval rate (20%) ---
    const { rows: copyRows } = await query<{ total: string; approved: string }>(
      `SELECT COUNT(*) AS total,
         COUNT(*) FILTER (WHERE status = 'approved') AS approved
       FROM edro_copy_versions
       WHERE briefing_id IN (
         SELECT id FROM edro_briefings WHERE client_id = $1 AND created_at >= $2
       )`,
      [edroId, thirtyDaysAgo]
    );
    const totalCopies = parseInt(copyRows[0]?.total || '0');
    const approvedCopies = parseInt(copyRows[0]?.approved || '0');
    const approvalRate = totalCopies > 0 ? approvedCopies / totalCopies : 0.5;

    // --- Volume growth (15%) ---
    const { rows: volumeRows } = await query<{ current_count: string; previous_count: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE created_at >= $2) AS current_count,
         COUNT(*) FILTER (WHERE created_at >= $3 AND created_at < $2) AS previous_count
       FROM edro_briefings WHERE client_id = $1`,
      [edroId, thirtyDaysAgo, sixtyDaysAgo]
    );
    const current = parseInt(volumeRows[0]?.current_count || '0');
    const previous = parseInt(volumeRows[0]?.previous_count || '0');
    const growthRate = previous > 0 ? (current - previous) / previous : 0;
    const volumeScore = Math.min(100, Math.max(0, 50 + growthRate * 50));

    // --- Recent activity score (10%) ---
    const { rows: activityRows } = await query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM edro_briefings
       WHERE client_id = $1 AND updated_at >= $2`,
      [edroId, sevenDaysAgo]
    );
    const recentActivity = parseInt(activityRows[0]?.count || '0');
    const activityScore = Math.min(100, recentActivity * 20); // 5+ activities = 100

    // --- Composite Score ---
    const score = Math.round(
      onTimeRate * 100 * 0.30 +
      velocityScore * 0.25 +
      approvalRate * 100 * 0.20 +
      volumeScore * 0.15 +
      activityScore * 0.10
    );

    const status =
      score >= 80 ? 'excellent' :
      score >= 60 ? 'good' :
      score >= 40 ? 'warning' : 'critical';

    const statusColor =
      status === 'excellent' ? '#13DEB9' :
      status === 'good' ? '#5D87FF' :
      status === 'warning' ? '#FFAE1F' : '#FA896B';

    return {
      score,
      status,
      statusColor,
      breakdown: [
        { label: 'Entrega no Prazo', weight: 30, score: Math.round(onTimeRate * 100), value: `${Math.round(onTimeRate * 100)}%` },
        { label: 'Velocidade de Etapas', weight: 25, score: Math.round(velocityScore), value: `${avgHours.toFixed(1)}h/etapa` },
        { label: 'Taxa de Aprovação', weight: 20, score: Math.round(approvalRate * 100), value: `${Math.round(approvalRate * 100)}%` },
        { label: 'Crescimento de Volume', weight: 15, score: Math.round(volumeScore), value: `${current} briefings` },
        { label: 'Atividade Recente', weight: 10, score: activityScore, value: `${recentActivity} updates` },
      ],
      period: { from: thirtyDaysAgo.slice(0, 10), to: now.toISOString().slice(0, 10) },
      client_name: client.name,
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 2. BOTTLENECK ALERTS (Gargalo Alert)
  // Briefings stuck in a stage longer than expected
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/clients/:clientId/bottleneck-alerts', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;
    const { threshold_hours = '24' } = req.query as { threshold_hours?: string };

    const client = await resolveEdroClient(tenantId, clientId);
    if (!client || !client.edro_id) return reply.status(404).send({ error: 'Client not found' });

    const thresholdH = Math.max(1, parseInt(threshold_hours));

    const { rows: stuckBriefings } = await query<{
      briefing_id: string;
      title: string;
      current_stage: string;
      stage_entered_at: string;
      hours_stuck: number;
    }>(
      `SELECT
         b.id AS briefing_id,
         b.title,
         s.stage AS current_stage,
         s.created_at AS stage_entered_at,
         EXTRACT(EPOCH FROM (NOW() - s.created_at)) / 3600 AS hours_stuck
       FROM edro_briefings b
       JOIN LATERAL (
         SELECT stage, created_at FROM edro_briefing_stages
         WHERE briefing_id = b.id ORDER BY position DESC LIMIT 1
       ) s ON TRUE
       WHERE b.client_id = $1
         AND b.status NOT IN ('done', 'cancelled')
         AND EXTRACT(EPOCH FROM (NOW() - s.created_at)) / 3600 > $2
       ORDER BY hours_stuck DESC`,
      [client.edro_id, thresholdH]
    );

    const alerts = stuckBriefings.map((b) => {
      const h = Math.round(b.hours_stuck);
      const severity = h > 72 ? 'critical' : h > 48 ? 'high' : h > 24 ? 'warning' : 'info';
      const severityColor = severity === 'critical' ? '#FA896B' : severity === 'high' ? '#ff6600' : severity === 'warning' ? '#FFAE1F' : '#5D87FF';
      return {
        briefing_id: b.briefing_id,
        title: b.title,
        current_stage: b.current_stage,
        hours_stuck: h,
        stage_entered_at: b.stage_entered_at,
        severity,
        severityColor,
        message: `"${b.title}" está em "${b.current_stage}" há ${h}h`,
      };
    });

    return {
      total: alerts.length,
      critical: alerts.filter((a) => a.severity === 'critical').length,
      alerts,
      threshold_hours: thresholdH,
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 3. PROOF OF VALUE
  // AI-generated monthly value report for client presentation
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/clients/:clientId/proof-of-value', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;
    const { from, to, retainer_value } = req.body as { from?: string; to?: string; retainer_value?: number };

    const client = await resolveEdroClient(tenantId, clientId);
    if (!client || !client.edro_id) return reply.status(404).send({ error: 'Client not found' });

    const periodFrom = from || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const periodTo = to || new Date().toISOString().slice(0, 10);

    // Collect data
    const [briefingsResult, copiesResult, stagesResult] = await Promise.all([
      query<{ total: string; completed: string; overdue: string }>(
        `SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'done') AS completed,
           COUNT(*) FILTER (WHERE due_at < NOW() AND status != 'done') AS overdue
         FROM edro_briefings
         WHERE client_id = $1 AND created_at BETWEEN $2 AND $3`,
        [client.edro_id, periodFrom, periodTo]
      ),
      query<{ total: string; avg_chars: string }>(
        `SELECT COUNT(cv.*) AS total, AVG(LENGTH(cv.output)) AS avg_chars
         FROM edro_copy_versions cv
         JOIN edro_briefings b ON b.id = cv.briefing_id
         WHERE b.client_id = $1 AND cv.created_at BETWEEN $2 AND $3`,
        [client.edro_id, periodFrom, periodTo]
      ),
      query<{ stage: string; avg_hours: string }>(
        `SELECT s.stage, AVG(EXTRACT(EPOCH FROM (s.updated_at - s.created_at))/3600) AS avg_hours
         FROM edro_briefing_stages s
         JOIN edro_briefings b ON b.id = s.briefing_id
         WHERE b.client_id = $1 AND s.created_at BETWEEN $2 AND $3 AND s.updated_at > s.created_at
         GROUP BY s.stage ORDER BY avg_hours DESC`,
        [client.edro_id, periodFrom, periodTo]
      ),
    ]);

    const summary = briefingsResult.rows[0];
    const copies = copiesResult.rows[0];
    const avgCopyChars = Math.round(parseFloat(copies?.avg_chars || '0'));
    const totalCopies = parseInt(copies?.total || '0');
    const totalBriefings = parseInt(summary?.total || '0');
    const completedBriefings = parseInt(summary?.completed || '0');
    const completionRate = totalBriefings > 0 ? Math.round(completedBriefings / totalBriefings * 100) : 0;

    // Estimated value: R$150/h copywriter, ~3h per copy average
    const estimatedHoursSaved = totalCopies * 3;
    const estimatedMarketValue = estimatedHoursSaved * 150;

    const prompt = `Você é um estrategista de marketing da agência Edro Studio apresentando os resultados do mês para o cliente ${client.name}.

Dados do período (${periodFrom} a ${periodTo}):
- Briefings recebidos: ${totalBriefings}
- Briefings concluídos: ${completedBriefings} (${completionRate}% de conclusão)
- Copies/peças produzidas: ${totalCopies}
- Tamanho médio das copies: ${avgCopyChars} caracteres
- Horas estimadas economizadas pelo cliente: ~${estimatedHoursSaved}h
- Valor de mercado estimado: R$ ${estimatedMarketValue.toLocaleString('pt-BR')}
${retainer_value ? `- Valor do retainer: R$ ${retainer_value.toLocaleString('pt-BR')}` : ''}

Escreva um relatório executivo de "Proof of Value" com:
1. **Resumo do Mês** (2-3 linhas impactantes)
2. **Entregas Realizadas** (lista bullet com números)
3. **Valor Gerado** (quantifique em tempo e dinheiro)
4. **Próximo Mês** (2-3 iniciativas planejadas)

Seja objetivo, use dados concretos, tom consultivo e profissional. Máximo 400 palavras.`;

    const t0 = Date.now();
    const result = await runAi('openai', {
      prompt,
      systemPrompt: 'Você é um consultor de marketing sênior. Escreva relatórios claros, orientados a resultados e com linguagem de negócios.',
      temperature: 0.5,
      maxTokens: 800,
    });
    const durationMs = Date.now() - t0;

    logAiUsage({
      tenant_id: tenantId,
      provider: result.provider,
      model: result.model,
      feature: 'proof_of_value',
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      duration_ms: durationMs,
      metadata: { client_id: clientId },
    }).catch(() => {});

    return {
      narrative: result.text,
      data: {
        period: { from: periodFrom, to: periodTo },
        briefings: { total: totalBriefings, completed: completedBriefings, completion_rate: completionRate },
        copies: { total: totalCopies, avg_chars: avgCopyChars },
        value: { hours_saved: estimatedHoursSaved, market_value: estimatedMarketValue, retainer_value: retainer_value ?? null },
      },
      provider: result.provider,
      model: result.model,
      duration_ms: durationMs,
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 4. BRAND VOICE DNA
  // Extracts brand voice characteristics from copy history
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/clients/:clientId/brand-voice', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;

    const client = await resolveEdroClient(tenantId, clientId);
    if (!client || !client.edro_id) return reply.status(404).send({ error: 'Client not found' });

    // Get last 30 approved copies
    const { rows: copyRows } = await query<{ content: string; platform: string | null; briefing_title: string | null }>(
      `SELECT cv.output AS content, b.payload->>'platform' AS platform, b.title AS briefing_title
       FROM edro_copy_versions cv
       JOIN edro_briefings b ON b.id = cv.briefing_id
       WHERE b.client_id = $1 AND cv.status = 'approved' AND cv.output IS NOT NULL
       ORDER BY cv.created_at DESC LIMIT 30`,
      [client.edro_id]
    );

    if (copyRows.length < 3) {
      return reply.status(422).send({ error: 'Copies insuficientes. Aprove pelo menos 3 copies para gerar o DNA de marca.' });
    }

    const copyExamples = copyRows
      .slice(0, 15)
      .map((c, i) => `[${i + 1}] ${c.platform ? `(${c.platform}) ` : ''}${c.content.slice(0, 400)}`)
      .join('\n\n');

    const prompt = `Analise estas ${copyRows.length} copies aprovadas do cliente "${client.name}" e extraia o DNA de comunicação da marca.

COPIES:
${copyExamples}

Retorne JSON com exatamente esta estrutura:
{
  "tone": ["<adjetivo1>", "<adjetivo2>", "<adjetivo3>"],
  "personality": "<1 frase descrevendo a personalidade da marca>",
  "vocabulary": { "preferred": ["<palavra1>", "<palavra2>", "<palavra3>"], "avoid": ["<palavra1>", "<palavra2>"] },
  "sentence_style": "<curtas/médias/longas/variadas>",
  "cta_pattern": "<padrão de call-to-action observado>",
  "content_themes": ["<tema1>", "<tema2>", "<tema3>"],
  "emotional_triggers": ["<gatilho1>", "<gatilho2>"],
  "platform_adaptations": { "<platform>": "<como adapta>" },
  "brand_promise": "<promessa central observada nas copies>",
  "dos": ["<prática1>", "<prática2>", "<prática3>"],
  "donts": ["<evitar1>", "<evitar2>"]
}`;

    const t0 = Date.now();
    const result = await runAi('claude', {
      prompt,
      systemPrompt: 'Você é um especialista em branding e linguagem de marca. Analise padrões de comunicação e retorne JSON estruturado.',
      temperature: 0.2,
      maxTokens: 1200,
    });
    const durationMs = Date.now() - t0;

    let dna: Record<string, any> = {};
    try {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (match) dna = JSON.parse(match[0]);
    } catch {
      dna = { raw: result.text };
    }

    logAiUsage({
      tenant_id: tenantId,
      provider: result.provider,
      model: result.model,
      feature: 'brand_voice_dna',
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      duration_ms: durationMs,
      metadata: { client_id: clientId, copies_analyzed: copyRows.length },
    }).catch(() => {});

    return {
      client_name: client.name,
      copies_analyzed: copyRows.length,
      dna,
      provider: result.provider,
      duration_ms: durationMs,
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 4b. SAVE BRAND VOICE DNA TO CLIENT PROFILE
  // ────────────────────────────────────────────────────────────────────────────
  app.patch('/clients/:clientId/brand-voice', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;
    const { dna } = req.body as { dna: Record<string, any> };

    if (!dna || typeof dna !== 'object') {
      return reply.status(400).send({ error: 'dna é obrigatório' });
    }

    const { rows } = await query<{ profile: Record<string, any> | null }>(
      `SELECT profile FROM clients WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, clientId]
    );
    if (!rows.length) return reply.status(404).send({ error: 'Client not found' });

    const nextProfile = {
      ...(rows[0]?.profile || {}),
      brand_voice: dna,
      brand_voice_saved_at: new Date().toISOString(),
    };

    await query(
      `UPDATE clients SET profile=$1::jsonb, updated_at=NOW() WHERE tenant_id=$2 AND id=$3`,
      [JSON.stringify(nextProfile), tenantId, clientId]
    );

    return reply.send({ ok: true });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 4c. QUALITY SCORE TIMELINE
  // Evolução mensal dos quality scores das copies geradas (pipeline collaborative)
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/clients/:clientId/quality-timeline', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;

    const client = await resolveEdroClient(tenantId, clientId);
    if (!client?.edro_id) return reply.status(404).send({ error: 'Client not found' });

    const { rows } = await query<{
      month: string;
      avg_overall: number;
      avg_brand_dna: number;
      avg_platform: number;
      avg_cta: number;
      count: string;
    }>(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', cv.created_at), 'YYYY-MM') as month,
         ROUND(AVG((cv.payload->>'quality_score')::jsonb->>'overall')::numeric::numeric, 1)     as avg_overall,
         ROUND(AVG((cv.payload->>'quality_score')::jsonb->>'brand_dna_match')::numeric::numeric, 1) as avg_brand_dna,
         ROUND(AVG((cv.payload->>'quality_score')::jsonb->>'platform_fit')::numeric::numeric, 1)   as avg_platform,
         ROUND(AVG((cv.payload->>'quality_score')::jsonb->>'cta_clarity')::numeric::numeric, 1)    as avg_cta,
         COUNT(*)::text as count
       FROM edro_copy_versions cv
       JOIN edro_briefings b ON b.id = cv.briefing_id
       WHERE b.client_id = $1
         AND cv.payload ? 'quality_score'
         AND cv.created_at > NOW() - INTERVAL '6 months'
       GROUP BY DATE_TRUNC('month', cv.created_at)
       ORDER BY DATE_TRUNC('month', cv.created_at)`,
      [client.edro_id]
    );

    return reply.send({ client_name: client.name, timeline: rows });
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 5. BENCHMARK ENTRE CLIENTES
  // Compare client metrics vs anonymized cross-client averages
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/clients/:clientId/benchmark', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;
    const { days = '30' } = req.query as { days?: string };

    const client = await resolveEdroClient(tenantId, clientId);
    if (!client || !client.edro_id) return reply.status(404).send({ error: 'Client not found' });

    const periodFrom = new Date(Date.now() - parseInt(days) * 24 * 3600 * 1000).toISOString();

    // Client metrics
    const { rows: clientMetrics } = await query<{
      total_briefings: string; completed: string; total_copies: string;
      avg_stage_hours: string; overdue: string;
    }>(
      `SELECT
         COUNT(DISTINCT b.id) AS total_briefings,
         COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'done') AS completed,
         COUNT(cv.id) AS total_copies,
         AVG(EXTRACT(EPOCH FROM (s.updated_at - s.created_at))/3600) AS avg_stage_hours,
         COUNT(DISTINCT b.id) FILTER (WHERE b.due_at < NOW() AND b.status != 'done') AS overdue
       FROM edro_briefings b
       LEFT JOIN edro_copy_versions cv ON cv.briefing_id = b.id
       LEFT JOIN edro_briefing_stages s ON s.briefing_id = b.id AND s.updated_at > s.created_at
       WHERE b.client_id = $1 AND b.created_at >= $2`,
      [client.edro_id, periodFrom]
    );

    // Global benchmark (all clients, same tenant, anonymized)
    const { rows: globalMetrics } = await query<{
      avg_briefings: string; avg_completed_rate: string; avg_copies: string;
      avg_stage_hours: string; avg_overdue_rate: string;
    }>(
      `SELECT
         AVG(sub.total_b) AS avg_briefings,
         AVG(sub.completed_rate) AS avg_completed_rate,
         AVG(sub.total_c) AS avg_copies,
         AVG(sub.avg_hours) AS avg_stage_hours,
         AVG(sub.overdue_rate) AS avg_overdue_rate
       FROM (
         SELECT
           b.client_id,
           COUNT(DISTINCT b.id) AS total_b,
           COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'done')::float /
             NULLIF(COUNT(DISTINCT b.id), 0) * 100 AS completed_rate,
           COUNT(cv.id) AS total_c,
           AVG(EXTRACT(EPOCH FROM (s.updated_at - s.created_at))/3600) AS avg_hours,
           COUNT(DISTINCT b.id) FILTER (WHERE b.due_at < NOW() AND b.status != 'done')::float /
             NULLIF(COUNT(DISTINCT b.id), 0) * 100 AS overdue_rate
         FROM edro_briefings b
         LEFT JOIN edro_copy_versions cv ON cv.briefing_id = b.id
         LEFT JOIN edro_briefing_stages s ON s.briefing_id = b.id AND s.updated_at > s.created_at
         WHERE b.created_at >= $1
         GROUP BY b.client_id
       ) sub`,
      [periodFrom]
    );

    const cm = clientMetrics[0];
    const gm = globalMetrics[0];

    const clientTotal = parseInt(cm?.total_briefings || '0');
    const clientCompleted = parseInt(cm?.completed || '0');
    const clientCompletionRate = clientTotal > 0 ? Math.round(clientCompleted / clientTotal * 100) : 0;
    const clientAvgHours = parseFloat(cm?.avg_stage_hours || '0');
    const clientCopies = parseInt(cm?.total_copies || '0');
    const clientOverdue = parseInt(cm?.overdue || '0');
    const clientOverdueRate = clientTotal > 0 ? Math.round(clientOverdue / clientTotal * 100) : 0;

    const benchmarkCompletion = parseFloat(gm?.avg_completed_rate || '70');
    const benchmarkHours = parseFloat(gm?.avg_stage_hours || '24');
    const benchmarkBriefings = parseFloat(gm?.avg_briefings || '10');
    const benchmarkCopies = parseFloat(gm?.avg_copies || '5');
    const benchmarkOverdue = parseFloat(gm?.avg_overdue_rate || '10');

    const metrics = [
      {
        label: 'Taxa de Conclusão',
        client: `${clientCompletionRate}%`,
        benchmark: `${Math.round(benchmarkCompletion)}%`,
        clientValue: clientCompletionRate,
        benchmarkValue: benchmarkCompletion,
        higherIsBetter: true,
        status: clientCompletionRate >= benchmarkCompletion ? 'above' : 'below',
      },
      {
        label: 'Velocidade de Produção',
        client: `${clientAvgHours.toFixed(1)}h/etapa`,
        benchmark: `${benchmarkHours.toFixed(1)}h/etapa`,
        clientValue: clientAvgHours,
        benchmarkValue: benchmarkHours,
        higherIsBetter: false,
        status: clientAvgHours <= benchmarkHours ? 'above' : 'below',
      },
      {
        label: 'Volume de Briefings',
        client: `${clientTotal}`,
        benchmark: `${Math.round(benchmarkBriefings)}`,
        clientValue: clientTotal,
        benchmarkValue: benchmarkBriefings,
        higherIsBetter: true,
        status: clientTotal >= benchmarkBriefings ? 'above' : 'below',
      },
      {
        label: 'Copies Produzidas',
        client: `${clientCopies}`,
        benchmark: `${Math.round(benchmarkCopies)}`,
        clientValue: clientCopies,
        benchmarkValue: benchmarkCopies,
        higherIsBetter: true,
        status: clientCopies >= benchmarkCopies ? 'above' : 'below',
      },
      {
        label: 'Taxa de Atraso',
        client: `${clientOverdueRate}%`,
        benchmark: `${Math.round(benchmarkOverdue)}%`,
        clientValue: clientOverdueRate,
        benchmarkValue: benchmarkOverdue,
        higherIsBetter: false,
        status: clientOverdueRate <= benchmarkOverdue ? 'above' : 'below',
      },
    ];

    const aboveCount = metrics.filter((m) => m.status === 'above').length;
    const overallPosition = aboveCount >= 4 ? 'top_quartile' : aboveCount >= 3 ? 'above_average' : aboveCount >= 2 ? 'average' : 'below_average';

    return {
      client_name: client.name,
      period_days: parseInt(days),
      metrics,
      overall_position: overallPosition,
      above_benchmark: aboveCount,
      total_metrics: metrics.length,
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 6. CONTENT GAP DETECTOR
  // ────────────────────────────────────────────────────────────────────────────
  // GET — Load persisted content gaps for a client
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/clients/:clientId/content-gap', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;

    const { rows } = await query<{
      id: string; gaps: any; market_context: string | null;
      citations: any; keywords_used: any; detected_at: string;
    }>(
      `SELECT id, gaps, market_context, citations, keywords_used, detected_at
       FROM client_content_gaps
       WHERE tenant_id = $1 AND client_id = $2
       ORDER BY detected_at DESC LIMIT 1`,
      [tenantId, clientId]
    );

    if (!rows.length) return reply.status(204).send();

    const row = rows[0];
    return {
      gaps: row.gaps,
      market_context: row.market_context,
      citations: row.citations,
      keywords_used: row.keywords_used,
      detected_at: row.detected_at,
    };
  });

  // Uses Tavily to find content opportunities not yet in calendar
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/clients/:clientId/content-gap', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;

    const client = await resolveEdroClient(tenantId, clientId);
    if (!client || !client.edro_id) return reply.status(404).send({ error: 'Client not found' });

    if (!isTavilyConfigured()) {
      return reply.status(422).send({ error: 'Tavily não configurado. Adicione TAVILY_API_KEY.' });
    }

    // Get client keywords from social listening
    const { rows: keywordRows } = await query<{ keyword: string }>(
      `SELECT keyword FROM social_listening_keywords
       WHERE tenant_id = $1 AND (client_id = $2 OR client_id IS NULL) AND is_active = true
       ORDER BY created_at DESC LIMIT 20`,
      [tenantId, clientId]
    );

    const keywords = keywordRows.map((r) => r.keyword);
    const segment = client.segment || client.name;
    const pillars: string[] = [];

    // Get last 30 days of calendar events to understand existing coverage
    const { rows: calendarRows } = await query<{ title: string; event_date: string }>(
      `SELECT title, event_date::text FROM calendar_events
       WHERE client_id = $1 AND event_date >= NOW() - INTERVAL '30 days'
       ORDER BY event_date DESC LIMIT 20`,
      [client.edro_id]
    ).catch(() => ({ rows: [] as { title: string; event_date: string }[] }));

    const existingTopics = calendarRows.map((e) => e.title).join(', ');

    const t0 = Date.now();
    const trendQuery = `${segment} tendências oportunidades conteúdo marketing Brasil ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} ${keywords.slice(0, 5).join(' ')}`.trim();
    const tvRes = await tavilySearch(trendQuery, { maxResults: 6, searchDepth: 'basic' });
    const duration_ms = Date.now() - t0;
    logTavilyUsage({ tenant_id: tenantId, operation: 'search-basic', unit_count: 1, feature: 'content_gap_detector', duration_ms, metadata: { client_id: clientId } });

    const marketContext = tvRes.results.slice(0, 4).map((r: any) => `${r.title}: ${r.snippet?.slice(0, 300)}`).join('\n\n');

    // AI to structure the gaps
    const structurePrompt = `Com base nesta pesquisa de tendências para ${client.name}:

${marketContext}

Tópicos já cobertos pelo cliente: ${existingTopics || 'nenhum mapeado'}
Pilares de conteúdo: ${pillars.length > 0 ? pillars.join(', ') : 'não definidos'}

Identifique os 5 maiores GAPS de conteúdo e retorne JSON:
[
  {
    "gap": "<lacuna identificada>",
    "opportunity": "<oportunidade específica>",
    "format": "<Reels/Carrossel/Post/Stories>",
    "urgency": "alta|média|baixa",
    "suggested_topics": ["<titulo1>", "<titulo2>"]
  }
]`;

    const structureResult = await runAi('openai', {
      prompt: structurePrompt,
      temperature: 0.3,
      maxTokens: 800,
    });

    let gaps: any[] = [];
    try {
      const match = structureResult.text.match(/\[[\s\S]*\]/);
      if (match) gaps = JSON.parse(match[0]);
    } catch {
      gaps = [{ gap: 'Análise disponível', opportunity: marketContext.slice(0, 500), format: 'Variado', urgency: 'média', suggested_topics: [] }];
    }

    const citations = tvRes.results.map((r: any) => r.url).slice(0, 5);
    const keywordsUsed = keywords.slice(0, 8);

    // Persist for future loads
    await query(
      `INSERT INTO client_content_gaps (tenant_id, client_id, gaps, market_context, citations, keywords_used)
       VALUES ($1, $2, $3::jsonb, $4, $5::jsonb, $6::jsonb)`,
      [tenantId, clientId, JSON.stringify(gaps), marketContext, JSON.stringify(citations), JSON.stringify(keywordsUsed)]
    ).catch(() => { /* non-blocking — don't fail the response if insert fails */ });

    return {
      client_name: client.name,
      gaps,
      market_context: marketContext,
      citations,
      keywords_used: keywordsUsed,
      duration_ms: Date.now() - t0,
      detected_at: new Date().toISOString(),
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 7a. GET — Load latest persisted strategic brief
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/clients/:clientId/strategic-brief', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;

    const { rows } = await query<{ summary: any; created_at: string }>(
      `SELECT summary, created_at FROM client_insights
       WHERE tenant_id=$1 AND client_id=$2 AND period LIKE 'strategic_brief_%'
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, clientId]
    );

    if (!rows.length) return reply.status(204).send();

    const row = rows[0];
    return {
      ...row.summary,
      detected_at: row.created_at,
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 7b. ESTRATEGISTA VIRTUAL MENSAL
  // Full strategic brief using Claude for premium quality
  // ────────────────────────────────────────────────────────────────────────────
  app.post('/clients/:clientId/strategic-brief', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;
    const { month, year } = req.body as { month?: number; year?: number };

    const client = await resolveEdroClient(tenantId, clientId);
    if (!client || !client.edro_id) return reply.status(404).send({ error: 'Client not found' });

    const targetMonth = month || new Date().getMonth() + 2; // next month
    const targetYear = year || new Date().getFullYear();
    const periodFrom = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString().slice(0, 10);

    // Collect comprehensive data
    const [metricsRes, copyRes, calendarRes, opportunitiesRes] = await Promise.all([
      query<{ total: string; completed: string; completion_rate: string; avg_hours: string }>(
        `SELECT COUNT(*) AS total,
           COUNT(*) FILTER (WHERE status = 'done') AS completed,
           ROUND(COUNT(*) FILTER (WHERE status = 'done')::numeric / NULLIF(COUNT(*), 0) * 100) AS completion_rate,
           AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600) AS avg_hours
         FROM edro_briefings WHERE client_id = $1 AND created_at >= $2`,
        [client.edro_id, periodFrom]
      ),
      query<{ content: string; platform: string | null }>(
        `SELECT cv.output AS content, b.payload->>'platform' AS platform FROM edro_copy_versions cv
         JOIN edro_briefings b ON b.id = cv.briefing_id
         WHERE b.client_id = $1 AND cv.status = 'approved'
         ORDER BY cv.created_at DESC LIMIT 10`,
        [client.edro_id]
      ),
      query<{ title: string; event_date: string; relevance_score: number | null }>(
        `SELECT title, event_date::text, relevance_score
         FROM calendar_events
         WHERE client_id = $1 AND EXTRACT(MONTH FROM event_date) = $2 AND EXTRACT(YEAR FROM event_date) = $3
         ORDER BY relevance_score DESC NULLS LAST LIMIT 15`,
        [client.edro_id, targetMonth, targetYear]
      ).catch(() => ({ rows: [] as { title: string; event_date: string; relevance_score: number | null }[] })),
      query<{ title: string; priority: string; description: string | null }>(
        `SELECT title, priority, description FROM ai_opportunities
         WHERE client_id = $1 AND status = 'active'
         ORDER BY CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END
         LIMIT 8`,
        [client.edro_id]
      ).catch(() => ({ rows: [] as { title: string; priority: string; description: string | null }[] })),
    ]);

    const metrics = metricsRes.rows[0];
    const approvedCopies = copyRes.rows.slice(0, 5).map((c, i) =>
      `${i + 1}. [${c.platform || 'Geral'}] ${c.content.slice(0, 200)}`
    ).join('\n');
    const calendarEvents = calendarRes.rows.map((e) => `• ${e.event_date?.slice(0, 10)}: ${e.title}`).join('\n');
    const opportunities = opportunitiesRes.rows.map((o) =>
      `• [${o.priority.toUpperCase()}] ${o.title}${o.description ? `: ${o.description.slice(0, 100)}` : ''}`
    ).join('\n');

    const monthName = new Date(targetYear, targetMonth - 1).toLocaleDateString('pt-BR', { month: 'long' });

    const prompt = `Você é o estrategista-chefe da Edro Studio, uma agência de publicidade 360°. Prepare o PLANEJAMENTO ESTRATÉGICO MENSAL para ${client.name} — referente a ${monthName}/${targetYear}.

## DADOS DOS ÚLTIMOS 60 DIAS
- Briefings: ${metrics?.total || 0} total, ${metrics?.completed || 0} concluídos (${metrics?.completion_rate || 0}% conclusão)
- Tempo médio por projeto: ${parseFloat(metrics?.avg_hours || '0').toFixed(1)}h
- Últimas copies aprovadas:
${approvedCopies || 'Nenhuma copy aprovada no período.'}

## CALENDÁRIO ${monthName.toUpperCase()}/${targetYear}
${calendarEvents || 'Nenhum evento mapeado para o período.'}

## OPORTUNIDADES IDENTIFICADAS PELA IA
${opportunities || 'Nenhuma oportunidade mapeada.'}

---

Entregue um planejamento estratégico completo em formato de documento executivo com:

**1. DIAGNÓSTICO (3 pontos)** — O que funcionou, o que precisa melhorar, o que aprender.

**2. OBJETIVOS DO MÊS** — 3 objetivos específicos e mensuráveis para ${monthName}.

**3. ESTRATÉGIA DE CONTEÚDO** — Pilares temáticos, formatos recomendados, frequência ideal.

**4. CALENDÁRIO DE OPORTUNIDADES** — Top 5 datas/eventos para ativar no mês com sugestão de ação.

**5. COPY GUIDELINES** — Tom, abordagem, e 2 "big ideas" para o mês.

**6. KPIs A MONITORAR** — 4 métricas com meta sugerida.

**7. ALERTA DE RISCO** — O principal risco para o mês e como mitigá-lo.

Use linguagem consultiva, seja específico para ${client.name} e o segmento ${client.segment || 'marketing digital'}. Máximo 800 palavras.`;

    const t0 = Date.now();
    const result = await runAi('claude', {
      prompt,
      systemPrompt: 'Você é um estrategista de marketing sênior da Edro Studio. Entregue planejamentos concisos, acionáveis e orientados a resultados. Use formatação markdown.',
      temperature: 0.6,
      maxTokens: 2000,
    });
    const durationMs = Date.now() - t0;

    logAiUsage({
      tenant_id: tenantId,
      provider: result.provider,
      model: result.model,
      feature: 'strategic_brief',
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      duration_ms: durationMs,
      metadata: { client_id: clientId, month: targetMonth, year: targetYear },
    }).catch(() => {});

    const briefResponse = {
      brief: result.text,
      client_name: client.name,
      target_period: { month: targetMonth, year: targetYear, label: `${monthName}/${targetYear}` },
      data_used: {
        briefings: parseInt(metrics?.total || '0'),
        calendar_events: calendarRes.rows.length,
        ai_opportunities: opportunitiesRes.rows.length,
        copies_analyzed: copyRes.rows.length,
      },
      provider: result.provider,
      model: result.model,
      duration_ms: durationMs,
      detected_at: new Date().toISOString(),
    };

    // Persist to client_insights (non-blocking)
    const periodKey = `strategic_brief_${targetYear}-${String(targetMonth).padStart(2, '0')}`;
    query(
      `INSERT INTO client_insights (tenant_id, client_id, period, summary)
       VALUES ($1, $2, $3, $4::jsonb)
       ON CONFLICT DO NOTHING`,
      [tenantId, clientId, periodKey, JSON.stringify(briefResponse)]
    ).catch(() => {});

    return briefResponse;
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 8. ROI DE RETAINER
  // Calculates true ROI of the client retainer relationship
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/clients/:clientId/roi-retainer', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;
    const { months = '3', retainer_value } = req.query as { months?: string; retainer_value?: string };

    const client = await resolveEdroClient(tenantId, clientId);
    if (!client || !client.edro_id) return reply.status(404).send({ error: 'Client not found' });

    const periodMonths = parseInt(months);
    const periodFrom = new Date(Date.now() - periodMonths * 30 * 24 * 3600 * 1000).toISOString();
    const retainerMonthly = retainer_value ? parseFloat(retainer_value) : 0;

    const { rows: productionData } = await query<{
      total_briefings: string; completed_briefings: string;
      total_copies: string; total_copy_chars: string;
      total_stage_transitions: string; avg_completion_days: string;
    }>(
      `SELECT
         COUNT(DISTINCT b.id) AS total_briefings,
         COUNT(DISTINCT b.id) FILTER (WHERE b.status = 'done') AS completed_briefings,
         COUNT(cv.id) AS total_copies,
         SUM(LENGTH(cv.output)) AS total_copy_chars,
         COUNT(s.id) AS total_stage_transitions,
         AVG(EXTRACT(EPOCH FROM (
           CASE WHEN b.status = 'done' THEN b.updated_at ELSE NOW() END
           - b.created_at
         )) / 86400) AS avg_completion_days
       FROM edro_briefings b
       LEFT JOIN edro_copy_versions cv ON cv.briefing_id = b.id
       LEFT JOIN edro_briefing_stages s ON s.briefing_id = b.id
       WHERE b.client_id = $1 AND b.created_at >= $2`,
      [client.edro_id, periodFrom]
    );

    const pd = productionData[0];
    const totalBriefings = parseInt(pd?.total_briefings || '0');
    const completedBriefings = parseInt(pd?.completed_briefings || '0');
    const totalCopies = parseInt(pd?.total_copies || '0');
    const totalChars = parseInt(pd?.total_copy_chars || '0');
    const avgDays = parseFloat(pd?.avg_completion_days || '0');

    // Value calculation
    // Market rates (conservative estimates)
    const COPYWRITER_HOURLY = 150; // R$/h freelancer
    const STRATEGIST_HOURLY = 250; // R$/h estrategista
    const DESIGNER_HOURLY = 120; // R$/h designer (não incluso, mas seria extra)

    const estimatedCopyHours = totalCopies * 2.5; // avg 2.5h per copy
    const estimatedStrategyHours = totalBriefings * 1; // 1h strategy per briefing
    const estimatedReviewHours = totalBriefings * 0.5; // 30min review per briefing

    const marketValueCopy = estimatedCopyHours * COPYWRITER_HOURLY;
    const marketValueStrategy = estimatedStrategyHours * STRATEGIST_HOURLY;
    const marketValueReview = estimatedReviewHours * COPYWRITER_HOURLY;
    const totalMarketValue = marketValueCopy + marketValueStrategy + marketValueReview;

    const retainerTotal = retainerMonthly * periodMonths;
    const roi = retainerTotal > 0 ? ((totalMarketValue - retainerTotal) / retainerTotal) * 100 : null;
    const multiplier = retainerTotal > 0 ? totalMarketValue / retainerTotal : null;

    const wordsProduced = Math.round(totalChars / 5); // ~5 chars per word

    return {
      client_name: client.name,
      period: { months: periodMonths, from: periodFrom.slice(0, 10), to: new Date().toISOString().slice(0, 10) },
      production: {
        total_briefings: totalBriefings,
        completed_briefings: completedBriefings,
        completion_rate: totalBriefings > 0 ? Math.round(completedBriefings / totalBriefings * 100) : 0,
        total_copies: totalCopies,
        words_produced: wordsProduced,
        avg_completion_days: Math.round(avgDays * 10) / 10,
      },
      value: {
        market_value_copy: Math.round(marketValueCopy),
        market_value_strategy: Math.round(marketValueStrategy),
        market_value_review: Math.round(marketValueReview),
        total_market_value: Math.round(totalMarketValue),
        retainer_total: retainerTotal,
        roi_percent: roi !== null ? Math.round(roi) : null,
        value_multiplier: multiplier !== null ? Math.round(multiplier * 10) / 10 : null,
        estimated_hours: Math.round(estimatedCopyHours + estimatedStrategyHours + estimatedReviewHours),
      },
      rates_used: { copywriter: COPYWRITER_HOURLY, strategist: STRATEGIST_HOURLY },
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 9. CALENDARIO PREDITIVO
  // Suggests optimal content dates based on historical patterns
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/clients/:clientId/predictive-calendar', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;
    const { days = '30' } = req.query as { days?: string };

    const client = await resolveEdroClient(tenantId, clientId);
    if (!client || !client.edro_id) return reply.status(404).send({ error: 'Client not found' });

    // Analyze historical posting patterns
    const { rows: historicalPatterns } = await query<{
      day_of_week: string; hour_of_day: string; platform: string | null; count: string;
    }>(
      `SELECT
         EXTRACT(DOW FROM b.created_at) AS day_of_week,
         EXTRACT(HOUR FROM b.created_at) AS hour_of_day,
         b.payload->>'platform' AS platform,
         COUNT(*) AS count
       FROM edro_briefings b
       WHERE b.client_id = $1 AND b.status = 'done' AND b.created_at >= NOW() - INTERVAL '90 days'
       GROUP BY day_of_week, hour_of_day, b.payload->>'platform'
       ORDER BY count DESC`,
      [client.edro_id]
    );

    // Get upcoming calendar events to suggest activation dates
    const { rows: upcomingEvents } = await query<{ title: string; event_date: string; relevance_score: number | null; category: string | null }>(
      `SELECT title, event_date::text, relevance_score, category
       FROM calendar_events
       WHERE client_id = $1 AND event_date >= NOW() AND event_date <= NOW() + INTERVAL '${parseInt(days)} days'
       ORDER BY relevance_score DESC NULLS LAST, event_date ASC
       LIMIT 20`,
      [client.edro_id]
    ).catch(() => ({ rows: [] as { title: string; event_date: string; relevance_score: number | null; category: string | null }[] }));

    // Get stage bottlenecks to predict lead times
    const { rows: leadTimeData } = await query<{ stage: string; avg_hours: string }>(
      `SELECT s.stage, AVG(EXTRACT(EPOCH FROM (s.updated_at - s.created_at))/3600) AS avg_hours
       FROM edro_briefing_stages s
       JOIN edro_briefings b ON b.id = s.briefing_id
       WHERE b.client_id = $1 AND s.updated_at > s.created_at AND s.created_at >= NOW() - INTERVAL '60 days'
       GROUP BY s.stage`,
      [client.edro_id]
    );

    const totalLeadTimeHours = leadTimeData.reduce((sum, r) => sum + parseFloat(r.avg_hours || '0'), 0);
    const totalLeadTimeDays = Math.ceil(totalLeadTimeHours / 24);

    // Best days of week
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const dayTotals: Record<string, number> = {};
    historicalPatterns.forEach((p) => {
      const day = dayNames[parseInt(p.day_of_week)] || 'Seg';
      dayTotals[day] = (dayTotals[day] || 0) + parseInt(p.count);
    });
    const bestDays = Object.entries(dayTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([day]) => day);

    // Suggestions: for each upcoming event, calculate brief-by date
    const suggestions = upcomingEvents.map((e) => {
      const eventDate = new Date(e.event_date);
      const briefByDate = new Date(eventDate.getTime() - totalLeadTimeDays * 24 * 3600 * 1000);
      return {
        event: e.title,
        event_date: e.event_date?.slice(0, 10),
        brief_by_date: briefByDate.toISOString().slice(0, 10),
        days_lead_time: totalLeadTimeDays,
        relevance_score: e.relevance_score,
        category: e.category,
        status: briefByDate < new Date() ? 'urgent' : 'planned',
      };
    });

    return {
      client_name: client.name,
      period_days: parseInt(days),
      lead_time_summary: {
        avg_days: totalLeadTimeDays,
        by_stage: leadTimeData.map((r) => ({ stage: r.stage, avg_hours: Math.round(parseFloat(r.avg_hours)) })),
      },
      best_posting_days: bestDays,
      suggestions,
      urgent: suggestions.filter((s) => s.status === 'urgent').length,
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 10. CONTENT → RESULT LOOP (Meta Ads linkage)
  // Links copy versions to campaign performance
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/clients/:clientId/content-results', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;
    const { from, to } = req.query as { from?: string; to?: string };

    const client = await resolveEdroClient(tenantId, clientId);
    if (!client || !client.edro_id) return reply.status(404).send({ error: 'Client not found' });

    const periodFrom = from || new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const periodTo = to || new Date().toISOString().slice(0, 10);

    // Get copies with their briefings
    const { rows: copies } = await query<{
      copy_id: string; content: string; platform: string | null;
      briefing_title: string; created_at: string;
      predicted_format: string | null; predicted_score: number | null;
    }>(
      `SELECT cv.id AS copy_id, cv.output AS content, b.payload->>'platform' AS platform,
         b.title AS briefing_title, cv.created_at::text,
         cf.format_type AS predicted_format, cf.confidence_score AS predicted_score
       FROM edro_copy_versions cv
       JOIN edro_briefings b ON b.id = cv.briefing_id
       LEFT JOIN campaign_formats cf ON cf.briefing_id = b.id
       WHERE b.client_id = $1 AND cv.status = 'approved'
         AND cv.created_at BETWEEN $2 AND $3
       ORDER BY cv.created_at DESC LIMIT 20`,
      [client.edro_id, periodFrom, periodTo]
    );

    // Get Meta Ads performance (from integration data)
    const { rows: metaData } = await query<{
      ad_name: string; impressions: string; clicks: string; spend: string; conversions: string; date: string;
    }>(
      `SELECT ad_name, impressions, clicks, spend, conversions, date::text
       FROM meta_ads_insights
       WHERE client_id = $1 AND date BETWEEN $2 AND $3
       ORDER BY spend DESC NULLS LAST LIMIT 20`,
      [client.edro_id, periodFrom, periodTo]
    ).catch(() => ({ rows: [] }));

    // Try to match copies to ads by keyword similarity
    const linkedResults = copies.map((copy) => {
      const titleWords = copy.briefing_title.toLowerCase().split(/\s+/);
      const matchedAd = metaData.find((ad) =>
        titleWords.some((word) => word.length > 4 && ad.ad_name?.toLowerCase().includes(word))
      );
      return {
        copy_id: copy.copy_id,
        briefing: copy.briefing_title,
        platform: copy.platform,
        created_at: copy.created_at?.slice(0, 10),
        predicted_format: copy.predicted_format,
        predicted_score: copy.predicted_score,
        meta_ad: matchedAd ? {
          name: matchedAd.ad_name,
          impressions: parseInt(matchedAd.impressions || '0'),
          clicks: parseInt(matchedAd.clicks || '0'),
          spend: parseFloat(matchedAd.spend || '0'),
          conversions: parseInt(matchedAd.conversions || '0'),
          ctr: parseInt(matchedAd.impressions || '1') > 0
            ? (parseInt(matchedAd.clicks || '0') / parseInt(matchedAd.impressions || '1') * 100).toFixed(2)
            : null,
        } : null,
      };
    });

    const linked = linkedResults.filter((r) => r.meta_ad !== null);
    let totalSpend = 0;
    let totalClicks = 0;
    let totalCtr = 0;
    for (const ad of metaData) {
      totalSpend += parseFloat(ad.spend || '0');
      totalClicks += parseInt(ad.clicks || '0');
      if (parseInt(ad.impressions || '0') > 0) {
        totalCtr += parseInt(ad.clicks || '0') / parseInt(ad.impressions || '0');
      }
    }

    return {
      client_name: client.name,
      period: { from: periodFrom, to: periodTo },
      copies_analyzed: copies.length,
      ads_found: metaData.length,
      linked_results: linkedResults,
      linked_count: linked.length,
      summary: {
        total_spend: Math.round(totalSpend * 100) / 100,
        total_clicks: totalClicks,
        avg_ctr: totalClicks > 0 && metaData.length > 0
          ? (totalCtr / metaData.length * 100).toFixed(2)
          : null,
      },
      meta_available: metaData.length > 0,
    };
  });

  // ────────────────────────────────────────────────────────────────────────────
  // 11. ADMIN — ALL CLIENTS HEALTH SCORES
  // Returns health score for every client in the tenant (for admin dashboard)
  // ────────────────────────────────────────────────────────────────────────────
  app.get('/admin/clients-health', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const tenantId = (req.user as any).tenant_id as string;
    const user = (req as any).user;
    if (!['admin', 'manager'].includes(user?.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

    // Get all clients for tenant
    const { rows: clients } = await query<{ id: string; name: string; segment: string | null; edro_id: string | null }>(
      `SELECT c.id, c.name, c.segment_primary AS segment,
         (SELECT ec.id::text FROM edro_clients ec WHERE LOWER(ec.name) = LOWER(c.name) LIMIT 1) AS edro_id
       FROM clients c WHERE c.tenant_id = $1 ORDER BY c.name ASC`,
      [tenantId]
    );

    // Batch all 6 scoring queries for every client at once — O(6) instead of O(6N)
    const clientsWithId = clients.filter((c) => c.edro_id);
    const clientsNoId   = clients.filter((c) => !c.edro_id);
    const edroIds = clientsWithId.map((c) => c.edro_id!);

    const [onTimeRes, velocityRes, copyRes, volumeRes, activityRes, botsRes] = edroIds.length
      ? await Promise.all([
          query<{ client_id: string; total: string; on_time: string }>(
            `SELECT client_id,
               COUNT(*) FILTER (WHERE status = 'done') AS total,
               COUNT(*) FILTER (WHERE status = 'done' AND (due_at IS NULL OR updated_at <= due_at)) AS on_time
             FROM edro_briefings
             WHERE client_id = ANY($1::uuid[]) AND created_at >= $2
             GROUP BY client_id`,
            [edroIds, thirtyDaysAgo]
          ),
          query<{ client_id: string; avg_hours: string }>(
            `SELECT b.client_id,
               AVG(EXTRACT(EPOCH FROM (s.updated_at - s.created_at))/3600) AS avg_hours
             FROM edro_briefing_stages s
             JOIN edro_briefings b ON b.id = s.briefing_id
             WHERE b.client_id = ANY($1::uuid[]) AND b.created_at >= $2 AND s.updated_at > s.created_at
             GROUP BY b.client_id`,
            [edroIds, thirtyDaysAgo]
          ),
          query<{ client_id: string; total: string; approved: string }>(
            `SELECT b.client_id,
               COUNT(*) AS total,
               COUNT(*) FILTER (WHERE cv.status = 'approved') AS approved
             FROM edro_copy_versions cv
             JOIN edro_briefings b ON b.id = cv.briefing_id
             WHERE b.client_id = ANY($1::uuid[]) AND b.created_at >= $2
             GROUP BY b.client_id`,
            [edroIds, thirtyDaysAgo]
          ),
          query<{ client_id: string; current_count: string; previous_count: string }>(
            `SELECT client_id,
               COUNT(*) FILTER (WHERE created_at >= $2) AS current_count,
               COUNT(*) FILTER (WHERE created_at >= $3 AND created_at < $2) AS previous_count
             FROM edro_briefings
             WHERE client_id = ANY($1::uuid[])
             GROUP BY client_id`,
            [edroIds, thirtyDaysAgo, sixtyDaysAgo]
          ),
          query<{ client_id: string; count: string }>(
            `SELECT client_id, COUNT(*) AS count
             FROM edro_briefings
             WHERE client_id = ANY($1::uuid[]) AND updated_at >= $2
             GROUP BY client_id`,
            [edroIds, sevenDaysAgo]
          ),
          query<{ client_id: string; count: string }>(
            `SELECT b.client_id, COUNT(*) AS count
             FROM edro_briefings b
             JOIN LATERAL (
               SELECT created_at FROM edro_briefing_stages
               WHERE briefing_id = b.id ORDER BY position DESC LIMIT 1
             ) s ON TRUE
             WHERE b.client_id = ANY($1::uuid[])
               AND b.status NOT IN ('done','cancelled')
               AND EXTRACT(EPOCH FROM (NOW()-s.created_at))/3600 > 48
             GROUP BY b.client_id`,
            [edroIds]
          ),
        ])
      : [{ rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }, { rows: [] }] as any[];

    const onTimeMap   = new Map<string, any>(onTimeRes.rows.map((r: any) => [r.client_id, r]));
    const velocityMap = new Map<string, any>(velocityRes.rows.map((r: any) => [r.client_id, r]));
    const copyMap     = new Map<string, any>(copyRes.rows.map((r: any) => [r.client_id, r]));
    const volumeMap   = new Map<string, any>(volumeRes.rows.map((r: any) => [r.client_id, r]));
    const activityMap = new Map<string, any>(activityRes.rows.map((r: any) => [r.client_id, r]));
    const botsMap     = new Map<string, any>(botsRes.rows.map((r: any) => [r.client_id, r]));

    const scoredClients = clientsWithId.map((client) => {
      try {
        const ot  = onTimeMap.get(client.edro_id!);
        const vel = velocityMap.get(client.edro_id!);
        const cp  = copyMap.get(client.edro_id!);
        const vol = volumeMap.get(client.edro_id!);
        const act = activityMap.get(client.edro_id!);
        const bot = botsMap.get(client.edro_id!);

        const totalCompleted = parseInt(ot?.total || '0');
        const onTime = parseInt(ot?.on_time || '0');
        const onTimeRate = totalCompleted > 0 ? onTime / totalCompleted : 0.5;
        const avgHours = parseFloat(vel?.avg_hours || '24');
        const velocityScore = Math.max(0, Math.min(100, 100 - (avgHours / 96) * 100));
        const totalCopies = parseInt(cp?.total || '0');
        const approvedCopies = parseInt(cp?.approved || '0');
        const approvalRate = totalCopies > 0 ? approvedCopies / totalCopies : 0.5;
        const current = parseInt(vol?.current_count || '0');
        const previous = parseInt(vol?.previous_count || '0');
        const growthRate = previous > 0 ? (current - previous) / previous : 0;
        const volumeScore = Math.min(100, Math.max(0, 50 + growthRate * 50));
        const recentActivity = parseInt(act?.count || '0');
        const activityScore = Math.min(100, recentActivity * 20);

        const score = Math.round(
          onTimeRate * 100 * 0.30 + velocityScore * 0.25 +
          approvalRate * 100 * 0.20 + volumeScore * 0.15 + activityScore * 0.10
        );
        const status = score >= 80 ? 'excellent' : score >= 60 ? 'good' : score >= 40 ? 'warning' : 'critical';
        const statusColor = status === 'excellent' ? '#13DEB9' : status === 'good' ? '#5D87FF' : status === 'warning' ? '#FFAE1F' : '#FA896B';

        return {
          id: client.id, name: client.name, segment: client.segment,
          score, status, statusColor, briefings: current,
          bottlenecks: parseInt(bot?.count || '0'),
        };
      } catch {
        return { id: client.id, name: client.name, segment: client.segment, score: null, status: 'error', statusColor: '#94a3b8' };
      }
    });

    const results = [
      ...clientsNoId.map((c) => ({ id: c.id, name: c.name, segment: c.segment, score: null, status: 'no_data', statusColor: '#94a3b8' })),
      ...scoredClients,
    ];

    const scored = results.filter((r) => r.score !== null);
    const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, r) => s + (r.score ?? 0), 0) / scored.length) : 0;

    return {
      clients: results,
      summary: {
        total: results.length,
        excellent: results.filter((r) => r.status === 'excellent').length,
        good: results.filter((r) => r.status === 'good').length,
        warning: results.filter((r) => r.status === 'warning').length,
        critical: results.filter((r) => r.status === 'critical').length,
        avg_score: avgScore,
        total_bottlenecks: results.reduce((s, r: any) => s + (r.bottlenecks || 0), 0),
      },
    };
  });

  // ── AMD Performance — O que funcionou por AMD + persona + momento ──────────
  app.get('/clients/:clientId/amd-performance', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;

    const { rows } = await query<any>(
      `SELECT pf.persona_id, pf.amd, pf.momento_consciencia, pf.copy_format,
         COUNT(*) FILTER (WHERE pf.amd_achieved = 'sim')::int   AS achieved,
         COUNT(*) FILTER (WHERE pf.amd_achieved IS NOT NULL)::int AS tracked,
         ROUND(
           COUNT(*) FILTER (WHERE pf.amd_achieved = 'sim')::numeric
           / NULLIF(COUNT(*) FILTER (WHERE pf.amd_achieved IS NOT NULL), 0) * 100,
           1
         ) AS rate,
         c.profile->'personas' AS personas_json
       FROM preference_feedback pf
       JOIN clients c ON c.id = pf.client_id AND c.tenant_id = $1
       WHERE pf.tenant_id = $1
         AND c.id = $2
         AND pf.amd IS NOT NULL
         AND pf.amd_achieved IS NOT NULL
       GROUP BY pf.persona_id, pf.amd, pf.momento_consciencia, pf.copy_format, c.profile
       ORDER BY rate DESC NULLS LAST
       LIMIT 50`,
      [tenantId, clientId],
    );

    const personas: Record<string, string> = {};
    if (Array.isArray(rows[0]?.personas_json)) {
      for (const p of rows[0].personas_json) {
        if (p?.id && p?.name) personas[p.id] = p.name;
      }
    }

    return reply.send({
      data: rows.map((r: any) => ({
        persona_id:   r.persona_id,
        persona_name: r.persona_id ? (personas[r.persona_id] ?? r.persona_id) : null,
        amd:          r.amd,
        momento:      r.momento_consciencia,
        format:       r.copy_format,
        achieved:     Number(r.achieved),
        tracked:      Number(r.tracked),
        rate:         Number(r.rate ?? 0),
      })),
    });
  });

  // GET /clients/:clientId/post-metrics — briefing_post_metrics para o cliente
  app.get('/clients/:clientId/post-metrics', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;

    const { rows } = await query<any>(
      `SELECT m.id, m.briefing_id, b.title AS briefing_title, b.due_at,
         m.platform, m.format, m.post_url, m.published_at, m.match_source,
         m.reach, m.impressions, m.engagement, m.engagement_rate,
         m.likes, m.comments, m.saves, m.shares, m.synced_at
       FROM briefing_post_metrics m
       JOIN edro_briefings b ON b.id = m.briefing_id
       WHERE m.client_id = $1 AND m.tenant_id = $2
       ORDER BY m.published_at DESC NULLS LAST
       LIMIT 100`,
      [clientId, tenantId]
    );

    return reply.send({ success: true, data: rows });
  });

  // ── GET /clients/:clientId/metrics/reportei ─────────────────────────────
  // Real performance metrics from Reportei snapshots (FASE 2)
  app.get('/clients/:clientId/metrics/reportei', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;
    const { window: win = '30d', platform = 'Instagram' } = req.query as { window?: string; platform?: string };

    // 1. Latest snapshot
    const { rows: snapshots } = await query<any>(
      `SELECT platform, time_window, period_start, period_end, metrics, synced_at
       FROM reportei_metric_snapshots
       WHERE client_id=$1 AND time_window=$2 AND platform=$3
       ORDER BY synced_at DESC
       LIMIT 1`,
      [clientId, win, platform]
    ).catch(() => ({ rows: [] }));

    const snapshot = snapshots[0] ?? null;

    // 2. Previous snapshot (for delta if Reportei didn't send comparison)
    const { rows: prevSnapshots } = await query<any>(
      `SELECT metrics, period_start, period_end FROM reportei_metric_snapshots
       WHERE client_id=$1 AND time_window=$2 AND platform=$3
       ORDER BY synced_at DESC
       LIMIT 1 OFFSET 1`,
      [clientId, win, platform]
    ).catch(() => ({ rows: [] }));

    const prevSnapshot = prevSnapshots[0] ?? null;

    // 3. Top performing briefings via briefing_post_metrics
    const { rows: topBriefings } = await query<any>(
      `SELECT b.title, b.due_at,
              m.reach, m.impressions, m.engagement, m.engagement_rate,
              m.likes, m.comments, m.saves, m.platform
       FROM briefing_post_metrics m
       JOIN edro_briefings b ON b.id = m.briefing_id
       WHERE m.client_id=$1 AND m.tenant_id=$2 AND m.platform=$3
         AND m.published_at >= NOW() - INTERVAL '90 days'
       ORDER BY COALESCE(m.engagement_rate, 0) DESC
       LIMIT 5`,
      [clientId, tenantId, platform]
    ).catch(() => ({ rows: [] }));

    // 4. Available platforms for this client
    const { rows: availPlatforms } = await query<any>(
      `SELECT DISTINCT platform FROM reportei_metric_snapshots
       WHERE client_id=$1 ORDER BY platform`,
      [clientId]
    ).catch(() => ({ rows: [] }));

    // Staleness: warn if last sync was more than 10 days ago
    const syncedAt = snapshot?.synced_at ? new Date(snapshot.synced_at) : null;
    const daysSinceSync = syncedAt ? Math.floor((Date.now() - syncedAt.getTime()) / 86400000) : null;
    const isStale = daysSinceSync !== null && daysSinceSync > 10;

    return reply.send({
      snapshot: snapshot?.metrics ?? null,
      snapshot_meta: snapshot ? { platform: snapshot.platform, period_start: snapshot.period_start, period_end: snapshot.period_end, synced_at: snapshot.synced_at } : null,
      prev_snapshot: prevSnapshot?.metrics ?? null,
      top_briefings: topBriefings,
      available_platforms: availPlatforms.map((r: any) => r.platform),
      synced_at: snapshot?.synced_at ?? null,
      days_since_sync: daysSinceSync,
      is_stale: isStale,
      client_id: clientId,
      window: win,
      platform,
    });
  });

  // ── POST /clients/:clientId/metrics/reportei/sync ──────────────────────
  // Manual trigger to sync Reportei metrics for this client immediately
  app.post('/clients/:clientId/metrics/reportei/sync', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;
    const { triggerClientSync } = await import('../jobs/reporteiSyncWorker');
    const result = await triggerClientSync(clientId, tenantId);
    return reply.send({ success: true, ...result });
  });

  // ── GET /clients/:clientId/metrics/benchmark ────────────────────────────
  // Compare this client's metrics vs portfolio average (FASE 5)
  app.get('/clients/:clientId/metrics/benchmark', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req, reply) => {
    const { clientId } = req.params as { clientId: string };
    const tenantId = (req.user as any).tenant_id as string;
    const { platform = 'Instagram', window: win = '30d' } = req.query as { platform?: string; window?: string };

    // Get this client's latest metrics
    const { rows: own } = await query<any>(
      `SELECT metrics FROM reportei_metric_snapshots
       WHERE client_id=$1 AND platform=$2 AND time_window=$3
       ORDER BY synced_at DESC LIMIT 1`,
      [clientId, platform, win]
    ).catch(() => ({ rows: [] }));

    // Get all clients in this tenant for comparison
    const { rows: all } = await query<any>(
      `SELECT client_id, metrics FROM reportei_metric_snapshots
       WHERE tenant_id=$1 AND platform=$2 AND time_window=$3
         AND synced_at >= NOW() - INTERVAL '14 days'
       ORDER BY synced_at DESC`,
      [tenantId, platform, win]
    ).catch(() => ({ rows: [] }));

    if (!all.length) return reply.send({ available: false });

    // Aggregate portfolio averages per metric key
    const totals: Record<string, { sum: number; count: number }> = {};
    for (const row of all) {
      const m = row.metrics ?? {};
      for (const [key, val] of Object.entries(m)) {
        const v = (val as any)?.value;
        if (v == null || isNaN(Number(v))) continue;
        if (!totals[key]) totals[key] = { sum: 0, count: 0 };
        totals[key].sum += Number(v);
        totals[key].count++;
      }
    }
    const portfolioAvg: Record<string, number> = {};
    for (const [key, t] of Object.entries(totals)) {
      portfolioAvg[key] = t.count > 0 ? +(t.sum / t.count).toFixed(2) : 0;
    }

    const ownMetrics = own[0]?.metrics ?? {};
    const comparison: Array<{ metric: string; client: number | null; portfolio_avg: number; delta_pct: number | null; percentile: number }> = [];

    for (const [key, avg] of Object.entries(portfolioAvg)) {
      const clientVal = (ownMetrics[key] as any)?.value ?? null;
      const delta = clientVal != null && avg > 0 ? +((clientVal - avg) / avg * 100).toFixed(1) : null;

      // Simple percentile: count how many clients are below this client
      const clientValues = all
        .map((r: any) => (r.metrics?.[key] as any)?.value)
        .filter((v: any) => v != null && !isNaN(Number(v)))
        .map(Number);
      const below = clientValues.filter((v: number) => v < (clientVal ?? 0)).length;
      const percentile = clientValues.length > 1 ? Math.round((below / (clientValues.length - 1)) * 100) : 50;

      comparison.push({ metric: key, client: clientVal, portfolio_avg: avg, delta_pct: delta, percentile });
    }

    return reply.send({
      available: true,
      platform,
      window: win,
      portfolio_size: new Set(all.map((r: any) => r.client_id)).size,
      comparison,
    });
  });

  // ── GET /admin/roi-distribution ─────────────────────────────────────────────
  // Global copy ROI label distribution (last 90 days) for dashboard home
  app.get('/admin/roi-distribution', {
    preHandler: [authGuard, tenantGuard()],
  }, async (req: any, reply: any) => {
    const tenantId = req.user.tenant_id as string;
    if (!['admin', 'manager'].includes(req.user?.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }
    const { rows } = await query<{ roi_label: string; count: string }>(
      `SELECT roi_label, COUNT(*) AS count
       FROM copy_roi_scores
       WHERE tenant_id = $1 AND computed_at >= NOW() - INTERVAL '90 days'
       GROUP BY roi_label`,
      [tenantId]
    );
    const dist: Record<string, number> = { excellent: 0, good: 0, average: 0, poor: 0, no_data: 0 };
    for (const r of rows) dist[r.roi_label] = parseInt(r.count);
    return { distribution: dist };
  });

  // ── GET /clients/:clientId/metrics/content-intelligence ─────────────────────
  // FASE 7: briefing topic → performance correlation
  app.get('/clients/:clientId/metrics/content-intelligence', {
    preHandler: [tenantGuard(), authGuard],
  }, async (request: any, reply: any) => {
    const { clientId } = request.params as { clientId: string };
    const tenantId = request.user?.tenant_id as string;
    const platform = (request.query as any)?.platform ?? 'Instagram';
    try {
      const report = await buildContentIntelligenceReport(clientId, tenantId, platform);
      return reply.send(report);
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });
}
