import path from 'path';
import { query } from '../db';
import { env } from '../env';
import { buildKey, saveFile } from '../library/storage';
import { generateImageWithFal, generateImg2ImgWithFal, generateInstantCharacterWithFal, isFalConfigured } from './ai/falAiService';

export const EDRO_AVATAR_PROMPT_VERSION = 'edro-avatar-v5';

const EDRO_AVATAR_BASE_PROMPT = `
create a single stylized 3D avatar character from the reference photo, shown alone in a complete bust portrait from the upper chest upward on a plain very light gray background. keep a subtle three-quarter angle facing slightly to the right side of the image, never front-facing, never perfectly symmetrical, never staring straight into the camera.

identity fidelity is the highest priority. preserve the real person's facial proportions, face width, jawline, chin, cheek volume, eye spacing, eye size, eyebrow shape, nose width and bridge, mouth shape, hairline, beard or mustache if present, skin tone, age range, and overall gender presentation exactly as seen in the reference. the goal is immediate recognition by someone who knows the person. do not beautify, idealize, feminize, masculinize, or replace the face with a generic attractive cartoon face.

translate the person into a restrained, slightly weird, simplified stylized 3D avatar language with subtle Pixar toy-inspired appeal, but only after preserving who they are. stylization must simplify the real face, not replace it. keep the rendering matte, clean, understated, and softly lit. allow a gentle Pixar toy feeling in the sculpted forms and readable silhouette, but never baby-like, never chibi, never like a different person, and never a generic commercial mascot.

faithfully translate the real hairstyle, hair volume, hair texture, and facial hair. if the subject has short hair, keep it short; if they have longer hair, keep it longer. if they have a beard, keep the beard. if they are clean-shaven, keep them clean-shaven. preserve clothing, neckline, shoulders, and any visible accessories from the photo in the same simplified 3D language without inventing wardrobe changes.

keep the expression warm, friendly, and naturally upbeat. allow only a subtle pleasant surprise if needed, but do not exaggerate the mouth, eyes, or eyebrows. the expression must still look like the same person from the photo.

keep the portrait soft, matte, and clean with gentle studio lighting, no environment, no props, no text, no watermark, and no extra characters. one character only.
`.trim();

const EDRO_AVATAR_NEGATIVE_PROMPT = `
generic face, different person, identity drift, face swap, gender swap, younger face, older face, beauty filter face, handsome toy face, cute mascot face, tiny nose replacement, oversized eyes, glam face, doll face, front-facing portrait, symmetrical face, round baby head, chibi, funko style, vinyl toy style, sparkly eyes, glossy materials, fashion photography, missing arms, incomplete bust, shoulderless torso, cropped arm silhouette, detailed background, text, watermark, multiple characters, props
`.trim();

function buildAvatarPrompt(customPrompt?: string) {
  const extra = customPrompt?.trim();
  if (!extra || extra === EDRO_AVATAR_BASE_PROMPT) return EDRO_AVATAR_BASE_PROMPT;
  return `${EDRO_AVATAR_BASE_PROMPT}\n\nadditional requested adjustments:\n${extra}`.trim();
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
    provider: 'fal-ai/flux-pro/v1.1',
    promptVersion: EDRO_AVATAR_PROMPT_VERSION,
    error: null,
  });

  try {
    const sourcePublicUrl = buildStoragePublicUrl(sourceKey);
    // Base64 data URL works as IP-Adapter reference when no public S3 URL is available
    const imageRef = sourcePublicUrl ?? `data:${params.sourceMimeType};base64,${params.sourceBuffer.toString('base64')}`;

    let provider = 'fal-ai/instant-character';
    let result: Awaited<ReturnType<typeof generateImageWithFal>>;

    try {
      result = await generateInstantCharacterWithFal({
        prompt: activePrompt,
        imageUrl: imageRef,
        negativePrompt: EDRO_AVATAR_NEGATIVE_PROMPT,
        aspectRatio: '1:1',
        numImages: 1,
        scale: 1.12,
      });
    } catch (primaryErr: any) {
      try {
        // Strategy 2 — true img2img preserves face geometry better than weak text reference.
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
