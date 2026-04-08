import { env } from '../../env';

// ─── Fal.ai endpoint registry ─────────────────────────────────────────────────
export type FalModel =
  | 'flux-pro'           // highest quality, no LoRA
  | 'flux-pro-ultra'     // ultra-res, no LoRA
  | 'flux-dev'           // fast, free-tier friendly
  | 'flux-lora'          // LoRA-enabled for brand consistency
  | 'flux-control-canny' // structure-guided (respects edge maps)
  | 'flux-realism'       // photorealistic
  | 'recraft-v3'         // vector/illustration, great for logos and icons
  | 'ideogram-v2'        // good with text-in-image
  | 'hidream-i1'         // high-quality creative
  | 'stable-diffusion-v35' // SD 3.5 Large
  | 'minimax-image'      // creative artistic
  | 'omnigen-v1'         // versatile gen
  | 'nano-banana-2'      // Google Gemini 3.1 Flash Image — fast, text rendering, reasoning
  | 'nano-banana-pro';   // Google Gemini 3 Pro Image — highest quality, semantic understanding

const FAL_ENDPOINTS: Record<FalModel, string> = {
  'flux-pro':             'https://fal.run/fal-ai/flux-pro/v1.1',
  'flux-pro-ultra':       'https://fal.run/fal-ai/flux-pro/v1.1-ultra',
  'flux-dev':             'https://fal.run/fal-ai/flux/dev',
  'flux-lora':            'https://fal.run/fal-ai/flux-lora',
  'flux-control-canny':   'https://fal.run/fal-ai/flux-control-lora-canny',
  'flux-realism':         'https://fal.run/fal-ai/flux-realism',
  'recraft-v3':           'https://fal.run/fal-ai/recraft-v3',
  'ideogram-v2':          'https://fal.run/fal-ai/ideogram/v2',
  'hidream-i1':           'https://fal.run/fal-ai/hidream-i1-full',
  'stable-diffusion-v35': 'https://fal.run/fal-ai/stable-diffusion-v35-large',
  'minimax-image':        'https://fal.run/fal-ai/minimax/image',
  'omnigen-v1':           'https://fal.run/fal-ai/omnigen-v1',
  'nano-banana-2':        'https://fal.run/fal-ai/nano-banana-2',
  'nano-banana-pro':      'https://fal.run/fal-ai/nano-banana-pro',
};

