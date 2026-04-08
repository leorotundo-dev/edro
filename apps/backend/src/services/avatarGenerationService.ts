import path from 'path';
import { query } from '../db';
import { env } from '../env';
import { buildKey, saveFile } from '../library/storage';
import { generateImageWithFal, generateImg2ImgWithFal, isFalConfigured } from './ai/falAiService';

export const EDRO_AVATAR_PROMPT_VERSION = 'edro-avatar-v3';

const EDRO_AVATAR_PROMPT = `
create a single stylized 3D avatar character in the exact same established visual style as the approved result, shown alone in a completed bust portrait from the upper chest upward, isolated on a plain very light gray background. the character must keep the same subtle three-quarter angle facing slightly to the right side of the image, never front-facing, never perfectly symmetrical, never looking straight into the camera.

faithfully translate the person in the reference photo: preserve their distinctive facial features, skin tone, hair color, hair length and style, face shape, and any defining visual characteristics. the goal is that someone who knows this person would immediately recognize this avatar as them. do not invent a generic face — use the reference photo as the direct source for who this character is.

preserve the same dry, simple, slightly weird, highly stylized 3D avatar language already defined, with the same subtly disproportionate cartoon head, slightly top-heavy elongated cranium, slightly narrower facial area, moderately sized round chimp-like ears, thick dark blocky eyebrows (matching the person's eyebrow color), tiny simple nose, restrained matte rendering, and clean understated materials. keep the skin tone faithful to the reference photo. keep the hair color and general hair style faithful to the reference photo, translated into the simplified stylized 3D language.

faithfully translate whatever clothing, accessories, and headwear appear in the reference photo into the same simplified stylized 3D language. preserve color, garment type, and key visual details at a stylized level: keep a hat as a hat in its color, translate a shirt into a stylized shirt with clean neckline and visible shoulders, etc. do not invent new clothing or replace clothing items. apply the same matte, clean, restrained material language to whatever garments appear in the reference photo. the bust portrait must show visible shoulders, visible upper sleeves, and the beginning of both upper arms so the bust feels complete and natural, not cut off awkwardly and not like the arms are missing.

the facial expression must be pleasantly surprised, excited, and happy — delighted surprise, upbeat excitement, amused enthusiasm, as if the character has just seen something unexpectedly cool. the eyes should be more open than in the neutral version, showing alertness and excitement, but still remain graphic, simple, and in the same style family, never sparkly or overly cute. the eyebrows should lift to support a happy surprised expression, but remain thick, blunt, and blocky, not too elastic and not exaggerated in a cartoony rubber way. the mouth must be open in a cheerful, excited, pleasantly surprised way while preserving the same subtle bean-mouth structural logic in the lower face — the mouth should still feel integrated into a slightly compressed lower facial area rather than pasted onto a flat face. the expression should feel animated, excited, impressed, and happy, while still preserving the same strange charm and same visual family as the approved image. if teeth are visible keep them minimal, simplified, and secondary.

keep the head slightly elongated and subtly disproportionate, not round, not spherical, not cute-chibi, not handsome, not polished like a premium toy. keep the rendering soft, matte, and clean, with soft studio lighting and gentle shadows, plain pale gray background, no environment, no text, no watermark, no extra characters. one character only.
`.trim();

const EDRO_AVATAR_NEGATIVE_PROMPT = `
scared expression, frightened expression, alarmed expression, panicked face, shocked in a negative way, screaming mouth, anxious gasp, sad surprise, front-facing portrait, symmetrical face, round baby head, cute mascot, funko style, vinyl toy style, premium designer toy, polished commercial charm, disney style, pixar style, sparkly eyes, glossy materials, realistic human anatomy, missing arms, incomplete bust, shoulderless torso, cropped arm silhouette, realistic ears, realistic teeth, realistic lips, fashion photography, detailed fabric texture, printed shirt, logo, text, hoodie, beanie, multiple characters, props, detailed background, cinematic lighting, high-end figurine render
`.trim();

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

  const activePrompt = params.customPrompt?.trim() || EDRO_AVATAR_PROMPT;

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

    let provider = 'fal-ai/flux-pro/v1.1';
    let result: Awaited<ReturnType<typeof generateImageWithFal>>;

    try {
      result = await generateImageWithFal({
        model: 'flux-pro',
        prompt: activePrompt,
        negativePrompt: EDRO_AVATAR_NEGATIVE_PROMPT,
        aspectRatio: '1:1',
        numImages: 1,
        referenceImageUrl: imageRef,
        referenceImageStrength: 0.38,
      });
    } catch (primaryErr: any) {
      // Strategy 2 — flux-dev img2img (requires public URL; lower strength for better likeness)
      if (!sourcePublicUrl) throw primaryErr;
      provider = 'fal-ai/flux-dev/image-to-image';
      result = await generateImg2ImgWithFal({
        imageUrl: sourcePublicUrl,
        prompt: activePrompt,
        strength: 0.72,
        aspectRatio: '1:1',
        numImages: 1,
      });
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
      provider: 'fal-ai:flux-dev-image-to-image',
      promptVersion: EDRO_AVATAR_PROMPT_VERSION,
      error: error?.message?.slice(0, 500) ?? 'Falha ao gerar avatar',
    });
    throw error;
  }
}
