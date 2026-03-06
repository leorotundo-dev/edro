import { env } from '../../env';

const FAL_BASE_URL = 'https://fal.run/fal-ai/flux-pro/v1.1';

/** Map aspect ratio → fal.ai image_size */
function resolveSize(aspectRatio?: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16': return { width: 1080, height: 1920 };
    case '4:5':  return { width: 864,  height: 1080 };
    case '3:4':  return { width: 810,  height: 1080 };
    case '4:3':  return { width: 1080, height: 810  };
    case '16:9': return { width: 1920, height: 1080 };
    case '1:1':
    default:     return { width: 1080, height: 1080 };
  }
}

export interface FalImageResult {
  imageUrl: string;
  imageUrls: string[];
}

/**
 * Generate an image via fal.ai Flux Pro 1.1.
 * Synchronous — returns when generation is complete (~3-8s).
 * No polling needed.
 */
export async function generateImageWithFal(params: {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  numImages?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
}): Promise<FalImageResult> {
  const apiKey = env.FAL_API_KEY;
  if (!apiKey) throw new Error('FAL_API_KEY não configurada');

  const { width, height } = resolveSize(params.aspectRatio);
  const numImages = params.numImages ?? 1;

  // fal.ai Flux Pro 1.1 — limit prompt to 2000 chars
  const MAX_PROMPT = 1990;
  const prompt = params.prompt.length > MAX_PROMPT
    ? params.prompt.slice(0, MAX_PROMPT)
    : params.prompt;

  const body: Record<string, any> = {
    prompt,
    image_size: { width, height },
    num_images: numImages,
    num_inference_steps: params.numInferenceSteps ?? 28,
    guidance_scale: params.guidanceScale ?? 3.5,
    output_format: 'jpeg',
    enable_safety_checker: false,
  };

  if (params.negativePrompt) {
    body.negative_prompt = params.negativePrompt;
  }

  const res = await fetch(FAL_BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`fal.ai Flux generation failed (${res.status}): ${err}`);
  }

  const data = await res.json() as {
    images?: Array<{ url: string }>;
    image?: { url: string };
    error?: string;
  };

  if (data.error) {
    throw new Error(`fal.ai error: ${data.error}`);
  }

  const images = data.images ?? (data.image ? [data.image] : []);
  if (!images.length) {
    throw new Error('fal.ai: nenhuma imagem retornada');
  }

  const imageUrls = images.map((img) => img.url);
  return { imageUrl: imageUrls[0], imageUrls };
}

export function isFalConfigured(): boolean {
  return Boolean(env.FAL_API_KEY);
}
