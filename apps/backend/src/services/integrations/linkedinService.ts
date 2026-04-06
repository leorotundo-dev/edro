/**
 * linkedinService.ts
 *
 * Publishes an image post to LinkedIn using UGC Posts API.
 * Token stored in connectors table: provider = 'linkedin'
 *   payload:    { person_id: string, organization_id?: string }
 *   secrets_enc: encrypted({ access_token: string })
 *
 * LinkedIn API flow for image posts:
 *   1. Register upload → get asset URN + uploadUrl
 *   2. PUT image binary to uploadUrl
 *   3. POST ugcPosts with asset URN + caption
 */
import { query } from '../../db/db';
import { decryptJSON } from '../../security/secrets';

const LI_API = 'https://api.linkedin.com/v2';

export interface LinkedInPublishParams {
  imageUrl: string;   // CDN URL of the image to post
  caption:  string;   // post text
  title?:   string;   // optional image title metadata
}

export interface LinkedInPublishResult {
  postId: string;
  postUrl: string;
}

// ── Step 1: Register image upload with LinkedIn ───────────────────────────────
async function registerImageUpload(
  accessToken: string,
  ownerUrn: string,
): Promise<{ asset: string; uploadUrl: string }> {
  const res = await fetch(`${LI_API}/assets?action=registerUpload`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes:              ['urn:li:digitalmediaRecipe:feedshare-image'],
        owner:                ownerUrn,
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier:       'urn:li:userGeneratedContent',
        }],
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`LinkedIn registerUpload failed (${res.status}): ${err.slice(0, 300)}`);
  }

  const data = await res.json() as {
    value: {
      asset: string;
      uploadMechanism: {
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest': {
          uploadUrl: string;
        };
      };
    };
  };

  const uploadUrl =
    data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest']
      ?.uploadUrl;

  if (!uploadUrl) throw new Error('LinkedIn: uploadUrl não retornado');
  return { asset: data.value.asset, uploadUrl };
}

// ── Step 2: Upload image binary to LinkedIn's CDN ─────────────────────────────
async function uploadImageBinary(uploadUrl: string, imageUrl: string): Promise<void> {
  // Fetch image from CDN
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Não foi possível baixar a imagem: ${imgRes.status}`);

  const contentType = imgRes.headers.get('content-type') || 'image/jpeg';
  const buffer      = await imgRes.arrayBuffer();

  const uploadRes = await fetch(uploadUrl, {
    method:  'PUT',
    headers: { 'Content-Type': contentType },
    body:    buffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text().catch(() => '');
    throw new Error(`LinkedIn image upload failed (${uploadRes.status}): ${err.slice(0, 200)}`);
  }
}

// ── Step 3: Create UGC post ───────────────────────────────────────────────────
async function createUgcPost(
  accessToken: string,
  ownerUrn: string,
  asset: string,
  caption: string,
  title: string,
): Promise<string> {
  const body = {
    author:          ownerUrn,
    lifecycleState:  'PUBLISHED',
    specificContent: {
      'com.linkedin.ugc.ShareContent': {
        shareCommentary:    { text: caption },
        shareMediaCategory: 'IMAGE',
        media: [{
          status: 'READY',
          media:  asset,
          title:  { text: title },
        }],
      },
    },
    visibility: {
      'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
    },
  };

  const res = await fetch(`${LI_API}/ugcPosts`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`LinkedIn ugcPosts failed (${res.status}): ${err.slice(0, 300)}`);
  }

  // LinkedIn returns the post ID in the header x-restli-id or body
  const payload = (await res.json().catch(() => ({}))) as { id?: string };
  const postId = res.headers.get('x-restli-id') || payload.id || '';
  return postId;
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function publishLinkedInPost(
  tenantId: string,
  clientId: string,
  params:   LinkedInPublishParams,
): Promise<LinkedInPublishResult> {
  // Load connector
  const { rows } = await query(
    `SELECT payload, secrets_enc FROM connectors
     WHERE tenant_id = $1 AND client_id = $2 AND provider = 'linkedin' AND status = 'active'
     LIMIT 1`,
    [tenantId, clientId],
  );

  if (!rows.length) throw new Error('Conector LinkedIn não configurado. Conecte sua conta primeiro.');

  const payload     = rows[0].payload as { person_id?: string; organization_id?: string };
  const secrets     = await decryptJSON(rows[0].secrets_enc);
  const accessToken = secrets.access_token as string;

  if (!accessToken) throw new Error('Token LinkedIn não encontrado.');

  // Prefer organization page (company post) over personal profile
  const ownerUrn = payload.organization_id
    ? `urn:li:organization:${payload.organization_id}`
    : `urn:li:person:${payload.person_id}`;

  if (!payload.person_id && !payload.organization_id) {
    throw new Error('person_id ou organization_id não configurados no conector LinkedIn.');
  }

  // 1. Register
  const { asset, uploadUrl } = await registerImageUpload(accessToken, ownerUrn);

  // 2. Upload image
  await uploadImageBinary(uploadUrl, params.imageUrl);

  // 3. Post
  const postId = await createUgcPost(
    accessToken,
    ownerUrn,
    asset,
    params.caption,
    params.title || 'Publicação',
  );

  const isOrg = !!payload.organization_id;
  const postUrl = isOrg
    ? `https://www.linkedin.com/feed/update/${encodeURIComponent(`urn:li:share:${postId}`)}/`
    : `https://www.linkedin.com/feed/`;

  return { postId, postUrl };
}
