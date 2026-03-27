import { FastifyInstance } from 'fastify';
import { query } from '../db/db';
import { generateAndSaveDigest, buildDailyDigest, buildWeeklyDigest } from '../services/agencyDigestService';

export default async function agencyDigestRoutes(app: FastifyInstance) {
  // GET /admin/diario — list last 30 digests
  app.get('/admin/diario', async (req, reply) => {
    const tenantId = (req as any).tenantId || process.env.DEFAULT_TENANT_ID || 'edro';
    const { rows } = await query(
      `SELECT id, type, period_start, period_end, narrative_text, sent_at, created_at
       FROM agency_digests
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT 30`,
      [tenantId]
    );
    return reply.send({ digests: rows });
  });

  // GET /admin/diario/latest — most recent digest of each type
  app.get('/admin/diario/latest', async (req, reply) => {
    const tenantId = (req as any).tenantId || process.env.DEFAULT_TENANT_ID || 'edro';
    const { rows } = await query(
      `SELECT DISTINCT ON (type) id, type, period_start, period_end, content, narrative_text, sent_at, created_at
       FROM agency_digests
       WHERE tenant_id = $1
       ORDER BY type, created_at DESC`,
      [tenantId]
    );
    const daily = rows.find((r: any) => r.type === 'daily') || null;
    const weekly = rows.find((r: any) => r.type === 'weekly') || null;
    return reply.send({ daily, weekly });
  });

  // GET /admin/diario/:id — full digest with content
  app.get('/admin/diario/:id', async (req, reply) => {
    const tenantId = (req as any).tenantId || process.env.DEFAULT_TENANT_ID || 'edro';
    const { id } = req.params as { id: string };
    const { rows } = await query(
      `SELECT * FROM agency_digests WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    if (!rows[0]) return reply.status(404).send({ error: 'Not found' });
    return reply.send(rows[0]);
  });

  // POST /admin/diario/generate — manually trigger digest generation
  app.post('/admin/diario/generate', async (req, reply) => {
    const tenantId = (req as any).tenantId || process.env.DEFAULT_TENANT_ID || 'edro';
    const { type = 'daily' } = (req.body as any) || {};
    if (!['daily', 'weekly'].includes(type)) {
      return reply.status(400).send({ error: 'type must be daily or weekly' });
    }
    await generateAndSaveDigest(tenantId, type);
    return reply.send({ ok: true });
  });

  // GET /admin/diario/preview — preview without saving
  app.get('/admin/diario/preview', async (req, reply) => {
    const tenantId = (req as any).tenantId || process.env.DEFAULT_TENANT_ID || 'edro';
    const { type = 'daily' } = req.query as { type?: string };
    const content = type === 'weekly'
      ? await buildWeeklyDigest(tenantId)
      : await buildDailyDigest(tenantId);
    return reply.send({ type, content });
  });
}
