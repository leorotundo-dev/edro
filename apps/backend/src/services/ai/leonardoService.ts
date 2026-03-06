import { env } from '../../env';

const LEONARDO_BASE_URL = 'https://cloud.leonardo.ai/api/rest/v1';

// Leonardo model IDs
export const LEONARDO_MODELS = {
  /** Phoenix 1.0 — flagship, highest quality */
  phoenix: 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf3',
  /** Lightning XL — fast, SDXL-based (alchemy not supported) */
  lightningXL: 'b24e16ff-06e3-43eb-8d33-4416c2d75876',
  /** Kino XL — cinematic look */
  kinoXL: 'aa77f04e-3eec-4034-9c07-d0f619684628',
  /** Diffusion XL — creative/artistic */
  diffusionXL: '1e60896f-3c26-4296-8ecc-53e2afecc132',
} as const;

/** Models that do NOT support alchemy (SDXL Lightning architecture) */
const NO_ALCHEMY_MODELS = new Set([
  'b24e16ff-06e3-43eb-8d33-4416c2d75876', // Lightning XL
]);

export type LeonardoModelId = (typeof LEONARDO_MODELS)[keyof typeof LEONARDO_MODELS] | string;

/** Resolve friendly alias → real Leonardo model UUID */
export function resolveLeonardoModelId(modelId?: string): string {
  switch (modelId) {
    case 'leonardo-phoenix':      return LEONARDO_MODELS.phoenix;
    case 'leonardo-lightning-xl': return LEONARDO_MODELS.lightningXL;
    case 'leonardo-kino-xl':      return LEONARDO_MODELS.kinoXL;
    case 'leonardo-diffusion-xl': return LEONARDO_MODELS.diffusionXL;
    default:                      return modelId || LEONARDO_MODELS.phoenix;
  }
}

/** Map aspect ratio string → Leonardo width/height */
function resolveSize(aspectRatio?: string): { width: number; height: number } {
  switch (aspectRatio) {
    case '9:16': return { width: 1080, height: 1920 };
    case '4:5':  return { width: 864,  height: 1080 };
    case '3:4':  return { width: 768,  height: 1024 };
    case '4:3':  return { width: 1024, height: 768  };
    case '16:9': return { width: 1024, height: 576  };
    case '1:1':
    default:     return { width: 1024, height: 1024 };
  }
}

/** Map MIME type → Leonardo file extension */
function mimeToExt(mime: string): string {
  if (mime.includes('png'))  return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
}

export interface LeonardoImageResult {
  /** First generated image URL (CDN) */
  imageUrl: string;
  /** All generated image URLs (CDN) — length = numImages requested */
  imageUrls: string[];
  generationId: string;
}

/**
 * Upload a reference image to Leonardo's init-image endpoint.
 * Returns the init_image_id to use in a subsequent generation call.
 *
 * Flow:
 *   1. POST /init-image with { extension } → get presigned S3 URL + id
 *   2. PUT image bytes to that presigned URL
 *   3. Return id for use as init_image_id
 */
export async function uploadInitImageToLeonardo(
  imageBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const apiKey = env.LEONARDO_API_KEY;
  if (!apiKey) throw new Error('LEONARDO_API_KEY não configurada');

  const extension = mimeToExt(mimeType);

  // Step 1: Request presigned upload URL
  const presignRes = await fetch(`${LEONARDO_BASE_URL}/init-image`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ extension }),
  });

  if (!presignRes.ok) {
    const err = await presignRes.text();
    throw new Error(`Leonardo init-image presign failed: ${err}`);
  }

  const presignData = await presignRes.json() as {
    uploadInitImage?: { id: string; url: string; fields: Record<string, string> };
  };

  const upload = presignData.uploadInitImage;
  if (!upload?.id || !upload?.url) {
    throw new Error(`Leonardo: presign response inválido — ${JSON.stringify(presignData)}`);
  }

  // Step 2: Upload image bytes to the presigned S3 URL
  // Leonardo uses multipart/form-data with policy fields
  const form = new FormData();
  for (const [key, value] of Object.entries(upload.fields || {})) {
    form.append(key, value);
  }
  form.append('file', new Blob([imageBuffer as unknown as ArrayBuffer], { type: mimeType }));

  const uploadRes = await fetch(upload.url, { method: 'POST', body: form });
  if (!uploadRes.ok && uploadRes.status !== 204) {
    const err = await uploadRes.text();
    throw new Error(`Leonardo init-image upload failed (${uploadRes.status}): ${err}`);
  }

  return upload.id;
}

