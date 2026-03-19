import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../auth/rbac';
import {
  addCompetitor,
  listCompetitors,
  analyzeClientCompetitors,
} from '../services/competitorIntelligence';
import { query } from '../db';

export default async function competitorsRoutes(app: FastifyInstance) {

  // GET /competitors?client_id=xxx — lista concorrentes do cliente
  app.get('/competitors', { preHandler: authGuard }, async (request: any, reply) => {
    const { client_id } = request.query as { client_id?: string };
    const tenantId = request.user?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });
    if (!client_id) return reply.status(400).send({ error: 'client_id obrigatório.' });

    const competitors = await listCompetitors(tenantId, client_id);
    return reply.send({ competitors });
  });

  // POST /competitors — adiciona concorrente ao cliente
  app.post('/competitors', { preHandler: authGuard }, async (request: any, reply) => {
    const bodySchema = z.object({
      client_id: z.string(),
      handle: z.string().min(1).max(100),
      platform: z.enum(['instagram', 'linkedin', 'tiktok', 'twitter']),
      display_name: z.string().optional(),
    });

    const body = bodySchema.parse(request.body);
    const tenantId = request.user?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

    const profile = await addCompetitor({
      tenantId,
      clientId: body.client_id,
      handle: body.handle,
      platform: body.platform,
      displayName: body.display_name,
    });

    return reply.status(201).send({ competitor: profile });
  });

  // DELETE /competitors/:id — desativa concorrente
  app.delete('/competitors/:id', { preHandler: authGuard }, async (request: any, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

    await query(
      `UPDATE competitor_profiles SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId],
    );

    return reply.send({ ok: true });
  });

  // POST /competitors/analyze — dispara análise de todos os concorrentes do cliente
  app.post('/competitors/analyze', { preHandler: authGuard }, async (request: any, reply) => {
    const bodySchema = z.object({
      client_id: z.string(),
    });

    const { client_id } = bodySchema.parse(request.body);
    const tenantId = request.user?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

    // Load client name/segment
    const clientRes = await query<any>(
      `SELECT name, segment FROM clients WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [client_id, tenantId],
    );
    const client = clientRes.rows[0];
    if (!client) return reply.status(404).send({ error: 'Cliente não encontrado.' });

    // Run analysis (non-blocking so UI gets a fast response)
    analyzeClientCompetitors(tenantId, client_id, client.name, client.segment ?? '').catch(
      (err) => console.error('[competitors/analyze] Error:', err?.message),
    );

    return reply.send({ ok: true, message: 'Análise iniciada. Resultados disponíveis em instantes.' });
  });

  // GET /competitors/summary?client_id=xxx — resumo + diferenciação para o cliente
  app.get('/competitors/summary', { preHandler: authGuard }, async (request: any, reply) => {
    const { client_id } = request.query as { client_id?: string };
    const tenantId = request.user?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });
    if (!client_id) return reply.status(400).send({ error: 'client_id obrigatório.' });

    const clientRes = await query<any>(
      `SELECT name, segment FROM clients WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
      [client_id, tenantId],
    );
    const client = clientRes.rows[0];
    if (!client) return reply.status(404).send({ error: 'Cliente não encontrado.' });

    const summary = await analyzeClientCompetitors(tenantId, client_id, client.name, client.segment ?? '');
    return reply.send({ summary });
  });

  // GET /competitors/:id/posts — posts coletados de um concorrente
  app.get('/competitors/:id/posts', { preHandler: authGuard }, async (request: any, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

    const postsRes = await query<any>(
      `SELECT cp.id, cp.content, cp.platform, cp.published_at,
              cp.likes, cp.comments, cp.shares, cp.engagement_rate,
              cp.detected_amd, cp.detected_triggers, cp.emotional_tone,
              cp.dark_social_potential, cp.analyzed_at
       FROM competitor_posts cp
       JOIN competitor_profiles pr ON pr.id = cp.competitor_profile_id
       WHERE cp.competitor_profile_id = $1 AND pr.tenant_id = $2
       ORDER BY cp.published_at DESC
       LIMIT 30`,
      [id, tenantId],
    );

    return reply.send({ posts: postsRes.rows });
  });
}
