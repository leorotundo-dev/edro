import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';

export default async function adminAiCostsRoutes(app: FastifyInstance) {
  app.get(
    '/admin/ai-costs',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any) => {
      const { days } = z
        .object({ days: z.coerce.number().int().min(1).max(365).default(30) })
        .parse(request.query);

      const tenantId = (request.user as any).tenant_id;

      const [totals, byProvider, byDay, byFeature, recent] = await Promise.all([
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
      ]);

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
      };
    }
  );
}
