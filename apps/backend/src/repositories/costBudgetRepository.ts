import { query } from '../db';

export type BudgetScope = 'global' | 'plan' | 'user';

export interface CostBudget {
  id: string;
  scope: BudgetScope;
  service: string;
  plan_code: string | null;
  user_id: string | null;
  budget_usd: number;
  alert_threshold: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export async function listBudgets(service?: string): Promise<CostBudget[]> {
  const params: any[] = [];
  let sql = 'SELECT * FROM cost_budgets';
  if (service) {
    sql += ' WHERE service = $1';
    params.push(service);
  }
  sql += ' ORDER BY scope, service, plan_code NULLS FIRST, user_id NULLS FIRST';
  const { rows } = await query<CostBudget>(sql, params);
  return rows;
}

export async function upsertBudget(input: {
  scope: BudgetScope;
  service?: string;
  plan_code?: string | null;
  user_id?: string | null;
  budget_usd: number;
  alert_threshold?: number | null;
  enabled?: boolean;
}): Promise<string> {
  const scope = input.scope;
  const service = input.service || 'openai';
  const planCode = input.plan_code ?? null;
  const userId = input.user_id ?? null;
  const budgetUsd = input.budget_usd;
  const alertThreshold =
    typeof input.alert_threshold === 'number' ? input.alert_threshold : 0.9;
  const enabled = input.enabled !== undefined ? input.enabled : true;

  const { rows } = await query<{ id: string }>(
    `
      SELECT id FROM cost_budgets
      WHERE scope = $1
        AND service = $2
        AND plan_code IS NOT DISTINCT FROM $3
        AND user_id IS NOT DISTINCT FROM $4
      LIMIT 1
    `,
    [scope, service, planCode, userId]
  );

  if (rows.length > 0) {
    await query(
      `
        UPDATE cost_budgets
        SET budget_usd = $2,
            alert_threshold = $3,
            enabled = $4,
            updated_at = NOW()
        WHERE id = $1
      `,
      [rows[0].id, budgetUsd, alertThreshold, enabled]
    );
    return rows[0].id;
  }

  const insert = await query<{ id: string }>(
    `
      INSERT INTO cost_budgets (
        scope, service, plan_code, user_id, budget_usd, alert_threshold, enabled, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id
    `,
    [scope, service, planCode, userId, budgetUsd, alertThreshold, enabled]
  );

  return insert.rows[0].id;
}

export const CostBudgetRepository = {
  listBudgets,
  upsertBudget,
};

export default CostBudgetRepository;
