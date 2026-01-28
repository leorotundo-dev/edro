import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { hasClientPerm } from '../auth/clientPerms';
import { TrendEnricher } from '../integration/TrendEnricher';
import { PerformanceScorer } from '../integration/PerformanceScorer';
import { ContextualRecommender } from '../integration/ContextualRecommender';

const briefingSchema = z.object({
  objetivo: z.string().trim().min(3).or(z.literal('')).default(''),
  publico: z.string().optional().default(''),
  plataformas: z.array(z.string()).optional().default([]),
  budget: z.number().optional().default(0),
  keywords: z.array(z.string()).optional(),
  clientId: z.string().optional(),
});

const candidatesSchema = z.object({
  candidates: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      platform: z.string(),
      originalScore: z.number(),
      category: z.string().optional(),
    })
  ),
  keywords: z.array(z.string()).optional().default([]),
  clientId: z.string().optional(),
});

const contextualSchema = z.object({
  scoredFormats: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      platform: z.string(),
      originalScore: z.number(),
      performanceScore: z.number(),
      finalScore: z.number(),
      boost: z.number(),
      category: z.string().optional(),
      performanceData: z.object({
        sentiment: z.number(),
        engagementRate: z.number(),
        virality: z.number(),
        sampleSize: z.number(),
      }),
    })
  ),
  enrichedBriefing: briefingSchema.extend({
    enrichedData: z.any(),
  }),
  clientId: z.string().optional(),
});

const performanceInsightsSchema = z.object({
  platform: z.string(),
  category: z.string().optional().default(''),
  keywords: z.array(z.string()).optional().default([]),
  clientId: z.string().optional(),
});

async function assertClientAccess(request: any, clientId: string, perm: 'read' | 'write') {
  const tenantId = request.user?.tenant_id;
  const userId = request.user?.sub;
  const role = request.user?.role;
  if (!tenantId || !userId) return false;

  return hasClientPerm({
    tenantId,
    userId,
    role,
    clientId,
    perm,
  });
}

export default async function integrationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.post(
    '/integration/enrich-briefing',
    { preHandler: [requirePerm('calendars:read')] },
    async (request: any, reply) => {
      const body = briefingSchema.parse(request.body || {});
      if (body.clientId) {
        const allowed = await assertClientAccess(request, body.clientId, 'read');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const enricher = new TrendEnricher(request.user.tenant_id);
      const enriched = await enricher.enrichBriefing(body, { clientId: body.clientId });
      return reply.send(enriched);
    }
  );

  app.post(
    '/integration/score-formats',
    { preHandler: [requirePerm('calendars:read')] },
    async (request: any, reply) => {
      const body = candidatesSchema.parse(request.body || {});
      if (body.clientId) {
        const allowed = await assertClientAccess(request, body.clientId, 'read');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const scorer = new PerformanceScorer(request.user.tenant_id);
      const scored = await scorer.scoreFormats(body.candidates, body.keywords, { clientId: body.clientId });
      return reply.send({ scored });
    }
  );

  app.post(
    '/integration/contextual-recommendations',
    { preHandler: [requirePerm('calendars:read')] },
    async (request: any, reply) => {
      const body = contextualSchema.parse(request.body || {});
      if (body.clientId) {
        const allowed = await assertClientAccess(request, body.clientId, 'read');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const recommender = new ContextualRecommender(request.user.tenant_id);
      const recommendations = await recommender.generateRecommendations(
        body.scoredFormats,
        body.enrichedBriefing,
        { clientId: body.clientId }
      );
      return reply.send({ recommendations });
    }
  );

  app.post(
    '/integration/performance-insights',
    { preHandler: [requirePerm('calendars:read')] },
    async (request: any, reply) => {
      const body = performanceInsightsSchema.parse(request.body || {});
      if (body.clientId) {
        const allowed = await assertClientAccess(request, body.clientId, 'read');
        if (!allowed) return reply.status(403).send({ error: 'client_forbidden' });
      }

      const scorer = new PerformanceScorer(request.user.tenant_id);
      const insights = await scorer.getPerformanceInsights(
        body.platform,
        body.category || '',
        body.keywords,
        { clientId: body.clientId }
      );
      return reply.send(insights);
    }
  );
}
