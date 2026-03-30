import path from 'path';
import { query } from '../db';
import { env } from '../env';
import { buildKey, saveFile } from '../library/storage';
import { generateImageWithFal, generateImg2ImgWithFal, isFalConfigured } from './ai/falAiService';

export const EDRO_AVATAR_PROMPT_VERSION = 'edro-avatar-v2';

const EDRO_AVATAR_PROMPT = `
transform the uploaded portrait into a clearly AI-generated stylized 3D avatar bust portrait. preserve the person's identity markers from the source photo such as face shape, skin tone, hairline, beard or mustache, eyebrow weight, and overall recognizability, but do not keep it photographic. the result must look unmistakably like a designed 3D character, not a retouched photo and not realistic portrait photography.

show a single character from the upper chest upward on a plain very light gray background. use a subtle three-quarter angle facing slightly to the right side of the image, never front-facing, never perfectly symmetrical, never looking straight into the camera. the visual language must be dry, simple, slightly weird, modern, stylized 3D, with matte rendering, clean shapes, slightly disproportionate head, slightly elongated cranium, simplified facial planes, thick dark blocky eyebrows, tiny simple nose, and understated materials.

the character must wear an orange baseball cap and a plain black t-shirt with no print, no logo, no text, no hoodie, no accessories, and no props. the black t-shirt must include visible shoulders and upper sleeves so the bust feels complete. use soft studio lighting and gentle shadows.

the expression must feel pleasantly surprised, excited, and happy. eyes slightly more open, eyebrows lifted, mouth open in a cheerful surprised way, but still restrained and graphic. the final result should feel like an intentional Edro avatar, visibly transformed by AI into a stylized 3D bust, while remaining recognizable as the same person from the uploaded image.
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
    provider: 'fal-ai:flux-dev-image-to-image',
    promptVersion: EDRO_AVATAR_PROMPT_VERSION,
    error: null,
  });

  try {
    const sourcePublicUrl = buildStoragePublicUrl(sourceKey);
    let provider = 'fal-ai:flux-dev-image-to-image';
    const dataUrl = `data:${params.sourceMimeType};base64,${params.sourceBuffer.toString('base64')}`;

    const result = await (async () => {
      if (sourcePublicUrl) {
        try {
          return await generateImg2ImgWithFal({
            imageUrl: sourcePublicUrl,
            prompt: EDRO_AVATAR_PROMPT,
            strength: 0.82,
            aspectRatio: '1:1',
            numImages: 1,
          });
        } catch {
          provider = 'fal-ai:nano-banana-pro';
        }
      } else {
        provider = 'fal-ai:nano-banana-pro';
      }

      return generateImageWithFal({
        model: 'nano-banana-pro',
        prompt: EDRO_AVATAR_PROMPT,
        negativePrompt: EDRO_AVATAR_NEGATIVE_PROMPT,
        aspectRatio: '1:1',
        numImages: 1,
        referenceImageUrl: dataUrl,
        referenceImageStrength: 0.22,
      });
    })();

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
