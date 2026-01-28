import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { getClientById } from '../repos/clientsRepo';
import { EnxovalRecommendationService } from '../recommendation/EnxovalRecommendationService';
import { getRecommendationCatalogStats, loadRecommendationCatalog } from '../recommendation/catalogAdapter';

const requestSchema = z.object({
  briefing_text: z.string().min(1),
  structured_params: z.record(z.any()).optional(),
  objective: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  production_type: z.string().optional(),
  budget_total: z.number().optional(),
  budget_currency: z.string().optional(),
  deadline: z.string().optional(),
  client_id: z.string().optional(),
  client_name: z.string().optional(),
});

const objectiveMap: Record<string, 'awareness' | 'consideration' | 'conversion' | 'retention'> = {
  awareness: 'awareness',
  alcance: 'awareness',
  reconhecimento: 'awareness',
  consideration: 'consideration',
  consideracao: 'consideration',
  conversao: 'conversion',
  conversion: 'conversion',
  performance: 'conversion',
  retention: 'retention',
  retencao: 'retention',
};

const productionTypeMap: Record<string, string> = {
  'midia on': 'midia-on',
  'midia-on': 'midia-on',
  'midia off': 'midia-off',
  'midia-off': 'midia-off',
  eventos: 'eventos-ativacoes',
  'eventos e ativacoes': 'eventos-ativacoes',
  'eventos-ativacoes': 'eventos-ativacoes',
  'eventos_ativacoes': 'eventos-ativacoes',
};

function normalizeObjective(value?: string | null) {
  const key = String(value || '').trim().toLowerCase();
  return objectiveMap[key];
}

function normalizeProductionType(value?: string | null) {
  const key = String(value || '').trim().toLowerCase();
  return productionTypeMap[key] || value || '';
}

const cachedService = new EnxovalRecommendationService(loadRecommendationCatalog());

export default async function recommendationRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.get(
    '/recommendations/catalog-stats',
    { preHandler: [requirePerm('calendars:read')] },
    async () => getRecommendationCatalogStats()
  );

  app.post(
    '/recommendations/enxoval',
    { preHandler: [requirePerm('calendars:read')] },
    async (request, reply) => {
      const body = requestSchema.parse(request.body);
      const tenantId = (request.user as any)?.tenant_id;

      const structured: Record<string, any> = { ...(body.structured_params || {}) };
      const objective = normalizeObjective(body.objective) || structured.campaign_objective;
      if (objective) structured.campaign_objective = objective;

      if (body.platforms || body.production_type) {
        structured.channels = { ...(structured.channels || {}) };
        if (body.platforms) structured.channels.platforms = body.platforms;
        if (body.production_type) {
          structured.channels.production_types = [normalizeProductionType(body.production_type)];
        }
      }

      if (body.budget_total != null) {
        structured.budget = {
          ...(structured.budget || {}),
          total: body.budget_total,
          currency: body.budget_currency || structured.budget?.currency || 'BRL',
          flexibility: structured.budget?.flexibility || 'flexible',
        };
      }

      if (body.deadline) {
        structured.timeline = {
          ...(structured.timeline || {}),
          deadline: body.deadline,
          urgency: structured.timeline?.urgency || 'medium',
        };
      }

      let client: any = null;
      if (tenantId && body.client_id) {
        client = await getClientById(tenantId, body.client_id);
        if (client?.segment_primary && !structured.context?.industry) {
          structured.context = { ...(structured.context || {}), industry: client.segment_primary };
        }
      }

      const recommendation = await cachedService.generateRecommendation({
        text: body.briefing_text,
        structured,
        client_id: body.client_id,
        tenant_id: tenantId ?? null,
      });

      return reply.send({
        ...recommendation,
        client: client
          ? {
              id: client.id,
              name: client.name,
              segment_primary: client.segment_primary,
            }
          : body.client_name
            ? { id: null, name: body.client_name }
            : null,
      });
    }
  );
}
