import { FastifyInstance } from 'fastify';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { fetchMetaAdsCampaigns } from '../services/integrations/metaAdsService';
import { fetchGoogleAnalyticsReport } from '../services/integrations/googleAnalyticsService';
import { syncMetaPerformanceForClient } from '../services/integrations/metaSyncService';

export default async function integrationDataRoutes(app: FastifyInstance) {
  // Fetch Meta Ads data for a client
  app.get('/clients/:clientId/integrations/meta-ads', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:read')],
  }, async (request: any, reply: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };

    try {
      const data = await fetchMetaAdsCampaigns(tenantId, clientId);
      return data;
    } catch (err: any) {
      if (err.message?.includes('not_configured') || err.message?.includes('no_credentials')) {
        return reply.status(404).send({ error: err.message });
      }
      return reply.status(502).send({ error: err.message });
    }
  });

  // ── Sync Meta post-level metrics → format_performance_metrics + LearningEngine
  app.post('/clients/:clientId/integrations/sync-meta-performance', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:write')],
  }, async (request: any, reply: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };
    try {
      const result = await syncMetaPerformanceForClient(tenantId, clientId);
      return reply.send({ success: true, ...result });
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err.message });
    }
  });

  // Fetch Google Analytics data for a client
  app.get('/clients/:clientId/integrations/google-analytics', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:read')],
  }, async (request: any, reply: any) => {
    const tenantId = request.user.tenant_id;
    const { clientId } = request.params as { clientId: string };
    const { from, to } = request.query as { from?: string; to?: string };

    try {
      const data = await fetchGoogleAnalyticsReport(tenantId, clientId, from, to);
      return data;
    } catch (err: any) {
      if (err.message?.includes('not_configured') || err.message?.includes('no_credentials')) {
        return reply.status(404).send({ error: err.message });
      }
      return reply.status(502).send({ error: err.message });
    }
  });
}
