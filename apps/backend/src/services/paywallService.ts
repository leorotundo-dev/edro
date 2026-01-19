import { query } from '../db';

export type PaywallTrigger =
  | 'ia_daily_limit'
  | 'tokens_limit'
  | 'pdf_limit'
  | 'cost_budget'
  | 'soft_warning'
  | 'edital_limit'
  | 'manual';

export type PaywallAction = 'blocked' | 'warned' | 'shown';

export async function logPaywallEvent(params: {
  userId?: string | null;
  trigger: PaywallTrigger;
  action: PaywallAction;
  metadata?: Record<string, any>;
}) {
  await query(
    `
      INSERT INTO paywall_events (user_id, trigger_type, action, metadata, created_at)
      VALUES ($1, $2, $3, $4, NOW())
    `,
    [
      params.userId ?? null,
      params.trigger,
      params.action,
      JSON.stringify(params.metadata ?? {}),
    ]
  );
}

export async function listPaywallEvents(params: {
  userId?: string;
  limit?: number;
}) {
  const limit = Math.min(params.limit ?? 50, 200);
  if (params.userId) {
    const { rows } = await query(
      `
        SELECT *
        FROM paywall_events
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `,
      [params.userId, limit]
    );
    return rows;
  }

  const { rows } = await query(
    `
      SELECT *
      FROM paywall_events
      ORDER BY created_at DESC
      LIMIT $1
    `,
    [limit]
  );
  return rows;
}

export const PaywallService = {
  logPaywallEvent,
  listPaywallEvents,
};

export default PaywallService;
