import { env } from '../../env';
import type { AiCompletionResult } from './claudeService';
import { estimateTokens } from './aiUsageLogger';

type CompletionParams = {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
};

type GeminiResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

const BASE_URL = env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
const DEFAULT_MODEL = env.GEMINI_MODEL || 'gemini-1.5-flash';
const RESPONSE_MIME = env.GEMINI_RESPONSE_MIME;

export async function generateCompletion(params: CompletionParams): Promise<AiCompletionResult> {
  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY_NOT_SET');
  }

  // 90s HTTP timeout — analysis pipelines send large prompts
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  let response: Response;
  try {
    response = await fetch(
      `${BASE_URL}/models/${DEFAULT_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: params.prompt }],
            },
          ],
          system_instruction: params.systemPrompt
            ? { parts: [{ text: params.systemPrompt }] }
            : undefined,
          generationConfig: {
            temperature: params.temperature ?? 0.6,
            maxOutputTokens: params.maxTokens ?? 1500,
            ...(RESPONSE_MIME ? { responseMimeType: RESPONSE_MIME } : {}),
          },
        }),
        signal: controller.signal,
      }
    );
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new Error('Gemini API timed out after 90s');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini error: ${response.status} ${text}`);
  }

  const data = (await response.json()) as GeminiResponse;
  const parts = data.candidates?.[0]?.content?.parts || [];
  const text = parts.map((part) => part.text || '').join('').trim();

  if (!text) {
    throw new Error('Gemini returned empty response');
  }

  const inputTokens = data.usageMetadata?.promptTokenCount || estimateTokens(params.prompt + (params.systemPrompt || ''));
  const outputTokens = data.usageMetadata?.candidatesTokenCount || estimateTokens(text);

  return {
    text,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    },
    model: DEFAULT_MODEL,
  };
}

// ── Tool Use Support ───────────────────────────────────────────

export type GeminiToolsParams = {
  messages: Array<{ role: string; parts: any[] }>;
  systemPrompt?: string;
  tools?: any[];
  temperature?: number;
  maxTokens?: number;
};

export type GeminiToolsResult = {
  parts: Array<{ text?: string; functionCall?: { name: string; args: any } }>;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
};

export async function generateWithTools(params: GeminiToolsParams): Promise<GeminiToolsResult> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY_NOT_SET');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  const body: any = {
    contents: params.messages,
    generationConfig: {
      temperature: params.temperature ?? 0.7,
      maxOutputTokens: params.maxTokens ?? 4096,
    },
  };
  if (params.systemPrompt) {
    body.system_instruction = { parts: [{ text: params.systemPrompt }] };
  }
  if (params.tools?.length) body.tools = params.tools;

  let response: Response;
  try {
    response = await fetch(
      `${BASE_URL}/models/${DEFAULT_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      },
    );
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Gemini API timed out after 60s');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const inputTokens = data.usageMetadata?.promptTokenCount || 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount || 0;

  return {
    parts,
    usage: { input_tokens: inputTokens, output_tokens: outputTokens },
    model: DEFAULT_MODEL,
  };
}

// ── Image Generation (Gemini 2.0 Flash Image) ───────────────────────────────
//
// Usa o mesmo GEMINI_API_KEY com um modelo dedicado à geração de imagens.
// Modelo padrão: gemini-2.0-flash-preview-image-generation
// Response: parts[].inlineData.{ data (base64), mimeType }

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-exp-image-generation';
// Image generation uses v1beta (same as other Gemini calls)
const IMAGE_BASE_URL = BASE_URL;

export type GeminiImageResult = {
  base64: string;
  mimeType: string;
};

/**
 * Fetches a public image URL and returns it as a base64-encoded inlineData part
 * suitable for the Gemini multimodal API.
 * Returns null if fetch fails (best-effort, never throws).
 */
async function fetchImageAsInlineData(url: string): Promise<{ inlineData: { data: string; mimeType: string } } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type') || 'image/jpeg';
    const mimeType = contentType.split(';')[0].trim();
    if (!mimeType.startsWith('image/')) return null;
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    return { inlineData: { data: base64, mimeType } };
  } catch {
    return null;
  }
}

/** Imagen 3 uses a separate predict endpoint (not generateContent). */
async function generateImageWithImagen(params: {
  prompt: string;
  model: string;
  aspectRatio?: string;
  negativePrompt?: string;
}): Promise<GeminiImageResult> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY_NOT_SET');
  const body = {
    instances: [{ prompt: params.prompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: params.aspectRatio || '1:1',
      personGeneration: 'ALLOW_ADULT',
      ...(params.negativePrompt ? { negativePrompt: params.negativePrompt } : {}),
    },
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120000);
  let response: Response;
  try {
    response = await fetch(
      `${IMAGE_BASE_URL}/models/${params.model}:predict?key=${env.GEMINI_API_KEY}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal }
    );
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Imagen timed out after 120s');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    const text = await response.text().catch(() => response.status.toString());
    throw new Error(`Imagen API error ${response.status}: ${text.slice(0, 300)}`);
  }
  const data = await response.json() as { predictions?: Array<{ bytesBase64Encoded: string; mimeType: string }>; error?: { message: string } };
  if (data.error) throw new Error(data.error.message);
  const prediction = data.predictions?.[0];
  if (!prediction?.bytesBase64Encoded) throw new Error('Imagen returned no image');
  return { base64: prediction.bytesBase64Encoded, mimeType: prediction.mimeType || 'image/png' };
}

