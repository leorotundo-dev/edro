import { env } from '../env';
import { generateImage } from './ai/geminiService';
import { generateImageWithLeonardo, uploadInitImageToLeonardo, resolveLeonardoModelId } from './ai/leonardoService';
import { generateImageWithFal, isFalConfigured } from './ai/falAiService';
import { generateCompletion } from './ai/claudeService';
import { logLeonardoUsage } from './ai/aiUsageLogger';

type AdCreativeRequest = {
  copy: string;
  headline?: string;
  bodyText?: string;
  format: string;
  brand?: string;
  colors?: string[];
  style?: string;
  segment?: string;
  /** Tone/voice description from client profile (e.g. "formal, técnico, sério") */
  clientToneDescription?: string;
  visualContext?: string;
  customPrompt?: string;
  referenceImageUrls?: string[];
  approvedExamples?: string[];
  avoidPatterns?: string[];
  /** Flattened rejection tags from last 3 discarded creatives (e.g. ["errou ambiente","cor errada"]) */
  discardTags?: string[];
  imageModel?: string;
  /** 'gemini' (default) | 'leonardo' | 'fal' */
  imageProvider?: 'gemini' | 'leonardo' | 'fal';
  aspectRatio?: string;
  negativePrompt?: string;
  tenantId?: string;
  /** Number of image variations to generate (default 1) */
  numImages?: number;
  /** Raw bytes of a reference image from client library (for Leonardo img2img) */
  initImageBuffer?: Buffer;
  /** MIME type of the init image */
  initImageMime?: string;
  /** 0.0–1.0 how strongly to follow the init image (default 0.35) */
  initStrength?: number;
  /** Reference image URL or base64 data URI for IP-Adapter style guidance (fal.ai) */
  referenceImageUrl?: string;
  /** 0.0–1.0 how strongly the reference image influences generation (default 0.15) */
  referenceImageStrength?: number;
  /** Specific fal.ai model to use (e.g. 'flux-pro', 'recraft-v3', or 'fal-ai/some-model') */
  falModel?: string;
};

type AdCreativeResponse = {
  success: boolean;
  image_url?: string;
  /** All generated image URLs (Leonardo multi-image mode) */
  image_urls?: string[];
  error?: string;
};

// ── DNA Visual — Base Técnica Fixa ──────────────────────────────────────────
// Sempre injetada pelo backend antes de qualquer prompt de cena.
// NUNCA deve aparecer no campo de prompt editável do usuário —
// é infraestrutura técnica, não conteúdo criativo.
export const VISUAL_DNA_BASE = `\
CRITICAL RULE — READ FIRST: This is a PURE BACKGROUND IMAGE. Do NOT include any text, words, letters, numbers, titles, captions, labels, overlays, watermarks, typography, or written content of any kind anywhere in the image. The image must be completely text-free. Any text in the image is a failure.

Generate an ultra-realistic cinematic advertising photograph. Full-frame composition, natural HDR dynamic range, high micro-texture detail, physically accurate materials, controlled reflections, professional color science, shallow depth of field with environmental bokeh, volumetric spatial depth.

Use hero perspective with slightly low angle when presence is required, cinematic wide framing with strong subject–environment relationship. Natural lens compression, no optical distortion, precise focal plane on the main subject. Fast prime lens look (35mm range), f/2.8 depth behavior, commercial sharpness.

Soft directional key light combined with real practical ambient light. Warm cinematic highlights, controlled contrast, natural shadow falloff. No plastic or CGI lighting.

Commercial color grading, balanced contrast, realistic color response, warm highlight roll-off, preserved skin tones, high clarity without oversharpen.

ABSOLUTE PROHIBITIONS: No text. No words. No letters. No numbers. No logos. No watermarks. No titles. No captions. No labels. No overlays. No typography of any kind. No AI artifacts, no distorted anatomy, no fake skin, no melted materials, no warped geometry, no extreme lens distortion, no CGI plastic look.

SCENE:`;

