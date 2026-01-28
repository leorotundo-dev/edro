import { query } from '../db';
import type { CalendarPost, ClientProfile, Objective, Platform, YearMonth } from '../types';

export async function upsertClientProfile(client: ClientProfile, tenantId?: string | null) {
  await query(
    `
    INSERT INTO clients (
      id, name, country, uf, city, segment_primary, segment_secondary,
      reportei_account_id, profile, tenant_id, updated_at
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,NOW())
    ON CONFLICT (id) DO UPDATE SET
      name=EXCLUDED.name,
      country=EXCLUDED.country,
      uf=EXCLUDED.uf,
      city=EXCLUDED.city,
      segment_primary=EXCLUDED.segment_primary,
      segment_secondary=EXCLUDED.segment_secondary,
      reportei_account_id=EXCLUDED.reportei_account_id,
      profile=EXCLUDED.profile,
      tenant_id=COALESCE(EXCLUDED.tenant_id, clients.tenant_id),
      updated_at=NOW()
    `,
    [
      client.id,
      client.name,
      client.country,
      client.uf ?? null,
      client.city ?? null,
      client.segment_primary,
      client.segment_secondary ?? [],
      (client as any).reportei_account_id ?? null,
      JSON.stringify(client),
      tenantId ?? null,
    ]
  );
}

export async function createMonthlyCalendar(params: {
  tenantId?: string | null;
  client: ClientProfile;
  month: YearMonth;
  platform: Platform;
  objective: Objective;
  posts: CalendarPost[];
  payload?: any;
}) {
  await upsertClientProfile(params.client, params.tenantId);

  const { rows } = await query<{ id: string }>(
    `
    INSERT INTO monthly_calendars (tenant_id, client_id, month, platform, objective, posts, payload)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
    RETURNING id
    `,
    [
      params.tenantId ?? null,
      params.client.id,
      params.month,
      params.platform,
      params.objective,
      JSON.stringify(params.posts),
      JSON.stringify(params.payload ?? {}),
    ]
  );

  return rows[0]?.id as string;
}

export async function createFlowRun(params: {
  tenantId?: string | null;
  client: ClientProfile;
  month: YearMonth;
  platform: Platform;
  objective: Objective;
  payload: any;
}) {
  await upsertClientProfile(params.client, params.tenantId);

  const { rows } = await query<{ id: string }>(
    `
    INSERT INTO flow_runs (tenant_id, client_id, month, platform, objective, payload)
    VALUES ($1,$2,$3,$4,$5,$6::jsonb)
    RETURNING id
    `,
    [
      params.tenantId ?? null,
      params.client.id,
      params.month,
      params.platform,
      params.objective,
      JSON.stringify(params.payload),
    ]
  );

  return rows[0]?.id as string;
}

export async function findMonthlyCalendar(params: {
  tenantId?: string | null;
  clientId: string;
  month: YearMonth;
  platform: Platform;
}) {
  const { rows } = await query<{ id: string }>(
    `SELECT id FROM monthly_calendars WHERE tenant_id=$1 AND client_id=$2 AND month=$3 AND platform=$4 LIMIT 1`,
    [params.tenantId ?? null, params.clientId, params.month, params.platform]
  );
  return rows[0]?.id ?? null;
}

export async function listClientProfilesForTenant(tenantId: string) {
  const { rows } = await query<any>(
    `SELECT * FROM clients WHERE tenant_id=$1 ORDER BY updated_at DESC`,
    [tenantId]
  );
  return rows;
}
