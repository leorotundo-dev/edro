import path from 'path';
import { readFile } from 'node:fs/promises';
import { query } from '../db';
import { env } from '../env';
import { buildKey, saveFile } from '../library/storage';
import { generateGeminiFlashEditMultiWithFal, generateImageWithFal, generateImg2ImgWithFal, generateInstantCharacterWithFal, generateNanoBananaEditMultiWithFal, isFalConfigured } from './ai/falAiService';

export const EDRO_AVATAR_PROMPT_VERSION = 'edro-avatar-v9';

const AVATAR_STYLE_REFERENCE_PATH = path.join(__dirname, '..', 'data', 'avatar-style-reference.png');
const AVATAR_STYLE_BRIDGE_PATH = path.join(__dirname, '..', 'data', 'avatar-style-bridge.jpg');
let avatarStyleReferenceDataUrlPromise: Promise<string> | null = null;
let avatarStyleBridgeDataUrlPromise: Promise<string> | null = null;

const EDRO_AVATAR_BASE_PROMPT = `
turn photo 1 into a stylized 3D animated character.

preserve the exact identity from photo 1: same face shape, eyes, nose, mouth, hair, beard, skin tone, age, and gender presentation. do not beautify, do not feminize, do not masculinize, and do not replace the face with a generic cartoon person.

use photo 2 as a caricature bridge to simplify the face away from realism. use photo 3 as the approved edro style reference to lock the final visual family. the final result must look like the same real person, but as a new member of that same turma and same polished pixar-toy-like 3d world.

make the face simpler, friendlier, and more graphic than the real photo, but still immediately recognizable. preserve the real hairstyle, facial hair, clothing neckline, and shoulders.

show only one character in a bust portrait from the upper chest upward, with a subtle three-quarter angle slightly turned to the right. use soft studio lighting, matte materials, and a solid strong edro orange background. no props, no text, no extra characters, no realistic environment.
`.trim();

const EDRO_AVATAR_NEGATIVE_PROMPT = `
generic face, different person, identity drift, face swap, gender swap, younger face, older face, beauty filter face, handsome toy face, cute mascot face, glam face, doll face, front-facing portrait, symmetrical face, round baby head, chibi, funko style, vinyl toy style, sparkly eyes, glossy materials, realistic photo rendering, realistic environment, white background, gray background, detailed background, text, watermark, multiple characters, props
`.trim();

function buildAvatarPrompt(customPrompt?: string) {
  const extra = customPrompt?.trim();
  if (!extra || extra === EDRO_AVATAR_BASE_PROMPT) return EDRO_AVATAR_BASE_PROMPT;
  return `${EDRO_AVATAR_BASE_PROMPT}\n\nadditional requested adjustments:\n${extra}`.trim();
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
