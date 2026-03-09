import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';

// Recall.ai pricing: $0.02 / recording-minute (Starter plan)
const RECALL_COST_USD_PER_MIN = 0.02;
const USD_TO_BRL = 5.45;

// Platform catalog — shared source of truth for costs page
const PLATFORM_DEFS = [
  { platform: 'claude',          name: 'Anthropic Claude',          category: 'IA / LLM',                  model: 'usage',        color: '#D97706', tracked: true,  url: 'https://anthropic.com' },
  { platform: 'openai',          name: 'OpenAI (GPT + Whisper)',     category: 'IA / LLM + Áudio',          model: 'usage',        color: '#10A37F', tracked: true,  url: 'https://openai.com' },
  { platform: 'gemini',          name: 'Google Gemini',              category: 'IA / LLM + Imagem',         model: 'freemium',     color: '#4285F4', tracked: true,  url: 'https://ai.google.dev' },
  { platform: 'perplexity',      name: 'Perplexity',                 category: 'IA / Pesquisa',             model: 'usage',        color: '#20B2AA', tracked: true,  url: 'https://perplexity.ai' },
  { platform: 'leonardo',        name: 'Leonardo.ai',                category: 'Geração de Imagem',         model: 'usage',        color: '#C026D3', tracked: true,  url: 'https://leonardo.ai' },
  { platform: 'fal',             name: 'fal.ai (Flux + Kling)',      category: 'Imagem + Vídeo',            model: 'usage',        color: '#F59E0B', tracked: true,  url: 'https://fal.ai' },
  { platform: 'tavily',          name: 'Tavily',                     category: 'Busca Web',                 model: 'freemium',     color: '#0EA5E9', tracked: true,  url: 'https://tavily.com' },
  { platform: 'recall',          name: 'Recall.ai',                  category: 'Transcrição de Reuniões',   model: 'usage',        color: '#7C3AED', tracked: true,  url: 'https://recall.ai' },
  { platform: 'whatsapp',        name: 'WhatsApp Cloud API',         category: 'Mensageria',                model: 'usage',        color: '#25D366', tracked: false, url: 'https://business.whatsapp.com' },
  { platform: 'evolution',       name: 'Evolution API / VPS',        category: 'WhatsApp (self-hosted)',    model: 'subscription', color: '#128C7E', tracked: false, url: 'https://evolution-api.com' },
  { platform: 'reportei',        name: 'Reportei',                   category: 'Analytics / Relatórios',   model: 'subscription', color: '#FF6B35', tracked: false, url: 'https://reportei.com' },
  { platform: 'omie',            name: 'Omie (ERP)',                 category: 'ERP / NFS-e',              model: 'subscription', color: '#1E88E5', tracked: false, url: 'https://omie.com.br' },
  { platform: 's3',              name: 'AWS S3',                     category: 'Storage',                  model: 'usage',        color: '#FF9900', tracked: false, url: 'https://aws.amazon.com/s3' },
  { platform: 'gmail_pubsub',    name: 'Gmail API + Pub/Sub',        category: 'E-mail Inbox',             model: 'freemium',     color: '#EA4335', tracked: false, url: 'https://developers.google.com/gmail' },
  { platform: 'meta_graph',      name: 'Meta Graph API',             category: 'Social (Meta)',            model: 'free',         color: '#0866FF', tracked: false, url: 'https://developers.facebook.com' },
  { platform: 'linkedin',        name: 'LinkedIn API',               category: 'Social (LinkedIn)',        model: 'free',         color: '#0A66C2', tracked: false, url: 'https://developer.linkedin.com' },
  { platform: 'tiktok',          name: 'TikTok API',                 category: 'Social (TikTok)',          model: 'free',         color: '#010101', tracked: false, url: 'https://developers.tiktok.com' },
  { platform: 'google_calendar', name: 'Google Calendar + Meet API', category: 'Calendário / Reuniões',   model: 'free',         color: '#4285F4', tracked: false, url: 'https://developers.google.com/calendar' },
] as const;

