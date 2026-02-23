import { env } from '../env';
import { generateImage } from './ai/geminiService';

type AdCreativeRequest = {
  copy: string;
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
};

type AdCreativeResponse = {
  success: boolean;
  image_url?: string;
  error?: string;
};

// ── DNA Visual — Base Técnica Fixa ──────────────────────────────────────────
// Este prefixo é sempre injetado antes do prompt de ação.
// Garante consistência fotográfica/cinematográfica em todas as imagens geradas.
// O usuário edita apenas a parte descritiva (ação/conceito); a base permanece intacta.
const VISUAL_DNA_BASE = `\
PHOTOGRAPHY & VISUAL STYLE:
Ultra-realistic cinematic advertising photography, full-frame look, natural HDR dynamic range, high micro-texture detail, physically accurate materials, real skin texture, controlled reflections, professional color science, shallow depth of field with environmental bokeh, volumetric spatial depth, subtle motion realism when needed.

CAMERA:
Hero perspective, slightly low angle when presence is required, cinematic wide framing, strong subject–environment relationship, natural lens compression, no optical distortion, precise focal plane on the main subject. Fast prime lens look (35mm range), f/2.8 depth behavior, low ISO, high shutter clarity, commercial sharpness.

LIGHTING:
Soft directional key light + real practical ambient light. Warm cinematic highlights, controlled contrast, natural shadow falloff, poetic realism. No plastic or CGI lighting.

COLOR & GRADING:
Commercial color grading, balanced contrast, realistic color response, warm highlight roll-off, preserved skin tones, high clarity without oversharpen.

CASTING:
Brazilian workforce presence, real people look, natural beauty, authentic skin tones and facial features, human dignity, confidence and technical intelligence.

NEGATIVE PROMPT:
No AI artifacts, no distorted anatomy, no fake skin, no melted materials, no warped geometry, no incorrect perspective, no extreme lens distortion, no random logos, no text artifacts, no oversaturated colors, no CGI plastic look, no text, no words, no logos anywhere in the image.

---
CREATIVE BRIEF:`;

/**
 * Monta a parte descritiva (ação/conceito) do prompt com base nos parâmetros.
 * A base técnica (VISUAL_DNA_BASE) é injetada separadamente em generateAdCreative.
 * Exportado para que o endpoint possa retornar o prompt completo no modo prompt_only.
 */
export function buildCreativePrompt(params: Omit<AdCreativeRequest, 'customPrompt' | 'referenceImageUrls'>): string {
  const colorHint = params.colors?.length
    ? `Brand accent color: ${params.colors[0]}.`
    : '';

  const copySnippet = params.copy.slice(0, 140);

  const actionBlock = [
    `Social media advertising visual for ${params.format} format.`,
    `Concept: "${copySnippet}".`,
    params.brand ? `Brand: ${params.brand}.` : '',
    params.segment ? `Industry sector: ${params.segment}.` : '',
    colorHint,
    params.visualContext
      ? `Client brand aesthetic reference:\n${params.visualContext}`
      : '',
    params.style && params.style !== 'modern'
      ? `Visual tone: ${params.style}.`
      : '',
    'Create a visually compelling full-bleed background suitable for overlay text.',
  ]
    .filter(Boolean)
    .join(' ');

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
