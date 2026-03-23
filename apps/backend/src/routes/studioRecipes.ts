import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { query } from '../db/db';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';

const saveSchema = z.object({
  name:          z.string().min(1).max(120),
  client_id:     z.string().uuid().optional().nullable(),
  objective:     z.string().optional().nullable(),
  platform:      z.string().optional().nullable(),
  format:        z.string().optional().nullable(),
  pipeline_type: z.string().default('standard'),
  trigger_id:    z.string().optional().nullable(),
  provider:      z.string().optional().nullable(),
  model:         z.string().optional().nullable(),
  tone_notes:    z.string().optional().nullable(),
});

export default async function studioRecipesRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());
  app.addHook('preHandler', requirePerm('library:read'));

  // ── Save a recipe ──────────────────────────────────────────────────────────
  app.post('/studio/recipes', { preHandler: [requirePerm('library:write')] }, async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const body = saveSchema.parse(request.body);

    // Auto-generate name if empty
    const parts = [body.platform, body.format, body.objective].filter(Boolean);
    const name = body.name || parts.join(' — ') || 'Receita';

    const { rows } = await query(
      `INSERT INTO creative_recipes
         (tenant_id, client_id, name, objective, platform, format,
          pipeline_type, trigger_id, provider, model, tone_notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        tenantId,
        body.client_id ?? null,
        name,
        body.objective ?? null,
        body.platform ?? null,
        body.format ?? null,
        body.pipeline_type,
        body.trigger_id ?? null,
        body.provider ?? null,
        body.model ?? null,
        body.tone_notes ?? null,
      ]
    );
    return reply.send({ success: true, data: rows[0] });
  });

  // ── List recipes (with optional filters) ──────────────────────────────────
  app.get('/studio/recipes', async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const { client_id, platform, format, objective, limit = 20 } = request.query as Record<string, string>;

    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let idx = 2;

    if (client_id) { conditions.push(`(client_id = $${idx} OR client_id IS NULL)`); params.push(client_id); idx++; }
    if (platform)  { conditions.push(`platform ILIKE $${idx}`); params.push(`%${platform}%`); idx++; }
    if (format)    { conditions.push(`format ILIKE $${idx}`);   params.push(`%${format}%`);   idx++; }
    if (objective) { conditions.push(`objective ILIKE $${idx}`); params.push(`%${objective}%`); idx++; }

    const { rows } = await query(
      `SELECT * FROM creative_recipes
       WHERE ${conditions.join(' AND ')}
       ORDER BY use_count DESC, last_used_at DESC NULLS LAST, created_at DESC
       LIMIT $${idx}`,
      [...params, Number(limit)]
    );
    return reply.send({ success: true, data: rows });
  });

  // ── Increment use_count when a recipe is applied ───────────────────────────
  app.post('/studio/recipes/:id/use', { preHandler: [requirePerm('library:write')] }, async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const { id } = request.params as { id: string };

    await query(
      `UPDATE creative_recipes
       SET use_count = use_count + 1, last_used_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    return reply.send({ success: true });
  });

  // ── Delete a recipe ────────────────────────────────────────────────────────
  app.delete('/studio/recipes/:id', { preHandler: [requirePerm('library:write')] }, async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const { id } = request.params as { id: string };

    await query(
      `DELETE FROM creative_recipes WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );
    return reply.send({ success: true });
  });
}
