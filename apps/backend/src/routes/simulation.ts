import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../auth/rbac';
import { runSimulation, loadSimulationResult } from '../services/campaignSimulator/simulationReport';

const variantSchema = z.object({
  index: z.number().int().min(0),
  text: z.string().min(10).max(5000),
  amd: z.string().optional(),
  triggers: z.array(z.string()).optional(),
  fogg_motivation: z.number().min(1).max(10).optional(),
  fogg_ability: z.number().min(1).max(10).optional(),
  fogg_prompt: z.number().min(1).max(10).optional(),
});

export default async function simulationRoutes(app: FastifyInstance) {

  // POST /simulation/preview — run simulation synchronously (< 500ms)
  app.post('/simulation/preview', { preHandler: authGuard }, async (request: any, reply) => {
    const bodySchema = z.object({
      client_id: z.string().optional(),
      campaign_id: z.string().uuid().optional(),
      platform: z.string().optional(),
      variants: z.array(variantSchema).min(1).max(5),
    });

    const body = bodySchema.parse(request.body);
    const tenantId = request.user?.tenant_id as string | undefined;

    if (!tenantId) return reply.status(401).send({ error: 'tenant_id ausente no token.' });

    try {
      const report = await runSimulation({
        tenantId,
        clientId: body.client_id,
        campaignId: body.campaign_id,
        platform: body.platform,
        variants: body.variants,
      });

      return reply.send({ ok: true, simulation: report });
    } catch (err: any) {
      return reply.status(500).send({ ok: false, error: err.message || 'Erro na simulação.' });
    }
  });

  // GET /simulation/:id — retrieve saved simulation result
  app.get('/simulation/:id', { preHandler: authGuard }, async (request: any, reply) => {
    const { id } = request.params as { id: string };
    const tenantId = request.user?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

    const result = await loadSimulationResult(id, tenantId);
    if (!result) return reply.status(404).send({ error: 'Simulação não encontrada.' });

    return reply.send({ simulation: result });
  });

  // GET /simulation — list recent simulations for tenant
  app.get('/simulation', { preHandler: authGuard }, async (request: any, reply) => {
    const { client_id } = request.query as { client_id?: string };
    const tenantId = request.user?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ error: 'Unauthorized' });

    const { pool } = await import('../db');
    const res = await pool.query(
      `SELECT id, client_id, platform, winner_index, winner_predicted_save_rate,
              winner_predicted_click_rate, winner_fatigue_days, cluster_count,
              rule_count, confidence_avg, created_at
       FROM simulation_results
       WHERE tenant_id = $1
         AND ($2::text IS NULL OR client_id::text = $2)
       ORDER BY created_at DESC
       LIMIT 20`,
      [tenantId, client_id ?? null],
    );

    return reply.send({ simulations: res.rows });
  });
}
