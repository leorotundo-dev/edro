import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';

export default async function peopleRoutes(app: FastifyInstance) {
  // GET /people?q=&limit=50&internal=true|false
  app.get('/people', {
    preHandler: [authGuard, requirePerm('clients:read'), tenantGuard()],
  }, async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string;
    const qs = request.query as { q?: string; limit?: string; internal?: string };
    const q = (qs.q || '').trim().toLowerCase();
    const limit = Math.min(Number(qs.limit || 50), 200);

    const params: any[] = [tenantId, limit];
    let searchClause = '';
    if (q) {
      params.push(`%${q}%`);
      const idx = params.length;
      searchClause = `AND (
        LOWER(p.display_name) LIKE $${idx}
        OR EXISTS (
          SELECT 1 FROM person_identities pi
          WHERE pi.person_id = p.id AND LOWER(pi.identity_value) LIKE $${idx}
        )
      )`;
    }

    let internalClause = '';
    if (qs.internal === 'true') internalClause = 'AND p.is_internal = true';
    if (qs.internal === 'false') internalClause = 'AND p.is_internal = false';

    const { rows } = await query<{
      id: string;
      display_name: string;
      is_internal: boolean;
      avatar_url: string | null;
      created_at: string;
      identities: Array<{ type: string; value: string; primary: boolean }> | null;
      client_name: string | null;
      client_id: string | null;
      meeting_count: string;
    }>(
      `SELECT
         p.id,
         p.display_name,
         p.is_internal,
         p.avatar_url,
         p.created_at,
         (
           SELECT json_agg(json_build_object(
             'type', pi.identity_type,
             'value', pi.identity_value,
             'primary', pi.is_primary
           ) ORDER BY pi.is_primary DESC)
           FROM person_identities pi
           WHERE pi.person_id = p.id AND pi.tenant_id = $1
         ) AS identities,
         (
           SELECT c.name
           FROM client_contacts cc
           JOIN clients c ON c.id::text = cc.client_id::text
           WHERE cc.person_id = p.id
           LIMIT 1
         ) AS client_name,
         (
           SELECT cc.client_id::text
           FROM client_contacts cc
           WHERE cc.person_id = p.id
           LIMIT 1
         ) AS client_id,
         COALESCE((
           SELECT COUNT(*)::text
           FROM meeting_participants mp
           WHERE mp.person_id = p.id AND mp.tenant_id = $1
         ), '0') AS meeting_count
       FROM people p
       WHERE p.tenant_id = $1
         ${searchClause}
         ${internalClause}
       ORDER BY p.is_internal ASC, p.display_name ASC
       LIMIT $2`,
      params,
    );

    return reply.send({ success: true, data: rows });
  });
}