/**
 * Generate an image via Leonardo.ai and return the result.
 * Polls until complete (max ~60s).
 *
 * When initImageId is provided, uses img2img mode — the reference image
 * guides composition/structure while the prompt drives style/content.
 * initStrength: 0.0 = full AI, 1.0 = faithful copy of reference (default 0.35)
 */
export async function generateImageWithLeonardo(params: {
  prompt: string;
  modelId?: LeonardoModelId;
  aspectRatio?: string;
  negativePrompt?: string;
  numImages?: number;
  /** init_image_id from uploadInitImageToLeonardo() for img2img */
  initImageId?: string;
  /** 0.0–1.0: how strongly to follow init image (default 0.35) */
  initStrength?: number;
}): Promise<LeonardoImageResult> {
  const apiKey = env.LEONARDO_API_KEY;
  if (!apiKey) throw new Error('LEONARDO_API_KEY não configurada');

  const modelId = params.modelId || LEONARDO_MODELS.phoenix;
  const { width, height } = resolveSize(params.aspectRatio);
  const numImages = params.numImages ?? 1;

  // Leonardo enforces a 1500-char prompt limit
  const MAX_PROMPT = 1490;
  const prompt = params.prompt.length > MAX_PROMPT
    ? params.prompt.slice(0, MAX_PROMPT)
    : params.prompt;

  // ── 1. Create generation ────────────────────────────────────────────
  const createRes = await fetch(`${LEONARDO_BASE_URL}/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      modelId,
      width,
      height,
      num_images: numImages,
      ...(params.negativePrompt ? { negative_prompt: params.negativePrompt } : {}),
      ...(NO_ALCHEMY_MODELS.has(modelId) ? {} : { alchemy: true }),
      // img2img params — only when init image is provided
      ...(params.initImageId ? {
        init_image_id: params.initImageId,
        init_strength: params.initStrength ?? 0.35,
      } : {}),
    }),
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Leonardo generation failed: ${err}`);
  }

  const createData = await createRes.json() as {
    sdGenerationJob?: { generationId: string };
    error?: string;
  };

  const generationId = createData.sdGenerationJob?.generationId;
  if (!generationId) {
    throw new Error(`Leonardo: nenhum generationId retornado — ${JSON.stringify(createData)}`);
  }

  // ── 2. Poll until COMPLETE ──────────────────────────────────────────
  const MAX_POLLS = 24; // 24 × 2.5s = 60s
  const POLL_INTERVAL_MS = 2500;

  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const pollRes = await fetch(`${LEONARDO_BASE_URL}/generations/${generationId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    if (!pollRes.ok) continue;

    const pollData = await pollRes.json() as {
      generations_by_pk?: {
        status: string;
        generated_images?: Array<{ url: string }>;
      };
    };

    const gen = pollData.generations_by_pk;
    if (!gen) continue;

    if (gen.status === 'COMPLETE') {
      const images = gen.generated_images || [];
      if (!images.length) throw new Error('Leonardo: geração completa mas sem imagem');
      const imageUrls = images.map((img) => img.url);
      return { imageUrl: imageUrls[0], imageUrls, generationId };
    }

    if (gen.status === 'FAILED') {
      throw new Error('Leonardo: geração falhou (status FAILED)');
    }
    // PENDING / PROCESSING → continue polling
  }

  throw new Error('Leonardo: timeout aguardando geração (60s)');
}

export function isLeonardoConfigured(): boolean {
  return Boolean(env.LEONARDO_API_KEY);
}
