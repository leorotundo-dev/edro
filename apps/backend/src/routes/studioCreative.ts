import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import {
  generateAdCreative,
  generateArtDirectorPrompt,
  refineScenePrompt,
  isAdCreativeConfigured,
} from '../services/adCreativeService';
import { orchestrateCreative } from '../services/ai/artDirectorOrchestrator';

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

export default async function studioCreativeRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

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
      brand_colors: clientBrandColors,
      brand_tokens: clientBrandTokens,
    });
  });
}
