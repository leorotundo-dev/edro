import { FastifyInstance } from 'fastify';
import { query } from '../db';

export default async function adminNotificationsRoutes(app: FastifyInstance) {
  app.get('/admin/notifications/logs', async (req, reply) => {
    const limit = req.query && (req.query as any).limit ? Number((req.query as any).limit) : 100;
    const { rows } = await query(
      `
        SELECT l.*, u.name, u.email
        FROM notifications_log l
        LEFT JOIN users u ON u.id = l.user_id
        ORDER BY l.created_at DESC
        LIMIT $1
      `,
      [Math.min(limit, 200)]
    );
    return reply.send({ success: true, data: rows });
  });

  app.get('/admin/notifications/preferences', async (_req, reply) => {
    const { rows } = await query(
      `
        SELECT p.*, u.name, u.email
        FROM notification_preferences p
        LEFT JOIN users u ON u.id = p.user_id
        ORDER BY p.updated_at DESC NULLS LAST
        LIMIT 200
      `
    );
    return reply.send({ success: true, data: rows });
  });

  app.get('/admin/notifications/devices', async (_req, reply) => {
    const { rows } = await query(
      `
        SELECT
          d.id,
          d.user_id,
          d.provider,
          d.token_last4,
          d.device_id,
          d.platform,
          d.enabled,
          d.last_seen_at,
          d.created_at,
          u.name,
          u.email
        FROM notification_devices d
        LEFT JOIN users u ON u.id = d.user_id
        ORDER BY d.last_seen_at DESC NULLS LAST
        LIMIT 200
      `
    );
    const data = rows.map((row: any) => ({
      ...row,
      token_masked: row.token_last4 ? `****${row.token_last4}` : null,
    }));
    return reply.send({ success: true, data });
  });
}
