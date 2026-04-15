import type { FastifyReply, FastifyRequest } from 'fastify';
import { FastifyInstance } from 'fastify';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { authGuard, can, normalizeRole, requirePerm } from '../auth/rbac';
import { hasClientPerm, requireClientPerm } from '../auth/clientPerms';
import { tenantGuard } from '../auth/tenantGuard';
import { pool } from '../db';
import { generateCampaignStrategy } from '../services/ai/agentPlanner';
import { generateBehavioralDraft } from '../services/ai/agentWriter';
import { auditDraftContent } from '../services/ai/agentAuditor';
import { tagCopy } from '../services/ai/agentTagger';
import { loadBehaviorProfiles, recomputeClientBehaviorProfiles } from '../services/behaviorClusteringService';
import { loadLearningRules, recomputeClientLearningRules } from '../services/learningEngine';

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

type ClientScopePerm = 'read' | 'write';

async function ensureScopedClientAccess(params: {
  request: FastifyRequest;
  reply: FastifyReply;
  tenantId: string;
  clientId: string | null | undefined;
  perm: ClientScopePerm;
}) {
  const { request, reply, tenantId, clientId, perm } = params;
  const user = request.user as { sub?: string; role?: string } | undefined;
  if ((user?.role || '').toLowerCase() === 'admin') {
    return true;
  }
  if (!user?.sub) {
    reply.status(401).send({ error: 'missing_user' });
    return false;
  }
  if (!clientId) {
    return true;
  }

  const allowed = await hasClientPerm({
    tenantId,
    userId: user.sub,
    role: user.role,
    clientId,
    perm,
  });
  if (!allowed) {
    reply.status(403).send({ error: 'client_forbidden', perm, client_id: clientId });
    return false;
  }
  return true;
}

async function resolveClientIdByCampaign(tenantId: string, campaignId: string) {
  const { rows } = await pool.query<{ client_id: string | null }>(
    `SELECT client_id FROM campaigns WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [campaignId, tenantId]
  );
  return rows[0]?.client_id ?? null;
}

async function resolveClientIdByCampaignFormat(tenantId: string, formatId: string) {
  const { rows } = await pool.query<{ client_id: string | null }>(
    `SELECT client_id FROM campaign_formats WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [formatId, tenantId]
  );
  return rows[0]?.client_id ?? null;
}

async function resolveClientIdByCreativeConcept(tenantId: string, conceptId: string) {
  const { rows } = await pool.query<{ client_id: string | null }>(
    `SELECT c.client_id
       FROM creative_concepts cc
       JOIN campaigns c ON c.id = cc.campaign_id
      WHERE cc.id=$1 AND cc.tenant_id=$2 AND c.tenant_id=$2
      LIMIT 1`,
    [conceptId, tenantId]
  );
  return rows[0]?.client_id ?? null;
}

async function resolveClientIdByBehavioralCopy(tenantId: string, copyId: string) {
  const { rows } = await pool.query<{ client_id: string | null }>(
    `SELECT c.client_id
       FROM campaign_behavioral_copies cb
       JOIN campaigns c ON c.id = cb.campaign_id
      WHERE cb.id=$1 AND cb.tenant_id=$2 AND c.tenant_id=$2
      LIMIT 1`,
    [copyId, tenantId]
  );
  return rows[0]?.client_id ?? null;
}

function requireCampaignListAccess() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    const user = request.user as { role?: string } | undefined;
    const clientId = (request.query as any)?.client_id as string | undefined;
    if (!tenantId) {
      return reply.status(401).send({ error: 'missing_tenant' });
    }
    if (!clientId) {
      const role = normalizeRole(user?.role);
      if (!can(role, 'portfolio:read')) {
        return reply.status(403).send({ error: 'Sem permissao.', perm: 'portfolio:read' });
      }
      return;
    }

    const allowed = await ensureScopedClientAccess({
      request,
      reply,
      tenantId,
      clientId,
      perm: 'read',
    });
    if (!allowed) return;
  };
}

function requireCampaignPerm(perm: ClientScopePerm) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    const campaignId = (request.params as any)?.id as string | undefined;
    if (!tenantId || !campaignId) {
      return reply.status(400).send({ error: 'missing_campaign_id' });
    }
    const clientId = await resolveClientIdByCampaign(tenantId, campaignId);
    if (clientId === null) {
      return reply.status(404).send({ error: 'campaign_not_found' });
    }
    const allowed = await ensureScopedClientAccess({ request, reply, tenantId, clientId, perm });
    if (!allowed) return;
  };
}

function requireCampaignFormatPerm(perm: ClientScopePerm) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    const formatId = (request.params as any)?.id as string | undefined;
    if (!tenantId || !formatId) {
      return reply.status(400).send({ error: 'missing_campaign_format_id' });
    }
    const clientId = await resolveClientIdByCampaignFormat(tenantId, formatId);
    if (clientId === null) {
      return reply.status(404).send({ error: 'campaign_format_not_found' });
    }
    const allowed = await ensureScopedClientAccess({ request, reply, tenantId, clientId, perm });
    if (!allowed) return;
  };
}

function requireCreativeConceptPerm(perm: ClientScopePerm) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    const conceptId = (request.params as any)?.id as string | undefined;
    if (!tenantId || !conceptId) {
      return reply.status(400).send({ error: 'missing_concept_id' });
    }
    const clientId = await resolveClientIdByCreativeConcept(tenantId, conceptId);
    if (clientId === null) {
      return reply.status(404).send({ error: 'concept_not_found' });
    }
    const allowed = await ensureScopedClientAccess({ request, reply, tenantId, clientId, perm });
    if (!allowed) return;
  };
}

function requireBehavioralCopyPerm(perm: ClientScopePerm) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request.user as any)?.tenant_id as string | undefined;
    const copyId = (request.params as any)?.copyId as string | undefined;
    if (!tenantId || !copyId) {
      return reply.status(400).send({ error: 'missing_behavioral_copy_id' });
    }
    const clientId = await resolveClientIdByBehavioralCopy(tenantId, copyId);
    if (clientId === null) {
      return reply.status(404).send({ error: 'behavioral_copy_not_found' });
    }
    const allowed = await ensureScopedClientAccess({ request, reply, tenantId, clientId, perm });
    if (!allowed) return;
  };
}

