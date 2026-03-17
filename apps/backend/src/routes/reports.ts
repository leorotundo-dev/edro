import { FastifyInstance } from 'fastify';
import { query } from '../db/db';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { sendEmail } from '../services/emailService';
import { GeminiService } from '../services/ai/geminiService';
import { OpenAIService } from '../services/ai/openaiService';
import { ClaudeService } from '../services/ai/claudeService';
import { logAiUsage, logTavilyUsage } from '../services/ai/aiUsageLogger';
import { tavilySearch, isTavilyConfigured } from '../services/tavilyService';
import { getFallbackProvider, generateWithProvider, type CopyProvider } from '../services/ai/copyOrchestrator';
import PDFDocument from 'pdfkit';
import { computeClientCopyRoi, getClientCopyRoiScores } from '../services/copyRoiService';

const STAGE_COLORS: Record<string, string> = {
  briefing: '#5D87FF', copy_ia: '#94a3b8', aprovacao: '#FFAE1F',
  producao: '#FA896B', revisao: '#ff6600', entrega: '#13DEB9', done: '#13DEB9',
};

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

type CompletionParams = {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
};

type CompletionResult = {
  text: string;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
};

type ClientRow = {
  id: string;
  name: string;
  segment?: string | null;
  edro_client_id?: string | null;
};

async function runCompletionWithFallback(
  preferredProvider: CopyProvider,
  params: CompletionParams
): Promise<CompletionResult & { provider: CopyProvider }> {
  const provider = getFallbackProvider(preferredProvider);
  let result: CompletionResult;

  switch (provider) {
    case 'gemini':
      result = await GeminiService.generateCompletion(params);
      break;
    case 'openai':
      result = await OpenAIService.generateCompletion(params);
      break;
    case 'claude':
      result = await ClaudeService.generateCompletion(params);
      break;
    default:
      throw new Error(`Unsupported provider: ${String(provider)}`);
  }

  return { ...result, provider };
}

async function resolveClientByRef(tenantId: string, clientRef: string): Promise<ClientRow | null> {
  const { rows } = await query<ClientRow>(
    `
      SELECT
        c.id,
        c.name,
        c.segment_primary AS segment,
        (
          SELECT ec.id::text
          FROM edro_clients ec
          WHERE LOWER(ec.name) = LOWER(c.name)
          LIMIT 1
        ) AS edro_client_id
      FROM clients c
      WHERE c.tenant_id = $1
        AND c.id::text = $2
      LIMIT 1
    `,
    [tenantId, clientRef]
  );
  return rows[0] || null;
}

