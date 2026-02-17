'use client';

import { useEffect, useState } from 'react';

export type Role = 'admin' | 'manager' | 'reviewer' | 'viewer' | 'staff';

const perms: Record<Role, string[]> = {
  admin: ['*'],
  manager: [
    'calendars:read', 'calendars:write', 'posts:review', 'exports:read',
    'integrations:write', 'clients:read', 'clients:write',
    'library:read', 'library:write', 'events:read', 'events:review',
    'clipping:read', 'clipping:write',
  ],
  reviewer: [
    'calendars:read', 'posts:review', 'exports:read', 'clients:read',
    'library:read', 'library:write', 'events:read', 'events:review',
    'clipping:read', 'clipping:write',
  ],
  viewer: [
    'calendars:read', 'exports:read', 'clients:read',
    'library:read', 'events:read', 'events:review', 'clipping:read',
  ],
  staff: [
    'calendars:read', 'posts:review', 'exports:read',
    'clients:read', 'clients:write', 'library:read', 'library:write',
    'events:read', 'events:review', 'clipping:read', 'clipping:write',
  ],
};

function normalizeRole(value?: string | null): Role {
  const role = (value || 'viewer').toLowerCase();
  if (role === 'gestor') return 'admin';
  if (role === 'admin') return 'admin';
  if (role === 'manager') return 'manager';
  if (role === 'reviewer') return 'reviewer';
  if (role === 'staff') return 'staff';
  return 'viewer';
}

function can(role: Role, perm: string): boolean {
  const list = perms[role] || [];
  return list.includes('*') || list.includes(perm);
}

export function useRole() {
  const [role, setRole] = useState<Role>('viewer');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('edro_user');
    if (!stored) return;
    try {
      const user = JSON.parse(stored);
      setRole(normalizeRole(user?.role));
    } catch {
      setRole('viewer');
    }
  }, []);

  return {
    role,
    isAdmin: role === 'admin',
    isAdminOrManager: role === 'admin' || role === 'manager',
    can: (perm: string) => can(role, perm),
    hasRole: (roles: Role[]) => roles.includes(role),
  };
}
