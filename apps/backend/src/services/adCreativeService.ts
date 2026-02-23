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
  /** Prompt editado pelo usuário — substitui o prompt auto-gerado quando fornecido */
  customPrompt?: string;
  /** URLs de imagens reais do cliente usadas como referência de estética pelo Gemini multimodal */
  referenceImageUrls?: string[];
};

type AdCreativeResponse = {
  success: boolean;
  image_url?: string;
  error?: string;
};

/**
 * Monta o prompt para geração de imagem com base nos parâmetros e referências visuais.
 * Exportado separadamente para que o endpoint possa retornar o prompt sem gerar a imagem.
 */
export function buildCreativePrompt(params: Omit<AdCreativeRequest, 'customPrompt'>): string {
  const colorHint = params.colors?.length
    ? `Brand accent color: ${params.colors[0]}.`
    : '';

  const copySnippet = params.copy.slice(0, 140);

  return [
    `Professional social media advertising background image for ${params.format} format.`,
    `Visual concept inspired by: "${copySnippet}".`,
    params.brand ? `Brand: ${params.brand}.` : '',
    params.segment ? `Industry sector: ${params.segment}.` : '',
    colorHint,
    params.visualContext
      ? `Brand aesthetic reference:\n${params.visualContext}`
      : '',
    `Style: ${params.style || 'modern'}, minimalist, high quality marketing visual, clean composition.`,
    'IMPORTANT: No text, no words, no logos anywhere in the image.',
    'Create a visually compelling background suitable for overlay text.',
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Gera uma imagem de fundo para o criativo usando Gemini Image Generation.
 * Substitui a integração AdCreative.ai (que exigia API key separada).
 * Usa o mesmo GEMINI_API_KEY já configurado no sistema.
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
    // Se o usuário forneceu um prompt editado, usa diretamente
    const finalPrompt = params.customPrompt || buildCreativePrompt(params);

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
