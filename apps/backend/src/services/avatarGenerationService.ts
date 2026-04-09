import path from 'path';
import { readFile } from 'node:fs/promises';
import { query } from '../db';
import { env } from '../env';
import { buildKey, saveFile } from '../library/storage';
import { generateGeminiFlashEditMultiWithFal, generateImageWithFal, generateImg2ImgWithFal, generateInstantCharacterWithFal, generateNanoBananaEditMultiWithFal, isFalConfigured } from './ai/falAiService';

export const EDRO_AVATAR_PROMPT_VERSION = 'edro-avatar-v11';

const AVATAR_STYLE_REFERENCE_PATH = path.join(__dirname, '..', 'data', 'avatar-style-reference.png');
const AVATAR_STYLE_BRIDGE_PATH = path.join(__dirname, '..', 'data', 'avatar-style-bridge.jpg');
let avatarStyleReferenceDataUrlPromise: Promise<string> | null = null;
let avatarStyleBridgeDataUrlPromise: Promise<string> | null = null;

const EDRO_AVATAR_BASE_PROMPT = `
transform photo 1 into a highly detailed, stylized 3d caricature avatar for a freelancer profile.

photo 1 is the identity source of truth. preserve the exact same person: same facial structure, face width, jawline, nose, eyes, eyebrows, mouth, hairline, hairstyle, beard, skin tone, age range, and gender presentation. if there is any conflict, always follow photo 1 and never invent a prettier, younger, more feminine, or more generic face.

photo 2 is only a caricature bridge to push the face away from realism. photo 3 is the final style reference and must lock the visual family. the final result must still look like the same real person from photo 1, but translated into the same polished pixar and dreamworks style 3d world and same turma visual as photo 3.

make it more stylized, more graphic, and more caricatured than a realistic portrait, but still unmistakably recognizable. preserve the real haircut, facial hair, neckline, shoulders, and overall presentation. do not swap long hair for short hair, do not remove the beard, and do not change the identity of the person.

render one character only in a clean bust portrait from the upper chest upward, slightly turned to the right. use smooth studio lighting, sharp focus, matte polished materials, vivid shapes, a vivid solid edro orange background, and a premium cinematic finish. aim for a highly detailed animated-feature look, 8k quality feel, octane rendering quality, unreal engine 5 quality. no props, no text, no extra characters, no realistic environment.
`.trim();

const EDRO_AVATAR_NEGATIVE_PROMPT = `
generic face, different person, identity drift, face swap, gender swap, younger face, older face, beauty filter face, handsome toy face, cute mascot face, glam face, doll face, front-facing portrait, symmetrical face, round baby head, chibi, funko style, vinyl toy style, sparkly eyes, glossy materials, realistic photo rendering, realistic environment, white background, gray background, detailed background, text, watermark, multiple characters, props
`.trim();

function buildAvatarPrompt(customPrompt?: string) {
  const extra = customPrompt?.trim();
  if (!extra || extra === EDRO_AVATAR_BASE_PROMPT) return EDRO_AVATAR_BASE_PROMPT;
  return `${EDRO_AVATAR_BASE_PROMPT}\n\napply these extra adjustments only if they do not conflict with the identity from photo 1, the final style family from photo 3, the bust composition, or the solid edro orange background:\n${extra}`.trim();
}

async function getAvatarStyleReferenceDataUrl() {
  if (!avatarStyleReferenceDataUrlPromise) {
    avatarStyleReferenceDataUrlPromise = readFile(AVATAR_STYLE_REFERENCE_PATH).then((buffer) => `data:image/png;base64,${buffer.toString('base64')}`);
  }
  return avatarStyleReferenceDataUrlPromise;
}

async function getAvatarStyleBridgeDataUrl() {
  if (!avatarStyleBridgeDataUrlPromise) {
    avatarStyleBridgeDataUrlPromise = readFile(AVATAR_STYLE_BRIDGE_PATH).then((buffer) => `data:image/jpeg;base64,${buffer.toString('base64')}`);
  }
  return avatarStyleBridgeDataUrlPromise;
}

