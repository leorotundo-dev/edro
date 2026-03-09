/**
 * metaSyncService.ts
 *
 * Pulls per-post engagement metrics from Meta/Instagram Graph API
 * for all campaign_formats that have instagram_media_id set,
 * writes the data into format_performance_metrics, and triggers
 * recomputeClientLearningRules so the LearningEngine auto-updates.
 *
 * Called by: POST /clients/:clientId/sync-meta-performance
 */
import { query } from '../../db/db';
import { recomputeClientLearningRules } from '../learningEngine';
import { computeClientCopyRoi } from '../copyRoiService';

const META_GRAPH_VERSION = 'v18.0';

// Instagram media metrics available via /insights endpoint
const IG_METRICS = [
  'impressions', 'reach', 'likes', 'comments', 'shares', 'saved',
  'plays',        // video views (only for video posts, silently ignored for images)
].join(',');

type RawInsightValue = { value: number };
type RawInsight      = { name: string; values: RawInsightValue[] };

interface PostMetrics {
  impressions:  number;
  reach:        number;
  likes:        number;
  comments:     number;
  shares:       number;
  saves:        number;
  video_views:  number;
}

/** Pull lifetime metrics for one Instagram media object */
async function fetchIgPostMetrics(mediaId: string, accessToken: string): Promise<PostMetrics | null> {
  const url =
    `https://graph.facebook.com/${META_GRAPH_VERSION}/${mediaId}/insights` +
    `?metric=${IG_METRICS}&period=lifetime&access_token=${accessToken}`;

  const res = await fetch(url);
  if (!res.ok) return null; // silently skip — post may have been deleted or token issue

  const data = await res.json() as { data?: RawInsight[]; error?: { message: string } };
  if (data.error || !data.data) return null;

  const pick = (name: string) => {
    const entry = data.data!.find((d) => d.name === name);
    return entry?.values?.[0]?.value ?? 0;
  };

  return {
    impressions: pick('impressions'),
    reach:       pick('reach'),
    likes:       pick('likes'),
    comments:    pick('comments'),
    shares:      pick('shares'),
    saves:       pick('saved'),
    video_views: pick('plays'),
  };
}

export interface SyncResult {
  synced:  number;   // formats successfully synced
  skipped: number;   // formats without media_id or token
  errors:  string[]; // per-format error messages (non-fatal)
}

/**
 * Main entry point.
 * 1. Finds the Meta connector (page-level OAuth token) for the client.
 * 2. Fetches all campaign_formats with instagram_media_id set.
 * 3. For each, pulls IG insights and upserts into format_performance_metrics.
 * 4. Triggers learning rule recomputation (non-blocking).
 */
export async function syncMetaPerformanceForClient(
  tenantId: string,
  clientId: string,
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: [] };

  // ── 1. Get Meta connector token ────────────────────────────────────────────
  const { rows: connectorRows } = await query(
    `SELECT payload, secrets_enc FROM connectors
     WHERE tenant_id = $1 AND client_id = $2 AND provider = 'meta' AND status = 'active'
     LIMIT 1`,
    [tenantId, clientId],
  );

  if (!connectorRows.length || !connectorRows[0].secrets_enc) {
    throw new Error('Meta connector not found. Connect via OAuth first.');
  }

  const accessToken = connectorRows[0].secrets_enc as string; // plaintext for now

  // ── 2. Find campaign_formats with instagram_media_id for this client ───────
  const { rows: formats } = await query(
    `SELECT
       cf.id            AS format_id,
       cf.instagram_media_id,
       cf.platform,
       cf.format,
       c.id             AS campaign_id,
       c.client_id
     FROM campaign_formats cf
     JOIN campaigns c ON c.id = cf.campaign_id
     WHERE c.tenant_id = $1
       AND c.client_id = $2
       AND cf.instagram_media_id IS NOT NULL
       AND cf.instagram_media_id <> ''`,
    [tenantId, clientId],
  );

  if (!formats.length) {
    result.skipped = 1;
    return result;
  }

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // ── 3. Fetch metrics and upsert ───────────────────────────────────────────
  for (const fmt of formats) {
    try {
      const metrics = await fetchIgPostMetrics(fmt.instagram_media_id, accessToken);

      if (!metrics) {
        result.errors.push(`No metrics for media_id ${fmt.instagram_media_id}`);
        result.skipped++;
        continue;
      }

      const engRate =
        metrics.impressions > 0
          ? (metrics.likes + metrics.comments + metrics.shares + metrics.saves) / metrics.impressions
          : 0;

      // Delete any existing row for this format+date+period, then re-insert fresh data
      await query(
        `DELETE FROM format_performance_metrics
         WHERE campaign_format_id = $1 AND measurement_date = $2 AND measurement_period = 'lifetime'`,
        [fmt.format_id, today],
      );

      await query(
        `INSERT INTO format_performance_metrics (
           id, tenant_id, client_id, campaign_format_id,
           measurement_date, measurement_period,
           impressions, reach, clicks,
           likes, comments, shares, saves,
           engagement_rate, video_views,
           data_source, is_verified
         ) VALUES (
           gen_random_uuid(), $1, $2, $3,
           $4, 'lifetime',
           $5, $6, 0,
           $7, $8, $9, $10,
           $11, $12,
           'meta_instagram', true
         )`,
        [
          tenantId, clientId, fmt.format_id,
          today,
          metrics.impressions, metrics.reach,
          metrics.likes, metrics.comments, metrics.shares, metrics.saves,
          engRate, metrics.video_views,
        ],
      );

      // Update last_metrics_synced_at on the format
      await query(
        `UPDATE campaign_formats SET last_metrics_synced_at = now() WHERE id = $1`,
        [fmt.format_id],
      );

      result.synced++;
    } catch (e: any) {
      result.errors.push(`format ${fmt.format_id}: ${e?.message}`);
    }
  }

  // ── 4. Recompute learning rules + copy ROI (non-blocking) ────────────────
  if (result.synced > 0) {
    recomputeClientLearningRules(tenantId, clientId).catch(() => {});
    computeClientCopyRoi(tenantId, clientId).catch(() => {});
  }

  return result;
}
