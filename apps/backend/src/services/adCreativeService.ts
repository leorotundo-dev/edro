import { env } from '../env';
import { generateImage } from './ai/geminiService';

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

/**
 * Monta a parte descritiva (ação/conceito) do prompt com base nos parâmetros.
 *
 * Hierarquia semântica:
 *  ① POST TOPIC (headline + bodyText) — o que a imagem deve mostrar, peso máximo
 *  ② BRAND CONTEXT (brand, segment, colors, visualContext) — identidade visual, peso secundário
 *     O segmento da empresa NÃO é o assunto da imagem: é apenas contexto de marca.
 *     Ex: empresa de rodovias que posta sobre "Dia do Publicitário" → imagem deve ser
 *     sobre publicidade/criatividade, não sobre estradas ou obras.
 *
 * A base técnica (VISUAL_DNA_BASE) é injetada separadamente em generateAdCreative.
 */
export function buildCreativePrompt(params: Omit<AdCreativeRequest, 'customPrompt' | 'referenceImageUrls'>): string {
  const colorHint = params.colors?.length
    ? `Apply brand accent color ${params.colors[0]} as tonal influence in lighting and environment.`
    : '';

  // ① POST TOPIC — âncora visual primária (peso máximo)
  const headlineAnchor = params.headline
    ? `IMAGE SUBJECT — visualize this concept as a scene, do NOT render it as text: "${params.headline}".`
    : '';

  const bodyContext = params.bodyText
    ? `Post theme to inform the scene (do NOT render as text): ${params.bodyText.slice(0, 220)}.`
    : !params.headline && params.copy
    ? `Visual concept (do NOT render as text): ${params.copy.slice(0, 140)}.`
    : '';

  // ② BRAND CONTEXT — estilo e identidade, NÃO o assunto da cena
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
