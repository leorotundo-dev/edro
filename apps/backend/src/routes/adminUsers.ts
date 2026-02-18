import { FastifyInstance } from 'fastify';
import { query } from '../db/db';
import { authGuard, requirePerm, type Role } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';

const VALID_ROLES: Role[] = ['admin', 'manager', 'reviewer', 'viewer', 'staff'];

export default async function adminUsersRoutes(app: FastifyInstance) {
  // List all users for the tenant
  app.get('/admin/users', {
    preHandler: [authGuard, tenantGuard(), requirePerm('*')],
  }, async (request: any) => {
    const tenantId = request.user.tenant_id;

    const { rows } = await query(`
      SELECT
        u.id, u.email, u.name, u.status, u.last_login_at, u.created_at,
        tu.role
      FROM edro_users u
      JOIN tenant_users tu ON tu.user_id = u.id
      WHERE tu.tenant_id = $1
      ORDER BY u.name ASC NULLS LAST, u.email ASC
    `, [tenantId]);

    return { users: rows };
  });

  // Update user role
  app.patch('/admin/users/:userId/role', {
    preHandler: [authGuard, tenantGuard(), requirePerm('*')],
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['role'],
        properties: {
          role: { type: 'string', enum: VALID_ROLES },
        },
      },
    },
  }, async (request: any, reply: any) => {
    const tenantId = request.user.tenant_id;
    const { userId } = request.params as { userId: string };
    const { role } = request.body as { role: Role };

    if (!VALID_ROLES.includes(role)) {
      return reply.status(400).send({ error: 'Role invalida.' });
    }

    // Prevent admin from downgrading their own role
    if (userId === request.user.sub && role !== 'admin') {
      return reply.status(400).send({ error: 'Voce nao pode alterar seu proprio papel.' });
    }

    const { rows } = await query(`
      UPDATE tenant_users
      SET role = $1
      WHERE tenant_id = $2 AND user_id = $3
      RETURNING *
    `, [role, tenantId, userId]);

    if (!rows.length) {
      return reply.status(404).send({ error: 'Usuario nao encontrado neste tenant.' });
    }

    // Also update edro_users.role for consistency
    await query(`UPDATE edro_users SET role = $1, updated_at = now() WHERE id = $2`, [role, userId]);

    return { success: true };
  });

  // List client permissions
  app.get('/admin/clients/:clientId/permissions', {
    preHandler: [authGuard, tenantGuard(), requirePerm('*')],
  }, async (request: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };

    const { rows } = await query(`
      SELECT
        cp.user_id, cp.perm,
        u.email, u.name
      FROM client_permissions cp
      JOIN edro_users u ON u.id = cp.user_id
      WHERE cp.tenant_id = $1 AND cp.client_id = $2
      ORDER BY u.name ASC NULLS LAST
    `, [tenantId, clientId]);

    // Group by user
    const byUser: Record<string, { user_id: string; email: string; name: string; perms: string[] }> = {};
    for (const row of rows) {
      if (!byUser[row.user_id]) {
        byUser[row.user_id] = { user_id: row.user_id, email: row.email, name: row.name, perms: [] };
      }
      byUser[row.user_id].perms.push(row.perm);
    }

    return { permissions: Object.values(byUser) };
  });

  // Upsert client permissions for a user
  app.post('/admin/clients/:clientId/permissions', {
    preHandler: [authGuard, tenantGuard(), requirePerm('*')],
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['userId', 'perms'],
        properties: {
          userId: { type: 'string', format: 'uuid' },
          perms: {
            type: 'array',
            items: { type: 'string', enum: ['read', 'write', 'review', 'publish'] },
          },
        },
      },
    },
  }, async (request: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };
    const { userId, perms } = request.body as { userId: string; perms: string[] };

    // Remove existing permissions for this user+client
    await query(`
      DELETE FROM client_permissions
      WHERE tenant_id = $1 AND client_id = $2 AND user_id = $3
    `, [tenantId, clientId, userId]);

    // Insert new permissions
    for (const perm of perms) {
      await query(`
        INSERT INTO client_permissions (tenant_id, client_id, user_id, perm)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT DO NOTHING
      `, [tenantId, clientId, userId, perm]);
    }

    return { success: true };
  });

  // Delete all permissions for a user on a client
  app.delete('/admin/clients/:clientId/permissions/:userId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('*')],
  }, async (request: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId, userId } = request.params as { clientId: string; userId: string };

    await query(`
      DELETE FROM client_permissions
      WHERE tenant_id = $1 AND client_id = $2 AND user_id = $3
    `, [tenantId, clientId, userId]);

    return { success: true };
  });
}
