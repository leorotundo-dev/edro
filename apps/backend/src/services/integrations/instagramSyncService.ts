/**
 * Instagram Metrics Sync Service
 *
 * Para cada campaign_format com instagram_post_url vinculado:
 * 1. Busca lista de posts recentes da conta Business via Graph API
 * 2. Encontra o media_id pelo permalink
 * 3. Busca insights (impressões, reach, saves) + campos do media (likes, comments)
 * 4. Salva em format_performance_metrics com data_source='meta'
 * 5. Recalcula format_performance_summary
 * 6. Atualiza saúde do connector
 */

import { query } from '../../db';
import { decryptJSON } from '../../security/secrets';

const GRAPH_API = 'https://graph.facebook.com/v19.0';

// ── Types ────────────────────────────────────────────────────────────────────

interface InstagramMedia {
  id: string;
  permalink: string;
  media_type: string;
  timestamp: string;
}

interface InstagramInsightValue {
  value: number;
}

interface InstagramInsight {
  name: string;
  values: InstagramInsightValue[];
}

interface SyncResult {
  synced: number;
  skipped: number;
  errors: Array<{ format_id: string; error: string }>;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Normaliza URL do Instagram para comparação: remove trailing slash, query params */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname.replace(/\/$/, '')}`.toLowerCase();
  } catch {
    return url.trim().toLowerCase().replace(/\/$/, '');
  }
}

/** Busca lista de media da conta Instagram Business (até 100 posts recentes) */
async function fetchRecentMedia(igBusinessId: string, token: string): Promise<InstagramMedia[]> {
  const url = `${GRAPH_API}/${igBusinessId}/media?fields=id,permalink,media_type,timestamp&limit=100&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Instagram media list failed: ${res.status} ${body.slice(0, 200)}`);
  }
  const data = await res.json() as { data?: InstagramMedia[] };
  return data.data ?? [];
}

/** Busca insights de um media específico (lifetime totals) */
async function fetchMediaInsights(
  mediaId: string,
  token: string
): Promise<Record<string, number>> {
  const metrics = 'impressions,reach,saved';
  const url = `${GRAPH_API}/${mediaId}/insights?metric=${metrics}&period=lifetime&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    // Video-only metrics may fail for images — return empty instead of throwing
    return {};
  }
  const data = await res.json() as { data?: InstagramInsight[] };
  const result: Record<string, number> = {};
  for (const item of data.data ?? []) {
    result[item.name] = item.values?.[0]?.value ?? 0;
  }
  return result;
}

