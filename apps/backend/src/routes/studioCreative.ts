import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { query } from '../db/db';
import { decryptJSON } from '../security/secrets';
import {
  generateAdCreative,
  generateArtDirectorPrompt,
  refineScenePrompt,
  isAdCreativeConfigured,
} from '../services/adCreativeService';
import { orchestrateCreative } from '../services/ai/artDirectorOrchestrator';
import {
  analyzePendingArtDirectionReferences,
  buildArtDirectionFeedbackMetadata,
  buildArtDirectionMemoryContext,
  createManualArtDirectionReference,
  discoverArtDirectionReferences,
  getArtDirectionMemoryStats,
  getArtDirectionReferencePreview,
  getPrimaryArtDirectionReferenceId,
  listArtDirectionCanons,
  listArtDirectionReferenceSources,
  listArtDirectionReferences,
  listArtDirectionTrendSignals,
  listRelevantArtDirectionConcepts,
  listRelevantArtDirectionReferences,
  recordArtDirectionFeedbackEvent,
  recomputeArtDirectionTrendSnapshots,
  resolveArtDirectionCreativeContext,
  updateArtDirectionReference,
  upsertArtDirectionConcept,
  upsertArtDirectionReferenceSource,
} from '../services/ai/artDirectionMemoryService';
import { CORE_ART_DIRECTION_CONCEPTS } from '../services/ai/artDirectionCoreConcepts';
import {
  approveLoraModel,
  listLoraJobs,
  rejectLoraModel,
  startLoraTraining,
} from '../services/loraService';

const generateSchema = z.object({
  /** Raw copy / caption text */
  copy: z.string().min(1),
  /** Post headline (primary visual concept) */
  headline: z.string().optional(),
  /** Post body text */
  body_text: z.string().optional(),
  /** Format string, e.g. "Feed 1:1", "Story 9:16" */
  format: z.string().default('Feed 1:1'),
  /** Platform string, e.g. "Instagram" */
  platform: z.string().default('Instagram'),
  /** Brand/agency name */
  brand: z.string().optional(),
  /** Segment/industry of the client */
  segment: z.string().optional(),
  /** Image generation provider */
  image_provider: z.enum(['gemini', 'leonardo']).default('gemini'),
  /** Model alias — e.g. 'leonardo-phoenix', 'leonardo-lightning-xl' */
  image_model: z.string().optional(),
  /** Aspect ratio: '1:1' | '4:5' | '9:16' | '16:9' */
  aspect_ratio: z.string().optional(),
  /** Number of image variations (Leonardo only, 1–4) */
  num_images: z.coerce.number().int().min(1).max(4).optional(),
  /** User-edited scene narrative (substitutes Art Director auto-generation) */
  custom_prompt: z.string().optional(),
  /** Optional negative prompt */
  negative_prompt: z.string().optional(),
  /** Return only Art Director prompt variations, skip image generation */
  prompt_only: z.boolean().optional(),
  /** Client ID for enriching with brand data */
  client_id: z.string().optional(),
});

const orchestrateSchema = z.object({
  copy: z.string().min(1),
  gatilho: z.enum(['G01', 'G02', 'G03', 'G04', 'G05', 'G06', 'G07']).optional(),
  brand: z.object({
    name: z.string().optional(),
    primaryColor: z.string().optional(),
    segment: z.string().optional(),
  }).optional(),
  format: z.string().default('Feed 1:1'),
  platform: z.string().default('Instagram'),
  client_id: z.string().optional(),
  /** If true, also generate the background image after orchestration */
  with_image: z.boolean().optional(),
  /** Image provider for the with_image step */
  image_provider: z.enum(['gemini', 'leonardo', 'fal']).default('fal'),
  image_model: z.string().optional(),
  /** Number of image variants to generate (1–4, default 3) */
  num_variants: z.number().min(1).max(4).default(3).optional(),
  /** Reference image URL or base64 data URI for IP-Adapter style guidance */
  reference_image_url: z.string().optional(),
  /** How strongly the reference image influences generation (0.0–1.0, default 0.15) */
  reference_image_strength: z.number().min(0).max(1).default(0.15).optional(),
});

const refineSchema = z.object({
  current_prompt: z.string().min(1),
  instruction: z.string().min(1),
  headline: z.string().optional(),
  brand: z.string().optional(),
  image_provider: z.enum(['gemini', 'leonardo']).optional(),
});

const clientIdSchema = z.string().trim().min(1);

const daMemorySchema = z.object({
  client_id: clientIdSchema.optional(),
  platform: z.string().optional(),
  segment: z.string().optional(),
  concept_categories: z.array(z.string()).max(8).optional(),
  concept_limit: z.coerce.number().int().min(1).max(12).optional(),
  reference_limit: z.coerce.number().int().min(1).max(20).optional(),
  trend_limit: z.coerce.number().int().min(1).max(12).optional(),
});

const daDiscoverSchema = z.object({
  client_id: clientIdSchema.optional(),
  platform: z.string().optional(),
  segment: z.string().optional(),
  category: z.string().min(2).optional(),
  mood: z.string().optional(),
  queries: z.array(z.string().min(3)).max(8).optional(),
  max_results_per_query: z.coerce.number().int().min(1).max(10).optional(),
});

const daRefreshSchema = z.object({
  limit: z.coerce.number().int().min(1).max(30).optional(),
  window_days: z.coerce.number().int().min(14).max(180).optional(),
  recent_days: z.coerce.number().int().min(3).max(30).optional(),
  client_id: clientIdSchema.optional(),
  platform: z.string().optional(),
  segment: z.string().optional(),
});

const daFeedbackSchema = z.object({
  client_id: clientIdSchema.optional(),
  creative_session_id: z.string().uuid().optional(),
  reference_id: z.string().uuid().optional(),
  event_type: z.enum(['used', 'approved', 'rejected', 'edited', 'performed', 'saved']),
  score: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
  metadata: z.record(z.any()).optional(),
});

const daReferenceStatuses = z.enum(['discovered', 'analyzed', 'rejected', 'archived']);

