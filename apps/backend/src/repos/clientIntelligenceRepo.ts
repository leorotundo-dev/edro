import { query } from '../db';

export type ClientSourceRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  source_type: string;
  platform?: string | null;
  url: string;
  handle?: string | null;
  status: string;
  last_fetched_at?: string | null;
  last_hash?: string | null;
  last_content_at?: string | null;
  metadata?: Record<string, any> | null;
};

export type ClientDocumentRow = {
  id: string;
  tenant_id: string;
  client_id: string;
  source_id?: string | null;
  source_type?: string | null;
  platform?: string | null;
  url?: string | null;
  title?: string | null;
  content_text?: string | null;
  content_excerpt?: string | null;
  language?: string | null;
  published_at?: string | null;
  content_hash?: string | null;
  raw_url?: string | null;
  metadata?: Record<string, any> | null;
  created_at?: string | null;
};

export async function upsertClientSource(params: {
  tenantId: string;
  clientId: string;
  source_type: string;
  platform?: string | null;
  url: string;
  handle?: string | null;
  status?: string;
  metadata?: Record<string, any>;
}) {
  const { rows } = await query<ClientSourceRow>(
    `
    INSERT INTO client_sources
      (tenant_id, client_id, source_type, platform, url, handle, status, metadata, updated_at)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NOW())
    ON CONFLICT (tenant_id, client_id, source_type, platform, url)
    DO UPDATE SET
      handle=EXCLUDED.handle,
      status=EXCLUDED.status,
      metadata=EXCLUDED.metadata,
      updated_at=NOW()
    RETURNING *
    `,
    [
      params.tenantId,
      params.clientId,
      params.source_type,
      params.platform ?? null,
      params.url,
      params.handle ?? null,
      params.status ?? 'active',
      JSON.stringify(params.metadata ?? {}),
    ]
  );

  return rows[0];
}

export async function listClientSources(params: {
  tenantId: string;
  clientId: string;
  sourceType?: string;
}) {
  const where: string[] = ['tenant_id=$1', 'client_id=$2'];
  const values: any[] = [params.tenantId, params.clientId];
  let idx = 3;

  if (params.sourceType) {
    where.push(`source_type=$${idx++}`);
    values.push(params.sourceType);
  }

  const { rows } = await query<ClientSourceRow>(
    `
    SELECT *
    FROM client_sources
    WHERE ${where.join(' AND ')}
    ORDER BY updated_at DESC
    `,
    values
  );

  return rows;
}

export async function updateClientSource(params: {
  tenantId: string;
  id: string;
  status?: string;
  lastHash?: string | null;
  lastFetchedAt?: Date | null;
  lastContentAt?: Date | null;
  metadata?: Record<string, any>;
}) {
  const patch: string[] = [];
  const values: any[] = [params.tenantId, params.id];
  let idx = 3;

  if (params.status) {
    patch.push(`status=$${idx++}`);
    values.push(params.status);
  }
  if (params.lastHash !== undefined) {
    patch.push(`last_hash=$${idx++}`);
    values.push(params.lastHash);
  }
  if (params.lastFetchedAt !== undefined) {
    patch.push(`last_fetched_at=$${idx++}`);
    values.push(params.lastFetchedAt);
  }
  if (params.lastContentAt !== undefined) {
    patch.push(`last_content_at=$${idx++}`);
    values.push(params.lastContentAt);
  }
  if (params.metadata) {
    patch.push(`metadata=$${idx++}::jsonb`);
    values.push(JSON.stringify(params.metadata));
  }

  if (!patch.length) return null;

  const { rows } = await query<ClientSourceRow>(
    `
    UPDATE client_sources
    SET ${patch.join(', ')}, updated_at=NOW()
    WHERE tenant_id=$1 AND id=$2
    RETURNING *
    `,
    values
  );

  return rows[0] ?? null;
}

export async function insertClientDocument(params: {
  tenantId: string;
  clientId: string;
  sourceId?: string | null;
  sourceType?: string | null;
  platform?: string | null;
  url?: string | null;
  title?: string | null;
  contentText?: string | null;
  contentExcerpt?: string | null;
  language?: string | null;
  publishedAt?: Date | null;
  contentHash?: string | null;
  rawUrl?: string | null;
  metadata?: Record<string, any>;
}) {
  const { rows } = await query<ClientDocumentRow>(
    `
    INSERT INTO client_documents
      (tenant_id, client_id, source_id, source_type, platform, url, title, content_text, content_excerpt,
       language, published_at, content_hash, raw_url, metadata)
    VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb)
    RETURNING *
    `,
    [
      params.tenantId,
      params.clientId,
      params.sourceId ?? null,
      params.sourceType ?? null,
      params.platform ?? null,
      params.url ?? null,
      params.title ?? null,
      params.contentText ?? null,
      params.contentExcerpt ?? null,
      params.language ?? null,
      params.publishedAt ?? null,
      params.contentHash ?? null,
      params.rawUrl ?? null,
      JSON.stringify(params.metadata ?? {}),
    ]
  );

  return rows[0];
}

export async function hasClientDocumentHash(params: {
  tenantId: string;
  clientId: string;
  contentHash: string;
}) {
  const { rows } = await query<any>(
    `
    SELECT id FROM client_documents
    WHERE tenant_id=$1 AND client_id=$2 AND content_hash=$3
    LIMIT 1
    `,
    [params.tenantId, params.clientId, params.contentHash]
  );

  return Boolean(rows[0]?.id);
}

export async function listClientDocuments(params: {
  tenantId: string;
  clientId: string;
  limit?: number;
}) {
  const limit = Math.min(params.limit ?? 40, 200);
  const { rows } = await query<ClientDocumentRow>(
    `
    SELECT *
    FROM client_documents
    WHERE tenant_id=$1 AND client_id=$2
    ORDER BY created_at DESC
    LIMIT $3
    `,
    [params.tenantId, params.clientId, limit]
  );

  return rows;
}

export async function insertClientInsight(params: {
  tenantId: string;
  clientId: string;
  period?: string | null;
  summary: Record<string, any>;
}) {
  const { rows } = await query<any>(
    `
    INSERT INTO client_insights (tenant_id, client_id, period, summary)
    VALUES ($1,$2,$3,$4::jsonb)
    RETURNING *
    `,
    [params.tenantId, params.clientId, params.period ?? null, JSON.stringify(params.summary)]
  );

  return rows[0];
}

export async function getLatestClientInsight(params: { tenantId: string; clientId: string }) {
  const { rows } = await query<any>(
    `
    SELECT *
    FROM client_insights
    WHERE tenant_id=$1 AND client_id=$2
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [params.tenantId, params.clientId]
  );

  return rows[0] ?? null;
}
