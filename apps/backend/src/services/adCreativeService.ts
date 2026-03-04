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
// Este prefixo é sempre injetado antes do prompt de ação.
// Garante consistência fotográfica/cinematográfica em todas as imagens geradas.
// O usuário edita apenas a parte descritiva (ação/conceito); a base permanece intacta.
const VISUAL_DNA_BASE = `\
CRITICAL RULE — READ FIRST: This is a PURE BACKGROUND IMAGE. Do NOT include any text, words, letters, numbers, titles, captions, labels, overlays, watermarks, typography, or written content of any kind anywhere in the image. The image must be completely text-free. Any text in the image is a failure.

Generate an ultra-realistic cinematic advertising photograph. Full-frame composition, natural HDR dynamic range, high micro-texture detail, physically accurate materials, controlled reflections, professional color science, shallow depth of field with environmental bokeh, volumetric spatial depth.

Use hero perspective with slightly low angle when presence is required, cinematic wide framing with strong subject–environment relationship. Natural lens compression, no optical distortion, precise focal plane on the main subject. Fast prime lens look (35mm range), f/2.8 depth behavior, commercial sharpness.

Soft directional key light combined with real practical ambient light. Warm cinematic highlights, controlled contrast, natural shadow falloff. No plastic or CGI lighting.

Commercial color grading, balanced contrast, realistic color response, warm highlight roll-off, preserved skin tones, high clarity without oversharpen.

Authentic Brazilian workforce presence when people are shown. Real people, natural beauty, authentic skin tones, human dignity, confidence, and technical competence.

ABSOLUTE PROHIBITIONS: No text. No words. No letters. No numbers. No logos. No watermarks. No titles. No captions. No labels. No overlays. No typography of any kind. No AI artifacts, no distorted anatomy, no fake skin, no melted materials, no warped geometry, no extreme lens distortion, no CGI plastic look.

SCENE:`;

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
    `Social media advertising background image for ${params.format} format. No text anywhere.`,
    `Visual concept inspired by this idea (do NOT render any of this as text in the image): ${copySnippet}.`,
    params.brand ? `Brand aesthetic: ${params.brand}.` : '',
    params.segment ? `Industry sector visual context: ${params.segment}.` : '',
    colorHint,
    params.visualContext
      ? `Client brand aesthetic reference:\n${params.visualContext}`
      : '',
    params.style && params.style !== 'modern'
      ? `Visual tone: ${params.style}.`
      : '',
    params.approvedExamples?.length
      ? `Aesthetic style reference from previous approved generations: ${params.approvedExamples.slice(0, 2).join(' | ')}.`
      : '',
    params.avoidPatterns?.length
      ? `Previously rejected for these reasons — avoid: ${params.avoidPatterns.join(', ')}.`
      : '',
    'Produce a visually compelling full-bleed background image — no text, no words, no letters anywhere. Only pure visual imagery suitable for text overlay by the designer.',
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
