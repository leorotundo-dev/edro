import type { FastifyReply, FastifyRequest } from 'fastify';
import { query } from '../db';

type ClientPerm = 'read' | 'write' | 'review' | 'publish';

function getClientId(request: FastifyRequest): string | null {
  const params = request.params as Record<string, any> | undefined;
  const body = request.body as Record<string, any> | undefined;
  const route = (request as any).routerPath || '';

  if (params?.clientId) return params.clientId;
  if (route.includes('/clients/') && params?.id) return params.id;
  if (body?.client_id) return body.client_id;
  if (body?.client?.id) return body.client.id;
  return null;
}

export function requireClientPerm(perm: ClientPerm) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { tenant_id?: string; sub?: string; role?: string } | undefined;
    if (!user?.tenant_id || !user?.sub) {
      return reply.status(401).send({ error: 'missing_tenant' });
    }

    if ((user.role || '').toLowerCase() === 'admin') {
      return;
    }

    const clientId = getClientId(request);
    if (!clientId) {
      return reply.status(400).send({ error: 'missing_client_id' });
    }

    const allowed = await hasClientPerm({
      tenantId: user.tenant_id,
      userId: user.sub,
      role: user.role,
      clientId,
      perm,
    });

    if (!allowed) {
      return reply.status(403).send({ error: 'client_forbidden', perm, client_id: clientId });
    }
  };
}

export async function hasClientPerm(params: {
  tenantId: string;
  userId: string;
  role?: string | null;
  clientId: string;
  perm: ClientPerm;
}) {
  if ((params.role || '').toLowerCase() === 'admin') {
    return true;
  }

  const { rows: scoped } = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM client_permissions
     WHERE tenant_id=$1 AND client_id=$2`,
    [params.tenantId, params.clientId]
  );

  if ((scoped[0]?.total ?? 0) === 0) {
    return true;
  }

  const { rows } = await query(
    `SELECT 1 FROM client_permissions
     WHERE tenant_id=$1 AND user_id=$2 AND client_id=$3 AND perm=$4
     LIMIT 1`,
    [params.tenantId, params.userId, params.clientId, params.perm]
  );

  return Boolean(rows[0]);
}
