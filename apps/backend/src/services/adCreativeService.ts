import { env } from '../env';
import { generateImage } from './ai/geminiService';
import { generateCompletion } from './ai/claudeService';

type AdCreativeRequest = {
  copy: string;
  /** Headline do post — conceito visual primário, usado sem truncamento como âncora principal */
  headline?: string;
  /** Corpo do post — contexto temático secundário para informar a cena */
  bodyText?: string;
  format: string;
  brand?: string;
  colors?: string[];
  style?: string;
  segment?: string;
  /** Bloco textual com referências visuais do cliente (cores, diretrizes, posts anteriores) */
  visualContext?: string;
  /** Prompt editado pelo usuário — substitui o prompt de ação auto-gerado (base técnica sempre mantida) */
  customPrompt?: string;
  /** URLs de imagens reais do cliente usadas como referência de estética pelo Gemini multimodal */
  referenceImageUrls?: string[];
  /** Snippets de prompts aprovados anteriormente para este cliente (loop de aprendizado) */
  approvedExamples?: string[];
  /** Tags de rejeição frequentes — o prompt avisa o Gemini para evitar esses padrões */
  avoidPatterns?: string[];
  /** Override image model: 'imagen-3.0-generate-001', 'imagen-3.0-fast-generate-001', or Gemini Flash */
  imageModel?: string;
  /** Aspect ratio for Imagen 3: '1:1' | '3:4' | '4:3' | '9:16' | '16:9' */
  aspectRatio?: string;
  /** Negative prompt — Imagen 3 only */
  negativePrompt?: string;
};

type AdCreativeResponse = {
  success: boolean;
  image_url?: string;
  error?: string;
};

// ── DNA Visual — Base Técnica Fixa ──────────────────────────────────────────
// Apenas qualidade fotográfica e proibições absolutas.
// NÃO inclui referências de pessoas ou setor — isso é responsabilidade do bloco de ação,
// que conhece o tema do post e pode contextualizar corretamente.
const VISUAL_DNA_BASE = `\
CRITICAL RULE — READ FIRST: This is a PURE BACKGROUND IMAGE. Do NOT include any text, words, letters, numbers, titles, captions, labels, overlays, watermarks, typography, or written content of any kind anywhere in the image. The image must be completely text-free. Any text in the image is a failure.

Generate an ultra-realistic cinematic advertising photograph. Full-frame composition, natural HDR dynamic range, high micro-texture detail, physically accurate materials, controlled reflections, professional color science, shallow depth of field with environmental bokeh, volumetric spatial depth.

Use hero perspective with slightly low angle when presence is required, cinematic wide framing with strong subject–environment relationship. Natural lens compression, no optical distortion, precise focal plane on the main subject. Fast prime lens look (35mm range), f/2.8 depth behavior, commercial sharpness.

Soft directional key light combined with real practical ambient light. Warm cinematic highlights, controlled contrast, natural shadow falloff. No plastic or CGI lighting.

Commercial color grading, balanced contrast, realistic color response, warm highlight roll-off, preserved skin tones, high clarity without oversharpen.

ABSOLUTE PROHIBITIONS: No text. No words. No letters. No numbers. No logos. No watermarks. No titles. No captions. No labels. No overlays. No typography of any kind. No AI artifacts, no distorted anatomy, no fake skin, no melted materials, no warped geometry, no extreme lens distortion, no CGI plastic look.

SCENE:`;

// ── System prompt do Art Director ───────────────────────────────────────────
const ART_DIRECTOR_SYSTEM = `\
You are a senior art director at a leading Brazilian advertising agency.
Your job: translate advertising copy into a concrete, cinematic scene description for AI image generation (Gemini / Imagen 3).

RULES:
1. The image must be COMPLETELY TEXT-FREE — never describe text, signs, or legible elements.
2. Find the VISUAL METAPHOR that genuinely bridges the post topic with the brand's identity.
   - The post topic is the IMAGE SUBJECT (what the image IS ABOUT).
   - The brand's industry is the VISUAL ENVIRONMENT / AESTHETIC REGISTER (where or how it feels), NOT the subject.
   - Example: a road company celebrating Advertising Day → the image is about creativity and connection,
     using wide open roads, horizon lines, and infrastructure as a metaphor for possibility —
     NOT a construction worker or road signs.
3. Write ONE coherent English paragraph. Physical objects, light quality, composition, color palette.
4. Translate abstract concepts into concrete visual constructions:
   - "creativity" → a single light beam cutting through fog, color pigments dissolving in water,
     a brushstroke of light across a surface
   - "connection" → two converging road lines meeting at a horizon, hands almost touching,
     two rivers merging
   - "frontier" → a dramatic landscape at the boundary between two different environments
5. Specify compositional space: end with a note about negative space for text overlay.
6. Max 200 words. Output ONLY the scene description — no labels, no preamble, no explanation.
7. Write in English.`;

/**
 * Art Director IA: usa Claude para traduzir os campos estruturados do copy em uma
 * narrativa de cena concreta e integrada, pronta para ser usada como prompt do Gemini.
 *
 * Cria a ponte semântica entre o tema do post e a identidade visual da marca,
 * substituindo a abordagem de template estático.
 *
 * Fallback: se Claude não estiver disponível, retorna buildCreativePrompt().
 */
