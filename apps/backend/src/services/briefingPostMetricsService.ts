import { query } from '../db';
import { ReporteiClient, INSTAGRAM_METRICS, PLATFORM_METRICS } from '../providers/reportei/reporteiClient';
import { getReporteiConnector } from '../providers/reportei/reporteiConnector';
import {
  buildArtDirectionFeedbackMetadata,
  getPrimaryArtDirectionReferenceId,
  recordArtDirectionFeedbackEvent,
  resolveArtDirectionCreativeContext,
} from './ai/artDirectionMemoryService';

// ── Normalize platform name to Reportei Connect platform key ──────────────────
const PLATFORM_MAP: Record<string, string> = {
  instagram: 'Instagram',
  ig: 'Instagram',
  linkedin: 'LinkedIn',
  metaads: 'MetaAds',
  meta: 'MetaAds',
  facebookads: 'MetaAds',
};

function normalizePlatform(channel: string): string {
  const key = channel.toLowerCase().replace(/[^a-z]/g, '');
  return PLATFORM_MAP[key] ?? channel;
}

// ── Extract a numeric value from Reportei metric response ────────────────────
function pickValue(item: any): number | null {
  const v = item?.data?.value ?? item?.value ?? null;
  if (v == null || isNaN(Number(v))) return null;
  return Number(v);
}

// ── Map reference_key suffix to field name ────────────────────────────────────
function refKeyToField(refKey: string): string | null {
  const suffix = refKey.includes(':') ? refKey.split(':')[1] : refKey;
  const map: Record<string, string> = {
    impressions:           'impressions',
    reach:                 'reach',
    unique_impressions:    'reach',
    feed_engagement:       'engagement',
    engagement:            'engagement',
    feed_engagement_rate:  'engagement_rate',
    engagement_rate:       'engagement_rate',
    clicks:                'clicks',
    spend:                 'cost',
    ctr:                   'ctr',
    conversions:           'conversions',
    followers_count:       'followers',
    new_followers_count:   'new_followers',
  };
  return map[suffix] ?? null;
}

function hasDaSignal(metadata?: Record<string, any> | null) {
  return Boolean(
    metadata?.visual_intent ||
    metadata?.strategy_summary ||
    metadata?.reference_ids?.length ||
    metadata?.reference_urls?.length ||
    metadata?.concept_slugs?.length ||
    metadata?.trend_tags?.length
  );
}

function pickPerformanceMetric(fields: Record<string, number | null>) {
  if (fields.engagement_rate != null) {
    return { type: 'engagement_rate', value: Number(fields.engagement_rate) };
  }
  if (fields.ctr != null) {
    return { type: 'ctr', value: Number(fields.ctr) };
  }
  if (fields.engagement != null) {
    return { type: 'engagement', value: Number(fields.engagement) };
  }
  if (fields.impressions != null) {
    return { type: 'impressions', value: Number(fields.impressions) };
  }
  if (fields.reach != null) {
    return { type: 'reach', value: Number(fields.reach) };
  }
  return { type: null, value: null };
}

async function recordBriefingPerformanceFeedback(params: {
  briefingId: string;
  tenantId: string;
  clientId: string | null;
  platform: string;
  fields: Record<string, number | null>;
  matchSource: string;
}) {
  const creativeContext = await resolveArtDirectionCreativeContext({
    tenantId: params.tenantId,
    briefingId: params.briefingId,
    clientId: params.clientId,
  }).catch(() => null);
  if (!creativeContext) return;

  const performance = pickPerformanceMetric(params.fields);
  const metadata = buildArtDirectionFeedbackMetadata({
    context: creativeContext,
    metadata: {
      match_source: params.matchSource,
      metrics: params.fields,
    },
    source: 'briefing_post_metrics_sync',
    reviewActor: 'system',
    reviewStage: 'performance_sync',
    briefingId: params.briefingId,
    clientId: params.clientId,
    platform: params.platform,
    metricType: performance.type,
    metricValue: performance.value,
  });
  if (!hasDaSignal(metadata)) return;

  const { rows } = await query<{ metadata: any; created_at: string }>(
    `SELECT metadata, created_at
       FROM da_feedback_events
      WHERE tenant_id = $1
        AND event_type = 'performed'
        AND COALESCE(metadata->>'briefing_id', '') = $2
        AND COALESCE(metadata->>'platform', '') = $3
      ORDER BY created_at DESC
      LIMIT 1`,
    [params.tenantId, params.briefingId, params.platform],
  );
  const latest = rows[0];
  if (latest?.metadata) {
    const lastMetricType = String(latest.metadata.metric_type || '');
    const lastMetricValue = latest.metadata.metric_value != null ? Number(latest.metadata.metric_value) : null;
    const sameMetric =
      lastMetricType === String(metadata.metric_type || '') &&
      lastMetricValue === (metadata.metric_value != null ? Number(metadata.metric_value) : null);
    const lastCreatedAt = latest.created_at ? new Date(latest.created_at).getTime() : 0;
    const hoursSinceLast = lastCreatedAt ? (Date.now() - lastCreatedAt) / (1000 * 60 * 60) : Infinity;
    if (sameMetric && hoursSinceLast < 12) return;
  }

  await recordArtDirectionFeedbackEvent({
    tenantId: params.tenantId,
    clientId: params.clientId,
    creativeSessionId: creativeContext.creativeSessionId,
    referenceId: getPrimaryArtDirectionReferenceId(metadata),
    eventType: 'performed',
    score: performance.value,
    notes: `briefing_metrics_${params.platform.toLowerCase()}`,
    metadata,
    createdBy: 'system:briefing_post_metrics',
  });
}

