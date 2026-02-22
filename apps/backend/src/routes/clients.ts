import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import mime from 'mime-types';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requireClientPerm } from '../auth/clientPerms';
import { createClient, getClientById, updateClient, deleteClient, listClients } from '../repos/clientsRepo';
import { ClientIntelligenceService } from '../services/clientIntelligence';
import { syncReporteiInsightsForClient } from '../services/reporteiInsights';
import { syncRejectionPatternsToProfile } from '../services/rejectionPatternService';
import { getLatestClientInsight, listClientSources } from '../repos/clientIntelligenceRepo';
import { extractText } from '../library/extract';
import { OpenAIService } from '../services/ai/openaiService';
import { query } from '../db';
import { enqueueJob } from '../jobs/jobQueue';
import { tavilySearch, isTavilyConfigured } from '../services/tavilyService';
import { logTavilyUsage } from '../services/ai/aiUsageLogger';
import {
  applyFieldToProfile,
  calculateIntelligenceScore,
  type EnrichmentSection,
} from '../services/clientEnrichmentService';
import {
  getClientPreferenceContext,
  recordPreferenceFeedback,
} from '../services/preferenceEngine';

type PlanExtraction = {
  name?: string;
  segment_primary?: string;
  segment_secondary?: string[];
  country?: string;
  uf?: string;
  city?: string;
  website?: string;
  description?: string;
  audience?: string;
  brand_promise?: string;
  differentiators?: string;
  keywords?: string[];
  pillars?: string[];
  social_profiles?: Record<string, string>;
  notes?: string;
};

function safeJsonParse(text: string): Record<string, any> | null {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function normalizeString(value?: string | null) {
  const text = String(value || '').trim();
  return text || undefined;
}

function normalizeArray(value?: string[] | string | null) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  return String(value)
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSocials(value?: Record<string, any>) {
  if (!value) return undefined;
  const socialProfiles: Record<string, string> = {};
  for (const [key, raw] of Object.entries(value)) {
    const text = normalizeString(String(raw ?? ''));
    if (text) socialProfiles[key] = text;
  }
  return Object.keys(socialProfiles).length ? socialProfiles : undefined;
}

function detectMissingFields(payload: PlanExtraction) {
  const missing: string[] = [];
  const requiredKeys: Array<keyof PlanExtraction> = [
    'name',
    'segment_primary',
    'website',
    'description',
    'audience',
    'brand_promise',
    'differentiators',
  ];

  requiredKeys.forEach((key) => {
    if (!payload[key]) missing.push(key);
  });

  if (!payload.keywords?.length) missing.push('keywords');
  if (!payload.pillars?.length) missing.push('pillars');
  if (!payload.social_profiles || Object.keys(payload.social_profiles).length === 0) {
    missing.push('social_profiles');
  }

  return missing;
}

async function analyzePlanText(text: string): Promise<PlanExtraction> {
  const systemPrompt = `
Você é um analista estratégico. Extraia informações de um planejamento estratégico de cliente.
Responda SOMENTE em JSON válido (sem markdown) com as chaves:
name, segment_primary, segment_secondary (array), country, uf, city, website, description,
audience, brand_promise, differentiators, keywords (array), pillars (array),
social_profiles (objeto com instagram, facebook, linkedin, tiktok, youtube, x, other),
notes.
Quando não encontrar um valor, use null ou lista vazia.`;

  const prompt = `Planejamento:\n${text}\n\nResponda apenas JSON.`;

  const raw = await OpenAIService.generateCompletion({
    prompt,
    systemPrompt,
    temperature: 0.2,
    maxTokens: 1200,
  });

  const parsed = safeJsonParse(raw) || {};

  return {
    name: normalizeString(parsed.name),
    segment_primary: normalizeString(parsed.segment_primary),
    segment_secondary: normalizeArray(parsed.segment_secondary),
    country: normalizeString(parsed.country),
    uf: normalizeString(parsed.uf),
    city: normalizeString(parsed.city),
    website: normalizeString(parsed.website),
    description: normalizeString(parsed.description),
    audience: normalizeString(parsed.audience),
    brand_promise: normalizeString(parsed.brand_promise),
    differentiators: normalizeString(parsed.differentiators),
    keywords: normalizeArray(parsed.keywords),
    pillars: normalizeArray(parsed.pillars),
    social_profiles: normalizeSocials(parsed.social_profiles),
    notes: normalizeString(parsed.notes),
  };
}

const calendarProfileSchema = z.object({
  enable_calendar_total: z.boolean().optional(),
  calendar_weight: z.number().min(0).max(100).optional(),
  retail_mode: z.boolean().optional(),
  allow_cultural_opportunities: z.boolean().optional(),
  allow_geek_pop: z.boolean().optional(),
  allow_profession_days: z.boolean().optional(),
  restrict_sensitive_causes: z.boolean().optional(),
});

const trendProfileSchema = z.object({
  enable_trends: z.boolean().optional(),
  trend_weight: z.number().min(0).max(100).optional(),
  sources: z.array(z.string()).optional(),
});

const baseClientSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  country: z.string().min(2).optional(),
  uf: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  segment_primary: z.string().min(2),
  segment_secondary: z.array(z.string()).optional(),
  tone_profile: z.enum(['conservative', 'balanced', 'bold']).optional(),
  risk_tolerance: z.enum(['low', 'medium', 'high']).optional(),
  calendar_profile: calendarProfileSchema.optional(),
  trend_profile: trendProfileSchema.optional(),
  platform_preferences: z.record(z.any()).optional(),
  reportei_account_id: z.string().optional().nullable(),
  keywords: z.array(z.string()).optional(),
  pillars: z.array(z.string()).optional(),
  negative_keywords: z.array(z.string()).optional(),
  knowledge_base: z.record(z.any()).optional(),
  brand_colors: z.array(z.string()).optional(),
  status: z.enum(['draft', 'active', 'paused', 'archived']).optional(),
});

