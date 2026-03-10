/**
 * Evolution API management routes
 * Connect WhatsApp, list groups, link groups to clients.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requirePerm } from '../auth/rbac';
import { query } from '../db';
import {
  createInstance,
  getQrCode,
  getInstanceStatus,
  disconnectInstance,
  fetchGroups,
  linkGroupToClient,
  unlinkGroup,
  ensureEvolutionTables,
  isConfigured,
} from '../services/integrations/evolutionApiService';

export default async function evolutionRoutes(app: FastifyInstance) {
  await ensureEvolutionTables();

  // ── Status check ───────────────────────────────────────────────────────
  app.get('/whatsapp-groups/status', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;

    if (!isConfigured()) {
      return reply.send({ configured: false });
    }

    const { rows } = await query(
      `SELECT * FROM evolution_instances WHERE tenant_id = $1`, [tenantId],
    );

    const instance = rows[0] ?? null;

    // Try to get live status
    let liveStatus = null;
    if (instance) {
      try {
        liveStatus = await getInstanceStatus(tenantId);
      } catch { /* ignore */ }
    }

    return reply.send({
      configured: true,
      instance,
      live: liveStatus,
    });
  });

  // ── Connect / get QR code ──────────────────────────────────────────────
  app.post('/whatsapp-groups/connect', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;

    if (!isConfigured()) {
      return reply.code(503).send({ error: 'Evolution API não configurada neste servidor.' });
    }

    try {
      await createInstance(tenantId);
      // Poll up to 20s so the instance has time to initiate Baileys connection
      const qr = await getQrCode(tenantId, { pollSeconds: 20 });
      return reply.send({ success: true, qr });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ── Get QR code (polling endpoint for frontend) ────────────────────────
  app.get('/whatsapp-groups/qrcode', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    try {
      // Poll up to 15s per request so the frontend can use long-polling
      const qr = await getQrCode(tenantId, { pollSeconds: 15 });
      return reply.send({ success: true, qr });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ── Disconnect ─────────────────────────────────────────────────────────
  app.delete('/whatsapp-groups/disconnect', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    try {
      await disconnectInstance(tenantId);
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ── List all groups from WhatsApp ──────────────────────────────────────
  app.get('/whatsapp-groups/available', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    try {
      const groups = await fetchGroups(tenantId);
      return reply.send({ success: true, data: groups });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ── List linked groups (with client association) ───────────────────────
  app.get('/whatsapp-groups', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { rows } = await query(
      `SELECT wg.*, c.name AS client_name,
         (SELECT COUNT(*) FROM whatsapp_group_messages m WHERE m.group_id = wg.id) AS message_count
       FROM whatsapp_groups wg
       LEFT JOIN clients c ON c.id = wg.client_id
       WHERE wg.tenant_id = $1
       ORDER BY wg.last_message_at DESC NULLS LAST`,
      [tenantId],
    );
    return reply.send({ success: true, data: rows });
  });

  // ── Link group to client ───────────────────────────────────────────────
  const linkSchema = z.object({
    group_jid:     z.string(),
    client_id:     z.string(),
    auto_briefing: z.boolean().optional(),
    notify_jarvis: z.boolean().optional(),
  });

  app.post('/whatsapp-groups/link', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const body = linkSchema.parse(request.body);
    try {
      await linkGroupToClient(tenantId, body.group_jid, body.client_id, {
        autoBriefing: body.auto_briefing,
        notifyJarvis: body.notify_jarvis,
      });
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ── Update group settings ──────────────────────────────────────────────
  const updateSchema = z.object({
    auto_briefing: z.boolean().optional(),
    notify_jarvis: z.boolean().optional(),
    active: z.boolean().optional(),
  });

  app.patch<{ Params: { groupId: string } }>('/whatsapp-groups/:groupId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const body = updateSchema.parse(request.body ?? {});
    const { groupId } = request.params;

    const sets: string[] = [];
    const vals: any[] = [groupId, tenantId];
    if (body.auto_briefing !== undefined) { vals.push(body.auto_briefing); sets.push(`auto_briefing = $${vals.length}`); }
    if (body.notify_jarvis !== undefined) { vals.push(body.notify_jarvis); sets.push(`notify_jarvis = $${vals.length}`); }
    if (body.active !== undefined)        { vals.push(body.active);        sets.push(`active = $${vals.length}`); }

    if (!sets.length) return reply.code(400).send({ error: 'Nenhum campo para atualizar.' });

    await query(
      `UPDATE whatsapp_groups SET ${sets.join(', ')} WHERE id = $1 AND tenant_id = $2`,
      vals,
    );
    return reply.send({ success: true });
  });

  // ── Unlink group ───────────────────────────────────────────────────────
  app.delete<{ Params: { groupId: string } }>('/whatsapp-groups/:groupId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { rows } = await query(
      `SELECT group_jid FROM whatsapp_groups WHERE id = $1 AND tenant_id = $2`,
      [request.params.groupId, tenantId],
    );
    if (!rows.length) return reply.code(404).send({ error: 'not_found' });
    await unlinkGroup(tenantId, rows[0].group_jid);
    return reply.send({ success: true });
  });

  // ── Messages for a group ───────────────────────────────────────────────
  app.get<{ Params: { groupId: string } }>('/whatsapp-groups/:groupId/messages', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { rows } = await query(
      `SELECT * FROM whatsapp_group_messages
       WHERE group_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC LIMIT 50`,
      [request.params.groupId, tenantId],
    );
    return reply.send({ success: true, data: rows });
  });

  // ── Messages for a client (across all groups) ──────────────────────────
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/whatsapp-group-messages', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { rows } = await query(
      `SELECT m.*, wg.group_name
       FROM whatsapp_group_messages m
       JOIN whatsapp_groups wg ON wg.id = m.group_id
       WHERE m.client_id = $1 AND m.tenant_id = $2
       ORDER BY m.created_at DESC LIMIT 50`,
      [request.params.clientId, tenantId],
    );
    return reply.send({ success: true, data: rows });
  });
}
