/**
 * Multi-Format Campaign Asset Generation Routes
 *
 * POST /clients/:clientId/generate-campaign-assets
 *   Generates advertising assets in multiple formats from a concept + behavioral context.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { hasClientPerm } from '../auth/clientPerms';
import { pool } from '../db';
import { generateMultiFormatAssets, SupportedFormat } from '../services/ai/agentMultiFormat';

const SUPPORTED_FORMATS: SupportedFormat[] = [
  'radio_spot',
  'film_brief_30s',
  'email_marketing',
  'print_ad',
  'social_post',
];

const generateAssetsSchema = z.object({
  briefing_id: z.string().uuid().optional(),
  concept: z.string().min(10).max(2000),
  persona_id: z.string().optional(),
  campaign_phase: z.enum(['historia', 'prova', 'convite']).optional(),
  micro_behavior: z.string().optional(),
  triggers: z.array(z.string()).optional(),
  formats: z.array(z.enum(['radio_spot', 'film_brief_30s', 'email_marketing', 'print_ad', 'social_post'])).min(1).max(5),
});

export default async function multiFormatRoutes(app: FastifyInstance) {

  // ─── POST /clients/:clientId/generate-campaign-assets ─────────────────────
  app.post(
    '/clients/:clientId/generate-campaign-assets',
    { preHandler: [authGuard, requirePerm('clients:write')] },
    async (request: any, reply) => {
      const tenantId = request.user?.tenant_id as string;
      const { clientId } = request.params as { clientId: string };

      // Check client access
      const user = request.user as { sub?: string; role?: string };
      if ((user?.role || '').toLowerCase() !== 'admin') {
        const allowed = await hasClientPerm({
          tenantId,
          userId: user?.sub ?? '',
          role: user?.role,
          clientId,
          perm: 'write',
        });
        if (!allowed) {
          return reply.status(403).send({ error: 'client_forbidden' });
        }
      }

      // Validate body
      let body: z.infer<typeof generateAssetsSchema>;
      try {
        body = generateAssetsSchema.parse(request.body);
      } catch (err: any) {
        return reply.status(400).send({ error: 'invalid_body', details: err.errors });
      }

      // Load client info
      const clientRes = await pool.query(
        `SELECT id, name, segment FROM clients WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [clientId, tenantId]
      );
      const client = clientRes.rows[0];
      if (!client) {
        return reply.status(404).send({ error: 'client_not_found' });
      }

      // Optionally load persona
      let personaName: string | undefined;
      if (body.persona_id) {
        const personaRes = await pool.query(
          `SELECT name FROM personas WHERE id = $1 AND (client_id = $2 OR client_id IS NULL) LIMIT 1`,
          [body.persona_id, clientId]
        );
        personaName = personaRes.rows[0]?.name;
      }

      // Optionally load briefing context
      let concept = body.concept;
      if (body.briefing_id) {
        const briefingRes = await pool.query(
          `SELECT title, payload FROM edro_briefings WHERE id = $1 LIMIT 1`,
          [body.briefing_id]
        );
        const briefing = briefingRes.rows[0];
        if (briefing) {
          const payload = briefing.payload ?? {};
          concept = [
            `Briefing: ${briefing.title}`,
            payload.objective ? `Objetivo: ${payload.objective}` : null,
            payload.notes ? `Notas: ${payload.notes}` : null,
            `Conceito adicional: ${concept}`,
          ].filter(Boolean).join('\n');
        }
      }

      // Generate
      const result = await generateMultiFormatAssets({
        tenantId,
        clientId,
        concept,
        client_name: client.name,
        client_segment: client.segment,
        persona: personaName,
        campaign_phase: body.campaign_phase,
        micro_behavior: body.micro_behavior,
        triggers: body.triggers,
        formats: body.formats as SupportedFormat[],
      });

      return reply.send({
        success: true,
        data: {
          assets: result.assets,
          errors: Object.keys(result.errors).length ? result.errors : undefined,
          filed_to_kb: result.filed_to_kb,
          generated_count: Object.keys(result.assets).length,
          failed_count: Object.keys(result.errors).length,
        },
      });
    }
  );

  // ─── GET /clients/:clientId/generate-campaign-assets/formats ─────────────
  // Returns the list of supported formats
  app.get(
    '/clients/:clientId/generate-campaign-assets/formats',
    { preHandler: [authGuard] },
    async (_request: any, reply) => {
      return reply.send({
        success: true,
        data: {
          formats: SUPPORTED_FORMATS,
          descriptions: {
            radio_spot: 'Script de rádio de 30 segundos com marcações de tempo e direção de voz',
            film_brief_30s: 'Brief de filme de 30 segundos com descrição de cenas, VO e mood',
            email_marketing: 'Email marketing completo (assunto, preview, corpo, CTA)',
            print_ad: 'Anúncio impresso (headline, subheadline, body, tagline, CTA, direção de imagem)',
            social_post: 'Post para redes sociais (hook, corpo, CTA, hashtags)',
          },
        },
      });
    }
  );
}
