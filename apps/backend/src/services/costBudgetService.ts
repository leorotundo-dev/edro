import { query } from '../db';
import { CostBudget, CostBudgetRepository } from '../repositories/costBudgetRepository';

type BudgetStatus = 'ok' | 'warning' | 'blocked';

export type BudgetUsage = {
  scope: 'global' | 'plan' | 'user';
  service: string;
  planCode?: string | null;
  userId?: string | null;
  budgetUsd: number;
  usedUsd: number;
  remainingUsd: number;
  usagePercent: number;
  alertThreshold: number;
  status: BudgetStatus;
};

export type BudgetSnapshot = {
  period: {
    start: Date;
    end: Date;
    startDate: string;
    endDate: string;
    nextReset: Date;
    nextResetDate: string;
  };
  budgets: BudgetUsage[];
  blocked: BudgetUsage[];
  warnings: BudgetUsage[];
};

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
  const nextReset =
    now.getUTCDate() >= day
      ? new Date(Date.UTC(year, month + 1, day))
      : startThisMonth;

  return {
    start,
    end: now,
    startDate: start.toISOString().slice(0, 10),
    endDate: now.toISOString().slice(0, 10),
    nextReset,
    nextResetDate: nextReset.toISOString().slice(0, 10),
  };
}

function pickBudget(list: CostBudget[]): CostBudget | null {
  if (!list.length) return null;
  return list
    .slice()
    .sort((a, b) => Number(a.budget_usd) - Number(b.budget_usd))[0];
}

async function readGlobalUsage(start: Date, end: Date): Promise<number> {
  const { rows } = await query<{ total: string }>(
    `
      SELECT COALESCE(SUM(cost_usd), 0) as total
      FROM logs_ia
      WHERE timestamp >= $1 AND timestamp <= $2
    `,
    [start, end]
  );
  return Number(rows[0]?.total ?? 0);
}

async function readPlanUsage(start: Date, end: Date, plan: string): Promise<number> {
  const { rows } = await query<{ total: string }>(
    `
      SELECT COALESCE(SUM(l.cost_usd), 0) as total
      FROM logs_ia l
      LEFT JOIN users u ON u.id = l.user_id
      WHERE l.timestamp >= $1 AND l.timestamp <= $2
        AND COALESCE(NULLIF(LOWER(l.context->>'plan'), ''), NULLIF(LOWER(u.plan), ''), 'free') = $3
    `,
    [start, end, normalizePlanCode(plan)]
  );
  return Number(rows[0]?.total ?? 0);
}

async function readUserUsage(start: Date, end: Date, userId: string): Promise<number> {
  const { rows } = await query<{ total: string }>(
    `
      SELECT COALESCE(SUM(cost_usd), 0) as total
      FROM logs_ia
      WHERE timestamp >= $1 AND timestamp <= $2
        AND user_id = $3
    `,
    [start, end, userId]
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getCostBudgetSnapshot(params: {
  userId?: string | null;
  plan?: string | null;
  service?: string;
}): Promise<BudgetSnapshot> {
  const service = params.service || 'openai';
  const plan = normalizePlanCode(params.plan);
  const userId = params.userId || null;
  const billingDay = toNumber(process.env.BILLING_CYCLE_DAY, 1);
  const period = getBillingPeriod(new Date(), billingDay);

  let rawBudgets: CostBudget[] = [];
  try {
    rawBudgets = await CostBudgetRepository.listBudgets(service);
  } catch (error) {
    console.warn('[budget] Failed to load budgets, allowing request.', error);
    return { period, budgets: [], blocked: [], warnings: [] };
  }
  const enabledBudgets = rawBudgets.filter(
    (budget) => budget.enabled && Number(budget.budget_usd) > 0
  );

  const globalBudget = pickBudget(
    enabledBudgets.filter((budget) => budget.scope === 'global')
  );
  const planBudget = pickBudget(
    enabledBudgets.filter(
      (budget) =>
        budget.scope === 'plan' &&
        normalizePlanCode(budget.plan_code) === plan
    )
  );
  const userBudget =
    userId && userId.length > 0
      ? pickBudget(
          enabledBudgets.filter(
            (budget) => budget.scope === 'user' && budget.user_id === userId
          )
        )
      : null;

  if (!globalBudget && !planBudget && !userBudget) {
    return { period, budgets: [], blocked: [], warnings: [] };
  }

  try {
    const tasks: Array<Promise<number> | null> = [
      globalBudget ? readGlobalUsage(period.start, period.end) : null,
      planBudget ? readPlanUsage(period.start, period.end, plan) : null,
      userBudget && userId ? readUserUsage(period.start, period.end, userId) : null,
    ];
    const [globalUsed = 0, planUsed = 0, userUsed = 0] = await Promise.all(
      tasks.map((task) => task ?? Promise.resolve(0))
    );

    const budgets: BudgetUsage[] = [];

    const appendBudget = (
      budget: CostBudget | null,
      usedUsd: number,
      scope: 'global' | 'plan' | 'user'
    ) => {
      if (!budget) return;
      const budgetUsd = Number(budget.budget_usd || 0);
      const alertThreshold = Number.isFinite(Number(budget.alert_threshold))
        ? Number(budget.alert_threshold)
        : 0.9;
      const usagePercent = budgetUsd > 0 ? (usedUsd / budgetUsd) * 100 : 0;
      const status: BudgetStatus =
        usagePercent >= 100
          ? 'blocked'
          : usagePercent >= alertThreshold * 100
          ? 'warning'
          : 'ok';

      budgets.push({
        scope,
        service: budget.service,
        planCode: budget.plan_code,
        userId: budget.user_id,
        budgetUsd,
        usedUsd,
        remainingUsd: Math.max(0, budgetUsd - usedUsd),
        usagePercent,
        alertThreshold,
        status,
      });
    };

    appendBudget(globalBudget, globalUsed, 'global');
    appendBudget(planBudget, planUsed, 'plan');
    appendBudget(userBudget, userUsed, 'user');

    const blocked = budgets.filter((budget) => budget.status === 'blocked');
    const warnings = budgets.filter((budget) => budget.status === 'warning');

    return {
      period,
      budgets,
      blocked,
      warnings,
    };
  } catch (error) {
    console.warn('[budget] Failed to read cost budgets, allowing request.', error);
    return { period, budgets: [], blocked: [], warnings: [] };
  }
}

export const CostBudgetService = {
  getCostBudgetSnapshot,
};

export default CostBudgetService;
