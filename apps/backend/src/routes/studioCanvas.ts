/**
 * Studio Canvas — single chat endpoint that interprets user intent
 * and dispatches to image generation, copy writing, or refinement.
 */
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { generateCompletion } from '../services/ai/claudeService';
import { generateAdCreative, refineScenePrompt, isAdCreativeConfigured } from '../services/adCreativeService';
import { orchestrateCreative } from '../services/ai/artDirectorOrchestrator';
import { generateCopy } from '../services/ai/copyService';
import { generateImageWithFal, generateImg2ImgWithFal, isFalConfigured } from '../services/ai/falAiService';
import { env } from '../env';

const chatSchema = z.object({
  message: z.string().min(1),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).default([]),
  /** Current image URL on canvas (for refinement context) */
  current_image_url: z.string().optional(),
  /** Current prompt used to generate the image */
  current_prompt: z.string().optional(),
  /** Current copy on canvas */
  current_copy: z.object({
    headline: z.string().optional(),
    body: z.string().optional(),
    cta: z.string().optional(),
  }).optional(),
  /** Client context */
  client_id: z.string().optional(),
  client_name: z.string().optional(),
  /** Uploaded asset URLs (logos, product photos, references) */
  assets: z.array(z.object({
    url: z.string(),
    type: z.enum(['logo', 'product', 'reference', 'photo']).default('reference'),
    name: z.string().optional(),
  })).default([]),
  /** Preferred image provider */
  image_provider: z.enum(['gemini', 'leonardo', 'fal']).default('fal'),
  /** Format */
  format: z.string().default('Feed 1:1'),
  platform: z.string().default('Instagram'),
});

const CANVAS_SYSTEM_PROMPT = `Voce e o Diretor Criativo da Edro. O usuario esta no Canvas — um espaco de criacao fluido onde ele pede o que quiser em linguagem natural e voce executa.

Voce pode fazer QUALQUER combinacao destas acoes:

1. GENERATE_IMAGE — Gerar uma imagem (background, produto, cena, mockup, qualquer coisa visual)
2. GENERATE_COPY — Escrever copy (headline, body, CTA, legenda, qualquer texto criativo)
3. REFINE_IMAGE — Refinar a imagem atual no canvas (mudar cor, estilo, elementos, composicao)
4. REFINE_COPY — Refinar o copy atual (ajustar tom, encurtar, adaptar formato)
5. ANSWER — Apenas responder/conversar (duvidas, sugestoes, estrategia)

REGRAS:
- Interprete o pedido do usuario e decida qual acao tomar
- Se o pedido envolve visual E texto, faca ambos
- Se o usuario manda assets (logo, produto), USE-OS no prompt de imagem como contexto descritivo
- Sempre responda em portugues brasileiro
- Seja direto e criativo, sem enrolacao
- Se o pedido e vago, faca sua melhor interpretacao e execute — nao fique perguntando

Responda SEMPRE com JSON valido neste formato:
{
  "actions": [
    {
      "type": "generate_image" | "generate_copy" | "refine_image" | "refine_copy" | "answer",
      "image_prompt": "prompt descritivo em ingles para geracao de imagem (apenas para generate_image)",
      "refine_instruction": "instrucao de refinamento (apenas para refine_image/refine_copy)",
      "copy": { "headline": "...", "body": "...", "cta": "..." },
      "aspect_ratio": "1:1" | "4:5" | "9:16" | "16:9",
      "negative_prompt": "elementos para evitar na imagem"
    }
  ],
  "message": "mensagem curta para o usuario explicando o que voce fez/vai fazer"
}

Se for apenas ANSWER, retorne actions vazio e a mensagem no campo message.`;

