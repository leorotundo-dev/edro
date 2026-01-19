import { FastifyInstance } from 'fastify';
import { getIaUsage, MonitoringService } from '../middleware/monitoring';
import { query } from '../db';
import { CostBudgetRepository } from '../repositories/costBudgetRepository';
import { getPricingForModel } from '../services/ai/aiPricing';
import { getAiUsageForPeriod } from '../services/ai/aiUsageStore';
import { getLastOpenAiUsageError, getOpenAiUsageForPeriod } from '../services/ai/openaiUsageApi';
import { getDatabaseHealth } from '../services/databaseHealthService';
import { getEditalStorageUsage } from '../services/fileStorage';
import { getRedisStats } from '../services/redisCache';

function toNumber(val: string | undefined, fallback: number) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

function normalizePlanCode(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  return normalized || 'free';
}

function getBillingPeriod(now: Date, billingDay: number) {
  const day = Math.min(Math.max(billingDay, 1), 28);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const startThisMonth = new Date(Date.UTC(year, month, day));
  const start =
    now.getUTCDate() >= day
      ? startThisMonth
      : new Date(Date.UTC(year, month - 1, day));

  return {
    start,
    end: now,
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
  };
}

export async function adminCostsRealRoutes(app: FastifyInstance) {
  /**
   * GET /admin/costs/real/overview
   * Retorna custos estimados em BRL com base em consumo medido e pre├ºos default.
   * Valores podem ser ajustados via env:
   *  - USD_TO_BRL (ou BRL_PER_USD)
   *  - RAILWAY_COST_MONTHLY_USD, VERCEL_COST_MONTHLY_USD, POSTGRES_COST_MONTHLY_USD, REDIS_COST_MONTHLY_USD,
   *    SENTRY_COST_MONTHLY_USD, SENDGRID_COST_MONTHLY_USD, TWILIO_COST_MONTHLY_USD
   */
  app.get('/admin/costs/real/overview', async (_req, reply) => {
    try {
      const usdToBrl = toNumber(process.env.USD_TO_BRL || process.env.BRL_PER_USD, 5.2);

      const gptModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
      const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
      const openAiBudgetUsd = toNumber(process.env.OPENAI_BUDGET_USD, 0);

      const gptPricing = getPricingForModel(gptModel);
      const embeddingPricing = getPricingForModel(embeddingModel);

      const billingDay = toNumber(process.env.BILLING_CYCLE_DAY, 1);
      const billingPeriod = getBillingPeriod(new Date(), billingDay);
      const apiUsage = await getOpenAiUsageForPeriod(billingPeriod.startDate, billingPeriod.endDate);
      const persistedUsage = await getAiUsageForPeriod(billingPeriod.startDate, billingPeriod.endDate);
      const liveUsage = getIaUsage();
      const promptTokens =
        apiUsage?.totals.prompt_tokens ??
        persistedUsage?.totals.prompt_tokens ??
        liveUsage.promptTokens ??
        0;
      const completionTokens =
        apiUsage?.totals.completion_tokens ??
        persistedUsage?.totals.completion_tokens ??
        liveUsage.completionTokens ??
        0;
      const totalTokens =
        apiUsage?.totals.total_tokens ??
        persistedUsage?.totals.total_tokens ??
        liveUsage.totalTokens ??
        promptTokens + completionTokens;
      const totalCalls =
        apiUsage?.totals.calls ??
        persistedUsage?.totals.calls ??
        liveUsage.totalCalls ??
        0;
      const usageSource = apiUsage ? 'openai_api' : persistedUsage ? 'db' : 'memory';
      const usageApiError = apiUsage ? null : getLastOpenAiUsageError();
      const gptInputUsd = promptTokens * (gptPricing.input || 0);
      const gptOutputUsd = completionTokens * (gptPricing.output || 0);
      const gptTotalUsd = gptInputUsd + gptOutputUsd;

      const embeddingTokens =
        apiUsage?.byModel?.[embeddingModel]?.total_tokens ??
        persistedUsage?.byModel?.[embeddingModel]?.total_tokens ??
        liveUsage.byModel[embeddingModel]?.tokens ??
        0;
      const embeddingTotalUsd = embeddingTokens * (embeddingPricing.input || 0);

      const computedOpenAiUsd = gptTotalUsd + embeddingTotalUsd;

      let logTotals = { cost_usd: 0, total_tokens: 0, total_calls: 0 };
      let planUsage: Array<{
        plan: string;
        users: number;
        totalCalls: number;
        totalTokens: number;
        costUsd: number;
        costBrl: number;
      }> = [];
      let userUsage: Array<{
        userId: string;
        name: string;
        email: string | null;
        plan: string;
        totalCalls: number;
        totalTokens: number;
        costUsd: number;
        costBrl: number;
      }> = [];

      try {
        const [logTotalsResult, planUsageResult, userUsageResult] = await Promise.all([
          query<{ cost_usd: string | null; total_tokens: string | null; total_calls: string | null }>(
            `SELECT
               COALESCE(SUM(cost_usd), 0) as cost_usd,
               COALESCE(SUM(total_tokens), 0) as total_tokens,
               COUNT(*) as total_calls
             FROM logs_ia
             WHERE timestamp >= $1 AND timestamp <= $2`,
            [billingPeriod.start, billingPeriod.end]
          ),
          query<{ plan: string; users: string; total_calls: string; total_tokens: string; cost_usd: string }>(
            `SELECT
               COALESCE(NULLIF(LOWER(l.context->>'plan'), ''), NULLIF(LOWER(u.plan), ''), 'free') as plan,
               COUNT(DISTINCT l.user_id) as users,
               COUNT(*) as total_calls,
               COALESCE(SUM(l.total_tokens), 0) as total_tokens,
               COALESCE(SUM(l.cost_usd), 0) as cost_usd
             FROM logs_ia l
             LEFT JOIN users u ON u.id = l.user_id
             WHERE l.timestamp >= $1 AND l.timestamp <= $2
             GROUP BY plan
             ORDER BY cost_usd DESC NULLS LAST`,
            [billingPeriod.start, billingPeriod.end]
          ),
          query<{ user_id: string; name: string | null; email: string | null; plan: string; total_calls: string; total_tokens: string; cost_usd: string }>(
            `SELECT
               l.user_id,
               COALESCE(NULLIF(u.full_name, ''), NULLIF(u.email, ''), 'Usuario') as name,
               u.email,
               COALESCE(NULLIF(LOWER(l.context->>'plan'), ''), NULLIF(LOWER(u.plan), ''), 'free') as plan,
               COUNT(*) as total_calls,
               COALESCE(SUM(l.total_tokens), 0) as total_tokens,
               COALESCE(SUM(l.cost_usd), 0) as cost_usd
             FROM logs_ia l
             LEFT JOIN users u ON u.id = l.user_id
             WHERE l.timestamp >= $1 AND l.timestamp <= $2
               AND l.user_id IS NOT NULL
             GROUP BY l.user_id, u.full_name, u.email, plan
             ORDER BY cost_usd DESC NULLS LAST
             LIMIT 20`,
            [billingPeriod.start, billingPeriod.end]
          ),
        ]);

        const logRow = logTotalsResult.rows[0] || {};
        logTotals = {
          cost_usd: Number(logRow.cost_usd || 0),
          total_tokens: Number(logRow.total_tokens || 0),
          total_calls: Number(logRow.total_calls || 0),
        };

        planUsage = planUsageResult.rows.map((row) => {
          const costUsd = Number(row.cost_usd || 0);
          return {
            plan: normalizePlanCode(row.plan),
            users: Number(row.users || 0),
            totalCalls: Number(row.total_calls || 0),
            totalTokens: Number(row.total_tokens || 0),
            costUsd,
            costBrl: costUsd * usdToBrl,
          };
        });

        userUsage = userUsageResult.rows.map((row) => {
          const costUsd = Number(row.cost_usd || 0);
          return {
            userId: row.user_id,
            name: row.name || 'Usuario',
            email: row.email,
            plan: normalizePlanCode(row.plan),
            totalCalls: Number(row.total_calls || 0),
            totalTokens: Number(row.total_tokens || 0),
            costUsd,
            costBrl: costUsd * usdToBrl,
          };
        });
      } catch (err) {
        console.warn('[admin-costs] Failed to read AI usage logs.', err);
      }

      const logTotalUsd = logTotals.cost_usd || 0;
      const openAiTotalUsd = logTotalUsd > 0 ? logTotalUsd : computedOpenAiUsd;
      const openAiTotalBrl = openAiTotalUsd * usdToBrl;

      // Custos fixos estimados (podem ser alterados via env)
      const railwayUsd = toNumber(process.env.RAILWAY_COST_MONTHLY_USD, 15);
      const vercelUsd = toNumber(process.env.VERCEL_COST_MONTHLY_USD, 0);
      const postgresUsd = toNumber(process.env.POSTGRES_COST_MONTHLY_USD, 0);
      const redisUsd = toNumber(process.env.REDIS_COST_MONTHLY_USD, 0);
      const sentryUsd = toNumber(process.env.SENTRY_COST_MONTHLY_USD, 0);
      const sendgridUsd = toNumber(process.env.SENDGRID_COST_MONTHLY_USD, 0);
      const twilioUsd = toNumber(process.env.TWILIO_COST_MONTHLY_USD, 0);

      const postgresLimitGb = toNumber(process.env.POSTGRES_STORAGE_LIMIT_GB, 0);
      const redisLimitGb = toNumber(process.env.REDIS_STORAGE_LIMIT_GB, 0);
      const s3LimitGb = toNumber(process.env.S3_STORAGE_LIMIT_GB, 0);
      const s3Usd = toNumber(process.env.S3_COST_MONTHLY_USD, 0);
      const s3Bucket = process.env.S3_BUCKET;

      const [dbHealth, redisStats, editalStorage] = await Promise.all([
        getDatabaseHealth().catch(() => null),
        getRedisStats().catch(() => null),
        getEditalStorageUsage().catch(() => null),
      ]);
      const postgresUsedMb = dbHealth ? Number(dbHealth.size_mb || 0) : 0;
      const postgresUsedGb = postgresUsedMb ? postgresUsedMb / 1024 : 0;
      const redisUsedMb = redisStats ? Number(redisStats.memory_mb || 0) : 0;
      const redisUsedGb = redisUsedMb ? redisUsedMb / 1024 : 0;
      const redisLimitMbFromStats = redisStats ? Number(redisStats.maxmemory_mb || 0) : 0;
      const redisLimitGbFromStats = redisLimitMbFromStats ? redisLimitMbFromStats / 1024 : 0;
      const editalStorageMb = editalStorage?.usedBytes ? editalStorage.usedBytes / 1024 / 1024 : 0;
      const editalStorageGb = editalStorageMb ? editalStorageMb / 1024 : 0;

      const s3ServiceName =
        editalStorage?.location === 's3'
          ? `AWS S3 (${s3Bucket || 'editais'})`
          : 'Storage local (Editais)';

      const breakdown = [
        {
          service: 'Railway',
          cost: railwayUsd * usdToBrl,
          costCents: Math.round(railwayUsd * usdToBrl * 100),
          breakdown: { monthly_usd: railwayUsd, monthly_brl: railwayUsd * usdToBrl },
          status: 'success',
        },
        {
          service: 'Vercel',
          cost: vercelUsd * usdToBrl,
          costCents: Math.round(vercelUsd * usdToBrl * 100),
          breakdown: { monthly_usd: vercelUsd, monthly_brl: vercelUsd * usdToBrl },
          status: 'success',
        },
        {
          service: 'OpenAI',
          cost: openAiTotalBrl,
          costCents: Math.round(openAiTotalBrl * 100),
          breakdown: {
            model: gptModel,
            embedding_model: embeddingModel,
            input_tokens: promptTokens,
            output_tokens: completionTokens,
            embeddings_tokens: embeddingTokens,
            total_tokens: totalTokens,
            total_calls: totalCalls,
            usd_input: gptInputUsd,
            usd_output: gptOutputUsd,
            usd_embeddings: embeddingTotalUsd,
            usd_total: openAiTotalUsd,
            brl_total: openAiTotalBrl,
            budget_usd: openAiBudgetUsd,
            budget_brl: openAiBudgetUsd * usdToBrl,
            period_start: billingPeriod.startDate,
            period_end: billingPeriod.endDate,
            source: usageSource,
            usage_api_error: usageApiError,
          },
          status: 'success',
        },
        {
          service: 'Sentry',
          cost: sentryUsd * usdToBrl,
          costCents: Math.round(sentryUsd * usdToBrl * 100),
          breakdown: { monthly_usd: sentryUsd, monthly_brl: sentryUsd * usdToBrl },
          status: 'pending',
        },
        {
          service: 'Postgres',
          cost: postgresUsd * usdToBrl,
          costCents: Math.round(postgresUsd * usdToBrl * 100),
          breakdown: {
            monthly_usd: postgresUsd,
            monthly_brl: postgresUsd * usdToBrl,
            storage_used_mb: postgresUsedMb,
            storage_used_gb: postgresUsedGb,
            storage_limit_gb: postgresLimitGb || null,
          },
          status: 'pending',
        },
        {
          service: 'Redis',
          cost: redisUsd * usdToBrl,
          costCents: Math.round(redisUsd * usdToBrl * 100),
          breakdown: {
            monthly_usd: redisUsd,
            monthly_brl: redisUsd * usdToBrl,
            memory_used_mb: redisUsedMb,
            memory_used_gb: redisUsedGb,
            memory_limit_gb: redisLimitGb || redisLimitGbFromStats || null,
          },
          status: 'pending',
        },
        {
          service: s3ServiceName,
          cost: s3Usd * usdToBrl,
          costCents: Math.round(s3Usd * usdToBrl * 100),
          breakdown: {
            monthly_usd: s3Usd,
            monthly_brl: s3Usd * usdToBrl,
            storage_used_mb: editalStorageMb,
            storage_used_gb: editalStorageGb,
            storage_limit_gb: s3LimitGb || null,
            storage_location: editalStorage?.location || 'local',
          },
          status: 'pending',
        },
        {
          service: 'SendGrid',
          cost: sendgridUsd * usdToBrl,
          costCents: Math.round(sendgridUsd * usdToBrl * 100),
          breakdown: { monthly_usd: sendgridUsd, monthly_brl: sendgridUsd * usdToBrl },
          status: 'pending',
        },
        {
          service: 'Twilio',
          cost: twilioUsd * usdToBrl,
          costCents: Math.round(twilioUsd * usdToBrl * 100),
          breakdown: { monthly_usd: twilioUsd, monthly_brl: twilioUsd * usdToBrl },
          status: 'pending',
        },
      ];

      const totalCost = breakdown.reduce((sum, item) => sum + item.cost, 0);

      const planUsageMap = new Map(planUsage.map((row) => [normalizePlanCode(row.plan), row]));
      const userUsageMap = new Map(userUsage.map((row) => [row.userId, row]));
      let budgets: Array<any> = [];

      try {
        const rawBudgets = await CostBudgetRepository.listBudgets('openai');
        budgets = rawBudgets.map((budget) => {
          let usedUsd = 0;
          if (budget.scope === 'global') {
            usedUsd = openAiTotalUsd;
          } else if (budget.scope === 'plan') {
            const planKey = normalizePlanCode(budget.plan_code);
            usedUsd = planUsageMap.get(planKey)?.costUsd || 0;
          } else if (budget.scope === 'user' && budget.user_id) {
            usedUsd = userUsageMap.get(budget.user_id)?.costUsd || 0;
          }

          const budgetUsd = Number(budget.budget_usd || 0);
          const threshold = Number.isFinite(Number(budget.alert_threshold)) ? Number(budget.alert_threshold) : 0.9;
          const usagePercent = budgetUsd > 0 ? (usedUsd / budgetUsd) * 100 : 0;
          const status = usagePercent >= 100 ? 'critical' : usagePercent >= threshold * 100 ? 'warning' : 'ok';

          if (budget.enabled && budgetUsd > 0 && status !== 'ok') {
            const label = budget.scope === 'global'
              ? 'global'
              : budget.scope === 'plan'
              ? `plan:${budget.plan_code || 'free'}`
              : `user:${budget.user_id}`;
            MonitoringService.triggerAlert(
              status === 'critical' ? 'critical' : 'warning',
              `Budget ${budget.service} ${label} acima do limite`,
              {
                scope: budget.scope,
                plan_code: budget.plan_code,
                user_id: budget.user_id,
                budget_usd: budgetUsd,
                used_usd: usedUsd,
                usage_percent: usagePercent,
              }
            );
          }

          return {
            ...budget,
            budget_usd: budgetUsd,
            alert_threshold: threshold,
            used_usd: usedUsd,
            used_brl: usedUsd * usdToBrl,
            usage_percent: usagePercent,
            status,
          };
        });
      } catch (err) {
        console.warn('[admin-costs] Failed to read budgets.', err);
      }

      return reply.send({
        success: true,
        data: {
          totalCost,
          currency: 'BRL',
          period: 'monthly',
          breakdown,
          usagePeriod: {
            startDate: billingPeriod.startDate,
            endDate: billingPeriod.endDate,
          },
          usdToBrl,
          openAiUsage: {
            totalUsd: openAiTotalUsd,
            totalBrl: openAiTotalBrl,
            totalTokens,
            totalCalls,
            source: usageSource,
            logTotals,
          },
          planUsage,
          userUsage,
          budgets,
          lastUpdated: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      return reply.status(500).send({
        error: 'Failed to get costs overview',
        message: error.message,
      });
    }
  });

  /**
   * GET /admin/costs/real/railway
   */
  app.get('/admin/costs/real/railway', async (_req, reply) => {
    const usdToBrl = toNumber(process.env.USD_TO_BRL || process.env.BRL_PER_USD, 5.2);
    const railwayUsd = toNumber(process.env.RAILWAY_COST_MONTHLY_USD, 15);
    return reply.send({
      success: true,
      data: {
        service: 'railway',
        total: railwayUsd * usdToBrl,
        breakdown: { monthly_usd: railwayUsd, monthly_brl: railwayUsd * usdToBrl },
        lastUpdated: new Date().toISOString(),
      },
    });
  });

  /**
   * GET /admin/costs/real/vercel
   */
  app.get('/admin/costs/real/vercel', async (_req, reply) => {
    const usdToBrl = toNumber(process.env.USD_TO_BRL || process.env.BRL_PER_USD, 5.2);
    const vercelUsd = toNumber(process.env.VERCEL_COST_MONTHLY_USD, 0);
    return reply.send({
      success: true,
      data: {
        service: 'vercel',
        total: vercelUsd * usdToBrl,
        breakdown: { monthly_usd: vercelUsd, monthly_brl: vercelUsd * usdToBrl },
        lastUpdated: new Date().toISOString(),
      },
    });
  });

  /**
   * GET /admin/costs/real/openai
   */
  app.get('/admin/costs/real/openai', async (_req, reply) => {
    const billingDay = toNumber(process.env.BILLING_CYCLE_DAY, 1);
    const billingPeriod = getBillingPeriod(new Date(), billingDay);
    const apiUsage = await getOpenAiUsageForPeriod(billingPeriod.startDate, billingPeriod.endDate);
    const persistedUsage = await getAiUsageForPeriod(billingPeriod.startDate, billingPeriod.endDate);
    const liveUsage = getIaUsage();
    return reply.send({
      success: true,
      data: {
        service: 'openai',
        usage: apiUsage || persistedUsage || liveUsage,
        source: apiUsage ? 'openai_api' : persistedUsage ? 'db' : 'memory',
        period: {
          start: billingPeriod.startDate,
          end: billingPeriod.endDate,
        },
        lastUpdated: new Date().toISOString(),
      },
    });
  });

  /**
   * GET /admin/costs/budgets
   * Lista budgets configurados
   */
  app.get('/admin/costs/budgets', async (_req, reply) => {
    try {
      const budgets = await CostBudgetRepository.listBudgets();
      return reply.send({ success: true, data: budgets });
    } catch (error: any) {
      console.error('[admin-costs] Failed to load budgets', error);
      return reply.status(500).send({ error: 'Failed to load budgets' });
    }
  });

  /**
   * PUT /admin/costs/budgets
   * Atualiza budgets (global/plan/user)
   */
  app.put('/admin/costs/budgets', async (req, reply) => {
    const body = req.body as { items?: any[] };
    if (!body || !Array.isArray(body.items)) {
      return reply.status(400).send({ error: 'items must be an array' });
    }

    try {
      for (const item of body.items) {
        const scope = String(item.scope || '').toLowerCase();
        if (!['global', 'plan', 'user'].includes(scope)) {
          return reply.status(400).send({ error: `invalid scope: ${scope}` });
        }

        const budgetUsd = Number(item.budget_usd);
        if (!Number.isFinite(budgetUsd) || budgetUsd < 0) {
          return reply.status(400).send({ error: 'budget_usd must be a positive number' });
        }

        const alertThresholdRaw = item.alert_threshold;
        const alertThreshold = Number.isFinite(Number(alertThresholdRaw))
          ? Number(alertThresholdRaw)
          : 0.9;

        const planCode = item.plan_code ?? null;
        const userId = item.user_id ?? null;

        if (scope === 'plan' && !planCode) {
          return reply.status(400).send({ error: 'plan_code is required for scope=plan' });
        }
        if (scope === 'user' && !userId) {
          return reply.status(400).send({ error: 'user_id is required for scope=user' });
        }

        await CostBudgetRepository.upsertBudget({
          scope: scope as any,
          service: item.service || 'openai',
          plan_code: planCode,
          user_id: userId,
          budget_usd: budgetUsd,
          alert_threshold: alertThreshold,
          enabled: item.enabled !== false,
        });
      }

      const budgets = await CostBudgetRepository.listBudgets();
      return reply.send({ success: true, data: budgets });
    } catch (error: any) {
      console.error('[admin-costs] Failed to update budgets', error);
      return reply.status(500).send({ error: 'Failed to update budgets' });
    }
  });
}

export default adminCostsRealRoutes;
