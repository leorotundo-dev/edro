import { env } from '../../env';

// ─── Fal.ai endpoint registry ─────────────────────────────────────────────────
export type FalModel =
  | 'flux-pro'           // highest quality, no LoRA
  | 'flux-pro-ultra'     // ultra-res, no LoRA
  | 'flux-dev'           // fast, free-tier friendly
  | 'flux-lora'          // LoRA-enabled for brand consistency
  | 'flux-control-canny' // structure-guided (respects edge maps)
  | 'flux-realism';      // photorealistic

const FAL_ENDPOINTS: Record<FalModel, string> = {
  'flux-pro':           'https://fal.run/fal-ai/flux-pro/v1.1',
  'flux-pro-ultra':     'https://fal.run/fal-ai/flux-pro/v1.1-ultra',
  'flux-dev':           'https://fal.run/fal-ai/flux/dev',
  'flux-lora':          'https://fal.run/fal-ai/flux-lora',
  'flux-control-canny': 'https://fal.run/fal-ai/flux-control-lora-canny',
  'flux-realism':       'https://fal.run/fal-ai/flux-realism',
};

export type FalLoraConfig = {
  /** URL to the .safetensors file or Civitai/HuggingFace path */
  path: string;
  /** Strength 0.0–1.0 (default 0.85 for brand LoRA) */
  scale: number;
  /** Human-readable name for debugging */
  name?: string;
};

/** Map aspect ratio → fal.ai image_size */
function resolveSize(aspectRatio?: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16': return { width: 1080, height: 1920 };
    case '4:5':  return { width: 864,  height: 1080 };
    case '3:4':  return { width: 810,  height: 1080 };
    case '4:3':  return { width: 1080, height: 810  };
    case '16:9': return { width: 1920, height: 1080 };
    case '3:1':  return { width: 1620, height: 540  };
    case '2:3':  return { width: 810,  height: 1215 };
    case '1:1':
    default:     return { width: 1080, height: 1080 };
  }
}

export interface FalImageResult {
  imageUrl: string;
  imageUrls: string[];
  /** The endpoint used — for debugging and billing */
  endpoint: string;
  /** Seed used (if returned by Fal.ai) */
  seed?: number;
}

/**
 * Generate an image via fal.ai.
 * Supports multiple Flux endpoints + LoRA injection.
 * Synchronous — no polling needed (~3-12s depending on model).
 */
export async function generateImageWithFal(params: {
  prompt: string;
  negativePrompt?: string;
  aspectRatio?: string;
  numImages?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
  /** Which Fal.ai model to use (default: flux-pro) */
  model?: FalModel;
  /** LoRA configurations for brand consistency */
  loras?: FalLoraConfig[];
  /** Reference image URL or base64 data URI for IP-Adapter style guidance */
  referenceImageUrl?: string;
  /** How strongly the reference image influences generation (0.0–1.0, default 0.15) */
  referenceImageStrength?: number;
  /** Edge map URL for canny-guided generation (flux-control-canny only) */
  controlImageUrl?: string;
  /** Fixed seed for reproducibility */
  seed?: number;
}): Promise<FalImageResult> {
  const apiKey = env.FAL_API_KEY;
  if (!apiKey) throw new Error('FAL_API_KEY não configurada');

  const model = params.model ?? 'flux-pro';
  const endpoint = FAL_ENDPOINTS[model];

  const { width, height } = resolveSize(params.aspectRatio);
  const numImages = params.numImages ?? 1;

  // Limit prompt to 2000 chars
  const prompt = (params.prompt ?? '').slice(0, 1990);

  const body: Record<string, any> = {
    prompt,
    image_size: { width, height },
    num_images: numImages,
    num_inference_steps: params.numInferenceSteps ?? (model === 'flux-dev' ? 20 : 28),
    guidance_scale: params.guidanceScale ?? (model === 'flux-dev' ? 3.0 : 3.5),
    output_format: 'jpeg',
    enable_safety_checker: false,
  };

  if (params.negativePrompt) body.negative_prompt = params.negativePrompt;
  if (params.seed)           body.seed = params.seed;

  // LoRA injection — supported by flux-lora and flux-control-canny
  if (params.loras?.length && (model === 'flux-lora' || model === 'flux-control-canny')) {
    body.loras = params.loras.map((l) => ({ path: l.path, scale: l.scale ?? 0.85 }));
  }

  // IP-Adapter reference image
  if (params.referenceImageUrl) {
    body.image_prompt = params.referenceImageUrl;
    body.image_prompt_strength = params.referenceImageStrength ?? 0.15;
  }

  // Canny control image
  if (params.controlImageUrl && model === 'flux-control-canny') {
    body.control_image_url = params.controlImageUrl;
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`fal.ai ${model} failed (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json() as {
    images?: Array<{ url: string; seed?: number }>;
    image?: { url: string; seed?: number };
    error?: string;
  };

  if (data.error) throw new Error(`fal.ai error: ${data.error}`);

  const images = data.images ?? (data.image ? [data.image] : []);
  if (!images.length) throw new Error('fal.ai: nenhuma imagem retornada');

  const imageUrls = images.map((img) => img.url);
  return {
    imageUrl: imageUrls[0],
    imageUrls,
    endpoint,
    seed: images[0]?.seed,
  };
}

export function isFalConfigured(): boolean {
  return Boolean(env.FAL_API_KEY);
}

// ─── Image-to-Image (true content editing, not IP-Adapter) ────────────────────

/**
 * True img2img via fal-ai/flux/dev/image-to-image.
 * Unlike generateImageWithFal (which uses IP-Adapter for style guidance),
 * this endpoint edits the actual content of the source image guided by the prompt.
 * Strength 0.0 = no change, 1.0 = completely new image.
 */
export async function generateImg2ImgWithFal(params: {
  prompt: string;
  imageUrl: string;
  /** 0–1: deviation from source. 0.7 = variation, 0.85 = inpaint/strong edit */
  strength?: number;
  aspectRatio?: string;
  numImages?: number;
  seed?: number;
}): Promise<FalImageResult> {
  const apiKey = env.FAL_API_KEY;
  if (!apiKey) throw new Error('FAL_API_KEY não configurada');

  const { width, height } = resolveSize(params.aspectRatio);

  const body: Record<string, any> = {
    prompt:                params.prompt.slice(0, 1990),
    image_url:             params.imageUrl,
    strength:              params.strength ?? 0.75,
    num_inference_steps:   28,
    guidance_scale:        3.5,
    output_format:         'jpeg',
    enable_safety_checker: false,
    image_size:            { width, height },
    num_images:            params.numImages ?? 1,
  };
  if (params.seed) body.seed = params.seed;

  const res = await fetch('https://fal.run/fal-ai/flux/dev/image-to-image', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown');
    throw new Error(`fal.ai flux-dev-i2i failed (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json() as {
    images?: Array<{ url: string; seed?: number }>;
    image?:  { url: string; seed?: number };
    error?:  string;
  };

  if (data.error) throw new Error(`fal.ai img2img error: ${data.error}`);

  const images = data.images ?? (data.image ? [data.image] : []);
  if (!images.length) throw new Error('fal.ai img2img: nenhuma imagem retornada');

  const imageUrls = images.map((img) => img.url);
  return {
    imageUrl:  imageUrls[0],
    imageUrls,
    endpoint:  'fal-ai/flux/dev/image-to-image',
    seed:      images[0]?.seed,
  };
}
