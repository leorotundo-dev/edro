import { query } from '../db';

function toVectorLiteral(values: number[]) {
  return `[${values.join(',')}]`;
}

export async function createLibraryItem(params: {
  tenant_id: string;
  client_id: string;
  type: string;
  title: string;
  description?: string | null;
  category?: string | null;
  tags?: string[];
  weight?: string;
  use_in_ai?: boolean;
  valid_from?: string | null;
  valid_to?: string | null;
  notes?: string | null;
  source_url?: string | null;
  file_key?: string | null;
  file_mime?: string | null;
  file_size_bytes?: number | null;
  created_by?: string | null;
}) {
  const { rows } = await query(
    `INSERT INTO library_items
      (tenant_id, client_id, type, title, description, category, tags, weight, use_in_ai, valid_from, valid_to, notes, source_url, file_key, file_mime, file_size_bytes, status, created_by)
     VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'pending',$17)
     RETURNING *`,
    [
      params.tenant_id,
      params.client_id,
      params.type,
      params.title,
      params.description ?? null,
      params.category ?? 'geral',
      params.tags ?? [],
      params.weight ?? 'medium',
      params.use_in_ai ?? true,
      params.valid_from ?? null,
      params.valid_to ?? null,
      params.notes ?? null,
      params.source_url ?? null,
      params.file_key ?? null,
      params.file_mime ?? null,
      params.file_size_bytes ?? null,
      params.created_by ?? null,
    ]
  );
  return rows[0];
}

export async function getLibraryItem(tenant_id: string, id: string) {
  const { rows } = await query(
    `SELECT * FROM library_items WHERE id=$1 AND tenant_id=$2`,
    [id, tenant_id]
  );
  return rows[0] ?? null;
}

export async function updateLibraryItem(id: string, tenant_id: string, patch: Record<string, any>) {
  const current = await getLibraryItem(tenant_id, id);
  if (!current) throw new Error('not_found');
  const next = { ...current, ...patch };

  await query(
    `UPDATE library_items SET
      title=$3,
      description=$4,
      category=$5,
      tags=$6,
      weight=$7,
      use_in_ai=$8,
      valid_from=$9,
      valid_to=$10,
      notes=$11,
      source_url=$12,
      status=$13,
      error_message=$14,
      updated_at=NOW()
     WHERE id=$1 AND tenant_id=$2`,
    [
      id,
      tenant_id,
      next.title,
      next.description,
      next.category,
      next.tags,
      next.weight,
      next.use_in_ai,
      next.valid_from,
      next.valid_to,
      next.notes,
      next.source_url,
      next.status,
      next.error_message,
    ]
  );

  return next;
}

export async function listLibraryItems(
  tenant_id: string,
  client_id: string,
  filters: Record<string, any> = {}
) {
  const where: string[] = ['tenant_id=$1', 'client_id=$2'];
  const args: any[] = [tenant_id, client_id];
  let idx = 3;

  if (filters.type) {
    where.push(`type=$${idx++}`);
    args.push(filters.type);
  }
  if (filters.category) {
    where.push(`category=$${idx++}`);
    args.push(filters.category);
  }
  if (filters.use_in_ai != null) {
    where.push(`use_in_ai=$${idx++}`);
    args.push(filters.use_in_ai === 'true' || filters.use_in_ai === true);
  }
  if (filters.status) {
    where.push(`status=$${idx++}`);
    args.push(filters.status);
  }
  if (filters.q) {
    where.push(`(LOWER(title) LIKE $${idx} OR LOWER(COALESCE(description,'')) LIKE $${idx})`);
    args.push(`%${String(filters.q).toLowerCase()}%`);
    idx += 1;
  }
  const tags =
    Array.isArray(filters.tags)
      ? filters.tags
      : typeof filters.tags === 'string' && filters.tags.length
        ? filters.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : null;
  if (tags?.length) {
    where.push(`tags && $${idx++}::text[]`);
    args.push(tags);
  }

  const { rows } = await query(
    `SELECT * FROM library_items WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT 200`,
    args
  );
  return rows;
}

export async function countReadyLibraryItems(tenant_id: string, client_id: string) {
  const { rows } = await query<{ total: number }>(
    `SELECT COUNT(*)::int AS total
     FROM library_items
     WHERE tenant_id=$1 AND client_id=$2 AND status='ready' AND use_in_ai=true`,
    [tenant_id, client_id]
  );
  return rows[0]?.total ?? 0;
}

export async function upsertDoc(
  tenant_id: string,
  client_id: string,
  library_item_id: string,
  text: string,
  text_hash: string
) {
  await query(
    `INSERT INTO library_docs (tenant_id, client_id, library_item_id, text, text_hash)
     VALUES ($1,$2,$3,$4,$5)`,
    [tenant_id, client_id, library_item_id, text, text_hash]
  );
}

export async function clearChunks(library_item_id: string) {
  await query(`DELETE FROM library_chunks WHERE library_item_id=$1`, [library_item_id]);
}

export async function insertChunk(params: {
  tenant_id: string;
  client_id: string;
  library_item_id: string;
  chunk_index: number;
  content: string;
  category?: string;
  tags?: string[];
  weight?: string;
  use_in_ai?: boolean;
}) {
  await query(
    `INSERT INTO library_chunks
      (tenant_id, client_id, library_item_id, chunk_index, content, category, tags, weight, use_in_ai)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      params.tenant_id,
      params.client_id,
      params.library_item_id,
      params.chunk_index,
      params.content,
      params.category ?? 'geral',
      params.tags ?? [],
      params.weight ?? 'medium',
      params.use_in_ai ?? true,
    ]
  );
}

export async function updateChunkEmbedding(library_item_id: string, chunk_index: number, embedding: number[]) {
  await query(
    `UPDATE library_chunks SET embedding=$3 WHERE library_item_id=$1 AND chunk_index=$2`,
    [library_item_id, chunk_index, toVectorLiteral(embedding)]
  );
}

export async function semanticSearch(params: {
  tenant_id: string;
  client_id: string;
  queryEmbedding: number[];
  k: number;
  use_in_ai?: boolean;
  categories?: string[];
  tags?: string[];
}) {
  const where: string[] = ['tenant_id=$1', 'client_id=$2', 'embedding IS NOT NULL'];
  const args: any[] = [params.tenant_id, params.client_id, toVectorLiteral(params.queryEmbedding), params.k];
  let idx = 5;

  if (params.use_in_ai != null) {
    where.push(`use_in_ai=$${idx++}`);
    args.push(params.use_in_ai);
  }
  if (params.categories?.length) {
    where.push(`category = ANY($${idx++})`);
    args.push(params.categories);
  }
  if (params.tags?.length) {
    where.push(`tags && $${idx++}::text[]`);
    args.push(params.tags);
  }

  const { rows } = await query(
    `
    SELECT
      id, library_item_id, chunk_index, content, category, tags, weight, use_in_ai,
      1 - (embedding <=> $3::vector) AS score
    FROM library_chunks
    WHERE ${where.join(' AND ')}
    ORDER BY embedding <=> $3::vector
    LIMIT $4
    `,
    args
  );
  return rows;
}
