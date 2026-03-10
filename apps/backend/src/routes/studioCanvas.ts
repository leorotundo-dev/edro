/**
 * Studio Canvas — single chat endpoint that interprets user intent
 * and dispatches to image generation, copy writing, or refinement.
 */
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import multipart from '@fastify/multipart';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { generateCompletion } from '../services/ai/claudeService';
import { buildKey, saveFile } from '../library/storage';
import { refineScenePrompt } from '../services/adCreativeService';
import { generateCopy } from '../services/ai/copyService';
import { generateImageWithFal, generateImg2ImgWithFal, imageToVideoWithFal, isFalConfigured, FalModel } from '../services/ai/falAiService';
import { generateImage as generateImageGemini } from '../services/ai/geminiService';
import { generateImageWithLeonardo } from '../services/ai/leonardoService';
import { runAgentDiretorArte } from '../services/ai/agentDiretorArte';
import { generateLayout, type GeneratedLayout } from '../services/layoutEngine';
import { getClientById } from '../repos/clientsRepo';
import { pool } from '../db';
import { env } from '../env';

// ── fal.ai helper for direct low-level calls ──────────────────────────────────
async function falFetch(endpoint: string, body: Record<string, any>) {
  const apiKey = env.FAL_API_KEY;
  if (!apiKey) throw new Error('FAL_API_KEY nao configurada');
  const url = endpoint.startsWith('https://') ? endpoint : `https://fal.run/${endpoint}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown');
    throw new Error(`fal.ai error (${res.status}): ${err.slice(0, 300)}`);
  }
  return res.json();
}

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
  /** Specific fal.ai model (e.g. 'flux-pro', 'recraft-v3', or 'fal-ai/some-model') */
  fal_model: z.string().default('flux-pro'),
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

MODELOS DE IMAGEM DISPONIVEIS (escolha o melhor automaticamente baseado no pedido):
- nano-banana-pro: MELHOR para fotorealismo, texturas, retratos, produtos (Google Gemini 3 Pro)
- nano-banana-2: Rapido, bom com texto na imagem, raciocinio visual (Google Gemini 3.1 Flash)
- flux-pro: Alta qualidade geral, versatil, bom default
- flux-pro-ultra: Ultra resolucao, maximo detalhe
- recraft-v3: MELHOR para logos, icones, ilustracoes vetoriais, design grafico
- ideogram-v2: MELHOR para texto legivel dentro da imagem (posters, banners)
- flux-realism: Fotorrealismo extremo
- hidream-i1: Criativo, artistico, alta qualidade
- stable-diffusion-v35: Versatil, bom para estilos variados
- minimax-image: Artistico criativo
- flux-dev: Rapido, economico

REGRAS:
- Interprete o pedido do usuario e decida qual acao tomar
- Se o pedido envolve visual E texto, faca ambos
- Se o usuario manda assets (logo, produto), USE-OS no prompt de imagem como contexto descritivo
- Sempre responda em portugues brasileiro
- Seja direto e criativo, sem enrolacao
- Se o pedido e vago, faca sua melhor interpretacao e execute — nao fique perguntando
- Escolha o modelo ideal no campo "recommended_model" baseado no tipo de pedido

Responda SEMPRE com JSON valido neste formato:
{
  "actions": [
    {
      "type": "generate_image" | "generate_copy" | "refine_image" | "refine_copy" | "answer",
      "image_prompt": "prompt descritivo em ingles para geracao de imagem (apenas para generate_image)",
      "refine_instruction": "instrucao de refinamento (apenas para refine_image/refine_copy)",
      "copy": { "headline": "...", "body": "...", "cta": "..." },
      "aspect_ratio": "1:1" | "4:5" | "9:16" | "16:9",
      "negative_prompt": "elementos para evitar na imagem",
      "recommended_model": "nome do modelo fal.ai ideal para este pedido (opcional)"
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
        const imagePrompt = action.image_prompt || body.message;
        const refAsset = body.assets.find(a => a.type === 'reference' || a.type === 'product' || a.type === 'logo');

        try {
          if (body.image_provider === 'gemini') {
            // Direct Gemini call — no VISUAL_DNA_BASE injection
            const result = await generateImageGemini({
              prompt: imagePrompt,
              aspectRatio,
              negativePrompt: action.negative_prompt,
              referenceImageUrls: refAsset ? [refAsset.url] : undefined,
            });
            results.image = {
              success: true,
              image_url: `data:${result.mimeType};base64,${result.base64}`,
              image_urls: [`data:${result.mimeType};base64,${result.base64}`],
              prompt_used: imagePrompt,
              provider: 'gemini',
            };
          } else if (body.image_provider === 'leonardo') {
            // Direct Leonardo call — no VISUAL_DNA_BASE injection
            const result = await generateImageWithLeonardo({
              prompt: imagePrompt,
              aspectRatio,
              negativePrompt: action.negative_prompt,
              numImages: 3,
            });
            results.image = {
              success: true,
              image_url: result.imageUrl,
              image_urls: result.imageUrls,
              prompt_used: imagePrompt,
              provider: 'leonardo',
            };
          } else {
            // fal.ai — direct call with selected model (or AI-recommended)
            if (!isFalConfigured()) throw new Error('FAL_API_KEY nao configurada');
            const chosenModel = (body.fal_model === 'auto' && action.recommended_model)
              ? action.recommended_model
              : body.fal_model;
            const result = await generateImageWithFal({
              prompt: imagePrompt,
              aspectRatio,
              negativePrompt: action.negative_prompt,
              model: chosenModel as FalModel,
              numImages: 3,
              referenceImageUrl: refAsset?.url,
              referenceImageStrength: refAsset ? 0.2 : undefined,
            });
            results.image = {
              success: true,
              image_url: result.imageUrl,
              image_urls: result.imageUrls,
              prompt_used: imagePrompt,
              provider: 'fal',
              model: chosenModel,
              seed: result.seed,
            };
          }
        } catch (err: any) {
          results.image = { success: false, error: err?.message };
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
          const aspectRatio = action.aspect_ratio || (body.format.includes('9:16') ? '9:16' : '1:1');

          if (body.image_provider === 'gemini') {
            const result = await generateImageGemini({ prompt: refined, aspectRatio, negativePrompt: action.negative_prompt });
            results.image = {
              success: true,
              image_url: `data:${result.mimeType};base64,${result.base64}`,
              image_urls: [`data:${result.mimeType};base64,${result.base64}`],
              refined_prompt: refined,
              provider: 'gemini',
            };
          } else if (body.image_provider === 'leonardo') {
            const result = await generateImageWithLeonardo({ prompt: refined, aspectRatio, negativePrompt: action.negative_prompt, numImages: 3 });
            results.image = { success: true, image_url: result.imageUrl, image_urls: result.imageUrls, refined_prompt: refined, provider: 'leonardo' };
          } else {
            if (!isFalConfigured()) throw new Error('FAL_API_KEY nao configurada');
            // If we have the current image, use img2img for better refinement
            if (body.current_image_url && !body.current_image_url.startsWith('data:')) {
              const result = await generateImg2ImgWithFal({
                prompt: refined,
                imageUrl: body.current_image_url,
                strength: 0.65,
                aspectRatio,
                numImages: 3,
              });
              results.image = { success: true, image_url: result.imageUrl, image_urls: result.imageUrls, refined_prompt: refined, provider: 'fal', model: 'flux-dev-i2i' };
            } else {
              const result = await generateImageWithFal({
                prompt: refined,
                aspectRatio,
                negativePrompt: action.negative_prompt,
                model: body.fal_model as FalModel,
                numImages: 3,
              });
              results.image = { success: true, image_url: result.imageUrl, image_urls: result.imageUrls, refined_prompt: refined, provider: 'fal', model: body.fal_model };
            }
          }
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
   * POST /studio/canvas/upscale — 4x upscale via fal.ai clarity-upscaler
   */
  app.post('/studio/canvas/upscale', async (request: any, reply) => {
    const { image_url } = imageUrlSchema.parse(request.body || {});
    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    const res = await fetch('https://fal.run/fal-ai/clarity-upscaler', {
      method: 'POST',
      headers: { Authorization: `Key ${env.FAL_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url, scale_factor: 4 }),
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

  // ── Inpainting — edit specific region with mask ─────────────────────

  /**
   * POST /studio/canvas/inpaint
   * Mask-based inpainting: regenerate only the masked region guided by prompt.
   * mask_image_url should be a black/white image (white = area to regenerate).
   */
  app.post('/studio/canvas/inpaint', async (request: any, reply) => {
    const body = z.object({
      image_url: z.string().min(1),
      mask_image_url: z.string().min(1),
      prompt: z.string().min(1),
      negative_prompt: z.string().default(''),
      num_images: z.number().min(1).max(4).default(2),
    }).parse(request.body || {});

    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    try {
      const data = await falFetch('fal-ai/flux-pro/v1/fill', {
        image_url: body.image_url,
        mask_url: body.mask_image_url,
        prompt: body.prompt,
        num_images: body.num_images,
        output_format: 'jpeg',
      }) as { images?: Array<{ url: string }>; image?: { url: string } };

      const images = data.images ?? (data.image ? [data.image] : []);
      const urls = images.map(i => i.url);
      return reply.send({ success: true, image_urls: urls });
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err?.message });
    }
  });

  // ── Outpaint / Image Extend ────────────────────────────────────────

  /**
   * POST /studio/canvas/outpaint
   * Extends the image canvas in specified directions with AI-generated content.
   */
  app.post('/studio/canvas/outpaint', async (request: any, reply) => {
    const body = z.object({
      image_url: z.string().min(1),
      prompt: z.string().default('seamless natural extension, same style and lighting'),
      /** Pixels to extend in each direction */
      top: z.number().min(0).max(1024).default(0),
      bottom: z.number().min(0).max(1024).default(0),
      left: z.number().min(0).max(1024).default(0),
      right: z.number().min(0).max(1024).default(0),
    }).parse(request.body || {});

    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    try {
      // Use flux-pro fill for outpainting — pass padding params as image_size expansion
      const data = await falFetch('fal-ai/flux-pro/v1/fill', {
        image_url: body.image_url,
        mask_url: body.image_url,
        prompt: body.prompt,
        output_format: 'jpeg',
      }) as { images?: Array<{ url: string }>; image?: { url: string } };

      const images = data.images ?? (data.image ? [data.image] : []);
      const url = images[0]?.url;
      if (!url) throw new Error('Nenhuma imagem retornada');
      return reply.send({ success: true, image_url: url });
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err?.message });
    }
  });

  // ── Object Removal (LaMa) ─────────────────────────────────────────

  /**
   * POST /studio/canvas/object-remove
   * Removes objects from the image using mask. White mask = area to erase.
   * Uses LaMa for seamless fill without needing a prompt.
   */
  app.post('/studio/canvas/object-remove', async (request: any, reply) => {
    const body = z.object({
      image_url: z.string().min(1),
      mask_image_url: z.string().min(1),
    }).parse(request.body || {});

    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    try {
      const data = await falFetch('fal-ai/lama', {
        image_url: body.image_url,
        mask_image_url: body.mask_image_url,
      }) as { image?: { url: string } };

      if (!data.image?.url) throw new Error('Nenhuma imagem retornada');
      return reply.send({ success: true, image_url: data.image.url });
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err?.message });
    }
  });

  // ── SAM Segmentation (Touch Edit / Mark Mode) ─────────────────────

  /**
   * POST /studio/canvas/segment
   * Click-to-segment using SAM2. Returns mask for the clicked object.
   * Used for Touch Edit: user clicks on an element → gets a mask → can edit/remove/replace it.
   */
  app.post('/studio/canvas/segment', async (request: any, reply) => {
    const body = z.object({
      image_url: z.string().min(1),
      /** Click coordinates as fractions 0.0–1.0 of image dimensions */
      points: z.array(z.object({
        x: z.number().min(0).max(1),
        y: z.number().min(0).max(1),
        label: z.number().default(1), // 1 = foreground, 0 = background
      })).min(1),
    }).parse(request.body || {});

    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    try {
      // Get image dimensions to convert fraction coords to pixels
      let imgW = 1024, imgH = 1024;
      try {
        const headRes = await fetch(body.image_url, { method: 'HEAD' });
        // Try to get size from fal CDN headers or default to probing
        const probe = await fetch(body.image_url);
        const buf = Buffer.from(await probe.arrayBuffer());
        // Quick PNG/JPEG dimension extraction
        if (buf[0] === 0x89 && buf[1] === 0x50) { // PNG
          imgW = buf.readUInt32BE(16); imgH = buf.readUInt32BE(20);
        } else if (buf[0] === 0xFF && buf[1] === 0xD8) { // JPEG — scan for SOF
          let off = 2;
          while (off < buf.length - 10) {
            if (buf[off] === 0xFF && (buf[off + 1] >= 0xC0 && buf[off + 1] <= 0xC3)) {
              imgH = buf.readUInt16BE(off + 5); imgW = buf.readUInt16BE(off + 7); break;
            }
            off += 2 + buf.readUInt16BE(off + 2);
          }
        }
      } catch { /* fallback to 1024x1024 */ }

      const data = await falFetch('fal-ai/sam2/image', {
        image_url: body.image_url,
        prompts: body.points.map(p => ({
          x: Math.round(p.x * imgW),
          y: Math.round(p.y * imgH),
          label: p.label,
        })),
      }) as { masks?: Array<{ url: string }>; mask?: { url: string }; image?: { url: string } };

      // SAM returns masks — each is a black/white image
      const masks = data.masks ?? (data.mask ? [data.mask] : data.image ? [data.image] : []);
      const maskUrls = masks.map((m: any) => m.url || m);
      return reply.send({ success: true, mask_urls: maskUrls });
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err?.message });
    }
  });

  // ── Split Layers (Edit Elements) ──────────────────────────────────

  /**
   * POST /studio/canvas/split-layers
   * Splits an image into foreground (subject) and background layers.
   * Returns both layers as separate images.
   */
  app.post('/studio/canvas/split-layers', async (request: any, reply) => {
    const { image_url } = imageUrlSchema.parse(request.body || {});
    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    try {
      // Step 1: Remove background to get foreground with transparency
      const fgData = await falFetch('fal-ai/birefnet/v2', {
        image_url,
      }) as { image?: { url: string } };
      const foregroundUrl = fgData.image?.url;
      if (!foregroundUrl) throw new Error('Falha ao extrair foreground');

      // Step 2: Generate background-only using inpainting
      // We use the foreground mask as inpaint mask to fill the subject area
      const bgData = await falFetch('fal-ai/lama', {
        image_url,
        mask_image_url: foregroundUrl, // foreground = area to fill
      }) as { image?: { url: string } };
      const backgroundUrl = bgData.image?.url;

      return reply.send({
        success: true,
        layers: [
          { id: 'foreground', name: 'Foreground', image_url: foregroundUrl, type: 'foreground' },
          { id: 'background', name: 'Background', image_url: backgroundUrl || image_url, type: 'background' },
          { id: 'original', name: 'Original', image_url, type: 'original' },
        ],
      });
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err?.message });
    }
  });

  // ── Style Transfer ────────────────────────────────────────────────

  /**
   * POST /studio/canvas/style-transfer
   * Applies an artistic style to the image while preserving composition.
   */
  app.post('/studio/canvas/style-transfer', async (request: any, reply) => {
    const body = z.object({
      image_url: z.string().min(1),
      style: z.enum([
        'oil-painting', 'watercolor', 'pencil-sketch', 'anime',
        'pop-art', 'cyberpunk', 'vintage-film', 'neon-glow',
        'minimalist-flat', 'comic-book', 'impressionist', 'surrealist',
      ]),
      strength: z.number().min(0.3).max(0.95).default(0.7),
    }).parse(request.body || {});

    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    const stylePrompts: Record<string, string> = {
      'oil-painting': 'oil painting on canvas, thick brush strokes, rich colors, classical art',
      'watercolor': 'delicate watercolor painting, soft washes, translucent colors, paper texture',
      'pencil-sketch': 'detailed pencil sketch on paper, graphite drawing, hatching and cross-hatching',
      'anime': 'anime art style, cel-shaded, vibrant colors, Studio Ghibli quality',
      'pop-art': 'pop art style, bold colors, halftone dots, Andy Warhol inspired',
      'cyberpunk': 'cyberpunk aesthetic, neon lights, futuristic, dark with glowing accents',
      'vintage-film': 'vintage film photograph, grain, warm tones, 1970s Kodachrome aesthetic',
      'neon-glow': 'neon glow effect, dark background, vivid neon outlines, synthwave',
      'minimalist-flat': 'minimalist flat illustration, clean lines, solid colors, vector art style',
      'comic-book': 'comic book art, bold outlines, cel-shading, action comic style',
      'impressionist': 'impressionist painting, visible brushstrokes, light and color, Monet style',
      'surrealist': 'surrealist art, dreamlike, unexpected juxtapositions, Salvador Dali inspired',
    };

    try {
      const result = await generateImg2ImgWithFal({
        prompt: `${stylePrompts[body.style]}, maintaining the same subject and composition`,
        imageUrl: body.image_url,
        strength: body.strength,
        numImages: 2,
      });
      return reply.send({ success: true, image_urls: result.imageUrls, style: body.style });
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err?.message });
    }
  });

  // ── Image to Video ────────────────────────────────────────────────

  /**
   * POST /studio/canvas/image-to-video
   * Converts a static image to a short video clip using Kling via fal.ai.
   * Async — takes 60-120s. Returns video URL when done.
   */
  app.post('/studio/canvas/image-to-video', async (request: any, reply) => {
    const body = z.object({
      image_url: z.string().min(1),
      prompt: z.string().default('cinematic smooth motion, high quality video'),
      duration: z.union([z.literal(5), z.literal(10)]).default(5),
    }).parse(request.body || {});

    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    try {
      const result = await imageToVideoWithFal({
        imageUrl: body.image_url,
        prompt: body.prompt,
        duration: body.duration,
      });
      return reply.send({ success: true, video_url: result.videoUrl });
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err?.message });
    }
  });

  // ── Cartoonize ────────────────────────────────────────────────────

  /**
   * POST /studio/canvas/cartoonize
   * Converts photo to cartoon/anime avatar style.
   */
  app.post('/studio/canvas/cartoonize', async (request: any, reply) => {
    const body = z.object({
      image_url: z.string().min(1),
      style: z.enum(['anime', 'cartoon', 'pixar', 'caricature']).default('anime'),
    }).parse(request.body || {});

    if (!isFalConfigured()) return reply.status(503).send({ success: false, error: 'FAL_API_KEY nao configurada' });

    const cartoonPrompts: Record<string, string> = {
      'anime': 'anime art style, cel-shaded, vibrant colors, beautiful anime character portrait',
      'cartoon': 'cartoon character, colorful, fun, Disney/Pixar style, smooth rendering',
      'pixar': '3D Pixar-style character render, smooth skin, big expressive eyes, cinematic lighting',
      'caricature': 'exaggerated caricature illustration, humorous, bold lines, expressive features',
    };

    try {
      const result = await generateImg2ImgWithFal({
        prompt: cartoonPrompts[body.style],
        imageUrl: body.image_url,
        strength: 0.75,
        numImages: 2,
      });
      return reply.send({ success: true, image_urls: result.imageUrls });
    } catch (err: any) {
      return reply.status(502).send({ success: false, error: err?.message });
    }
  });

  /**
   * POST /studio/canvas/upload — upload an image asset and return a public URL
   */
  await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } });
  app.post('/studio/canvas/upload', { preHandler: [authGuard, tenantGuard()] }, async (request: any, reply) => {
    const tenantId = request.user.tenant_id;
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: 'No file uploaded' });

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const key = buildKey(tenantId, 'canvas', data.filename);
    await saveFile(buffer, key);

    // Build public URL using same pattern as artworks
    const base = process.env.S3_PUBLIC_URL ?? process.env.API_URL ?? '';
    const fileUrl = base
      ? `${base.replace(/\/$/, '')}/api/artworks/file/${encodeURIComponent(key)}`
      : `/api/artworks/file/${encodeURIComponent(key)}`;

    return reply.send({ success: true, url: fileUrl, name: data.filename });
  });

  // ── Generate Layout — full pipeline: copy → art direction → layout → image ──

  const generateLayoutSchema = z.object({
    message: z.string().min(1),
    client_id: z.string().optional(),
    format: z.string().default('1:1'),
    platform: z.string().default('Instagram'),
    boldness: z.number().min(0).max(1).default(0.5),
    /** Pre-existing copy (skips copy generation) */
    copy: z.object({
      headline: z.string(),
      body: z.string().optional(),
      cta: z.string(),
    }).optional(),
    /** Image provider */
    image_provider: z.enum(['fal', 'gemini']).default('fal'),
    fal_model: z.string().default('flux-pro'),
  });

  /**
   * POST /studio/canvas/generate-layout
   *
   * Full pipeline that returns a production-ready layout with positioned layers:
   *   1. Generate copy (headline, body, CTA) from user message — or use provided copy
   *   2. Load client profile + run AgentDiretorArte for art direction
   *   3. Run LayoutEngine to compose layers (text, image, logo, CTA)
   *   4. Generate background image with layout-aware prompt (image "knows" where text goes)
   *   5. Return complete GeneratedLayout with imageUrl filled in
   */
  app.post('/studio/canvas/generate-layout', async (request: any, reply) => {
    const body = generateLayoutSchema.parse(request.body || {});
    const tenantId = (request.user as any)?.tenant_id as string;

    // ── Step 1: Copy ─────────────────────────────────────────────────
    let copy = body.copy;
    if (!copy) {
      const copyRes = await generateCompletion({
        systemPrompt: `Você é um copywriter sênior. Escreva copy publicitário conciso e impactante.
Retorne SOMENTE JSON: { "headline": "...", "body": "...", "cta": "..." }
- headline: max 60 caracteres, impactante
- body: 1-2 frases de suporte (opcional, pode ser "")
- cta: max 25 caracteres, ação clara`,
        prompt: `Crie copy para: ${body.message}\nPlataforma: ${body.platform}\nFormato: ${body.format}`,
        temperature: 0.6,
        maxTokens: 400,
      });
      try {
        const jsonMatch = copyRes.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          copy = {
            headline: parsed.headline || body.message.slice(0, 60),
            body: parsed.body || undefined,
            cta: parsed.cta || 'Saiba mais',
          };
        }
      } catch { /* fallback below */ }
      if (!copy) {
        copy = { headline: body.message.slice(0, 60), cta: 'Saiba mais' };
      }
    }

    // ── Step 2: Client profile + Art Direction ───────────────────────
    let clientProfile: any = null;
    let logoUrl: string | undefined;
    if (body.client_id && tenantId) {
      clientProfile = await getClientById(tenantId, body.client_id);
      logoUrl = clientProfile?.profile?.logo_url ?? clientProfile?.logo_url;
    }

    // Extract aspect ratio from format string
    const aspectMap: Record<string, string> = {
      '1:1': '1:1', '4:5': '4:5', '9:16': '9:16', '16:9': '16:9',
      '4:3': '4:3', '3:4': '3:4',
      'Feed 1:1': '1:1', 'Stories 9:16': '9:16', 'Reels 9:16': '9:16',
      'Banner 16:9': '16:9', 'Portrait 4:5': '4:5',
    };
    const aspectRatio = aspectMap[body.format] ?? '1:1';

    // Run AgentDiretorArte for visual direction
    let artResult;
    try {
      artResult = await runAgentDiretorArte({
        copy: copy.headline,
        clientProfile: clientProfile?.profile ?? clientProfile,
        platform: body.platform,
        format: body.format,
        aspectRatio,
        boldness: body.boldness,
        tenantId,
        clientId: body.client_id,
        campaignConcept: body.message,
        spatialDirective: 'leave clean area for text overlay based on composition',
      });
    } catch (err: any) {
      console.error('AgentDiretorArte failed, using defaults:', err?.message);
    }

    // Build artDirection object for LayoutEngine from DA result
    const brandColors = clientProfile?.profile?.brand_colors ?? [];
    const artDirection = {
      color_palette: artResult?.brandVisual
        ? [artResult.brandVisual.primaryColor, ...brandColors].filter(Boolean).slice(0, 6)
        : brandColors.length ? brandColors : ['#1a1a2e', '#e94560'],
      primary_color: artResult?.brandVisual?.primaryColor ?? brandColors[0] ?? '#1a1a2e',
      accent_color: brandColors[1] ?? '#e94560',
      typography: {
        headline_style: artResult?.brandVisual?.typography ?? 'bold sans-serif',
        body_style: 'regular sans-serif, 16px',
        cta_style: 'semi-bold, 14px, rounded button',
      },
      photo_directive: artResult?.payload?.prompt ?? body.message,
      composition_type: 'auto',
      mood: artResult?.brandVisual?.moodKeywords?.[0] ?? 'profissional',
    };

    // ── Step 3: Layout composition ───────────────────────────────────
    let layout: GeneratedLayout;
    try {
      layout = await generateLayout({
        copy: { headline: copy.headline, body: copy.body, cta: copy.cta },
        artDirection,
        format: aspectRatio,
        logoUrl,
        platform: body.platform,
      });
    } catch (err: any) {
      console.error('LayoutEngine failed:', err?.message);
      return reply.status(500).send({ success: false, error: 'Falha ao gerar layout' });
    }

    // ── Step 4: Generate background image with layout-aware prompt ──
    let imageUrl: string | undefined;
    try {
      if (body.image_provider === 'gemini') {
        const imgRes = await generateImageGemini({
          prompt: layout.imagePrompt,
          aspectRatio,
        });
        imageUrl = `data:${imgRes.mimeType};base64,${imgRes.base64}`;
      } else {
        if (!isFalConfigured()) throw new Error('FAL_API_KEY nao configurada');
        const imgRes = await generateImageWithFal({
          prompt: layout.imagePrompt,
          aspectRatio,
          negativePrompt: 'text, watermark, logo, words, letters, typography',
          model: body.fal_model as FalModel,
          numImages: 1,
        });
        imageUrl = imgRes.imageUrl;
      }
    } catch (err: any) {
      console.error('Image generation failed:', err?.message);
      // Layout still valid without image — frontend can retry
    }

    // Fill image URL into the background layer
    if (imageUrl) {
      const bgLayer = layout.layers.find(l => l.id === 'bg_image' || l.type === 'image');
      if (bgLayer) bgLayer.imageUrl = imageUrl;
    }

    // ── Step 5: Return complete layout ───────────────────────────────
    return reply.send({
      success: true,
      layout,
      copy,
      image_url: imageUrl,
      art_direction: artDirection,
      provider: body.image_provider,
    });
  });

  // ── Generate Campaign — batch: N pieces with shared art direction ──────────

  const generateCampaignSchema = z.object({
    campaign_id: z.string().min(1),
    /** Each piece: format + platform + optionally which behavioral copy to use */
    pieces: z.array(z.object({
      format: z.string().default('1:1'),
      platform: z.string().default('Instagram'),
      behavior_intent_id: z.string().optional(),
      behavioral_copy_id: z.string().optional(),
      /** Override copy (if not using a behavioral copy) */
      copy: z.object({
        headline: z.string(),
        body: z.string().optional(),
        cta: z.string(),
      }).optional(),
    })).min(1).max(20),
    boldness: z.number().min(0).max(1).default(0.5),
    image_provider: z.enum(['fal', 'gemini']).default('fal'),
    fal_model: z.string().default('flux-pro'),
  });

  /**
   * POST /studio/canvas/generate-campaign
   *
   * Generates N layout pieces for a campaign with shared visual direction:
   *   1. Load campaign + client profile
   *   2. Load behavioral copies for each piece (or use provided copy)
   *   3. Generate ONE shared art direction (visual cohesion)
   *   4. For each piece: layout + image (varying composition, shared palette)
   *   5. Return array of complete layouts
   */
  app.post('/studio/canvas/generate-campaign', async (request: any, reply) => {
    const body = generateCampaignSchema.parse(request.body || {});
    const tenantId = (request.user as any)?.tenant_id as string;

    // ── Load campaign ─────────────────────────────────────────
    const { rows: campaigns } = await pool.query(
      `SELECT * FROM campaigns WHERE tenant_id=$1 AND id=$2`,
      [tenantId, body.campaign_id],
    );
    const campaign = campaigns[0];
    if (!campaign) return reply.status(404).send({ success: false, error: 'Campanha não encontrada' });

    // ── Load client profile ───────────────────────────────────
    const clientId = campaign.client_id;
    const clientProfile = await getClientById(tenantId, clientId);
    const logoUrl = clientProfile?.profile?.logo_url ?? clientProfile?.logo_url;

    // ── Load behavioral copies for pieces that reference them ─
    const copyIds = body.pieces
      .map(p => p.behavioral_copy_id)
      .filter(Boolean) as string[];

    let copiesMap: Record<string, any> = {};
    if (copyIds.length) {
      const { rows: copies } = await pool.query(
        `SELECT id, hook_text, content_text, cta_text, approved_text, behavior_intent_id
         FROM campaign_behavioral_copies
         WHERE tenant_id=$1 AND campaign_id=$2 AND id = ANY($3)`,
        [tenantId, body.campaign_id, copyIds],
      );
      for (const c of copies) copiesMap[c.id] = c;
    }

    // ── Generate ONE shared art direction (visual cohesion) ───
    const brandColors = clientProfile?.profile?.brand_colors ?? [];
    let sharedArtResult;
    try {
      sharedArtResult = await runAgentDiretorArte({
        copy: campaign.name,
        clientProfile: clientProfile?.profile ?? clientProfile,
        platform: body.pieces[0]?.platform ?? 'Instagram',
        format: body.pieces[0]?.format ?? '1:1',
        boldness: body.boldness,
        tenantId,
        clientId,
        campaignConcept: campaign.name + (campaign.objective ? ` — ${campaign.objective}` : ''),
        totalPieces: body.pieces.length,
      });
    } catch (err: any) {
      console.error('AgentDiretorArte campaign failed, using defaults:', err?.message);
    }

    const sharedArtDirection = {
      color_palette: sharedArtResult?.brandVisual
        ? [sharedArtResult.brandVisual.primaryColor, ...brandColors].filter(Boolean).slice(0, 6)
        : brandColors.length ? brandColors : ['#1a1a2e', '#e94560'],
      primary_color: sharedArtResult?.brandVisual?.primaryColor ?? brandColors[0] ?? '#1a1a2e',
      accent_color: brandColors[1] ?? '#e94560',
      typography: {
        headline_style: sharedArtResult?.brandVisual?.typography ?? 'bold sans-serif',
        body_style: 'regular sans-serif, 16px',
        cta_style: 'semi-bold, 14px, rounded button',
      },
      photo_directive: sharedArtResult?.payload?.prompt ?? campaign.name,
      composition_type: 'auto',
      mood: sharedArtResult?.brandVisual?.moodKeywords?.[0] ?? 'profissional',
    };

    // ── Generate each piece (sequentially to avoid API rate limits) ─
    const aspectMap: Record<string, string> = {
      '1:1': '1:1', '4:5': '4:5', '9:16': '9:16', '16:9': '16:9',
      '4:3': '4:3', '3:4': '3:4',
      'Feed 1:1': '1:1', 'Stories 9:16': '9:16', 'Reels 9:16': '9:16',
      'Banner 16:9': '16:9', 'Portrait 4:5': '4:5',
    };

    const results: Array<{
      pieceIndex: number;
      format: string;
      platform: string;
      behavior_intent_id?: string;
      layout: GeneratedLayout;
      copy: { headline: string; body?: string; cta: string };
      image_url?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < body.pieces.length; i++) {
      const piece = body.pieces[i];
      const aspectRatio = aspectMap[piece.format] ?? '1:1';

      // Resolve copy for this piece
      let pieceCopy: { headline: string; body?: string; cta: string } | undefined =
        piece.copy ? { headline: piece.copy.headline, body: piece.copy.body, cta: piece.copy.cta } : undefined;
      if (!pieceCopy && piece.behavioral_copy_id && copiesMap[piece.behavioral_copy_id]) {
        const bc = copiesMap[piece.behavioral_copy_id];
        pieceCopy = {
          headline: bc.hook_text || bc.approved_text?.split('\n')[0] || campaign.name,
          body: bc.content_text || undefined,
          cta: bc.cta_text || 'Saiba mais',
        };
      }
      if (!pieceCopy) {
        // Generate copy for this piece
        try {
          const copyRes = await generateCompletion({
            systemPrompt: `Você é um copywriter sênior. Escreva copy publicitário conciso e impactante.
Retorne SOMENTE JSON: { "headline": "...", "body": "...", "cta": "..." }`,
            prompt: `Crie copy para a campanha "${campaign.name}" (peça ${i + 1} de ${body.pieces.length}).
Plataforma: ${piece.platform}. Formato: ${piece.format}.
Varie o ângulo de abordagem em relação às outras peças.`,
            temperature: 0.6 + (i * 0.05), // slightly different temperature per piece
            maxTokens: 400,
          });
          const jsonMatch = copyRes.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            pieceCopy = {
              headline: parsed.headline || campaign.name,
              body: parsed.body || undefined,
              cta: parsed.cta || 'Saiba mais',
            };
          }
        } catch { /* fallback below */ }
        if (!pieceCopy) {
          pieceCopy = { headline: campaign.name, cta: 'Saiba mais' };
        }
      }

      // Generate layout (varying composition per piece)
      try {
        const layout = await generateLayout({
          copy: { headline: pieceCopy.headline, body: pieceCopy.body, cta: pieceCopy.cta },
          artDirection: {
            ...sharedArtDirection,
            composition_type: 'auto', // let each piece vary
          },
          format: aspectRatio,
          logoUrl,
          platform: piece.platform,
        });

        // Generate image
        let imageUrl: string | undefined;
        try {
          if (body.image_provider === 'gemini') {
            const imgRes = await generateImageGemini({ prompt: layout.imagePrompt, aspectRatio });
            imageUrl = `data:${imgRes.mimeType};base64,${imgRes.base64}`;
          } else {
            if (isFalConfigured()) {
              const imgRes = await generateImageWithFal({
                prompt: layout.imagePrompt,
                aspectRatio,
                negativePrompt: 'text, watermark, logo, words, letters, typography',
                model: body.fal_model as FalModel,
                numImages: 1,
              });
              imageUrl = imgRes.imageUrl;
            }
          }
        } catch (err: any) {
          console.error(`Image generation failed for piece ${i}:`, err?.message);
        }

        // Fill image into background layer
        if (imageUrl) {
          const bgLayer = layout.layers.find(l => l.id === 'bg_image' || l.type === 'image');
          if (bgLayer) bgLayer.imageUrl = imageUrl;
        }

        results.push({
          pieceIndex: i,
          format: piece.format,
          platform: piece.platform,
          behavior_intent_id: piece.behavior_intent_id,
          layout,
          copy: pieceCopy,
          image_url: imageUrl,
        });
      } catch (err: any) {
        results.push({
          pieceIndex: i,
          format: piece.format,
          platform: piece.platform,
          behavior_intent_id: piece.behavior_intent_id,
          layout: {} as any,
          copy: pieceCopy,
          error: err?.message,
        });
      }
    }

    return reply.send({
      success: true,
      campaign_id: body.campaign_id,
      campaign_name: campaign.name,
      art_direction: sharedArtDirection,
      pieces: results,
      total: results.length,
      generated: results.filter(r => !r.error).length,
    });
  });
}
