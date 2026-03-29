/**
 * clientPostsService.ts
 *
 * Fetches a client's OWN posts from their social media accounts and stores
 * them in the `client_posts` table.
 *
 * Supported platforms: Instagram Business, Facebook Page (via Meta Graph API).
 * Requires a Meta connector with accessToken + instagramBusinessId and/or pageId.
 */

import { query } from '../../db';
import { getMetaConnector } from '../../socialListening/metaConnector';

const GRAPH_API = 'https://graph.facebook.com/v19.0';
const MAX_POSTS = 50;

// ── Types ────────────────────────────────────────────────────────────────────

type ClientPost = {
  platform: 'instagram' | 'facebook';
  external_id: string;
  url: string | null;
  caption: string | null;
  media_type: string | null;
  media_url: string | null;
  thumbnail_url: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
  impressions: number | null;
  reach: number | null;
  saves: number | null;
  video_views: number | null;
  engagement_rate: number | null;
  published_at: Date | null;
};

export type ClientPostsSyncResult = {
  instagram: number;
  facebook: number;
  errors: string[];
};

// ── Instagram ────────────────────────────────────────────────────────────────

async function fetchInstagramPosts(
  igBusinessId: string,
  token: string
): Promise<ClientPost[]> {
  const url =
    `${GRAPH_API}/${igBusinessId}/media` +
    `?fields=id,caption,media_type,media_url,thumbnail_url,permalink,` +
    `timestamp,like_count,comments_count` +
    `&limit=${MAX_POSTS}&access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instagram media list ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as { data?: any[] };
  const items = data.data ?? [];

  // Fetch insights in parallel (best-effort — images lack video_views)
  const postsWithInsights = await Promise.all(
    items.map(async (item: any): Promise<ClientPost> => {
      let impressions: number | null = null;
      let reach: number | null = null;
      let saves: number | null = null;
      let video_views: number | null = null;

      try {
        const insightUrl =
          `${GRAPH_API}/${item.id}/insights` +
          `?metric=impressions,reach,saved,video_views&period=lifetime` +
          `&access_token=${encodeURIComponent(token)}`;
        const ir = await fetch(insightUrl, { signal: AbortSignal.timeout(10000) });
        if (ir.ok) {
          const idata = await ir.json() as { data?: Array<{ name: string; values: Array<{ value: number }> }> };
          for (const metric of idata.data ?? []) {
            const val = metric.values?.[0]?.value ?? null;
            if (metric.name === 'impressions') impressions = val;
            if (metric.name === 'reach') reach = val;
            if (metric.name === 'saved') saves = val;
            if (metric.name === 'video_views') video_views = val;
          }
        }
      } catch {
        // insights optional — don't fail the whole post
      }

      const likes = Number(item.like_count ?? 0);
      const comments = Number(item.comments_count ?? 0);
      const engagement_rate =
        impressions && impressions > 0
          ? Number(((likes + comments + (saves ?? 0)) / impressions * 100).toFixed(2))
          : null;

      return {
        platform: 'instagram',
        external_id: String(item.id),
        url: item.permalink ?? null,
        caption: item.caption ? String(item.caption).slice(0, 2000) : null,
        media_type: item.media_type ?? null,
        media_url: item.media_url ?? null,
        thumbnail_url: item.thumbnail_url ?? null,
        likes_count: likes,
        comments_count: comments,
        shares_count: 0,
        impressions,
        reach,
        saves,
        video_views,
        engagement_rate,
        published_at: item.timestamp ? new Date(item.timestamp) : null,
      };
    })
  );

  return postsWithInsights;
}

// ── Facebook ─────────────────────────────────────────────────────────────────

async function fetchFacebookPosts(
  pageId: string,
  token: string
): Promise<ClientPost[]> {
  const url =
    `${GRAPH_API}/${pageId}/posts` +
    `?fields=id,message,permalink_url,created_time,` +
    `shares,reactions.summary(true),comments.summary(true)` +
    `&limit=${MAX_POSTS}&access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Facebook posts ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json() as { data?: any[] };
  return (data.data ?? []).map((post: any): ClientPost => ({
    platform: 'facebook',
    external_id: String(post.id),
    url: post.permalink_url ?? null,
    caption: post.message ? String(post.message).slice(0, 2000) : null,
    media_type: 'POST',
    media_url: null,
    thumbnail_url: null,
    likes_count: Number(post.reactions?.summary?.total_count ?? 0),
    comments_count: Number(post.comments?.summary?.total_count ?? 0),
    shares_count: Number(post.shares?.count ?? 0),
    impressions: null,
    reach: null,
    saves: null,
    video_views: null,
    engagement_rate: null,
    published_at: post.created_time ? new Date(post.created_time) : null,
  }));
}

// ── Upsert ───────────────────────────────────────────────────────────────────

async function upsertPosts(
  tenantId: string,
  clientId: string,
  posts: ClientPost[]
): Promise<number> {
  let inserted = 0;

  for (const p of posts) {
    const { rowCount } = await query(
      `INSERT INTO client_posts
         (tenant_id, client_id, platform, external_id, url, caption,
          media_type, media_url, thumbnail_url,
          likes_count, comments_count, shares_count,
          impressions, reach, saves, video_views, engagement_rate,
          published_at, fetched_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW(),NOW())
       ON CONFLICT (tenant_id, platform, external_id) DO UPDATE SET
         url            = EXCLUDED.url,
         caption        = EXCLUDED.caption,
         likes_count    = EXCLUDED.likes_count,
         comments_count = EXCLUDED.comments_count,
         shares_count   = EXCLUDED.shares_count,
         impressions    = EXCLUDED.impressions,
         reach          = EXCLUDED.reach,
         saves          = EXCLUDED.saves,
         video_views    = EXCLUDED.video_views,
         engagement_rate = EXCLUDED.engagement_rate,
         fetched_at     = NOW(),
         updated_at     = NOW()`,
      [
        tenantId, clientId,
        p.platform, p.external_id, p.url, p.caption,
        p.media_type, p.media_url, p.thumbnail_url,
        p.likes_count, p.comments_count, p.shares_count,
        p.impressions, p.reach, p.saves, p.video_views, p.engagement_rate,
        p.published_at,
      ]
    );
    if ((rowCount ?? 0) > 0) inserted++;
  }

  return inserted;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function syncClientPosts(
  tenantId: string,
  clientId: string
): Promise<ClientPostsSyncResult> {
  const result: ClientPostsSyncResult = { instagram: 0, facebook: 0, errors: [] };

  const config = await getMetaConnector(tenantId, clientId);
  if (!config?.accessToken) {
    throw new Error('meta_connector_not_found');
  }

  // Instagram
  if (config.instagramBusinessId) {
    try {
      const posts = await fetchInstagramPosts(config.instagramBusinessId, config.accessToken);
      result.instagram = await upsertPosts(tenantId, clientId, posts);
    } catch (err: any) {
      result.errors.push(`instagram: ${err.message}`);
    }
  }

  // Facebook
  if (config.pageId) {
    try {
      const posts = await fetchFacebookPosts(config.pageId, config.accessToken);
      result.facebook = await upsertPosts(tenantId, clientId, posts);
    } catch (err: any) {
      result.errors.push(`facebook: ${err.message}`);
    }
  }

  return result;
}
