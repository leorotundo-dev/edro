import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';
import QueueService from '../services/queueService';

async function resolveAuthUserId(request: any): Promise<string | null> {
  if (!request.jwtVerify) return null;
  try {
    await request.jwtVerify();
  } catch {
    return null;
  }
  const user = request.user as { id?: string; sub?: string } | undefined;
  return user?.id || user?.sub || null;
}

export default async function notificationsRoutes(app: FastifyInstance) {
  app.get('/notifications/preview', async (_req, reply) => {
    return reply.send({
      success: true,
      data: {
        type: 'push',
        title: 'Hora de revisar!',
        body: 'Voce tem 10 cards SRS atrasados e 1 simulado marcado para hoje.',
      },
    });
  });

  app.post('/notifications/send', async (request, reply) => {
    const authUserId = await resolveAuthUserId(request);

    const bodySchema = z.object({
      userId: z.string().uuid().optional(),
      type: z.enum(['email', 'push', 'inapp']).default('push'),
      title: z.string().min(3).max(120),
      body: z.string().min(3).max(500),
      delayMs: z.number().int().min(0).max(86_400_000).optional()
    });

    const payload = bodySchema.parse(request.body);
    const targetUserId = payload.userId ?? authUserId;

    if (!targetUserId) {
      return reply.status(400).send({
        success: false,
        error: 'userId obrigatorio'
      });
    }

    const { rows } = await query<{ id: string }>(
      `
        INSERT INTO notifications_log (
          user_id, event_type, channel, title, body, status, reason, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'queued', NULL, $6, NOW())
        RETURNING id
      `,
      [
        targetUserId,
        'manual',
        payload.type,
        payload.title,
        payload.body,
        JSON.stringify({ delayMs: payload.delayMs ?? 0 })
      ]
    );

    const logId = rows[0]?.id;
    let queued = false;

    if (QueueService.queues.sendNotifications) {
      const job = await QueueService.addToQueue(
        'sendNotifications',
        {
          logId,
          userId: targetUserId,
          type: payload.type,
          title: payload.title,
          body: payload.body
        },
        payload.delayMs ? { delay: payload.delayMs } : undefined
      );
      queued = Boolean(job);
    } else {
      await query(
        `
          UPDATE notifications_log
          SET status = 'sent', sent_at = NOW()
          WHERE id = $1
        `,
        [logId]
      );
    }

    const statusCode = payload.type === 'inapp' ? 201 : 202;
    return reply.status(statusCode).send({
      success: true,
      data: { queued, logId }
    });
  });
}