export async function generateArtDirectorPrompt(
  params: Omit<AdCreativeRequest, 'customPrompt' | 'referenceImageUrls' | 'imageModel' | 'aspectRatio' | 'negativePrompt'>
): Promise<string> {
  const apiKey = env.CLAUDE_API_KEY || env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback gracioso se Claude não estiver configurado
    return buildCreativePrompt(params);
  }

  const headline = params.headline || '';
  const bodyText = params.bodyText || params.copy.slice(0, 300);
  const brand = params.brand || '';
  const segment = params.segment || '';
  const colors = params.colors?.length ? params.colors.join(', ') : '';
  const format = params.format;
  const visualCtx = params.visualContext ? params.visualContext.slice(0, 400) : '';
  const avoidBlock = params.avoidPatterns?.length
    ? `\nPreviously rejected patterns to avoid: ${params.avoidPatterns.join(', ')}.`
    : '';
  const approvedBlock = params.approvedExamples?.length
    ? `\nApproved aesthetic style reference: ${params.approvedExamples.slice(0, 2).join(' | ')}.`
    : '';

  const userPrompt = `Create a scene description for an AI-generated background image:

POST HEADLINE (primary visual concept): "${headline}"
POST BODY (thematic context): "${bodyText}"
BRAND: "${brand}"${segment ? ` — sector: ${segment}` : ''}
FORMAT: ${format}${colors ? `\nBRAND COLORS: ${colors}` : ''}${visualCtx ? `\nBRAND VISUAL REFERENCE: ${visualCtx}` : ''}${approvedBlock}${avoidBlock}

The image will be a full-bleed background. The designer overlays headline and copy on top — leave compositional space for text.

Output: one English paragraph, scene description only.`;

  try {
    const result = await generateCompletion({
      prompt: userPrompt,
      systemPrompt: ART_DIRECTOR_SYSTEM,
      temperature: 0.75,
      maxTokens: 350,
    });

    const scene = result.text.trim();
    if (!scene) return buildCreativePrompt(params);

    // Injeta o DNA visual técnico antes da narrativa do DA
    return `${VISUAL_DNA_BASE}\n${scene}`;
  } catch {
    // Fallback silencioso — nunca quebra o fluxo
    return buildCreativePrompt(params);
  }
}

/**
 * Monta a parte descritiva (ação/conceito) do prompt com base em template estático.
 * Usado como fallback quando o Art Director IA não está disponível.
 *
 * Hierarquia semântica:
 *  ① POST TOPIC (headline + bodyText) — o que a imagem deve mostrar, peso máximo
 *  ② BRAND CONTEXT (brand, segment, colors, visualContext) — identidade visual, peso secundário
 */
export function buildCreativePrompt(params: Omit<AdCreativeRequest, 'customPrompt' | 'referenceImageUrls'>): string {
  const colorHint = params.colors?.length
    ? `Apply brand accent color ${params.colors[0]} as tonal influence in lighting and environment.`
    : '';

  const headlineAnchor = params.headline
    ? `IMAGE SUBJECT — visualize this concept as a scene, do NOT render it as text: "${params.headline}".`
    : '';

  const bodyContext = params.bodyText
    ? `Post theme to inform the scene (do NOT render as text): ${params.bodyText.slice(0, 220)}.`
    : !params.headline && params.copy
    ? `Visual concept (do NOT render as text): ${params.copy.slice(0, 140)}.`
    : '';

  const brandContext = [
    params.brand || params.segment
      ? `BRAND CONTEXT (style reference only — this is NOT the image subject): brand "${params.brand || ''}"${params.segment ? `, sector: ${params.segment}` : ''}.`
      : '',
    colorHint,
    params.visualContext
      ? `Brand aesthetic reference:\n${params.visualContext}`
      : '',
    params.style && params.style !== 'modern'
      ? `Visual tone: ${params.style}.`
      : '',
    params.approvedExamples?.length
      ? `Approved aesthetic style from previous generations: ${params.approvedExamples.slice(0, 2).join(' | ')}.`
      : '',
    params.avoidPatterns?.length
      ? `Previously rejected — avoid: ${params.avoidPatterns.join(', ')}.`
      : '',
  ].filter(Boolean).join(' ');

  const actionBlock = [
    `Social media advertising background image for ${params.format} format. No text anywhere.`,
    headlineAnchor,
    bodyContext,
    brandContext,
    'Produce a visually compelling full-bleed background image — no text, no words, no letters anywhere. Only pure visual imagery suitable for text overlay by the designer.',
  ]
    .filter(Boolean)
    .join('\n');

  return `${VISUAL_DNA_BASE}\n${actionBlock}`;
}

/**
 * Gera uma imagem de fundo para o criativo usando Gemini Image Generation.
 * A base técnica (VISUAL_DNA_BASE) é sempre prefixada ao prompt.
 * Se customPrompt for fornecido, ele substitui apenas a parte de ação — a base permanece.
 *
 * Retorna image_url como data URI (data:image/png;base64,...) pronto para uso no <img>.
 */
export async function generateAdCreative(params: AdCreativeRequest): Promise<AdCreativeResponse> {
  if (!env.GEMINI_API_KEY) {
    return {
      success: false,
      error: 'GEMINI_API_KEY não configurada — necessária para geração de imagem',
    };
  }

  try {
    // customPrompt substitui apenas o bloco de ação — a base técnica VISUAL_DNA_BASE sempre lidera
    const finalPrompt = params.customPrompt
      ? `${VISUAL_DNA_BASE}\n${params.customPrompt}`
      : buildCreativePrompt(params);

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
    return {
      success: false,
      error: err?.message || 'Erro ao gerar imagem com Gemini',
    };
  }
}

export function isAdCreativeConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}