export default async function studioCanvasRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.post('/studio/canvas/chat', async (request: any, reply) => {
    const body = chatSchema.parse(request.body || {});
    const tenantId = (request.user as any)?.tenant_id as string | undefined;

    // Build context for Claude
    let contextBlock = '';
    if (body.client_name) contextBlock += `\nCliente: ${body.client_name}`;
    if (body.format) contextBlock += `\nFormato: ${body.format}`;
    if (body.platform) contextBlock += `\nPlataforma: ${body.platform}`;
    if (body.current_image_url) contextBlock += `\nImagem atual no canvas: ${body.current_image_url}`;
    if (body.current_prompt) contextBlock += `\nPrompt da imagem atual: ${body.current_prompt}`;
    if (body.current_copy) {
      const cc = body.current_copy;
      if (cc.headline || cc.body || cc.cta) {
        contextBlock += `\nCopy atual: headline="${cc.headline || ''}" body="${cc.body || ''}" cta="${cc.cta || ''}"`;
      }
    }
    if (body.assets.length) {
      contextBlock += `\nAssets do usuario:`;
      for (const a of body.assets) {
        contextBlock += `\n  - [${a.type}] ${a.name || a.url}`;
      }
    }

    const systemPrompt = CANVAS_SYSTEM_PROMPT + (contextBlock ? `\n\nCONTEXTO ATUAL:${contextBlock}` : '');

    // Build message history
    const messages = [
      ...body.history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user' as const, content: body.message },
    ];

    // Ask Claude to interpret the request
    const interpretation = await generateCompletion({
      prompt: messages.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n'),
      systemPrompt,
      temperature: 0.4,
      maxTokens: 2000,
    });

    let parsed: { actions: any[]; message: string };
    try {
      const raw = interpretation.text.trim();
      // Extract JSON from possible markdown code blocks
      const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
      parsed = JSON.parse(jsonMatch[1]!.trim());
    } catch {
      // If Claude didn't return valid JSON, treat as a conversation answer
      return reply.send({
        success: true,
        message: interpretation.text,
        actions_taken: [],
        results: {},
      });
    }

    // Execute each action
    const results: Record<string, any> = {};
    const actionsTaken: string[] = [];

    for (const action of parsed.actions || []) {
      const actionType = action.type?.toLowerCase();

      if (actionType === 'generate_image') {
        actionsTaken.push('generate_image');
        const aspectRatio = action.aspect_ratio || (body.format.includes('9:16') ? '9:16' : body.format.includes('16:9') ? '16:9' : body.format.includes('4:5') ? '4:5' : '1:1');

        if (isAdCreativeConfigured()) {
          try {
            // Use reference image from assets if available
            const refAsset = body.assets.find(a => a.type === 'reference' || a.type === 'product' || a.type === 'logo');

            const imgResult = await generateAdCreative({
              copy: action.image_prompt || body.message,
              headline: action.copy?.headline,
              format: body.format,
              brand: body.client_name || '',
              segment: '',
              customPrompt: action.image_prompt,
              imageProvider: body.image_provider,
              aspectRatio,
              negativePrompt: action.negative_prompt,
              numImages: body.image_provider === 'gemini' ? 1 : 3,
              tenantId,
              referenceImageUrl: refAsset?.url,
              referenceImageStrength: refAsset ? 0.2 : undefined,
            });
            results.image = imgResult;
          } catch (err: any) {
            results.image = { success: false, error: err?.message };
          }
        } else {
          results.image = { success: false, error: 'Geracao de imagens nao configurada' };
        }
      }

      if (actionType === 'generate_copy') {
        actionsTaken.push('generate_copy');
        try {
          // If Claude already wrote the copy in the action, use it directly
          if (action.copy?.headline || action.copy?.body) {
            results.copy = {
              success: true,
              headline: action.copy.headline || '',
              body: action.copy.body || '',
              cta: action.copy.cta || '',
              source: 'canvas_director',
            };
          } else {
            const copyResult = await generateCopy({
              prompt: `Escreva um copy criativo para: ${body.message}\nFormato: ${body.format}\nPlataforma: ${body.platform}${body.client_name ? `\nCliente: ${body.client_name}` : ''}\n\nRetorne no formato:\nHEADLINE: ...\nBODY: ...\nCTA: ...`,
              temperature: 0.7,
              maxTokens: 800,
              taskType: 'social_post',
            });
            // Parse copy output
            const text = copyResult.output || '';
            const headlineMatch = text.match(/HEADLINE:\s*(.+)/i);
            const bodyMatch = text.match(/BODY:\s*([\s\S]*?)(?=CTA:|$)/i);
            const ctaMatch = text.match(/CTA:\s*(.+)/i);
            results.copy = {
              success: true,
              headline: headlineMatch?.[1]?.trim() || '',
              body: bodyMatch?.[1]?.trim() || text,
              cta: ctaMatch?.[1]?.trim() || '',
              source: 'copy_orchestrator',
            };
          }
        } catch (err: any) {
          results.copy = { success: false, error: err?.message };
        }
      }

      if (actionType === 'refine_image' && body.current_prompt) {
        actionsTaken.push('refine_image');
        try {
          const refined = await refineScenePrompt({
            currentPrompt: body.current_prompt,
            instruction: action.refine_instruction || body.message,
            brand: body.client_name,
          });
          // Generate with refined prompt
          const aspectRatio = action.aspect_ratio || (body.format.includes('9:16') ? '9:16' : '1:1');
          const imgResult = await generateAdCreative({
            copy: body.message,
            format: body.format,
            brand: body.client_name || '',
            segment: '',
            customPrompt: refined,
            imageProvider: body.image_provider,
            aspectRatio,
            negativePrompt: action.negative_prompt,
            numImages: body.image_provider === 'gemini' ? 1 : 3,
            tenantId,
          });
          results.image = { ...imgResult, refined_prompt: refined };
        } catch (err: any) {
          results.image = { success: false, error: err?.message };
        }
      }

      if (actionType === 'refine_copy') {
        actionsTaken.push('refine_copy');
        if (action.copy?.headline || action.copy?.body) {
          results.copy = {
            success: true,
            headline: action.copy.headline || body.current_copy?.headline || '',
            body: action.copy.body || body.current_copy?.body || '',
            cta: action.copy.cta || body.current_copy?.cta || '',
            source: 'canvas_director_refine',
          };
        }
      }

      if (actionType === 'answer') {
        actionsTaken.push('answer');
      }
    }

    return reply.send({
      success: true,
      message: parsed.message || '',
      actions_taken: actionsTaken,
      results,
    });
  });

  // ── Image Processing Actions ───────────────────────────────────────

  const imageUrlSchema = z.object({
    image_url: z.string().min(1),
  });

  /**
   * POST /studio/canvas/upscale — 4x upscale via fal.ai real-esrgan
   */
  app.post('/studio/canvas/upscale', async (request: any, reply) => {
    const { image_url } = imageUrlSchema.parse(request.body || {});
    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    const res = await fetch('https://fal.run/fal-ai/real-esrgan', {
      method: 'POST',
      headers: { Authorization: `Key ${env.FAL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url, scale: 4 }),
    });
    if (!res.ok) {
      const err = await res.text();
      return reply.status(502).send({ success: false, error: `Upscale failed: ${err.slice(0, 200)}` });
    }
    const data = await res.json() as { image?: { url: string } };
    return reply.send({ success: true, image_url: data.image?.url });
  });

  /**
   * POST /studio/canvas/remove-bg — background removal via fal.ai birefnet
   */
  app.post('/studio/canvas/remove-bg', async (request: any, reply) => {
    const { image_url } = imageUrlSchema.parse(request.body || {});
    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    const res = await fetch('https://fal.run/fal-ai/birefnet/v2', {
      method: 'POST',
      headers: { Authorization: `Key ${env.FAL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url }),
    });
    if (!res.ok) {
      const err = await res.text();
      return reply.status(502).send({ success: false, error: `Remove BG failed: ${err.slice(0, 200)}` });
    }
    const data = await res.json() as { image?: { url: string } };
    return reply.send({ success: true, image_url: data.image?.url });
  });

  /**
   * POST /studio/canvas/variations — re-generate with same prompt, different seed
   */
  app.post('/studio/canvas/variations', async (request: any, reply) => {
    const body = z.object({
      image_url: z.string().min(1),
      prompt: z.string().default(''),
      aspect_ratio: z.string().default('1:1'),
      num_images: z.number().min(1).max(4).default(3),
    }).parse(request.body || {});

    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    try {
      // Use img2img with low strength to create variations
      const result = await generateImg2ImgWithFal({
        prompt: body.prompt || 'same scene, slight variation, high quality photography',
        imageUrl: body.image_url,
        strength: 0.35,
        aspectRatio: body.aspect_ratio,
        numImages: body.num_images,
      });
      return reply.send({ success: true, image_urls: result.imageUrls });
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err?.message });
    }
  });

  /**
   * POST /studio/canvas/multi-angles — same subject from different perspectives
   */
  app.post('/studio/canvas/multi-angles', async (request: any, reply) => {
    const body = z.object({
      image_url: z.string().min(1),
      prompt: z.string().default(''),
      aspect_ratio: z.string().default('1:1'),
    }).parse(request.body || {});

    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    const angles = [
      'front view, eye level, centered composition',
      'three-quarter view from left, slight overhead angle',
      'close-up detail shot, macro perspective',
      'wide angle establishing shot, environmental context',
    ];

    try {
      const basePrompt = body.prompt || 'same product, professional studio photography';
      const results = await Promise.allSettled(
        angles.map(angle =>
          generateImageWithFal({
            prompt: `${basePrompt}, ${angle}`,
            aspectRatio: body.aspect_ratio,
            model: 'flux-pro',
            referenceImageUrl: body.image_url,
            referenceImageStrength: 0.3,
          }),
        ),
      );
      const urls = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value.imageUrl);
      return reply.send({ success: true, image_urls: urls });
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err?.message });
    }
  });
}
