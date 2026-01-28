import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { authGuard, requirePerm } from '../auth/rbac';
import { requireClientPerm } from '../auth/clientPerms';
import { tenantGuard } from '../auth/tenantGuard';
import { pool } from '../db';

type CatalogFormat = {
  production_type: string;
  platform: string;
  format_name: string;
  measurability_score?: number;
  production_cost?: {
    production_cost_brl?: { min?: number; max?: number };
    media_cost_brl?: { min?: number; max?: number };
    roi_potential?: string;
  };
  production_effort?: {
    complexity?: number;
    estimated_hours?: number;
    skill_level?: string;
  };
  potential_reach?: {
    organic_reach?: string;
    paid_reach?: string;
  };
  engagement_rate?: {
    engagement_benchmark?: string;
  };
  market_trend?: {
    market_trend?: string;
  };
  reusability?: {
    reusability_score?: number;
  };
  format_compatibility?: {
    synergy_score?: number;
  };
  shelf_life?: {
    evergreen_potential?: string;
  };
  predictive_metrics?: {
    expected_roi_multiplier?: number;
    success_probability?: number;
    confidence_level?: string;
    time_to_results?: string;
  };
  ml_performance_score?: {
    overall_score?: number;
    score_weights?: Record<string, number>;
  };
};

let cachedCatalog: CatalogFormat[] | null = null;

function loadCatalog(): CatalogFormat[] {
  if (cachedCatalog) return cachedCatalog;
  const catalogPath = path.resolve(__dirname, '../data/productionCatalog.json');
  const raw = fs.readFileSync(catalogPath, 'utf-8');
  cachedCatalog = JSON.parse(raw) as CatalogFormat[];
  return cachedCatalog;
}

function normalizeProductionType(value?: string | null) {
  if (!value) return '';
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'eventos') return 'eventos-ativacoes';
  if (trimmed === 'eventos_ativacoes') return 'eventos-ativacoes';
  return trimmed;
}

function normalizeText(value?: string | null) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function findCatalogFormat(params: { format_name: string; platform?: string; production_type?: string }) {
  const catalog = loadCatalog();
  const name = params.format_name;
  const platformKey = params.platform ? normalizeText(params.platform) : '';
  const productionType = normalizeProductionType(params.production_type || '');
  return (
    catalog.find((item) => {
      const sameName = item.format_name === name;
      if (!sameName) return false;
      if (platformKey && normalizeText(item.platform) !== platformKey) return false;
      if (productionType && normalizeProductionType(item.production_type) !== productionType) return false;
      return true;
    }) || null
  );
}

function computeCostEfficiency(costMin: number, costMax: number) {
  const avg = Number.isFinite(costMin) && Number.isFinite(costMax) ? (costMin + costMax) / 2 : 0;
  const raw = 100 - avg / 500;
  return Math.max(0, Math.min(100, raw));
}

async function logSnapshotReads(params: {
  ids: string[];
  userId?: string;
  userEmail?: string;
  userAgent?: string;
  requestId?: string;
}) {
  if (!params.ids.length) return;
  const userId = params.userId ?? '';
  const userEmail = params.userEmail ?? '';
  const userAgent = params.userAgent ?? '';
  const requestId = params.requestId ?? '';
  const username = userEmail;

  await pool.query(
    `WITH settings AS (
        SELECT
          set_config('app.current_user_id', $1, true),
          set_config('app.current_username', $2, true),
          set_config('app.current_user_email', $3, true),
          set_config('app.user_agent', $4, true),
          set_config('app.request_id', $5, true),
          set_config('app.access_method', 'API_ENDPOINT', true)
      )
      SELECT log_catalog_snapshot_read(id, 'SELECT')
      FROM UNNEST($6::uuid[]) AS ids(id);`,
    [userId, username, userEmail, userAgent, requestId, params.ids]
  );
}