/** Resolve a fal model name or direct fal.ai path to an endpoint URL */
function resolveEndpoint(model: string): string {
  const aliasMap: Record<string, string> = {
    'fal-flux-pro': 'flux-pro',
    'fal-flux-schnell': 'flux-dev',
    'fal-flux-realism': 'flux-realism',
    'fal-flux-dev': 'flux-dev',
    'flux-schnell': 'flux-dev',
  };
  const normalizedModel = aliasMap[model] || (model.startsWith('fal-') ? model.slice(4) : model);
  // Known alias
  if (normalizedModel in FAL_ENDPOINTS) return FAL_ENDPOINTS[normalizedModel as FalModel];
  // Direct fal.ai path (e.g. "fal-ai/recraft-v3" or full URL)
  if (normalizedModel.startsWith('https://')) return normalizedModel;
  if (normalizedModel.startsWith('fal-ai/')) return `https://fal.run/${normalizedModel}`;
  // Fallback to flux-pro
  return FAL_ENDPOINTS['flux-pro'];
}

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
  /** Which Fal.ai model to use (default: flux-pro). Can be FalModel alias or direct fal-ai/ path */
  model?: FalModel | string;
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
  const endpoint = resolveEndpoint(model);

  const { width, height } = resolveSize(params.aspectRatio);
  const numImages = params.numImages ?? 1;

  // Limit prompt to 2000 chars
  const prompt = (params.prompt ?? '').slice(0, 1990);

  // flux-pro/v1.1 has a simpler API: no user-controlled steps/guidance, uses safety_tolerance
  const isFluxPro = model === 'flux-pro' || model === 'flux-pro-ultra';

  const body: Record<string, any> = {
    prompt,
    image_size:  { width, height },
    num_images:  numImages,
    output_format: 'jpeg',
  };

  if (!isFluxPro) {
    body.num_inference_steps = params.numInferenceSteps ?? (model === 'flux-dev' ? 20 : 28);
    body.guidance_scale      = params.guidanceScale ?? (model === 'flux-dev' ? 3.0 : 3.5);
    body.enable_safety_checker = false;
  } else {
    // flux-pro safety: "6" = least restrictive — needed for portrait/face generation
    body.safety_tolerance = '6';
  }

  if (params.negativePrompt && !isFluxPro) body.negative_prompt = params.negativePrompt;
  if (params.seed) body.seed = params.seed;

  // LoRA injection — supported by flux-lora and flux-control-canny
  if (params.loras?.length && (model === 'flux-lora' || model === 'flux-control-canny' || String(model).includes('lora'))) {
    body.loras = params.loras.map((l) => ({ path: l.path, scale: l.scale ?? 0.85 }));
  }

  // IP-Adapter reference image (flux-pro and flux-dev)
  if (params.referenceImageUrl) {
    body.image_prompt          = params.referenceImageUrl;
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

// ── Image → Video (Kling via fal.ai queue) ────────────────────────────────────

/**
 * Converts a static image to a short video clip using Kling v1.6 via fal.ai.
 * Uses fal.ai queue (async), polls server-side — returns when done.
 * Typical wait: 60–120s.
 */
export async function imageToVideoWithFal(params: {
  imageUrl: string;
  prompt?: string;
  duration?: 5 | 10;
}): Promise<{ videoUrl: string }> {
  const apiKey = env.FAL_API_KEY;
  if (!apiKey) throw new Error('FAL_API_KEY não configurada');

  const model = 'fal-ai/kling-video/v1.6/standard/image-to-video';

  // Step 1: Enqueue
  const queueRes = await fetch(`https://queue.fal.run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: params.imageUrl,
      prompt:    params.prompt ?? 'cinematic smooth motion, high quality video',
      duration:  String(params.duration ?? 5),
    }),
  });

  if (!queueRes.ok) {
    const err = await queueRes.text().catch(() => 'unknown');
    throw new Error(`fal.ai Kling queue error (${queueRes.status}): ${err.slice(0, 300)}`);
  }

  const queue = await queueRes.json() as { request_id: string };
  const requestId = queue.request_id;

  const statusUrl = `https://queue.fal.run/${model}/requests/${requestId}/status`;
  const resultUrl = `https://queue.fal.run/${model}/requests/${requestId}`;

  // Step 2: Poll until done (max 3 min, 5s intervals)
  for (let i = 0; i < 36; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${apiKey}` },
    });
    const status = await statusRes.json() as { status: string };

    if (status.status === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, {
        headers: { Authorization: `Key ${apiKey}` },
      });
      const result = await resultRes.json() as { video?: { url: string }; error?: string };
      if (result.error) throw new Error(`fal.ai Kling error: ${result.error}`);
      const url = result.video?.url;
      if (!url) throw new Error('fal.ai Kling: URL do vídeo não retornada');
      return { videoUrl: url };
    }

    if (status.status === 'FAILED') throw new Error('fal.ai Kling: geração de vídeo falhou');
  }

  throw new Error('fal.ai Kling: timeout (3 min) — tente novamente');
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

export async function generateInstantCharacterWithFal(params: {
  prompt: string;
  imageUrl: string;
  negativePrompt?: string;
  aspectRatio?: string;
  numImages?: number;
  scale?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
  seed?: number;
}): Promise<FalImageResult> {
  const apiKey = env.FAL_API_KEY;
  if (!apiKey) throw new Error('FAL_API_KEY não configurada');

  const { width, height } = resolveSize(params.aspectRatio);
  const model = 'fal-ai/instant-character';
  const body: Record<string, any> = {
    prompt: params.prompt.slice(0, 1990),
    image_url: params.imageUrl,
    image_size: { width, height },
    scale: params.scale ?? 1.1,
    guidance_scale: params.guidanceScale ?? 3.5,
    num_inference_steps: params.numInferenceSteps ?? 28,
    num_images: params.numImages ?? 1,
    enable_safety_checker: false,
    output_format: 'jpeg',
  };

  if (params.negativePrompt) body.negative_prompt = params.negativePrompt;
  if (params.seed) body.seed = params.seed;

  const queueRes = await fetch(`https://queue.fal.run/${model}`, {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!queueRes.ok) {
    const err = await queueRes.text().catch(() => 'unknown');
    throw new Error(`fal.ai instant-character submit failed (${queueRes.status}): ${err.slice(0, 300)}`);
  }

  const queue = await queueRes.json() as { request_id?: string };
  if (!queue.request_id) {
    throw new Error('fal.ai instant-character: request_id não retornado');
  }

  const statusUrl = `https://queue.fal.run/${model}/requests/${queue.request_id}/status`;
  const resultUrl = `https://queue.fal.run/${model}/requests/${queue.request_id}`;

  for (let i = 0; i < 30; i++) {
    await new Promise((resolve) => setTimeout(resolve, 4000));

    const statusRes = await fetch(statusUrl, {
      headers: { Authorization: `Key ${apiKey}` },
    });

    if (!statusRes.ok) {
      const err = await statusRes.text().catch(() => 'unknown');
      throw new Error(`fal.ai instant-character status failed (${statusRes.status}): ${err.slice(0, 300)}`);
    }

    const statusData = await statusRes.json() as { status?: string };
    if (statusData.status === 'COMPLETED') {
      const resultRes = await fetch(resultUrl, {
        headers: { Authorization: `Key ${apiKey}` },
      });

      if (!resultRes.ok) {
        const err = await resultRes.text().catch(() => 'unknown');
        throw new Error(`fal.ai instant-character result failed (${resultRes.status}): ${err.slice(0, 300)}`);
      }

      const data = await resultRes.json() as {
        images?: Array<{ url: string; seed?: number }>;
        image?: { url: string; seed?: number };
        error?: string;
      };

      if (data.error) throw new Error(`fal.ai instant-character error: ${data.error}`);

      const images = data.images ?? (data.image ? [data.image] : []);
      if (!images.length) throw new Error('fal.ai instant-character: nenhuma imagem retornada');

      const imageUrls = images.map((img) => img.url);
      return {
        imageUrl: imageUrls[0],
        imageUrls,
        endpoint: model,
        seed: images[0]?.seed,
      };
    }

    if (statusData.status === 'FAILED') {
      throw new Error('fal.ai instant-character: geração falhou na fila');
    }
  }

  throw new Error('fal.ai instant-character: timeout aguardando resultado da fila');
}

export async function generateInstantCharacterSyncWithFal(params: {
  prompt: string;
  imageUrl: string;
  negativePrompt?: string;
  aspectRatio?: string;
  numImages?: number;
  scale?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
  seed?: number;
}): Promise<FalImageResult> {
  const apiKey = env.FAL_API_KEY;
  if (!apiKey) throw new Error('FAL_API_KEY não configurada');

  const { width, height } = resolveSize(params.aspectRatio);
  const body: Record<string, any> = {
    prompt: params.prompt.slice(0, 1990),
    image_url: params.imageUrl,
    image_size: { width, height },
    scale: params.scale ?? 1.1,
    guidance_scale: params.guidanceScale ?? 3.5,
    num_inference_steps: params.numInferenceSteps ?? 28,
    num_images: params.numImages ?? 1,
    enable_safety_checker: false,
    output_format: 'jpeg',
  };

  if (params.negativePrompt) body.negative_prompt = params.negativePrompt;
  if (params.seed) body.seed = params.seed;

  const res = await fetch('https://fal.run/fal-ai/instant-character', {
    method: 'POST',
    headers: {
      Authorization: `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown');
    throw new Error(`fal.ai instant-character failed (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json() as {
    images?: Array<{ url: string; seed?: number }>;
    image?: { url: string; seed?: number };
    error?: string;
  };

  if (data.error) throw new Error(`fal.ai instant-character error: ${data.error}`);

  const images = data.images ?? (data.image ? [data.image] : []);
  if (!images.length) throw new Error('fal.ai instant-character: nenhuma imagem retornada');

  const imageUrls = images.map((img) => img.url);
  return {
    imageUrl: imageUrls[0],
    imageUrls,
    endpoint: 'fal-ai/instant-character',
    seed: images[0]?.seed,
  };
}

// ── Remove Background ──────────────────────────────────────────────────────────

/**
 * Removes the background from an image using fal.ai BiRefNet.
 * Returns a PNG with transparent background.
 */
export async function removeBackgroundWithFal(imageUrl: string): Promise<{ imageUrl: string }> {
  const apiKey = env.FAL_API_KEY;
  if (!apiKey) throw new Error('FAL_API_KEY não configurada');

  const res = await fetch('https://fal.run/fal-ai/birefnet', {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_url: imageUrl }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown');
    throw new Error(`fal.ai BiRefNet error (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json() as { image?: { url: string }; image_url?: string; error?: string };
  if (data.error) throw new Error(`fal.ai BiRefNet error: ${data.error}`);

  const url = data.image?.url ?? data.image_url;
  if (!url) throw new Error('fal.ai BiRefNet: URL não retornada');
  return { imageUrl: url };
}

// ── Upscale ────────────────────────────────────────────────────────────────────

/**
 * Upscales an image using fal.ai Clarity Upscaler (up to 4×).
 * Preserves details and enhances quality via guided diffusion.
 */
export async function upscaleWithFal(imageUrl: string, scaleFactor: 2 | 4 = 4): Promise<{ imageUrl: string }> {
  const apiKey = env.FAL_API_KEY;
  if (!apiKey) throw new Error('FAL_API_KEY não configurada');

  const res = await fetch('https://fal.run/fal-ai/clarity-upscaler', {
    method: 'POST',
    headers: { Authorization: `Key ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url:    imageUrl,
      scale_factor: scaleFactor,
      prompt:       'masterpiece, best quality, highres',
      creativity:   0.35,
      resemblance:  0.6,
      dynamic:      6,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => 'unknown');
    throw new Error(`fal.ai Clarity Upscaler error (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json() as { image?: { url: string }; image_url?: string; error?: string };
  if (data.error) throw new Error(`fal.ai Upscaler error: ${data.error}`);

  const url = data.image?.url ?? data.image_url;
  if (!url) throw new Error('fal.ai Clarity Upscaler: URL não retornada');
  return { imageUrl: url };
}
