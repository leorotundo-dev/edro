import type { FastifyReply, FastifyRequest } from 'fastify';

export type PortalContactRole = 'viewer' | 'requester' | 'approver' | 'admin';
export type PortalCapability = 'read' | 'request' | 'approve';

const CAPABILITY_MATRIX: Record<PortalCapability, PortalContactRole[]> = {
  read: ['viewer', 'requester', 'approver', 'admin'],
  request: ['requester', 'admin'],
  approve: ['approver', 'admin'],
};

function getPortalContactRole(request: FastifyRequest): PortalContactRole | null {
  const role = (request.user as { contact_role?: string } | undefined)?.contact_role;
  if (!role) return null;
  if (role === 'viewer' || role === 'requester' || role === 'approver' || role === 'admin') {
    return role;
  }
  return null;
}

export function requirePortalCapability(capability: PortalCapability) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const portalRole = getPortalContactRole(request);

    // Legacy/generic portal tokens do not carry contact_role.
    // Keep backward compatibility by allowing them full portal access.
    if (!portalRole) return;

    const allowed = CAPABILITY_MATRIX[capability].includes(portalRole);
    if (!allowed) {
      return reply.status(403).send({
        error: 'portal_forbidden',
        capability,
        contact_role: portalRole,
      });
    }
  };
}
