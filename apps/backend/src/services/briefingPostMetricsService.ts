import { query } from '../db';
import { ReporteiClient } from '../providers/reportei/reporteiClient';
import { getReporteiConnector } from '../providers/reportei/reporteiConnector';

// ── Format family grouping ────────────────────────────────────────────────────
const FORMAT_FAMILIES: Record<string, string> = {
  reel: 'video',
  video: 'video',
  reels: 'video',
  carousel: 'carousel',
  album: 'carousel',
  slideshow: 'carousel',
  image: 'image',
  photo: 'image',
  foto: 'image',
  story: 'story',
  stories: 'story',
  text: 'text',
  article: 'text',
  artigo: 'text',
};

function formatFamily(f?: string | null): string {
  if (!f) return '';
  return FORMAT_FAMILIES[f.toLowerCase().trim()] ?? f.toLowerCase().trim();
}

// ── Auto-match scoring ────────────────────────────────────────────────────────
function matchScore(dueAt: Date, post: any, briefingFormat: string): number {
  const publishedAt = post.published_at
    ? new Date(post.published_at)
    : post.timestamp
    ? new Date(post.timestamp)
    : post.created_time
    ? new Date(post.created_time)
    : null;

  let score = 0;

  if (publishedAt && !isNaN(publishedAt.getTime())) {
    const diffDays = Math.abs(dueAt.getTime() - publishedAt.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 1) score += 3;
    else if (diffDays <= 3) score += 2;
    else if (diffDays <= 7) score += 1;
  }

  const postFormat: string = post.format ?? post.media_type ?? post.type ?? '';
  if (briefingFormat && postFormat) {
    const bf = briefingFormat.toLowerCase().trim();
    const pf = postFormat.toLowerCase().trim();
    if (bf === pf) {
      score += 2;
    } else if (formatFamily(bf) === formatFamily(pf)) {
      score += 1;
    }
  }

  return score;
}

// ── Field mapping (flexible — handles various Reportei schemas) ───────────────
function mapPostFields(raw: any, briefingId: string, tenantId: string | null, clientId: string | null, platform: string): Record<string, any> {
  const n = (v: any) => (v != null && !isNaN(Number(v)) ? Number(v) : null);
  return {
    briefing_id:     briefingId,
    tenant_id:       tenantId,
    client_id:       clientId,
    platform,
    post_id:         raw.id ?? raw.post_id ?? raw.media_id ?? null,
    post_url:        raw.permalink ?? raw.url ?? raw.link ?? null,
    published_at:    raw.published_at ?? raw.timestamp ?? raw.created_time ?? null,
    format:          raw.format ?? raw.media_type ?? raw.type ?? null,
    reach:           n(raw.reach ?? raw.metrics?.reach),
    impressions:     n(raw.impressions ?? raw.metrics?.impressions),
    engagement:      n(raw.engagement ?? raw.engagements ?? raw.metrics?.engagement),
    engagement_rate: n(raw.engagement_rate ?? raw.metrics?.engagement_rate),
    likes:           n(raw.likes ?? raw.like_count ?? raw.metrics?.likes),
    comments:        n(raw.comments ?? raw.comment_count ?? raw.metrics?.comments),
    saves:           n(raw.saves ?? raw.saved ?? raw.metrics?.saves),
    shares:          n(raw.shares ?? raw.share_count ?? raw.metrics?.shares),
    raw:             JSON.stringify(raw),
    match_source:    'auto',
  };
}

