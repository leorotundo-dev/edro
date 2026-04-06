/**
 * Campaign Service — Basic CRUD + asset linking
 *
 * Works with:
 *   - campaigns table (existing)
 *   - campaign_assets table (new, from 0304 migration)
 */

import { pool } from '../db';

// ── Types ─────────────────────────────────────────────────────────────────────

export type CampaignStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

export type CampaignPhase = 'historia' | 'prova' | 'convite';

export interface Campaign {
  id: string;
  tenant_id: string;
  client_id: string;
  name: string;
  objective?: string;
  status: CampaignStatus;
  phases?: any[];
  audiences?: any[];
  behavior_intents?: any[];
  creative_concepts?: any[];
  start_date?: string;
  end_date?: string;
  budget_brl?: number;
  budget_total?: number;
  budget_spent?: number;
  kb_proposal_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignAsset {
  id: string;
  tenant_id: string;
  campaign_id: string;
  asset_type: string;
  asset_id?: string;
  content?: string;
  format?: string;
  behavior_intent_id?: string;
  phase?: string;
  performance?: Record<string, any>;
  created_at: string;
}

export interface CreateCampaignInput {
  client_id: string;
  name: string;
  objective?: string;
  status?: CampaignStatus;
  start_date?: string;
  end_date?: string;
  budget_total?: number;
  kb_proposal_id?: string;
  behavior_intents?: any[];
  creative_concepts?: any[];
}

export interface UpdateCampaignInput {
  name?: string;
  objective?: string;
  status?: CampaignStatus;
  start_date?: string;
  end_date?: string;
  budget_total?: number;
  budget_spent?: number;
  kb_proposal_id?: string;
  behavior_intents?: any[];
  creative_concepts?: any[];
}

export interface LinkAssetInput {
  campaign_id: string;
  asset_type: string;
  asset_id?: string;
  content?: string;
  format?: string;
  behavior_intent_id?: string;
  phase?: string;
  performance?: Record<string, any>;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

export async function createCampaign(
  tenantId: string,
  input: CreateCampaignInput
): Promise<Campaign> {
  const { rows } = await pool.query(
    `INSERT INTO campaigns
       (tenant_id, client_id, name, objective, status, start_date, end_date,
        budget_brl, budget_total, kb_proposal_id, behavior_intents, creative_concepts)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb)
     RETURNING *`,
    [
      tenantId,
      input.client_id,
      input.name,
      input.objective ?? null,
      input.status ?? 'draft',
      input.start_date ?? null,
      input.end_date ?? null,
      input.budget_total ?? null, // also sets budget_brl for backward compat
      input.budget_total ?? null,
      input.kb_proposal_id ?? null,
      JSON.stringify(input.behavior_intents ?? []),
      JSON.stringify(input.creative_concepts ?? []),
    ]
  );
  return rows[0] as Campaign;
}

export async function getCampaignById(
  tenantId: string,
  campaignId: string
): Promise<Campaign | null> {
  const { rows } = await pool.query(
    `SELECT * FROM campaigns WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [campaignId, tenantId]
  );
  return (rows[0] as Campaign) ?? null;
}

export async function listCampaigns(
  tenantId: string,
  options: {
    clientId?: string;
    status?: CampaignStatus;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ campaigns: Campaign[]; total: number }> {
  const params: any[] = [tenantId];
  const conditions: string[] = ['tenant_id = $1'];

  if (options.clientId) {
    params.push(options.clientId);
    conditions.push(`client_id = $${params.length}`);
  }
  if (options.status) {
    params.push(options.status);
    conditions.push(`status = $${params.length}`);
  }

  const where = conditions.join(' AND ');
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  const [dataRes, countRes] = await Promise.all([
    pool.query(
      `SELECT * FROM campaigns WHERE ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      params
    ),
    pool.query(
      `SELECT COUNT(*) AS total FROM campaigns WHERE ${where}`,
      params
    ),
  ]);

  return {
    campaigns: dataRes.rows as Campaign[],
    total: Number(countRes.rows[0]?.total ?? 0),
  };
}

export async function updateCampaign(
  tenantId: string,
  campaignId: string,
  input: UpdateCampaignInput
): Promise<Campaign | null> {
  const setClauses: string[] = ['updated_at = now()'];
  const params: any[] = [tenantId, campaignId];

  function addField(field: string, value: any, jsonb = false) {
    if (value === undefined) return;
    params.push(jsonb ? JSON.stringify(value) : value);
    setClauses.push(`${field} = ${jsonb ? `$${params.length}::jsonb` : `$${params.length}`}`);
  }

  addField('name', input.name);
  addField('objective', input.objective);
  addField('status', input.status);
  addField('start_date', input.start_date);
  addField('end_date', input.end_date);
  addField('budget_total', input.budget_total);
  addField('budget_spent', input.budget_spent);
  addField('kb_proposal_id', input.kb_proposal_id);
  addField('behavior_intents', input.behavior_intents, true);
  addField('creative_concepts', input.creative_concepts, true);

  if (setClauses.length === 1) return getCampaignById(tenantId, campaignId); // nothing to update

  const { rows } = await pool.query(
    `UPDATE campaigns SET ${setClauses.join(', ')} WHERE tenant_id=$1 AND id=$2 RETURNING *`,
    params
  );
  return (rows[0] as Campaign) ?? null;
}

export async function deleteCampaign(
  tenantId: string,
  campaignId: string
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM campaigns WHERE id = $1 AND tenant_id = $2`,
    [campaignId, tenantId]
  );
  return (rowCount ?? 0) > 0;
}

// ── Campaign Assets ───────────────────────────────────────────────────────────

export async function linkAssetToCampaign(
  tenantId: string,
  input: LinkAssetInput
): Promise<CampaignAsset> {
  const { rows } = await pool.query(
    `INSERT INTO campaign_assets
       (tenant_id, campaign_id, asset_type, asset_id, content, format,
        behavior_intent_id, phase, performance)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)
     RETURNING *`,
    [
      tenantId,
      input.campaign_id,
      input.asset_type,
      input.asset_id ?? null,
      input.content ?? null,
      input.format ?? null,
      input.behavior_intent_id ?? null,
      input.phase ?? null,
      input.performance ? JSON.stringify(input.performance) : null,
    ]
  );
  return rows[0] as CampaignAsset;
}

export async function listCampaignAssets(
  tenantId: string,
  campaignId: string,
  assetType?: string
): Promise<CampaignAsset[]> {
  const params: any[] = [tenantId, campaignId];
  let typeFilter = '';
  if (assetType) {
    params.push(assetType);
    typeFilter = `AND asset_type = $${params.length}`;
  }
  const { rows } = await pool.query(
    `SELECT * FROM campaign_assets
     WHERE tenant_id = $1 AND campaign_id = $2 ${typeFilter}
     ORDER BY created_at DESC`,
    params
  );
  return rows as CampaignAsset[];
}

export async function updateAssetPerformance(
  tenantId: string,
  assetId: string,
  performance: Record<string, any>
): Promise<CampaignAsset | null> {
  const { rows } = await pool.query(
    `UPDATE campaign_assets
     SET performance = $1::jsonb
     WHERE id = $2 AND tenant_id = $3
     RETURNING *`,
    [JSON.stringify(performance), assetId, tenantId]
  );
  return (rows[0] as CampaignAsset) ?? null;
}