async function ensurePlatformCostsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS edro_platform_costs (
      platform         TEXT          PRIMARY KEY,
      monthly_cost_usd NUMERIC(10,4) NOT NULL DEFAULT 0,
      notes            TEXT,
      updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
    )
  `);
}

export default async function adminAiCostsRoutes(app: FastifyInstance) {
  app.get(
    '/admin/ai-costs',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any) => {
      const { days } = z
        .object({ days: z.coerce.number().int().min(1).max(365).default(30) })
        .parse(request.query);

      const tenantId = (request.user as any).tenant_id;

      const [totals, byProvider, byDay, byFeature, recent, recall] = await Promise.all([
        query(
          `SELECT
            COUNT(*)::int as total_calls,
            COALESCE(SUM(input_tokens), 0)::bigint as total_input_tokens,
            COALESCE(SUM(output_tokens), 0)::bigint as total_output_tokens,
            COALESCE(SUM(cost_usd), 0)::numeric as total_cost_usd,
            COALESCE(SUM(cost_brl), 0)::numeric as total_cost_brl,
            COALESCE(AVG(duration_ms), 0)::int as avg_duration_ms
          FROM ai_usage_log
          WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2`,
          [tenantId, days]
        ),
        query(
          `SELECT provider, model,
            COUNT(*)::int as calls,
            SUM(input_tokens)::bigint as input_tokens,
            SUM(output_tokens)::bigint as output_tokens,
            SUM(cost_usd)::numeric as cost_usd,
            SUM(cost_brl)::numeric as cost_brl,
            AVG(duration_ms)::int as avg_duration_ms
          FROM ai_usage_log
          WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2
          GROUP BY provider, model
          ORDER BY SUM(cost_brl) DESC`,
          [tenantId, days]
        ),
        query(
          `SELECT DATE(created_at) as day,
            provider,
            SUM(cost_brl)::numeric as cost_brl,
            COUNT(*)::int as calls
          FROM ai_usage_log
          WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2
          GROUP BY DATE(created_at), provider
          ORDER BY day`,
          [tenantId, days]
        ),
        query(
          `SELECT feature,
            COUNT(*)::int as calls,
            SUM(cost_brl)::numeric as cost_brl
          FROM ai_usage_log
          WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2
          GROUP BY feature
          ORDER BY SUM(cost_brl) DESC`,
          [tenantId, days]
        ),
        query(
          `SELECT id, provider, model, feature, input_tokens, output_tokens,
                  cost_brl, duration_ms, metadata, created_at
          FROM ai_usage_log
          WHERE tenant_id = $1
          ORDER BY created_at DESC
          LIMIT 50`,
          [tenantId]
        ),
        // Recall.ai — derived from meetings table
        query(
          `SELECT
            COUNT(*)::int                                                          AS total_bots,
            COUNT(*) FILTER (WHERE status = 'analyzed')::int                      AS completed,
            COUNT(*) FILTER (WHERE status = 'processing')::int                    AS in_progress,
            COALESCE(SUM(duration_secs), 0)::int                                  AS total_duration_secs,
            COUNT(DISTINCT DATE(created_at))::int                                 AS active_days,
            MAX(created_at)                                                        AS last_meeting_at
           FROM meetings
           WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2`,
          [tenantId, days]
        ),
      ]);

      const recallRow = recall.rows[0] ?? {
        total_bots: 0, completed: 0, in_progress: 0,
        total_duration_secs: 0, active_days: 0, last_meeting_at: null,
      };
      const recallMinutes = Math.ceil(Number(recallRow.total_duration_secs) / 60);
      const recallCostUsd = recallMinutes * RECALL_COST_USD_PER_MIN;
      const recallCostBrl = recallCostUsd * USD_TO_BRL;

      return {
        totals: totals.rows[0] || {
          total_calls: 0,
          total_input_tokens: 0,
          total_output_tokens: 0,
          total_cost_usd: 0,
          total_cost_brl: 0,
          avg_duration_ms: 0,
        },
        by_provider: byProvider.rows,
        by_day: byDay.rows,
        by_feature: byFeature.rows,
        recent: recent.rows,
        recall: {
          total_bots: Number(recallRow.total_bots),
          completed: Number(recallRow.completed),
          in_progress: Number(recallRow.in_progress),
          total_minutes: recallMinutes,
          cost_usd: recallCostUsd,
          cost_brl: recallCostBrl,
          active_days: Number(recallRow.active_days),
          last_meeting_at: recallRow.last_meeting_at,
        },
      };
    }
  );

  // ── GET /admin/platform-costs ─────────────────────────────────────────────
  // Returns merged real (from ai_usage_log + meetings) + manual monthly costs
  app.get(
    '/admin/platform-costs',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      await ensurePlatformCostsTable();
      const tenantId = (request.user as any).tenant_id;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [realCosts, recallData, fixedCosts] = await Promise.all([
        query(
          `SELECT provider, SUM(cost_usd)::numeric AS cost_usd, SUM(cost_brl)::numeric AS cost_brl
           FROM ai_usage_log
           WHERE tenant_id = $1 AND created_at >= $2
           GROUP BY provider`,
          [tenantId, monthStart],
        ),
        query(
          `SELECT COALESCE(SUM(duration_secs), 0)::int AS total_duration_secs
           FROM meetings
           WHERE tenant_id = $1 AND created_at >= $2`,
          [tenantId, monthStart],
        ),
        query(`SELECT platform, monthly_cost_usd FROM edro_platform_costs`),
      ]);

      const realByProvider: Record<string, { usd: number; brl: number }> = {};
      for (const row of realCosts.rows) {
        realByProvider[row.provider] = { usd: Number(row.cost_usd), brl: Number(row.cost_brl) };
      }

      const recallMins = Math.ceil(Number(recallData.rows[0]?.total_duration_secs ?? 0) / 60);
      const recallUsd = recallMins * RECALL_COST_USD_PER_MIN;

      const fixedMap: Record<string, number> = {};
      for (const row of fixedCosts.rows) fixedMap[row.platform] = Number(row.monthly_cost_usd);

      const data = PLATFORM_DEFS.map((p) => {
        let cost_usd = 0;
        let cost_brl = 0;
        let source: 'tracked' | 'manual' | 'free' = 'manual';

        if (p.platform === 'recall') {
          cost_usd = recallUsd;
          cost_brl = recallUsd * USD_TO_BRL;
          source = 'tracked';
        } else if (p.tracked && realByProvider[p.platform as string]) {
          cost_usd = realByProvider[p.platform as string].usd;
          cost_brl = realByProvider[p.platform as string].brl;
          source = 'tracked';
        } else if (p.model === 'free') {
          source = 'free';
        } else {
          cost_usd = fixedMap[p.platform as string] ?? 0;
          cost_brl = cost_usd * USD_TO_BRL;
          source = 'manual';
        }

        return {
          platform: p.platform,
          name: p.name,
          category: p.category,
          model: p.model,
          color: p.color,
          url: p.url,
          cost_usd: Number(cost_usd.toFixed(4)),
          cost_brl: Number(cost_brl.toFixed(2)),
          source,
        };
      });

      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      return reply.send({ success: true, month: monthStr, data });
    },
  );

  // ── PATCH /admin/platform-costs/:platform ────────────────────────────────
  // Update the fixed monthly cost for a non-tracked platform
  app.patch(
    '/admin/platform-costs/:platform',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      await ensurePlatformCostsTable();
      const { platform } = request.params as { platform: string };
      const { monthly_cost_usd } = z
        .object({ monthly_cost_usd: z.number().min(0).max(999999) })
        .parse(request.body);

      await query(
        `INSERT INTO edro_platform_costs (platform, monthly_cost_usd)
         VALUES ($1, $2)
         ON CONFLICT (platform) DO UPDATE SET monthly_cost_usd = $2, updated_at = now()`,
        [platform, monthly_cost_usd],
      );

      return reply.send({ success: true });
    },
  );
}
