import type { FastifyReply, FastifyRequest } from 'fastify';

export type Role = 'admin' | 'manager' | 'reviewer' | 'viewer' | 'staff';

const perms: Record<Role, string[]> = {
  admin: ['*'],
  manager: [
    'calendars:read',
    'calendars:write',
    'posts:review',
    'exports:read',
    'integrations:write',
    'clients:read',
    'clients:write',
    'library:read',
    'library:write',
    'events:read',
    'events:review',
    'clipping:read',
    'clipping:write',
  ],
  reviewer: [
    'calendars:read',
    'posts:review',
    'exports:read',
    'clients:read',
    'library:read',
    'library:write',
    'events:read',
    'events:review',
    'clipping:read',
    'clipping:write',
  ],
  viewer: [
    'calendars:read',
    'exports:read',
    'clients:read',
    'library:read',
    'events:read',
    'events:review',
    'clipping:read',
  ],
  staff: [
    'calendars:read',
    'posts:review',
    'exports:read',
    'clients:read',
    'clients:write',
    'library:read',
    'library:write',
    'events:read',
    'events:review',
    'clipping:read',
    'clipping:write',
  ],
};

export function normalizeRole(value?: string | null): Role {
  const role = (value || 'viewer').toLowerCase();
  if (role === 'gestor') return 'admin';
  if (role === 'staff') return 'staff';
  if (role === 'admin') return 'admin';
  if (role === 'manager') return 'manager';
  if (role === 'reviewer') return 'reviewer';
  if (role === 'viewer') return 'viewer';
  return 'viewer';
}

export function can(role: Role, perm: string) {
  const list = perms[role] || [];
  return list.includes('*') || list.includes(perm);
}

export async function authGuard(request: FastifyRequest, reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    return reply.status(401).send({ error: 'Nao autorizado.' });
  }
}

export function requirePerm(perm: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const user = request.user as { role?: string } | undefined;
    const role = normalizeRole(user?.role);
    if (!can(role, perm)) {
      return reply.status(403).send({ error: 'Sem permissao.', perm });
    }
  };
}
