import { query } from '../db';

export interface EdroMockup {
  id: string;
  tenant_id: string;
  briefing_id?: string | null;
  client_id?: string | null;
  platform?: string | null;
  format?: string | null;
  production_type?: string | null;
  status: string;
  title?: string | null;
  html_key?: string | null;
  json_key?: string | null;
  metadata: Record<string, any>;
  created_by?: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function createMockup(params: {
  tenantId: string;
  briefingId?: string | null;
  clientId?: string | null;
  platform?: string | null;
  format?: string | null;
  productionType?: string | null;
  status?: string | null;
  title?: string | null;
  htmlKey?: string | null;
  jsonKey?: string | null;
  metadata?: Record<string, any> | null;
  createdBy?: string | null;
}): Promise<EdroMockup> {
  const { rows } = await query<EdroMockup>(
    `
    INSERT INTO edro_mockups (
      tenant_id,
      briefing_id,
      client_id,
      platform,
      format,
      production_type,
      status,
      title,
      html_key,
      json_key,
      metadata,
      created_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
    RETURNING *
    `,
    [
      params.tenantId,
      params.briefingId ?? null,
      params.clientId ?? null,
      params.platform ?? null,
      params.format ?? null,
      params.productionType ?? null,
      params.status ?? 'draft',
      params.title ?? null,
      params.htmlKey ?? null,
      params.jsonKey ?? null,
      JSON.stringify(params.metadata ?? {}),
      params.createdBy ?? null,
    ]
  );
  return rows[0];
}

export async function listMockups(params: {
  tenantId: string;
  briefingId?: string | null;
  clientId?: string | null;
  platform?: string | null;
  format?: string | null;
  limit?: number;
}): Promise<EdroMockup[]> {
  const filters: string[] = ['tenant_id=$1'];
  const values: any[] = [params.tenantId];
  let idx = values.length + 1;

  if (params.briefingId) {
    filters.push(`briefing_id=$${idx++}`);
    values.push(params.briefingId);
  }
  if (params.clientId) {
    filters.push(`client_id=$${idx++}`);
    values.push(params.clientId);
  }
  if (params.platform) {
    filters.push(`platform=$${idx++}`);
    values.push(params.platform);
  }
  if (params.format) {
    filters.push(`format=$${idx++}`);
    values.push(params.format);
  }

  const limit = Number.isFinite(params.limit) ? Math.max(1, Math.min(Number(params.limit), 200)) : 100;

  const { rows } = await query<EdroMockup>(
    `
    SELECT *
    FROM edro_mockups
    WHERE ${filters.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT ${limit}
    `,
    values
  );
  return rows;
}

export async function getMockupById(params: { tenantId: string; id: string }): Promise<EdroMockup | null> {
  const { rows } = await query<EdroMockup>(
    `SELECT * FROM edro_mockups WHERE tenant_id=$1 AND id=$2`,
    [params.tenantId, params.id]
  );
  return rows[0] ?? null;
}

export async function updateMockup(
  params: { tenantId: string; id: string },
  patch: Partial<{
    status: string | null;
    title: string | null;
    metadata: Record<string, any> | null;
    htmlKey: string | null;
    jsonKey: string | null;
  }>
): Promise<EdroMockup | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (patch.status !== undefined) {
    fields.push(`status=$${idx++}`);
    values.push(patch.status);
  }
  if (patch.title !== undefined) {
    fields.push(`title=$${idx++}`);
    values.push(patch.title);
  }
  if (patch.metadata !== undefined) {
    fields.push(`metadata=$${idx++}::jsonb`);
    values.push(JSON.stringify(patch.metadata ?? {}));
  }
  if (patch.htmlKey !== undefined) {
    fields.push(`html_key=$${idx++}`);
    values.push(patch.htmlKey);
  }
  if (patch.jsonKey !== undefined) {
    fields.push(`json_key=$${idx++}`);
    values.push(patch.jsonKey);
  }

  if (!fields.length) return getMockupById({ tenantId: params.tenantId, id: params.id });

  values.push(params.tenantId);
  values.push(params.id);

  const { rows } = await query<EdroMockup>(
    `
    UPDATE edro_mockups
    SET ${fields.join(', ')}, updated_at=now()
    WHERE tenant_id=$${idx++} AND id=$${idx}
    RETURNING *
    `,
    values
  );
  return rows[0] ?? null;
}

export async function deleteMockup(params: { tenantId: string; id: string }) {
  const { rows } = await query<EdroMockup>(
    `DELETE FROM edro_mockups WHERE tenant_id=$1 AND id=$2 RETURNING *`,
    [params.tenantId, params.id]
  );
  return rows[0] ?? null;
}
