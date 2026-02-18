import { FastifyInstance } from 'fastify';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import {
  getInAppNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  getNotificationPreferences,
  upsertNotificationPreferences,
} from '../services/notificationService';

export default async function notificationsRoutes(app: FastifyInstance) {
  // List in-app notifications for the current user
  app.get('/notifications', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request: any) => {
    const userId = request.user.sub;
    const notifications = await getInAppNotifications(userId, 20);
    const unreadCount = notifications.filter((n: any) => !n.read_at).length;
    return { notifications, unreadCount };
  });

  // Mark one notification as read
  app.post('/notifications/:id/read', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request: any) => {
    const userId = request.user.sub;
    const { id } = request.params as { id: string };
    await markNotificationRead(id, userId);
    return { success: true };
  });

  // Mark all as read
  app.post('/notifications/read-all', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request: any) => {
    const userId = request.user.sub;
    await markAllNotificationsRead(userId);
    return { success: true };
  });

  // Get user notification preferences
  app.get('/notifications/preferences', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request: any) => {
    const userId = request.user.sub;
    const preferences = await getNotificationPreferences(userId);
    return { preferences };
  });

  // Update notification preferences
  app.put('/notifications/preferences', {
    preHandler: [authGuard, tenantGuard()],
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['preferences'],
        properties: {
          preferences: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['event_type', 'channel', 'enabled'],
              properties: {
                event_type: { type: 'string', minLength: 1 },
                channel: { type: 'string', minLength: 1 },
                enabled: { type: 'boolean' },
              },
            },
          },
        },
      },
    },
  }, async (request: any) => {
    const userId = request.user.sub;
    const { preferences } = request.body as {
      preferences: { event_type: string; channel: string; enabled: boolean }[];
    };
    await upsertNotificationPreferences(userId, preferences);
    return { success: true };
  });
}
