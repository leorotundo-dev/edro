import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';

export default async function flagsRoutes(app: FastifyInstance) {
  app.get(
    '/flags',
    { preHandler: [authGuard, tenantGuard(), requirePerm('admin:jobs')] },
    async (request: any) => {
      const { rows } = await query<any>(
        `SELECT key, enabled, rules, updated_at
         FROM feature_flags
         WHERE tenant_id=$1
         ORDER BY key ASC`,
        [(request.user as any).tenant_id]
      );
      return rows;
    }
  );

  app.post(
    '/flags/:key',
    { preHandler: [authGuard, tenantGuard(), requirePerm('admin:jobs')] },
    async (request: any) => {
      const params = z.object({ key: z.string().min(1) }).parse(request.params);
      const body = z
        .object({
          enabled: z.boolean().optional(),
          rules: z.any().optional(),
        })
        .parse(request.body);

      await query(
        `INSERT INTO feature_flags (tenant_id, key, enabled, rules)
         VALUES ($1,$2,$3,$4::jsonb)
         ON CONFLICT (tenant_id, key)
         DO UPDATE SET enabled=EXCLUDED.enabled, rules=EXCLUDED.rules, updated_at=now()`,
        [
          (request.user as any).tenant_id,
          params.key,
          body.enabled ?? false,
          JSON.stringify(body.rules ?? {}),
        ]
      );

      return { ok: true };
    }
  );
}
