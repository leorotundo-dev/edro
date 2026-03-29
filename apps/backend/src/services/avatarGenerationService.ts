import path from 'path';
import { query } from '../db';
import { env } from '../env';
import { buildKey, saveFile } from '../library/storage';
import { generateImageWithFal, isFalConfigured } from './ai/falAiService';

export const EDRO_AVATAR_PROMPT_VERSION = 'edro-avatar-v1';

const EDRO_AVATAR_PROMPT = `
create a single stylized 3D avatar character in the exact same established visual style as the approved result, shown alone in a completed bust portrait from the upper chest upward, isolated on a plain very light gray background. the character must keep the same subtle three-quarter angle facing slightly to the right side of the image, never front-facing, never perfectly symmetrical, never looking straight into the camera. preserve the same dry, simple, slightly weird, highly stylized 3D avatar language already defined, with the same subtly disproportionate cartoon head, slightly top-heavy elongated cranium, slightly narrower facial area, moderately sized round chimp-like ears, thick dark blocky eyebrows, tiny simple nose, restrained matte rendering, and clean understated materials. the character must wear an orange baseball cap and a plain black t-shirt with no print, no logo, no text, no hoodie, no accessories, no extra props. the orange cap should be simple and stylized, slightly chunky, with a curved brim, smooth clean surfaces, and minimal seam detail, not realistic sportswear and not fashion-oriented. the black t-shirt must read clearly as a full upper garment in the bust portrait, with visible shoulders, visible upper sleeves, and the beginning of both upper arms included in the silhouette so the bust feels complete and natural, not cut off awkwardly and not like the arms are missing. the t-shirt should have a clean neckline, simple stylized construction, minimal folds, matte material, and a readable torso shape extending into the shoulders and upper arms.

the facial expression must be pleasantly surprised, excited, and happy, not scared, not alarmed, not startled in a negative way. the emotion should feel like delighted surprise, upbeat excitement, amused enthusiasm, as if the character has just seen something unexpectedly cool. the eyes should be more open than in the neutral version, showing alertness and excitement, but still remain graphic, simple, and in the same style family, never sparkly or overly cute. the eyebrows should lift to support a happy surprised expression, but remain thick, blunt, and blocky, not too elastic and not exaggerated in a cartoony rubber way. the mouth must be open in a cheerful, excited, pleasantly surprised way while preserving the same subtle bean-mouth structural logic in the lower face, meaning the mouth should still feel integrated into a slightly compressed lower facial area rather than pasted onto a flat face. the mouth should suggest delighted surprise and energetic happiness, not fear, not panic, not a scream, not an anxious gasp. it should be a stylized happy-surprised open expression, slightly awkward and graphic, with the lower face still feeling controlled and part of the same character system. if teeth are visible, keep them minimal, simplified, and secondary. the expression overall should feel animated, excited, impressed, and happy, while still preserving the same strange charm and same visual family as the approved image.

keep the head slightly elongated and subtly disproportionate, not round, not spherical, not cute-chibi, not handsome, not polished like a premium toy. keep the rendering soft, matte, and clean, with soft studio lighting and gentle shadows, plain pale gray background, no environment, no text, no watermark, no extra characters. the final image must feel like the same character family and exact same style as the approved result, only with a new expression and new outfit: orange baseball cap, plain black t-shirt, complete bust portrait with visible shoulders and upper arms, happy excited pleasantly surprised facial expression, awkward modern stylized 3D avatar, one character only.
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
    provider: 'fal-ai:nano-banana-pro',
    promptVersion: EDRO_AVATAR_PROMPT_VERSION,
    error: null,
  });

  try {
    const dataUrl = `data:${params.sourceMimeType};base64,${params.sourceBuffer.toString('base64')}`;
    const result = await generateImageWithFal({
      model: 'nano-banana-pro',
      prompt: EDRO_AVATAR_PROMPT,
      negativePrompt: EDRO_AVATAR_NEGATIVE_PROMPT,
      aspectRatio: '1:1',
      numImages: 1,
      referenceImageUrl: dataUrl,
      referenceImageStrength: 0.35,
    });

    let avatarGeneratedKey: string | null = null;
    let avatarUrl = result.imageUrl;
    const publicUrl = buildStoragePublicUrl('');

    if (publicUrl !== null) {
      const generatedResponse = await fetch(result.imageUrl);
      if (!generatedResponse.ok) {
        throw new Error(`Falha ao baixar avatar gerado (${generatedResponse.status})`);
      }
      const generatedBuffer = Buffer.from(await generatedResponse.arrayBuffer());
      avatarGeneratedKey = buildKey(params.tenantId, 'avatars-generated', `${params.personId}.jpg`);
      await saveFile(generatedBuffer, avatarGeneratedKey);
      avatarUrl = buildStoragePublicUrl(avatarGeneratedKey) ?? result.imageUrl;
    }

    await updatePersonAvatarState({
      personId: params.personId,
      tenantId: params.tenantId,
      avatarSourceKey: sourceKey,
      avatarGeneratedKey,
      avatarUrl,
      status: 'ready',
      provider: 'fal-ai:nano-banana-pro',
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
      provider: 'fal-ai:nano-banana-pro',
    };
  } catch (error: any) {
    await updatePersonAvatarState({
      personId: params.personId,
      tenantId: params.tenantId,
      avatarSourceKey: sourceKey,
      status: 'failed',
      provider: 'fal-ai:nano-banana-pro',
      promptVersion: EDRO_AVATAR_PROMPT_VERSION,
      error: error?.message?.slice(0, 500) ?? 'Falha ao gerar avatar',
    });
    throw error;
  }
}
