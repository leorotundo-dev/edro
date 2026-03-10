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
  configureWebhook,
  instanceName,
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
    notify_briefing_confirm: z.boolean().optional(),
    notify_digest: z.boolean().optional(),
    notify_deadlines: z.boolean().optional(),
    notify_jarvis_reply: z.boolean().optional(),
    quiet_hours_start: z.number().min(0).max(23).nullable().optional(),
    quiet_hours_end: z.number().min(0).max(23).nullable().optional(),
  });

  const BOOL_FIELDS = [
    'auto_briefing', 'notify_jarvis', 'active',
    'notify_briefing_confirm', 'notify_digest', 'notify_deadlines', 'notify_jarvis_reply',
  ] as const;

  app.patch<{ Params: { groupId: string } }>('/whatsapp-groups/:groupId', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const body = updateSchema.parse(request.body ?? {});
    const { groupId } = request.params;

    const sets: string[] = [];
    const vals: any[] = [groupId, tenantId];

    for (const f of BOOL_FIELDS) {
      if ((body as any)[f] !== undefined) { vals.push((body as any)[f]); sets.push(`${f} = $${vals.length}`); }
    }
    if (body.quiet_hours_start !== undefined) { vals.push(body.quiet_hours_start); sets.push(`quiet_hours_start = $${vals.length}`); }
    if (body.quiet_hours_end !== undefined)   { vals.push(body.quiet_hours_end);   sets.push(`quiet_hours_end = $${vals.length}`); }

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

  // ── Intelligence: insights for a client ─────────────────────────────────
  app.get<{ Params: { clientId: string } }>('/whatsapp-groups/:clientId/insights', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const qs = request.query as any;
    const page = Math.max(1, Number(qs.page) || 1);
    const limit = Math.min(50, Number(qs.limit) || 20);
    const offset = (page - 1) * limit;

    const [{ rows }, { rows: countRows }] = await Promise.all([
      query(
        `SELECT i.*, m.sender_name, m.content AS message_content
         FROM whatsapp_message_insights i
         JOIN whatsapp_group_messages m ON m.id = i.message_id
         WHERE i.client_id = $1 AND i.tenant_id = $2
         ORDER BY i.created_at DESC
         LIMIT $3 OFFSET $4`,
        [request.params.clientId, tenantId, limit, offset],
      ),
      query(
        `SELECT COUNT(*) AS total FROM whatsapp_message_insights
         WHERE client_id = $1 AND tenant_id = $2`,
        [request.params.clientId, tenantId],
      ),
    ]);

    return reply.send({ success: true, data: rows, total: Number(countRows[0]?.total || 0), page, limit });
  });

  // ── Intelligence: digests for a client ──────────────────────────────────
  app.get<{ Params: { clientId: string } }>('/whatsapp-groups/:clientId/digests', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { rows } = await query(
      `SELECT * FROM whatsapp_group_digests
       WHERE client_id = $1 AND tenant_id = $2
       ORDER BY period_start DESC
       LIMIT 20`,
      [request.params.clientId, tenantId],
    );
    return reply.send({ success: true, data: rows });
  });

  // ── Intelligence: timeline (messages + insights merged) ─────────────────
  app.get<{ Params: { clientId: string } }>('/whatsapp-groups/:clientId/timeline', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const limit = Math.min(100, Number((request.query as any).limit) || 50);

    const { rows } = await query(
      `SELECT
         m.id, m.sender_name, m.type, m.content, m.created_at,
         m.insight_extracted,
         wg.group_name,
         COALESCE(
           json_agg(
             json_build_object(
               'id', i.id,
               'insight_type', i.insight_type,
               'summary', i.summary,
               'sentiment', i.sentiment,
               'urgency', i.urgency,
               'actioned', i.actioned
             )
           ) FILTER (WHERE i.id IS NOT NULL),
           '[]'
         ) AS insights
       FROM whatsapp_group_messages m
       JOIN whatsapp_groups wg ON wg.id = m.group_id
       LEFT JOIN whatsapp_message_insights i ON i.message_id = m.id
       WHERE m.client_id = $1 AND m.tenant_id = $2
       GROUP BY m.id, wg.group_name
       ORDER BY m.created_at DESC
       LIMIT $3`,
      [request.params.clientId, tenantId, limit],
    );
    return reply.send({ success: true, data: rows });
  });

  // ── Intelligence: summary across all clients ────────────────────────────
  app.get('/whatsapp-groups/intelligence/summary', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;

    const [{ rows: stats }, { rows: urgent }] = await Promise.all([
      query(
        `SELECT
           COUNT(*) AS total_insights,
           COUNT(*) FILTER (WHERE NOT actioned) AS unactioned,
           COUNT(*) FILTER (WHERE urgency = 'urgent' AND NOT actioned) AS urgent_unactioned,
           COUNT(DISTINCT client_id) AS clients_with_insights
         FROM whatsapp_message_insights
         WHERE tenant_id = $1
           AND created_at > NOW() - INTERVAL '30 days'`,
        [tenantId],
      ),
      query(
        `SELECT i.*, c.name AS client_name
         FROM whatsapp_message_insights i
         LEFT JOIN clients c ON c.id = i.client_id
         WHERE i.tenant_id = $1
           AND i.urgency = 'urgent'
           AND i.actioned = false
         ORDER BY i.created_at DESC
         LIMIT 10`,
        [tenantId],
      ),
    ]);

    return reply.send({
      success: true,
      data: {
        stats: stats[0] || {},
        urgent_items: urgent,
      },
    });
  });

  // ── Mark insight as actioned ────────────────────────────────────────────
  app.patch<{ Params: { insightId: string } }>('/whatsapp-groups/insights/:insightId/action', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    await query(
      `UPDATE whatsapp_message_insights SET actioned = true WHERE id = $1 AND tenant_id = $2`,
      [request.params.insightId, tenantId],
    );
    return reply.send({ success: true });
  });

  // ── Reconfigure webhook (admin manual trigger) ────────────────────────
  app.post('/whatsapp-groups/reconfigure-webhook', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    try {
      await configureWebhook(tenantId);
      return reply.send({ success: true, message: 'Webhook configurado com sucesso.' });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });
}
