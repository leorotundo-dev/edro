import { query } from '../db';

type PlanLimits = {
  code: string;
  name?: string | null;
  price_cents?: number | null;
  duration_days?: number | null;
  credits_monthly?: number | null;
  actions_monthly?: number | null;
  storage_limit_mb?: number | null;
  upload_limit_mb?: number | null;
  currency?: string | null;
  interval?: string | null;
};

type UserCreditsRow = {
  user_id: string;
  balance: number;
  monthly_remaining: number | null;
  monthly_reset_at: string | null;
  actions_used: number;
  actions_reset_at: string | null;
};

const DEFAULT_PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    code: 'free',
    name: 'Free',
    credits_monthly: 0,
    actions_monthly: 100,
    storage_limit_mb: 200,
    upload_limit_mb: 25,
    currency: 'BRL',
    interval: 'month',
  },
  pro: {
    code: 'pro',
    name: 'Pro',
    credits_monthly: 0,
    actions_monthly: 2000,
    storage_limit_mb: 5120,
    upload_limit_mb: 200,
    currency: 'BRL',
    interval: 'month',
  },
  premium: {
    code: 'premium',
    name: 'Premium',
    credits_monthly: 0,
    actions_monthly: 10000,
    storage_limit_mb: 51200,
    upload_limit_mb: 2048,
    currency: 'BRL',
    interval: 'month',
  },
};

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const TOKENS_PER_CREDIT = toPositiveInt(process.env.TOKENS_PER_CREDIT, 1000);
const MONTHLY_RESET_DAYS = toPositiveInt(process.env.CREDITS_MONTHLY_RESET_DAYS, 30);

function normalizePlanCode(raw?: string | null) {
  const normalized = String(raw || '').trim().toLowerCase();
  if (!normalized || ['free', 'gratis', 'gratuito', 'base'].includes(normalized)) return 'free';
  if (normalized.includes('premium') || normalized.includes('turbo') || normalized.includes('elite')) {
    return 'premium';
  }
  if (normalized.includes('pro')) return 'pro';
  return 'free';
}

function buildNextReset(base: Date) {
  const next = new Date(base.getTime());
  next.setDate(next.getDate() + MONTHLY_RESET_DAYS);
  return next;
}

