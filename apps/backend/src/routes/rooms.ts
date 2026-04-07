import type { FastifyInstance } from 'fastify';
import type { RoomStreamEvent } from '@edro/shared';
import { z } from 'zod';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import {
  getRoomForUser,
  getRoomSnapshot,
  listRoomMessages,
  listRoomsForUser,
  markRoomRead,
  postRoomMessage,
  subscribeRoom,
  upsertRoomPresence,
} from '../services/roomsService';

function errorReply(reply: any, error: any) {
  return reply.status(error?.statusCode || 500).send({ error: error?.message || 'rooms_error' });
}

export default async function roomsRoutes(app: FastifyInstance) {
  app.get('/rooms', { preHandler: [authGuard, tenantGuard()] }, async (request: any, reply) => {
    try {
      const rooms = await listRoomsForUser(request.user.tenant_id, request.user.sub);
      return reply.send({ rooms });
    } catch (error) {
      return errorReply(reply, error);
    }
  });

  app.get('/rooms/:roomId', { preHandler: [authGuard, tenantGuard()] }, async (request: any, reply) => {
    const { roomId } = z.object({ roomId: z.string().uuid() }).parse(request.params);
    try {
      const data = await getRoomForUser(request.user.tenant_id, request.user.sub, roomId);
      return reply.send(data);
    } catch (error) {
      return errorReply(reply, error);
    }
  });

  app.get('/rooms/:roomId/messages', { preHandler: [authGuard, tenantGuard()] }, async (request: any, reply) => {
    const { roomId } = z.object({ roomId: z.string().uuid() }).parse(request.params);
    const { limit } = z.object({ limit: z.coerce.number().int().min(1).max(100).optional() }).parse(request.query ?? {});
    try {
      const messages = await listRoomMessages(request.user.tenant_id, request.user.sub, roomId, limit ?? 50);
      return reply.send({ messages, nextCursor: null });
    } catch (error) {
      return errorReply(reply, error);
    }
  });

  app.post('/rooms/:roomId/messages', { preHandler: [authGuard, tenantGuard()] }, async (request: any, reply) => {
    const { roomId } = z.object({ roomId: z.string().uuid() }).parse(request.params);
    const { body } = z.object({ body: z.string().trim().min(1).max(4000) }).parse(request.body ?? {});
    try {
      const message = await postRoomMessage(request.user.tenant_id, request.user.sub, roomId, body);
      return reply.send(message);
    } catch (error) {
      return errorReply(reply, error);
    }
  });

  app.put('/rooms/:roomId/read', { preHandler: [authGuard, tenantGuard()] }, async (request: any, reply) => {
    const { roomId } = z.object({ roomId: z.string().uuid() }).parse(request.params);
    const { lastReadMessageId } = z.object({ lastReadMessageId: z.string().uuid().nullable().optional() }).parse(request.body ?? {});
    try {
      await markRoomRead(request.user.tenant_id, request.user.sub, roomId, lastReadMessageId ?? null);
      return reply.send({ ok: true });
    } catch (error) {
      return errorReply(reply, error);
    }
  });

  app.put('/rooms/:roomId/presence', { preHandler: [authGuard, tenantGuard()] }, async (request: any, reply) => {
    const { roomId } = z.object({ roomId: z.string().uuid() }).parse(request.params);
    const { status, pathname } = z.object({
      status: z.enum(['online', 'idle', 'away']),
      pathname: z.string().optional().nullable(),
    }).parse(request.body ?? {});
    try {
      const presence = await upsertRoomPresence(request.user.tenant_id, request.user.sub, roomId, status, pathname ?? null);
      return reply.send({ presence });
    } catch (error) {
      return errorReply(reply, error);
    }
  });

  app.get('/rooms/:roomId/stream', { preHandler: [authGuard, tenantGuard()] }, async (request: any, reply) => {
    const { roomId } = z.object({ roomId: z.string().uuid() }).parse(request.params);
    const tenantId = request.user.tenant_id;
    const userId = request.user.sub;

    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.flushHeaders();

    const emit = (event: RoomStreamEvent) => {
      reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    };

    try {
      const snapshot = await getRoomSnapshot(tenantId, userId, roomId);
      emit({ type: 'snapshot', ...snapshot });
      const unsubscribe = subscribeRoom(roomId, emit);
      const keepalive = setInterval(() => emit({ type: 'keepalive', ts: new Date().toISOString() }), 25000);
      request.raw.on('close', () => {
        clearInterval(keepalive);
        unsubscribe();
        reply.raw.end();
      });
    } catch (error) {
      emit({ type: 'keepalive', ts: new Date().toISOString() });
      reply.raw.write(`event: error\ndata: ${JSON.stringify({ error: (error as any)?.message || 'rooms_error' })}\n\n`);
      reply.raw.end();
    }
  });
}
