import crypto from 'crypto';
import { query } from '../db';

type CalendarProfile = {
  enable_calendar_total?: boolean;
  calendar_weight?: number;
  retail_mode?: boolean;
  allow_cultural_opportunities?: boolean;
  allow_geek_pop?: boolean;
  allow_profession_days?: boolean;
  restrict_sensitive_causes?: boolean;
};

type TrendProfile = {
  enable_trends?: boolean;
  trend_weight?: number;
  sources?: string[];
};

type ClientProfilePatch = {
  segment_secondary?: string[];
  tone_profile?: string;
  risk_tolerance?: string;
  calendar_profile?: CalendarProfile;
  trend_profile?: TrendProfile;
  platform_preferences?: Record<string, any>;
  keywords?: string[];
  pillars?: string[];
  knowledge_base?: Record<string, any>;
};

type ClientPayload = {
  id?: string;
  name: string;
  country?: string;
  uf?: string | null;
  city?: string | null;
  segment_primary: string;
  reportei_account_id?: string | null;
} & ClientProfilePatch;

const calendarDefaults: CalendarProfile = {
  enable_calendar_total: true,
  calendar_weight: 60,
  retail_mode: true,
  allow_cultural_opportunities: true,
  allow_geek_pop: true,
  allow_profession_days: true,
  restrict_sensitive_causes: false,
};

const trendDefaults: TrendProfile = {
  enable_trends: false,
  trend_weight: 40,
  sources: [],
};

function normalizeProfile(current: any, patch: ClientProfilePatch) {
  const next = { ...(current || {}) };

  if (patch.segment_secondary !== undefined) next.segment_secondary = patch.segment_secondary;
  if (patch.tone_profile) next.tone_profile = patch.tone_profile;
  if (patch.risk_tolerance) next.risk_tolerance = patch.risk_tolerance;
  if (patch.platform_preferences !== undefined) next.platform_preferences = patch.platform_preferences;
  if (patch.keywords !== undefined) next.keywords = patch.keywords;
  if (patch.pillars !== undefined) next.pillars = patch.pillars;
  if (patch.knowledge_base !== undefined) next.knowledge_base = patch.knowledge_base;

  next.calendar_profile = {
    ...calendarDefaults,
    ...(current?.calendar_profile || {}),
    ...(patch.calendar_profile || {}),
  };

  next.trend_profile = {
    ...trendDefaults,
    ...(current?.trend_profile || {}),
    ...(patch.trend_profile || {}),
  };

  return next;
}

function buildClientId(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  return `cli_${slug}_${crypto.randomUUID().slice(0, 8)}`;
}

export async function getClientById(tenantId: string, id: string) {
  const { rows } = await query<any>(
    `SELECT * FROM clients WHERE id=$1 AND tenant_id=$2 LIMIT 1`,
    [id, tenantId]
  );
  return rows[0] ?? null;
}

export async function listClients(tenantId: string) {
  const { rows } = await query<any>(
    `SELECT * FROM clients WHERE tenant_id=$1 ORDER BY updated_at DESC NULLS LAST, name ASC`,
    [tenantId]
  );
  return rows;
}

export async function createClient(params: { tenantId: string; payload: ClientPayload }) {
  const id = params.payload.id || buildClientId(params.payload.name);
  const profile = normalizeProfile({}, params.payload);

  const { rows } = await query<any>(
    `
    INSERT INTO clients (
      id, name, country, uf, city, segment_primary, segment_secondary, reportei_account_id, profile, tenant_id, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,NOW())
    RETURNING *
    `,
    [
      id,
      params.payload.name,
      params.payload.country ?? 'BR',
      params.payload.uf ?? null,
      params.payload.city ?? null,
      params.payload.segment_primary,
      profile.segment_secondary ?? [],
      params.payload.reportei_account_id ?? null,
      JSON.stringify(profile),
      params.tenantId,
    ]
  );

  return rows[0];
}

export async function updateClient(params: {
  tenantId: string;
  id: string;
  patch: Partial<ClientPayload>;
}) {
  const current = await getClientById(params.tenantId, params.id);
  if (!current) return null;

  const profile = normalizeProfile(current.profile || {}, params.patch);

  const segmentSecondary =
    params.patch.segment_secondary ?? current.segment_secondary ?? profile.segment_secondary ?? [];

  const { rows } = await query<any>(
    `
    UPDATE clients
    SET name=$3,
        country=$4,
        uf=$5,
        city=$6,
        segment_primary=$7,
        segment_secondary=$8,
        reportei_account_id=$9,
        profile=$10::jsonb,
        updated_at=NOW()
    WHERE id=$1 AND tenant_id=$2
    RETURNING *
    `,
    [
      params.id,
      params.tenantId,
      params.patch.name ?? current.name,
      params.patch.country ?? current.country,
      params.patch.uf ?? current.uf,
      params.patch.city ?? current.city,
      params.patch.segment_primary ?? current.segment_primary,
      segmentSecondary,
      params.patch.reportei_account_id ?? current.reportei_account_id,
      JSON.stringify(profile),
    ]
  );

  return rows[0] ?? null;
}

export async function deleteClient(params: { tenantId: string; id: string }) {
  const { rows } = await query<{ id: string }>(
    `DELETE FROM clients WHERE id=$1 AND tenant_id=$2 RETURNING id`,
    [params.id, params.tenantId]
  );
  return rows[0] ?? null;
}