async function getPlanByCode(code?: string | null): Promise<PlanLimits> {
  const normalized = normalizePlanCode(code);
  if (!code) return DEFAULT_PLAN_LIMITS[normalized];
  try {
    const { rows } = await query<PlanLimits>(
      `
        SELECT
          code,
          name,
          price_cents,
          duration_days,
          credits_monthly,
          actions_monthly,
          storage_limit_mb,
          upload_limit_mb,
          currency,
          interval
        FROM plans
        WHERE LOWER(code) = LOWER($1)
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [code]
    );
    const row = rows[0];
    if (!row) return DEFAULT_PLAN_LIMITS[normalized];
    const fallback = DEFAULT_PLAN_LIMITS[normalized];
    return {
      ...row,
      credits_monthly: row.credits_monthly ?? fallback.credits_monthly ?? null,
      actions_monthly: row.actions_monthly ?? fallback.actions_monthly ?? null,
      storage_limit_mb: row.storage_limit_mb ?? fallback.storage_limit_mb ?? null,
      upload_limit_mb: row.upload_limit_mb ?? fallback.upload_limit_mb ?? null,
      currency: row.currency ?? fallback.currency ?? 'BRL',
      interval: row.interval ?? fallback.interval ?? 'month',
    };
  } catch {
    return DEFAULT_PLAN_LIMITS[normalized];
  }
}

async function getUserPlanCode(userId: string): Promise<string | null> {
  const { rows } = await query<{ plan: string | null }>(
    'SELECT plan FROM users WHERE id = $1 LIMIT 1',
    [userId]
  );
  return rows[0]?.plan ?? null;
}

async function ensureCreditsRow(params: {
  userId: string;
  planCredits: number | null;
  planActions: number | null;
}) {
  const now = new Date();
  const resetAt = buildNextReset(now);
  await query(
    `
      INSERT INTO user_credits (user_id, balance, monthly_remaining, monthly_reset_at, actions_used, actions_reset_at)
      VALUES ($1, 0, $2, $3, 0, $4)
      ON CONFLICT (user_id) DO NOTHING
    `,
    [
      params.userId,
      params.planCredits,
      resetAt,
      params.planActions ? resetAt : null,
    ]
  );
}

async function refreshMonthlyIfNeeded(params: {
  userId: string;
  planCredits: number | null;
  planActions: number | null;
}): Promise<UserCreditsRow> {
  await ensureCreditsRow(params);

  const { rows } = await query<UserCreditsRow>(
    `
      SELECT user_id, balance, monthly_remaining, monthly_reset_at, actions_used, actions_reset_at
      FROM user_credits
      WHERE user_id = $1
      LIMIT 1
    `,
    [params.userId]
  );
  const row = rows[0];
  if (!row) {
    throw new Error('credits_row_missing');
  }

  const now = new Date();
  let needsUpdate = false;
  let monthlyRemaining = row.monthly_remaining;
  let actionsUsed = row.actions_used;
  let monthlyResetAt = row.monthly_reset_at ? new Date(row.monthly_reset_at) : null;
  let actionsResetAt = row.actions_reset_at ? new Date(row.actions_reset_at) : null;

  if (!monthlyResetAt || monthlyResetAt <= now) {
    monthlyRemaining = params.planCredits;
    monthlyResetAt = buildNextReset(now);
    needsUpdate = true;
  }

  if (!actionsResetAt || actionsResetAt <= now) {
    actionsUsed = 0;
    actionsResetAt = params.planActions ? buildNextReset(now) : null;
    needsUpdate = true;
  }

  if (needsUpdate) {
    await query(
      `
        UPDATE user_credits
        SET monthly_remaining = $2,
            monthly_reset_at = $3,
            actions_used = $4,
            actions_reset_at = $5,
            updated_at = NOW()
        WHERE user_id = $1
      `,
      [
        params.userId,
        monthlyRemaining,
        monthlyResetAt,
        actionsUsed,
        actionsResetAt,
      ]
    );
  }

  return {
    ...row,
    monthly_remaining: monthlyRemaining,
    monthly_reset_at: monthlyResetAt ? monthlyResetAt.toISOString() : null,
    actions_used: actionsUsed,
    actions_reset_at: actionsResetAt ? actionsResetAt.toISOString() : null,
  };
}

export async function getUserUsageSummary(userId: string) {
  const planCode = await getUserPlanCode(userId);
  const plan = await getPlanByCode(planCode);
  const creditsRow = await refreshMonthlyIfNeeded({
    userId,
    planCredits: plan.credits_monthly ?? null,
    planActions: plan.actions_monthly ?? null,
  });

  const actionsLimit = plan.actions_monthly ?? null;
  const actionsRemaining =
    actionsLimit === null ? null : Math.max(0, actionsLimit - (creditsRow.actions_used || 0));

  return {
    plan,
    credits: {
      balance: creditsRow.balance ?? 0,
      monthly_remaining: creditsRow.monthly_remaining,
      monthly_reset_at: creditsRow.monthly_reset_at,
    },
    actions: {
      used: creditsRow.actions_used ?? 0,
      remaining: actionsRemaining,
      reset_at: creditsRow.actions_reset_at,
    },
  };
}

export async function addCredits(params: {
  userId: string;
  amount: number;
  reason: string;
  metadata?: Record<string, any>;
}) {
  if (!Number.isFinite(params.amount) || params.amount === 0) {
    return { success: false };
  }
  await query(
    `
      INSERT INTO user_credit_ledger (user_id, delta, reason, metadata)
      VALUES ($1, $2, $3, $4)
    `,
    [params.userId, params.amount, params.reason, JSON.stringify(params.metadata ?? {})]
  );
  await query(
    `
      UPDATE user_credits
      SET balance = balance + $2,
          updated_at = NOW()
      WHERE user_id = $1
    `,
    [params.userId, params.amount]
  );
  return { success: true };
}

export async function consumeCredits(params: {
  userId: string | null;
  tokens: number;
  reason?: string;
  metadata?: Record<string, any>;
}) {
  if (!params.userId) return { allowed: true, consumed: 0, reason: 'anonymous' };
  const tokens = Math.max(0, Math.floor(params.tokens || 0));
  if (tokens <= 0) return { allowed: true, consumed: 0, reason: 'no_tokens' };

  const creditsNeeded = Math.max(1, Math.ceil(tokens / TOKENS_PER_CREDIT));
  const planCode = await getUserPlanCode(params.userId);
  const plan = await getPlanByCode(planCode);

  if (plan.credits_monthly === null) {
    return { allowed: true, consumed: 0, reason: 'unlimited' };
  }

  const creditsRow = await refreshMonthlyIfNeeded({
    userId: params.userId,
    planCredits: plan.credits_monthly ?? 0,
    planActions: plan.actions_monthly ?? null,
  });

  const monthlyAvailable = creditsRow.monthly_remaining ?? 0;
  const balanceAvailable = creditsRow.balance ?? 0;
  if (monthlyAvailable + balanceAvailable < creditsNeeded) {
    return { allowed: false, consumed: 0, reason: 'insufficient_credits' };
  }

  const fromMonthly = Math.min(monthlyAvailable, creditsNeeded);
  const remaining = creditsNeeded - fromMonthly;
  const fromBalance = Math.min(balanceAvailable, remaining);

  const newMonthly = monthlyAvailable - fromMonthly;
  const newBalance = balanceAvailable - fromBalance;

  await query(
    `
      UPDATE user_credits
      SET monthly_remaining = $2,
          balance = $3,
          updated_at = NOW()
      WHERE user_id = $1
    `,
    [params.userId, newMonthly, newBalance]
  );

  await query(
    `
      INSERT INTO user_credit_ledger (user_id, delta, reason, metadata)
      VALUES ($1, $2, $3, $4)
    `,
    [
      params.userId,
      -1 * (fromMonthly + fromBalance),
      params.reason || 'ai_usage',
      JSON.stringify({
        tokens,
        credits: creditsNeeded,
        from_monthly: fromMonthly,
        from_balance: fromBalance,
        ...params.metadata,
      }),
    ]
  );

  return { allowed: true, consumed: fromMonthly + fromBalance };
}

export async function consumeAction(params: {
  userId: string | null;
  count?: number;
  reason?: string;
  metadata?: Record<string, any>;
}) {
  if (!params.userId) return { allowed: true, used: 0 };
  const count = Math.max(1, Math.floor(params.count || 1));
  const planCode = await getUserPlanCode(params.userId);
  const plan = await getPlanByCode(planCode);

  if (plan.actions_monthly === null) {
    return { allowed: true, used: 0 };
  }

  const creditsRow = await refreshMonthlyIfNeeded({
    userId: params.userId,
    planCredits: plan.credits_monthly ?? null,
    planActions: plan.actions_monthly ?? null,
  });

  const used = creditsRow.actions_used ?? 0;
  if (used + count > (plan.actions_monthly ?? 0)) {
    return { allowed: false, used: 0, reason: 'actions_limit' };
  }

  await query(
    `
      UPDATE user_credits
      SET actions_used = actions_used + $2,
          updated_at = NOW()
      WHERE user_id = $1
    `,
    [params.userId, count]
  );

  await query(
    `
      INSERT INTO user_credit_ledger (user_id, delta, reason, metadata)
      VALUES ($1, $2, $3, $4)
    `,
    [
      params.userId,
      0,
      params.reason || 'action',
      JSON.stringify({ action_count: count, ...params.metadata }),
    ]
  );

  return { allowed: true, used: count };
}

export const CreditsService = {
  getUserUsageSummary,
  addCredits,
  consumeCredits,
  consumeAction,
};

export default CreditsService;
