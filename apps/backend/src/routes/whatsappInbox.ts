import { FastifyInstance } from 'fastify';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { query } from '../db';
import { sendWhatsAppText } from '../services/whatsappService';
import { env } from '../env';

export default async function whatsappInboxRoutes(app: FastifyInstance) {

  // ── Stats ─────────────────────────────────────────────────────────────────
  app.get('/whatsapp/stats', { preHandler: [authGuard, tenantGuard()] }, async (req, reply) => {
    const tenantId = (req.user as any).tenant_id;
    const [cloud, grp, briefs, totalCloud, totalGrp] = await Promise.all([
      query(`SELECT COUNT(*) AS cnt FROM whatsapp_messages WHERE tenant_id = $1 AND created_at > now() - INTERVAL '24h'`, [tenantId]),
      query(`SELECT COUNT(*) AS cnt FROM whatsapp_group_messages wgm JOIN whatsapp_groups wg ON wg.id = wgm.group_id WHERE wgm.tenant_id = $1 AND wgm.created_at > now() - INTERVAL '24h'`, [tenantId]),
      query(`SELECT COUNT(*) AS cnt FROM edro_briefings WHERE tenant_id = $1 AND (payload->>'origin' = 'whatsapp_group' OR source = 'whatsapp') AND created_at > now() - INTERVAL '24h'`, [tenantId]),
      query(`SELECT COUNT(*) AS cnt FROM whatsapp_messages WHERE tenant_id = $1`, [tenantId]),
      query(`SELECT COUNT(*) AS cnt FROM whatsapp_group_messages wgm JOIN whatsapp_groups wg ON wg.id = wgm.group_id WHERE wgm.tenant_id = $1`, [tenantId]),
    ]);
    return reply.send({
      messages_today: parseInt(cloud.rows[0].cnt) + parseInt(grp.rows[0].cnt),
      briefings_today: parseInt(briefs.rows[0].cnt),
      total_messages: parseInt(totalCloud.rows[0].cnt) + parseInt(totalGrp.rows[0].cnt),
    });
  });

  // ── Conversations list ─────────────────────────────────────────────────────
  app.get('/whatsapp/conversations', { preHandler: [authGuard, tenantGuard()] }, async (req, reply) => {
    const tenantId = (req.user as any).tenant_id;

    // Latest cloud API message per client
    const { rows: cloudConvs } = await query(`
      SELECT DISTINCT ON (wm.client_id)
        wm.client_id,
        c.name AS client_name,
        wm.raw_text AS last_message,
        wm.direction AS last_direction,
        wm.type AS last_type,
        wm.created_at AS last_at,
        'cloud' AS channel,
        (SELECT COUNT(*)::int FROM whatsapp_messages WHERE client_id = wm.client_id AND tenant_id = $1) AS message_count
      FROM whatsapp_messages wm
      JOIN clients c ON c.id = wm.client_id
      WHERE wm.tenant_id = $1
      ORDER BY wm.client_id, wm.created_at DESC
    `, [tenantId]);

    // Latest evolution group message per client
    const { rows: groupConvs } = await query(`
      SELECT DISTINCT ON (wg.client_id)
        wg.client_id,
        c.name AS client_name,
        wgm.content AS last_message,
        'inbound' AS last_direction,
        wgm.type AS last_type,
        wgm.created_at AS last_at,
        'evolution' AS channel,
        (SELECT COUNT(*)::int FROM whatsapp_group_messages wm2 JOIN whatsapp_groups wg2 ON wg2.id = wm2.group_id WHERE wg2.client_id = wg.client_id AND wm2.tenant_id = $1) AS message_count
      FROM whatsapp_group_messages wgm
      JOIN whatsapp_groups wg ON wg.id = wgm.group_id
      JOIN clients c ON c.id = wg.client_id
      WHERE wgm.tenant_id = $1 AND wg.client_id IS NOT NULL
      ORDER BY wg.client_id, wgm.created_at DESC
    `, [tenantId]);

    // Merge, deduplicate by client_id (keep most recent)
    const merged: Record<string, any> = {};
    for (const r of [...cloudConvs, ...groupConvs]) {
      if (!r.client_id) continue;
      const ex = merged[r.client_id];
      if (!ex || new Date(r.last_at) > new Date(ex.last_at)) merged[r.client_id] = r;
    }
    const sorted = Object.values(merged).sort((a: any, b: any) =>
      new Date(b.last_at).getTime() - new Date(a.last_at).getTime(),
    );

    return reply.send({ success: true, data: sorted });
  });

  // ── Messages thread for a client ──────────────────────────────────────────
  app.get<{ Querystring: { client_id: string; limit?: string } }>(
    '/whatsapp/messages', { preHandler: [authGuard, tenantGuard()] }, async (req, reply) => {
      const tenantId = (req.user as any).tenant_id;
      const { client_id } = req.query;
      const lim = Math.min(parseInt(req.query.limit ?? '80'), 200);

      const [cloudMsgs, groupMsgs] = await Promise.all([
        query(`
          SELECT id::text, client_id, raw_text AS content, direction, type,
                 created_at, briefing_id::text, 'cloud' AS channel,
                 NULL::text AS sender_name, NULL::text AS group_name, sender_phone
          FROM whatsapp_messages
          WHERE client_id = $1 AND tenant_id = $2
          ORDER BY created_at DESC LIMIT $3
        `, [client_id, tenantId, lim]),
        query(`
          SELECT wgm.id::text, wg.client_id, wgm.content, 'inbound' AS direction, wgm.type,
                 wgm.created_at, wgm.briefing_id::text, 'evolution' AS channel,
                 wgm.sender_name, wg.group_name, NULL::text AS sender_phone
          FROM whatsapp_group_messages wgm
          JOIN whatsapp_groups wg ON wg.id = wgm.group_id
          WHERE wg.client_id = $1 AND wgm.tenant_id = $2
          ORDER BY wgm.created_at DESC LIMIT $3
        `, [client_id, tenantId, lim]),
      ]);

      const all = [...cloudMsgs.rows, ...groupMsgs.rows].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );

      return reply.send({ success: true, data: all });
    },
  );

  // ── Send message to client (Cloud API) ────────────────────────────────────
  app.post<{ Body: { client_id: string; message: string } }>(
    '/whatsapp/send', { preHandler: [authGuard, tenantGuard(), requirePerm('admin')] }, async (req, reply) => {
      const tenantId = (req.user as any).tenant_id;
      const { client_id, message } = req.body;

      if (!message?.trim()) return reply.code(400).send({ error: 'empty_message' });

      const { rows } = await query(
        `SELECT id, name, whatsapp_phone FROM clients WHERE id = $1 AND tenant_id::text = $2`,
        [client_id, tenantId],
      );
      if (!rows.length) return reply.code(404).send({ error: 'client_not_found' });
      const client = rows[0];
      if (!client.whatsapp_phone) return reply.code(400).send({ error: 'client_has_no_whatsapp_phone', hint: 'Configure o número do WhatsApp do cliente no perfil.' });

      const result = await sendWhatsAppText(client.whatsapp_phone, message);
      if (!result.ok) return reply.code(500).send({ error: result.error });

      const phoneId = env.WHATSAPP_PHONE_ID || 'outbound';
      await query(`
        INSERT INTO whatsapp_messages
          (tenant_id, client_id, phone_number_id, wa_message_id, sender_phone, direction, type, raw_text)
        VALUES ($1, $2, $3, $4, $5, 'outbound', 'text', $6)
        ON CONFLICT (wa_message_id) DO NOTHING
      `, [tenantId, client_id, phoneId, result.messageId ?? `out_${Date.now()}`, client.whatsapp_phone, message]);

      return reply.send({ success: true, message_id: result.messageId });
    },
  );
}