const daReferenceListSchema = z.object({
  client_id: clientIdSchema.optional(),
  platform: z.string().optional(),
  segment: z.string().optional(),
  statuses: z.array(daReferenceStatuses).max(4).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const daReferenceParamsSchema = z.object({
  referenceId: z.string().uuid(),
});

const daReferenceCreateSchema = z.object({
  client_id: clientIdSchema.optional(),
  title: z.string().min(2).max(240).optional(),
  source_url: z.string().url(),
  platform: z.string().optional(),
  format: z.string().optional(),
  segment: z.string().optional(),
  visual_intent: z.string().optional(),
  creative_direction: z.string().optional(),
  rationale: z.string().max(2000).optional(),
  mood_words: z.array(z.string()).max(12).optional(),
  style_tags: z.array(z.string()).max(16).optional(),
  composition_tags: z.array(z.string()).max(12).optional(),
  typography_tags: z.array(z.string()).max(12).optional(),
  confidence_score: z.coerce.number().min(0).max(1).optional(),
  trend_score: z.coerce.number().min(0).max(100).optional(),
  status: daReferenceStatuses.optional(),
  metadata: z.record(z.any()).optional(),
});

const daReferenceUpdateSchema = z.object({
  title: z.string().min(2).max(240).optional(),
  source_url: z.string().url().optional(),
  platform: z.string().nullable().optional(),
  format: z.string().nullable().optional(),
  segment: z.string().nullable().optional(),
  visual_intent: z.string().nullable().optional(),
  creative_direction: z.string().nullable().optional(),
  rationale: z.string().max(2000).nullable().optional(),
  mood_words: z.array(z.string()).max(12).nullable().optional(),
  style_tags: z.array(z.string()).max(16).nullable().optional(),
  composition_tags: z.array(z.string()).max(12).nullable().optional(),
  typography_tags: z.array(z.string()).max(12).nullable().optional(),
  confidence_score: z.coerce.number().min(0).max(1).nullable().optional(),
  trend_score: z.coerce.number().min(0).max(100).nullable().optional(),
  status: daReferenceStatuses.nullable().optional(),
  metadata: z.record(z.any()).optional(),
});

const daSourceSchema = z.object({
  name: z.string().min(2).max(120),
  source_type: z.enum(['search', 'manual', 'social', 'rss', 'site', 'library']),
  base_url: z.string().url().optional(),
  domain: z.string().min(3).max(200).optional(),
  trust_score: z.coerce.number().min(0).max(1).optional(),
  enabled: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export default async function studioCreativeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());
  app.addHook('preHandler', requirePerm('library:write'));

  /**
   * POST /studio/creative/generate
   *
   * Generates an advertising background image (or Art Director prompt variations)
   * from raw copy text. Does not require a briefing record.
   *
   * Response:
   *   { success, prompt_variations?, image_url?, image_urls?, prompt_used }
   */
  app.post('/studio/creative/generate', async (request: any, reply) => {
    if (!isAdCreativeConfigured()) {
      return reply.status(503).send({ success: false, error: 'Geração de imagens não configurada (API keys ausentes)' });
    }

    const body = generateSchema.parse(request.body || {});
    const tenantId = (request.user as any)?.tenant_id as string | undefined;

    // ── Fetch client brand data if provided ─────────────────────────────
    let brand = body.brand || '';
    let segment = body.segment || '';
    if (body.client_id && tenantId) {
      try {
        const { getClientById } = await import('../repos/clientsRepo');
        const client = await getClientById(tenantId, body.client_id);
        if (client) {
          brand = brand || (client as any).name || '';
          segment = segment || (client as any).segment_primary || '';
        }
      } catch { /* non-blocking */ }
    }

    const provider = body.image_provider;
    const aspectRatio = body.aspect_ratio || (body.format.includes('9:16') ? '9:16' : body.format.includes('16:9') ? '16:9' : body.format.includes('4:5') ? '4:5' : '1:1');

    // ── If prompt_only: generate Art Director variations and return ───────
    if (body.prompt_only) {
      const variations = await generateArtDirectorPrompt({
        copy: body.copy,
        headline: body.headline,
        bodyText: body.body_text,
        format: body.format,
        brand,
        segment,
        provider,
      });
      return reply.send({ success: true, prompt_variations: variations });
    }

    // ── Generate image ───────────────────────────────────────────────────
    const result = await generateAdCreative({
      copy: body.copy,
      headline: body.headline,
      bodyText: body.body_text,
      format: body.format,
      brand,
      segment,
      customPrompt: body.custom_prompt,
      imageProvider: provider,
      imageModel: body.image_model,
      aspectRatio,
      negativePrompt: body.negative_prompt,
      numImages: body.num_images ?? (provider === 'leonardo' ? 3 : 1),
      tenantId,
    });

    return reply.send(result);
  });

  /**
   * POST /studio/creative/refine-prompt
   *
   * Refines an existing scene narrative with a natural-language instruction.
   */
  app.post('/studio/creative/refine-prompt', async (request: any, reply) => {
    const body = refineSchema.parse(request.body || {});

    const refined = await refineScenePrompt({
      currentPrompt: body.current_prompt,
      instruction: body.instruction,
      headline: body.headline,
      brand: body.brand,
      provider: body.image_provider,
    });

    return reply.send({ success: true, prompt: refined });
  });

  /**
   * POST /studio/creative/orchestrate
   *
   * Claude acts as full Art Director:
   *   - Decides text layout (eyebrow, headline, accentWord, accentColor, cta, body)
   *   - Decides image prompt with composition zones calibrated per gatilho
   *
   * Optional: with_image=true also generates the background image via the chosen provider.
   *
   * Response:
   *   { success, layout, imgPrompt, image_url?, image_urls? }
   */
  app.post('/studio/creative/orchestrate', async (request: any, reply) => {
    const body = orchestrateSchema.parse(request.body || {});
    const tenantId = (request.user as any)?.tenant_id as string | undefined;

    // Enrich brand from client record if provided
    let brand = body.brand || {};
    let clientBrandColors: string[] = [];
    let clientBrandTokens: any = null;
    let learningContext: string | undefined;

    if (body.client_id && tenantId) {
      try {
        const { getClientById } = await import('../repos/clientsRepo');
        const client = await getClientById(tenantId, body.client_id);
        if (client) {
          const profile = (client as any).profile || {};
          clientBrandColors = Array.isArray(profile.brand_colors) ? profile.brand_colors : [];
          clientBrandTokens = profile.brand_tokens || null;
          brand = {
            name: brand.name || (client as any).name || '',
            segment: brand.segment || (client as any).segment_primary || '',
            primaryColor: brand.primaryColor || clientBrandColors[0] || '',
          };
        }
      } catch { /* non-blocking */ }

      // Load learning rules and format as context for the orchestrator
      try {
        const { loadLearningRules } = await import('../services/learningEngine');
        const rules = await loadLearningRules(tenantId, body.client_id);
        if (rules.length > 0) {
          const topRules = rules
            .sort((a: any, b: any) => b.uplift_value - a.uplift_value)
            .slice(0, 5);
          learningContext = topRules
            .map((r: any) => `• ${r.effective_pattern} (↑${Number(r.uplift_value).toFixed(1)}% ${r.uplift_metric})`)
            .join('\n');
        }
      } catch { /* non-blocking */ }
    }

    const orchestrated = await orchestrateCreative({
      copy: body.copy,
      gatilho: body.gatilho,
      brand,
      format: body.format,
      platform: body.platform,
      tenantId,
      clientId: body.client_id,
      learningContext,
      brandTokens: clientBrandTokens,
    });

    // If with_image requested, generate the background image
    if (body.with_image) {
      const numVariants = body.num_variants ?? 3;
      let imageResult = await generateAdCreative({
        copy: body.copy,
        format: body.format,
        customPrompt: orchestrated.imgPrompt.positive,
        negativePrompt: orchestrated.imgPrompt.negative,
        aspectRatio: orchestrated.imgPrompt.aspectRatio,
        imageProvider: body.image_provider as any,
        imageModel: body.image_model,
        numImages: numVariants,
        referenceImageUrl: body.reference_image_url,
        referenceImageStrength: body.reference_image_strength,
        tenantId,
      });

      // Agente Crítico: avalia a primeira imagem gerada e faz 1 retry se necessário
      let critiqueResult = null;
      if (imageResult.success && imageResult.image_url) {
        try {
          const { critiqueGeneratedImage } = await import('../services/ai/artCriticService');
          critiqueResult = await critiqueGeneratedImage({
            imageUrl: imageResult.image_url,
            gatilho: body.gatilho,
            aspectRatio: orchestrated.imgPrompt.aspectRatio,
            copy: body.copy,
            platform: body.platform,
            format: body.format,
            brandName: brand.name,
            segment: brand.segment,
            brandTokens: clientBrandTokens,
            tenantId,
            clientId: body.client_id,
          });

          if (!critiqueResult.pass && critiqueResult.additionalNegative) {
            const retryResult = await generateAdCreative({
              copy: body.copy,
              format: body.format,
              customPrompt: orchestrated.imgPrompt.positive,
              negativePrompt: `${orchestrated.imgPrompt.negative}, ${critiqueResult.additionalNegative}`,
              aspectRatio: orchestrated.imgPrompt.aspectRatio,
              imageProvider: body.image_provider as any,
              imageModel: body.image_model,
              numImages: numVariants,
              referenceImageUrl: body.reference_image_url,
              referenceImageStrength: body.reference_image_strength,
              tenantId,
            });
            if (retryResult.success) imageResult = retryResult;
          }
        } catch { /* critic é best-effort — falha silenciosamente */ }
      }

      return reply.send({
        success: true,
        layout: orchestrated.layout,
        imgPrompt: orchestrated.imgPrompt,
        visualStrategy: orchestrated.visualStrategy,
        brand_colors: clientBrandColors,
        image_url: imageResult.image_url,
        image_urls: imageResult.image_urls,
        image_error: imageResult.success ? undefined : imageResult.error,
        critique: critiqueResult,
      });
    }

    return reply.send({
      success: true,
      layout: orchestrated.layout,
      imgPrompt: orchestrated.imgPrompt,
      visualStrategy: orchestrated.visualStrategy,
      brand_colors: clientBrandColors,
      brand_tokens: clientBrandTokens,
    });
  });

  app.get('/studio/creative/da-memory', async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Tenant não encontrado' });

    try {
      const input = daMemorySchema.parse(request.query || {});
      const memory = await buildArtDirectionMemoryContext({
        tenantId,
        clientId: input.client_id,
        platform: input.platform,
        segment: input.segment,
        conceptCategories: input.concept_categories,
        conceptLimit: input.concept_limit,
        referenceLimit: input.reference_limit,
        trendLimit: input.trend_limit,
      });

      let concepts = await listRelevantArtDirectionConcepts({
        tenantId,
        categories: input.concept_categories,
        limit: input.concept_limit ?? 6,
      });

      if (!concepts.length) {
        for (const concept of CORE_ART_DIRECTION_CONCEPTS) {
          await upsertArtDirectionConcept(concept);
        }
        concepts = await listRelevantArtDirectionConcepts({
          tenantId,
          categories: input.concept_categories,
          limit: input.concept_limit ?? 6,
        });
      }

      const [references, pendingReferences, rejectedReferences, sources, trends, canons] = await Promise.all([
        listRelevantArtDirectionReferences({
          tenantId,
          clientId: input.client_id,
          platform: input.platform,
          segment: input.segment,
          limit: input.reference_limit ?? 8,
        }),
        listArtDirectionReferences({
          tenantId,
          clientId: input.client_id,
          platform: input.platform,
          segment: input.segment,
          statuses: ['discovered'],
          limit: Math.min((input.reference_limit ?? 8) * 2, 20),
        }),
        listArtDirectionReferences({
          tenantId,
          clientId: input.client_id,
          platform: input.platform,
          segment: input.segment,
          statuses: ['rejected'],
          limit: Math.min(input.reference_limit ?? 8, 12),
        }),
        listArtDirectionReferenceSources({
          tenantId,
        }),
        listArtDirectionTrendSignals({
          tenantId,
          clientId: input.client_id,
          platform: input.platform,
          segment: input.segment,
          limit: input.trend_limit ?? 6,
        }),
        listArtDirectionCanons({
          tenantId,
          includeEntries: true,
          limitEntriesPerCanon: 50,
        }).catch(() => []),
      ]);

      const stats = await getArtDirectionMemoryStats({
        tenantId,
        clientId: input.client_id,
        platform: input.platform,
        segment: input.segment,
      });

      return reply.send({ success: true, memory, concepts, canons, references, pendingReferences, rejectedReferences, sources, trends, stats });
    } catch (error: any) {
      request.log.error({ error }, '[studio/creative/da-memory] failed');
      const message = String(error?.message || '');
      const isSetupIssue =
        message.includes('da_') ||
        message.includes('relation') ||
        message.includes('does not exist') ||
        message.includes('foreign key') ||
        message.includes('invalid input syntax');

      if (isSetupIssue) {
        return reply.send({
          success: true,
          degraded: true,
          warning: 'da_memory_not_ready',
          memory: {
            promptBlock: '',
            critiqueBlock: '',
          },
          concepts: [],
          canons: [],
          references: [],
          pendingReferences: [],
          rejectedReferences: [],
          sources: [],
          trends: [],
          stats: {
            concepts: { active: 0 },
            references: {
              discovered: 0,
              analyzed: 0,
              rejected: 0,
              archived: 0,
              lastDiscoveredAt: null,
              lastAnalyzedAt: null,
            },
            trends: {
              snapshots: 0,
              lastSnapshotAt: null,
            },
            feedback: {
              used: 0,
              approved: 0,
              rejected: 0,
              saved: 0,
            },
          },
        });
      }

      return reply.status(500).send({ success: false, error: error?.message || 'Falha ao carregar memória de DA' });
    }
  });

  app.get('/studio/creative/da-memory/references', async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Tenant não encontrado' });

    const input = daReferenceListSchema.parse(request.query || {});
    const references = await listArtDirectionReferences({
      tenantId,
      clientId: input.client_id,
      platform: input.platform,
      segment: input.segment,
      statuses: input.statuses,
      limit: input.limit ?? 50,
    });

    return reply.send({ success: true, references });
  });

  app.get('/studio/creative/da-memory/references/:referenceId/preview', async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Tenant não encontrado' });

    const params = daReferenceParamsSchema.parse(request.params || {});
    const preview = await getArtDirectionReferencePreview({
      tenantId,
      id: params.referenceId,
    });

    if (!preview) {
      return reply.status(404).send({ success: false, error: 'Referência não encontrada' });
    }

    return reply.send({ success: true, preview });
  });

  app.post('/studio/creative/da-memory/references', async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Tenant não encontrado' });

    const body = daReferenceCreateSchema.parse(request.body || {});
    const reference = await createManualArtDirectionReference({
      tenantId,
      clientId: body.client_id,
      title: body.title,
      sourceUrl: body.source_url,
      platform: body.platform,
      format: body.format,
      segment: body.segment,
      visualIntent: body.visual_intent,
      creativeDirection: body.creative_direction,
      rationale: body.rationale,
      moodWords: body.mood_words,
      styleTags: body.style_tags,
      compositionTags: body.composition_tags,
      typographyTags: body.typography_tags,
      confidenceScore: body.confidence_score ?? null,
      trendScore: body.trend_score ?? null,
      status: body.status,
      metadata: {
        source: 'studio_da_manual',
        ...(body.metadata ?? {}),
      },
    });

    return reply.send({ success: true, reference });
  });

  app.patch('/studio/creative/da-memory/references/:referenceId', async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Tenant não encontrado' });

    const params = daReferenceParamsSchema.parse(request.params || {});
    const body = daReferenceUpdateSchema.parse(request.body || {});
    const reference = await updateArtDirectionReference({
      tenantId,
      id: params.referenceId,
      title: body.title,
      sourceUrl: body.source_url,
      platform: body.platform ?? undefined,
      format: body.format ?? undefined,
      segment: body.segment ?? undefined,
      visualIntent: body.visual_intent ?? undefined,
      creativeDirection: body.creative_direction ?? undefined,
      rationale: body.rationale ?? undefined,
      moodWords: body.mood_words ?? undefined,
      styleTags: body.style_tags ?? undefined,
      compositionTags: body.composition_tags ?? undefined,
      typographyTags: body.typography_tags ?? undefined,
      confidenceScore: body.confidence_score ?? undefined,
      trendScore: body.trend_score ?? undefined,
      status: body.status ?? undefined,
      metadata: body.metadata,
    });

    if (!reference) {
      return reply.status(404).send({ success: false, error: 'Referência não encontrada' });
    }

    return reply.send({ success: true, reference });
  });

  app.get('/studio/creative/da-memory/sources', async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Tenant não encontrado' });

    const sources = await listArtDirectionReferenceSources({ tenantId });
    return reply.send({ success: true, sources });
  });

  app.post('/studio/creative/da-memory/sources', async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Tenant não encontrado' });

    const body = daSourceSchema.parse(request.body || {});
    const source = await upsertArtDirectionReferenceSource({
      tenantId,
      name: body.name,
      sourceType: body.source_type,
      baseUrl: body.base_url,
      domain: body.domain,
      trustScore: body.trust_score,
      enabled: body.enabled,
      metadata: body.metadata,
    });

    return reply.send({ success: true, source });
  });

  app.patch('/studio/creative/da-memory/sources/:sourceId', async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Tenant não encontrado' });

    const params = z.object({ sourceId: z.string().uuid() }).parse(request.params || {});
    const body = daSourceSchema.parse(request.body || {});
    const source = await upsertArtDirectionReferenceSource({
      id: params.sourceId,
      tenantId,
      name: body.name,
      sourceType: body.source_type,
      baseUrl: body.base_url,
      domain: body.domain,
      trustScore: body.trust_score,
      enabled: body.enabled,
      metadata: body.metadata,
    });

    return reply.send({ success: true, source });
  });

  app.post('/studio/creative/da-memory/discover', async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Tenant não encontrado' });

    const body = daDiscoverSchema.parse(request.body || {});
    let clientName: string | null = null;
    let segment = body.segment ?? null;

    if (body.client_id) {
      try {
        const { getClientById } = await import('../repos/clientsRepo');
        const client = await getClientById(tenantId, body.client_id);
        clientName = client?.name ?? null;
        segment = segment ?? (client as any)?.segment_primary ?? null;
      } catch {
        // non-blocking
      }
    }

    const queries = body.queries?.length
      ? body.queries
      : [
          [body.category, body.mood, body.platform, 'ad design references'].filter(Boolean).join(' '),
          [segment, body.platform, 'campaign visual direction examples'].filter(Boolean).join(' '),
          [clientName, 'brand campaign inspiration'].filter(Boolean).join(' '),
        ].filter((value) => String(value || '').trim().length >= 3);

    const inserted = await discoverArtDirectionReferences({
      tenantId,
      clientId: body.client_id ?? null,
      clientName,
      segment,
      platform: body.platform ?? null,
      queries,
      maxResultsPerQuery: body.max_results_per_query ?? 4,
    });

    const stats = await getArtDirectionMemoryStats({
      tenantId,
      clientId: body.client_id,
      platform: body.platform,
      segment,
    });

    return reply.send({ success: true, inserted, queries, stats });
  });

  app.post('/studio/creative/da-memory/refresh', async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Tenant não encontrado' });

    const body = daRefreshSchema.parse(request.body || {});
    const analyzed = await analyzePendingArtDirectionReferences(body.limit ?? 12);
    const snapshots = await recomputeArtDirectionTrendSnapshots({
      tenantId,
      clientId: body.client_id,
      windowDays: body.window_days ?? 30,
      recentDays: body.recent_days ?? 7,
    });

    const stats = await getArtDirectionMemoryStats({
      tenantId,
      clientId: body.client_id,
      platform: body.platform,
      segment: body.segment,
    });

    return reply.send({ success: true, analyzed, snapshots, stats });
  });

  app.post('/studio/creative/da-memory/feedback', async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    const userId = (request.user as any)?.sub as string | undefined;
    if (!tenantId) return reply.status(401).send({ success: false, error: 'Tenant não encontrado' });

    const body = daFeedbackSchema.parse(request.body || {});
    await recordArtDirectionFeedbackEvent({
      tenantId,
      clientId: body.client_id,
      creativeSessionId: body.creative_session_id,
      referenceId: body.reference_id,
      eventType: body.event_type,
      score: body.score ?? null,
      notes: body.notes ?? null,
      metadata: body.metadata ?? {},
      createdBy: userId ?? null,
    });

    return reply.send({ success: true });
  });

  // GET /studio/creative/da-analytics — aggregated performance analytics for the DA motor
  app.get('/studio/creative/da-analytics', async (request: any, reply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    if (!tenantId) return reply.status(401).send({ success: false });

    const { client_id, platform, days: daysStr } = (request.query ?? {}) as {
      client_id?: string;
      platform?: string;
      days?: string;
    };
    const days = Math.min(Math.max(parseInt(daysStr || '30', 10), 7), 365);

    const clientFilter   = client_id ? `AND tenant_id = '${tenantId}' AND client_id = '${client_id}'` : `AND tenant_id = '${tenantId}'`;
    const platformFilter = platform  ? `AND platform = '${platform.replace(/'/g, "''")}'` : '';

    const { query: q } = await import('../db');

    // ── 1. Gatilhos: approved/performed feedback grouped by trigger in metadata
    const { rows: triggersRaw } = await q(
      `SELECT
         COALESCE(metadata->>'trigger', 'desconhecido') AS trigger_id,
         COUNT(*) FILTER (WHERE event_type IN ('approved','performed')) AS positive,
         COUNT(*) FILTER (WHERE event_type = 'rejected') AS negative,
         ROUND(AVG(CASE WHEN event_type IN ('approved','performed') THEN 100 ELSE 0 END), 1) AS approval_rate
       FROM da_feedback_events
       WHERE tenant_id = $1
         AND created_at >= now() - ($2 || ' days')::interval
         AND metadata ? 'trigger'
       GROUP BY trigger_id
       ORDER BY positive DESC
       LIMIT 10`,
      [tenantId, `${days}`],
    );

    // ── 2. Conceitos: top concepts by trust_score
    const { rows: concepts } = await q(
      `SELECT
         slug,
         title,
         category,
         ROUND(trust_score::numeric * 100, 1) AS score,
         ROUND(100 - trust_score::numeric * 100, 1) AS rejection_rate
       FROM art_direction_concepts
       WHERE (tenant_id = $1 OR tenant_id IS NULL)
       ORDER BY trust_score DESC
       LIMIT 12`,
      [tenantId],
    );

    // ── 3. Trends: latest snapshot with momentum
    const { rows: trends } = await q(
      `SELECT DISTINCT ON (cluster_key)
         tag,
         cluster_key,
         platform,
         segment,
         ROUND(momentum::numeric, 2)   AS momentum,
         ROUND(trend_score::numeric, 1) AS trend_score,
         recent_count,
         previous_count
       FROM da_trend_snapshots
       WHERE tenant_id = $1
         ${platformFilter}
       ORDER BY cluster_key, snapshot_at DESC`,
      [tenantId],
    );
    const topTrends = trends
      .sort((a: any, b: any) => b.trend_score - a.trend_score)
      .slice(0, 20);

    // ── 4. Plataforma × Estilo: references aggregated by platform + first style_tag
    const { rows: matrixRaw } = await q(
      `SELECT
         COALESCE(platform, 'outros')      AS platform,
         COALESCE(style_tags->>0, 'outro') AS style,
         COUNT(*)                          AS count,
         ROUND(AVG(confidence_score) * 100, 1) AS avg_confidence
       FROM da_references
       WHERE tenant_id = $1
         ${clientFilter.replace(`AND tenant_id = '${tenantId}'`, '').replace(`AND tenant_id = '${tenantId}' AND client_id = '${client_id}'`, client_id ? `AND client_id = '${client_id}'` : '')}
         AND confidence_score IS NOT NULL
         AND style_tags IS NOT NULL
         AND jsonb_array_length(style_tags) > 0
       GROUP BY platform, style
       ORDER BY count DESC
       LIMIT 30`,
      [tenantId],
    );

    return reply.send({
      success: true,
      data: {
        triggers: triggersRaw,
        concepts,
        trends: topTrends,
        platform_style_matrix: matrixRaw,
        window_days: days,
      },
    });
  });

  // ── Director AI — analyzes creative alignment with briefing ──────────────
  const directorSchema = z.object({
    briefing_title: z.string().min(1),
    briefing_payload: z.record(z.any()).optional(),
    step: z.enum(['briefing', 'copy', 'trigger', 'arte', 'final']),
    content: z.string().min(1),
  });

  const TRIGGER_DEFINITIONS = [
    { id: 'G01', name: 'Escassez', description: 'Urgência por quantidade ou tempo limitado' },
    { id: 'G02', name: 'Autoridade', description: 'Credibilidade, números, especialistas' },
    { id: 'G03', name: 'Prova Social', description: 'Depoimentos, comunidade, aprovação coletiva' },
    { id: 'G04', name: 'Reciprocidade', description: 'Dar valor antes de pedir' },
    { id: 'G05', name: 'Curiosidade', description: 'Lacuna de informação, intriga, mistério' },
    { id: 'G06', name: 'Identidade', description: 'Pertencimento, "você é assim", estilo de vida' },
    { id: 'G07', name: 'Dor/Solução', description: 'Nomear o problema e apresentar alívio' },
  ];

  app.post('/studio/creative/director-analyze', async (request: any, reply) => {
    const body = directorSchema.parse(request.body);
    try {
      const { generateCompletion } = await import('../services/ai/claudeService');
      const objective = body.briefing_payload?.objective
        || body.briefing_payload?.goal
        || body.briefing_title;
      const audience = body.briefing_payload?.audience || body.briefing_payload?.target_audience || '';
      const tone = body.briefing_payload?.tone || '';
      const contentContext = JSON.stringify(body.content).slice(0, 600);

      // ── Briefing step: recommend pipeline + triggers ──────────────────────────
      if (body.step === 'briefing') {
        const prompt = `You are a creative director preparing to generate advertising copy.

BRIEFING:
Title: ${body.briefing_title}
Objective: ${objective}
${audience ? `Audience: ${audience}` : ''}
${tone ? `Tone: ${tone}` : ''}
Context: ${contentContext}

AVAILABLE PSYCHOLOGICAL TRIGGERS:
${TRIGGER_DEFINITIONS.map((t) => `${t.id}: ${t.name} — ${t.description}`).join('\n')}

Based on the briefing, recommend:
1. The best copy pipeline (simple/standard/premium/collaborative/adversarial) with a brief reason
2. Rank ALL 7 triggers by relevance for this specific campaign, with a short reason each

Return ONLY a JSON object with no markdown:
{
  "recommendation": "<1 sentence in Portuguese recommending the pipeline type and why>",
  "confidence": "high",
  "trigger_recommendations": [
    { "id": "G01", "score": <0-100>, "reason": "<why this fits or doesn't fit, 1 short sentence PT-BR>" },
    ...all 7 triggers ranked by score desc...
  ]
}`;

        const result = await generateCompletion({ prompt, maxTokens: 600, temperature: 0.3 });
        let raw = result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(raw);
        return reply.send({ success: true, ...parsed });
      }

      // ── Copy/Trigger/Arte steps: evaluate alignment ───────────────────────────
      const stepLabels: Record<string, string> = {
        copy: 'texto de copy/legenda',
        trigger: 'gatilho psicológico escolhido',
        arte: 'direção de arte + descrição de imagem',
        final: 'peça criativa final',
      };
      const prompt = `You are a creative director reviewing a ${stepLabels[body.step] || body.step} for an advertising campaign.

CAMPAIGN BRIEFING:
Objective: ${objective}
${audience ? `Target Audience: ${audience}` : ''}

CREATIVE BEING REVIEWED (${body.step}):
${body.content.slice(0, 600)}

Evaluate whether this creative element is aligned with the briefing objective.
Return ONLY a JSON object with no markdown:
{
  "score": <number 0-10>,
  "aligned": <boolean, true if score >= 7>,
  "message": "<1 sentence in Portuguese about alignment>",
  "suggestions": ["<0-2 short actionable suggestions in Portuguese if not fully aligned>"]
}`;

      const result = await generateCompletion({ prompt, maxTokens: 300, temperature: 0.3 });
      let raw = result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(raw);
      return reply.send({ success: true, insight: { ...parsed, step: body.step } });
    } catch {
      return reply.send({ success: false });
    }
  });

  // ── Video Script — generate scene breakdown from approved copy ────────────
  const videoScriptSchema = z.object({
    copy_title: z.string().min(1),
    copy_body: z.string().optional(),
    copy_cta: z.string().optional(),
    platform: z.string().optional(),
    format: z.string().optional(),
    duration_seconds: z.number().default(30),
  });

  app.post('/studio/creative/video-script', async (request: any, reply) => {
    const body = videoScriptSchema.parse(request.body);
    try {
      const { generateCompletion } = await import('../services/ai/claudeService');
      const totalSec = body.duration_seconds;
      const hookSec = Math.round(totalSec * 0.15);
      const devSec = Math.round(totalSec * 0.65);
      const ctaSec = totalSec - hookSec - devSec;

      const prompt = `You are a video scriptwriter for social media.

APPROVED COPY:
Title/Headline: ${body.copy_title}
${body.copy_body ? `Body: ${body.copy_body}` : ''}
${body.copy_cta ? `CTA: ${body.copy_cta}` : ''}
${body.platform ? `Platform: ${body.platform}` : ''}
${body.format ? `Format: ${body.format}` : ''}
Total duration: ${totalSec}s

Create a video script with exactly 3 scenes adapted to this duration:
- Hook (0-${hookSec}s): Attention-grabbing opening
- Development (${hookSec}-${hookSec + devSec}s): Core message delivery
- CTA (${hookSec + devSec}-${totalSec}s): Call to action

Return ONLY a JSON object, no markdown:
{
  "scenes": [
    {
      "id": "hook",
      "label": "Hook",
      "duration_label": "0-${hookSec}s",
      "narration": "<spoken text in PT-BR, max 2 sentences>",
      "visual": "<visual description: camera angle, subject, action, mood>",
      "duration_seconds": ${hookSec}
    },
    {
      "id": "dev",
      "label": "Desenvolvimento",
      "duration_label": "${hookSec}-${hookSec + devSec}s",
      "narration": "<spoken text in PT-BR, max 3 sentences>",
      "visual": "<visual description>",
      "duration_seconds": ${devSec}
    },
    {
      "id": "cta",
      "label": "CTA",
      "duration_label": "${hookSec + devSec}-${totalSec}s",
      "narration": "<CTA spoken text in PT-BR, 1 sentence>",
      "visual": "<visual description with brand elements>",
      "duration_seconds": ${ctaSec}
    }
  ],
  "total_seconds": ${totalSec},
  "style_note": "<1 sentence about overall visual style and tone>"
}`;

      const result = await generateCompletion({ prompt, maxTokens: 800, temperature: 0.5 });
      let raw = result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(raw);
      return reply.send({ success: true, data: parsed });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Agente Crítico — quality gate: scores copy against brief + brand voice ──
  const criticaSchema = z.object({
    copy:              z.string().min(1),
    briefing_title:    z.string().optional(),
    briefing_payload:  z.record(z.any()).optional(),
    format:            z.string().optional(),
    platform:          z.string().optional(),
    trigger:           z.string().optional(),
    tone:              z.string().optional(),
    amd:               z.string().optional(),
  });

  app.post('/studio/creative/critique', async (request: any, reply) => {
    const body = criticaSchema.parse(request.body);
    try {
      const { generateCompletion } = await import('../services/ai/claudeService');

      const prompt = `Você é um Agente Crítico especializado em qualidade de copy publicitário.
Analise o copy abaixo contra os critérios fornecidos e retorne um JSON de avaliação.

COPY:
${body.copy}

CRITÉRIOS:
- Briefing: ${body.briefing_title ?? 'não informado'}
- Objetivo: ${body.briefing_payload?.objective ?? 'não informado'}
- Plataforma: ${body.platform ?? 'não informada'} / Formato: ${body.format ?? 'não informado'}
- Gatilho psicológico alvo: ${body.trigger ?? 'nenhum'}
- Tom de voz: ${body.tone ?? 'não definido'}
- Ação Mais Desejada (AMD): ${body.amd ?? 'não definida'}

Avalie 5 dimensões de 0 a 100 (sem decimais).
Limiar de aprovação geral: 72/100.

Retorne SOMENTE um JSON válido:
{
  "overall": <número 0-100>,
  "passed": <boolean true se overall >= 72>,
  "dimensions": [
    { "label": "Alinhamento ao Briefing", "score": <0-100>, "note": "<problema específico se score<72, senão null>" },
    { "label": "Voz da Marca", "score": <0-100>, "note": "<problema ou null>" },
    { "label": "Fit com AMD", "score": <0-100>, "note": "<problema ou null>" },
    { "label": "Consistência do Gatilho", "score": <0-100>, "note": "<problema ou null>" },
    { "label": "Carga Cognitiva", "score": <0-100>, "note": "<problema ou null>" }
  ],
  "issues": ["<problema 1 em PT-BR>", "<problema 2>"],
  "suggestions": ["<sugestão 1 acionável em PT-BR>", "<sugestão 2>"]
}`;

      const result = await generateCompletion({ prompt, maxTokens: 600, temperature: 0.2 });
      let raw = result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(raw);
      return reply.send({ success: true, data: parsed });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Agente Redator — 5-plugin chain ──────────────────────────────────────
  const copyChainSchema = z.object({
    briefing:      z.object({ title: z.string().optional(), payload: z.any().optional() }).optional(),
    clientProfile: z.any().optional(),
    trigger:       z.string().optional(),
    tone:          z.string().optional(),
    amd:           z.string().optional(),
    platform:      z.string().optional(),
    format:        z.string().optional(),
    taskType:      z.string().optional(),
    count:         z.coerce.number().int().min(1).max(3).default(3),
    // Plugin-level overrides (from frontend parameter controls)
    brandVoiceOverride: z.object({
      tom:              z.string().optional(),
      palavras_proibidas: z.array(z.string()).optional(),
      persona:          z.string().optional(),
      estilo:           z.string().optional(),
      emocao_alvo:      z.string().optional(),
    }).optional(),
    strategyOverride: z.object({
      structure:   z.string().optional(),
      hooks:       z.array(z.string()).optional(),
      angles:      z.array(z.string()).optional(),
      key_tension: z.string().optional(),
    }).optional(),
    appealsOverride: z.array(z.enum(['dor', 'logica', 'prova_social'])).optional(),
  });

  app.post('/studio/creative/copy-chain', async (request: any, reply) => {
    const body = copyChainSchema.parse(request.body);
    try {
      const { runAgentRedator, AgentRedatorParams } = await import('../services/ai/agentRedator') as any;
      const params = {
        briefing:      body.briefing,
        clientProfile: body.clientProfile,
        trigger:       body.trigger,
        tone:          body.tone,
        amd:           body.amd,
        platform:      body.platform,
        format:        body.format,
        taskType:      body.taskType,
        count:         body.count,
        brandVoiceOverride: body.brandVoiceOverride,
        strategyOverride:   body.strategyOverride,
        appealsOverride:    body.appealsOverride,
      };
      const result = await runAgentRedator(params);
      return reply.send({ success: true, data: result });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── POST /studio/creative/conceito — gera conceitos criativos antes da copy ──
  app.post('/studio/creative/conceito', { preHandler: [authGuard] }, async (request: any, reply) => {
    const body = request.body as {
      briefing?: { title?: string; objective?: string; context?: string };
      clientProfile?: any;
      clientId?: string;
      platform?: string;
      conceptCount?: number;
    };
    try {
      const { runAgentConceito } = await import('../services/ai/agentConceito') as any;

      let cultureBlock: string | null = null;
      if (body.clientId) {
        try {
          const { buildCultureBriefing } = await import('../services/cultureBriefingService') as any;
          const tenantId = (request as any).user?.tenant_id as string;
          const segmentKw = body.clientProfile?.segment_primary ? [body.clientProfile.segment_primary] : [];
          const cb = await buildCultureBriefing(body.clientId, tenantId, segmentKw);
          cultureBlock = cb.culture_block || null;
        } catch { /* culture block is optional */ }
      }

      const result = await runAgentConceito({
        briefing:      body.briefing,
        clientProfile: body.clientProfile,
        platform:      body.platform,
        cultureBlock,
        conceptCount:  body.conceptCount,
      });

      return reply.send({ success: true, data: result });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── POST /studio/creative/sequence — gera plano de campanha sequencial ──
  app.post('/studio/creative/sequence', { preHandler: [authGuard] }, async (request: any, reply) => {
    const body = request.body as {
      objective: string;
      clientProfile?: any;
      clientId?: string;
      platform?: string;
      phases?: number;
      concept?: any;
    };
    try {
      const { generateSequencePlan } = await import('../services/ai/agentConceito');

      let cultureBlock: string | null = null;
      if (body.clientId) {
        try {
          const { buildCultureBriefing } = await import('../services/cultureBriefingService') as any;
          const tenantId = (request as any).user?.tenant_id as string;
          const cb = await buildCultureBriefing(body.clientId, tenantId, []);
          cultureBlock = cb.culture_block || null;
        } catch { /* optional */ }
      }

      const plan = await generateSequencePlan(
        {
          objective: body.objective,
          clientProfile: body.clientProfile,
          platform: body.platform,
          phases: body.phases,
          cultureBlock,
        },
        body.concept ?? null,
      );

      return reply.send({ success: true, data: plan });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── POST /studio/creative/audit-alignment — Gemini multimodal copy+art check ──
  app.post('/studio/creative/audit-alignment', { preHandler: [authGuard] }, async (request: any, reply) => {
    const { copy_text, image_url, brand_tone } = request.body as {
      copy_text: string;
      image_url: string;
      brand_tone?: string;
    };
    if (!copy_text || !image_url) {
      return reply.status(400).send({ success: false, error: 'copy_text and image_url are required' });
    }
    try {
      const { auditCopyArtAlignment } = await import('../services/ai/agentAuditor');
      const result = await auditCopyArtAlignment(copy_text, image_url, brand_tone);
      return reply.send({ success: true, data: result });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Design Agent — parse natural language brief into structured params ────
  const parseBriefSchema = z.object({
    text: z.string().min(5),
    briefingTitle: z.string().optional(),
  });

  app.post('/studio/creative/parse-brief', async (request: any, reply) => {
    const body = parseBriefSchema.parse(request.body);
    try {
      const { generateCompletion } = await import('../services/ai/claudeService');

      const prompt = `Você é um estrategista de marketing digital. Analise o texto de briefing abaixo e extraia os parâmetros estruturados para uma campanha publicitária.

BRIEFING LIVRE:
"""
${body.text}
"""
${body.briefingTitle ? `\nTítulo do briefing: ${body.briefingTitle}` : ''}

Extraia e retorne SOMENTE um JSON válido (sem markdown) com os seguintes campos:

{
  "tone": "<tom de voz em 2-4 palavras, ex: 'jovem e energético', 'sofisticado e elegante'>",
  "amd": "<ação mais desejada: 'clicar', 'comprar', 'cadastrar', 'ligar', 'visitar loja', 'seguir', 'compartilhar'>",
  "funnelPhase": "<fase do funil: 'consciencia', 'consideracao', 'decisao', 'fidelizacao'>",
  "platforms": ["<lista de plataformas mencionadas ou inferidas: Instagram, TikTok, Facebook, LinkedIn, YouTube>"],
  "suggestedTrigger": "<gatilho mais adequado: G01=Escassez, G02=Autoridade, G03=Prova Social, G04=Reciprocidade, G05=Curiosidade, G06=Identidade, G07=Dor/Solução>",
  "suggestedRecipe": "<receita de copy mais adequada: receptor_sonhador, receptor_logico, receptor_emocional, receptor_social, receptor_urgente>",
  "ingredients": ["<lista de ingredientes ativos: tone, amd, funnel, trigger, recipe, platform>"],
  "briefingSummary": "<resumo do objetivo da campanha em 1 frase em PT-BR>"
}

Regras:
- Se não houver plataforma explícita, infira pelo contexto (produto jovem → Instagram/TikTok, B2B → LinkedIn)
- O gatilho deve ser o que MELHOR se encaixa na proposta de valor descrita
- ingredients deve conter apenas os campos que foram claramente identificados no texto`;

      const result = await generateCompletion({ prompt, maxTokens: 500, temperature: 0.2 });
      let raw = result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(raw);
      return reply.send({ success: true, ...parsed });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Agente Diretor de Arte — 6-plugin chain ──────────────────────────────
  const arteChainSchema = z.object({
    copy:          z.string().optional(),
    briefing:      z.object({ title: z.string().optional(), payload: z.any().optional() }).optional(),
    clientProfile: z.any().optional(),
    trigger:       z.string().optional(),
    platform:      z.string().optional(),
    format:        z.string().optional(),
    aspectRatio:   z.string().optional(),
    camera:        z.string().optional(),
    lighting:      z.string().optional(),
    composition:   z.string().optional(),
    brandVisualOverride: z.object({
      primaryColor:   z.string().optional(),
      styleKeywords:  z.array(z.string()).optional(),
      moodKeywords:   z.array(z.string()).optional(),
      avoidElements:  z.array(z.string()).optional(),
      loraId:         z.string().nullable().optional(),
      loraScale:      z.number().optional(),
      referenceStyle: z.string().optional(),
    }).optional(),
    payloadOverride: z.object({
      prompt:            z.string().optional(),
      negativePrompt:    z.string().optional(),
      model:             z.string().optional(),
      guidanceScale:     z.number().optional(),
      numInferenceSteps: z.number().optional(),
    }).optional(),
    generateMultiFormat: z.boolean().optional(),
    brandPack: z.boolean().optional(),
    visualReferences: z.array(z.string().url()).max(6).optional(),
  });

  app.post('/studio/creative/arte-chain', async (request: any, reply) => {
    const body = arteChainSchema.parse(request.body);
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    try {
      const { runAgentDiretorArte } = await import('../services/ai/agentDiretorArte') as any;
      const result = await runAgentDiretorArte({ ...body, tenantId });
      return reply.send({ success: true, data: result });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Visual Insights — search reference images for DA context ────────────
  const visualInsightsSchema = z.object({
    category: z.string().min(2),
    mood:     z.string().optional(),
    platform: z.string().optional().default('Instagram'),
    client_id: clientIdSchema.optional(),
  });

  app.post('/studio/creative/visual-insights', async (request: any, reply) => {
    const body = visualInsightsSchema.parse(request.body);
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    try {
      let memoryReferences: Array<{ url: string; title: string; description: string; relevanceScore: number }> = [];
      if (tenantId) {
        const stored = await listRelevantArtDirectionReferences({
          tenantId,
          clientId: body.client_id,
          platform: body.platform,
          segment: body.category,
          limit: 6,
        }).catch(() => []);

        memoryReferences = stored.map((reference: any, index: number) => ({
          url: reference.source_url,
          title: reference.title,
          description: reference.rationale || reference.creative_direction || '',
          relevanceScore: Math.max(
            0.3,
            Number(reference.trend_score || 0) / 100 || 1 - index * 0.1,
          ),
        }));
      }

      const query = `${body.category} ${body.mood ?? ''} advertising creative ${body.platform} 2024 site:behance.net OR site:dribbble.com OR site:pinterest.com OR site:instagram.com`.trim();

      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        if (memoryReferences.length) {
          return reply.send({ success: true, references: memoryReferences, source: 'memory' });
        }
        return reply.status(503).send({ success: false, error: 'TAVILY_API_KEY não configurada' });
      }

      // Call Tavily with include_images=true for image URLs
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: 'basic',
          max_results: 6,
          include_images: true,
          include_answer: false,
        }),
        signal: AbortSignal.timeout(9000),
      });

      if (!res.ok) return reply.status(502).send({ success: false, error: 'Tavily search failed' });

      const data = await res.json() as {
        results?: Array<{ title: string; url: string; content?: string }>;
        images?: string[];
      };

      // Prefer direct image URLs from Tavily's image search
      const imageUrls: string[] = (data.images ?? [])
        .filter((u: string) => /\.(jpg|jpeg|png|webp)(\?|$)/i.test(u) || u.includes('cdn') || u.includes('images'))
        .slice(0, 6);

      // Fallback: use page URLs from results if no images
      const webReferences = imageUrls.length >= 3
        ? imageUrls.map((url, i) => ({
            url,
            title: data.results?.[i]?.title ?? `Referência ${i + 1}`,
            description: '',
            relevanceScore: 1 - i * 0.1,
          }))
        : (data.results ?? []).slice(0, 6).map((r, i) => ({
            url: r.url,
            title: r.title,
            description: (r.content ?? '').slice(0, 120),
            relevanceScore: 1 - i * 0.1,
          }));

      const references = [...memoryReferences, ...webReferences]
        .filter((item, index, arr) => arr.findIndex((current) => current.url === item.url) === index)
        .slice(0, 6);

      return reply.send({
        success: true,
        references,
        source: memoryReferences.length ? 'memory+web' : 'web',
      });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Touch Edit — img2img style/variation via Fal.ai flux-dev ────────────
  const editImageSchema = z.object({
    imageUrl:    z.string().url(),
    mode:        z.enum(['style', 'variation', 'inpaint']),
    prompt:      z.string().optional(),
    strength:    z.number().min(0.1).max(0.95).default(0.45),
    aspectRatio: z.string().optional().default('1:1'),
  });

  app.post('/studio/creative/edit-image', async (request: any, reply) => {
    const body = editImageSchema.parse(request.body);
    try {
      // ── Inpaint & Variation: true img2img (content-guided) ──────────────
      if (body.mode === 'inpaint' || body.mode === 'variation') {
        const { generateImg2ImgWithFal } = await import('../services/ai/falAiService');

        const prompt = body.mode === 'inpaint' && body.prompt
          ? `${body.prompt}, high quality, professional advertising photography, photorealistic`
          : 'high quality variation, same concept and composition, photorealistic advertising creative';

        const result = await generateImg2ImgWithFal({
          prompt,
          imageUrl:    body.imageUrl,
          strength:    body.mode === 'inpaint' ? (body.strength ?? 0.85) : 0.70,
          aspectRatio: body.aspectRatio,
        });

        return reply.send({ success: true, imageUrl: result.imageUrl });
      }

      // ── Style: IP-Adapter style guidance (mood transfer) ────────────────
      const { generateImageWithFal } = await import('../services/ai/falAiService');

      const moodPrompts: Record<string, string> = {
        minimalista:     'minimal clean aesthetic, white space, simple elegant composition, muted tones',
        dramatico:       'dramatic cinematic lighting, deep shadows, high contrast, moody atmosphere',
        vibrante:        'vibrant bold colors, energetic dynamic composition, saturated vivid palette',
        natural:         'natural soft light, organic textures, warm earthy tones, outdoor lifestyle',
        cinematografico: 'cinematic widescreen, film grain, bokeh, golden hour, editorial photography',
      };

      const stylePrompt = body.prompt
        ? `${moodPrompts[body.prompt.toLowerCase()] ?? body.prompt}, high quality advertising creative`
        : 'high quality advertising creative, professional composition';

      const result = await generateImageWithFal({
        prompt:                 stylePrompt,
        aspectRatio:            body.aspectRatio,
        numImages:              1,
        model:                  'flux-dev',
        referenceImageUrl:      body.imageUrl,
        referenceImageStrength: body.strength,
      });

      return reply.send({ success: true, imageUrl: result.imageUrl });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Remove Background — fal.ai BiRefNet ───────────────────────────────────
  const removeBgSchema = z.object({ imageUrl: z.string().url() });

  app.post('/studio/creative/remove-bg', async (request: any, reply) => {
    const body = removeBgSchema.parse(request.body);
    try {
      const { removeBackgroundWithFal } = await import('../services/ai/falAiService');
      const result = await removeBackgroundWithFal(body.imageUrl);
      return reply.send({ success: true, imageUrl: result.imageUrl });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Upscale — fal.ai Clarity Upscaler ────────────────────────────────────
  const upscaleSchema = z.object({
    imageUrl:    z.string().url(),
    scaleFactor: z.number().int().min(2).max(4).optional(),
  });

  app.post('/studio/creative/upscale', async (request: any, reply) => {
    const body = upscaleSchema.parse(request.body);
    try {
      const { upscaleWithFal } = await import('../services/ai/falAiService');
      const result = await upscaleWithFal(body.imageUrl, (body.scaleFactor ?? 4) as 2 | 4);
      return reply.send({ success: true, imageUrl: result.imageUrl });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Image → Video — fal.ai Kling ─────────────────────────────────────────
  const imageToVideoSchema = z.object({
    imageUrl: z.string().url(),
    prompt:   z.string().optional(),
    duration: z.number().int().min(5).max(10).optional(),
  });

  app.post('/studio/creative/image-to-video', async (request: any, reply) => {
    const body = imageToVideoSchema.parse(request.body);
    try {
      const { imageToVideoWithFal } = await import('../services/ai/falAiService');
      const result = await imageToVideoWithFal({
        imageUrl: body.imageUrl,
        prompt:   body.prompt,
        duration: (body.duration ?? 5) as 5 | 10,
      });
      return reply.send({ success: true, videoUrl: result.videoUrl });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Plugin 4 DA: Arte Visual Critique ─────────────────────────────────────
  const arteSchema = z.object({
    image_url:      z.string(),
    copy_text:      z.string().optional(),
    briefing_title: z.string().optional(),
    platform:       z.string().optional(),
    trigger:        z.string().optional(),
  });

  app.post('/studio/creative/critique-arte', async (request: any, reply) => {
    const body = arteSchema.parse(request.body);
    try {
      const { generateCompletion } = await import('../services/ai/claudeService');

      const prompt = `Você é um Diretor de Arte especializado em crítica visual de peças publicitárias digitais.
Analise a imagem na URL abaixo (considere-a como descrita pelos parâmetros de contexto) e avalie a qualidade visual.

CONTEXTO:
- URL da imagem: ${body.image_url}
- Plataforma: ${body.platform ?? 'não informada'}
- Gatilho psicológico: ${body.trigger ?? 'nenhum'}
- Copy vinculada: ${body.copy_text ? body.copy_text.slice(0, 300) : 'não informada'}
- Briefing: ${body.briefing_title ?? 'não informado'}

Avalie 4 dimensões visuais de 0 a 100 (sem decimais).
Limiar de aprovação: 72/100.

Retorne SOMENTE um JSON válido:
{
  "overall": <número 0-100>,
  "passed": <boolean true se overall >= 72>,
  "dimensions": [
    { "label": "Qualidade de Renderização", "score": <0-100>, "note": "<problema específico se score<72, senão null>" },
    { "label": "Contraste do Texto",        "score": <0-100>, "note": "<problema ou null>" },
    { "label": "Hierarquia Visual",         "score": <0-100>, "note": "<problema ou null>" },
    { "label": "Coerência Copy↔Imagem",     "score": <0-100>, "note": "<problema ou null>" }
  ],
  "issues": ["<problema visual 1 em PT-BR>", "<problema 2>"],
  "suggestions": ["<sugestão acionável 1 em PT-BR>", "<sugestão 2>"]
}`;

      const result = await generateCompletion({ prompt, maxTokens: 500, temperature: 0.2 });
      let raw = result.text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(raw);
      return reply.send({ success: true, data: parsed });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Pipeline Session — save/restore canvas state across refreshes ─────────

  app.get('/studio/pipeline/:briefingId/session', async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const { briefingId } = request.params as { briefingId: string };
    const { rows } = await query(
      `SELECT state FROM pipeline_sessions WHERE briefing_id = $1 AND tenant_id = $2`,
      [briefingId, tenantId]
    );
    return reply.send({ success: true, state: rows[0]?.state ?? {} });
  });

  app.patch('/studio/pipeline/:briefingId/session', async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const { briefingId } = request.params as { briefingId: string };
    const state = request.body as Record<string, any>;
    await query(
      `INSERT INTO pipeline_sessions (briefing_id, tenant_id, state, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (briefing_id) DO UPDATE
         SET state = EXCLUDED.state, updated_at = NOW()`,
      [briefingId, tenantId, JSON.stringify(state)]
    );
    return reply.send({ success: true });
  });

  // ── Biblioteca de Peças — save/list generated creatives ──────────────────

  const bibliotecaSchema = z.object({
    client_id:     z.string().uuid().optional(),
    briefing_id:   z.string().uuid().optional(),
    platform:      z.string().optional(),
    format:        z.string().optional(),
    trigger_id:    z.string().optional(),
    copy_title:    z.string().optional(),
    copy_body:     z.string().optional(),
    copy_cta:      z.string().optional(),
    copy_legenda:  z.string().optional(),
    image_url:     z.string().optional(),
    recipe_name:   z.string().optional(),
    pipeline_type: z.string().optional(),
  });

  app.post('/studio/biblioteca', async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const body = bibliotecaSchema.parse(request.body);
    const { rows } = await query(
      `INSERT INTO studio_creatives
         (tenant_id, client_id, briefing_id, platform, format, trigger_id,
          copy_title, copy_body, copy_cta, copy_legenda, image_url, recipe_name, pipeline_type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING id, created_at`,
      [
        tenantId,
        body.client_id ?? null, body.briefing_id ?? null,
        body.platform ?? null, body.format ?? null, body.trigger_id ?? null,
        body.copy_title ?? null, body.copy_body ?? null, body.copy_cta ?? null,
        body.copy_legenda ?? null, body.image_url ?? null,
        body.recipe_name ?? null, body.pipeline_type ?? 'standard',
      ]
    );
    return reply.send({ success: true, data: rows[0] });
  });

  app.get('/studio/biblioteca', async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const { client_id, platform, trigger_id, status, limit = '20', offset = '0' } = request.query as Record<string, string>;
    const conditions: string[] = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    if (client_id)  { conditions.push(`client_id = $${params.push(client_id)}`); }
    if (platform)   { conditions.push(`platform = $${params.push(platform)}`); }
    if (trigger_id) { conditions.push(`trigger_id = $${params.push(trigger_id)}`); }
    if (status)     { conditions.push(`status = $${params.push(status)}`); }
    const whereClause = conditions.join(' AND ');
    const whereParams = [...params]; // snapshot before adding LIMIT/OFFSET
    const { rows } = await query(
      `SELECT * FROM studio_creatives
       WHERE ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.push(parseInt(limit, 10) || 20)}
       OFFSET $${params.push(parseInt(offset, 10) || 0)}`,
      params
    );
    const { rows: countRows } = await query(
      `SELECT COUNT(*)::int AS total FROM studio_creatives WHERE ${whereClause}`,
      whereParams
    );
    return reply.send({ success: true, data: rows, total: countRows[0]?.total ?? 0 });
  });

  app.patch('/studio/biblioteca/:id', async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const { id } = request.params as { id: string };
    const { status } = request.body as { status: string };
    await query(
      `UPDATE studio_creatives SET status = $1 WHERE id = $2 AND tenant_id = $3`,
      [status, id, tenantId]
    );
    return reply.send({ success: true });
  });

  app.delete('/studio/biblioteca/:id', async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const { id } = request.params as { id: string };
    await query(`DELETE FROM studio_creatives WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    return reply.send({ success: true });
  });

  // ── Publicar no Meta (Instagram / Facebook) ──────────────────────────────

  app.post('/studio/creative/publish-meta', async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const { client_id, image_url, caption, briefing_id, creative_id, campaign_format_id } = request.body as {
      client_id: string;
      image_url: string;
      caption: string;
      briefing_id?: string;
      creative_id?: string;
      campaign_format_id?: string;
    };

    if (!client_id || !image_url || !caption) {
      return reply.status(400).send({ success: false, error: 'client_id, image_url, and caption are required' });
    }

    // Fetch Meta connector for this client
    const { rows: connectorRows } = await query(
      `SELECT payload, secrets_enc FROM connectors WHERE tenant_id = $1 AND client_id = $2 AND provider = 'meta' LIMIT 1`,
      [tenantId, client_id]
    );
    if (!connectorRows.length) {
      return reply.status(400).send({ success: false, error: 'Meta connector not found for this client. Connect via OAuth first.' });
    }

    const connector = connectorRows[0];
    const payload = connector.payload as Record<string, any>;
    const secrets = connector.secrets_enc ? await decryptJSON(connector.secrets_enc) : {};
    const accessToken = secrets.access_token as string | undefined;

    if (!accessToken) {
      return reply.status(400).send({ success: false, error: 'Meta access token missing for this client.' });
    }

    const META_GRAPH_VERSION = 'v18.0';
    const igUserId = payload.instagram_business_id as string | undefined;
    const pageId = payload.page_id as string | undefined;

    let postId: string | null = null;
    let platform: string;

    try {
      if (igUserId) {
        // Instagram: two-step (create container → publish)
        platform = 'Instagram';
        const createRes = await fetch(
          `https://graph.facebook.com/${META_GRAPH_VERSION}/${igUserId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_url, caption, access_token: accessToken }),
          }
        );
        const createData = await createRes.json() as { id?: string; error?: any };
        if (!createData.id) throw new Error(`Instagram media create failed: ${JSON.stringify(createData.error)}`);

        const publishRes = await fetch(
          `https://graph.facebook.com/${META_GRAPH_VERSION}/${igUserId}/media_publish`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ creation_id: createData.id, access_token: accessToken }),
          }
        );
        const publishData = await publishRes.json() as { id?: string; error?: any };
        if (!publishData.id) throw new Error(`Instagram publish failed: ${JSON.stringify(publishData.error)}`);
        postId = publishData.id;
      } else if (pageId) {
        // Facebook Page photo post
        platform = 'Facebook';
        const res = await fetch(
          `https://graph.facebook.com/${META_GRAPH_VERSION}/${pageId}/photos`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: image_url, caption, access_token: accessToken }),
          }
        );
        const data = await res.json() as { id?: string; post_id?: string; error?: any };
        if (!data.id && !data.post_id) throw new Error(`Facebook post failed: ${JSON.stringify(data.error)}`);
        postId = data.post_id ?? data.id ?? null;
      } else {
        return reply.status(400).send({ success: false, error: 'No Instagram or Facebook page configured in this connector.' });
      }
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }

    // Mark creative as published if creative_id provided
    if (creative_id) {
      await query(
        `UPDATE studio_creatives SET status = 'published' WHERE id = $1 AND tenant_id = $2`,
        [creative_id, tenantId]
      ).catch(() => {});
    }

    // Store the media ID on the campaign format so metrics can be synced later
    if (campaign_format_id && postId) {
      await query(
        `UPDATE campaign_formats
         SET instagram_media_id = $1, instagram_post_url = $2, updated_at = now()
         WHERE id = $3`,
        [
          postId,
          igUserId
            ? `https://www.instagram.com/p/${postId}/`
            : `https://www.facebook.com/${postId}`,
          campaign_format_id,
        ]
      ).catch(() => {});
    }

    return reply.send({ success: true, post_id: postId, platform });
  });

  // ── Text-to-Speech (voiceover para roteiros de vídeo) ────────────────────
  const voiceoverSchema = z.object({
    text:  z.string().min(1).max(4096),
    voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).optional(),
    model: z.enum(['tts-1', 'tts-1-hd']).optional(),
    speed: z.number().min(0.25).max(4.0).optional(),
  });

  app.post('/studio/creative/voiceover', async (request: any, reply) => {
    const body = voiceoverSchema.parse(request.body);
    try {
      const { generateSpeech } = await import('../services/ai/openaiService');
      const result = await generateSpeech({
        text: body.text,
        voice: body.voice,
        model: body.model,
        speed: body.speed,
        monitor: {
          tenantId: request.tenantId as string,
          feature: 'studio_voiceover',
          metadata: { voice: body.voice, model: body.model },
        },
      });
      return reply.send({ success: true, audioBase64: result.audioBase64, durationEstimateMs: result.durationEstimateMs });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Publicar no TikTok ───────────────────────────────────────────────────
  const publishTikTokSchema = z.object({
    client_id:       z.string(),
    video_url:       z.string().url(),
    caption:         z.string(),
    privacy:         z.enum(['PUBLIC_TO_EVERYONE', 'MUTUAL_FOLLOW_FRIENDS', 'SELF_ONLY']).optional(),
    disable_duet:    z.boolean().optional(),
    disable_stitch:  z.boolean().optional(),
    disable_comment: z.boolean().optional(),
  });

  app.post('/studio/creative/publish-tiktok', async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const body = publishTikTokSchema.parse(request.body);
    try {
      const { publishTikTokVideo } = await import('../services/integrations/tiktokService');
      const result = await publishTikTokVideo(tenantId, body.client_id, {
        videoUrl:       body.video_url,
        caption:        body.caption,
        privacy:        body.privacy,
        disableDuet:    body.disable_duet,
        disableStitch:  body.disable_stitch,
        disableComment: body.disable_comment,
      });
      return reply.send({ success: true, publish_id: result.publishId, share_url: result.shareUrl, platform: 'TikTok' });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ── Publicar no LinkedIn ──────────────────────────────────────────────────
  const publishLinkedInSchema = z.object({
    client_id:          z.string(),
    image_url:          z.string().url(),
    caption:            z.string(),
    title:              z.string().optional(),
    campaign_format_id: z.string().uuid().optional(),
  });

  app.post('/studio/creative/publish-linkedin', async (request: any, reply) => {
    const tenantId = request.tenantId as string;
    const body = publishLinkedInSchema.parse(request.body);
    try {
      const { publishLinkedInPost } = await import('../services/integrations/linkedinService');
      const result = await publishLinkedInPost(tenantId, body.client_id, {
        imageUrl: body.image_url,
        caption:  body.caption,
        title:    body.title,
      });
      return reply.send({ success: true, post_id: result.postId, post_url: result.postUrl, platform: 'LinkedIn' });
    } catch (e: any) {
      return reply.status(500).send({ success: false, error: e?.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Pipeline Collaboration — share tokens, comments, client approvals
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Generate a share token (agency only) ──────────────────────────────────
  app.post('/studio/pipeline/:briefingId/share-token', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request: any, reply: any) => {
    const tenantId = request.tenantId as string;
    const { briefingId } = request.params as { briefingId: string };
    const { client_email, client_name } = (request.body || {}) as { client_email?: string; client_name?: string };

    const { rows: [row] } = await query<{ token: string }>(
      `INSERT INTO pipeline_share_tokens (briefing_id, tenant_id, client_email, client_name)
       VALUES ($1, $2, $3, $4) RETURNING token`,
      [briefingId, tenantId, client_email ?? null, client_name ?? null],
    );

    const APP_URL = process.env.APP_URL || 'https://app.edro.digital';
    return reply.send({
      success: true,
      token: row.token,
      url: `${APP_URL}/collab/${briefingId}?token=${row.token}`,
    });
  });

  // ── Validate a share token (public — no auth) ─────────────────────────────
  app.get('/studio/pipeline/collab/validate', async (request: any, reply: any) => {
    const { briefingId, token } = request.query as { briefingId: string; token: string };
    const { rows } = await query<{
      tenant_id: string; client_name: string | null; client_email: string | null; expires_at: string;
    }>(
      `SELECT tenant_id, client_name, client_email, expires_at
       FROM pipeline_share_tokens
       WHERE briefing_id = $1 AND token = $2 AND expires_at > now()`,
      [briefingId, token],
    );
    if (!rows.length) return reply.status(401).send({ valid: false });
    const { rows: [session] } = await query<{ state: any }>(
      `SELECT state FROM pipeline_sessions WHERE briefing_id = $1`,
      [briefingId],
    );
    return reply.send({ valid: true, meta: rows[0], state: session?.state ?? {} });
  });

  // ── Get comments for a briefing (agency or client via token) ─────────────
  app.get('/studio/pipeline/:briefingId/comments', async (request: any, reply: any) => {
    const { briefingId } = request.params as { briefingId: string };
    const { token } = request.query as { token?: string };

    // Allow if agency auth OR valid token
    let authorized = false;
    if (request.user?.tenant_id) {
      authorized = true;
    } else if (token) {
      const { rows } = await query(
        `SELECT id FROM pipeline_share_tokens WHERE briefing_id = $1 AND token = $2 AND expires_at > now()`,
        [briefingId, token],
      );
      authorized = rows.length > 0;
    }
    if (!authorized) return reply.status(401).send({ error: 'unauthorized' });

    const { rows } = await query(
      `SELECT id, section, author_type, author_name, body, resolved, created_at
       FROM pipeline_comments WHERE briefing_id = $1 ORDER BY created_at ASC`,
      [briefingId],
    );
    return reply.send({ comments: rows });
  });

  // ── Post a comment (agency or client via token) ───────────────────────────
  app.post('/studio/pipeline/:briefingId/comments', async (request: any, reply: any) => {
    const { briefingId } = request.params as { briefingId: string };
    const body = (request.body || {}) as {
      section: string; body: string; author_name?: string;
      author_email?: string; token?: string;
    };

    let tenantId: string | null = null;
    let authorType = 'agency';
    let shareToken: string | null = null;

    if (request.user?.tenant_id) {
      tenantId  = request.user.tenant_id;
      authorType = 'agency';
    } else if (body.token) {
      const { rows } = await query<{ tenant_id: string }>(
        `SELECT tenant_id FROM pipeline_share_tokens WHERE briefing_id = $1 AND token = $2 AND expires_at > now()`,
        [briefingId, body.token],
      );
      if (!rows.length) return reply.status(401).send({ error: 'invalid_token' });
      tenantId   = rows[0].tenant_id;
      authorType = 'client';
      shareToken = body.token;
    } else {
      return reply.status(401).send({ error: 'unauthorized' });
    }

    if (!body.body?.trim()) return reply.status(400).send({ error: 'body_required' });
    const validSections = ['copy', 'arte', 'approval', 'general'];
    if (!validSections.includes(body.section)) return reply.status(400).send({ error: 'invalid_section' });

    const { rows: [comment] } = await query(
      `INSERT INTO pipeline_comments (briefing_id, tenant_id, section, author_type, author_name, author_email, body, share_token)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [briefingId, tenantId, body.section, authorType,
       body.author_name || (authorType === 'agency' ? 'Agência' : 'Cliente'),
       body.author_email ?? null, body.body.trim(), shareToken],
    );

    return reply.send({ success: true, comment });
  });

  // ── Resolve a comment (agency only) ──────────────────────────────────────
  app.patch('/studio/pipeline/:briefingId/comments/:commentId/resolve', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request: any, reply: any) => {
    const { briefingId, commentId } = request.params as { briefingId: string; commentId: string };
    await query(
      `UPDATE pipeline_comments SET resolved = true, resolved_at = now(), resolved_by = $1
       WHERE id = $2 AND briefing_id = $3`,
      [request.user?.email || 'agency', commentId, briefingId],
    );
    return reply.send({ success: true });
  });

  // ── Client approval (public via token) ───────────────────────────────────
  app.post('/studio/pipeline/:briefingId/client-approve', async (request: any, reply: any) => {
    const { briefingId } = request.params as { briefingId: string };
    const body = (request.body || {}) as {
      token: string; decision: 'approved' | 'rejected';
      section: string; feedback?: string;
      client_name?: string; client_email?: string;
    };

    if (!body.token) return reply.status(401).send({ error: 'token_required' });
    const { rows: [tokenRow] } = await query<{ tenant_id: string; client_name: string | null; client_email: string | null }>(
      `SELECT tenant_id, client_name, client_email FROM pipeline_share_tokens
       WHERE briefing_id = $1 AND token = $2 AND expires_at > now()`,
      [briefingId, body.token],
    );
    if (!tokenRow) return reply.status(401).send({ error: 'invalid_token' });

    const { rows: [approval] } = await query(
      `INSERT INTO pipeline_client_approvals
         (briefing_id, tenant_id, share_token, client_name, client_email, decision, feedback, section)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (briefing_id, share_token, section) DO UPDATE
         SET decision = EXCLUDED.decision, feedback = EXCLUDED.feedback, created_at = now()
       RETURNING *`,
      [
        briefingId, tokenRow.tenant_id, body.token,
        body.client_name || tokenRow.client_name || 'Cliente',
        body.client_email || tokenRow.client_email || null,
        body.decision, body.feedback ?? null,
        body.section || 'final',
      ],
    );

    // Notify agency (non-blocking)
    if (body.decision === 'approved' || body.decision === 'rejected') {
      const { notifyEvent } = await import('../services/notificationService').catch(() => ({ notifyEvent: null }));
      if (notifyEvent) {
        const { rows: admins } = await query(
          `SELECT eu.id, eu.email FROM edro_users eu
           JOIN tenant_users tu ON tu.user_id = eu.id
           WHERE tu.tenant_id = $1 AND tu.role IN ('admin','owner') LIMIT 3`,
          [tokenRow.tenant_id],
        ).catch(() => ({ rows: [] as any[] }));
        const clientLabel = body.client_name || tokenRow.client_name || 'Cliente';
        const emoji = body.decision === 'approved' ? '✅' : '❌';
        Promise.allSettled(admins.map((a: any) =>
          notifyEvent!({
            event: 'pipeline_client_approval',
            tenantId: tokenRow.tenant_id,
            userId:   a.id,
            title:    `${emoji} ${clientLabel} ${body.decision === 'approved' ? 'aprovou' : 'rejeitou'} a peça`,
            body:     body.feedback ? `"${body.feedback.slice(0, 120)}"` : 'Aprovação via App Mode.',
            recipientEmail: a.email,
            payload:  { briefingId, decision: body.decision, section: body.section },
          })
        )).catch(() => {});
      }
    }

    const creativeContext = await resolveArtDirectionCreativeContext({
      tenantId: tokenRow.tenant_id,
      briefingId,
    }).catch(() => null);
    const daMetadata = buildArtDirectionFeedbackMetadata({
      context: creativeContext,
      metadata: {
        section: body.section || 'final',
        feedback: body.feedback ?? null,
      },
      source: 'pipeline_client_approval',
      reviewActor: 'client',
      reviewStage: body.section || 'final',
      rejectionReason: body.decision === 'rejected' ? body.feedback ?? null : null,
      briefingId,
      clientId: creativeContext?.clientId ?? null,
    });
    if (
      daMetadata.visual_intent ||
      daMetadata.strategy_summary ||
      daMetadata.reference_ids?.length ||
      daMetadata.reference_urls?.length ||
      daMetadata.concept_slugs?.length ||
      daMetadata.trend_tags?.length
    ) {
      await recordArtDirectionFeedbackEvent({
        tenantId: tokenRow.tenant_id,
        clientId: creativeContext?.clientId ?? null,
        creativeSessionId: creativeContext?.creativeSessionId ?? null,
        referenceId: getPrimaryArtDirectionReferenceId(daMetadata),
        eventType: body.decision === 'approved' ? 'approved' : 'rejected',
        notes: body.feedback ?? `pipeline_${body.decision}`,
        metadata: daMetadata,
        createdBy: body.client_email || null,
      }).catch(() => {});
    }

    return reply.send({ success: true, approval });
  });

  // ── Get approvals for a briefing (agency) ────────────────────────────────
  app.get('/studio/pipeline/:briefingId/client-approvals', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request: any, reply: any) => {
    const { briefingId } = request.params as { briefingId: string };
    const { rows } = await query(
      `SELECT pca.*, pst.client_name AS token_client_name
       FROM pipeline_client_approvals pca
       LEFT JOIN pipeline_share_tokens pst ON pst.token = pca.share_token
       WHERE pca.briefing_id = $1
       ORDER BY pca.created_at DESC`,
      [briefingId],
    );
    return reply.send({ approvals: rows });
  });

  // ── POST /studio/creative/adapt-multi-format ─────────────────────────────────
  // Adapts approved copy for multiple platform formats in a single Claude call.
  // Returns: { adaptations: { [formatId]: { short_text, caption, hashtags, cta } } }
  app.post('/studio/creative/adapt-multi-format', async (request: any, reply: any) => {
    const { copy_title, copy_body, copy_cta, formats, trigger, platform } =
      request.body as {
        copy_title: string;
        copy_body: string;
        copy_cta?: string;
        formats: { id: string; label: string; platform: string; ratio: string }[];
        trigger?: string;
        platform?: string;
      };

    if (!copy_body || !formats?.length) {
      return reply.status(400).send({ error: 'copy_body and formats are required' });
    }

    const formatList = formats.map((f) =>
      `  - id="${f.id}" label="${f.label}" platform="${f.platform}" aspect_ratio="${f.ratio}"`
    ).join('\n');

    const prompt = `Você é um especialista em copywriting multicanal. Adapte o copy abaixo para cada formato especificado, respeitando os limites e convenções de cada plataforma.

COPY ORIGINAL:
Título: ${copy_title || ''}
Corpo: ${copy_body}
CTA: ${copy_cta || ''}
${trigger ? `Gatilho psicológico: ${trigger}` : ''}

FORMATOS ALVO:
${formatList}

REGRAS DE ADAPTAÇÃO:
- Instagram Story (9:16): texto muito curto (máx 80 chars), impacto imediato, emoji, CTA direto
- Instagram Feed (1:1): legenda média (máx 200 chars) + 5-8 hashtags relevantes
- Instagram Reels caption: gancho curto + emojis + call-to-action + hashtags
- LinkedIn (4:5): tom profissional, sem emoji excessivo, benefício claro, máx 150 chars
- Twitter/X Banner (3:1): frase de impacto ultra-curta (máx 50 chars), sem hashtag
- YouTube Thumbnail (16:9): texto para overlay na thumbnail (máx 30 chars, caps)

Retorne APENAS JSON válido:
{
  "adaptations": {
    "<id>": {
      "short_text": "texto principal adaptado",
      "caption": "legenda completa com emojis e hashtags quando aplicável",
      "cta": "call to action adaptado"
    }
  }
}`;

    try {
      const { generateCompletion } = await import('../services/ai/claudeService');
      const res = await generateCompletion({ prompt, maxTokens: 1000, temperature: 0.3 });
      const jsonMatch = res.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');
      const parsed = JSON.parse(jsonMatch[0]);
      return reply.send({ success: true, adaptations: parsed.adaptations || {} });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // ── LoRA Pipeline ─────────────────────────────────────────────────────────

  // GET /clients/:clientId/lora/jobs — list all training jobs for a client
  app.get('/clients/:clientId/lora/jobs', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:read')],
  }, async (request: any, reply) => {
    const { clientId } = request.params;
    const tenantId = request.user.tenant_id;
    try {
      const jobs = await listLoraJobs(tenantId, clientId);
      return reply.send({ success: true, jobs });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // POST /clients/:clientId/lora/start-training — enqueue a new LoRA training job
  const loraStartSchema = z.object({
    training_images: z.array(z.string().url()).min(10).max(50),
    trigger_word: z.string().min(3).max(40).regex(/^[A-Z0-9_]+$/, 'Trigger word deve ser MAIÚSCULAS e underscores'),
    steps: z.coerce.number().int().min(500).max(2000).default(1000),
    learning_rate: z.coerce.number().min(0.00001).max(0.01).default(0.0004),
    model_base: z.enum(['flux-dev', 'flux-pro']).default('flux-dev'),
  });

  app.post('/clients/:clientId/lora/start-training', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:write')],
  }, async (request: any, reply) => {
    const { clientId } = request.params;
    const tenantId = request.user.tenant_id;
    const parsed = loraStartSchema.safeParse(request.body);
    if (!parsed.success) return reply.status(400).send({ success: false, error: parsed.error.issues[0]?.message });
    try {
      const job = await startLoraTraining({
        tenantId,
        clientId,
        trainingImages: parsed.data.training_images,
        triggerWord: parsed.data.trigger_word,
        steps: parsed.data.steps,
        learningRate: parsed.data.learning_rate,
        modelBase: parsed.data.model_base,
      });
      return reply.send({ success: true, job });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // POST /clients/:clientId/lora/jobs/:jobId/approve — activate LoRA on client profile
  app.post('/clients/:clientId/lora/jobs/:jobId/approve', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:write')],
  }, async (request: any, reply) => {
    const { clientId, jobId } = request.params;
    const tenantId = request.user.tenant_id;
    try {
      await approveLoraModel({ tenantId, clientId, jobId, approvedBy: request.user.sub });
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

  // POST /studio/creative/compare-models — fan-out same prompt to N models in parallel
  app.post('/studio/creative/compare-models', async (request: any, reply) => {
    const schema = z.object({
      prompt: z.string().min(1),
      negative_prompt: z.string().optional(),
      models: z.array(z.object({
        model: z.string(),
        label: z.string(),
      })).min(2).max(4),
      aspect_ratio: z.string().optional(),
      client_id: z.string().optional(),
    });

    const body = schema.safeParse(request.body);
    if (!body.success) return reply.status(400).send({ error: body.error.flatten() });

    const { prompt, negative_prompt, models, aspect_ratio, client_id } = body.data;
    const tenantId: string = request.user.tenant_id;

    // Load LoRA config if client_id provided
    let loraConfig: Array<{ path: string; scale: number }> = [];
    if (client_id) {
      try {
        const loraRes = await query<{ lora_model_id: string; lora_scale: number }>(
          `SELECT lora_model_id, lora_scale FROM client_visual_identity WHERE client_id = $1 AND tenant_id = $2 LIMIT 1`,
          [client_id, tenantId],
        );
        if (loraRes.rows[0]?.lora_model_id) {
          loraConfig = [{ path: loraRes.rows[0].lora_model_id, scale: loraRes.rows[0].lora_scale ?? 0.85 }];
        }
      } catch { /* no lora */ }
    }

    const { generateImageWithFal } = await import('../services/ai/falAiService');

    const settled = await Promise.allSettled(
      models.map(async ({ model, label }) => {
        const t0 = Date.now();
        const result = await generateImageWithFal({
          prompt,
          negativePrompt: negative_prompt,
          aspectRatio: aspect_ratio ?? '1:1',
          numImages: 1,
          model: model as any,
          loras: model === 'flux-lora' ? loraConfig : [],
        });
        return {
          model,
          label,
          image_url: result.imageUrl,
          image_urls: result.imageUrls,
          ms: Date.now() - t0,
        };
      }),
    );

    const results = settled.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { model: models[i].model, label: models[i].label, image_url: '', image_urls: [], ms: 0, error: (r.reason as Error)?.message ?? 'Erro' },
    );

    return reply.send({ results });
  });

  // POST /clients/:clientId/lora/jobs/:jobId/reject — discard a validating job
  app.post('/clients/:clientId/lora/jobs/:jobId/reject', {
    preHandler: [authGuard, tenantGuard(), requirePerm('clients:write')],
  }, async (request: any, reply) => {
    const { clientId, jobId } = request.params;
    const tenantId = request.user.tenant_id;
    try {
      await rejectLoraModel({ tenantId, clientId, jobId });
      return reply.send({ success: true });
    } catch (err: any) {
      return reply.status(500).send({ success: false, error: err.message });
    }
  });

}