// ── System prompt do Art Director — Gemini / Imagen 3 ───────────────────────
const ART_DIRECTOR_SYSTEM = `\
You are a senior art director at a leading Brazilian advertising agency.
Your job: translate advertising copy into concrete, cinematic scene descriptions for AI image generation (Gemini / Imagen 3).

RULES:
1. The image must be COMPLETELY TEXT-FREE — never describe text, signs, or legible elements.
2. Find the VISUAL METAPHOR that bridges the post topic with the brand's identity.
   - Post topic = IMAGE SUBJECT (what the image IS ABOUT).
   - Brand industry = VISUAL ENVIRONMENT / AESTHETIC REGISTER (where it feels), NOT the subject.
   - Example: a road company celebrating Advertising Day → image is about creativity and connection,
     using wide open roads and horizon lines as metaphors for possibility — NOT a construction worker.
3. Write concrete, physical scene descriptions. No abstract labels.
4. Translate concepts into physical visual constructions:
   - "creativity" → a light beam cutting through fog, pigments dissolving in water
   - "connection" → two converging road lines meeting at a horizon
   - "frontier/fronteira" → boundary between two different environments, dramatic horizon
5. Specify compositional space at the end: negative space for text overlay.
6. Max 180 words per variation. Output ONLY the scene descriptions, no labels or preamble.
7. Write in English.`;

// ── System prompt do Art Director — Leonardo.ai / Stable Diffusion ────────────
// SD models respond to comma-separated keyword prompts, not prose paragraphs.
const ART_DIRECTOR_SYSTEM_SD = `\
You are a senior art director creating prompts for Stable Diffusion / Leonardo.ai image generation.
Your job: translate advertising copy into comma-separated keyword prompts optimized for SD models.

FORMAT: subject description, environment/setting, lighting style, mood/atmosphere, color palette, composition, quality tags

RULES:
1. ABSOLUTELY NO TEXT in image — always include: no text, no words, no letters, no signs, no watermarks
2. Find the VISUAL METAPHOR that bridges the post topic with the brand's identity.
3. Use concrete visual keywords — no abstract labels.
4. Translate concepts into visual elements:
   - "creativity" → light beams through fog, paint pigments in water
   - "connection" → converging roads, intertwined elements, horizon meeting point
   - "growth" → upward motion, sunrise, sprouting organic forms
5. Always end with composition note for negative space: soft empty area top-left for text overlay
6. Max 120 words per variation. Output ONLY the prompt, no labels, no preamble.
7. Write in English. Use comma-separated keywords, not full sentences.
8. Always append: photorealistic, ultra detailed, cinematic lighting, professional photography, commercial advertising, no text, no words`;

type ArtDirectorParams = Omit<
  AdCreativeRequest,
  'customPrompt' | 'referenceImageUrls' | 'imageModel' | 'aspectRatio' | 'negativePrompt' | 'numImages'
> & {
  /** Perfil estético sintetizado do cliente — gerado a partir do histórico de aprovações */
  aestheticProfile?: string;
  /** Image generation provider — determines prompt style (prose vs SD keywords) */
  provider?: 'gemini' | 'leonardo';
};

/**
 * Art Director IA — gera variações de narrativa de cena para o prompt do Gemini.
 *
 * Retorna um array de scene descriptions (sem VISUAL_DNA_BASE — o backend injeta isso).
 * O usuário vê e edita essas narrativas no campo de prompt.
 *
 * Variações:
 *   A) Metafórica — conceito abstrato traduzido em imagem simbólica
 *   B) Ambiental  — atmosfera e ambiente como protagonistas
 *   C) Humana     — presença humana que ancora o conceito emocionalmente
 *
 * Fallback: buildScenePrompt() se Claude não estiver disponível.
 */