export async function generateImage(params: {
  prompt: string;
  /** URLs of reference images to include as visual style context (best-effort) */
  referenceImageUrls?: string[];
  /** Override the default Gemini Flash model. Use 'imagen-3.0-generate-001' or 'imagen-3.0-fast-generate-001' for Imagen 3. */
  model?: string;
  /** Aspect ratio — only respected by Imagen 3 models */
  aspectRatio?: string;
  /** Negative prompt — only respected by Imagen 3 models */
  negativePrompt?: string;
}): Promise<GeminiImageResult> {
  if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY_NOT_SET');

  const model = params.model || IMAGE_MODEL;

  // Route Imagen 3 models to the predict endpoint
  if (model.startsWith('imagen-')) {
    return generateImageWithImagen({ prompt: params.prompt, model, aspectRatio: params.aspectRatio, negativePrompt: params.negativePrompt });
  }

  // Build multimodal parts: text prompt + optional reference images
  const textPart = { text: params.prompt };
  const imageParts: Array<{ inlineData: { data: string; mimeType: string } }> = [];

  if (params.referenceImageUrls?.length) {
    const fetched = await Promise.all(
      params.referenceImageUrls.slice(0, 3).map(url => fetchImageAsInlineData(url))
    );
    for (const part of fetched) {
      if (part) imageParts.push(part);
    }
  }

  // When reference images are present, prepend a style-context instruction
  const parts: any[] = imageParts.length > 0
    ? [
        { text: `Use the following images as visual style references for the brand aesthetic. Capture their color palette, mood, and visual language:\n` },
        ...imageParts,
        { text: `\nNow generate the image described below, maintaining that brand aesthetic:\n` },
        textPart,
      ]
    : [textPart];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  let response: Response;
  try {
    response = await fetch(
      `${IMAGE_BASE_URL}/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            temperature: 1.0,
          },
        }),
        signal: controller.signal,
      }
    );
  } catch (err: any) {
    if (err?.name === 'AbortError') throw new Error('Gemini image generation timed out after 90s');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Gemini image error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const responseParts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find((p: any) => p.inlineData?.data);

  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini did not return an image in the response');
  }

  return {
    base64: imagePart.inlineData.data as string,
    mimeType: (imagePart.inlineData.mimeType as string) || 'image/png',
  };
}

export const GeminiService = {
  generateCompletion,
  generateWithTools,
  generateImage,
};
