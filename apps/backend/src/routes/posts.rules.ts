import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { hasClientPerm } from '../auth/clientPerms';
import { setPostStatus } from '../repos/governanceRepo';
import { audit } from '../audit/audit';

export default async function postRulesRoutes(app: FastifyInstance) {
  app.post(
    '/calendars/:id/posts/bulk-by-rule',
    { preHandler: [authGuard, tenantGuard(), requirePerm('posts:review')] },
    async (request: any) => {
      const calendar_id = request.params.id;
      const body = z
        .object({
          action: z.enum(['approve', 'reject', 'move_to_review']),
          minTier: z.enum(['A', 'B', 'C']).optional(),
          minScore: z.number().min(0).max(100).optional(),
          statusIn: z.array(z.enum(['draft', 'review', 'approved', 'rejected'])).optional(),
          limit: z.number().int().min(1).max(500).optional(),
        })
        .parse(request.body);

      const { rows } = await query<any>(
        `SELECT pa.*
         FROM post_assets pa
         JOIN monthly_calendars mc ON mc.id = pa.calendar_id
         WHERE pa.calendar_id=$1 AND pa.tenant_id=$2`,
        [calendar_id, (request.user as any).tenant_id]
      );

      const { rows: calendarRows } = await query<any>(
        `SELECT client_id FROM monthly_calendars WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [calendar_id, (request.user as any).tenant_id]
      );
      const clientId = calendarRows[0]?.client_id;
      if (!clientId) return { ok: false, error: 'client_not_found' };

      const allowed = await hasClientPerm({
        tenantId: (request.user as any).tenant_id,
        userId: (request.user as any).sub,
        role: (request.user as any).role,
        clientId,
        perm: 'review',
      });
      if (!allowed) return { ok: false, error: 'client_forbidden' };

      const status =
        body.action === 'approve' ? 'approved' : body.action === 'reject' ? 'rejected' : 'review';

      const tierRank = (tier: string) => (tier === 'A' ? 3 : tier === 'B' ? 2 : 1);
      const minTierRank = body.minTier ? tierRank(body.minTier) : 0;

      const filtered = rows
        .filter((row) => (body.statusIn ? body.statusIn.includes(row.status) : true))
        .filter((row) => tierRank(row.payload?.tier ?? 'C') >= minTierRank)
        .filter((row) => (body.minScore ? Number(row.payload?.score ?? 0) >= body.minScore : true))
        .slice(0, body.limit ?? 9999);

      for (const row of filtered) {
        try {
          await setPostStatus({
            calendar_id,
            post_index: row.post_index,
            status: status as any,
            reviewer: (request.user as any).email,
          });
        } catch (error: any) {
          if (error?.message === 'locked_published_post') {
            continue;
          }
          throw error;
        }

        await audit({
          actor_user_id: (request.user as any).sub,
          actor_email: (request.user as any).email,
          action: 'POST_STATUS_CHANGED_BY_RULE',
          entity_type: 'post_asset',
          entity_id: row.id,
          before: { status: row.status },
          after: { status },
          ip: request.ip,
          user_agent: request.headers['user-agent'],
        });
      }

      return { ok: true, updated: filtered.length };
    }
  );
}
