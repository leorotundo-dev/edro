import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requireClientPerm } from '../auth/clientPerms';

export default async function searchRoutes(app: FastifyInstance) {
  app.post(
    '/search/posts',
    { preHandler: [authGuard, tenantGuard(), requirePerm('calendars:read'), requireClientPerm('read')] },
    async (request: any) => {
      const body = z
        .object({
          client_id: z.string(),
          calendar_id: z.string().optional(),
          status: z.array(z.string()).optional(),
          tier: z.array(z.string()).optional(),
          minScore: z.number().optional(),
          q: z.string().optional(),
          limit: z.number().int().min(1).max(500).default(200),
        })
        .parse(request.body);

      const params: any[] = [(request.user as any).tenant_id, body.client_id];
      const conditions: string[] = ['pa.tenant_id=$1', 'mc.client_id=$2'];

      if (body.calendar_id) {
        params.push(body.calendar_id);
        conditions.push(`pa.calendar_id=$${params.length}`);
      }

      if (body.status?.length) {
        params.push(body.status);
        conditions.push(`pa.status = ANY($${params.length})`);
      }

      if (body.tier?.length) {
        params.push(body.tier);
        conditions.push(`(pa.payload->>'tier') = ANY($${params.length})`);
      }

      if (body.minScore !== undefined) {
        params.push(body.minScore);
        conditions.push(`((pa.payload->>'score')::int) >= $${params.length}`);
      }

      params.push(body.limit);

      const { rows } = await query<any>(
        `
        SELECT pa.*
        FROM post_assets pa
        JOIN monthly_calendars mc ON mc.id = pa.calendar_id
        WHERE ${conditions.join(' AND ')}
        ORDER BY pa.updated_at DESC
        LIMIT $${params.length}
        `,
        params
      );

      if (body.q) {
        const needle = body.q.toLowerCase();
        return rows.filter((row) => JSON.stringify(row.payload || {}).toLowerCase().includes(needle));
      }

      return rows;
    }
  );
}
