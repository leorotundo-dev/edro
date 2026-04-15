import { query } from '../db';

type PublicationLink = {
  briefing_id: string;
  copy_id: string | null;
  tenant_id: string;
  client_id: string;
  platform: string;
  platform_post_id: string;
  platform_post_url: string | null;
  published_at: string | null;
};

function normalizePlatform(value?: string | null) {
  return String(value || '').trim().toLowerCase();
}

async function loadPublishedLinks(tenantId: string, clientId: string): Promise<PublicationLink[]> {
  const { rows } = await query<PublicationLink>(
    `
    WITH scheduled AS (
      SELECT
        eps.briefing_id,
        eps.copy_id,
        b.tenant_id::text AS tenant_id,
        b.main_client_id::text AS client_id,
        eps.channel AS platform,
        eps.platform_post_id,
        eps.platform_post_url,
        eps.published_at
      FROM edro_publish_schedule eps
      JOIN edro_briefings b ON b.id = eps.briefing_id
      WHERE b.tenant_id = $1
        AND b.main_client_id = $2
        AND eps.status = 'published'
        AND eps.platform_post_id IS NOT NULL
    ),
    manual AS (
      SELECT
        sp.briefing_id,
        latest_copy.id AS copy_id,
        b.tenant_id::text AS tenant_id,
        b.main_client_id::text AS client_id,
        sp.platform,
        sp.platform_post_id,
        sp.platform_post_url,
        sp.published_at
      FROM scheduled_publications sp
      JOIN edro_briefings b ON b.id = sp.briefing_id
      LEFT JOIN LATERAL (
        SELECT cv.id
        FROM edro_copy_versions cv
        WHERE cv.briefing_id = sp.briefing_id
        ORDER BY cv.created_at DESC
        LIMIT 1
      ) latest_copy ON TRUE
      WHERE b.tenant_id = $1
        AND b.main_client_id = $2
        AND sp.status = 'published'
        AND sp.platform_post_id IS NOT NULL
    )
    SELECT *
    FROM (
      SELECT * FROM scheduled
      UNION ALL
      SELECT * FROM manual
    ) links
    WHERE NOT EXISTS (
      SELECT 1
      FROM briefing_post_metrics bpm
      WHERE bpm.briefing_id = links.briefing_id
        AND bpm.post_id = links.platform_post_id
    )
    ORDER BY published_at DESC NULLS LAST
    LIMIT 100
    `,
    [tenantId, clientId]
  );

  return rows;
}

export async function linkPublishedPostsToMetrics(tenantId: string, clientId: string) {
  const links = await loadPublishedLinks(tenantId, clientId);
  let linked = 0;

  for (const link of links) {
    const { rows } = await query<any>(
      `
      SELECT *
      FROM client_posts
      WHERE tenant_id = $1
        AND client_id = $2
        AND external_id = $3
      ORDER BY CASE WHEN LOWER(platform) = $4 THEN 0 ELSE 1 END, published_at DESC NULLS LAST
      LIMIT 1
      `,
      [tenantId, clientId, link.platform_post_id, normalizePlatform(link.platform)]
    );

    const post = rows[0];
    if (!post) continue;

    const likes = Number(post.likes_count || 0);
    const comments = Number(post.comments_count || 0);
    const shares = Number(post.shares_count || 0);
    const saves = Number(post.saves || 0);
    const engagement = likes + comments + shares + saves;

    await query(
      `
      INSERT INTO briefing_post_metrics (
        briefing_id, tenant_id, client_id, platform, post_id, post_url,
        published_at, format, reach, impressions, engagement, engagement_rate,
        likes, comments, saves, shares, raw, synced_at, match_source
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17::jsonb, NOW(), 'platform_post_id'
      )
      ON CONFLICT (briefing_id, platform) DO UPDATE SET
        post_id = EXCLUDED.post_id,
        post_url = EXCLUDED.post_url,
        published_at = EXCLUDED.published_at,
        format = EXCLUDED.format,
        reach = EXCLUDED.reach,
        impressions = EXCLUDED.impressions,
        engagement = EXCLUDED.engagement,
        engagement_rate = EXCLUDED.engagement_rate,
        likes = EXCLUDED.likes,
        comments = EXCLUDED.comments,
        saves = EXCLUDED.saves,
        shares = EXCLUDED.shares,
        raw = EXCLUDED.raw,
        synced_at = NOW(),
        match_source = 'platform_post_id'
      `,
      [
        link.briefing_id,
        tenantId,
        clientId,
        post.platform,
        link.platform_post_id,
        link.platform_post_url || post.url || null,
        post.published_at || link.published_at || null,
        post.media_type || null,
        post.reach || 0,
        post.impressions || 0,
        engagement,
        post.engagement_rate || 0,
        likes,
        comments,
        saves,
        shares,
        JSON.stringify({
          source: 'client_posts',
          client_post_id: post.id,
          platform_post_id: link.platform_post_id,
          copy_id: link.copy_id,
        }),
      ]
    );

    linked += 1;
  }

  return { scanned: links.length, linked };
}