// ── Public: sync metrics for a single briefing ────────────────────────────────
export async function syncBriefingMetrics(
  briefingId: string,
  tenantId: string | null
): Promise<{ synced: number; platforms: string[]; errors: string[] }> {
  const { rows: briefingRows } = await query<any>(
    `SELECT b.due_at, b.payload, b.main_client_id, b.client_id
     FROM edro_briefings b
     WHERE b.id = $1 LIMIT 1`,
    [briefingId]
  );
  const briefing = briefingRows[0];
  if (!briefing) return { synced: 0, platforms: [], errors: ['briefing_not_found'] };

  const dueAt: Date = briefing.due_at
    ? new Date(briefing.due_at)
    : new Date();

  const sinceDate = new Date(dueAt);
  sinceDate.setDate(sinceDate.getDate() - 7);
  const untilDate = new Date(dueAt);
  untilDate.setDate(untilDate.getDate() + 7);
  const since = sinceDate.toISOString().slice(0, 10);
  const until = untilDate.toISOString().slice(0, 10);

  const payload = briefing.payload ?? {};
  const briefingFormat: string = payload.format ?? payload.content_format ?? '';

  // Collect platforms from briefing channels
  const channels: string[] = Array.isArray(payload.channels)
    ? payload.channels
    : typeof payload.channels === 'string'
    ? [payload.channels]
    : [];
  if (channels.length === 0 && payload.platform) channels.push(payload.platform);

  const mainClientId: string | null = briefing.main_client_id ?? null;
  const effectiveTenantId = tenantId ?? null;

  const connector = mainClientId && effectiveTenantId
    ? await getReporteiConnector(effectiveTenantId, mainClientId)
    : null;

  if (!connector?.accountId) {
    return { synced: 0, platforms: [], errors: ['reportei_not_configured'] };
  }

  const client = new ReporteiClient();
  const overrides = {
    baseUrl: connector.baseUrl,
    token: connector.token,
  };

  const synced: string[] = [];
  const errors: string[] = [];

  for (const channel of channels.length > 0 ? channels : ['Instagram']) {
    try {
      const posts = await client.getPosts(connector.accountId, { platform: channel, since, until }, overrides);
      if (!posts.length) continue;

      // Pick best-matching post
      let best: any = null;
      let bestScore = 0;
      for (const post of posts) {
        const s = matchScore(dueAt, post, briefingFormat);
        if (s > bestScore) {
          bestScore = s;
          best = post;
        }
      }

      if (!best || bestScore < 1) continue;

      const fields = mapPostFields(best, briefingId, effectiveTenantId, mainClientId, channel);

      await query(
        `INSERT INTO briefing_post_metrics
           (briefing_id, tenant_id, client_id, platform, post_id, post_url,
            published_at, format, reach, impressions, engagement, engagement_rate,
            likes, comments, saves, shares, raw, synced_at, match_source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb,NOW(),$18)
         ON CONFLICT (briefing_id, platform) DO UPDATE SET
           post_id=EXCLUDED.post_id, post_url=EXCLUDED.post_url,
           published_at=EXCLUDED.published_at, format=EXCLUDED.format,
           reach=EXCLUDED.reach, impressions=EXCLUDED.impressions,
           engagement=EXCLUDED.engagement, engagement_rate=EXCLUDED.engagement_rate,
           likes=EXCLUDED.likes, comments=EXCLUDED.comments,
           saves=EXCLUDED.saves, shares=EXCLUDED.shares,
           raw=EXCLUDED.raw, synced_at=NOW(), match_source=EXCLUDED.match_source`,
        [
          fields.briefing_id, fields.tenant_id, fields.client_id, fields.platform,
          fields.post_id, fields.post_url, fields.published_at, fields.format,
          fields.reach, fields.impressions, fields.engagement, fields.engagement_rate,
          fields.likes, fields.comments, fields.saves, fields.shares,
          fields.raw, fields.match_source,
        ]
      );
      synced.push(channel);
    } catch (err: any) {
      errors.push(`${channel}: ${err?.message ?? 'unknown'}`);
    }
  }

  return { synced: synced.length, platforms: synced, errors };
}

// ── Public: batch sync for all delivered briefings of a client ────────────────
export async function syncClientDeliveredBriefings(
  clientId: string,
  tenantId: string
): Promise<{ total: number; synced: number }> {
  const { rows } = await query<any>(
    `SELECT id FROM edro_briefings
     WHERE main_client_id = $1
       AND status IN ('entrega','iclips_out','done')
       AND (due_at IS NULL OR due_at >= NOW() - INTERVAL '90 days')
     ORDER BY due_at DESC
     LIMIT 50`,
    [clientId]
  );

  let synced = 0;
  for (const row of rows) {
    try {
      const result = await syncBriefingMetrics(row.id, tenantId);
      if (result.synced > 0) synced++;
    } catch {
      // continue
    }
  }

  return { total: rows.length, synced };
}
