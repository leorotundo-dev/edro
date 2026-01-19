import { FastifyInstance } from 'fastify';
import { listBancas, findBancaBySlug } from '../repositories/bancaRepository';

export default async function bancasRoutes(app: FastifyInstance) {
  app.get('/bancas', async (request, reply) => {
    try {
      const { search, tipo, abrangencia, uf, limit } = request.query as {
        search?: string;
        tipo?: string;
        abrangencia?: string;
        uf?: string;
        limit?: string;
      };

      const bancas = await listBancas({
        search,
        tipo,
        abrangencia,
        uf,
        limit: limit ? Number(limit) : undefined,
      });

      return {
        success: true,
        data: bancas,
        total: bancas.length,
      };
    } catch (error) {
      console.error('[bancas] erro ao listar bancas:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao carregar bancas',
      });
    }
  });

  app.get('/bancas/:slug', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      const banca = await findBancaBySlug(slug);

      if (!banca) {
        return reply.status(404).send({
          success: false,
          error: 'Banca nao encontrada',
        });
      }

      return {
        success: true,
        data: banca,
      };
    } catch (error) {
      console.error('[bancas] erro ao buscar banca:', error);
      return reply.status(500).send({
        success: false,
        error: 'Erro ao buscar banca',
      });
    }
  });
}
