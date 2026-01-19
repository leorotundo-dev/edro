import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createDrop, listDrops, findDropById, updateDropStatus } from '../repositories/dropRepository';
import { query } from '../db';

export default async function dropsRoutes(app: FastifyInstance) {
  app.get('/drops', async (req, reply) => {
    try {
      const userId = (req as any).user?.id || (req as any).user?.sub;
      if (!userId) {
        return reply.status(401).send({ success: false, error: 'Usuario nao autenticado' });
      }

      const {
        origin,
        edital_id,
        status,
        limit = '50',
        offset = '0',
      } = req.query as {
        origin?: string;
        edital_id?: string;
        status?: string;
        limit?: string;
        offset?: string;
      };

      const parsedLimit = Math.min(200, Math.max(1, Number.parseInt(String(limit), 10) || 50));
      const parsedOffset = Math.max(0, Number.parseInt(String(offset), 10) || 0);

      const clauses: string[] = ['origin_user_id = $1'];
      const values: any[] = [userId];

      if (origin) {
        values.push(origin);
        clauses.push(`origin = $${values.length}`);
      }
      if (status) {
        values.push(status);
        clauses.push(`status = $${values.length}`);
      }
      if (edital_id) {
        values.push(edital_id);
        clauses.push(`(origin_meta->>'edital_id' = $${values.length} OR origin_meta->>'editalId' = $${values.length})`);
      }

      values.push(parsedLimit);
      values.push(parsedOffset);

      const { rows } = await query(
        `
          SELECT *
          FROM drops
          WHERE ${clauses.join(' AND ')}
          ORDER BY created_at DESC
          LIMIT $${values.length - 1}
          OFFSET $${values.length}
        `,
        values
      );

      return reply.send({ success: true, data: rows });
    } catch (err) {
      console.error('[drops] Erro ao listar drops do usuario:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao listar drops',
      });
    }
  });

  app.get('/admin/drops', async (req, reply) => {
    try {
      const { status, origin, discipline_id } = req.query as {
        status?: string;
        origin?: string;
        discipline_id?: string;
      };
      const drops = await listDrops({
        disciplineId: discipline_id,
        status,
        origin,
      });
      return { success: true, items: drops };
    } catch (err) {
      console.error('[admin-drops] Erro:', err);
      return reply.status(500).send({ success: false, error: err instanceof Error ? err.message : 'Erro ao listar drops' });
    }
  });

  app.get('/admin/drops/:id', async (req, reply) => {
    try {
      const { id } = req.params as { id: string };

      console.log(`[admin-drops] Buscando drop: id=${id}`);

      const drop = await findDropById(id);

      if (!drop) {
        return reply.status(404).send({
          success: false,
          error: 'Drop nao encontrado'
        });
      }

      return { success: true, data: drop };
    } catch (err) {
      console.error('[admin-drops] Erro ao buscar drop:', err);
      return reply.status(500).send({
        success: false,
        error: err instanceof Error ? err.message : 'Erro ao buscar drop'
      });
    }
  });

  app.post('/admin/drops', async (request, reply) => {
    const bodySchema = z.object({
      discipline_id: z.string().uuid(),
      title: z.string().min(3),
      content: z.string().min(10),
      difficulty: z.number().int().min(1).max(5).optional(),
      topic_code: z.string().optional(),
      drop_type: z.string().optional(),
      drop_text: z.string().optional(),
      blueprint_id: z.number().int().optional(),
      status: z.enum(['draft', 'published', 'archived']).optional(),
      origin: z.string().optional()
    });
    const body = bodySchema.parse(request.body);
    const drop = await createDrop({
      discipline_id: body.discipline_id,
      title: body.title,
      content: body.content,
      difficulty: body.difficulty || 1,
      topic_code: body.topic_code ?? null,
      drop_type: body.drop_type ?? null,
      drop_text: body.drop_text ?? null,
      blueprint_id: body.blueprint_id ?? null,
      status: body.status,
      origin: body.origin
    });
    return reply.status(201).send({ drop });
  });

  app.patch('/admin/drops/:id/status', async (request, reply) => {
    const anyReq: any = request;
    const { id } = request.params as { id: string };
    const bodySchema = z.object({
      status: z.enum(['draft', 'published', 'archived'])
    });
    const body = bodySchema.parse(request.body);
    const userId = (anyReq.user as { sub?: string; id?: string } | undefined)?.sub
      || (anyReq.user as { sub?: string; id?: string } | undefined)?.id
      || null;

    const updated = await updateDropStatus({
      id,
      status: body.status,
      approvedBy: userId
    });

    if (!updated) {
      return reply.status(404).send({ success: false, error: 'Drop nao encontrado' });
    }

    return reply.send({ success: true, data: updated });
  });
}