export async function generateArtDirectorPrompt(
  params: ArtDirectorParams
): Promise<string[]> {
  const apiKey = env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return [buildScenePrompt(params)];
  }

  const headline = params.headline || '';
  const bodyText = params.bodyText || params.copy.slice(0, 300);
  const brand = params.brand || '';
  const segment = params.segment || '';
  const colors = params.colors?.length ? params.colors.join(', ') : '';
  const visualCtx = params.visualContext ? params.visualContext.slice(0, 400) : '';
  const avoidBlock = params.avoidPatterns?.length
    ? `\nPreviously rejected patterns to avoid: ${params.avoidPatterns.join(', ')}.`
    : '';
  const approvedBlock = params.approvedExamples?.length
    ? `\nApproved aesthetic style from past: ${params.approvedExamples.slice(0, 2).join(' | ')}.`
    : '';
  const aestheticBlock = params.aestheticProfile
    ? `\nCLIENT AESTHETIC PROFILE (synthesized from approved creatives — follow this):\n${params.aestheticProfile.slice(0, 500)}`
    : '';
  const discardBlock = params.discardTags?.length
    ? `\nRECENT DISCARD FEEDBACK — client explicitly rejected these in the last sessions (avoid at all costs): ${params.discardTags.join(', ')}.`
    : '';
  const toneBlock = params.clientToneDescription
    ? `\nCLIENT TONE/VOICE: ${params.clientToneDescription.slice(0, 150)} — translate this tone into visual atmosphere.`
    : '';

  const isSD = params.provider === 'leonardo';

  const userPrompt = isSD
    ? `Create 3 Stable Diffusion keyword prompts for an AI-generated advertising background image.

POST HEADLINE (primary visual concept): "${headline}"
POST BODY (thematic context): "${bodyText}"
BRAND: "${brand}"${segment ? ` — sector: ${segment}` : ''}
FORMAT: ${params.format}${colors ? `\nBRAND COLORS (use as tonal palette): ${colors}` : ''}${visualCtx ? `\nBRAND VISUAL REFERENCE: ${visualCtx}` : ''}${toneBlock}${aestheticBlock}${approvedBlock}${avoidBlock}${discardBlock}

The image will be a full-bleed background with text overlay on top. Leave compositional space for text.

Generate exactly 3 variations separated by "---":

VARIATION A (metaphorical): abstract symbolic concept translated into visual keywords.

VARIATION B (environmental): atmosphere, landscape, light and space as protagonists.

VARIATION C (human presence): person/people embodying the concept.

Each variation: comma-separated keywords, max 120 words, end with composition note. No labels, no preamble — just the 3 keyword prompts separated by ---.`
    : `Create 3 scene descriptions for an AI-generated advertising background image.

POST HEADLINE (primary visual concept): "${headline}"
POST BODY (thematic context): "${bodyText}"
BRAND: "${brand}"${segment ? ` — sector: ${segment}` : ''}
FORMAT: ${params.format}${colors ? `\nBRAND COLORS: ${colors}` : ''}${visualCtx ? `\nBRAND VISUAL REFERENCE: ${visualCtx}` : ''}${toneBlock}${aestheticBlock}${approvedBlock}${avoidBlock}${discardBlock}

The image will be a full-bleed background — the designer overlays headline and copy on top.

Generate exactly 3 variations separated by "---":

VARIATION A (metaphorical): translate the concept into a symbolic scene — abstract, poetic, unexpected visual metaphor.

VARIATION B (environmental): the environment and atmosphere carry the concept — landscape, light, space, mood.

VARIATION C (human presence): a person embodies the concept — their posture, expression, context communicates the idea.

Each variation: one English paragraph, max 180 words, ends with a composition note (negative space for text overlay). No labels, no preamble — just the 3 paragraphs separated by ---.`;

  try {
    const result = await generateCompletion({
      prompt: userPrompt,
      systemPrompt: isSD ? ART_DIRECTOR_SYSTEM_SD : ART_DIRECTOR_SYSTEM,
      temperature: 0.8,
      maxTokens: 900,
    });

    const raw = result.text.trim();
    const parts = raw
      .split(/\n?---\n?/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length === 0) return [buildScenePrompt(params)];

    // Retorna até 3 variações; completa com fallback se Claude gerou menos
    const variations = parts.slice(0, 3);
    while (variations.length < 3) {
      variations.push(buildScenePrompt(params));
    }
    return variations;
  } catch {
    return [buildScenePrompt(params)];
  }
}

/**
 * Fallback estático — usado quando Claude não está disponível.
 * Retorna apenas a narrativa da cena (sem VISUAL_DNA_BASE).
 */
