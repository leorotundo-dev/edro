import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { JobService } from '../services/jobService';
import { getOrCreateCustomEdital } from '../services/studyPackService';
import { UserSourcesService } from '../services/userSourcesService';

export default async function studyRequestsRoutes(app: FastifyInstance) {
  app.post(
    '/study-requests',
    async (
      request: FastifyRequest<{
        Body: { topic?: string; level?: string; user_id?: string; source_ids?: string[] };
      }>,
      reply: FastifyReply
    ) => {
      try {
        const topic = String(request.body?.topic || '').trim();
        const level = request.body?.level ? String(request.body.level).trim() : undefined;
        const userId = request.body?.user_id || (request as any).user?.id || (request as any).user?.sub;

        if (!userId) {
          return reply.status(401).send({ success: false, error: 'Usuario nao autenticado' });
        }

        if (!topic || topic.length < 3) {
          return reply.status(400).send({ success: false, error: 'Tema invalido' });
        }

        if (process.env.ENABLE_WORKERS !== 'true') {
          return reply.status(400).send({
            success: false,
            error: 'Workers desabilitados. Defina ENABLE_WORKERS=true para gerar estudos.',
          });
        }

        const { editalId } = await getOrCreateCustomEdital({ userId, topic });
        const sourceIds = Array.isArray(request.body?.source_ids)
          ? request.body?.source_ids.filter(Boolean)
          : undefined;
        if (sourceIds && sourceIds.length) {
          await Promise.all(
            sourceIds.map((sourceId) =>
              UserSourcesService.updateUserSource({
                id: sourceId,
                userId,
                patch: { editalId },
              })
            )
          );
        }

        const jobId = await JobService.createJob({
          name: `Build study pack ${editalId} ${Date.now()}`,
          type: 'build_study_pack',
          data: {
            editalId,
            userId,
            topic,
            level,
            sourceIds,
          },
          priority: 8,
          maxAttempts: 1,
        });

        return reply.status(202).send({
          success: true,
          data: {
            edital_id: editalId,
            job_id: jobId,
          },
        });
      } catch (error) {
        console.error('Erro ao criar study request:', error);
        return reply.status(500).send({ success: false, error: 'Erro ao criar estudo' });
      }
    }
  );
}