export default async function campaignRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.get('/campaigns', { preHandler: [requirePerm('clients:read')] }, async (request: any) => {
    const tenantId = (request.user as any).tenant_id as string;
    const clientId = request.query?.client_id as string | undefined;
    const status = request.query?.status as string | undefined;
    const params: any[] = [tenantId];
    let where = 'WHERE tenant_id=$1';
    if (clientId) {
      params.push(clientId);
      where += ` AND client_id=$${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND status=$${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT * FROM campaigns ${where} ORDER BY created_at DESC LIMIT 200`,
      params
    );
    return { success: true, data: rows };
  });

  app.get('/campaigns/:id', { preHandler: [requirePerm('clients:read')] }, async (request: any, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const campaignId = request.params?.id as string;
    const { rows: campaigns } = await pool.query(
      `SELECT * FROM campaigns WHERE tenant_id=$1 AND id=$2`,
      [tenantId, campaignId]
    );
    if (!campaigns[0]) {
      return reply.status(404).send({ error: 'campaign_not_found' });
    }
    const { rows: formats } = await pool.query(
      `SELECT * FROM campaign_formats WHERE tenant_id=$1 AND campaign_id=$2 ORDER BY created_at ASC`,
      [tenantId, campaignId]
    );
    if (formats.length) {
      const user = request.user as any;
      const userAgentHeader = request.headers?.['user-agent'];
      const userAgent = Array.isArray(userAgentHeader)
        ? userAgentHeader.join(' ')
        : userAgentHeader || '';
      const requestId =
        (request.id as string | undefined) ||
        (request.headers?.['x-request-id'] as string | undefined) ||
        '';
      try {
        await logSnapshotReads({
          ids: formats.map((format: any) => format.id),
          userId: user?.sub,
          userEmail: user?.email,
          userAgent,
          requestId,
        });
      } catch (error) {
        request.log?.warn?.({ err: error }, 'snapshot_read_log_failed');
      }
    }
    return { success: true, data: { campaign: campaigns[0], formats } };
  });

  app.get(
    '/campaign-formats/:id',
    { preHandler: [requirePerm('clients:read')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const formatId = request.params?.id as string;
      const { rows } = await pool.query(
        `SELECT * FROM campaign_formats WHERE tenant_id=$1 AND id=$2`,
        [tenantId, formatId]
      );
      if (!rows[0]) {
        return reply.status(404).send({ error: 'campaign_format_not_found' });
      }
      const format = rows[0];
      const user = request.user as any;
      const userAgentHeader = request.headers?.['user-agent'];
      const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader.join(' ') : userAgentHeader || '';
      const requestId =
        (request.id as string | undefined) ||
        (request.headers?.['x-request-id'] as string | undefined) ||
        '';
      try {
        await logSnapshotReads({
          ids: [format.id],
          userId: user?.sub,
          userEmail: user?.email,
          userAgent,
          requestId,
        });
      } catch (error) {
        request.log?.warn?.({ err: error }, 'snapshot_read_log_failed');
      }
      return { success: true, data: format };
    }
  );

  app.post(
    '/campaigns',
    { preHandler: [requirePerm('clients:write'), requireClientPerm('write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const userId = (request.user as any).sub as string | undefined;

      const bodySchema = z.object({
        client_id: z.string(),
        name: z.string().min(2),
        objective: z.string().min(2),
        budget_brl: z.number().optional().nullable(),
        start_date: z.string(),
        end_date: z.string().optional().nullable(),
        status: z.string().optional(),
        catalog_version: z.string().optional(),
        formats: z
          .array(
            z.object({
              format_name: z.string(),
              platform: z.string().optional(),
              production_type: z.string().optional(),
            })
          )
          .min(1),
      });

      const body = bodySchema.parse(request.body);
      const catalogVersion = body.catalog_version || 'v4.0';

      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const { rows: campaigns } = await client.query(
          `INSERT INTO campaigns
            (tenant_id, client_id, name, objective, budget_brl, start_date, end_date, status, created_by, updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
           RETURNING *`,
          [
            tenantId,
            body.client_id,
            body.name,
            body.objective,
            body.budget_brl ?? null,
            body.start_date,
            body.end_date ?? null,
            body.status || 'active',
            userId ?? null,
          ]
        );
        const campaign = campaigns[0];

        const formatRows = [];
        for (const format of body.formats) {
          const catalogFormat = findCatalogFormat({
            format_name: format.format_name,
            platform: format.platform,
            production_type: format.production_type,
          });
          if (!catalogFormat) {
            throw new Error(`Formato nao encontrado no catalogo: ${format.format_name}`);
          }

          const costMin = Number(catalogFormat.production_cost?.production_cost_brl?.min ?? 0);
          const costMax = Number(catalogFormat.production_cost?.production_cost_brl?.max ?? costMin);
          const roiPotential = catalogFormat.production_cost?.roi_potential || 'medio';
          const costEfficiency = computeCostEfficiency(costMin, costMax);

          const predictedMlScore = Number(
            catalogFormat.ml_performance_score?.overall_score ??
              catalogFormat.measurability_score ??
              0
          );
          const predictedMlWeights = catalogFormat.ml_performance_score?.score_weights ?? {};

          const predictedMeasurability = Number(catalogFormat.measurability_score ?? 0);
          const predictedRoiMultiplier = Number(
            catalogFormat.predictive_metrics?.expected_roi_multiplier ?? 1
          );
          const predictedEngagement = catalogFormat.engagement_rate?.engagement_benchmark || 'medium';
          const predictedReachOrganic = catalogFormat.potential_reach?.organic_reach || 'medium';
          const predictedReachPaid = catalogFormat.potential_reach?.paid_reach || 'medium';
          const predictedMarketTrend = catalogFormat.market_trend?.market_trend || 'stable';
          const predictedReusability = Number(catalogFormat.reusability?.reusability_score ?? 3);
          const predictedSynergy = Number(catalogFormat.format_compatibility?.synergy_score ?? 3);
          const predictedEvergreen = catalogFormat.shelf_life?.evergreen_potential || 'medium';
          const predictedSuccess = Number(catalogFormat.predictive_metrics?.success_probability ?? 50);
          const predictedConfidence = catalogFormat.predictive_metrics?.confidence_level || 'medium';
          const predictedTimeToResults = catalogFormat.predictive_metrics?.time_to_results || 'n/a';

          const estimatedHours = Number(catalogFormat.production_effort?.estimated_hours ?? 0);
          const estimatedSkill = catalogFormat.production_effort?.skill_level || 'pleno';
          const mediaCostMin = catalogFormat.production_cost?.media_cost_brl?.min;
          const estimatedMediaCost = mediaCostMin != null ? Number(mediaCostMin) : null;

          const { rows: inserted } = await client.query(
            `INSERT INTO campaign_formats
              (tenant_id, client_id, campaign_id, format_name, platform, production_type,
               predicted_ml_score, predicted_ml_score_weights, predicted_measurability_score,
               predicted_roi_potential, predicted_roi_multiplier, predicted_engagement_benchmark,
               predicted_reach_organic, predicted_reach_paid, predicted_market_trend,
               predicted_reusability_score, predicted_synergy_score, predicted_evergreen_potential,
               predicted_cost_efficiency_score, predicted_success_probability, predicted_confidence_level,
               predicted_time_to_results, estimated_production_cost_min_brl, estimated_production_cost_max_brl,
               estimated_media_cost_brl, estimated_hours, estimated_skill_level, catalog_snapshot, catalog_version,
               created_by, updated_by)
             VALUES
              ($1,$2,$3,$4,$5,$6,
               $7,$8,$9,
               $10,$11,$12,
               $13,$14,$15,
               $16,$17,$18,
               $19,$20,$21,
               $22,$23,$24,
               $25,$26,$27,$28,$29,$30,$30)
             RETURNING *`,
            [
              tenantId,
              body.client_id,
              campaign.id,
              catalogFormat.format_name,
              catalogFormat.platform,
              catalogFormat.production_type,
              predictedMlScore,
              predictedMlWeights,
              predictedMeasurability,
              roiPotential,
              predictedRoiMultiplier,
              predictedEngagement,
              predictedReachOrganic,
              predictedReachPaid,
              predictedMarketTrend,
              predictedReusability,
              predictedSynergy,
              predictedEvergreen,
              costEfficiency,
              predictedSuccess,
              predictedConfidence,
              predictedTimeToResults,
              costMin,
              costMax,
              estimatedMediaCost,
              estimatedHours,
              estimatedSkill,
              catalogFormat,
              catalogVersion,
              userId ?? null,
            ]
          );
          formatRows.push(inserted[0]);
        }

        await client.query('COMMIT');
        return reply.send({ success: true, data: { campaign, formats: formatRows } });
      } catch (error: any) {
        await client.query('ROLLBACK');
        return reply.status(400).send({ error: error?.message || 'campaign_create_failed' });
      } finally {
        client.release();
      }
    }
  );

  app.patch('/campaign-formats/:id', { preHandler: [requirePerm('clients:write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const userId = (request.user as any).sub as string | undefined;
    const formatId = request.params?.id as string;

    const bodySchema = z.object({
      actual_production_cost_brl: z.number().optional().nullable(),
      actual_media_cost_brl: z.number().optional().nullable(),
      actual_hours_spent: z.number().optional().nullable(),
      produced_at: z.string().optional().nullable(),
      launched_at: z.string().optional().nullable(),
    });
    const body = bodySchema.parse(request.body);

    const { rows } = await pool.query(
      `UPDATE campaign_formats
       SET actual_production_cost_brl=$1,
           actual_media_cost_brl=$2,
           actual_hours_spent=$3,
           produced_at=$4,
           launched_at=$5,
           updated_by=$6
       WHERE tenant_id=$7 AND id=$8
       RETURNING *`,
      [
        body.actual_production_cost_brl ?? null,
        body.actual_media_cost_brl ?? null,
        body.actual_hours_spent ?? null,
        body.produced_at ?? null,
        body.launched_at ?? null,
        userId ?? null,
        tenantId,
        formatId,
      ]
    );
    if (!rows[0]) {
      return reply.status(404).send({ error: 'campaign_format_not_found' });
    }
    return { success: true, data: rows[0] };
  });

  app.post(
    '/campaign-formats/:id/lock',
    { preHandler: [requirePerm('clients:write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const userId = (request.user as any).sub as string | undefined;
      const formatId = request.params?.id as string;
      const { rows } = await pool.query(
        `SELECT lock_campaign_format($1, $2) AS locked`,
        [formatId, userId ?? null]
      );
      if (!rows[0]) {
        return reply.status(404).send({ error: 'campaign_format_not_found' });
      }
      return { success: true, data: rows[0] };
    }
  );

  app.post(
    '/campaign-formats/:id/metrics',
    { preHandler: [requirePerm('clients:write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const formatId = request.params?.id as string;
      const bodySchema = z.object({
        measurement_date: z.string(),
        measurement_period: z.string().optional(),
        impressions: z.number().optional(),
        reach: z.number().optional(),
        frequency: z.number().optional(),
        clicks: z.number().optional(),
        likes: z.number().optional(),
        comments: z.number().optional(),
        shares: z.number().optional(),
        saves: z.number().optional(),
        engagement_rate: z.number().optional(),
        video_views: z.number().optional(),
        video_completion_rate: z.number().optional(),
        avg_watch_time_seconds: z.number().optional(),
        conversions: z.number().optional(),
        conversion_rate: z.number().optional(),
        revenue_brl: z.number().optional(),
        spend_brl: z.number().optional(),
        cpm: z.number().optional(),
        cpc: z.number().optional(),
        cpa: z.number().optional(),
        roas: z.number().optional(),
        data_source: z.string().optional(),
        is_verified: z.boolean().optional(),
      });
      const body = bodySchema.parse(request.body);

      const { rows: fmtRows } = await pool.query(
        `SELECT tenant_id, client_id FROM campaign_formats WHERE id=$1 AND tenant_id=$2`,
        [formatId, tenantId]
      );
      if (!fmtRows[0]) {
        return reply.status(404).send({ error: 'campaign_format_not_found' });
      }
      const clientId = fmtRows[0].client_id as string;

      const { rows } = await pool.query(
        `INSERT INTO format_performance_metrics
          (tenant_id, client_id, campaign_format_id, measurement_date, measurement_period,
           impressions, reach, frequency, clicks, likes, comments, shares, saves, engagement_rate,
           video_views, video_completion_rate, avg_watch_time_seconds, conversions, conversion_rate,
           revenue_brl, spend_brl, cpm, cpc, cpa, roas, data_source, is_verified)
         VALUES
          ($1,$2,$3,$4,$5,
           $6,$7,$8,$9,$10,$11,$12,$13,$14,
           $15,$16,$17,$18,$19,
           $20,$21,$22,$23,$24,$25,$26,$27)
         RETURNING *`,
        [
          tenantId,
          clientId,
          formatId,
          body.measurement_date,
          body.measurement_period || 'daily',
          body.impressions ?? 0,
          body.reach ?? 0,
          body.frequency ?? null,
          body.clicks ?? 0,
          body.likes ?? 0,
          body.comments ?? 0,
          body.shares ?? 0,
          body.saves ?? 0,
          body.engagement_rate ?? null,
          body.video_views ?? 0,
          body.video_completion_rate ?? null,
          body.avg_watch_time_seconds ?? null,
          body.conversions ?? 0,
          body.conversion_rate ?? null,
          body.revenue_brl ?? null,
          body.spend_brl ?? null,
          body.cpm ?? null,
          body.cpc ?? null,
          body.cpa ?? null,
          body.roas ?? null,
          body.data_source ?? null,
          body.is_verified ?? false,
        ]
      );
      return { success: true, data: rows[0] };
    }
  );

  app.post(
    '/campaign-formats/:id/summary/recalc',
    { preHandler: [requirePerm('clients:write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const formatId = request.params?.id as string;
      const { rows: formats } = await pool.query(
        `SELECT * FROM campaign_formats WHERE tenant_id=$1 AND id=$2`,
        [tenantId, formatId]
      );
      if (!formats[0]) {
        return reply.status(404).send({ error: 'campaign_format_not_found' });
      }
      const format = formats[0];

      const { rows: metrics } = await pool.query(
        `SELECT *
         FROM format_performance_metrics
         WHERE tenant_id=$1 AND campaign_format_id=$2`,
        [tenantId, formatId]
      );
      if (!metrics.length) {
        return reply.status(400).send({ error: 'no_metrics' });
      }

      const startDate = metrics.reduce(
        (acc: string, row: any) => (!acc || row.measurement_date < acc ? row.measurement_date : acc),
        metrics[0].measurement_date
      );
      const endDate = metrics.reduce(
        (acc: string, row: any) => (row.measurement_date > acc ? row.measurement_date : acc),
        metrics[0].measurement_date
      );
      const daysActive =
        Math.max(
          1,
          Math.ceil(
            (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24) + 1
          )
        ) || null;

      const totals = metrics.reduce(
        (acc: any, row: any) => {
          acc.impressions += Number(row.impressions || 0);
          acc.reach += Number(row.reach || 0);
          acc.clicks += Number(row.clicks || 0);
          acc.likes += Number(row.likes || 0);
          acc.comments += Number(row.comments || 0);
          acc.shares += Number(row.shares || 0);
          acc.saves += Number(row.saves || 0);
          acc.conversions += Number(row.conversions || 0);
          acc.revenue += Number(row.revenue_brl || 0);
          acc.spend += Number(row.spend_brl || 0);
          return acc;
        },
        {
          impressions: 0,
          reach: 0,
          clicks: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          saves: 0,
          conversions: 0,
          revenue: 0,
          spend: 0,
        }
      );

      const totalEngagements = totals.likes + totals.comments + totals.shares + totals.saves + totals.clicks;
      const avgEngagementRate =
        totals.impressions > 0 ? (totalEngagements / totals.impressions) * 100 : null;
      const avgCtr = totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : null;
      const actualRoi = totals.spend > 0 ? totals.revenue / totals.spend : null;
      const actualRoas = actualRoi;
      const predictedRoi = Number(format.predicted_roi_multiplier ?? 0);
      const scoreAccuracy =
        actualRoi != null && predictedRoi
          ? Math.max(0, 100 - (Math.abs(actualRoi - predictedRoi) / Math.max(actualRoi, predictedRoi, 1)) * 100)
          : null;

      const { rows } = await pool.query(
        `INSERT INTO format_performance_summary
          (tenant_id, client_id, campaign_format_id, start_date, end_date, days_active,
           total_impressions, total_reach, total_clicks, total_engagements, total_conversions,
           total_revenue_brl, total_spend_brl, avg_engagement_rate, avg_ctr, actual_roi_multiplier,
           actual_roas, predicted_ml_score, predicted_roi_multiplier, score_accuracy, is_finalized, finalized_at)
         VALUES
          ($1,$2,$3,$4,$5,$6,
           $7,$8,$9,$10,$11,
           $12,$13,$14,$15,$16,
           $17,$18,$19,$20,$21,$22)
         ON CONFLICT (campaign_format_id) DO UPDATE SET
           start_date=EXCLUDED.start_date,
           end_date=EXCLUDED.end_date,
           days_active=EXCLUDED.days_active,
           total_impressions=EXCLUDED.total_impressions,
           total_reach=EXCLUDED.total_reach,
           total_clicks=EXCLUDED.total_clicks,
           total_engagements=EXCLUDED.total_engagements,
           total_conversions=EXCLUDED.total_conversions,
           total_revenue_brl=EXCLUDED.total_revenue_brl,
           total_spend_brl=EXCLUDED.total_spend_brl,
           avg_engagement_rate=EXCLUDED.avg_engagement_rate,
           avg_ctr=EXCLUDED.avg_ctr,
           actual_roi_multiplier=EXCLUDED.actual_roi_multiplier,
           actual_roas=EXCLUDED.actual_roas,
           predicted_ml_score=EXCLUDED.predicted_ml_score,
           predicted_roi_multiplier=EXCLUDED.predicted_roi_multiplier,
           score_accuracy=EXCLUDED.score_accuracy,
           is_finalized=EXCLUDED.is_finalized,
           finalized_at=EXCLUDED.finalized_at,
           updated_at=NOW()
         RETURNING *`,
        [
          tenantId,
          format.client_id,
          formatId,
          startDate,
          endDate,
          daysActive,
          totals.impressions,
          totals.reach,
          totals.clicks,
          totalEngagements,
          totals.conversions,
          totals.revenue,
          totals.spend,
          avgEngagementRate,
          avgCtr,
          actualRoi,
          actualRoas,
          format.predicted_ml_score,
          format.predicted_roi_multiplier,
          scoreAccuracy,
          true,
          new Date().toISOString(),
        ]
      );
      return { success: true, data: rows[0] };
    }
  );
}
