/**
 * tiktokService.ts
 *
 * Publishes a video to TikTok using Content Posting API v2.
 * Token stored in connectors table: provider = 'tiktok'
 *   payload:    { open_id: string }
 *   secrets_enc: encrypted({ access_token: string })
 *
 * TikTok Content Posting API flow:
 *   1. POST /v2/post/publish/video/init/ → get upload_url + publish_id
 *   2. PUT video binary to upload_url (chunked upload)
 *   3. Poll /v2/post/publish/status/fetch/ until PUBLISH_COMPLETE
 */
import { query } from '../../db/db';
import { decryptJSON } from '../../security/secrets';

const TIKTOK_API = 'https://open.tiktokapis.com/v2';
const MAX_POLL   = 30; // 30 × 5s = 150s max

export interface TikTokPublishParams {
  videoUrl:    string;  // CDN URL of the MP4 video to post
  caption:     string;  // post text (max 2200 chars)
  /** Privacy level: PUBLIC_TO_EVERYONE | MUTUAL_FOLLOW_FRIENDS | SELF_ONLY */
  privacy?: 'PUBLIC_TO_EVERYONE' | 'MUTUAL_FOLLOW_FRIENDS' | 'SELF_ONLY';
  /** Disable duet/stitch/comments */
  disableDuet?:    boolean;
  disableStitch?:  boolean;
  disableComment?: boolean;
}

export interface TikTokPublishResult {
  publishId: string;
  shareUrl:  string; // best-effort, may be empty until post propagates
}

// ─────────────────────────────────────────────────────────────────────────────

/** Step 1: Init upload and get signed upload URL */
async function initVideoUpload(
  accessToken: string,
  openId: string,
  params: TikTokPublishParams,
  videoSizeBytes: number,
  videoDurationMs: number,
): Promise<{ uploadUrl: string; publishId: string }> {
  const chunkSize = Math.min(videoSizeBytes, 64 * 1024 * 1024); // 64 MB max chunk

  const body = {
    post_info: {
      title:             params.caption.slice(0, 2200),
      privacy_level:     params.privacy ?? 'PUBLIC_TO_EVERYONE',
      disable_duet:      params.disableDuet  ?? false,
      disable_stitch:    params.disableStitch ?? false,
      disable_comment:   params.disableComment ?? false,
    },
    source_info: {
      source:            'PULL_FROM_URL',
      video_url:         params.videoUrl,
    },
  };

  const res = await fetch(`${TIKTOK_API}/post/publish/video/init/`, {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`TikTok API error ${res.status}: ${errBody.slice(0, 300)}`);
  }
  const data = await res.json() as {
    data?:  { publish_id: string; upload_url?: string };
    error?: { code: string; message: string; log_id: string };
  };

  if (data.error?.code && data.error.code !== 'ok') {
    throw new Error(`TikTok init failed: ${data.error.message} (${data.error.code})`);
  }
  if (!data.data?.publish_id) {
    throw new Error('TikTok: publish_id não retornado');
  }

  return {
    publishId: data.data.publish_id,
    uploadUrl: data.data.upload_url ?? '',
  };
}

/** Step 2: Poll publish status until complete */
async function waitForPublish(
  accessToken: string,
  publishId: string,
): Promise<{ shareUrl: string }> {
  for (let i = 0; i < MAX_POLL; i++) {
    await new Promise((r) => setTimeout(r, 5000));

    const res = await fetch(`${TIKTOK_API}/post/publish/status/fetch/`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      body: JSON.stringify({ publish_id: publishId }),
    });

    const data = await res.json() as {
      data?:  { status: string; share_url?: string; fail_reason?: string };
      error?: { code: string; message: string };
    };

    if (data.error?.code && data.error.code !== 'ok') {
      throw new Error(`TikTok status error: ${data.error.message}`);
    }

    const status = data.data?.status ?? '';

    if (status === 'PUBLISH_COMPLETE') {
      return { shareUrl: data.data?.share_url ?? '' };
    }
    if (status === 'FAILED') {
      throw new Error(`TikTok publicação falhou: ${data.data?.fail_reason ?? 'razão desconhecida'}`);
    }
    // PROCESSING_UPLOAD / SEND_TO_USER_INBOX / etc. — keep polling
  }

  // Timeout — post may still publish async; return partial success
  return { shareUrl: '' };
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function publishTikTokVideo(
  tenantId: string,
  clientId: string,
  params:   TikTokPublishParams,
): Promise<TikTokPublishResult> {
  // Load connector
  const { rows } = await query(
    `SELECT payload, secrets_enc FROM connectors
     WHERE tenant_id = $1 AND client_id = $2 AND provider = 'tiktok' AND status = 'active'
     LIMIT 1`,
    [tenantId, clientId],
  );

  if (!rows.length) {
    throw new Error('Conector TikTok não configurado. Conecte sua conta TikTok Business primeiro.');
  }

  const payload     = rows[0].payload as { open_id?: string };
  const secrets     = await decryptJSON(rows[0].secrets_enc);
  const accessToken = secrets.access_token as string;

  if (!accessToken) throw new Error('Token TikTok não encontrado.');
  if (!payload.open_id) throw new Error('open_id TikTok não configurado no conector.');

  // Init (TikTok PULL_FROM_URL — no binary upload needed, TikTok fetches the video)
  const { publishId } = await initVideoUpload(
    accessToken,
    payload.open_id,
    params,
    0,   // not needed for PULL_FROM_URL
    0,
  );

  // Poll for completion (async, TikTok processes video server-side)
  const { shareUrl } = await waitForPublish(accessToken, publishId);

  return { publishId, shareUrl };
}