export default async function campaignRoutes(app: FastifyInstance) {
  app.addHook('preHandler', authGuard);
  app.addHook('preHandler', tenantGuard());

  app.get('/campaigns', { preHandler: [requirePerm('clients:read'), requireCampaignListAccess()] }, async (request: any) => {
    const tenantId = (request.user as any).tenant_id as string;
    const clientId = request.query?.client_id as string | undefined;
    const status = request.query?.status as string | undefined;
    const params: any[] = [tenantId];
    let where = 'WHERE c.tenant_id=$1';
    if (clientId) {
      params.push(clientId);
      where += ` AND c.client_id=$${params.length}`;
    }
    if (status) {
      params.push(status);
      where += ` AND c.status=$${params.length}`;
    }
    const { rows } = await pool.query(
      `SELECT c.*,
         cl.name as client_name,
         cl.profile->>'logo_url' as client_logo_url,
         cl.profile->'brand_colors'->>0 as client_brand_color,
         (SELECT COUNT(*)::int FROM project_cards pc WHERE pc.campaign_id = c.id AND pc.is_archived = false) as job_count,
         (SELECT COUNT(*)::int FROM project_cards pc
            JOIN trello_list_status_map m ON m.list_id = pc.list_id AND m.tenant_id = c.tenant_id
          WHERE pc.campaign_id = c.id AND pc.is_archived = false
            AND m.ops_status IN ('done', 'published')) as job_done_count
       FROM campaigns c
       LEFT JOIN clients cl ON cl.id::text = c.client_id
       ${where} ORDER BY c.created_at DESC LIMIT 200`,
      params
    );
    return { success: true, data: rows };
  });

  app.get('/campaigns/:id', { preHandler: [requirePerm('clients:read'), requireCampaignPerm('read')] }, async (request: any, reply) => {
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
    // Briefings vinculados a esta campanha
    const { rows: briefings } = await pool.query(
      `SELECT id, title, status, campaign_phase_id, behavior_intent_id, created_at
       FROM edro_briefings
       WHERE campaign_id = $1
       ORDER BY created_at DESC`,
      [campaignId]
    );

    // Conceitos criativos desta campanha
    const { rows: concepts } = await pool.query(
      `SELECT * FROM creative_concepts
       WHERE campaign_id = $1 AND tenant_id = $2
       ORDER BY created_at ASC`,
      [campaignId, tenantId]
    );

    return { success: true, data: { campaign: campaigns[0], formats, briefings, concepts } };
  });

  app.get(
    '/campaign-formats/:id',
    { preHandler: [requirePerm('clients:read'), requireCampaignFormatPerm('read')] },
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
        phases: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              order: z.number(),
              objective: z.string().optional(),
            })
          )
          .optional(),
        audiences: z.array(z.record(z.any())).optional(),
        behavior_intents: z.array(z.record(z.any())).optional(),
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
            (tenant_id, client_id, name, objective, budget_brl, start_date, end_date, status, created_by, updated_by,
             phases, audiences, behavior_intents)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,$12)
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
            JSON.stringify(body.phases ?? []),
            JSON.stringify(body.audiences ?? []),
            JSON.stringify(body.behavior_intents ?? []),
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
            throw new Error(`Formato não encontrado no catálogo: ${format.format_name}`);
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

  app.patch('/campaigns/:id', { preHandler: [requirePerm('clients:write'), requireCampaignPerm('write')] }, async (request: any, reply) => {
    const tenantId = (request.user as any).tenant_id as string;
    const userId = (request.user as any).sub as string | undefined;
    const campaignId = request.params?.id as string;

    const bodySchema = z.object({
      name: z.string().min(2).optional(),
      objective: z.string().min(2).optional(),
      status: z.string().optional(),
      budget_brl: z.number().optional().nullable(),
      start_date: z.string().optional(),
      end_date: z.string().optional().nullable(),
      phases: z.array(z.record(z.any())).optional(),
      audiences: z.array(z.record(z.any())).optional(),
      behavior_intents: z.array(z.record(z.any())).optional(),
      labels: z.array(z.string()).optional(),
    });
    const body = bodySchema.parse(request.body);

    // Build dynamic SET clause — only update fields that are provided
    const sets: string[] = [];
    const params: any[] = [];

    const addField = (col: string, val: any) => {
      params.push(val);
      sets.push(`${col}=$${params.length}`);
    };

    if (body.name !== undefined) addField('name', body.name);
    if (body.objective !== undefined) addField('objective', body.objective);
    if (body.status !== undefined) addField('status', body.status);
    if (body.budget_brl !== undefined) addField('budget_brl', body.budget_brl);
    if (body.start_date !== undefined) addField('start_date', body.start_date);
    if (body.end_date !== undefined) addField('end_date', body.end_date);
    if (body.phases !== undefined) addField('phases', JSON.stringify(body.phases));
    if (body.audiences !== undefined) addField('audiences', JSON.stringify(body.audiences));
    if (body.behavior_intents !== undefined) addField('behavior_intents', JSON.stringify(body.behavior_intents));
    if (body.labels !== undefined) addField('labels', JSON.stringify(body.labels));

    if (!sets.length) {
      return reply.status(400).send({ error: 'no_fields_to_update' });
    }

    addField('updated_by', userId ?? null);
    sets.push(`updated_at=now()`);

    params.push(campaignId, tenantId);
    const { rows } = await pool.query(
      `UPDATE campaigns SET ${sets.join(', ')}
       WHERE id=$${params.length - 1} AND tenant_id=$${params.length}
       RETURNING *`,
      params
    );
    if (!rows[0]) {
      return reply.status(404).send({ error: 'campaign_not_found' });
    }
    return { success: true, data: rows[0] };
  });

  app.patch('/campaign-formats/:id', { preHandler: [requirePerm('clients:write'), requireCampaignFormatPerm('write')] }, async (request: any, reply) => {
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
    { preHandler: [requirePerm('clients:write'), requireCampaignFormatPerm('write')] },
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
    { preHandler: [requirePerm('clients:write'), requireCampaignFormatPerm('write')] },
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

      // Non-blocking: recompute learning rules + behavior profiles now that new performance data exists
      recomputeClientLearningRules(tenantId, clientId).catch(() => {});
      recomputeClientBehaviorProfiles(tenantId, clientId).catch(() => {});

      return { success: true, data: rows[0] };
    }
  );

  app.post(
    '/campaign-formats/:id/summary/recalc',
    { preHandler: [requirePerm('clients:write'), requireCampaignFormatPerm('write')] },
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

      // Non-blocking: recompute learning rules + behavior profiles with freshly summarized data
      recomputeClientLearningRules(tenantId, format.client_id as string).catch(() => {});
      recomputeClientBehaviorProfiles(tenantId, format.client_id as string).catch(() => {});

      return { success: true, data: rows[0] };
    }
  );

  // ── Creative Concepts (territórios criativos) ────────────────────────────

  app.post(
    '/campaigns/:id/creative-concepts',
    { preHandler: [requirePerm('clients:write'), requireCampaignPerm('write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const campaignId = request.params?.id as string;

      const bodySchema = z.object({
        phase_id: z.string().optional().nullable(),
        name: z.string().min(2),
        insight: z.string().optional().nullable(),
        triggers: z.array(z.string()).optional(),
        example_copy: z.string().optional().nullable(),
        hero_piece: z.string().optional().nullable(),
      });
      const body = bodySchema.parse(request.body);

      // Verify campaign belongs to tenant
      const { rows: cam } = await pool.query(
        `SELECT id FROM campaigns WHERE id=$1 AND tenant_id=$2`,
        [campaignId, tenantId]
      );
      if (!cam[0]) {
        return reply.status(404).send({ error: 'campaign_not_found' });
      }

      const { rows } = await pool.query(
        `INSERT INTO creative_concepts
          (tenant_id, campaign_id, phase_id, name, insight, triggers, example_copy, hero_piece)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          tenantId,
          campaignId,
          body.phase_id ?? null,
          body.name,
          body.insight ?? null,
          body.triggers ?? [],
          body.example_copy ?? null,
          body.hero_piece ?? null,
        ]
      );
      return reply.status(201).send({ success: true, data: rows[0] });
    }
  );

  app.patch(
    '/creative-concepts/:id',
    { preHandler: [requirePerm('clients:write'), requireCreativeConceptPerm('write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const conceptId = request.params?.id as string;

      const bodySchema = z.object({
        phase_id: z.string().optional().nullable(),
        name: z.string().min(2).optional(),
        insight: z.string().optional().nullable(),
        triggers: z.array(z.string()).optional(),
        example_copy: z.string().optional().nullable(),
        hero_piece: z.string().optional().nullable(),
        status: z.enum(['draft', 'approved', 'rejected']).optional(),
      });
      const body = bodySchema.parse(request.body);

      const sets: string[] = [];
      const params: any[] = [];

      const addField = (col: string, val: any) => {
        params.push(val);
        sets.push(`${col}=$${params.length}`);
      };

      if (body.phase_id !== undefined) addField('phase_id', body.phase_id);
      if (body.name !== undefined) addField('name', body.name);
      if (body.insight !== undefined) addField('insight', body.insight);
      if (body.triggers !== undefined) addField('triggers', body.triggers);
      if (body.example_copy !== undefined) addField('example_copy', body.example_copy);
      if (body.hero_piece !== undefined) addField('hero_piece', body.hero_piece);
      if (body.status !== undefined) addField('status', body.status);

      if (!sets.length) {
        return reply.status(400).send({ error: 'no_fields_to_update' });
      }
      sets.push(`updated_at=now()`);

      params.push(conceptId, tenantId);
      const { rows } = await pool.query(
        `UPDATE creative_concepts SET ${sets.join(', ')}
         WHERE id=$${params.length - 1} AND tenant_id=$${params.length}
         RETURNING *`,
        params
      );
      if (!rows[0]) {
        return reply.status(404).send({ error: 'concept_not_found' });
      }
      return { success: true, data: rows[0] };
    }
  );

  app.delete(
    '/creative-concepts/:id',
    { preHandler: [requirePerm('clients:write'), requireCreativeConceptPerm('write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const conceptId = request.params?.id as string;

      const { rows } = await pool.query(
        `DELETE FROM creative_concepts WHERE id=$1 AND tenant_id=$2 RETURNING id`,
        [conceptId, tenantId]
      );
      if (!rows[0]) {
        return reply.status(404).send({ error: 'concept_not_found' });
      }
      return { success: true };
    }
  );

  // ─── AgentPlanner: generate behavioral strategy for a campaign ────────────
  app.post(
    '/campaigns/:id/generate-strategy',
    { preHandler: [requirePerm('clients:write'), requireCampaignPerm('write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const campaignId = request.params?.id as string;

      // 1. Load campaign
      const { rows: campRows } = await pool.query(
        `SELECT id, name, objective, client_id
         FROM campaigns WHERE id=$1 AND tenant_id=$2`,
        [campaignId, tenantId]
      );
      const campaign = campRows[0];
      if (!campaign) {
        return reply.status(404).send({ error: 'campaign_not_found' });
      }

      // 2. Load client → segment + personas
      const { rows: clientRows } = await pool.query(
        `SELECT segment_primary, profile FROM clients WHERE id=$1 AND tenant_id=$2`,
        [campaign.client_id, tenantId]
      );
      const client = clientRows[0] ?? {};
      const personas: any[] = client?.profile?.personas ?? [];

      // 3. Load behavior profiles + learning rules (if any) to enrich planner context
      let behaviorClusters: any[] = [];
      let learningRules: any[] = [];
      try {
        [behaviorClusters, learningRules] = await Promise.all([
          loadBehaviorProfiles(tenantId, campaign.client_id),
          loadLearningRules(tenantId, campaign.client_id),
        ]);
      } catch { /* non-blocking */ }

      // 3b. Load live client intelligence (meetings + WhatsApp) for strategy context
      let clientIntelBlock = '';
      try {
        const [meetingActionsRes, whatsappRes, latestMeetingRes] = await Promise.all([
          pool.query(
            `SELECT ma.title, ma.description, ma.priority, ma.deadline, ma.type
               FROM meeting_actions ma
              WHERE ma.client_id=$1 AND ma.tenant_id=$2 AND ma.status='pending'
                AND ma.created_at > NOW() - INTERVAL '60 days'
              ORDER BY CASE ma.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, ma.created_at DESC
              LIMIT 6`,
            [campaign.client_id, tenantId]
          ),
          pool.query(
            `SELECT insight_type, summary, urgency
               FROM whatsapp_message_insights
              WHERE client_id=$1 AND tenant_id=$2 AND actioned=false
                AND created_at > NOW() - INTERVAL '30 days'
              ORDER BY CASE urgency WHEN 'urgent' THEN 0 ELSE 1 END, created_at DESC
              LIMIT 5`,
            [campaign.client_id, tenantId]
          ),
          pool.query(
            `SELECT title, summary,
                    analysis_payload->'intelligence'->>'account_pulse' AS account_pulse
               FROM meetings
              WHERE client_id=$1 AND tenant_id=$2
                AND status IN ('analyzed','approval_pending','approved','completed')
              ORDER BY recorded_at DESC LIMIT 1`,
            [campaign.client_id, tenantId]
          ),
        ]);
        const parts: string[] = [];
        const latestMtg = latestMeetingRes.rows[0];
        if (latestMtg) {
          parts.push(`Última reunião: "${latestMtg.title}"${latestMtg.account_pulse ? ` — pulso da conta: ${latestMtg.account_pulse}` : ''}`);
          if (latestMtg.summary) parts.push(`  Resumo: ${String(latestMtg.summary).slice(0, 300)}`);
        }
        if (meetingActionsRes.rows.length) {
          parts.push(`Ações pendentes de reuniões (${meetingActionsRes.rows.length}):`);
          for (const a of meetingActionsRes.rows) {
            const dl = a.deadline ? ` — prazo ${new Date(a.deadline).toLocaleDateString('pt-BR')}` : '';
            parts.push(`  - [${a.type}/${a.priority}] ${a.title}${dl}: ${String(a.description || '').slice(0, 150)}`);
          }
        }
        if (whatsappRes.rows.length) {
          parts.push('Sinais recentes do cliente via WhatsApp:');
          for (const i of whatsappRes.rows) {
            parts.push(`  - [${i.insight_type}${i.urgency === 'urgent' ? '/URGENTE' : ''}] ${i.summary}`);
          }
        }
        if (parts.length) clientIntelBlock = parts.join('\n');
      } catch { /* non-blocking — intel enrichment is best-effort */ }

      // 4. Call AgentPlanner
      const strategy = await generateCampaignStrategy({
        campaignName: campaign.name,
        campaignObjective: campaign.objective ?? '',
        clientSegment: client.segment_primary ?? '',
        personas,
        behaviorClusters: behaviorClusters.length ? behaviorClusters : undefined,
        learningRules: learningRules.length ? learningRules : undefined,
        clientIntelBlock: clientIntelBlock || undefined,
      });

      // 5. PATCH campaign with generated behavioral data
      await pool.query(
        `UPDATE campaigns
         SET phases=$3::jsonb, audiences=$4::jsonb, behavior_intents=$5::jsonb, updated_at=now()
         WHERE id=$1 AND tenant_id=$2`,
        [
          campaignId,
          tenantId,
          JSON.stringify(strategy.phases),
          JSON.stringify(strategy.audiences),
          JSON.stringify(strategy.behavior_intents),
        ]
      );

      // 6. INSERT concepts only if campaign has none yet
      const { rows: existingConcepts } = await pool.query(
        `SELECT id FROM creative_concepts WHERE campaign_id=$1 LIMIT 1`,
        [campaignId]
      );
      const insertedConcepts: any[] = [];
      if (existingConcepts.length === 0) {
        for (const c of strategy.concepts) {
          const { rows: [concept] } = await pool.query(
            `INSERT INTO creative_concepts
               (tenant_id, campaign_id, name, insight, triggers, example_copy, hero_piece)
             VALUES ($1,$2,$3,$4,$5::text[],$6,$7)
             RETURNING *`,
            [
              tenantId,
              campaignId,
              c.name,
              c.insight,
              c.triggers,
              c.example_copy,
              c.hero_piece,
            ]
          );
          insertedConcepts.push(concept);
        }
      }

      // Non-blocking: strategy defines new behavior_intents → refresh behavior profiles
      recomputeClientBehaviorProfiles(tenantId, campaign.client_id).catch(() => {});

      return reply.send({
        success: true,
        data: {
          phases: strategy.phases,
          audiences: strategy.audiences,
          behavior_intents: strategy.behavior_intents,
          concepts: insertedConcepts,
        },
      });
    }
  );

  // ── Link Instagram post to campaign format ──────────────────────────────
  app.post(
    '/campaign-formats/:id/link-post',
    { preHandler: [requirePerm('clients:write'), requireCampaignFormatPerm('write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const formatId = request.params?.id as string;

      const bodySchema = z.object({
        instagram_post_url: z.string().url().optional().nullable(),
      });
      const body = bodySchema.parse(request.body);

      // Verify format belongs to tenant
      const { rows: [fmt] } = await pool.query(
        `SELECT id FROM campaign_formats
         WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
        [formatId, tenantId]
      );
      if (!fmt) return reply.status(404).send({ error: 'format_not_found' });

      const { rows: [updated] } = await pool.query(
        `UPDATE campaign_formats
         SET instagram_post_url=$2, instagram_media_id=NULL, updated_at=now()
         WHERE id=$1 AND tenant_id=$3
         RETURNING id, instagram_post_url, instagram_media_id, last_metrics_synced_at`,
        [formatId, body.instagram_post_url ?? null, tenantId]
      );

      return reply.send({ success: true, data: updated });
    }
  );

  // ─── AgentWriter + AgentAuditor: generate behavioral copy for a specific intent ───
  app.post(
    '/campaigns/:id/behavioral-copy',
    { preHandler: [requirePerm('clients:write'), requireCampaignPerm('write')] },
    async (request: any, reply) => {
      const AMD_VARIANTS = ['salvar', 'compartilhar', 'clicar', 'responder', 'pedir_proposta'] as const;
      const tenantId = (request.user as any).tenant_id as string;
      const campaignId = request.params?.id as string;

      const bodySchema = z.object({
        behavior_intent_id: z.string(),
        platform: z.string(),
        format: z.string().optional(),
      });
      const body = bodySchema.parse(request.body);

      // 1. Load campaign + client
      const { rows: [campaign] } = await pool.query(
        `SELECT id, name, objective, client_id, behavior_intents, audiences, phases
         FROM campaigns WHERE id=$1 AND tenant_id=$2`,
        [campaignId, tenantId]
      );
      if (!campaign) return reply.status(404).send({ error: 'campaign_not_found' });

      const { rows: [client] } = await pool.query(
        `SELECT name, segment_primary, profile FROM clients WHERE id=$1 AND tenant_id=$2`,
        [campaign.client_id, tenantId]
      );
      const clientProfile = client?.profile || {};

      // 2. Find the specific behavior_intent
      const intents: any[] = campaign.behavior_intents || [];
      const intent = intents.find((bi: any) => bi.id === body.behavior_intent_id);
      if (!intent) return reply.status(404).send({ error: 'behavior_intent_not_found' });

      // 3. Find the matching audience/persona
      const audiences: any[] = campaign.audiences || [];
      const audience = audiences.find((a: any) => a.id === intent.audience_id);

      // 4. Find the phase name
      const phases: any[] = campaign.phases || [];
      const phase = phases.find((p: any) => p.id === intent.phase_id);

      // 5. Build persona context from audience + client profile
      const personas: any[] = clientProfile.personas || [];
      const matchingPersona = audience?.persona_id
        ? personas.find((p: any) => p.id === audience.persona_id)
        : null;

      const persona = {
        name: matchingPersona?.name || audience?.persona_name || 'Público principal',
        role: matchingPersona?.role,
        momento_consciencia: audience?.momento_consciencia || intent.momento,
        language_style: matchingPersona?.language_style || clientProfile.tone,
        forbidden_terms: matchingPersona?.forbidden_terms || clientProfile.forbidden_terms || [],
        preferred_evidence: matchingPersona?.preferred_evidence,
        pain_points: matchingPersona?.pain_points,
        objection_patterns: matchingPersona?.objection_patterns,
      };

      const behaviorIntent = {
        amd: intent.amd,
        momento: intent.momento,
        triggers: intent.triggers || [],
        target_behavior: intent.target_behavior,
        phase_id: intent.phase_id,
      };

      // 6. Load learning rules to enrich AgentWriter with historical patterns
      let learningRules: any[] = [];
      try {
        learningRules = await loadLearningRules(tenantId, campaign.client_id);
      } catch { /* non-blocking */ }

      const rulesBlock = learningRules.length
        ? `\n\nREGRAS DE APRENDIZADO (padrões validados por dados históricos desta audiência):\n${
            learningRules
              .slice(0, 6)
              .map((r: any) =>
                `  - ${r.effective_pattern} [uplift +${Number(r.uplift_value).toFixed(1)}% em ${r.uplift_metric}, confiança ${Math.round(Number(r.confidence_score) * 100)}%]`
              )
              .join('\n')
          }\nINSTRUCAO: A copy deve refletir os padrões de AMD e gatilhos com uplift comprovado para esta audiência.`
        : '';

      // 6b. Load live client intelligence (meetings + WhatsApp) for copy context
      let copyIntelBlock = '';
      try {
        const [actionsRes, whatsappRes] = await Promise.all([
          pool.query(
            `SELECT ma.title, ma.type, ma.priority, ma.deadline, ma.description
               FROM meeting_actions ma
              WHERE ma.client_id=$1 AND ma.tenant_id=$2 AND ma.status='pending'
                AND ma.created_at > NOW() - INTERVAL '60 days'
              ORDER BY CASE ma.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END, ma.created_at DESC
              LIMIT 5`,
            [campaign.client_id, tenantId]
          ),
          pool.query(
            `SELECT insight_type, summary, urgency
               FROM whatsapp_message_insights
              WHERE client_id=$1 AND tenant_id=$2 AND actioned=false
                AND created_at > NOW() - INTERVAL '30 days'
              ORDER BY CASE urgency WHEN 'urgent' THEN 0 ELSE 1 END, created_at DESC
              LIMIT 4`,
            [campaign.client_id, tenantId]
          ),
        ]);
        const parts: string[] = [];
        if (actionsRes.rows.length) {
          parts.push('AÇÕES PENDENTES DE REUNIÕES:');
          for (const a of actionsRes.rows) {
            const dl = a.deadline ? ` (prazo ${new Date(a.deadline).toLocaleDateString('pt-BR')})` : '';
            parts.push(`- [${a.type}] ${a.title}${dl}`);
          }
        }
        if (whatsappRes.rows.length) {
          parts.push('SINAIS DO CLIENTE VIA WHATSAPP:');
          for (const i of whatsappRes.rows) {
            parts.push(`- [${i.insight_type}${i.urgency === 'urgent' ? ' URGENTE' : ''}] ${i.summary}`);
          }
        }
        if (parts.length) copyIntelBlock = '\n\nCONTEXTO ATUAL DO CLIENTE:\n' + parts.join('\n');
      } catch { /* non-blocking */ }

      const writerInput = {
        platform: body.platform,
        format: body.format,
        persona,
        behaviorIntent,
        campaignObjective: campaign.objective,
        clientName: client?.name,
        clientSegment: client?.segment_primary,
        knowledgeBlock: ((clientProfile.knowledge_block || '') + rulesBlock + copyIntelBlock).trim() || undefined,
      };

      type BehavioralCandidate = {
        draft: Awaited<ReturnType<typeof generateBehavioralDraft>>;
        audit: Awaited<ReturnType<typeof auditDraftContent>>;
        amd: string;
      };
      const amdVariants = Array.from(
        new Set(
          [behaviorIntent.amd, ...AMD_VARIANTS]
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            .map((value) => value.trim())
        )
      );
      const behavioralCandidates: BehavioralCandidate[] = [];

      await Promise.allSettled(
        amdVariants.map(async (amdVariant) => {
          try {
            const variantBehaviorIntent = { ...behaviorIntent, amd: amdVariant };
            const variantDraft = await generateBehavioralDraft({
              ...writerInput,
              behaviorIntent: variantBehaviorIntent,
            });
            const variantAudit = await auditDraftContent({
              draft: variantDraft,
              persona,
              behaviorIntent: variantBehaviorIntent,
              clientName: client?.name,
              phaseName: phase?.name,
            });
            if (variantAudit.approval_status !== 'blocked') {
              behavioralCandidates.push({
                draft: variantDraft,
                audit: variantAudit,
                amd: amdVariant,
              });
            }
          } catch {
            // Alguns AMDs são incompatíveis com a plataforma/objetivo. Ignorar silenciosamente.
          }
        })
      );

      if (!behavioralCandidates.length) {
        const fallbackDraft = await generateBehavioralDraft(writerInput);
        const fallbackAudit = await auditDraftContent({
          draft: fallbackDraft,
          persona,
          behaviorIntent,
          clientName: client?.name,
          phaseName: phase?.name,
        });
        behavioralCandidates.push({
          draft: fallbackDraft,
          audit: fallbackAudit,
          amd: behaviorIntent.amd || 'default',
        });
      }

      let winningIndex = 0;
      let simulationMeta: Record<string, any> | null = null;

      try {
        const { runSimulation } = await import('../services/campaignSimulator/simulationReport');
        const simReport = await runSimulation({
          tenantId,
          clientId: campaign.client_id || undefined,
          platform: body.platform || undefined,
          variants: behavioralCandidates.map((candidate, index) => ({
            index,
            text: [candidate.draft.hook_text, candidate.draft.content_text, candidate.draft.cta_text].filter(Boolean).join('\n\n'),
            amd: candidate.amd || undefined,
            triggers:
              Array.isArray(candidate.audit.behavior_tags?.triggers) && candidate.audit.behavior_tags.triggers.length
                ? candidate.audit.behavior_tags.triggers
                : behaviorIntent.triggers || [],
            fogg_motivation: candidate.audit.fogg_score?.motivation,
            fogg_ability: candidate.audit.fogg_score?.ability,
            fogg_prompt: candidate.audit.fogg_score?.prompt,
          })),
        });
        winningIndex = simReport.winner_index ?? 0;
        const winningVariant = simReport.variants?.[winningIndex];
        simulationMeta = {
          simulation_id: simReport.id,
          winner_index: winningIndex,
          winner_resonance: simReport.winner_resonance ?? winningVariant?.aggregate_resonance ?? null,
          prediction_confidence_label: simReport.prediction_confidence_label ?? null,
          predicted_save_rate: winningVariant?.predicted_save_rate ?? null,
          predicted_click_rate: winningVariant?.predicted_click_rate ?? null,
          candidate_count: behavioralCandidates.length,
        };
      } catch (err: any) {
        console.warn('[behavioral-copy] Simulator fallback:', err?.message || err);
      }

      const winner = behavioralCandidates[winningIndex] ?? behavioralCandidates[0];
      const draft = winner.draft;
      const audit = winner.audit;

      // 9. AgentTagger — enriches with behavioral metadata (fire-and-forget tagging)
      let behavioralTags: any = null;
      try {
        behavioralTags = await tagCopy(audit.approved_text, body.platform);
      } catch { /* non-blocking */ }

      const behavioralTagsPayload = (() => {
        const base =
          behavioralTags && typeof behavioralTags === 'object' && !Array.isArray(behavioralTags)
            ? { ...behavioralTags }
            : behavioralTags
              ? { tagging_output: behavioralTags }
              : {};
        if (simulationMeta) {
          (base as Record<string, any>).simulation_meta = simulationMeta;
        }
        return Object.keys(base).length ? JSON.stringify(base) : null;
      })();

      // 10. Persist result to campaign_behavioral_copies for history + LearningEngine correlation
      let savedCopyId: string | null = null;
      try {
        const { rows: [savedCopy] } = await pool.query(
          `INSERT INTO campaign_behavioral_copies
             (tenant_id, campaign_id, behavior_intent_id, platform,
              hook_text, content_text, cta_text, media_type, behavioral_rationale, draft_tags,
              approval_status, approved_text, revision_notes,
              fogg_motivation, fogg_ability, fogg_prompt,
              emotional_tone, policy_flags, behavioral_tags)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
           RETURNING id`,
          [
            tenantId,
            campaignId,
            body.behavior_intent_id,
            body.platform,
            draft.hook_text,
            draft.content_text,
            draft.cta_text,
            draft.media_type,
            draft.behavioral_rationale,
            draft.tags ?? [],
            audit.approval_status,
            audit.approved_text,
            JSON.stringify(audit.revision_notes ?? []),
            audit.fogg_score?.motivation ?? null,
            audit.fogg_score?.ability ?? null,
            audit.fogg_score?.prompt ?? null,
            audit.behavior_tags?.emotional_tone ?? null,
            JSON.stringify(audit.policy_flags ?? []),
            behavioralTagsPayload,
          ]
        );
        savedCopyId = savedCopy?.id ?? null;
      } catch (err: any) {
        console.error('[behavioral-copy] Failed to persist result:', err?.message);
      }

      return reply.send({
        success: true,
        data: {
          id: savedCopyId,
          draft,
          audit,
          behavioral_tags: behavioralTags,
          simulation: simulationMeta,
          tested_variants: behavioralCandidates.length,
          winner_amd: winner.amd,
          behavior_intent: intent,
          persona_used: persona.name,
          phase: phase?.name,
        },
      });
    }
  );

  // ─── GET /campaigns/:id/behavioral-copies ─────────────────────────────────
  // Returns the generation history of behavioral copies for a campaign,
  // optionally filtered by behavior_intent_id.

  app.get(
    '/campaigns/:id/behavioral-copies',
    { preHandler: [requirePerm('clients:read'), requireCampaignPerm('read')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const campaignId = request.params?.id as string;
      const { behavior_intent_id, limit = 20 } =
        (request.query as Record<string, string | undefined>);

      const params: any[] = [tenantId, campaignId];
      let biFilter = '';
      if (behavior_intent_id) {
        params.push(behavior_intent_id);
        biFilter = `AND behavior_intent_id = $${params.length}`;
      }
      params.push(Math.min(Number(limit) || 20, 100));

      const { rows } = await pool.query(
        `SELECT id, behavior_intent_id, platform, approval_status,
                hook_text, content_text, cta_text, media_type, behavioral_rationale,
                approved_text, revision_notes, policy_flags, behavioral_tags,
                fogg_motivation, fogg_ability, fogg_prompt,
                emotional_tone, briefing_id, created_at
         FROM campaign_behavioral_copies
         WHERE tenant_id=$1 AND campaign_id=$2 ${biFilter}
         ORDER BY created_at DESC
         LIMIT $${params.length}`,
        params
      );

      return reply.send({ success: true, data: rows });
    }
  );

  // ─── PATCH /campaigns/behavioral-copies/:copyId/briefing ─────────────────
  // Links a saved behavioral copy to a briefing (called after Studio briefing creation).

  app.patch(
    '/campaigns/behavioral-copies/:copyId/briefing',
    { preHandler: [requirePerm('clients:write'), requireBehavioralCopyPerm('write')] },
    async (request: any, reply) => {
      const tenantId = (request.user as any).tenant_id as string;
      const { copyId } = request.params as { copyId: string };
      const { briefing_id } = z.object({ briefing_id: z.string().uuid() }).parse(request.body);

      const { rows } = await pool.query(
        `UPDATE campaign_behavioral_copies
         SET briefing_id = $1
         WHERE id = $2 AND tenant_id = $3
         RETURNING id, briefing_id`,
        [briefing_id, copyId, tenantId]
      );

      if (!rows[0]) return reply.status(404).send({ error: 'behavioral_copy_not_found' });
      return reply.send({ success: true, data: rows[0] });
    }
  );

  // ── GET /campaigns/:id/jobs ───────────────────────────────────────────────
  // Lists project_cards linked to this campaign with status + assignee info.
  app.get(
    '/campaigns/:id/jobs',
    { preHandler: [requirePerm('clients:read'), requireCampaignPerm('read')], config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request: any, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user?.tenant_id as string;

      const { rows } = await pool.query<{
        id: string;
        title: string;
        status: string;
        due_date: string | null;
        owner_name: string | null;
        owner_avatar_url: string | null;
        list_name: string;
        board_name: string;
        client_name: string | null;
        trello_url: string | null;
      }>(
        `SELECT
           pc.id, pc.title, pc.due_date::text,
           COALESCE(m.ops_status, 'backlog') as status,
           pl.name as list_name,
           pb.name as board_name,
           cl.name as client_name,
           pc.trello_url,
           (SELECT pcm.display_name FROM project_card_members pcm WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_name,
           (SELECT fp.avatar_url FROM project_card_members pcm
              JOIN edro_users eu ON LOWER(eu.email) = LOWER(pcm.email)
              JOIN freelancer_profiles fp ON fp.user_id = eu.id
             WHERE pcm.card_id = pc.id ORDER BY pcm.created_at ASC LIMIT 1) as owner_avatar_url
         FROM project_cards pc
         JOIN project_lists pl ON pl.id = pc.list_id
         JOIN project_boards pb ON pb.id = pc.board_id
         LEFT JOIN trello_list_status_map m ON m.list_id = pl.id AND m.tenant_id = $2
         LEFT JOIN clients cl ON cl.id::text = pb.client_id
         WHERE pc.campaign_id = $1
           AND pc.tenant_id = $2
           AND pc.is_archived = false
         ORDER BY pc.due_date ASC NULLS LAST, pc.created_at ASC`,
        [id, tenantId]
      );

      return reply.send({ jobs: rows });
    }
  );

  // ── PATCH /campaigns/:id/jobs/:jobId — link/unlink a job to this campaign
  app.patch(
    '/campaigns/:id/jobs/:jobId',
    { preHandler: [requirePerm('clients:write'), requireCampaignPerm('write')], config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request: any, reply) => {
      const { id, jobId } = request.params as { id: string; jobId: string };
      const tenantId = request.user?.tenant_id as string;
      const { link } = z.object({ link: z.boolean() }).parse(request.body);

      // Verify campaign belongs to tenant
      const camp = await pool.query(
        `SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      if (!camp.rows.length) return reply.status(404).send({ error: 'campaign_not_found' });

      await pool.query(
        `UPDATE project_cards SET campaign_id = $1, updated_at = now()
         WHERE id = $2 AND tenant_id = $3`,
        [link ? id : null, jobId, tenantId]
      );

      return reply.send({ success: true });
    }
  );

  // ── GET /campaigns/:id/performance ────────────────────────────────────────
  // Returns aggregate KPIs for a campaign: format metrics + dark funnel count.
  // Hits format_performance_summary (via campaign_formats) and dark_funnel_events.
  // Also upserts into campaign_performance_cache for future fast reads.
  app.get(
    '/campaigns/:id/performance',
    { preHandler: [requirePerm('clients:read'), requireCampaignPerm('read')], config: { rateLimit: { max: 60, timeWindow: '1 minute' } } },
    async (request: any, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.user?.tenant_id as string;

      // Verify campaign exists
      const { rows: camps } = await pool.query(
        `SELECT id FROM campaigns WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
        [id, tenantId]
      );
      if (!camps.length) return reply.status(404).send({ error: 'campaign_not_found' });

      // Aggregate from format_performance_summary
      const { rows: summaryRows } = await pool.query<{
        total_impressions: string;
        total_reach: string;
        total_clicks: string;
        total_engagements: string;
        total_conversions: string;
        total_spend_brl: string;
        total_revenue_brl: string;
        format_count: string;
        has_data: boolean;
      }>(
        `SELECT
           COALESCE(SUM(fps.total_impressions), 0)     AS total_impressions,
           COALESCE(SUM(fps.total_reach), 0)           AS total_reach,
           COALESCE(SUM(fps.total_clicks), 0)          AS total_clicks,
           COALESCE(SUM(fps.total_engagements), 0)     AS total_engagements,
           COALESCE(SUM(fps.total_conversions), 0)     AS total_conversions,
           COALESCE(SUM(fps.total_spend_brl), 0)       AS total_spend_brl,
           COALESCE(SUM(fps.total_revenue_brl), 0)     AS total_revenue_brl,
           COUNT(cf.id)::int                           AS format_count,
           COUNT(fps.id) > 0                           AS has_data
         FROM campaign_formats cf
         LEFT JOIN format_performance_summary fps ON fps.campaign_format_id = cf.id
         WHERE cf.campaign_id = $1 AND cf.tenant_id = $2`,
        [id, tenantId]
      );

      // Last 30d from format_performance_metrics
      const { rows: recentRows } = await pool.query<{
        impressions_30d: string;
        reach_30d: string;
        conversions_30d: string;
        spend_30d: string;
      }>(
        `SELECT
           COALESCE(SUM(m.impressions), 0)  AS impressions_30d,
           COALESCE(SUM(m.reach), 0)        AS reach_30d,
           COALESCE(SUM(m.conversions), 0)  AS conversions_30d,
           COALESCE(SUM(m.spend_brl), 0)    AS spend_30d
         FROM format_performance_metrics m
         JOIN campaign_formats cf ON cf.id = m.campaign_format_id
         WHERE cf.campaign_id = $1 AND cf.tenant_id = $2
           AND m.measurement_date >= CURRENT_DATE - INTERVAL '30 days'`,
        [id, tenantId]
      );

      // Dark funnel signals linked to this campaign
      const { rows: dfRows } = await pool.query<{ count: string }>(
        `SELECT COUNT(*)::int AS count FROM dark_funnel_events
         WHERE campaign_id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );

      const s = summaryRows[0];
      const r = recentRows[0];
      const darkFunnelCount = Number(dfRows[0]?.count ?? 0);

      const imp     = Number(s.total_impressions);
      const clicks  = Number(s.total_clicks);
      const conv    = Number(s.total_conversions);
      const spend   = Number(s.total_spend_brl);
      const revenue = Number(s.total_revenue_brl);
      const avgRoas = spend > 0 ? revenue / spend : null;

      // Campaign Health Score (0–100): ROAS(40) + CTR(30) + Conv(20) + DarkFunnel(10)
      let healthScore: number | null = null;
      if (s.has_data && imp > 0) {
        const roasPts = avgRoas !== null ? Math.min(40, (avgRoas / 3.0) * 40) : 0;
        const ctrPts  = Math.min(30, (clicks / imp / 0.03) * 30);
        const convPts = Math.min(20, (conv   / imp / 0.02) * 20);
        const dfPts   = Math.min(10, (darkFunnelCount / imp / 0.001) * 10);
        healthScore   = Math.round(roasPts + ctrPts + convPts + dfPts);
      }

      const perf = {
        has_data: s.has_data,
        format_count: Number(s.format_count),
        total_impressions: imp,
        total_reach: Number(s.total_reach),
        total_clicks: clicks,
        total_engagements: Number(s.total_engagements),
        total_conversions: conv,
        total_spend_brl: spend,
        total_revenue_brl: revenue,
        avg_roas: avgRoas !== null ? Number(avgRoas.toFixed(2)) : null,
        impressions_30d: Number(r.impressions_30d),
        reach_30d: Number(r.reach_30d),
        conversions_30d: Number(r.conversions_30d),
        spend_30d: Number(r.spend_30d),
        dark_funnel_count: darkFunnelCount,
        health_score: healthScore,
      };

      // Upsert into cache (non-blocking)
      pool.query(
        `INSERT INTO campaign_performance_cache (
           campaign_id, tenant_id,
           total_impressions, total_reach, total_clicks, total_engagements,
           total_conversions, total_spend_brl, total_revenue_brl, avg_roas,
           impressions_30d, reach_30d, conversions_30d, spend_30d,
           dark_funnel_count, refreshed_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,now())
         ON CONFLICT (campaign_id) DO UPDATE SET
           total_impressions = EXCLUDED.total_impressions,
           total_reach = EXCLUDED.total_reach,
           total_clicks = EXCLUDED.total_clicks,
           total_engagements = EXCLUDED.total_engagements,
           total_conversions = EXCLUDED.total_conversions,
           total_spend_brl = EXCLUDED.total_spend_brl,
           total_revenue_brl = EXCLUDED.total_revenue_brl,
           avg_roas = EXCLUDED.avg_roas,
           impressions_30d = EXCLUDED.impressions_30d,
           reach_30d = EXCLUDED.reach_30d,
           conversions_30d = EXCLUDED.conversions_30d,
           spend_30d = EXCLUDED.spend_30d,
           dark_funnel_count = EXCLUDED.dark_funnel_count,
           refreshed_at = now()`,
        [
          id, tenantId,
          perf.total_impressions, perf.total_reach, perf.total_clicks,
          perf.total_engagements, perf.total_conversions,
          perf.total_spend_brl, perf.total_revenue_brl, perf.avg_roas,
          perf.impressions_30d, perf.reach_30d, perf.conversions_30d, perf.spend_30d,
          perf.dark_funnel_count,
        ]
      ).catch(() => { /* cache upsert failure is non-fatal */ });

      return reply.send({ success: true, data: perf });
    }
  );
}