export function buildScenePrompt(params: ArtDirectorParams): string {
  const colorHint = params.colors?.length
    ? `Apply brand accent color ${params.colors[0]} as tonal influence in lighting.`
    : '';

  const headlineAnchor = params.headline
    ? `IMAGE SUBJECT — visualize as a scene, do NOT render as text: "${params.headline}".`
    : '';

  const bodyContext = params.bodyText
    ? `Post theme (do NOT render as text): ${params.bodyText.slice(0, 220)}.`
    : !params.headline && params.copy
    ? `Visual concept (do NOT render as text): ${params.copy.slice(0, 140)}.`
    : '';

  const brandContext = [
    params.brand || params.segment
      ? `BRAND CONTEXT (style only — NOT the image subject): brand "${params.brand || ''}"${params.segment ? `, sector: ${params.segment}` : ''}.`
      : '',
    colorHint,
    params.visualContext ? `Brand aesthetic reference:\n${params.visualContext}` : '',
    params.style && params.style !== 'modern' ? `Visual tone: ${params.style}.` : '',
    params.approvedExamples?.length
      ? `Approved aesthetic style: ${params.approvedExamples.slice(0, 2).join(' | ')}.`
      : '',
    params.avoidPatterns?.length
      ? `Avoid: ${params.avoidPatterns.join(', ')}.`
      : '',
  ].filter(Boolean).join(' ');

  return [
    `Social media advertising background image for ${params.format} format. No text anywhere.`,
    headlineAnchor,
    bodyContext,
    brandContext,
    'Full-bleed background image — no text, no words, no letters. Negative space for text overlay.',
  ].filter(Boolean).join('\n');
}

/**
 * buildCreativePrompt — compat wrapper que inclui VISUAL_DNA_BASE.
 * Usado apenas no caminho de geração direta (sem custom_prompt e sem Art Director).
 */
export function buildCreativePrompt(
  params: Omit<AdCreativeRequest, 'customPrompt' | 'referenceImageUrls'>
): string {
  return `${VISUAL_DNA_BASE}\n${buildScenePrompt(params)}`;
}

/**
 * Gera a imagem de fundo. VISUAL_DNA_BASE é sempre injetada aqui.
 * customPrompt é a narrativa de cena (sem DNA base) — vem do Art Director ou da edição do usuário.
 */