function buildStoragePublicUrl(key: string): string | null {
  if (!env.S3_BUCKET || !env.S3_REGION) return null;
  if (env.S3_ENDPOINT) return `${env.S3_ENDPOINT.replace(/\/$/, '')}/${env.S3_BUCKET}/${key}`;
  return `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`;
}

function fileExtFromMime(mimeType: string) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

// Writes all avatar state directly to freelancer_profiles — single source of truth.
async function updateFreelancerAvatarState(params: {
  freelancerId: string;
  avatarSourceKey?: string | null;
  avatarGeneratedKey?: string | null;
  avatarUrl?: string | null;
  status: 'none' | 'pending' | 'ready' | 'failed';
  provider?: string | null;
  promptVersion?: string | null;
  error?: string | null;
}) {
  await query(
    `UPDATE freelancer_profiles
        SET avatar_source_key        = COALESCE($2, avatar_source_key),
            avatar_generated_key     = $3,
            avatar_url               = $4,
            avatar_generation_status = $5,
            avatar_provider          = $6,
            avatar_prompt_version    = $7,
            avatar_generated_at      = CASE WHEN $5 = 'ready' THEN now() ELSE avatar_generated_at END,
            avatar_error             = $8,
            updated_at               = now()
      WHERE id = $1`,
    [
      params.freelancerId,
      params.avatarSourceKey ?? null,
      params.avatarGeneratedKey ?? null,
      params.avatarUrl ?? null,
      params.status,
      params.provider ?? null,
      params.promptVersion ?? null,
      params.error ?? null,
    ],
  );
}

/** Save an uploaded image directly as the avatar, with no AI generation. */
export async function saveDirectAvatarForFreelancer(params: {
  tenantId: string;
  freelancerId: string;
  sourceBuffer: Buffer;
  sourceFilename: string;
  sourceMimeType: string;
}) {
  const sourceExt = path.extname(params.sourceFilename).replace('.', '') || fileExtFromMime(params.sourceMimeType);
  const key = buildKey(params.tenantId, 'avatars-generated', `${params.freelancerId}.${sourceExt}`);
  await saveFile(params.sourceBuffer, key);

  const avatarUrl = buildStoragePublicUrl(key) ?? key;

  await updateFreelancerAvatarState({
    freelancerId: params.freelancerId,
    avatarSourceKey: key,
    avatarGeneratedKey: key,
    avatarUrl,
    status: 'ready',
    provider: 'direct-upload',
    promptVersion: null,
    error: null,
  });

  return { avatarUrl, sourceKey: key, generatedKey: key, promptVersion: null, provider: 'direct-upload' };
}

