import { query } from '../db';

export type AdminAccessStatus = 'allowed' | 'forbidden' | 'unauthorized';

type AdminAccessEvent = {
  userId?: string;
  role?: string;
  email?: string;
  method: string;
  path: string;
  status: AdminAccessStatus;
  requiredRoles?: string[];
  ip?: string;
};

export async function recordAdminAccess(event: AdminAccessEvent) {
  try {
    const payload = {
      path: event.path,
      method: event.method,
      role: event.role || 'unknown',
      email: event.email,
      required_roles: event.requiredRoles,
      status: event.status,
    };

    await query(
      `
        INSERT INTO ops_auditoria (
          event_type,
          entity_type,
          entity_id,
          action,
          user_id,
          ip_address,
          changes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      `,
      [
        'admin_access',
        'route',
        null,
        event.status,
        event.userId || null,
        event.ip || null,
        JSON.stringify(payload),
      ]
    );
  } catch (err) {
    console.warn('[audit] Failed to record admin access:', err);
  }
}

export const AuditService = {
  recordAdminAccess,
};

export default AuditService;
