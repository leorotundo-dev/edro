import { env } from '../env';
import { generateImage } from './ai/geminiService';

type AdCreativeRequest = {
  copy: string;
  format: string;
  brand?: string;
  colors?: string[];
  style?: string;
  segment?: string;
};

type AdCreativeResponse = {
  success: boolean;
  image_url?: string;
  error?: string;
};

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
    const colorHint = params.colors?.length
      ? `Brand accent color: ${params.colors[0]}.`
      : '';

    const copySnippet = params.copy.slice(0, 140);

    const prompt = [
      `Professional social media advertising background image for ${params.format} format.`,
      `Visual concept inspired by: "${copySnippet}".`,
      params.brand ? `Brand: ${params.brand}.` : '',
      params.segment ? `Industry sector: ${params.segment}.` : '',
      colorHint,
      `Style: ${params.style || 'modern'}, minimalist, high quality marketing visual, clean composition.`,
      'IMPORTANT: No text, no words, no logos anywhere in the image.',
      'Create a visually compelling background suitable for overlay text.',
    ]
      .filter(Boolean)
      .join(' ');

    const result = await generateImage({ prompt });

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
