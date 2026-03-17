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
  restartInstance,
  fetchGroups,
  linkGroupToClient,
  unlinkGroup,
  ensureEvolutionTables,
  isConfigured,
  configureWebhook,
  instanceName,
  syncGroupHistory,
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
      `SELECT m.*,
              COALESCE(cc.name, fp.display_name, m.sender_name) AS resolved_name,
              CASE WHEN cc.id IS NOT NULL THEN 'client_contact'
                   WHEN fp.id IS NOT NULL THEN 'freelancer'
                   ELSE NULL END AS contact_type
       FROM whatsapp_group_messages m
       LEFT JOIN client_contacts cc ON cc.whatsapp_jid = m.sender_jid AND cc.active = true
       LEFT JOIN freelancer_profiles fp ON fp.whatsapp_jid = m.sender_jid
       WHERE m.group_id = $1 AND m.tenant_id = $2
       ORDER BY m.created_at DESC LIMIT 50`,
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
      `SELECT m.*, wg.group_name,
              COALESCE(cc.name, fp.display_name, m.sender_name) AS resolved_name,
              CASE WHEN cc.id IS NOT NULL THEN 'client_contact'
                   WHEN fp.id IS NOT NULL THEN 'freelancer'
                   ELSE NULL END AS contact_type
       FROM whatsapp_group_messages m
       JOIN whatsapp_groups wg ON wg.id = m.group_id
       LEFT JOIN client_contacts cc ON cc.whatsapp_jid = m.sender_jid AND cc.active = true
       LEFT JOIN freelancer_profiles fp ON fp.whatsapp_jid = m.sender_jid
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
        `SELECT i.*, COALESCE(cc.name, fp.display_name, m.sender_name) AS sender_name,
                m.content AS message_content,
                CASE WHEN cc.id IS NOT NULL THEN 'client_contact'
                     WHEN fp.id IS NOT NULL THEN 'freelancer'
                     ELSE NULL END AS contact_type
         FROM whatsapp_message_insights i
         JOIN whatsapp_group_messages m ON m.id = i.message_id
         LEFT JOIN client_contacts cc ON cc.whatsapp_jid = m.sender_jid AND cc.active = true
         LEFT JOIN freelancer_profiles fp ON fp.whatsapp_jid = m.sender_jid
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
         m.id, COALESCE(cc.name, fp.display_name, m.sender_name) AS sender_name,
         m.sender_name AS original_sender_name,
         CASE WHEN cc.id IS NOT NULL THEN 'client_contact'
              WHEN fp.id IS NOT NULL THEN 'freelancer'
              ELSE NULL END AS contact_type,
         m.type, m.content, m.created_at,
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
       LEFT JOIN client_contacts cc ON cc.whatsapp_jid = m.sender_jid AND cc.active = true
       LEFT JOIN freelancer_profiles fp ON fp.whatsapp_jid = m.sender_jid
       WHERE m.client_id = $1 AND m.tenant_id = $2
       GROUP BY m.id, wg.group_name, cc.id, cc.name, fp.id, fp.display_name
       ORDER BY m.created_at DESC
       LIMIT $3`,
      [request.params.clientId, tenantId, limit],
    );
    return reply.send({ success: true, data: rows });
  });

  // ── Intelligence aggregate for client page ──────────────────────────────
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/whatsapp-intelligence', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { clientId } = request.params;

    const [msgRes, insightRes, digestRes, sentimentRes] = await Promise.all([
      query<{ messages_7d: number; messages_30d: number }>(
        `SELECT
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::int  AS messages_7d,
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS messages_30d
         FROM whatsapp_group_messages
         WHERE client_id = $1 AND tenant_id = $2`,
        [clientId, tenantId],
      ),
      query(
        `SELECT i.id, i.insight_type, i.summary, i.sentiment, i.urgency,
                i.entities, i.created_at, i.confidence, i.confirmation_status, i.corrected_summary,
                COALESCE(cc.name, fp.display_name, m.sender_name) AS sender_name,
                m.content AS message_content
         FROM whatsapp_message_insights i
         JOIN whatsapp_group_messages m ON m.id = i.message_id
         LEFT JOIN client_contacts cc ON cc.whatsapp_jid = m.sender_jid AND cc.active = true
         LEFT JOIN freelancer_profiles fp ON fp.whatsapp_jid = m.sender_jid
         WHERE i.client_id = $1 AND i.tenant_id = $2
           AND i.actioned = false
           AND COALESCE(i.confirmation_status, 'pending') != 'discarded'
         ORDER BY
           CASE i.urgency WHEN 'urgent' THEN 0 WHEN 'normal' THEN 1 ELSE 2 END,
           CASE COALESCE(i.confirmation_status,'pending') WHEN 'pending' THEN 0 ELSE 1 END,
           i.created_at DESC
         LIMIT 20`,
        [clientId, tenantId],
      ),
      query(
        `SELECT * FROM whatsapp_group_digests
         WHERE client_id = $1 AND tenant_id = $2
         ORDER BY period_start DESC LIMIT 1`,
        [clientId, tenantId],
      ),
      query<{ unactioned: number; urgent_unactioned: number; dominant_sentiment: string | null }>(
        `SELECT
           COUNT(*) FILTER (WHERE actioned = false)::int AS unactioned,
           COUNT(*) FILTER (WHERE urgency = 'urgent' AND actioned = false)::int AS urgent_unactioned,
           MODE() WITHIN GROUP (ORDER BY sentiment) AS dominant_sentiment
         FROM whatsapp_message_insights
         WHERE client_id = $1 AND tenant_id = $2`,
        [clientId, tenantId],
      ),
    ]);

    const msg = msgRes.rows[0] ?? { messages_7d: 0, messages_30d: 0 };
    const sent = sentimentRes.rows[0] ?? { unactioned: 0, urgent_unactioned: 0, dominant_sentiment: null };

    return reply.send({
      success: true,
      stats: {
        messages_7d: msg.messages_7d,
        messages_30d: msg.messages_30d,
        unactioned: sent.unactioned,
        urgent_unactioned: sent.urgent_unactioned,
        dominant_sentiment: sent.dominant_sentiment,
      },
      insights: insightRes.rows,
      digest: digestRes.rows[0] ?? null,
    });
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

  // ── Confirm insight interpretation (human says: "yes, correct") ─────────
  app.patch<{ Params: { insightId: string } }>('/whatsapp-groups/insights/:insightId/confirm', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const userId = (request.user as any).sub as string | undefined;

    const { rows } = await query(
      `UPDATE whatsapp_message_insights
         SET confirmation_status = 'confirmed', confirmed_by = $3, confirmed_at = NOW(), actioned = true
       WHERE id = $1 AND tenant_id = $2
       RETURNING id, client_id, insight_type, summary, sentiment`,
      [request.params.insightId, tenantId, userId ?? null],
    );
    const insight = rows[0];
    if (!insight) return reply.code(404).send({ error: 'not_found' });

    // Persist as permanent client directive for preference/complaint/approval types
    await maybePersistDirective({ tenantId, insight, userId });

    return reply.send({ success: true });
  });

  // ── Correct insight interpretation (human provides the right reading) ────
  app.patch<{ Params: { insightId: string }; Body: { corrected_summary: string } }>(
    '/whatsapp-groups/insights/:insightId/correct',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const userId = (request.user as any).sub as string | undefined;
      const { corrected_summary } = (request.body ?? {}) as any;

      if (!corrected_summary?.trim()) {
        return reply.code(400).send({ error: 'corrected_summary required' });
      }

      const { rows } = await query(
        `UPDATE whatsapp_message_insights
           SET confirmation_status = 'corrected',
               corrected_summary = $3,
               confirmed_by = $4,
               confirmed_at = NOW(),
               actioned = true
         WHERE id = $1 AND tenant_id = $2
         RETURNING id, client_id, insight_type, summary, sentiment`,
        [request.params.insightId, tenantId, corrected_summary.trim(), userId ?? null],
      );
      const insight = rows[0];
      if (!insight) return reply.code(404).send({ error: 'not_found' });

      // Use corrected text as the directive
      await maybePersistDirective({ tenantId, insight: { ...insight, summary: corrected_summary.trim() }, userId });

      return reply.send({ success: true });
    },
  );

  // ── Discard insight (human says: "this is noise, ignore") ───────────────
  app.patch<{ Params: { insightId: string } }>('/whatsapp-groups/insights/:insightId/discard', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const userId = (request.user as any).sub as string | undefined;
    await query(
      `UPDATE whatsapp_message_insights
         SET confirmation_status = 'discarded', confirmed_by = $3, confirmed_at = NOW(), actioned = true
       WHERE id = $1 AND tenant_id = $2`,
      [request.params.insightId, tenantId, userId ?? null],
    );
    return reply.send({ success: true });
  });

  // ── Restart instance (delete + recreate) ──────────────────────────────
  app.post('/whatsapp-groups/restart', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    if (!isConfigured()) {
      return reply.code(503).send({ error: 'Evolution API não configurada.' });
    }
    try {
      await restartInstance(tenantId);
      const qr = await getQrCode(tenantId, { pollSeconds: 20 });
      return reply.send({ success: true, qr, message: 'Instância reiniciada. Escaneie o QR Code.' });
    } catch (err: any) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // ── Diagnostic info ──────────────────────────────────────────────────
  app.get('/whatsapp-groups/diagnostics', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const name = instanceName(tenantId);
    const publicUrl = process.env.PUBLIC_API_URL || '';
    const evolutionUrl = process.env.EVOLUTION_API_URL || '';

    let connectionState = 'unknown';
    let webhookConfigured = false;
    let webhookUrl = '';
    try {
      const status = await getInstanceStatus(tenantId);
      connectionState = status.state;
    } catch { /* ignore */ }

    try {
      const webhookData = await fetch(`${evolutionUrl.replace(/\/$/, '')}/webhook/find/${name}`, {
        headers: { apikey: process.env.EVOLUTION_API_KEY || '', 'Content-Type': 'application/json' },
      }).then(r => r.json()).catch(() => null);
      if (webhookData) {
        webhookUrl = webhookData?.webhook?.url || webhookData?.url || '';
        webhookConfigured = !!webhookUrl;
      }
    } catch { /* ignore */ }

    return reply.send({
      success: true,
      data: {
        instance_name: name,
        connection_state: connectionState,
        public_api_url: publicUrl ? `${publicUrl.slice(0, 40)}...` : 'NOT SET',
        evolution_api_url: evolutionUrl ? `${evolutionUrl.slice(0, 40)}...` : 'NOT SET',
        webhook_configured: webhookConfigured,
        webhook_url: webhookUrl ? `${webhookUrl.slice(0, 60)}...` : 'NOT SET',
      },
    });
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

  // ── Sync history for all linked groups ──────────────────────────────────
  app.post('/whatsapp-groups/sync-history', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { limit } = (request.body as any) ?? {};

    // Check connection first
    let connectionState = 'unknown';
    try {
      const status = await getInstanceStatus(tenantId);
      connectionState = status.state;
    } catch { /* ignore */ }

    if (connectionState !== 'open') {
      return reply.send({
        success: false,
        message: `WhatsApp desconectado (estado: ${connectionState}). Conecte via QR Code primeiro, depois sincronize.`,
        total_inserted: 0,
        groups: [],
      });
    }

    const { rows: groups } = await query(
      `SELECT id, group_jid, client_id FROM whatsapp_groups WHERE tenant_id = $1 AND active = true`,
      [tenantId],
    );

    if (!groups.length) {
      return reply.send({ success: true, message: 'Nenhum grupo ativo encontrado.', synced: 0 });
    }

    let totalInserted = 0;
    const results: { group_jid: string; inserted: number; error?: string }[] = [];

    for (const g of groups) {
      try {
        const inserted = await syncGroupHistory(tenantId, g.id, g.group_jid, g.client_id, limit ?? 500);
        totalInserted += inserted;
        results.push({ group_jid: g.group_jid, inserted });
      } catch (err: any) {
        results.push({ group_jid: g.group_jid, inserted: 0, error: err.message });
      }
    }

    return reply.send({
      success: true,
      message: `Sync concluído: ${totalInserted} mensagens novas de ${groups.length} grupo(s).`,
      total_inserted: totalInserted,
      groups: results,
    });
  });

  // ── Sync history for a single group ─────────────────────────────────────
  app.post('/whatsapp-groups/:groupId/sync-history', {
    preHandler: [authGuard, tenantGuard(), requirePerm('admin')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { groupId } = request.params as any;
    const { limit } = (request.body as any) ?? {};

    const { rows } = await query(
      `SELECT id, group_jid, client_id FROM whatsapp_groups WHERE id = $1 AND tenant_id = $2 AND active = true`,
      [groupId, tenantId],
    );
    if (!rows.length) return reply.code(404).send({ error: 'Grupo não encontrado.' });

    const g = rows[0];
    const inserted = await syncGroupHistory(tenantId, g.id, g.group_jid, g.client_id, limit ?? 200);

    return reply.send({
      success: true,
      message: `${inserted} mensagens sincronizadas.`,
      inserted,
    });
  });
}

// ── Helper: persist confirmed insight as permanent client directive ─────────
async function maybePersistDirective(params: {
  tenantId: string;
  insight: { id: string; client_id: string; insight_type: string; summary: string; sentiment: string };
  userId?: string;
}) {
  const { tenantId, insight, userId } = params;
  const { insight_type, summary, sentiment, client_id } = insight;

  // Only preference, complaint, and approval generate permanent directives
  const directiveTypes: Record<string, { type: string; fmt: (s: string) => string } | null> = {
    preference: { type: sentiment === 'negative' ? 'avoid' : 'boost', fmt: (s) => s },
    complaint:  { type: 'avoid', fmt: (s) => s },
    approval:   { type: 'boost', fmt: (s) => s },
  };

  const mapping = directiveTypes[insight_type];
  if (!mapping) return;

  const directive = mapping.fmt(summary).trim();
  if (directive.length < 5) return;

  try {
    await query(
      `INSERT INTO client_directives
         (tenant_id, client_id, source, source_id, directive_type, directive, confirmed_by)
       VALUES ($1, $2, 'whatsapp_insight', $3, $4, $5, $6)
       ON CONFLICT (tenant_id, client_id, directive) DO NOTHING`,
      [tenantId, client_id, insight.id, mapping.type, directive, userId ?? null],
    );
  } catch { /* non-blocking — directive already exists or schema not yet migrated */ }
}
