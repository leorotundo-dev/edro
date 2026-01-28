import { FastifyInstance } from 'fastify';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { hasClientPerm } from '../auth/clientPerms';
import { query } from '../db';

export default async function postSourcesRoutes(app: FastifyInstance) {
  app.get(
    '/posts/:postAssetId/sources',
    { preHandler: [authGuard, tenantGuard(), requirePerm('calendars:read')] },
    async (request: any) => {
      const { rows: assetRows } = await query<{ client_id: string }>(
        `SELECT mc.client_id
         FROM post_assets pa
         JOIN monthly_calendars mc ON mc.id = pa.calendar_id
         WHERE pa.id=$1 AND pa.tenant_id=$2
         LIMIT 1`,
        [request.params.postAssetId, (request.user as any).tenant_id]
      );
      const clientId = assetRows[0]?.client_id;
      if (!clientId) return [];

      const allowed = await hasClientPerm({
        tenantId: (request.user as any).tenant_id,
        userId: (request.user as any).sub,
        role: (request.user as any).role,
        clientId,
        perm: 'read',
      });
      if (!allowed) return [];

      const { rows } = await query<any>(
        `
        SELECT ps.*, li.title, li.category, li.weight, li.type
        FROM post_sources ps
        JOIN library_items li ON li.id = ps.library_item_id
        WHERE ps.tenant_id=$1 AND ps.post_asset_id=$2
        ORDER BY ps.score DESC NULLS LAST
        `,
        [(request.user as any).tenant_id, request.params.postAssetId]
      );
      return rows;
    }
  );
}
