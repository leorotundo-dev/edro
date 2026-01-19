import { FastifyInstance } from 'fastify';
import { query } from '../db';

interface MetricsRow {
  active_subscriptions: string | number | null;
  new_subscriptions: string | number | null;
  cancelled_subscriptions: string | number | null;
  trial_subscriptions: string | number | null;
  active_mrr_cents: string | number | null;
  revenue_period_cents: string | number | null;
}

interface PlanRow {
  code: string;
  name: string;
  price_cents: number | null;
  duration_days: number | null;
  active_users: string | number | null;
  mrr_cents: string | number | null;
}

interface SubscriptionRow {
  id: string;
  name: string | null;
  email: string;
  plan: string | null;
  created_at: Date;
  updated_at: Date;
  plan_name: string | null;
  price_cents: number | null;
  duration_days: number | null;
}

interface ActivityRow {
  id: string;
  name: string | null;
  email: string;
  plan: string | null;
  created_at: Date;
  plan_name: string | null;
  price_cents: number | null;
}

const TRIAL_WINDOW_DAYS = 14;

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function inferSubscriptionStatus(row: SubscriptionRow): 'active' | 'trial' | 'cancelled' | 'free' {
  if (row.plan) return 'active';

  const createdAt = row.created_at ? new Date(row.created_at) : null;
  const updatedAt = row.updated_at ? new Date(row.updated_at) : null;
  const now = Date.now();

  if (createdAt && now - createdAt.getTime() <= TRIAL_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    return 'trial';
  }

  if (
    updatedAt &&
    createdAt &&
    updatedAt.getTime() > createdAt.getTime() &&
    now - updatedAt.getTime() <= 30 * 24 * 60 * 60 * 1000
  ) {
    return 'cancelled';
  }

  return 'free';
}

function computeNextBilling(row: SubscriptionRow): string | null {
  if (!row.plan || !row.created_at) {
    return null;
  }

  const baseDate = new Date(row.created_at);
  const duration = row.duration_days && row.duration_days > 0 ? row.duration_days : 30;
  const next = new Date(baseDate.getTime());
  next.setDate(next.getDate() + duration);
  return next.toISOString();
}