/** Busca campos de engajamento direto do objeto media */
async function fetchMediaFields(
  mediaId: string,
  token: string
): Promise<{ like_count: number; comments_count: number; media_type: string }> {
  const url = `${GRAPH_API}/${mediaId}?fields=like_count,comments_count,media_type&access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) return { like_count: 0, comments_count: 0, media_type: 'IMAGE' };
  const data = await res.json() as { like_count?: number; comments_count?: number; media_type?: string };
  return {
    like_count: data.like_count ?? 0,
    comments_count: data.comments_count ?? 0,
    media_type: data.media_type ?? 'IMAGE',
  };
}

/** Recalcula format_performance_summary a partir de todas as métricas salvas */
async function recalcSummary(tenantId: string, clientId: string, formatId: string): Promise<void> {
  const { rows: metrics } = await query(
    `SELECT impressions, reach, clicks, likes, comments, shares, saves,
            video_views, conversions, revenue_brl, spend_brl
     FROM format_performance_metrics
     WHERE tenant_id=$1 AND campaign_format_id=$2`,
    [tenantId, formatId]
  );

  if (!metrics.length) return;

  let total_impressions = 0, total_reach = 0, total_clicks = 0, total_engagements = 0;
  let total_conversions = 0, total_revenue = 0, total_spend = 0;

  for (const m of metrics) {
    total_impressions  += Number(m.impressions  ?? 0);
    total_reach        += Number(m.reach         ?? 0);
    total_clicks       += Number(m.clicks        ?? 0);
    total_engagements  += Number(m.likes ?? 0) + Number(m.comments ?? 0) + Number(m.shares ?? 0) + Number(m.saves ?? 0);
    total_conversions  += Number(m.conversions   ?? 0);
    total_revenue      += Number(m.revenue_brl   ?? 0);
    total_spend        += Number(m.spend_brl     ?? 0);
  }

  const avg_engagement_rate = total_impressions > 0
    ? Number(((total_engagements / total_impressions) * 100).toFixed(2))
    : null;
  const avg_ctr = total_impressions > 0
    ? Number(((total_clicks / total_impressions) * 100).toFixed(2))
    : null;
  const actual_roi_multiplier = total_spend > 0
    ? Number((total_revenue / total_spend).toFixed(2))
    : null;

  // Fetch predicted values for accuracy calculation
  const { rows: [fmt] } = await query(
    `SELECT predicted_roi_multiplier FROM campaign_formats WHERE id=$1`,
    [formatId]
  );
  const predicted_roi = Number(fmt?.predicted_roi_multiplier ?? 0);
  const score_accuracy = predicted_roi > 0 && actual_roi_multiplier !== null
    ? Number((100 - Math.abs(actual_roi_multiplier - predicted_roi) / Math.max(actual_roi_multiplier, predicted_roi) * 100).toFixed(1))
    : null;

  await query(
    `INSERT INTO format_performance_summary
       (tenant_id, client_id, campaign_format_id,
        start_date, end_date, days_active,
        total_impressions, total_reach, total_clicks, total_engagements,
        total_conversions, total_revenue_brl, total_spend_brl,
        avg_engagement_rate, avg_ctr, actual_roi_multiplier, actual_roas,
        predicted_roi_multiplier, score_accuracy,
        is_finalized, finalized_at)
     VALUES ($1,$2,$3,
             now()::date, now()::date, $4,
             $5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,
             true, now())
     ON CONFLICT (campaign_format_id)
     DO UPDATE SET
       end_date = now()::date,
       total_impressions = $5, total_reach = $6, total_clicks = $7,
       total_engagements = $8, total_conversions = $9,
       total_revenue_brl = $10, total_spend_brl = $11,
       avg_engagement_rate = $12, avg_ctr = $13,
       actual_roi_multiplier = $14, actual_roas = $14,
       predicted_roi_multiplier = $16, score_accuracy = $17,
       is_finalized = true, finalized_at = now(), updated_at = now()`,
    [
      tenantId, clientId, formatId,
      metrics.length,
      total_impressions, total_reach, total_clicks, total_engagements,
      total_conversions, total_revenue, total_spend,
      avg_engagement_rate, avg_ctr, actual_roi_multiplier, actual_roi_multiplier,
      predicted_roi || null, score_accuracy,
    ]
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function syncInstagramMetrics(
  tenantId: string,
  clientId: string
): Promise<SyncResult> {
  const result: SyncResult = { synced: 0, skipped: 0, errors: [] };

  // 1. Load Meta connector
  const { rows: connRows } = await query(
    `SELECT payload, secrets_enc FROM connectors
     WHERE tenant_id=$1 AND client_id=$2 AND provider='meta' LIMIT 1`,
    [tenantId, clientId]
  );

  if (!connRows[0]?.secrets_enc) {
    throw new Error('meta_connector_not_found');
  }

  const secrets = await decryptJSON(connRows[0].secrets_enc);
  const pageAccessToken: string = secrets.access_token;
  const igBusinessId: string | undefined = connRows[0].payload?.instagram_business_id;

  if (!pageAccessToken) throw new Error('meta_token_missing');
  if (!igBusinessId) throw new Error('instagram_business_id_missing');

  // 2. Load campaign_formats with instagram_post_url for this client
  const { rows: formats } = await query(
    `SELECT id, instagram_post_url, instagram_media_id
     FROM campaign_formats
     WHERE client_id=$1 AND instagram_post_url IS NOT NULL`,
    [clientId]
  );

  if (!formats.length) {
    result.skipped = 0;
    await updateConnectorHealth(tenantId, clientId, true, null);
    return result;
  }

  // 3. Fetch recent media list once (reuse across all formats)
  let recentMedia: InstagramMedia[] = [];
  try {
    recentMedia = await fetchRecentMedia(igBusinessId, pageAccessToken);
  } catch (err: any) {
    await updateConnectorHealth(tenantId, clientId, false, err.message);
    throw err;
  }

  // 4. For each format, find matching post and sync metrics
  const today = new Date().toISOString().slice(0, 10);

  for (const fmt of formats) {
    try {
      // Find media by permalink (or use cached media_id)
      let mediaId: string | undefined = fmt.instagram_media_id ?? undefined;

      if (!mediaId) {
        const normalizedTarget = normalizeUrl(fmt.instagram_post_url);
        const match = recentMedia.find((m) => normalizeUrl(m.permalink) === normalizedTarget);
        if (!match) {
          result.skipped++;
          continue;
        }
        mediaId = match.id;
        // Cache media_id on the format
        await query(
          `UPDATE campaign_formats SET instagram_media_id=$1 WHERE id=$2`,
          [mediaId, fmt.id]
        );
      }

      // Fetch insights + media fields in parallel
      const [insights, fields] = await Promise.all([
        fetchMediaInsights(mediaId, pageAccessToken),
        fetchMediaFields(mediaId, pageAccessToken),
      ]);

      const impressions    = insights['impressions'] ?? 0;
      const reach          = insights['reach']       ?? 0;
      const saves          = insights['saved']       ?? 0;
      const likes          = fields.like_count;
      const comments       = fields.comments_count;
      const video_views    = insights['video_views'] ?? 0;
      const engagement_rate = impressions > 0
        ? Number(((likes + comments + saves) / impressions * 100).toFixed(2))
        : null;

      // Upsert metric for today (idempotent — re-running overwrites same-day entry)
      await query(
        `INSERT INTO format_performance_metrics
           (tenant_id, client_id, campaign_format_id,
            measurement_date, measurement_period,
            impressions, reach, likes, comments, saves, video_views,
            engagement_rate, data_source, is_verified)
         VALUES ($1,$2,$3,$4,'lifetime',$5,$6,$7,$8,$9,$10,$11,'meta',true)
         ON CONFLICT (campaign_format_id, measurement_date, measurement_period)
         DO UPDATE SET
           impressions=$5, reach=$6, likes=$7, comments=$8, saves=$9,
           video_views=$10, engagement_rate=$11, updated_at=now()`,
        [
          tenantId, clientId, fmt.id,
          today,
          impressions, reach, likes, comments, saves, video_views,
          engagement_rate,
        ]
      ).catch(async () => {
        // Fallback if unique constraint doesn't exist — just insert
        await query(
          `INSERT INTO format_performance_metrics
             (tenant_id, client_id, campaign_format_id,
              measurement_date, measurement_period,
              impressions, reach, likes, comments, saves, video_views,
              engagement_rate, data_source, is_verified)
           VALUES ($1,$2,$3,$4,'lifetime',$5,$6,$7,$8,$9,$10,$11,'meta',true)`,
          [tenantId, clientId, fmt.id, today, impressions, reach, likes, comments, saves, video_views, engagement_rate]
        );
      });

      // Update last_metrics_synced_at on the format
      await query(
        `UPDATE campaign_formats SET last_metrics_synced_at=now() WHERE id=$1`,
        [fmt.id]
      );

      // Recalc summary
      await recalcSummary(tenantId, clientId, fmt.id);

      result.synced++;
    } catch (err: any) {
      result.errors.push({ format_id: fmt.id, error: err.message ?? String(err) });
    }
  }

  // 5. Update connector health
  const success = result.errors.length === 0;
  const lastError = result.errors.length > 0
    ? result.errors.map((e) => e.error).join('; ')
    : null;
  await updateConnectorHealth(tenantId, clientId, success, lastError);

  return result;
}

async function updateConnectorHealth(
  tenantId: string,
  clientId: string,
  ok: boolean,
  error: string | null
): Promise<void> {
  await query(
    `UPDATE connectors
     SET last_sync_ok=$3, last_sync_at=now(),
         last_error=CASE WHEN $3 THEN NULL ELSE $4 END,
         last_error_at=CASE WHEN $3 THEN last_error_at ELSE now() END
     WHERE tenant_id=$1 AND client_id=$2 AND provider='meta'`,
    [tenantId, clientId, ok, error]
  );
}
