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
import { subscribeToInAppNotifications } from '../services/inAppRealtimeService';
import {
  deactivateWebPushSubscription,
  getWebPushPublicConfig,
  upsertWebPushSubscription,
} from '../services/webPushService';

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

  app.get('/notifications/stream', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request: any, reply) => {
    const userId = request.user.sub;

    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.flushHeaders?.();

    const send = (payload: Record<string, any>) => {
      if (reply.raw.destroyed || reply.raw.writableEnded) return;
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const unsubscribe = subscribeToInAppNotifications(userId, send);
    const keepAlive = setInterval(() => {
      if (reply.raw.destroyed || reply.raw.writableEnded) return;
      reply.raw.write(': keepalive\n\n');
    }, 25000);

    const cleanup = () => {
      clearInterval(keepAlive);
      unsubscribe();
    };

    request.raw.on('close', cleanup);
    request.raw.on('end', cleanup);
    send({ type: 'connected', user_id: userId, connected_at: new Date().toISOString() });
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

  app.get('/notifications/push/config', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request: any) => {
    const userId = request.user.sub;
    return getWebPushPublicConfig(userId);
  });

  app.post('/notifications/push/subscribe', {
    preHandler: [authGuard, tenantGuard()],
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['subscription'],
        properties: {
          subscription: {
            type: 'object',
            additionalProperties: true,
            required: ['endpoint', 'keys'],
            properties: {
              endpoint: { type: 'string', minLength: 1 },
              expirationTime: { anyOf: [{ type: 'number' }, { type: 'null' }] },
              keys: {
                type: 'object',
                additionalProperties: false,
                required: ['p256dh', 'auth'],
                properties: {
                  p256dh: { type: 'string', minLength: 1 },
                  auth: { type: 'string', minLength: 1 },
                },
              },
            },
          },
        },
      },
    },
  }, async (request: any) => {
    const userId = request.user.sub;
    const tenantId = request.user.tenant_id;
    const userAgent = String(request.headers['user-agent'] || '').trim() || null;
    const { subscription } = request.body as { subscription: any };
    return upsertWebPushSubscription({
      tenantId,
      userId,
      subscription,
      userAgent,
    });
  });

  app.post('/notifications/push/unsubscribe', {
    preHandler: [authGuard, tenantGuard()],
    schema: {
      body: {
        type: 'object',
        additionalProperties: false,
        required: ['endpoint'],
        properties: {
          endpoint: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request: any) => {
    const userId = request.user.sub;
    const { endpoint } = request.body as { endpoint: string };
    await deactivateWebPushSubscription({ userId, endpoint });
    return { success: true };
  });
}
