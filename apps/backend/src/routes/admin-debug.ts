import { FastifyInstance } from 'fastify';
import { query } from '../db';

interface BlueprintRow {
  id: number;
  harvest_item_id: number | null;
  banca: string | null;
  cargo: string | null;
  disciplina: string | null;
  created_at: string;
}

interface BlueprintDetailRow extends BlueprintRow {
  blueprint: any;
}

interface DropRow {
  id: number;
  blueprint_id: number | null;
  topic_code: string | null;
  drop_type: string | null;
  difficulty: number | null;
  drop_text: any;
  created_at: string;
}

/**
 * Rotas de Debug e Gerenciamento (IA desabilitada neste deploy)
 */
export async function adminDebugRoutes(app: FastifyInstance) {
  // Blueprints list
  app.get('/admin/debug/blueprints', async (req, reply) => {
    try {
      const { limit = '50', offset = '0' } = req.query as {
        limit?: string;
        offset?: string;
      };

      const parsedLimit = Math.min(parseInt(limit, 10) || 50, 200);
      const parsedOffset = parseInt(offset, 10) || 0;

      const { rows } = await query<BlueprintRow>(
        `
        SELECT
          id,
          harvest_item_id,
          banca,
          cargo,
          disciplina,
          created_at
        FROM exam_blueprints
        ORDER BY id DESC
        LIMIT $1 OFFSET $2
        `,
        [parsedLimit, parsedOffset]
      );

      return { success: true, items: rows };
    } catch (err) {
      console.error('[admin-debug] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao listar blueprints'
      });
    }
  });

  // Blueprint detail
  app.get('/admin/debug/blueprints/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      const { rows } = await query<BlueprintDetailRow>(
        `
        SELECT
          id,
          harvest_item_id,
          banca,
          cargo,
          disciplina,
          blueprint,
          created_at
        FROM exam_blueprints
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      );

      if (rows.length === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Blueprint não encontrado'
        });
      }

      return { success: true, data: rows[0] };
    } catch (err) {
      console.error('[admin-debug] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao detalhar blueprint'
      });
    }
  });

  // Drops list
  app.get('/admin/debug/drops', async (req, reply) => {
    try {
      const { blueprintId, topicCode, limit = '50' } = req.query as {
        blueprintId?: string;
        topicCode?: string;
        limit?: string;
      };

      const parsedLimit = Math.min(parseInt(limit, 10) || 50, 200);

      const conditions: string[] = [];
      const params: any[] = [];
      let idx = 1;

      if (blueprintId) {
        conditions.push(`blueprint_id = $${idx++}`);
        params.push(parseInt(blueprintId, 10));
      }

      if (topicCode) {
        conditions.push(`topic_code = $${idx++}`);
        params.push(topicCode);
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const { rows } = await query<DropRow>(
        `
        SELECT
          id,
          blueprint_id,
          topic_code,
          drop_type,
          difficulty,
          drop_text,
          created_at
        FROM drops
        ${whereClause}
        ORDER BY id DESC
        LIMIT $${idx}
        `,
        [...params, parsedLimit]
      );

      return { success: true, items: rows };
    } catch (err) {
      console.error('[admin-debug] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao listar drops'
      });
    }
  });

  // IA preview disabled
  app.post('/admin/debug/generate-drops-preview', async (_req, reply) => {
    return reply.status(503).send({
      success: false,
      error: 'IA pipelines indisponíveis neste deploy'
    });
  });
}

export async function adminBlueprintsRoutes(app: FastifyInstance) {
  app.get('/admin/blueprints', async (req, reply) => {
    try {
      const { limit = '50', offset = '0' } = req.query as {
        limit?: string;
        offset?: string;
      };

      const parsedLimit = Math.min(parseInt(limit, 10) || 50, 200);
      const parsedOffset = parseInt(offset, 10) || 0;

      const { rows } = await query<BlueprintRow>(
        `
        SELECT
          id,
          harvest_item_id,
          banca,
          cargo,
          disciplina,
          created_at
        FROM exam_blueprints
        ORDER BY id DESC
        LIMIT $1 OFFSET $2
        `,
        [parsedLimit, parsedOffset]
      );

      return { success: true, items: rows };
    } catch (err) {
      console.error('[admin-blueprints] Erro:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao listar blueprints'
      });
    }
  });
}
