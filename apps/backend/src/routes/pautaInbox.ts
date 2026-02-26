import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { query } from '../db';
import { createBriefing, createBriefingStages } from '../repositories/edroBriefingRepository';
import { recordPreferenceFeedback } from '../services/preferenceEngine';
import { generatePautaSuggestions } from '../services/pautaSuggestionService';

const approveSchema = z.object({
  approach: z.enum(['A', 'B']).default('A'),
});

const rejectSchema = z.object({
  tags: z.array(z.string()).optional(),
  reason: z.string().max(2000).optional(),
});

const generateSchema = z.object({
  client_id: z.string().min(1),
  title: z.string().min(3),
  source_type: z.string().optional(),
  source_id: z.string().optional(),
  source_domain: z.string().optional(),
  source_text: z.string().optional(),
  topic_category: z.string().optional(),
  ai_score: z.number().optional(),
  suggested_deadline: z.string().optional(),
  platforms: z.array(z.string()).optional(),
  approach_a: z.record(z.any()).optional(),
  approach_b: z.record(z.any()).optional(),
});

function asApproach(payload: any, approach: 'A' | 'B') {
  return approach === 'A' ? payload?.approach_a : payload?.approach_b;
}

export default async function pautaInboxRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.post(
    '/pauta-inbox/generate',
    { preHandler: [requirePerm('clients:write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const body = generateSchema.parse(request.body || {});

      // If caller provides both approaches (pre-computed), save directly
      if (body.approach_a && body.approach_b) {
        const now = new Date().toISOString().slice(0, 10);
        const { rows } = await query<any>(
          `
          INSERT INTO pauta_suggestions (
            tenant_id, client_id, title,
            approach_a, approach_b,
            source_type, source_id, source_domain, source_text,
            ai_score, topic_category, suggested_deadline, platforms
          ) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10,$11,$12,$13)
          RETURNING *
          `,
          [
            tenantId, body.client_id, body.title,
            JSON.stringify(body.approach_a), JSON.stringify(body.approach_b),
            body.source_type || 'manual', body.source_id || null,
            body.source_domain || null, body.source_text || null,
            body.ai_score ?? null, body.topic_category || null,
            body.suggested_deadline || now, body.platforms || null,
          ]
        );
        return reply.send({ ok: true, item: rows[0] });
      }

      // Otherwise: trigger AI generation via pautaSuggestionService (async, respond immediately)
      reply.send({ ok: true, queued: true });

      // Fire-and-forget AI generation
      setImmediate(() => {
        generatePautaSuggestions({
          client_id: body.client_id,
          tenant_id: tenantId,
          sources: [{
            type: body.source_type || 'manual',
            id: body.source_id || `manual_${Date.now()}`,
            title: body.title,
            summary: body.source_text || body.title,
            domain: body.source_domain || undefined,
            score: body.ai_score,
          }],
        }).catch((err: any) => {
          console.error('[pautaInbox/generate] AI generation failed:', err?.message);
        });
      });
    }
  );

  app.get(
    '/pauta-inbox',
    { preHandler: [requirePerm('clients:read')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const clientId = String((request.query as any)?.client_id || '').trim();
      const status = String((request.query as any)?.status || 'pending').trim();
      const values: any[] = [tenantId];
      const where: string[] = ['ps.tenant_id=$1'];

      if (status && status !== 'all') {
        values.push(status);
        where.push(`ps.status=$${values.length}`);
      }
      if (clientId) {
        values.push(clientId);
        where.push(`ps.client_id=$${values.length}`);
      }

      const { rows } = await query<any>(
        `
        SELECT
          ps.*,
          c.name as client_name,
          c.segment_primary as client_segment
        FROM pauta_suggestions ps
        JOIN clients c ON c.id = ps.client_id AND c.tenant_id = ps.tenant_id
        WHERE ${where.join(' AND ')}
        ORDER BY ps.generated_at DESC
        LIMIT 200
        `,
        values
      );

      return reply.send({ items: rows });
    }
  );

  app.post(
    '/pauta-inbox/:id/approve',
    { preHandler: [requirePerm('clients:write')] },
    async (request: any, reply) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = approveSchema.parse(request.body || {});
      const tenantId = (request.user as any).tenant_id;
      const user = request.user as any;

      const { rows } = await query<any>(
        `SELECT * FROM pauta_suggestions WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [id, tenantId]
      );
      const suggestion = rows[0];
      if (!suggestion) return reply.status(404).send({ error: 'suggestion_not_found' });
      if (suggestion.status !== 'pending') {
        return reply.status(409).send({ error: 'suggestion_not_pending' });
      }

      const selected = asApproach(suggestion, body.approach);
      if (!selected || typeof selected !== 'object') {
        return reply.status(400).send({ error: 'invalid_approach' });
      }

      const title = String(selected?.title || suggestion.title || 'Nova pauta');
      const message = String(selected?.message || selected?.angle || suggestion.source_text || '');
      const objective = String(selected?.objective || 'Reconhecimento de Marca');
      const tone = String(selected?.tone || 'Profissional');
      const platforms = Array.isArray(selected?.platforms)
        ? selected.platforms
        : Array.isArray(suggestion?.platforms)
          ? suggestion.platforms
          : [];

      const briefing = await createBriefing({
        clientId: suggestion.client_id,
        title,
        source: suggestion.source_type || 'pauta_inbox',
        payload: {
          objective,
          tone,
          message,
          event: suggestion.title,
          date: suggestion.suggested_deadline || null,
          source: suggestion.source_type || 'pauta_inbox',
          sourceId: suggestion.source_id || suggestion.id,
          sourceDomain: suggestion.source_domain || null,
          channels: platforms,
          approach: body.approach,
        },
        createdBy: user?.email || user?.sub || null,
      });
      await createBriefingStages(briefing.id, user?.email || user?.sub || null);

      await recordPreferenceFeedback({
        tenantId,
        clientId: suggestion.client_id,
        payload: {
          feedback_type: 'pauta',
          action: 'approved',
          pauta_id: suggestion.id,
          pauta_source_type: suggestion.source_type || null,
          pauta_source_domain: suggestion.source_domain || null,
          pauta_topic_category: suggestion.topic_category || null,
          pauta_approach: body.approach === 'A' ? 'approach_a' : 'approach_b',
          pauta_platforms: platforms,
          pauta_ai_score: suggestion.ai_score != null ? Number(suggestion.ai_score) : undefined,
          created_by: user?.email || user?.sub || null,
        },
      });

      const oppositeApproach = body.approach === 'A' ? 'approach_b' : 'approach_a';
      await recordPreferenceFeedback({
        tenantId,
        clientId: suggestion.client_id,
        payload: {
          feedback_type: 'pauta',
          action: 'rejected',
          pauta_id: suggestion.id,
          pauta_source_type: suggestion.source_type || null,
          pauta_source_domain: suggestion.source_domain || null,
          pauta_topic_category: suggestion.topic_category || null,
          pauta_approach: oppositeApproach,
          pauta_platforms: Array.isArray(suggestion.platforms) ? suggestion.platforms : undefined,
          pauta_ai_score: suggestion.ai_score != null ? Number(suggestion.ai_score) : undefined,
          created_by: user?.email || user?.sub || null,
        },
      });

      await query(
        `
        UPDATE pauta_suggestions
        SET status='approved',
            reviewed_at=NOW(),
            briefing_id=$2
        WHERE id=$1 AND tenant_id=$3
        `,
        [id, briefing.id, tenantId]
      );

      return reply.send({ ok: true, briefing_id: briefing.id });
    }
  );

  app.post(
    '/pauta-inbox/:id/reject',
    { preHandler: [requirePerm('clients:write')] },
    async (request: any, reply) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = rejectSchema.parse(request.body || {});
      const tenantId = (request.user as any).tenant_id;
      const user = request.user as any;

      const { rows } = await query<any>(
        `SELECT * FROM pauta_suggestions WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [id, tenantId]
      );
      const suggestion = rows[0];
      if (!suggestion) return reply.status(404).send({ error: 'suggestion_not_found' });
      if (suggestion.status !== 'pending') {
        return reply.status(409).send({ error: 'suggestion_not_pending' });
      }

      await recordPreferenceFeedback({
        tenantId,
        clientId: suggestion.client_id,
        payload: {
          feedback_type: 'pauta',
          action: 'rejected',
          pauta_id: suggestion.id,
          pauta_source_type: suggestion.source_type || null,
          pauta_source_domain: suggestion.source_domain || null,
          pauta_topic_category: suggestion.topic_category || null,
          pauta_approach: 'comparison_pair',
          pauta_platforms: Array.isArray(suggestion.platforms) ? suggestion.platforms : undefined,
          pauta_ai_score: suggestion.ai_score != null ? Number(suggestion.ai_score) : undefined,
          rejection_tags: body.tags,
          rejection_reason: body.reason,
          created_by: user?.email || user?.sub || null,
        },
      });

      await query(
        `
        UPDATE pauta_suggestions
        SET status='rejected', reviewed_at=NOW()
        WHERE id=$1 AND tenant_id=$2
        `,
        [id, tenantId]
      );

      return reply.send({ ok: true });
    }
  );
}
