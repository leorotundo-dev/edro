import type { FastifyReply, FastifyRequest } from 'fastify';
import { query } from '../db';

export function tenantGuard() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { tenant_id?: string; sub?: string } | undefined;
    const tenantId = user?.tenant_id;
    if (!tenantId || !user?.sub) {
      return reply.status(401).send({ error: 'missing_tenant' });
    }

    const { rows } = await query(
      `SELECT 1 FROM tenant_users WHERE tenant_id=$1 AND user_id=$2`,
      [tenantId, user.sub]
    );
    if (!rows[0]) {
      return reply.status(403).send({ error: 'not_member' });
    }
  };
}
