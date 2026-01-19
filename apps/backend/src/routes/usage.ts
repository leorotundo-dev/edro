import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { CreditsService } from '../services/creditsService';
import { UserSourcesService } from '../services/userSourcesService';

export default async function usageRoutes(app: FastifyInstance) {
  app.get('/usage', async (request: FastifyRequest, reply: FastifyReply) => {
    const anyReq: any = request;
    const userId = anyReq.user?.id || anyReq.user?.sub;
    if (!userId) {
      return reply.status(401).send({ success: false, error: 'Usuario nao autenticado' });
    }

    const usageSummary = await CreditsService.getUserUsageSummary(userId);
    const storageUsed = await UserSourcesService.getUserStorageUsageBytes(userId);

    return reply.send({
      success: true,
      data: {
        plan: usageSummary.plan,
        credits: usageSummary.credits,
        actions: usageSummary.actions,
        storage: {
          used_bytes: storageUsed,
          limit_mb: usageSummary.plan.storage_limit_mb ?? null,
          upload_limit_mb: usageSummary.plan.upload_limit_mb ?? null,
        },
      },
    });
  });
}