// ── Public: sync aggregated metrics for a single briefing ────────────────────
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

  const dueAt: Date = briefing.due_at ? new Date(briefing.due_at) : new Date();

  // Use ±7 day window around due date
  const sinceDate = new Date(dueAt);
  sinceDate.setDate(sinceDate.getDate() - 7);
  const untilDate = new Date(dueAt);
  untilDate.setDate(untilDate.getDate() + 7);
  const start = sinceDate.toISOString().slice(0, 10);
  const end   = untilDate.toISOString().slice(0, 10);

  const payload = briefing.payload ?? {};

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

  const token = connector?.token || process.env.REPORTEI_TOKEN || '';
  if (!token) {
    return { synced: 0, platforms: [], errors: ['reportei_not_configured'] };
  }

  const integrationId = connector?.integrationId;
  if (!integrationId) {
    return { synced: 0, platforms: [], errors: ['reportei_integration_id_not_configured'] };
  }

  const client = new ReporteiClient();
  const overrides = {
    baseUrl: connector?.baseUrl,
    token,
  };

  const synced: string[] = [];
  const errors: string[] = [];

  for (const rawChannel of channels.length > 0 ? channels : ['Instagram']) {
    const platform = normalizePlatform(rawChannel);
    try {
      const metricDefs = PLATFORM_METRICS[platform] ?? INSTAGRAM_METRICS;
      const raw = await client.getMetricsData(
        { integration_id: Number(integrationId), start, end, metrics: metricDefs },
        overrides
      );

      const metricsArray: any[] = Array.isArray(raw) ? raw : (raw?.data ?? raw?.metrics ?? []);
      if (!metricsArray.length) continue;

      // Build field map from response
      const fields: Record<string, number | null> = {};
      for (const item of metricsArray) {
        const refKey: string = item.reference_key ?? item.id ?? '';
        const field = refKeyToField(refKey);
        if (field) fields[field] = pickValue(item);
      }

      await query(
        `INSERT INTO briefing_post_metrics
           (briefing_id, tenant_id, client_id, platform, published_at,
            reach, impressions, engagement, engagement_rate,
            raw, synced_at, match_source)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,NOW(),$11)
         ON CONFLICT (briefing_id, platform) DO UPDATE SET
           published_at=EXCLUDED.published_at,
           reach=EXCLUDED.reach, impressions=EXCLUDED.impressions,
           engagement=EXCLUDED.engagement, engagement_rate=EXCLUDED.engagement_rate,
           raw=EXCLUDED.raw, synced_at=NOW(), match_source=EXCLUDED.match_source`,
        [
          briefingId, effectiveTenantId, mainClientId, platform, dueAt.toISOString().slice(0, 10),
          fields.reach ?? null,
          fields.impressions ?? null,
          fields.engagement ?? null,
          fields.engagement_rate ?? null,
          JSON.stringify({ source: 'reportei_connect', start, end, raw }),
          'auto_aggregated',
        ]
      );
      await recordBriefingPerformanceFeedback({
        briefingId,
        tenantId: effectiveTenantId,
        clientId: mainClientId,
        platform,
        fields,
        matchSource: 'auto_aggregated',
      }).catch(() => {});
      synced.push(platform);
    } catch (err: any) {
      errors.push(`${platform}: ${err?.message ?? 'unknown'}`);
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