export async function adminPaymentsRoutes(app: FastifyInstance) {
  app.get('/admin/payments/overview', async (request, reply) => {
    try {
      const { rows } = await query<MetricsRow>(
        `
          WITH user_plans AS (
            SELECT
              u.id,
              u.plan,
              u.created_at,
              u.updated_at,
              p.price_cents,
              p.duration_days
            FROM users u
            LEFT JOIN plans p ON p.code = u.plan
          )
          SELECT
            COUNT(*) FILTER (WHERE plan IS NOT NULL) AS active_subscriptions,
            COUNT(*) FILTER (WHERE plan IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days') AS new_subscriptions,
            COUNT(*) FILTER (
              WHERE plan IS NULL
                AND updated_at >= NOW() - INTERVAL '30 days'
                AND updated_at > created_at
            ) AS cancelled_subscriptions,
            COUNT(*) FILTER (
              WHERE plan IS NULL
                AND created_at >= NOW() - INTERVAL '${TRIAL_WINDOW_DAYS} days'
            ) AS trial_subscriptions,
            COALESCE(SUM(price_cents) FILTER (WHERE plan IS NOT NULL), 0) AS active_mrr_cents,
            COALESCE(SUM(price_cents) FILTER (WHERE plan IS NOT NULL AND created_at >= NOW() - INTERVAL '30 days'), 0) AS revenue_period_cents
          FROM user_plans;
        `
      );

      const metricsRow = rows[0] ?? {
        active_subscriptions: 0,
        new_subscriptions: 0,
        cancelled_subscriptions: 0,
        trial_subscriptions: 0,
        active_mrr_cents: 0,
        revenue_period_cents: 0
      };

      const activeSubscriptions = toNumber(metricsRow.active_subscriptions);
      const newSubscriptions = toNumber(metricsRow.new_subscriptions);
      const cancelledSubscriptions = toNumber(metricsRow.cancelled_subscriptions);
      const trialSubscriptions = toNumber(metricsRow.trial_subscriptions);
      const mrrCents = toNumber(metricsRow.active_mrr_cents);
      const revenueCents = toNumber(metricsRow.revenue_period_cents);

      const avgTicket = activeSubscriptions > 0 ? mrrCents / activeSubscriptions / 100 : 0;
      const churnRateBase = activeSubscriptions + cancelledSubscriptions;
      const churnRate = churnRateBase > 0 ? (cancelledSubscriptions / churnRateBase) * 100 : 0;

      const planBreakdownResult = await query<PlanRow>(
        `
          SELECT
            p.code,
            p.name,
            p.price_cents,
            p.duration_days,
            COUNT(u.id) AS active_users,
            COALESCE(SUM(p.price_cents), 0) AS mrr_cents
          FROM plans p
          LEFT JOIN users u ON u.plan = p.code
          GROUP BY p.code, p.name, p.price_cents, p.duration_days
          ORDER BY mrr_cents DESC, p.name ASC;
        `
      );

      const activityRows = await query<ActivityRow>(
        `
          SELECT
            u.id,
            u.name,
            u.email,
            u.plan,
            u.created_at,
            p.name AS plan_name,
            p.price_cents
          FROM users u
          LEFT JOIN plans p ON p.code = u.plan
          WHERE u.plan IS NOT NULL
          ORDER BY u.created_at DESC
          LIMIT 10;
        `
      );

      return reply.send({
        success: true,
        data: {
          // Convert aggregate results (stored in cents) into BRL floats before sending to the UI
          metrics: {
            mrr: mrrCents / 100,
            activeSubscriptions,
            churnRate: Number(churnRate.toFixed(2)),
            revenue: revenueCents / 100,
            newSubscriptions,
            cancelledSubscriptions,
            trialSubscriptions,
            avgTicket: Number(avgTicket.toFixed(2))
          },
          planBreakdown: planBreakdownResult.rows.map(row => ({
            code: row.code,
            name: row.name,
            price: toNumber(row.price_cents) / 100,
            durationDays: row.duration_days ?? null,
            activeUsers: toNumber(row.active_users),
            mrr: toNumber(row.mrr_cents) / 100
          })),
          recentTransactions: activityRows.rows.map(row => ({
            id: row.id,
            type: 'income',
            description: `${row.plan_name ?? row.plan ?? 'Plano'} - ${row.name ?? row.email}`,
            amount: toNumber(row.price_cents) / 100,
            date: row.created_at,
            status: 'completed' as const
          })),
          integrations: {
            stripe: {
              connected: Boolean(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_API_KEY),
              accountId: process.env.STRIPE_ACCOUNT_ID ?? null,
              lastSync: new Date().toISOString()
            },
            mercadoPago: {
              connected: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN),
              userId: process.env.MERCADO_PAGO_USER_ID ?? null,
              lastSync: new Date().toISOString()
            }
          }
        }
      });
    } catch (error) {
      console.error('[admin-payments] overview error', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao carregar métricas de pagamentos'
      });
    }
  });

  app.get('/admin/payments/subscriptions', async (request, reply) => {
    try {
      const { status, limit = '100' } = request.query as { status?: string; limit?: string };
      const parsedLimit = Math.min(parseInt(limit, 10) || 100, 500);

      const { rows } = await query<SubscriptionRow>(
        `
          SELECT
            u.id,
            u.name,
            u.email,
            u.plan,
            u.created_at,
            u.updated_at,
            p.name AS plan_name,
            p.price_cents,
            p.duration_days
          FROM users u
          LEFT JOIN plans p ON p.code = u.plan
          ORDER BY u.created_at DESC
          LIMIT $1;
        `,
        [parsedLimit]
      );

      const subscriptions = rows.map(row => {
        const computedStatus = inferSubscriptionStatus(row);
        return {
          id: row.id,
          userName: row.name ?? row.email,
          userEmail: row.email,
          plan: row.plan,
          planName: row.plan_name,
          status: computedStatus,
          amount: toNumber(row.price_cents) / 100,
          startDate: row.created_at,
          nextBilling: computeNextBilling(row),
          durationDays: row.duration_days
        };
      });

      const filtered =
        status && status !== 'all'
          ? subscriptions.filter(sub => sub.status === status)
          : subscriptions;

      return reply.send({
        success: true,
        items: filtered
      });
    } catch (error) {
      console.error('[admin-payments] subscriptions error', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao carregar assinaturas'
      });
    }
  });
}

export default adminPaymentsRoutes;
