import { randomUUID } from 'crypto';
import { FastifyInstance } from 'fastify';
import { requireClientPerm } from '../auth/clientPerms';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { query } from '../db';
import { enqueueJob } from '../jobs/jobQueue';
import { sendWhatsAppText } from '../services/whatsappService';
import { env } from '../env';
import { backfillWhatsAppClientMemory, persistWhatsAppMessageMemory } from '../services/whatsappClientMemoryService';

export default async function whatsappInboxRoutes(app: FastifyInstance) {

  // ── Stats ─────────────────────────────────────────────────────────────────
  app.get('/whatsapp/stats', { preHandler: [authGuard, tenantGuard(), requirePerm('portfolio:read')] }, async (req, reply) => {
    const tenantId = (req.user as any).tenant_id;
    const [cloud, grp, briefs, totalCloud, totalGrp] = await Promise.all([
      query(`SELECT COUNT(*) AS cnt FROM whatsapp_messages WHERE tenant_id = $1 AND created_at > now() - INTERVAL '24h'`, [tenantId]),
      query(`SELECT COUNT(*) AS cnt FROM whatsapp_group_messages wgm JOIN whatsapp_groups wg ON wg.id = wgm.group_id WHERE wgm.tenant_id = $1 AND wgm.created_at > now() - INTERVAL '24h'`, [tenantId]),
      query(`SELECT COUNT(*) AS cnt FROM edro_briefings b JOIN clients c ON c.id = b.client_id::text WHERE c.tenant_id = $1 AND (b.payload->>'origin' = 'whatsapp_group' OR b.source = 'whatsapp') AND b.created_at > now() - INTERVAL '24h'`, [tenantId]),
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
  app.get('/whatsapp/conversations', { preHandler: [authGuard, tenantGuard(), requirePerm('portfolio:read')] }, async (req, reply) => {
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
    '/whatsapp/messages',
    { preHandler: [authGuard, tenantGuard(), requirePerm('clients:read'), requireClientPerm('read')] },
    async (req, reply) => {
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
                 COALESCE(cc.name, fp.display_name, wgm.sender_name) AS sender_name,
                 wg.group_name, NULL::text AS sender_phone,
                 CASE WHEN cc.id IS NOT NULL THEN 'client_contact'
                      WHEN fp.id IS NOT NULL THEN 'freelancer'
                      ELSE NULL END AS contact_type
          FROM whatsapp_group_messages wgm
          JOIN whatsapp_groups wg ON wg.id = wgm.group_id
          LEFT JOIN client_contacts cc ON cc.whatsapp_jid = wgm.sender_jid AND cc.active = true
          LEFT JOIN freelancer_profiles fp ON fp.whatsapp_jid = wgm.sender_jid
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

      // INSERT before sending — prevents ghost sends where the message is delivered
      // to the client but never tracked because the DB write failed after a successful send.
      const phoneId = env.WHATSAPP_PHONE_ID || 'outbound';
      const localId = `out_${Date.now()}_${randomUUID().slice(0, 8)}`;
      const { rows: outboundRows } = await query<{ created_at: string }>(`
        INSERT INTO whatsapp_messages
          (tenant_id, client_id, phone_number_id, wa_message_id, sender_phone, direction, type, raw_text)
        VALUES ($1, $2, $3, $4, $5, 'outbound', 'text', $6)
        RETURNING created_at
      `, [tenantId, client_id, phoneId, localId, client.whatsapp_phone, message]);

      const result = await sendWhatsAppText(client.whatsapp_phone, message, {
        tenantId,
        event: 'manual_message_sent',
        meta: { channel: 'admin_inbox', client_id },
      });

      if (!result.ok) {
        // Mark row as failed so history shows the attempt without polluting threads
        await query(
          `UPDATE whatsapp_messages SET wa_message_id = $1 WHERE wa_message_id = $2`,
          [`${localId}_failed`, localId],
        ).catch(() => {});
        return reply.code(500).send({ error: result.error });
      }

      // Update to real Meta message ID if returned (enables read-receipt correlation)
      const finalId = result.messageId ?? localId;
      if (finalId !== localId) {
        await query(
          `UPDATE whatsapp_messages SET wa_message_id = $1 WHERE wa_message_id = $2`,
          [finalId, localId],
        ).catch(() => {});
      }

      await persistWhatsAppMessageMemory({
        tenantId,
        clientId: client_id,
        externalMessageId: finalId,
        text: message,
        senderName: 'Edro',
        senderPhone: client.whatsapp_phone,
        direction: 'outbound',
        messageType: 'text',
        createdAt: outboundRows[0]?.created_at ? new Date(outboundRows[0].created_at) : new Date(),
        channel: 'manual',
      }).catch(() => {});

      return reply.send({ success: true, message_id: finalId });
    },
  );

  app.post<{ Body: { client_id?: string | null; async?: boolean | null } }>(
    '/whatsapp/memory/backfill',
    { preHandler: [authGuard, tenantGuard(), requirePerm('admin')] },
    async (req, reply) => {
      const tenantId = (req.user as any).tenant_id;
      const clientId = req.body?.client_id ?? null;
      const useAsync = Boolean(req.body?.async);

      if (useAsync) {
        const job = await enqueueJob(tenantId, 'whatsapp.memory_backfill', {
          tenant_id: tenantId,
          client_id: clientId,
          trigger: clientId ? 'client_manual' : 'tenant_manual',
        });
        return reply.send({
          success: true,
          queued: true,
          data: {
            job_id: job.id,
            client_id: clientId,
          },
        });
      }

      const stats = await backfillWhatsAppClientMemory({
        tenantId,
        clientId,
      });
      return reply.send({ success: true, data: stats });
    },
  );
}
