import { FastifyReply, FastifyRequest } from 'fastify';
import { recordAdminAccess } from '../services/auditService';

export type Role = 'admin' | 'ops' | 'support' | 'user';

const parseEmailList = (value?: string): Set<string> => {
  return new Set(
    (value || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
};

const adminEmails = parseEmailList(process.env.ADMIN_EMAILS);
const opsEmails = parseEmailList(process.env.OPS_EMAILS);
const supportEmails = parseEmailList(process.env.SUPPORT_EMAILS);

export function normalizeRole(role?: string | null): Role {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'admin' || value === 'ops' || value === 'support' || value === 'user') {
    return value as Role;
  }
  if (value === 'student' || value === 'aluno') {
    return 'user';
  }
  return 'user';
}

export function resolveRole(email?: string | null, role?: string | null): Role {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const storedRole = normalizeRole(role);

  if (normalizedEmail && adminEmails.has(normalizedEmail)) return 'admin';
  if (normalizedEmail && opsEmails.has(normalizedEmail)) return 'ops';
  if (normalizedEmail && supportEmails.has(normalizedEmail)) return 'support';
  return storedRole;
}

export function attachResolvedRole(req: FastifyRequest): Role | null {
  const user = req.user as { email?: string; role?: string } | undefined;
  if (!user) return null;
  const role = resolveRole(user.email, user.role);
  (req.user as any).role = role;
  return role;
}

export function hasRoleAccess(role: Role, allowed: Role[]): boolean {
  if (role === 'admin') return true;
  return allowed.includes(role);
}

export function requireRoles(allowed: Role[]) {
  return async function requireRolesHook(req: FastifyRequest, reply: FastifyReply) {
    const anyReq: any = req;
    const logOnce = (status: 'allowed' | 'forbidden' | 'unauthorized', role?: Role) => {
      const marker = '__rbacAccessLogged';
      if ((req as any)[marker]) return;
      (req as any)[marker] = true;

      const user = req.user as { id?: string; sub?: string; email?: string } | undefined;
      void recordAdminAccess({
        userId: user?.id || user?.sub,
        role,
        email: user?.email,
        method: req.method,
        path: normalizePath(req.url),
        status,
        requiredRoles: allowed,
        ip: req.ip,
      });
    };

    if (!req.user) {
      try {
        await anyReq.jwtVerify();
      } catch {
        logOnce('unauthorized');
        return reply.status(401).send({ success: false, error: 'Unauthorized' });
      }
    }

    const role = attachResolvedRole(req) || 'user';

    if (!hasRoleAccess(role, allowed)) {
      logOnce('forbidden', role);
      return reply.status(403).send({ success: false, error: 'Forbidden' });
    }

    logOnce('allowed', role);
  };
}

type RoutePolicy = {
  prefix: string;
  roles: Role[];
};

const adminPolicies: RoutePolicy[] = [
  { prefix: '/admin/security', roles: ['admin'] },
  { prefix: '/admin/debug', roles: ['admin'] },
  { prefix: '/admin/blueprints', roles: ['admin'] },
  { prefix: '/admin/plan', roles: ['admin'] },
  { prefix: '/admin/learn', roles: ['admin'] },
  { prefix: '/admin/costs', roles: ['admin'] },
  { prefix: '/admin/drops', roles: ['admin'] },
  { prefix: '/admin/payments', roles: ['support'] },
  { prefix: '/admin/users', roles: ['support'] },
  { prefix: '/admin/metrics', roles: ['ops'] },
  { prefix: '/admin/queues', roles: ['ops'] },
  { prefix: '/admin/database', roles: ['ops'] },
  { prefix: '/admin/apm', roles: ['ops'] },
  { prefix: '/admin/backups', roles: ['ops'] },
  { prefix: '/admin/dashboard', roles: ['ops'] },
  { prefix: '/admin/harvest', roles: ['ops'] },
  { prefix: '/admin/rag', roles: ['ops'] },
  { prefix: '/admin/jobs', roles: ['ops'] },
  { prefix: '/admin/schedules', roles: ['ops'] },
  { prefix: '/admin/questions', roles: ['ops'] },
  { prefix: '/admin/performance', roles: ['ops'] },
  { prefix: '/admin/alerts', roles: ['ops'] },
  { prefix: '/admin/logs', roles: ['ops'] },
];

export function normalizePath(rawUrl: string): string {
  const pathOnly = rawUrl.split('?')[0] || '';
  if (pathOnly.startsWith('/api/')) {
    return pathOnly.slice(4);
  }
  if (pathOnly === '/api') {
    return '/';
  }
  return pathOnly;
}

export function getRequiredRolesForPath(rawUrl: string): Role[] | null {
  const path = normalizePath(rawUrl);

  if (path.startsWith('/recco/admin')) {
    return ['ops'];
  }

  for (const rule of adminPolicies) {
    if (path.startsWith(rule.prefix)) {
      return rule.roles;
    }
  }

  if (path.startsWith('/admin')) {
    return ['admin'];
  }

  return null;
}

export async function enforceRoutePolicy(req: FastifyRequest, reply: FastifyReply) {
  const requiredRoles = getRequiredRolesForPath(req.url);
  if (!requiredRoles) return;
  return requireRoles(requiredRoles)(req, reply);
}
