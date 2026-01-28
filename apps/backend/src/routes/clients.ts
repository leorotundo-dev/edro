import { FastifyInstance } from 'fastify';
import multipart from '@fastify/multipart';
import { z } from 'zod';
import mime from 'mime-types';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requireClientPerm } from '../auth/clientPerms';
import { createClient, getClientById, updateClient, deleteClient } from '../repos/clientsRepo';
import { extractText } from '../library/extract';
import { OpenAIService } from '../services/ai/openaiService';

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
  knowledge_base: z.record(z.any()).optional(),
});

export default async function clientsRoutes(app: FastifyInstance) {
  await app.register(multipart);
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

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

  app.post(
    '/clients',
    { preHandler: [requirePerm('clients:write')] },
    async (request: any, reply) => {
      const body = baseClientSchema.parse(request.body);
      const tenantId = (request.user as any).tenant_id;
      const client = await createClient({ tenantId, payload: body });
      return reply.status(201).send(client);
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