export default async function reportsRoutes(app: FastifyInstance) {
  // Get report summary for a client
  app.get('/clients/:clientId/reports/summary', {
    preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')],
  }, async (request: any, reply: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };
    const { from, to } = request.query as { from?: string; to?: string };

    const client = await resolveClientByRef(tenantId, clientId);
    if (!client) {
      return reply.status(404).send({ error: 'client_not_found' });
    }

    const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const dateTo = to || new Date().toISOString().slice(0, 10);
    const reportClientId = client.edro_client_id;

    if (!reportClientId) {
      return {
        period: { from: dateFrom, to: dateTo },
        summary: { total: 0, completed: 0, overdue: 0 },
        byStage: [],
        copies: { total_copies: 0, avg_chars: 0 },
        stageTimeline: [],
        briefings: [],
      };
    }

    const { rows: briefingSummary } = await query(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'done' OR status = 'concluido')::int AS completed,
        COUNT(*) FILTER (WHERE due_at < now() AND status NOT IN ('done', 'concluido'))::int AS overdue
      FROM edro_briefings
      WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'
    `, [reportClientId, dateFrom, dateTo]);

    const { rows: byStage } = await query(`
      SELECT status, COUNT(*)::int AS count
      FROM edro_briefings
      WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'
      GROUP BY status
      ORDER BY count DESC
    `, [reportClientId, dateFrom, dateTo]);

    const { rows: copySummary } = await query(`
      SELECT
        COUNT(*)::int AS total_copies,
        ROUND(AVG(char_length(COALESCE(output, ''))))::int AS avg_chars
      FROM edro_copy_versions cv
      JOIN edro_briefings b ON b.id = cv.briefing_id
      WHERE b.client_id = $1 AND cv.created_at >= $2 AND cv.created_at <= $3::date + interval '1 day'
    `, [reportClientId, dateFrom, dateTo]);

    const { rows: stageTimeline } = await query(`
      SELECT
        bs.stage,
        ROUND(AVG(EXTRACT(epoch FROM (bs.updated_at - bs.created_at)) / 3600), 1) AS avg_hours
      FROM edro_briefing_stages bs
      JOIN edro_briefings b ON b.id = bs.briefing_id
      WHERE b.client_id = $1 AND bs.created_at >= $2 AND bs.created_at <= $3::date + interval '1 day'
      GROUP BY bs.stage
      ORDER BY MIN(bs.position)
    `, [reportClientId, dateFrom, dateTo]);

    const { rows: briefings } = await query(`
      SELECT id, title, status, due_at, created_at
      FROM edro_briefings
      WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'
      ORDER BY created_at DESC
      LIMIT 20
    `, [reportClientId, dateFrom, dateTo]);

    return {
      period: { from: dateFrom, to: dateTo },
      summary: briefingSummary[0] || { total: 0, completed: 0, overdue: 0 },
      byStage,
      copies: copySummary[0] || { total_copies: 0, avg_chars: 0 },
      stageTimeline,
      briefings,
    };
  });

  // Send report via email with full data and Edro branding
  app.post('/clients/:clientId/reports/email', {
    preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')],
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['recipientEmail'],
        properties: {
          recipientEmail: { type: 'string', format: 'email' },
          from: { type: 'string' },
          to: { type: 'string' },
          clientName: { type: 'string' },
          template: { type: 'string' },
        },
      },
    },
  }, async (request: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };
    const { recipientEmail, from, to, clientName, template } = request.body as {
      recipientEmail: string; from?: string; to?: string; clientName?: string; template?: string;
    };

    const client = await resolveClientByRef(tenantId, clientId);
    if (!client) {
      return { success: false, error: 'client_not_found' };
    }

    const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const dateTo = to || new Date().toISOString().slice(0, 10);
    const reportClientId = client.edro_client_id;

    // Fetch actual client name if not provided
    const name = clientName || client.name || clientId;

    // Fetch report data
    const briefingSummary = reportClientId
      ? (await query(`
          SELECT
            COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE status = 'done' OR status = 'concluido')::int AS completed,
            COUNT(*) FILTER (WHERE due_at < now() AND status NOT IN ('done', 'concluido'))::int AS overdue
          FROM edro_briefings
          WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'
        `, [reportClientId, dateFrom, dateTo])).rows
      : [{ total: 0, completed: 0, overdue: 0 }];

    const byStage = reportClientId
      ? (await query(`
          SELECT status, COUNT(*)::int AS count
          FROM edro_briefings
          WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'
          GROUP BY status ORDER BY count DESC
        `, [reportClientId, dateFrom, dateTo])).rows
      : [];

    const copySummary = reportClientId
      ? (await query(`
          SELECT COUNT(*)::int AS total_copies
          FROM edro_copy_versions cv JOIN edro_briefings b ON b.id = cv.briefing_id
          WHERE b.client_id = $1 AND cv.created_at >= $2 AND cv.created_at <= $3::date + interval '1 day'
        `, [reportClientId, dateFrom, dateTo])).rows
      : [{ total_copies: 0 }];

    const summary = briefingSummary[0] || { total: 0, completed: 0, overdue: 0 };
    const copies = (copySummary[0] as any)?.total_copies || 0;
    const isCliente = template === 'cliente';
    const templateLabel = template === 'executivo' ? 'Resumo Executivo' : template === 'cliente' ? 'Relatório do Cliente' : 'Performance Completo';
    const today = new Date().toLocaleDateString('pt-BR');

    // Build branded HTML
    const stageChips = byStage.map((s: any) =>
      `<span style="display:inline-block;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${STAGE_COLORS[s.status] || '#94a3b8'};color:#fff;margin-right:4px;">${escapeHtml(s.status)}: ${s.count}</span>`
    ).join(' ');

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#0f172a;background:#fff;">
  <!-- Header -->
  <div style="border-bottom:3px solid #ff6600;padding-bottom:14px;margin-bottom:20px;">
    <div style="font-size:20px;font-weight:800;color:#ff6600;margin-bottom:4px;">Edro Studio</div>
    <div style="font-size:16px;font-weight:700;">${escapeHtml(templateLabel)}</div>
    <div style="font-size:12px;color:#64748b;margin-top:4px;">
      Cliente: <strong>${escapeHtml(name)}</strong> &nbsp;·&nbsp; Período: ${escapeHtml(dateFrom)} a ${escapeHtml(dateTo)}
    </div>
  </div>

  <!-- Stats -->
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <tr>
      <td style="text-align:center;padding:12px;border:1px solid #e2e8f0;border-radius:6px;width:25%;">
        <div style="font-size:24px;font-weight:800;color:#ff6600;">${summary.total}</div>
        <div style="font-size:11px;color:#64748b;">${isCliente ? 'Demandas' : 'Briefings'}</div>
      </td>
      <td style="text-align:center;padding:12px;border:1px solid #e2e8f0;width:25%;">
        <div style="font-size:24px;font-weight:800;color:#13DEB9;">${summary.completed}</div>
        <div style="font-size:11px;color:#64748b;">${isCliente ? 'Entregues' : 'Concluídos'}</div>
      </td>
      <td style="text-align:center;padding:12px;border:1px solid #e2e8f0;width:25%;">
        <div style="font-size:24px;font-weight:800;color:#FA896B;">${summary.overdue}</div>
        <div style="font-size:11px;color:#64748b;">${isCliente ? 'Pendentes' : 'Atrasados'}</div>
      </td>
      <td style="text-align:center;padding:12px;border:1px solid #e2e8f0;width:25%;">
        <div style="font-size:24px;font-weight:800;color:#5D87FF;">${copies}</div>
        <div style="font-size:11px;color:#64748b;">${isCliente ? 'Pecas' : 'Copies'}</div>
      </td>
    </tr>
  </table>

  <!-- Stage Distribution -->
  ${byStage.length > 0 ? `
  <div style="margin-bottom:20px;">
    <div style="font-size:13px;font-weight:700;margin-bottom:8px;">${isCliente ? 'Status das Demandas' : 'Distribuicao por Etapa'}</div>
    <div>${stageChips}</div>
  </div>
  ` : ''}

  <!-- CTA -->
  <div style="text-align:center;margin:24px 0;">
    <a href="${process.env.FRONTEND_URL || process.env.WEB_URL || process.env.APP_URL || 'https://edro-production.up.railway.app'}/clients/${clientId}/reports" style="display:inline-block;background:#ff6600;color:#fff;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px;">
      Ver Relatório Completo
    </a>
  </div>

  <!-- Footer -->
  <div style="border-top:2px solid #ff6600;padding-top:12px;margin-top:24px;font-size:11px;color:#94a3b8;">
    <strong style="color:#ff6600;">Edro Studio</strong> &nbsp;·&nbsp; Relatório gerado em ${today}<br>
    ${process.env.FRONTEND_URL || process.env.WEB_URL || process.env.APP_URL || 'https://edro-production.up.railway.app'}
  </div>
</body>
</html>`;

    const text = [
      `${templateLabel} — ${name}`,
      `Período: ${dateFrom} a ${dateTo}`,
      '',
      `Briefings: ${summary.total} | Concluídos: ${summary.completed} | Atrasados: ${summary.overdue} | Copies: ${copies}`,
      '',
      byStage.map((s: any) => `${s.status}: ${s.count}`).join(', '),
      '',
      `Acesse o relatório completo em: ${process.env.FRONTEND_URL || process.env.WEB_URL || process.env.APP_URL || 'https://edro-production.up.railway.app'}/clients/${clientId}/reports`,
    ].join('\n');

    const result = await sendEmail({
      to: recipientEmail,
      subject: `[Edro] ${templateLabel} — ${name} (${dateFrom} a ${dateTo})`,
      text,
      html,
    });

    return { success: result.ok, error: result.error };
  });

  // ── Competitive Intelligence (Clipping-selected assets) ─────────────
  app.post('/clients/:clientId/reports/competitive-intelligence', {
    preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')],
  }, async (request: any, reply: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };

    const client = await resolveClientByRef(tenantId, clientId);
    if (!client) {
      return reply.status(404).send({ error: 'client_not_found' });
    }

    const body = request.body || {};
    const assetsRaw = Array.isArray(body.assets) ? body.assets : [];
    const assets = assetsRaw
      .map((asset: any) => ({
        id: String(asset?.id || '').trim(),
        title: String(asset?.title || '').trim(),
        snippet: String(asset?.snippet || '').trim(),
        url: String(asset?.url || '').trim(),
        source: String(asset?.source || '').trim(),
        published_at: String(asset?.published_at || '').trim(),
        score: Number.isFinite(Number(asset?.score)) ? Number(asset.score) : null,
      }))
      .filter((asset: any) => asset.title || asset.snippet || asset.url)
      .slice(0, 10);

    if (!assets.length) {
      return reply.status(400).send({ error: 'assets_required' });
    }

    const startMs = Date.now();
    const providerStages: { provider: string; role: string; model: string; duration_ms: number }[] = [];
    const clientName = client.name || clientId;
    const segment = client.segment || 'marketing digital';

    const assetSnapshot = JSON.stringify({
      client: { id: client.id, name: clientName, segment },
      assets_count: assets.length,
      assets,
    });

    // Stage 1: Gemini - structure competitor signals
    let structured = '';
    try {
      const t1 = Date.now();
      const geminiResult = await runCompletionWithFallback('gemini', {
        prompt: `Atue como analista de inteligencia competitiva. Extraia sinais acionaveis dos ativos de concorrentes abaixo.

Regras:
- Use somente os dados fornecidos.
- Sem invenção de fatos.
- Retorne APENAS JSON válido.
- Se faltarem evidencias, use "Dado insuficiente".

Formato JSON:
{
  "competitor_patterns": [
    {
      "competitor_hint": "string",
      "value_proposition": "string",
      "cta_patterns": ["string"],
      "social_proof": ["string"],
      "pricing_psychology": ["string"],
      "content_patterns": ["string"],
      "differentiators": ["string"]
    }
  ],
  "common_strategies_ranked": [
    { "strategy": "string", "revenue_impact": "alto|medio|baixo", "evidence": "string" }
  ],
  "market_gaps": ["string"],
  "exploitable_weaknesses": ["string"],
  "contrarian_move": "string"
}

Dados:
${assetSnapshot}`,
        systemPrompt:
          'Você é analista de inteligência competitiva para agências de marketing B2B. Seja objetivo e baseado em evidência.',
        temperature: 0.2,
        maxTokens: 1800,
      });
      structured = geminiResult.text;
      const d1 = Date.now() - t1;
      providerStages.push({ provider: geminiResult.provider, role: 'analyst', model: geminiResult.model, duration_ms: d1 });
      logAiUsage({
        tenant_id: tenantId,
        provider: geminiResult.provider,
        model: geminiResult.model,
        feature: 'competitive_intel_structuring',
        input_tokens: geminiResult.usage.input_tokens,
        output_tokens: geminiResult.usage.output_tokens,
        duration_ms: d1,
      }).catch(() => {});
    } catch {
      structured = '{"competitor_patterns":[],"common_strategies_ranked":[],"market_gaps":["Dado insuficiente"],"exploitable_weaknesses":["Dado insuficiente"],"contrarian_move":"Dado insuficiente"}';
    }

    // Stage 2: OpenAI - draft brief
    let draft = '';
    try {
      const t2 = Date.now();
      const openaiResult = await runCompletionWithFallback('openai', {
        prompt: `Monte um briefing estrategico de concorrencia para o cliente "${clientName}" (${segment}) usando os dados estruturados e ativos.

Estrutura obrigatoria:
## Resumo Executivo
## Estratégias em Comum que Estamos Perdendo (Top 5, ranqueadas por impacto)
## Gaps de Posicionamento no Mercado (Top 3)
## Fraquezas Exploráveis da Concorrência (Top 2)
## Aposta Contrária (Top 1)
## Plano de Implementação (dificuldade + prazo esperado por tática)

Regras:
- Perspectiva agência -> cliente.
- Só use evidências fornecidas.
- Se faltar base: "Dado insuficiente".

Dados estruturados:
${structured}

Dados brutos:
${assetSnapshot}`,
        systemPrompt:
          'Você é estrategista de crescimento em agência de marketing. Gere recomendações práticas orientadas a resultado.',
        temperature: 0.55,
        maxTokens: 2200,
      });
      draft = openaiResult.text;
      const d2 = Date.now() - t2;
      providerStages.push({ provider: openaiResult.provider, role: 'writer', model: openaiResult.model, duration_ms: d2 });
      logAiUsage({
        tenant_id: tenantId,
        provider: openaiResult.provider,
        model: openaiResult.model,
        feature: 'competitive_intel_draft',
        input_tokens: openaiResult.usage.input_tokens,
        output_tokens: openaiResult.usage.output_tokens,
        duration_ms: d2,
      }).catch(() => {});
    } catch {
      draft = `## Resumo Executivo\n\nDado insuficiente.\n\n## Estratégias em Comum que Estamos Perdendo (Top 5, ranqueadas por impacto)\n- Dado insuficiente.`;
    }

    // Stage 3: Claude - final strategic lens
    let strategicBrief = '';
    try {
      const t3 = Date.now();
      const claudeResult = await runCompletionWithFallback('claude', {
        prompt: `Você é o estrategista final. Revise e fortaleça o briefing competitivo para decisão executiva.

Regras obrigatórias:
1. Escrever em perspectiva agência -> cliente.
2. Priorizar impacto em marketing e vendas.
3. Trazer recomendações acionáveis para este mês.
4. Não mencionar IA, modelos, prompts, tokens ou bastidores.
5. Não inventar fatos; se faltar base, use "Dado insuficiente".

Entregue APENAS em markdown com seções:
## Strategic Brief de Concorrência
### Executive Summary (max 100 palavras)
### Reverse Engineering por Concorrente
### 5 Estratégias em Comum (rank por impacto de receita)
### 3 Gaps de Posicionamento
### 2 Fraquezas Exploráveis
### 1 Aposta Contrária
### Plano de Execução (dificuldade + timeline + KPI)

Briefing base:
${draft}

Dados estruturados:
${structured}

Ativos analisados:
${assetSnapshot}`,
        systemPrompt:
          'Você é consultor sênior de inteligência competitiva em marketing. Seja pragmático, orientado a decisão e rigoroso com evidências.',
        temperature: 0.35,
        maxTokens: 2600,
      });
      strategicBrief = claudeResult.text;
      const d3 = Date.now() - t3;
      providerStages.push({ provider: claudeResult.provider, role: 'strategist', model: claudeResult.model, duration_ms: d3 });
      logAiUsage({
        tenant_id: tenantId,
        provider: claudeResult.provider,
        model: claudeResult.model,
        feature: 'competitive_intel_final',
        input_tokens: claudeResult.usage.input_tokens,
        output_tokens: claudeResult.usage.output_tokens,
        duration_ms: d3,
      }).catch(() => {});
    } catch {
      strategicBrief = draft;
    }

    return {
      strategic_brief: strategicBrief,
      draft,
      structured,
      assets_used: assets.length,
      providers: providerStages,
      duration_ms: Date.now() - startMs,
    };
  });

  // ── AI-Powered Report Summary ──────────────────────────────────────
  app.get('/clients/:clientId/reports/ai-summary', {
    preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')],
  }, async (request: any, reply: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };
    const { from, to, template } = request.query as { from?: string; to?: string; template?: string };

    const client = await resolveClientByRef(tenantId, clientId);
    if (!client) {
      return reply.status(404).send({ error: 'client_not_found' });
    }

    const dateFrom = from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const dateTo = to || new Date().toISOString().slice(0, 10);
    const isCliente = template === 'cliente';
    const reportClientId = client.edro_client_id;
    const reportEndDate = new Date(`${dateTo}T00:00:00`);
    const baseDate = Number.isNaN(reportEndDate.getTime()) ? new Date() : reportEndDate;
    const nextMonthStart = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 1);
    const nextMonthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0);
    const nextMonthFrom = `${nextMonthStart.getFullYear()}-${String(nextMonthStart.getMonth() + 1).padStart(2, '0')}-01`;
    const nextMonthTo = `${nextMonthEnd.getFullYear()}-${String(nextMonthEnd.getMonth() + 1).padStart(2, '0')}-${String(nextMonthEnd.getDate()).padStart(2, '0')}`;
    const nextMonthLabel = nextMonthStart.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

    const startMs = Date.now();
    const providerStages: { provider: string; role: string; model: string; duration_ms: number }[] = [];

    // ── 1. Collect all data ──
    const [
      { rows: [summary] },
      { rows: byStage },
      { rows: [copies] },
      { rows: stageTimeline },
      { rows: [clientRow] },
      { rows: topBriefings },
      { rows: nextMonthCalendar },
      { rows: nextMonthAiOpportunities },
    ] = await Promise.all([
      reportClientId
        ? query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('done','concluido'))::int AS completed, COUNT(*) FILTER (WHERE due_at < now() AND status NOT IN ('done','concluido'))::int AS overdue FROM edro_briefings WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'`, [reportClientId, dateFrom, dateTo])
        : Promise.resolve({ rows: [{ total: 0, completed: 0, overdue: 0 }] }),
      reportClientId
        ? query(`SELECT status, COUNT(*)::int AS count FROM edro_briefings WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day' GROUP BY status ORDER BY count DESC`, [reportClientId, dateFrom, dateTo])
        : Promise.resolve({ rows: [] }),
      reportClientId
        ? query(`SELECT COUNT(*)::int AS total_copies, ROUND(AVG(char_length(COALESCE(output,''))))::int AS avg_chars FROM edro_copy_versions cv JOIN edro_briefings b ON b.id = cv.briefing_id WHERE b.client_id = $1 AND cv.created_at >= $2 AND cv.created_at <= $3::date + interval '1 day'`, [reportClientId, dateFrom, dateTo])
        : Promise.resolve({ rows: [{ total_copies: 0, avg_chars: 0 }] }),
      reportClientId
        ? query(`SELECT bs.stage, ROUND(AVG(EXTRACT(epoch FROM (bs.updated_at - bs.created_at)) / 3600), 1) AS avg_hours FROM edro_briefing_stages bs JOIN edro_briefings b ON b.id = bs.briefing_id WHERE b.client_id = $1 AND bs.created_at >= $2 AND bs.created_at <= $3::date + interval '1 day' GROUP BY bs.stage ORDER BY MIN(bs.position)`, [reportClientId, dateFrom, dateTo])
        : Promise.resolve({ rows: [] }),
      Promise.resolve({ rows: [{ name: client.name, segment: client.segment }] }),
      reportClientId
        ? query(`SELECT id, title, status, due_at FROM edro_briefings WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day' ORDER BY created_at DESC LIMIT 10`, [reportClientId, dateFrom, dateTo])
        : Promise.resolve({ rows: [] }),
      query(
        `SELECT
           e.id,
           e.name,
           e.date,
           COALESCE(cer.relevance_score, 0)::int AS relevance_score,
           COALESCE(
             cer.relevance_reason->>'tier',
             CASE
               WHEN COALESCE(cer.relevance_score, 0) >= 80 THEN 'A'
               WHEN COALESCE(cer.relevance_score, 0) >= 55 THEN 'B'
               ELSE 'C'
             END
           ) AS tier,
           COALESCE(cer.relevance_reason->>'why', '') AS why
         FROM events e
         LEFT JOIN calendar_event_relevance cer
           ON cer.calendar_event_id = e.id
          AND cer.client_id = $1
          AND cer.tenant_id = $2::uuid
         WHERE e.date IS NOT NULL
           AND e.date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
           AND e.date >= $3
           AND e.date <= $4
           AND (cer.is_relevant = true OR COALESCE(cer.relevance_score, 0) >= 55)
         ORDER BY COALESCE(cer.relevance_score, 0) DESC, e.date ASC
         LIMIT 8`,
        [client.id, tenantId, nextMonthFrom, nextMonthTo]
      ).catch(() => ({ rows: [] })),
      reportClientId
        ? query(
            `SELECT
               title,
               description,
               source,
               suggested_action,
               priority,
               confidence,
               expires_at
             FROM ai_opportunities
             WHERE client_id = $1::uuid
               AND tenant_id = $2::text
               AND status != 'dismissed'
               AND (expires_at IS NULL OR expires_at >= now())
             ORDER BY
               CASE priority
                 WHEN 'urgent' THEN 1
                 WHEN 'high' THEN 2
                 WHEN 'medium' THEN 3
                 ELSE 4
               END,
               confidence DESC NULLS LAST,
               created_at DESC
             LIMIT 8`,
            [reportClientId, tenantId]
          ).catch(() => ({ rows: [] }))
        : Promise.resolve({ rows: [] }),
    ]);

    const clientName = clientRow?.name || clientId;
    const segment = clientRow?.segment || 'marketing digital';
    const completionRate = summary?.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

    const dataSnapshot = JSON.stringify({
      period: { from: dateFrom, to: dateTo },
      client: { name: clientName, segment },
      briefings: { total: summary?.total || 0, completed: summary?.completed || 0, overdue: summary?.overdue || 0, completion_rate: completionRate },
      byStage: byStage.map((s: any) => ({ stage: s.status, count: s.count })),
      copies: { total: copies?.total_copies || 0, avg_chars: copies?.avg_chars || 0 },
      stageTimeline: stageTimeline.map((s: any) => ({ stage: s.stage, avg_hours: Number(s.avg_hours) })),
      topBriefings: topBriefings.map((b: any) => ({ title: b.title, status: b.status, due: b.due_at })),
      nextMonth: {
        label: nextMonthLabel,
        from: nextMonthFrom,
        to: nextMonthTo,
        calendar_opportunities: nextMonthCalendar.map((event: any) => ({
          date: event.date,
          name: event.name,
          relevance_score: Number(event.relevance_score || 0),
          tier: event.tier || 'C',
          why: event.why || '',
        })),
        strategic_opportunities: nextMonthAiOpportunities.map((opp: any) => ({
          title: opp.title,
          source: opp.source,
          priority: opp.priority,
          confidence: Number(opp.confidence || 0),
          suggested_action: opp.suggested_action || '',
          expires_at: opp.expires_at || null,
        })),
      },
    });

    // ── 2. Gemini — Structure & KPIs ──
    let structuredAnalysis = '';
    try {
      const t1 = Date.now();
      const geminiResult = await runCompletionWithFallback('gemini', {
        prompt: `Analise os dados do cliente final "${clientName}" (segmento: ${segment}) do ponto de vista de uma agência que precisa melhorar marketing e vendas do cliente.

Regras obrigatórias:
- Use somente os dados fornecidos.
- Não cite IA, modelo, prompt, token, custo técnico, nem bastidores de geração.
- Não invente probabilidades ou métricas ausentes.
- Quando faltar dado, escreva "Dado insuficiente" explicitamente.

Responda APENAS com JSON válido no formato:
{
  "kpis": [{ "label": "string", "value": "string", "trend": "string opcional", "evidence": "string", "confidence": "alta|media|baixa" }],
  "bottlenecks": ["string"],
  "highlights": ["string"],
  "risk_alerts": ["string"]
}

Dados:
${dataSnapshot}`,
        systemPrompt: 'Você é um analista de performance de marketing e vendas focado em cliente final. Saída estritamente em JSON válido, sem markdown e sem texto fora do JSON.',
        temperature: 0.2,
        maxTokens: 1200,
      });
      structuredAnalysis = geminiResult.text;
      const d1 = Date.now() - t1;
      providerStages.push({ provider: geminiResult.provider, role: 'analyst', model: geminiResult.model, duration_ms: d1 });
      logAiUsage({
        tenant_id: tenantId,
        provider: geminiResult.provider,
        model: geminiResult.model,
        feature: 'ai_report_analysis',
        input_tokens: geminiResult.usage.input_tokens,
        output_tokens: geminiResult.usage.output_tokens,
        duration_ms: d1,
      }).catch(() => {});
    } catch (err: any) {
      structuredAnalysis = `{"kpis":[],"bottlenecks":[],"highlights":["Dados brutos: ${summary?.total || 0} briefings, ${summary?.completed || 0} concluídos, ${copies?.total_copies || 0} copies"],"risk_alerts":[]}`;
    }

    // ── 3. Tavily — Market Context (optional) ──
    let marketContext = '';
    if (isTavilyConfigured()) {
      try {
        const t2 = Date.now();
        const tvRes = await tavilySearch(
          `${segment} agência marketing digital benchmark resultados produtividade 2026 Brasil`,
          { maxResults: 4, searchDepth: 'advanced', includeAnswer: true }
        );
        const duration_ms = Date.now() - t2;
        logTavilyUsage({ tenant_id: tenantId, operation: 'search-advanced', unit_count: 1, feature: 'ai_report_benchmark', duration_ms, metadata: { segment } });
        const snippets = tvRes.results.slice(0, 2).map((r: any) => `${r.title}: ${r.snippet?.slice(0, 250)}`).join('\n\n');
        marketContext = tvRes.answer ? `${tvRes.answer.slice(0, 600)}\n\n${snippets}` : snippets;
        providerStages.push({ provider: 'tavily', role: 'researcher', model: 'search-advanced', duration_ms });
      } catch {
        marketContext = '';
      }
    }

    // ── 4. OpenAI — Write Narrative ──
    let narrative = '';
    try {
      const toneGuide = isCliente
        ? 'Use tom acessivel e profissional, sem jargao tecnico. Foque em resultados e entregas.'
        : template === 'executivo'
          ? 'Use tom estrategico e direto. Foque em numeros-chave e decisoes.'
          : 'Use tom analitico e detalhado. Inclua insights operacionais.';

      const t3 = Date.now();
      const oaiResult = await runCompletionWithFallback('openai', {
        prompt: `Escreva um relatório narrativo para o cliente "${clientName}" (segmento: ${segment}) com foco em impacto de marketing e vendas. ${toneGuide}

Regras obrigatórias:
- Perspectiva: agência orientando o cliente.
- Use somente dados reais fornecidos.
- Não cite IA, modelos, prompts, tokens, custos de IA, nem bastidores técnicos.
- Não invente número/probabilidade.
- Se faltar dado para conclusão, escreva "Dado insuficiente".
- Em cada recomendação, inclua: Evidência, Confiança (alta/média/baixa) e KPI de sucesso (meta + prazo).

Estrutura em markdown (##):
## Resumo Executivo
## Diagnóstico por Funil (Awareness, Consideração, Conversão, Retenção)
## Oportunidades Prioritárias (Top 5)
## Oportunidades do Próximo Mês (${nextMonthLabel})
## Plano de Ação 30 dias

Na seção "## Oportunidades do Próximo Mês (${nextMonthLabel})":
- Liste 3 a 6 oportunidades práticas para o mês seguinte.
- Priorize oportunidades com maior relevância no calendário e/ou maior prioridade em oportunidades abertas.
- Para cada oportunidade, traga: oportunidade, evidência, ação recomendada e KPI de sucesso (meta + prazo).
- Se não houver base, escreva: "Dado insuficiente para oportunidades do próximo mês".

Dados estruturados:
${structuredAnalysis}

${marketContext ? `Contexto de mercado:\n${marketContext}` : ''}

Dados brutos:
${dataSnapshot}`,
        systemPrompt: 'Você é um estrategista sênior de agência. Foco absoluto em resultado de negócio do cliente. Português brasileiro, tom profissional, objetivo e acionável. Máximo 650 palavras.',
        temperature: 0.6,
        maxTokens: 2000,
      });
      narrative = oaiResult.text;
      const d3 = Date.now() - t3;
      providerStages.push({ provider: oaiResult.provider, role: 'writer', model: oaiResult.model, duration_ms: d3 });
      logAiUsage({
        tenant_id: tenantId,
        provider: oaiResult.provider,
        model: oaiResult.model,
        feature: 'ai_report_narrative',
        input_tokens: oaiResult.usage.input_tokens,
        output_tokens: oaiResult.usage.output_tokens,
        duration_ms: d3,
      }).catch(() => {});
    } catch (err: any) {
      narrative = `## Resumo do Período\n\nNo período de ${dateFrom} a ${dateTo}, ${clientName} registrou ${summary?.total || 0} briefings com taxa de conclusão de ${completionRate}%. ${(summary?.overdue || 0) > 0 ? `Atenção: ${summary.overdue} briefing(s) em atraso.` : 'Todos os prazos em dia.'}\n\n## Oportunidades do Próximo Mês (${nextMonthLabel})\n\nDado insuficiente para oportunidades do próximo mês.`;
    }

    // ── 5. Claude — Strategic Review (final strategic lens) ──
    let strategicReview = '';
    try {
      const t4 = Date.now();
      const claudeResult = await runCompletionWithFallback('claude', {
        prompt: `Você está na etapa final de revisão estratégica para um relatório de agência de marketing para cliente.

Sua missão:
- Sintetizar dados em inteligência acionável de negócio (marketing, vendas, posicionamento, crescimento).
- Corrigir viés operacional e focar impacto para o cliente final.
- Priorizar o que gera resultado primeiro.

Regras obrigatórias:
1. Use SOMENTE dados fornecidos.
2. Não mencione IA, modelo, prompt, token, custo técnico, nem bastidores.
3. Escreva sempre da perspectiva agência -> cliente.
4. Quando não houver base, escreva literalmente: "Dado insuficiente".
5. Inclua oportunidades do próximo mês com base no calendário e oportunidades abertas, quando existirem.

Formato obrigatório (responda APENAS com essa seção):
## Análise Estratégica
### Executive Summary
- resumo em ate 100 palavras.

### Key Trends (Top 3-5)
- Tendencia:
- Evidencia:
- Relevancia: Alta/Media/Baixa
- Janela de impacto: Imediata / 6-12 meses / 12+ meses
- Ação recomendada:

### Recomendações Prioritárias (Top 3)
Para cada recomendação:
- Fato observado:
- Interpretação:
- Ação recomendada:
- Confiança: alta/média/baixa
- KPI de sucesso: meta + prazo

### Oportunidades do Próximo Mês (${nextMonthLabel})
- liste 3 a 6 oportunidades práticas.
- se faltar base: "Dado insuficiente para oportunidades do próximo mês".

### Riscos e Mitigação (Top 3)
- Risco:
- Impacto:
- Mitigação:

### One-page Strategic Brief
- Situação atual
- Oportunidade-chave
- Ação recomendada
- Resultado esperado
- Próximos passos

Relatório base:
${narrative}

Dados estruturados:
${structuredAnalysis}

${marketContext ? `Contexto de mercado:\n${marketContext}` : ''}`,
        systemPrompt:
          'Você é um estrategista sênior de agência, especialista em transformar dados em decisões de negócio para clientes. Seja objetivo, pragmático e rigoroso com evidências. Português brasileiro.',
        temperature: 0.4,
        maxTokens: 2200,
      });
      strategicReview = claudeResult.text;
      const d4 = Date.now() - t4;
      providerStages.push({ provider: claudeResult.provider, role: 'strategist', model: claudeResult.model, duration_ms: d4 });
      logAiUsage({
        tenant_id: tenantId,
        provider: claudeResult.provider,
        model: claudeResult.model,
        feature: 'ai_report_review',
        input_tokens: claudeResult.usage.input_tokens,
        output_tokens: claudeResult.usage.output_tokens,
        duration_ms: d4,
      }).catch(() => {});
    } catch {
      strategicReview = '';
    }

    // ── Parse structured analysis for frontend ──
    let parsedKpis: any = { kpis: [], bottlenecks: [], highlights: [], risk_alerts: [] };
    try {
      const trimmed = structuredAnalysis.trim();
      const jsonStart = trimmed.indexOf('{');
      const jsonEnd = trimmed.lastIndexOf('}');
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        parsedKpis = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
      }
    } catch { /* use defaults */ }

    const totalDurationMs = Date.now() - startMs;

    return {
      narrative,
      strategicReview,
      kpis: parsedKpis.kpis || [],
      bottlenecks: parsedKpis.bottlenecks || [],
      highlights: parsedKpis.highlights || [],
      riskAlerts: parsedKpis.risk_alerts || [],
      marketContext: marketContext ? marketContext.slice(0, 1000) : null,
      providers: providerStages,
      duration_ms: totalDurationMs,
    };
  });

  // ── PDF Report ─────────────────────────────────────────────────────────────
  app.post('/clients/:clientId/reports/pdf', {
    preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')],
  }, async (request: any, reply: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };
    const body = (request.body || {}) as { from?: string; to?: string };
    const dateFrom = body.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const dateTo = body.to || new Date().toISOString().slice(0, 10);

    const client = await resolveClientByRef(tenantId, clientId);
    if (!client) return reply.status(404).send({ error: 'client_not_found' });

    const reportClientId = client.edro_client_id;
    const clientName = client.name;
    const segment = client.segment || 'marketing digital';

    // ── Collect data in parallel ──
    const [
      { rows: [summary] },
      { rows: byStage },
      { rows: [copies] },
      { rows: stageTimeline },
      { rows: topBriefings },
      { rows: perfMetrics },
      { rows: learningRules },
    ] = await Promise.all([
      reportClientId
        ? query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('done','concluido'))::int AS completed, COUNT(*) FILTER (WHERE due_at < now() AND status NOT IN ('done','concluido'))::int AS overdue FROM edro_briefings WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day'`, [reportClientId, dateFrom, dateTo])
        : Promise.resolve({ rows: [{ total: 0, completed: 0, overdue: 0 }] }),
      reportClientId
        ? query(`SELECT status, COUNT(*)::int AS count FROM edro_briefings WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day' GROUP BY status ORDER BY count DESC`, [reportClientId, dateFrom, dateTo])
        : Promise.resolve({ rows: [] }),
      reportClientId
        ? query(`SELECT COUNT(*)::int AS total_copies, ROUND(AVG(char_length(COALESCE(output,''))))::int AS avg_chars, COUNT(*) FILTER (WHERE score >= 7)::int AS high_score FROM edro_copy_versions cv JOIN edro_briefings b ON b.id = cv.briefing_id WHERE b.client_id = $1 AND cv.created_at >= $2 AND cv.created_at <= $3::date + interval '1 day'`, [reportClientId, dateFrom, dateTo])
        : Promise.resolve({ rows: [{ total_copies: 0, avg_chars: 0, high_score: 0 }] }),
      reportClientId
        ? query(`SELECT bs.stage, ROUND(AVG(EXTRACT(epoch FROM (bs.updated_at - bs.created_at)) / 3600), 1) AS avg_hours FROM edro_briefing_stages bs JOIN edro_briefings b ON b.id = bs.briefing_id WHERE b.client_id = $1 AND bs.created_at >= $2 AND bs.created_at <= $3::date + interval '1 day' GROUP BY bs.stage ORDER BY MIN(bs.position)`, [reportClientId, dateFrom, dateTo])
        : Promise.resolve({ rows: [] }),
      reportClientId
        ? query(`SELECT title, status, due_at FROM edro_briefings WHERE client_id = $1 AND created_at >= $2 AND created_at <= $3::date + interval '1 day' ORDER BY created_at DESC LIMIT 8`, [reportClientId, dateFrom, dateTo])
        : Promise.resolve({ rows: [] }),
      // Format performance (from Meta sync)
      query(
        `SELECT
           fpm.metric_name,
           SUM(fpm.metric_value)::int AS total,
           ROUND(AVG(fpm.metric_value), 1)::float AS avg
         FROM format_performance_metrics fpm
         JOIN campaign_formats cf ON cf.id = fpm.campaign_format_id
         JOIN campaigns camp ON camp.id = cf.campaign_id
         JOIN clients cl ON cl.id = camp.client_id
         WHERE cl.tenant_id = $1 AND camp.client_id = $2
           AND fpm.measurement_date >= $3 AND fpm.measurement_date <= $4
         GROUP BY fpm.metric_name
         ORDER BY fpm.metric_name`,
        [tenantId, clientId, dateFrom, dateTo]
      ).catch(() => ({ rows: [] })),
      // Learning rules summary
      query(
        `SELECT rule_type, rule_text FROM client_learning_rules WHERE tenant_id = $1 AND client_id = $2 ORDER BY created_at DESC LIMIT 5`,
        [tenantId, clientId]
      ).catch(() => ({ rows: [] })),
    ]);

    const completionRate = summary?.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;
    const totalImpressions = (perfMetrics as any[]).find((m: any) => m.metric_name === 'impressions')?.total || 0;
    const totalLikes = (perfMetrics as any[]).find((m: any) => m.metric_name === 'likes')?.total || 0;
    const totalComments = (perfMetrics as any[]).find((m: any) => m.metric_name === 'comments')?.total || 0;

    // ── AI Narrative ──
    const dataSnap = JSON.stringify({
      client: { name: clientName, segment },
      period: { from: dateFrom, to: dateTo },
      briefings: { total: summary?.total || 0, completed: summary?.completed || 0, overdue: summary?.overdue || 0, completion_rate: completionRate },
      copies: { total: copies?.total_copies || 0, avg_chars: copies?.avg_chars || 0, high_score: copies?.high_score || 0 },
      stageTimeline: stageTimeline.map((s: any) => ({ stage: s.stage, avg_hours: Number(s.avg_hours) })),
      performance: { impressions: totalImpressions, likes: totalLikes, comments: totalComments },
      learning_insights: (learningRules as any[]).map((r: any) => r.rule_text).filter(Boolean),
    });

    let narrative = '';
    try {
      const aiRes = await generateWithProvider('gemini', {
        prompt: `Você é o analista estratégico da agência Edro. Gere um relatório executivo mensal em português para o cliente abaixo.\n\nDados:\n${dataSnap}\n\nO relatório deve ter:\n1. Parágrafo de visão geral (2-3 frases sobre o período)\n2. Destaques do período (3 bullet points positivos)\n3. Pontos de atenção (1-2 bullet points de riscos ou gaps)\n4. Recomendação principal para o próximo mês (1 parágrafo)\n\nUse linguagem executiva, direta e em português brasileiro. Sem jargão técnico excessivo.`,
        maxTokens: 600,
        temperature: 0.5,
      });
      narrative = aiRes.output.trim();
    } catch {
      narrative = `Relatório do período ${dateFrom} a ${dateTo} para ${clientName}. Total de ${summary?.total || 0} briefings, com taxa de conclusão de ${completionRate}%.`;
    }

    // ── Build PDF with pdfkit ──
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Relatório Mensal — ${clientName}`, Author: 'Edro.Digital' } });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const EDRO_BLUE = '#5D87FF';
    const DARK = '#1a1a2e';
    const GRAY = '#64748b';
    const LIGHT_GRAY = '#f1f5f9';
    const ACCENT = '#13DEB9';
    const pageW = 595 - 100; // A4 width minus 2×margin

    // Helper: section header
    const sectionHeader = (title: string) => {
      doc.moveDown(0.5)
        .rect(50, doc.y, pageW, 22).fill(EDRO_BLUE)
        .fillColor('#ffffff').fontSize(10).font('Helvetica-Bold')
        .text(title.toUpperCase(), 58, doc.y - 17)
        .fillColor(DARK).font('Helvetica').fontSize(9)
        .moveDown(0.8);
    };

    // Helper: kpi box
    const kpiBox = (label: string, value: string, color: string, x: number, y: number, w: number) => {
      doc.rect(x, y, w, 50).fill(LIGHT_GRAY)
        .rect(x, y, 4, 50).fill(color)
        .fillColor(DARK).font('Helvetica-Bold').fontSize(18)
        .text(value, x + 12, y + 8, { width: w - 16, align: 'left' })
        .fillColor(GRAY).font('Helvetica').fontSize(7.5)
        .text(label, x + 12, y + 32, { width: w - 16 });
    };

    // ── HEADER ──
    doc.rect(0, 0, 595, 80).fill(DARK);
    doc.fillColor(EDRO_BLUE).font('Helvetica-Bold').fontSize(22).text('edro', 50, 22);
    doc.fillColor('#ffffff').font('Helvetica').fontSize(9).text('by edro.digital', 50, 46);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(14)
      .text(`Relatório Mensal — ${clientName}`, 160, 22, { align: 'right', width: 385 });
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8.5)
      .text(`Período: ${dateFrom} a ${dateTo}`, 160, 43, { align: 'right', width: 385 });
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7.5)
      .text(`Gerado em ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} · Confidencial`, 160, 57, { align: 'right', width: 385 });
    doc.moveDown(3.5);

    // ── KPIs ──
    sectionHeader('Resumo do Período');
    const kpiY = doc.y;
    const kpiW = Math.floor(pageW / 4) - 4;
    kpiBox('Briefings', String(summary?.total || 0), EDRO_BLUE, 50, kpiY, kpiW);
    kpiBox('Concluídos', String(summary?.completed || 0), ACCENT, 50 + kpiW + 6, kpiY, kpiW);
    kpiBox('Taxa de Conclusão', `${completionRate}%`, '#F97316', 50 + (kpiW + 6) * 2, kpiY, kpiW);
    kpiBox('Copies Gerados', String(copies?.total_copies || 0), '#A855F7', 50 + (kpiW + 6) * 3, kpiY, kpiW);
    doc.moveDown(4.5);

    // Performance metrics if available
    if (totalImpressions > 0 || totalLikes > 0) {
      const pm2W = Math.floor(pageW / 3) - 4;
      const pm2Y = doc.y;
      kpiBox('Impressões', totalImpressions.toLocaleString('pt-BR'), '#1877F2', 50, pm2Y, pm2W);
      kpiBox('Curtidas', totalLikes.toLocaleString('pt-BR'), '#E85219', 50 + pm2W + 6, pm2Y, pm2W);
      kpiBox('Comentários', totalComments.toLocaleString('pt-BR'), '#0A66C2', 50 + (pm2W + 6) * 2, pm2Y, pm2W);
      doc.moveDown(4.5);
    }

    // ── AI Narrative ──
    sectionHeader('Análise Executiva por IA');
    doc.fillColor(DARK).font('Helvetica').fontSize(9).text(narrative, 50, doc.y, { width: pageW, lineGap: 3 });
    doc.moveDown(1);

    // ── Learning Insights ──
    if ((learningRules as any[]).length > 0) {
      sectionHeader('Insights do Motor de Aprendizado');
      (learningRules as any[]).forEach((r: any, i: number) => {
        if (!r.rule_text) return;
        doc.fillColor(EDRO_BLUE).font('Helvetica-Bold').fontSize(8).text(`${i + 1}.`, 50, doc.y, { continued: true, width: 14 });
        doc.fillColor(DARK).font('Helvetica').fontSize(8.5).text(` ${r.rule_text}`, { width: pageW - 14, lineGap: 2 });
        doc.moveDown(0.3);
      });
      doc.moveDown(0.5);
    }

    // ── Stage Timeline ──
    if ((stageTimeline as any[]).length > 0) {
      sectionHeader('Tempo Médio por Etapa');
      (stageTimeline as any[]).forEach((s: any) => {
        const barW = Math.min(Math.round((Number(s.avg_hours) / 48) * (pageW - 120)), pageW - 120);
        doc.fillColor(GRAY).font('Helvetica').fontSize(8).text(s.stage, 50, doc.y + 3, { width: 100 });
        doc.rect(155, doc.y - 9, Math.max(barW, 4), 10).fill(EDRO_BLUE);
        doc.fillColor(DARK).font('Helvetica-Bold').fontSize(8)
          .text(`${s.avg_hours}h`, 155 + Math.max(barW, 4) + 6, doc.y - 12);
        doc.moveDown(0.5);
      });
      doc.moveDown(0.5);
    }

    // ── Top Briefings ──
    if ((topBriefings as any[]).length > 0) {
      sectionHeader('Demandas do Período');
      const statusEmoji: Record<string, string> = { done: '✓', concluido: '✓', aprovacao: '⏳', producao: '🔨', revisao: '🔍' };
      (topBriefings as any[]).forEach((b: any) => {
        const mark = statusEmoji[b.status] || '·';
        doc.fillColor(EDRO_BLUE).font('Helvetica-Bold').fontSize(8).text(`${mark}`, 50, doc.y, { continued: true, width: 14 });
        doc.fillColor(DARK).font('Helvetica').fontSize(8.5).text(` ${b.title || 'Sem título'}`, { width: pageW - 14, lineGap: 1 });
      });
      doc.moveDown(0.8);
    }

    // ── FOOTER ──
    const footerY = 780;
    doc.rect(0, footerY, 595, 62).fill(DARK);
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(7.5)
      .text('Relatório gerado automaticamente pela plataforma Edro.Digital · www.edro.digital', 50, footerY + 12, { width: pageW, align: 'center' });
    doc.fillColor(EDRO_BLUE).font('Helvetica-Bold').fontSize(7.5)
      .text('Confidencial — uso exclusivo do cliente', 50, footerY + 28, { width: pageW, align: 'center' });

    doc.end();

    await new Promise<void>((resolve) => doc.on('end', resolve));
    const pdfBuffer = Buffer.concat(chunks);
    const filename = `relatorio-${clientName.replace(/\s+/g, '-').toLowerCase()}-${dateFrom}.pdf`;

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    reply.header('Content-Length', pdfBuffer.length);
    return reply.send(pdfBuffer);
  });

  // ── Copy ROI Scores — get cached ───────────────────────────────────────────
  app.get('/clients/:clientId/reports/copy-roi', {
    preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')],
  }, async (request: any, reply: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };
    const scores = await getClientCopyRoiScores(tenantId, clientId);
    return { scores };
  });

  // ── Copy ROI Scores — trigger computation ──────────────────────────────────
  app.post('/clients/:clientId/reports/compute-copy-roi', {
    preHandler: [authGuard, tenantGuard(), requirePerm('exports:read')],
  }, async (request: any, reply: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };
    const scores = await computeClientCopyRoi(tenantId, clientId);
    return { ok: true, computed: scores.length, scores };
  });
}