export async function generateEdroAvatarForFreelancer(params: {
  tenantId: string;
  freelancerId: string;
  sourceBuffer: Buffer;
  sourceFilename: string;
  sourceMimeType: string;
  customPrompt?: string;
}) {
  if (!isFalConfigured()) {
    throw new Error('FAL_API_KEY não configurada');
  }

  const activePrompt = buildAvatarPrompt(params.customPrompt);

  const sourceExt = path.extname(params.sourceFilename).replace('.', '') || fileExtFromMime(params.sourceMimeType);
  const sourceKey = buildKey(params.tenantId, 'avatars-source', `${params.freelancerId}.${sourceExt}`);
  await saveFile(params.sourceBuffer, sourceKey);

  await updateFreelancerAvatarState({
    freelancerId: params.freelancerId,
    avatarSourceKey: sourceKey,
    status: 'pending',
    provider: 'fal-ai/nano-banana-2/edit',
    promptVersion: EDRO_AVATAR_PROMPT_VERSION,
    error: null,
  });

  try {
    const sourcePublicUrl = buildStoragePublicUrl(sourceKey);
    // Base64 data URL works as IP-Adapter reference when no public S3 URL is available
    const imageRef = sourcePublicUrl ?? `data:${params.sourceMimeType};base64,${params.sourceBuffer.toString('base64')}`;
    const styleBridgeRef = await getAvatarStyleBridgeDataUrl();
    const styleRef = await getAvatarStyleReferenceDataUrl();

    let provider = 'fal-ai/nano-banana-2/edit';
    let result: Awaited<ReturnType<typeof generateImageWithFal>>;

    try {
      result = await generateNanoBananaEditMultiWithFal({
        prompt: activePrompt,
        imageUrls: [imageRef, styleBridgeRef, styleRef],
        aspectRatio: '1:1',
      });
    } catch {
      try {
        result = await generateGeminiFlashEditMultiWithFal({
          prompt: activePrompt,
          imageUrls: [imageRef, styleBridgeRef, styleRef],
        });
        provider = 'fal-ai/gemini-flash-edit/multi';
      } catch {
        try {
          provider = 'fal-ai/instant-character';
          result = await generateInstantCharacterWithFal({
            prompt: activePrompt,
            imageUrl: imageRef,
            negativePrompt: EDRO_AVATAR_NEGATIVE_PROMPT,
            aspectRatio: '1:1',
            numImages: 1,
            scale: 1.12,
          });
        } catch {
          try {
            // Strategy 4 — true img2img preserves face geometry better than weak text reference.
            provider = 'fal-ai/flux-dev/image-to-image';
            result = await generateImg2ImgWithFal({
              imageUrl: imageRef,
              prompt: activePrompt,
              strength: 0.9,
              aspectRatio: '1:1',
              numImages: 1,
            });
          } catch {
            provider = 'fal-ai/flux-pro/v1.1';
            result = await generateImageWithFal({
              model: 'flux-pro',
              prompt: activePrompt,
              negativePrompt: EDRO_AVATAR_NEGATIVE_PROMPT,
              aspectRatio: '1:1',
              numImages: 1,
              referenceImageUrl: imageRef,
              referenceImageStrength: 0.62,
            });
          }
        }
      }
    }

    let avatarGeneratedKey: string | null = null;
    let avatarUrl = result.imageUrl;

    try {
      const generatedResponse = await fetch(result.imageUrl);
      if (!generatedResponse.ok) {
        throw new Error(`Falha ao baixar avatar gerado (${generatedResponse.status})`);
      }
      const generatedBuffer = Buffer.from(await generatedResponse.arrayBuffer());
      avatarGeneratedKey = buildKey(params.tenantId, 'avatars-generated', `${params.freelancerId}.jpg`);
      await saveFile(generatedBuffer, avatarGeneratedKey);
      avatarUrl = buildStoragePublicUrl(avatarGeneratedKey) ?? result.imageUrl;
    } catch {
      avatarGeneratedKey = null;
      avatarUrl = result.imageUrl;
    }

    await updateFreelancerAvatarState({
      freelancerId: params.freelancerId,
      avatarSourceKey: sourceKey,
      avatarGeneratedKey,
      avatarUrl,
      status: 'ready',
      provider,
      promptVersion: EDRO_AVATAR_PROMPT_VERSION,
      error: null,
    });

    return {
      avatarUrl,
      sourceKey,
      generatedKey: avatarGeneratedKey,
      promptVersion: EDRO_AVATAR_PROMPT_VERSION,
      provider,
    };
  } catch (error: any) {
    await updateFreelancerAvatarState({
      freelancerId: params.freelancerId,
      avatarSourceKey: sourceKey,
      status: 'failed',
      provider: 'fal-ai/avatar-pipeline',
      promptVersion: EDRO_AVATAR_PROMPT_VERSION,
      error: error?.message?.slice(0, 500) ?? 'Falha ao gerar avatar',
    });
    throw error;
  }
}