const enrichmentSections = ['identity', 'voice', 'strategy', 'competitors', 'calendar'] as const;
const enrichmentSectionSchema = z.enum(enrichmentSections);
const suggestionFieldPathSchema = z.object({
  id: z.string().min(1),
  section: enrichmentSectionSchema,
  field: z.string().min(1),
});

async function syncCopyExamplesToProfile(clientId: string, tenantId: string): Promise<void> {
  // Buscar exemplos agrupados por plataforma E formato — isolamento completo de contexto
  const [approvedRows, rejectedRows] = await Promise.all([
    query<{ text: string; platform: string | null; format: string | null }>(
      `SELECT copy_approved_text as text, copy_platform as platform, copy_format as format
       FROM preference_feedback
       WHERE client_id=$1 AND tenant_id=$2 AND feedback_type='copy'
         AND action IN ('approved','approved_after_edit') AND copy_approved_text IS NOT NULL
       ORDER BY created_at DESC LIMIT 50`,
      [clientId, tenantId]
    ),
    query<{ text: string; platform: string | null; format: string | null }>(
      `SELECT copy_rejected_text as text, copy_platform as platform, copy_format as format
       FROM preference_feedback
       WHERE client_id=$1 AND tenant_id=$2 AND feedback_type='copy'
         AND action='rejected' AND copy_rejected_text IS NOT NULL
       ORDER BY created_at DESC LIMIT 50`,
      [clientId, tenantId]
    ),
  ]);

  // Agrupar por "Plataforma::Formato" — ex: { "Instagram::Reels": [...], "LinkedIn::Post": [...] }
  const groupByContext = (rows: Array<{ text: string; platform: string | null; format: string | null }>) => {
    const groups: Record<string, string[]> = {};
    for (const row of rows) {
      const key = [row.platform, row.format].filter(Boolean).join('::') || 'geral';
      if (!groups[key]) groups[key] = [];
      if (groups[key].length < 5) groups[key].push(String(row.text).trim());
    }
    return groups;
  };

  const existing = await query<{ profile: Record<string, any> | null }>(
    `SELECT profile FROM clients WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
    [tenantId, clientId]
  );
  if (!existing.rows.length) return;

  const nextProfile = {
    ...(existing.rows[0]?.profile || {}),
    // Exemplos segmentados por contexto (plataforma::formato) — fonte da verdade
    copy_examples_by_context: {
      approved: groupByContext(approvedRows.rows),
      rejected: groupByContext(rejectedRows.rows),
    },
    // Compat: flat com os 5 mais recentes globais (fallback para sistemas que leem este campo)
    good_copy_examples: approvedRows.rows.slice(0, 5).map((r) => String(r.text).trim()).filter(Boolean),
    bad_copy_examples:  rejectedRows.rows.slice(0, 5).map((r) => String(r.text).trim()).filter(Boolean),
  };

  await query(
    `UPDATE clients SET profile=$1::jsonb, updated_at=NOW() WHERE tenant_id=$2 AND id=$3`,
    [JSON.stringify(nextProfile), tenantId, clientId]
  );
}

export default async function clientsRoutes(app: FastifyInstance) {
  await app.register(multipart);
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.get(
    '/clients',
    { preHandler: [requirePerm('clients:read')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const clients = await listClients(tenantId);
      return reply.send(clients);
    }
  );

  app.get(
    '/clients/:id',
    { preHandler: [requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const params = paramsSchema.parse(request.params);
      const tenantId = (request.user as any).tenant_id;

      const client = await getClientById(tenantId, params.id);
      if (!client) return reply.status(404).send({ error: 'client_not_found' });
      return reply.send(client);
    }
  );

  app.get(
    '/clients/:id/profile',
    { preHandler: [requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const params = paramsSchema.parse(request.params);
      const tenantId = (request.user as any).tenant_id;
      const client = await getClientById(tenantId, params.id);
      if (!client) return reply.status(404).send({ error: 'client_not_found' });

      const profile = client.profile || {};
      const kb = profile.knowledge_base || {};
      return reply.send({
        client_id: client.id,
        tone: profile.tone_description || profile.tone_profile || null,
        voice_profile: profile.tone_profile || null,
        profile,
        knowledge_base: kb,
      });
    }
  );

  // ── Create Client ─────────────────────────────────────────────────────────
  app.post(
    '/clients',
    { preHandler: [requirePerm('clients:write')] },
    async (request: any, reply) => {
      const bodySchema = z.object({
        name: z.string().min(2),
        segment_primary: z.string().min(1),
        city: z.string().optional(),
        uf: z.string().optional(),
        risk_tolerance: z.string().optional(),
        tone_profile: z.string().optional(),
        keywords: z.array(z.string()).optional(),
        pillars: z.array(z.string()).optional(),
        knowledge_base: z.record(z.any()).optional(),
      });
      const body = bodySchema.parse(request.body || {});
      const tenantId = (request.user as any).tenant_id;

      const client = await createClient({ tenantId, payload: body });

      setImmediate(async () => {
        try {
          await enqueueJob(tenantId, 'client.enrich', {
            tenant_id: tenantId,
            client_id: client.id,
            sections: ['identity', 'voice', 'strategy', 'competitors', 'calendar'],
            trigger: 'created',
          });
        } catch { /* non-blocking */ }
      });

      return reply.status(201).send(client);
    }
  );

  app.get(
    '/clients/:id/suggestions',
    { preHandler: [requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const params = paramsSchema.parse(request.params);
      const tenantId = (request.user as any).tenant_id;

      const { rows } = await query<any>(
        `
        SELECT profile_suggestions, sections_refreshed_at, enrichment_status, intelligence_score
        FROM clients
        WHERE id=$1 AND tenant_id=$2
        LIMIT 1
        `,
        [params.id, tenantId]
      );

      if (!rows.length) return reply.status(404).send({ error: 'client_not_found' });
      return reply.send({
        profile_suggestions: rows[0].profile_suggestions || {},
        sections_refreshed_at: rows[0].sections_refreshed_at || {},
        enrichment_status: rows[0].enrichment_status || 'pending',
        intelligence_score: Number(rows[0].intelligence_score || 0),
      });
    }
  );

  app.post(
    '/clients/:id/suggestions/confirm',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const bodySchema = z.object({
        section: enrichmentSectionSchema,
        field: z.string().min(1),
        value: z.any(),
      });

      const params = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body || {});
      const tenantId = (request.user as any).tenant_id;

      const { rows } = await query<any>(
        `
        SELECT profile, profile_suggestions
        FROM clients
        WHERE id=$1 AND tenant_id=$2
        LIMIT 1
        `,
        [params.id, tenantId]
      );
      if (!rows.length) return reply.status(404).send({ error: 'client_not_found' });

      const profile = rows[0].profile || {};
      const suggestions = rows[0].profile_suggestions || {};
      const updatedProfile = applyFieldToProfile(profile, body.field, body.value);

      if (suggestions?.[body.section]?.fields?.[body.field]) {
        suggestions[body.section].fields[body.field] = {
          ...suggestions[body.section].fields[body.field],
          value: body.value,
          status: 'confirmed',
        };
      }

      const intelligenceScore = calculateIntelligenceScore({
        profile: updatedProfile,
        suggestions,
      });

      await query(
        `
        UPDATE clients
        SET profile=$1::jsonb,
            profile_suggestions=$2::jsonb,
            intelligence_score=$3,
            updated_at=NOW()
        WHERE id=$4 AND tenant_id=$5
        `,
        [
          JSON.stringify(updatedProfile),
          JSON.stringify(suggestions),
          intelligenceScore,
          params.id,
          tenantId,
        ]
      );

      return reply.send({ ok: true, intelligence_score: intelligenceScore });
    }
  );

  app.delete(
    '/clients/:id/suggestions/:section/:field',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const params = suggestionFieldPathSchema.parse(request.params);
      const tenantId = (request.user as any).tenant_id;

      await query(
        `
        UPDATE clients
        SET profile_suggestions = profile_suggestions #- $1::text[],
            updated_at=NOW()
        WHERE id=$2 AND tenant_id=$3
        `,
        [[params.section, 'fields', params.field], params.id, tenantId]
      );

      return reply.send({ ok: true });
    }
  );

  app.post(
    '/clients/:id/enrich',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const bodySchema = z
        .object({
          sections: z.array(enrichmentSectionSchema).optional(),
          trigger: z.enum(['created', 'profile_update', 'scheduled', 'manual']).optional(),
        })
        .optional();
      const params = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body || {}) || {};
      const tenantId = (request.user as any).tenant_id;

      const client = await getClientById(tenantId, params.id);
      if (!client) return reply.status(404).send({ error: 'client_not_found' });

      await enqueueJob(tenantId, 'client.enrich', {
        tenant_id: tenantId,
        client_id: params.id,
        sections: (body.sections || enrichmentSections) as EnrichmentSection[],
        trigger: body.trigger || 'manual',
      });

      await query(
        `UPDATE clients
         SET enrichment_status='pending', updated_at=NOW()
         WHERE id=$1 AND tenant_id=$2`,
        [params.id, tenantId]
      );

      return reply.send({
        ok: true,
        queued: true,
        message: 'Enriquecimento agendado.',
      });
    }
  );

  app.get(
    '/clients/:id/intelligence',
    { preHandler: [requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const params = paramsSchema.parse(request.params);
      const tenantId = (request.user as any).tenant_id;

      const insight = await getLatestClientInsight({ tenantId, clientId: params.id });
      const sources = await listClientSources({ tenantId, clientId: params.id });
      return reply.send({ insight, sources });
    }
  );

  app.get(
    '/clients/:id/insights/reportei',
    { preHandler: [requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const params = paramsSchema.parse(request.params);
      const tenantId = (request.user as any).tenant_id;

      const client = await getClientById(tenantId, params.id);
      if (!client) return reply.status(404).send({ error: 'client_not_found' });

      const { rows } = await query<any>(
        `
        SELECT DISTINCT ON (platform)
          platform,
          time_window,
          payload,
          created_at
        FROM learned_insights
        WHERE tenant_id=$1
          AND client_id=$2
        ORDER BY platform, created_at DESC
        `,
        [tenantId, params.id]
      );

      const items = (rows || []).map((row: any) => {
        const payload = row?.payload;
        if (payload && typeof payload === 'object') {
          const { raw, ...rest } = payload;
          return {
            platform: row.platform,
            time_window: row.time_window,
            created_at: row.created_at,
            payload: rest,
          };
        }
        return {
          platform: row.platform,
          time_window: row.time_window,
          created_at: row.created_at,
          payload,
        };
      });

      const updatedAt =
        items.reduce((latest: string | null, item: any) => {
          if (!item?.created_at) return latest;
          if (!latest) return item.created_at;
          return new Date(item.created_at).getTime() > new Date(latest).getTime() ? item.created_at : latest;
        }, null) || null;

        return reply.send({ items, updated_at: updatedAt });
      }
    );

    app.post(
      '/clients/:id/insights/reportei/sync',
      { preHandler: [requirePerm('clients:write'), requireClientPerm('publish')] },
      async (request: any, reply) => {
        const paramsSchema = z.object({ id: z.string().min(1) });
        const bodySchema = z
          .object({
            platforms: z.array(z.string()).optional(),
            windows: z.array(z.string()).optional(),
          })
          .optional();

        const params = paramsSchema.parse(request.params);
        const body = bodySchema.parse(request.body ?? {}) || {};
        const tenantId = (request.user as any).tenant_id;

        const client = await getClientById(tenantId, params.id);
        if (!client) return reply.status(404).send({ error: 'client_not_found' });

        const result = await syncReporteiInsightsForClient(client, {
          tenantId,
          platforms: body.platforms,
          windows: body.windows,
        });

        return reply.send({ ok: true, ...result });
      }
    );

  app.post(
    '/clients/plan/analyze',
    { preHandler: [requirePerm('clients:write')] },
    async (request: any, reply) => {
      const data = await request.file();
      if (!data) return reply.code(400).send({ error: 'missing_file' });

      const buffer = await data.toBuffer();
      const mimeType =
        data.mimetype || (mime.lookup(data.filename) as string) || 'application/octet-stream';
      const rawText = await extractText(mimeType, buffer);

      const trimmed = rawText.trim();
      if (!trimmed) return reply.code(400).send({ error: 'empty_document' });

      const excerpt = trimmed.slice(0, 12000);

      try {
        const extracted = await analyzePlanText(excerpt);
        const missing = detectMissingFields(extracted);
        return reply.send({
          extracted,
          missing_fields: missing,
          analyzed_chars: excerpt.length,
        });
      } catch (error: any) {
        return reply.code(500).send({
          error: 'analysis_failed',
          message: error?.message || 'Falha ao analisar planejamento.',
        });
      }
    }
  );

  app.post(
    '/clients/:id/sources/sync',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const params = paramsSchema.parse(request.params);
      const tenantId = (request.user as any).tenant_id;

      const service = new ClientIntelligenceService(tenantId);
      await service.syncSourcesFromProfile(params.id);
      const sources = await listClientSources({ tenantId, clientId: params.id });
      return reply.send({ sources });
    }
  );

  app.post(
    '/clients/:id/intelligence/refresh',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const params = paramsSchema.parse(request.params);
      const tenantId = (request.user as any).tenant_id;

      const service = new ClientIntelligenceService(tenantId);
      const insight = await getLatestClientInsight({ tenantId, clientId: params.id });

      setImmediate(async () => {
        try {
          await service.refreshClient(params.id);
        } catch (error: any) {
          request.log.error({ err: error, clientId: params.id }, 'client_intelligence_refresh_failed');
        }
      });

      return reply.send({ queued: true, insight });
    }
  );

  app.post(
    '/clients/intelligence/refresh-all',
    { preHandler: [requirePerm('clients:write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const { rows } = await query<any>(`SELECT id FROM clients WHERE tenant_id=$1`, [tenantId]);
      const ids = rows.map((row) => row.id).filter(Boolean);
      const service = new ClientIntelligenceService(tenantId);

      setImmediate(async () => {
        for (const clientId of ids) {
          try {
            await service.refreshClient(clientId);
          } catch (error: any) {
            request.log.error({ err: error, clientId }, 'client_intelligence_refresh_failed');
          }
        }
      });

      return reply.send({ queued: true, total: ids.length });
    }
  );

  app.get(
    '/clients/:id/preferences/context',
    { preHandler: [requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const params = paramsSchema.parse(request.params);
      const tenantId = (request.user as any).tenant_id;
      const client = await getClientById(tenantId, params.id);
      if (!client) return reply.status(404).send({ error: 'client_not_found' });

      const context = await getClientPreferenceContext(params.id, tenantId);
      return reply.send(context);
    }
  );

  app.post(
    '/clients/:id/copy-feedback',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const bodySchema = z.object({
        action: z.enum(['approved', 'rejected', 'approved_after_edit']),
        copy_briefing_id: z.string().optional(),
        copy_rejected_text: z.string().optional(),
        copy_approved_text: z.string().optional(),
        copy_platform: z.string().optional(),
        copy_format: z.string().optional(),
        copy_pipeline: z.string().optional(),
        copy_task_type: z.string().optional(),
        copy_tone: z.string().optional(),
        rejection_tags: z.array(z.string()).optional(),
        rejection_reason: z.string().max(2000).optional(),
        regeneration_instruction: z.string().max(2000).optional(),
        regeneration_count: z.number().int().min(0).max(20).optional(),
      });

      const params = paramsSchema.parse(request.params);
      const body = bodySchema.parse(request.body || {});
      const tenantId = (request.user as any).tenant_id;
      const user = request.user as any;
      const client = await getClientById(tenantId, params.id);
      if (!client) return reply.status(404).send({ error: 'client_not_found' });

      const feedback = await recordPreferenceFeedback({
        tenantId,
        clientId: params.id,
        payload: {
          feedback_type: 'copy',
          action: body.action,
          copy_briefing_id: body.copy_briefing_id,
          copy_rejected_text: body.copy_rejected_text,
          copy_approved_text: body.copy_approved_text,
          copy_platform: body.copy_platform,
          copy_format: body.copy_format,
          copy_pipeline: body.copy_pipeline,
          copy_task_type: body.copy_task_type,
          copy_tone: body.copy_tone,
          rejection_tags: body.rejection_tags,
          rejection_reason: body.rejection_reason,
          regeneration_instruction: body.regeneration_instruction,
          regeneration_count: body.regeneration_count,
          created_by: user?.email || user?.sub || null,
        },
      });

      // Fire-and-forget: sincronizar exemplos aprovados/rejeitados no profile do cliente
      syncCopyExamplesToProfile(params.id, tenantId).catch(() => {});
      // Re-analisar padrões de rejeição quando há texto de motivo
      if (body.action === 'rejected' && body.rejection_reason) {
        syncRejectionPatternsToProfile(params.id, tenantId).catch(() => {});
      }

      return reply.send({ ok: true, feedback });
    }
  );

  // ── Brand colors: extração automática do site ────────────────────────────────

  async function extractBrandColorsFromUrl(url: string): Promise<string[]> {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; EdroBot/1.0; +https://edro.digital)' },
        signal: AbortSignal.timeout(10_000),
      });
      const html = await res.text();
      const colors: string[] = [];

      // 1. meta theme-color (maior confiança)
      const themeA = html.match(/<meta[^>]+name=["']theme-color["'][^>]+content=["'](#[0-9A-Fa-f]{3,8})/i);
      const themeB = html.match(/<meta[^>]+content=["'](#[0-9A-Fa-f]{3,8})[^>]+name=["']theme-color["']/i);
      const themeColor = (themeA?.[1] || themeB?.[1] || '').toLowerCase();
      if (themeColor) colors.push(themeColor);

      // 2. Variáveis CSS comuns de cor primária
      const cssVarRe = /--(?:color-primary|primary-color|brand-color|accent-color|color-accent|primary|brand|accent)\s*:\s*(#[0-9A-Fa-f]{3,8})/gi;
      let m: RegExpExecArray | null;
      while ((m = cssVarRe.exec(html)) !== null) {
        const c = m[1].toLowerCase();
        if (!colors.includes(c)) colors.push(c);
        if (colors.length >= 3) break;
      }

      // 3. Hex mais frequentes (exclui preto/branco/cinza)
      if (colors.length < 2) {
        const freq: Record<string, number> = {};
        const hexRe = /#([0-9A-Fa-f]{6})\b/g;
        let hm: RegExpExecArray | null;
        while ((hm = hexRe.exec(html)) !== null) {
          const c = `#${hm[1].toLowerCase()}`;
          const r = parseInt(hm[1].slice(0, 2), 16);
          const g = parseInt(hm[1].slice(2, 4), 16);
          const b = parseInt(hm[1].slice(4, 6), 16);
          const isGray = Math.abs(r - g) < 25 && Math.abs(g - b) < 25;
          const isBW = (r > 215 && g > 215 && b > 215) || (r < 30 && g < 30 && b < 30);
          if (!isGray && !isBW) freq[c] = (freq[c] || 0) + 1;
        }
        const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3);
        for (const [color] of top) {
          if (!colors.includes(color)) colors.push(color);
        }
      }

      return colors.slice(0, 5);
    } catch {
      return [];
    }
  }

  app.get(
    '/clients/:id/extract-brand-colors',
    { preHandler: [requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const tenantId = (request.user as any).tenant_id;
      const client = await getClientById(tenantId, params.id);
      if (!client) return reply.status(404).send({ error: 'client_not_found' });

      const profile = (client as any).profile || {};
      const website: string = profile?.knowledge_base?.website || '';
      if (!website) {
        return reply.status(400).send({
          error: 'no_website',
          message: 'Cliente não tem website em knowledge_base.website. Adicione o site antes de extrair as cores.',
        });
      }

      const url = website.startsWith('http') ? website : `https://${website}`;
      const colors = await extractBrandColorsFromUrl(url);
      return reply.send({ ok: true, colors, website: url });
    }
  );

  app.patch(
    '/clients/:id/brand-colors',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const params = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = z.object({
        colors: z.array(z.string().regex(/^#[0-9A-Fa-f]{3,8}$/)).min(0).max(10),
      }).parse(request.body || {});
      const tenantId = (request.user as any).tenant_id;

      const existing = await query<{ profile: Record<string, any> | null }>(
        `SELECT profile FROM clients WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
        [tenantId, params.id]
      );
      if (!existing.rows.length) return reply.status(404).send({ error: 'client_not_found' });

      const nextProfile = { ...(existing.rows[0]?.profile || {}), brand_colors: body.colors };
      await query(
        `UPDATE clients SET profile=$1::jsonb, updated_at=NOW() WHERE tenant_id=$2 AND id=$3`,
        [JSON.stringify(nextProfile), tenantId, params.id]
      );
      return reply.send({ ok: true, brand_colors: body.colors });
    }
  );

  // ── Persona Manager ───────────────────────────────────────────────────────────

  app.get(
    '/clients/:id/personas',
    { preHandler: [requirePerm('clients:read'), requireClientPerm('read')] },
    async (request: any, reply) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
      const tenantId = (request.user as any).tenant_id;
      const { rows } = await query<{ profile: any }>(
        `SELECT profile FROM clients WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
        [tenantId, id]
      );
      if (!rows.length) return reply.status(404).send({ error: 'client_not_found' });
      return reply.send({ ok: true, personas: rows[0]?.profile?.personas ?? [] });
    }
  );

  app.post(
    '/clients/:id/personas',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
      const body = z.object({
        name: z.string().min(1).max(120),
        description: z.string().min(1).max(1000),
        momento: z.enum(['problema', 'solucao', 'decisao']),
        demographics: z.string().max(500).optional(),
        pain_points: z.array(z.string().max(200)).max(10).optional(),
      }).parse(request.body);
      const tenantId = (request.user as any).tenant_id;
      const { rows } = await query<{ profile: any }>(
        `SELECT profile FROM clients WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
        [tenantId, id]
      );
      if (!rows.length) return reply.status(404).send({ error: 'client_not_found' });
      const profile = rows[0]?.profile ?? {};
      const { randomUUID } = await import('crypto');
      const newPersona = { id: randomUUID(), ...body };
      await query(
        `UPDATE clients SET profile=$1::jsonb, updated_at=NOW() WHERE tenant_id=$2 AND id=$3`,
        [JSON.stringify({ ...profile, personas: [...(profile.personas ?? []), newPersona] }), tenantId, id]
      );
      return reply.status(201).send({ ok: true, persona: newPersona });
    }
  );

  app.delete(
    '/clients/:id/personas/:personaId',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const { id, personaId } = z.object({ id: z.string().min(1), personaId: z.string().min(1) }).parse(request.params);
      const tenantId = (request.user as any).tenant_id;
      const { rows } = await query<{ profile: any }>(
        `SELECT profile FROM clients WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
        [tenantId, id]
      );
      if (!rows.length) return reply.status(404).send({ error: 'client_not_found' });
      const profile = rows[0]?.profile ?? {};
      const personas = (profile.personas ?? []).filter((p: any) => p.id !== personaId);
      await query(
        `UPDATE clients SET profile=$1::jsonb, updated_at=NOW() WHERE tenant_id=$2 AND id=$3`,
        [JSON.stringify({ ...profile, personas }), tenantId, id]
      );
      return reply.send({ ok: true });
    }
  );

  // ── Personas: geração via IA ──────────────────────────────────────────────

  app.post(
    '/clients/:id/personas/generate',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
      const tenantId = (request.user as any).tenant_id;

      const { rows } = await query<{ name: string; segment_primary: string; city: string; uf: string; profile: any }>(
        `SELECT name, segment_primary, city, uf, profile FROM clients WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
        [tenantId, id]
      );
      if (!rows.length) return reply.status(404).send({ error: 'client_not_found' });

      const client = rows[0];
      const kb = client.profile?.knowledge_base || {};
      const profileKeywords: string[] = Array.isArray(client.profile?.keywords) ? client.profile.keywords : [];
      const parts: string[] = [
        `Cliente: ${client.name}`,
        `Segmento: ${client.segment_primary || 'não informado'}`,
        client.city ? `Localização: ${[client.city, client.uf].filter(Boolean).join(', ')}` : '',
        kb.description ? `Descrição: ${kb.description}` : '',
        kb.audience ? `Público-alvo: ${kb.audience}` : '',
        kb.brand_promise ? `Promessa da marca: ${kb.brand_promise}` : '',
        kb.differentiators ? `Diferenciais: ${kb.differentiators}` : '',
        profileKeywords.length ? `Keywords: ${profileKeywords.join(', ')}` : '',
      ].filter(Boolean);

      const systemPrompt = `Você é um especialista em marketing e construção de personas de público-alvo. Crie personas detalhadas e realistas baseadas no perfil do cliente fornecido.`;

      const prompt = `${parts.join('\n')}

Crie 3 personas distintas e realistas para este cliente, cobrindo os 3 momentos de consciência:
- "problema": a pessoa está descobrindo que tem um problema que o cliente resolve
- "solucao": a pessoa está avaliando soluções e comparando opções
- "decisao": a pessoa está pronta para contratar/comprar

Responda SOMENTE com JSON válido (array com exatamente 3 personas):
[
  {
    "name": "Nome completo da persona com cargo (ex: Carla, Gerente de Marketing)",
    "description": "Descrição de quem é, o que faz, o que busca e por que se interessa pelo produto/serviço (2-4 frases diretas)",
    "momento": "problema",
    "demographics": "Faixa etária, cargo/contexto, tamanho da empresa ou contexto de vida",
    "pain_points": ["dor principal 1", "dor principal 2", "dor principal 3"]
  }
]`;

      try {
        const raw = await OpenAIService.generateCompletion({
          prompt,
          systemPrompt,
          temperature: 0.7,
          maxTokens: 1200,
        });
        const text = (raw?.text || '').trim();
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (!jsonMatch) return reply.send({ ok: true, personas: [] });
        const personas = JSON.parse(jsonMatch[0]);
        if (!Array.isArray(personas)) return reply.send({ ok: true, personas: [] });
        // Sanitize output
        const safe = personas.slice(0, 3).map((p: any) => ({
          name: String(p.name || '').slice(0, 120),
          description: String(p.description || '').slice(0, 1000),
          momento: ['problema', 'solucao', 'decisao'].includes(p.momento) ? p.momento : 'problema',
          demographics: p.demographics ? String(p.demographics).slice(0, 500) : undefined,
          pain_points: Array.isArray(p.pain_points) ? p.pain_points.slice(0, 5).map((x: any) => String(x).slice(0, 200)) : [],
        }));
        return reply.send({ ok: true, personas: safe });
      } catch {
        return reply.status(500).send({ ok: false, error: 'generation_failed' });
      }
    }
  );

  // ── Web Market Intelligence — manual trigger ───────────────────────────────

  app.post(
    '/clients/:id/web-enrich',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
      const tenantId = (request.user as any).tenant_id;
      const client = await getClientById(tenantId, id);
      if (!client) return reply.status(404).send({ error: 'client_not_found' });

      await enqueueJob(tenantId, 'web.market_intelligence', {
        tenant_id: tenantId,
        client_id: id,
        trigger: 'manual',
      });

      return reply.send({ ok: true, queued: true });
    }
  );

  // ── Meeting Prep — pesquisa rápida pré-reunião via Tavily ─────────────────────

  app.post(
    '/clients/:id/meeting-prep',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const { id } = z.object({ id: z.string().min(1) }).parse(request.params);
      const { meeting_context } = z.object({
        meeting_context: z.string().max(500).optional(),
      }).parse(request.body || {});
      const tenantId = (request.user as any).tenant_id;

      if (!isTavilyConfigured()) {
        return reply.code(503).send({ ok: false, error: 'tavily_not_configured' });
      }

      const client = await getClientById(tenantId, id);
      if (!client) return reply.status(404).send({ error: 'client_not_found' });

      const profile = (client as any).profile ?? {};
      const segment = (client as any).segment_primary || '';
      const competitors: string[] = Array.isArray(profile.competitors) ? profile.competitors.slice(0, 2) : [];
      const contextSuffix = meeting_context ? ` ${meeting_context}` : '';

      const TIMEOUT_MS = 15000;
      const withTimeout = <T>(p: Promise<T>): Promise<T | null> =>
        Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), TIMEOUT_MS))]);

      const t0 = Date.now();

      const [newsRes, compRes, trendRes] = await Promise.all([
        withTimeout(tavilySearch(`"${client.name}" noticias recentes marketing${contextSuffix}`, { maxResults: 3, searchDepth: 'basic' })),
        competitors.length > 0
          ? withTimeout(tavilySearch(`${competitors.join(' OR ')} estratégia marketing conteúdo recente`, { maxResults: 3, searchDepth: 'basic' }))
          : Promise.resolve(null),
        segment
          ? withTimeout(tavilySearch(`${segment} tendências oportunidades ${new Date().getFullYear()}${contextSuffix}`, { maxResults: 4, searchDepth: 'basic' }))
          : Promise.resolve(null),
      ]);

      const duration = Date.now() - t0;
      const callCount = [newsRes, compRes, trendRes].filter(Boolean).length;
      if (callCount > 0) {
        logTavilyUsage({ tenant_id: tenantId, operation: 'search-basic', unit_count: callCount, feature: 'meeting_prep', duration_ms: duration, metadata: { client_id: id } });
      }

      return reply.send({
        ok: true,
        client_name: (client as any).name,
        generated_at: new Date().toISOString(),
        client_news: (newsRes?.results ?? []).map((r: any) => ({ title: r.title, snippet: r.snippet?.slice(0, 300), url: r.url })),
        competitor_activity: (compRes?.results ?? []).map((r: any) => ({ title: r.title, snippet: r.snippet?.slice(0, 300), url: r.url })),
        sector_trends: (trendRes?.results ?? []).map((r: any) => ({ title: r.title, snippet: r.snippet?.slice(0, 300), url: r.url })),
      });
    }
  );

  // ── Prospect Research — busca web para pré-preencher cadastro de cliente ──────

  app.post(
    '/clients/prospect-research',
    { preHandler: [requirePerm('clients:read')] },
    async (request: any, reply) => {
      const { name } = z.object({ name: z.string().min(2).max(200) }).parse(request.body || {});
      const tenantId = (request.user as any).tenant_id;

      if (!isTavilyConfigured()) {
        return reply.code(503).send({ ok: false, error: 'tavily_not_configured' });
      }

      const t0 = Date.now();
      const [res1, res2, res3] = await Promise.allSettled([
        tavilySearch(`${name} empresa sobre segmento mercado atuação Brasil`, { maxResults: 5, searchDepth: 'advanced' }),
        tavilySearch(`${name} instagram linkedin facebook site oficial contato`, { maxResults: 4, searchDepth: 'basic' }),
        tavilySearch(`${name} who company about segment industry`, { maxResults: 3, searchDepth: 'basic' }),
      ]);
      logTavilyUsage({
        tenant_id: tenantId,
        operation: 'search-advanced',
        unit_count: 3,
        feature: 'prospect_research',
        duration_ms: Date.now() - t0,
        metadata: { name },
      });

      const seen = new Set<string>();
      const snippets: string[] = [];
      for (const res of [res1, res2, res3]) {
        if (res.status !== 'fulfilled') continue;
        for (const r of res.value.results.slice(0, 4)) {
          if (!r.snippet || seen.has(r.url)) continue;
          seen.add(r.url);
          snippets.push(`${r.title}\n${r.snippet}\nURL: ${r.url}`);
        }
      }

      if (snippets.length === 0) {
        return reply.send({ ok: true, data: {} });
      }

      const SEGMENT_OPTIONS = ['Varejo', 'Saúde', 'Educação', 'Tecnologia', 'Imobiliário', 'Alimentação', 'Moda & Beleza', 'Financeiro', 'Jurídico', 'Indústria', 'Logística', 'Transporte', 'Turismo', 'Serviços', 'Terceiro Setor', 'Outro'];
      const systemPrompt = `Você é um especialista em pesquisa de mercado. Extraia informações estruturadas sobre empresas a partir de resultados de busca.`;
      const prompt = `Baseado nos resultados de busca sobre a empresa "${name}", extraia as informações no formato JSON abaixo.

${snippets.join('\n\n---\n\n')}

Responda SOMENTE com JSON válido (sem markdown, sem explicações):
{
  "segment_primary": "OBRIGATÓRIO: escolha EXATAMENTE uma opção da lista: ${SEGMENT_OPTIONS.join(', ')}",
  "city": "cidade sede da empresa",
  "uf": "sigla do estado com 2 letras maiúsculas",
  "website": "URL do site oficial sem https://",
  "keywords": ["palavra-chave1", "palavra-chave2", "palavra-chave3"],
  "audience": "descrição do público-alvo da empresa",
  "brand_promise": "proposta de valor, missão ou slogan da empresa",
  "instagram": "handle @usuario ou URL do Instagram",
  "linkedin": "URL do LinkedIn da empresa",
  "facebook": "URL da página do Facebook"
}
Omita campos que não encontrou informação confiável. Para segment_primary, sempre escolha a opção mais próxima da lista acima.`;

      try {
        const raw = await OpenAIService.generateCompletion({
          prompt,
          systemPrompt,
          temperature: 0.1,
          maxTokens: 600,
        });
        const text = (raw?.text || '').trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return reply.send({ ok: true, data: {} });
        const data = JSON.parse(jsonMatch[0]);
        return reply.send({ ok: true, data });
      } catch {
        return reply.send({ ok: true, data: {} });
      }
    }
  );

  // ─────────────────────────────────────────────────────────────────────────────

  app.patch(
    '/clients/:id',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const params = paramsSchema.parse(request.params);
      const body = baseClientSchema.partial().parse(request.body || {});
      const tenantId = (request.user as any).tenant_id;

      const client = await updateClient({ tenantId, id: params.id, patch: body });
      if (!client) return reply.status(404).send({ error: 'client_not_found' });

      const profileRelatedKeys = [
        'segment_primary',
        'segment_secondary',
        'keywords',
        'pillars',
        'knowledge_base',
        'platform_preferences',
      ];
      const shouldReenrich = Object.keys(body).some((key) => profileRelatedKeys.includes(key));
      if (shouldReenrich) {
        await enqueueJob(tenantId, 'client.enrich', {
          tenant_id: tenantId,
          client_id: params.id,
          sections: ['voice', 'strategy', 'competitors', 'calendar'],
          trigger: 'profile_update',
        });
      }

      // Auto-trigger web intelligence when website is set for the first time
      const newWebsite = (body as any)?.knowledge_base?.website;
      if (newWebsite) {
        const prevClient = await getClientById(tenantId, params.id);
        const prevWebsite = (prevClient as any)?.profile?.knowledge_base?.website;
        if (!prevWebsite && newWebsite) {
          await enqueueJob(tenantId, 'web.market_intelligence', {
            tenant_id: tenantId,
            client_id: params.id,
            trigger: 'onboarding',
          }).catch(() => {});
        }
      }

      return reply.send(client);
    }
  );

  app.delete(
    '/clients/:id',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const paramsSchema = z.object({ id: z.string().min(1) });
      const params = paramsSchema.parse(request.params);
      const tenantId = (request.user as any).tenant_id;

      const deleted = await deleteClient({ tenantId, id: params.id });
      if (!deleted) return reply.status(404).send({ error: 'client_not_found' });
      return reply.status(204).send();
    }
  );
}
