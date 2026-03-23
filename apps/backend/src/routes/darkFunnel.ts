import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { hasClientPerm, requireClientPerm } from '../auth/clientPerms';
import { parseDarkFunnelSignal } from '../services/darkFunnelParser';

const PostBody = z.object({
  client_id: z.string().min(1),
  source_type: z.enum(['form_field', 'sales_call_note', 'crm_custom_field', 'email_reply']),
  raw_text: z.string().min(1).max(2000),
  related_content_ids: z.array(z.string()).optional().default([]),
  notes: z.string().max(1000).optional().nullable(),
  recorded_by: z.string().max(200).optional().nullable(),
  // Optional overrides (if caller already knows the channel)
  parsed_channel: z.string().optional().nullable(),
  journey_stage: z.enum(['first_touch_dark', 'middle_touch_dark', 'last_touch_dark']).optional().nullable(),
});

export default async function darkFunnelRoutes(app: FastifyInstance) {
  // ── POST /dark-funnel ─────────────────────────────────────────────────────
  // Record a new dark funnel event (with auto-parsing)

  app.post('/dark-funnel', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard(), requireClientPerm('write')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const body = PostBody.parse(request.body);

    // Verify client belongs to tenant
    const { rows: [client] } = await query(
      `SELECT id FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [body.client_id, tenantId]
    );
    if (!client) return reply.status(404).send({ error: 'client_not_found' });

    // Auto-parse unless caller provided overrides
    const parsed = parseDarkFunnelSignal(body.raw_text);
    const finalChannel = body.parsed_channel ?? parsed.parsed_channel;
    const finalConfidence = parsed.confidence_score;
    const finalStage = body.journey_stage ?? parsed.journey_stage;

    const { rows: [event] } = await query(
      `INSERT INTO dark_funnel_events
         (tenant_id, client_id, source_type, raw_text,
          parsed_channel, confidence_score,
          related_content_ids, journey_stage,
          notes, recorded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7::text[],$8,$9,$10)
       RETURNING *`,
      [
        tenantId, body.client_id, body.source_type, body.raw_text,
        finalChannel, finalConfidence,
        body.related_content_ids,
        finalStage,
        body.notes ?? null,
        body.recorded_by ?? null,
      ]
    );

    return reply.status(201).send({ success: true, data: event });
  });

  // ── GET /dark-funnel ──────────────────────────────────────────────────────
  // List dark funnel events for a client

  app.get('/dark-funnel', {
    preHandler: [authGuard, requirePerm('clients:read'), tenantGuard(), requireClientPerm('read')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const query_params = request.query as Record<string, string>;

    const clientId = query_params['client_id'];
    if (!clientId) return reply.status(400).send({ error: 'client_id required' });

    const channel = query_params['channel'] ?? null;
    const limit = Math.min(Number(query_params['limit'] ?? 50), 200);
    const offset = Number(query_params['offset'] ?? 0);

    const { rows } = await query(
      `SELECT id, source_type, raw_text, parsed_channel, confidence_score,
              related_content_ids, journey_stage, notes, recorded_by, created_at
       FROM dark_funnel_events
       WHERE tenant_id=$1 AND client_id=$2
         ${channel ? `AND parsed_channel=$3` : ''}
       ORDER BY created_at DESC
       LIMIT $${channel ? 4 : 3} OFFSET $${channel ? 5 : 4}`,
      channel
        ? [tenantId, clientId, channel, limit, offset]
        : [tenantId, clientId, limit, offset]
    );

    const { rows: [countRow] } = await query(
      `SELECT COUNT(*) AS total FROM dark_funnel_events
       WHERE tenant_id=$1 AND client_id=$2
         ${channel ? `AND parsed_channel=$3` : ''}`,
      channel ? [tenantId, clientId, channel] : [tenantId, clientId]
    );

    return reply.send({
      data: rows,
      total: Number(countRow.total),
      limit,
      offset,
    });
  });

  // ── GET /dark-funnel/stats ────────────────────────────────────────────────
  // Channel distribution + journey stage breakdown for a client

  app.get('/dark-funnel/stats', {
    preHandler: [authGuard, requirePerm('clients:read'), tenantGuard(), requireClientPerm('read')],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const query_params = request.query as Record<string, string>;

    const clientId = query_params['client_id'];
    if (!clientId) return reply.status(400).send({ error: 'client_id required' });

    const [{ rows: channelRows }, { rows: stageRows }] = await Promise.all([
      query(
        `SELECT parsed_channel, COUNT(*) AS count
         FROM dark_funnel_events
         WHERE tenant_id=$1 AND client_id=$2 AND parsed_channel IS NOT NULL
         GROUP BY parsed_channel ORDER BY count DESC`,
        [tenantId, clientId]
      ),
      query(
        `SELECT journey_stage, COUNT(*) AS count
         FROM dark_funnel_events
         WHERE tenant_id=$1 AND client_id=$2 AND journey_stage IS NOT NULL
         GROUP BY journey_stage`,
        [tenantId, clientId]
      ),
    ]);

    return reply.send({
      channels: channelRows.map((r) => ({ channel: r.parsed_channel, count: Number(r.count) })),
      stages: stageRows.map((r) => ({ stage: r.journey_stage, count: Number(r.count) })),
    });
  });

  // ── DELETE /dark-funnel/:id ───────────────────────────────────────────────

  app.delete('/dark-funnel/:id', {
    preHandler: [authGuard, requirePerm('clients:write'), tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const user = request.user as { sub?: string; role?: string } | undefined;
    const { id } = request.params as { id: string };

    const { rows } = await query<{ client_id: string }>(
      `SELECT client_id FROM dark_funnel_events WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
      [id, tenantId]
    );
    const clientId = rows[0]?.client_id;
    if (!clientId) return reply.status(404).send({ error: 'not_found' });

    const allowed = await hasClientPerm({
      tenantId,
      userId: user?.sub || '',
      role: user?.role,
      clientId,
      perm: 'write',
    });
    if (!allowed) {
      return reply.status(403).send({ error: 'client_forbidden', perm: 'write', client_id: clientId });
    }

    const { rowCount } = await query(
      `DELETE FROM dark_funnel_events WHERE id=$1 AND tenant_id=$2`,
      [id, tenantId]
    );

    if (!rowCount) return reply.status(404).send({ error: 'not_found' });
    return reply.send({ success: true });
  });
}
