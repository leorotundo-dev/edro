import path from 'path';
import { query } from '../db';
import { env } from '../env';
import { buildKey, saveFile } from '../library/storage';
import { generateImageWithFal, generateImg2ImgWithFal, isFalConfigured } from './ai/falAiService';

export const EDRO_AVATAR_PROMPT_VERSION = 'edro-avatar-v2';

const EDRO_AVATAR_PROMPT = `
translate the person in the reference photo into a stylized 3D avatar character, faithfully preserving their distinctive facial features, skin tone, hair color, hair length and style, face shape, and any defining visual characteristics. the goal is that someone who knows this person would immediately recognize this avatar as them. do not invent a generic face — use the reference photo as the direct source for who this character is.

render the character as a single bust portrait from the upper chest upward, isolated on a plain very light gray background, in a subtle three-quarter angle facing slightly to the right side of the image, never front-facing, never perfectly symmetrical, never looking straight into the camera.

apply the following established visual style: dry, simple, slightly weird, highly stylized 3D avatar language, with a subtly disproportionate cartoon head, slightly top-heavy elongated cranium, slightly narrower facial area, moderately sized round chimp-like ears, thick dark blocky eyebrows (matching the person's eyebrow color), tiny simple nose, restrained matte rendering, and clean understated materials. keep the skin tone faithful to the reference photo. keep the hair color and general hair style faithful to the reference photo, translated into the simplified stylized 3D language. keep the eye color and general eye shape faithful to the reference photo.

the character must wear an orange baseball cap and a plain black t-shirt with no print, no logo, no text, no hoodie, no accessories, no extra props. the orange cap should be simple and stylized, slightly chunky, with a curved brim, smooth clean surfaces, and minimal seam detail. the black t-shirt must read clearly as a full upper garment in the bust portrait, with visible shoulders, visible upper sleeves, and the beginning of both upper arms included in the silhouette so the bust feels complete and natural.

the facial expression must be pleasantly surprised, excited, and happy — delighted surprise, upbeat excitement, amused enthusiasm, as if the character has just seen something unexpectedly cool. eyes more open showing alertness and excitement, eyebrows lifted but still thick and blocky, mouth open in a cheerful excited way, not scared, not alarmed, not screaming. if teeth are visible keep them minimal and simplified. the expression overall should feel animated, excited, impressed, and happy.

keep the rendering soft, matte, and clean, with soft studio lighting and gentle shadows, plain pale gray background, no environment, no text, no watermark, no extra characters. one character only.
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

async function updatePersonAvatarState(params: {
  personId: string;
  tenantId: string;
  avatarSourceKey?: string | null;
  avatarGeneratedKey?: string | null;
  avatarUrl?: string | null;
  status: 'none' | 'pending' | 'ready' | 'failed';
  provider?: string | null;
  promptVersion?: string | null;
  error?: string | null;
}) {
  await query(
    `UPDATE people
        SET avatar_source_key = COALESCE($3, avatar_source_key),
            avatar_generated_key = $4,
            avatar_url = $5,
            avatar_generation_status = $6,
            avatar_provider = $7,
            avatar_prompt_version = $8,
            avatar_generated_at = CASE WHEN $6 = 'ready' THEN now() ELSE avatar_generated_at END,
            avatar_error = $9,
            updated_at = now()
      WHERE id = $1
        AND tenant_id = $2`,
    [
      params.personId,
      params.tenantId,
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

async function mirrorFreelancerAvatar(params: {
  freelancerId: string;
  avatarUrl: string;
}) {
  await query(
    `UPDATE freelancer_profiles
        SET avatar_url = $2,
            updated_at = now()
      WHERE id = $1`,
    [params.freelancerId, params.avatarUrl],
  );
}

/** Save an uploaded image directly as the avatar, with no AI generation. */
export async function saveDirectAvatarForFreelancer(params: {
  tenantId: string;
  freelancerId: string;
  personId: string;
  sourceBuffer: Buffer;
  sourceFilename: string;
  sourceMimeType: string;
}) {
  const sourceExt = path.extname(params.sourceFilename).replace('.', '') || fileExtFromMime(params.sourceMimeType);
  const key = buildKey(params.tenantId, 'avatars-generated', `${params.personId}.${sourceExt}`);
  await saveFile(params.sourceBuffer, key);

  const avatarUrl = buildStoragePublicUrl(key) ?? key;

  await updatePersonAvatarState({
    personId: params.personId,
    tenantId: params.tenantId,
    avatarSourceKey: key,
    avatarGeneratedKey: key,
    avatarUrl,
    status: 'ready',
    provider: 'direct-upload',
    promptVersion: null,
    error: null,
  });

  await mirrorFreelancerAvatar({ freelancerId: params.freelancerId, avatarUrl });

  return { avatarUrl, sourceKey: key, generatedKey: key, promptVersion: null, provider: 'direct-upload' };
}

export async function generateEdroAvatarForFreelancer(params: {
  tenantId: string;
  freelancerId: string;
  personId: string;
  sourceBuffer: Buffer;
  sourceFilename: string;
  sourceMimeType: string;
}) {
  if (!isFalConfigured()) {
    throw new Error('FAL_API_KEY não configurada');
  }

  const sourceExt = path.extname(params.sourceFilename).replace('.', '') || fileExtFromMime(params.sourceMimeType);
  const sourceKey = buildKey(params.tenantId, 'avatars-source', `${params.personId}.${sourceExt}`);
  await saveFile(params.sourceBuffer, sourceKey);

  await updatePersonAvatarState({
    personId: params.personId,
    tenantId: params.tenantId,
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

    // Strategy 1 — flux-pro/v1.1 with IP-Adapter
    // IP-Adapter extracts the face/identity from the reference photo and preserves it
    // while the text prompt drives the style (3D avatar, orange cap, etc.)
    // referenceImageStrength 0.38: 38% identity weight, 62% style weight — good balance
    let provider = 'fal-ai/flux-pro/v1.1';
    let result: Awaited<ReturnType<typeof generateImageWithFal>>;

    try {
      result = await generateImageWithFal({
        model: 'flux-pro',
        prompt: EDRO_AVATAR_PROMPT,
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
        prompt: EDRO_AVATAR_PROMPT,
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
      avatarGeneratedKey = buildKey(params.tenantId, 'avatars-generated', `${params.personId}.jpg`);
      await saveFile(generatedBuffer, avatarGeneratedKey);
      avatarUrl = buildStoragePublicUrl(avatarGeneratedKey) ?? result.imageUrl;
    } catch {
      // Keep the provider URL as a compatible fallback when storage mirroring fails.
      avatarGeneratedKey = null;
      avatarUrl = result.imageUrl;
    }

    await updatePersonAvatarState({
      personId: params.personId,
      tenantId: params.tenantId,
      avatarSourceKey: sourceKey,
      avatarGeneratedKey,
      avatarUrl,
      status: 'ready',
      provider,
      promptVersion: EDRO_AVATAR_PROMPT_VERSION,
      error: null,
    });

    await mirrorFreelancerAvatar({
      freelancerId: params.freelancerId,
      avatarUrl,
    });

    return {
      avatarUrl,
      sourceKey,
      generatedKey: avatarGeneratedKey,
      promptVersion: EDRO_AVATAR_PROMPT_VERSION,
      provider,
    };
  } catch (error: any) {
    await updatePersonAvatarState({
      personId: params.personId,
      tenantId: params.tenantId,
      avatarSourceKey: sourceKey,
      status: 'failed',
      provider: 'fal-ai:flux-dev-image-to-image',
      promptVersion: EDRO_AVATAR_PROMPT_VERSION,
      error: error?.message?.slice(0, 500) ?? 'Falha ao gerar avatar',
    });
    throw error;
  }
}
