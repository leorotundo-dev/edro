import { env } from '../../env';

const LEONARDO_BASE_URL = 'https://cloud.leonardo.ai/api/rest/v1';

// Leonardo model IDs
export const LEONARDO_MODELS = {
  /** Phoenix — flagship, highest quality */
  phoenix: 'de7d3faf-762f-48e0-b3b7-9d0ac3a3fcf7',
  /** Lightning XL — fast, good quality */
  lightningXL: 'b24e16ff-06e3-43eb-8d33-4416c2d75876',
  /** Kino XL — cinematic look */
  kinoXL: 'aa77f04e-3eec-4034-9c07-d0f619684628',
  /** Diffusion XL — creative/artistic */
  diffusionXL: '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3',
} as const;

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
    case '9:16': return { width: 576,  height: 1024 };
    case '4:5':  return { width: 864,  height: 1080 };
    case '3:4':  return { width: 768,  height: 1024 };
    case '4:3':  return { width: 1024, height: 768  };
    case '16:9': return { width: 1024, height: 576  };
    case '1:1':
    default:     return { width: 1024, height: 1024 };
  }
}

export interface LeonardoImageResult {
  imageUrl: string;
  /** base64 PNG if downloaded; otherwise empty string */
  base64: string;
  mimeType: string;
  generationId: string;
}

/**
 * Generate an image via Leonardo.ai and return the result.
 * Polls until complete (max ~60s).
 */
export async function generateImageWithLeonardo(params: {
  prompt: string;
  modelId?: LeonardoModelId;
  aspectRatio?: string;
  negativePrompt?: string;
  numImages?: number;
}): Promise<LeonardoImageResult> {
  const apiKey = env.LEONARDO_API_KEY;
  if (!apiKey) throw new Error('LEONARDO_API_KEY não configurada');

  const modelId = params.modelId || LEONARDO_MODELS.phoenix;
  const { width, height } = resolveSize(params.aspectRatio);
  const numImages = params.numImages ?? 1;

  // ── 1. Create generation ────────────────────────────────────────────
  const createRes = await fetch(`${LEONARDO_BASE_URL}/generations`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: params.prompt,
      modelId,
      width,
      height,
      num_images: numImages,
      negative_prompt: params.negativePrompt || undefined,
      photoReal: false,
      alchemy: true,
      highResolution: false,
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
      const imageUrl = gen.generated_images?.[0]?.url;
      if (!imageUrl) throw new Error('Leonardo: geração completa mas sem imagem');

      // Download image and convert to base64 so the caller gets the same
      // interface as geminiService (base64 + mimeType)
      const imgRes = await fetch(imageUrl);
      const buffer = await imgRes.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const contentType = imgRes.headers.get('content-type') || 'image/jpeg';

      return { imageUrl, base64, mimeType: contentType, generationId };
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
