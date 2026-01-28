import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { hasClientPerm } from '../auth/clientPerms';
import { query } from '../db';
import { jsonDiff } from '../utils/diff';
import { createPostVersion, listPostVersions } from '../repos/postVersionsRepo';
import { audit } from '../audit/audit';

export default async function postEditRoutes(app: FastifyInstance) {
  app.post(
    '/posts/:postAssetId/edit',
    { preHandler: [authGuard, tenantGuard(), requirePerm('posts:review')] },
    async (request: any, reply: any) => {
      const params = z.object({ postAssetId: z.string().uuid() }).parse(request.params);
      const body = z.object({ payload: z.any() }).parse(request.body);

      const { rows } = await query<any>(
        `SELECT pa.*, mc.client_id
         FROM post_assets pa
         JOIN monthly_calendars mc ON mc.id = pa.calendar_id
         WHERE pa.id=$1 AND pa.tenant_id=$2
         LIMIT 1`,
        [params.postAssetId, (request.user as any).tenant_id]
      );

      const current = rows[0];
      if (!current) return reply.status(404).send({ error: 'not_found' });

      const allowed = await hasClientPerm({
        tenantId: (request.user as any).tenant_id,
        userId: (request.user as any).sub,
        role: (request.user as any).role,
        clientId: current.client_id,
        perm: 'review',
      });
      if (!allowed) {
        return reply.status(403).send({ error: 'client_forbidden' });
      }

      if (current.status === 'published') {
        return reply.status(409).send({ error: 'locked_published_post' });
      }

      const diff = jsonDiff(current.payload ?? {}, body.payload ?? {});

      await query(
        `UPDATE post_assets SET payload=$2::jsonb, updated_at=now() WHERE id=$1`,
        [params.postAssetId, JSON.stringify(body.payload ?? {})]
      );

      const version = await createPostVersion({
        post_asset_id: params.postAssetId,
        payload: body.payload,
        diff,
        created_by: (request.user as any).email,
      });

      await audit({
        actor_user_id: (request.user as any).sub,
        actor_email: (request.user as any).email,
        action: 'POST_EDITED',
        entity_type: 'post_asset',
        entity_id: params.postAssetId,
        before: current.payload,
        after: body.payload,
        ip: request.ip,
        user_agent: request.headers['user-agent'],
      });

      return { ok: true, version, diff };
    }
  );

  app.get(
    '/posts/:postAssetId/versions',
    { preHandler: [authGuard, tenantGuard(), requirePerm('calendars:read')] },
    async (request: any) => {
      const params = z.object({ postAssetId: z.string().uuid() }).parse(request.params);
      const { rows } = await query<any>(
        `SELECT pa.id, mc.client_id
         FROM post_assets pa
         JOIN monthly_calendars mc ON mc.id = pa.calendar_id
         WHERE pa.id=$1 AND pa.tenant_id=$2
         LIMIT 1`,
        [params.postAssetId, (request.user as any).tenant_id]
      );

      if (!rows[0]) return [];

      const allowed = await hasClientPerm({
        tenantId: (request.user as any).tenant_id,
        userId: (request.user as any).sub,
        role: (request.user as any).role,
        clientId: rows[0].client_id,
        perm: 'read',
      });
      if (!allowed) {
        return [];
      }

      return listPostVersions(params.postAssetId);
    }
  );
}