export async function generateAdCreative(params: AdCreativeRequest): Promise<AdCreativeResponse> {
  const provider = params.imageProvider || 'gemini';

  // ── Leonardo.ai ─────────────────────────────────────────────────────
  if (provider === 'leonardo') {
    if (!env.LEONARDO_API_KEY) {
      return { success: false, error: 'LEONARDO_API_KEY não configurada' };
    }
    try {
      const sceneNarrative = params.customPrompt || buildScenePrompt(params);
      // Leonardo is SD-based: shorter prefix, full scene narrative takes priority
      const LEONARDO_PREFIX = 'Cinematic advertising photograph, pure background image, absolutely no text no words no letters no logos no watermarks, photorealistic, commercial quality. SCENE:';
      const finalPrompt = `${LEONARDO_PREFIX} ${sceneNarrative}`;
      const modelId = resolveLeonardoModelId(params.imageModel);

      // ── img2img: upload init image from client library (if provided) ──
      let initImageId: string | undefined;
      if (params.initImageBuffer && params.initImageMime) {
        try {
          initImageId = await uploadInitImageToLeonardo(params.initImageBuffer, params.initImageMime);
        } catch (uploadErr: any) {
          // Non-fatal: fall back to text-to-image if upload fails
          console.warn('[leonardo] init-image upload failed, falling back to txt2img:', uploadErr?.message);
        }
      }

      const t0 = Date.now();
      const numImages = params.numImages ?? 1;
      const result = await generateImageWithLeonardo({
        prompt: finalPrompt,
        modelId,
        aspectRatio: params.aspectRatio,
        negativePrompt: params.negativePrompt,
        numImages,
        initImageId,
        initStrength: params.initStrength,
      });
      const durationMs = Date.now() - t0;
      if (params.tenantId) {
        const modelAlias = params.imageModel || 'leonardo-phoenix';
        logLeonardoUsage({
          tenant_id: params.tenantId,
          model_id: modelId,
          model_alias: modelAlias,
          num_images: numImages,
          feature: 'image_generation',
          duration_ms: durationMs,
          metadata: { format: params.format, aspect_ratio: params.aspectRatio },
        });
      }
      return {
        success: true,
        image_url: result.imageUrl,
        image_urls: result.imageUrls,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao gerar imagem com Leonardo.ai' };
    }
  }

  // ── fal.ai (Flux Pro 1.1) ────────────────────────────────────────────
  if (provider === 'fal') {
    if (!isFalConfigured()) {
      return { success: false, error: 'FAL_API_KEY não configurada' };
    }
    try {
      const sceneNarrative = params.customPrompt || buildScenePrompt(params);
      const finalPrompt = `${VISUAL_DNA_BASE}\n${sceneNarrative}`;
      const result = await generateImageWithFal({
        prompt: finalPrompt,
        negativePrompt: params.negativePrompt,
        aspectRatio: params.aspectRatio,
        numImages: params.numImages ?? 1,
        referenceImageUrl: params.referenceImageUrl,
        referenceImageStrength: params.referenceImageStrength,
        model: (params.falModel as any) || 'flux-pro',
      });
      return {
        success: true,
        image_url: result.imageUrl,
        image_urls: result.imageUrls,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao gerar imagem com fal.ai' };
    }
  }

  // ── Gemini (default) ────────────────────────────────────────────────
  if (!env.GEMINI_API_KEY) {
    return { success: false, error: 'GEMINI_API_KEY não configurada' };
  }

  try {
    // DNA base sempre no frontend do prompt — customPrompt é só a narrativa
    const sceneNarrative = params.customPrompt || buildScenePrompt(params);
    const finalPrompt = `${VISUAL_DNA_BASE}\n${sceneNarrative}`;

    const result = await generateImage({
      prompt: finalPrompt,
      referenceImageUrls: params.referenceImageUrls,
      model: params.imageModel,
      aspectRatio: params.aspectRatio,
      negativePrompt: params.negativePrompt,
    });

    return {
      success: true,
      image_url: `data:${result.mimeType};base64,${result.base64}`,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao gerar imagem com Gemini' };
  }
}

export function isAdCreativeConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY || env.LEONARDO_API_KEY || env.FAL_API_KEY);
}

/**
 * Iteração Guiada — o usuário descreve o que quer mudar na cena e o DA ajusta.
 * Recebe a narrativa atual + instrução em linguagem natural → devolve narrativa refinada.
 *
 * Exemplos de instrução:
 *   "mais sombrio, cena noturna"
 *   "sem pessoas, só paisagem"
 *   "mais abstrato, menos literal"
 *   "use a cor laranja como elemento dominante"
 */
export async function refineScenePrompt(params: {
  currentPrompt: string;
  instruction: string;
  headline?: string;
  brand?: string;
  aestheticProfile?: string;
  provider?: 'gemini' | 'leonardo';
}): Promise<string> {
  const apiKey = env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return params.currentPrompt; // sem Claude, devolve inalterado
  }

  const isSD = params.provider === 'leonardo';

  const contextBlock = [
    params.headline ? `Original post headline: "${params.headline}"` : '',
    params.brand ? `Brand: ${params.brand}` : '',
    params.aestheticProfile
      ? `Client aesthetic profile: ${params.aestheticProfile.slice(0, 300)}`
      : '',
  ].filter(Boolean).join('\n');

  const outputInstruction = isSD
    ? 'Output: refined comma-separated keyword prompt only — max 120 words. No labels, no preamble.'
    : 'Output: the refined scene description only — one English paragraph, max 200 words. No labels, no preamble.';

  try {
    const result = await generateCompletion({
      prompt: `You are an art director refining a ${isSD ? 'Stable Diffusion keyword prompt' : 'scene description'} for AI image generation.

CURRENT ${isSD ? 'PROMPT' : 'SCENE'}:
${params.currentPrompt}

${contextBlock ? `CONTEXT:\n${contextBlock}\n` : ''}
USER INSTRUCTION: "${params.instruction}"

Apply the instruction. Keep what works, change only what the instruction asks. ${isSD ? 'Maintain comma-separated keyword format.' : 'Maintain the same level of concreteness and cinematic quality.'} End with a composition note about negative space for text overlay.

${outputInstruction}`,
      systemPrompt: isSD ? ART_DIRECTOR_SYSTEM_SD : ART_DIRECTOR_SYSTEM,
      temperature: 0.65,
      maxTokens: 350,
    });

    return result.text.trim() || params.currentPrompt;
  } catch {
    return params.currentPrompt;
  }
}
