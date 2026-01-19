import { query } from '../db';

export type UserSourceStatus = 'pending' | 'uploaded' | 'processing' | 'ready' | 'failed';
export type UserSourceType =
  | 'text'
  | 'link'
  | 'youtube'
  | 'upload'
  | 'pdf'
  | 'image'
  | 'audio'
  | 'video';

export interface UserSource {
  id: string;
  user_id: string;
  edital_id?: string | null;
  type: UserSourceType;
  status: UserSourceStatus;
  title?: string | null;
  url?: string | null;
  s3_key?: string | null;
  file_name?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
  text_content?: string | null;
  metadata?: Record<string, any> | null;
  job_id?: string | null;
  error_message?: string | null;
  created_at: string;
  updated_at: string;
  processed_at?: string | null;
  deleted_at?: string | null;
}

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const TEXT_LIMIT = toPositiveInt(process.env.USER_SOURCE_TEXT_LIMIT, 8000);

export async function createUserSource(params: {
  userId: string;
  editalId?: string | null;
  type: UserSourceType;
  status?: UserSourceStatus;
  title?: string | null;
  url?: string | null;
  s3Key?: string | null;
  fileName?: string | null;
  contentType?: string | null;
  sizeBytes?: number | null;
  textContent?: string | null;
  metadata?: Record<string, any> | null;
  jobId?: string | null;
}): Promise<UserSource> {
  const { rows } = await query<UserSource>(
    `
      INSERT INTO user_sources (
        user_id, edital_id, type, status, title, url, s3_key,
        file_name, content_type, size_bytes, text_content, metadata, job_id, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12, $13, NOW()
      )
      RETURNING *
    `,
    [
      params.userId,
      params.editalId ?? null,
      params.type,
      params.status ?? 'pending',
      params.title ?? null,
      params.url ?? null,
      params.s3Key ?? null,
      params.fileName ?? null,
      params.contentType ?? null,
      params.sizeBytes ?? null,
      params.textContent ? params.textContent.slice(0, TEXT_LIMIT) : null,
      JSON.stringify(params.metadata ?? {}),
      params.jobId ?? null,
    ]
  );
  return rows[0];
}

export async function updateUserSource(params: {
  id: string;
  userId: string;
  patch: Partial<{
    status: UserSourceStatus;
    title: string | null;
    url: string | null;
    s3Key: string | null;
    editalId: string | null;
    fileName: string | null;
    contentType: string | null;
    sizeBytes: number | null;
    textContent: string | null;
    metadata: Record<string, any> | null;
    jobId: string | null;
    errorMessage: string | null;
    processedAt: Date | null;
  }>;
}): Promise<UserSource | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const pushField = (column: string, value: any) => {
    fields.push(`${column} = $${idx}`);
    values.push(value);
    idx += 1;
  };

  if (params.patch.status !== undefined) pushField('status', params.patch.status);
  if (params.patch.title !== undefined) pushField('title', params.patch.title);
  if (params.patch.url !== undefined) pushField('url', params.patch.url);
  if (params.patch.s3Key !== undefined) pushField('s3_key', params.patch.s3Key);
  if (params.patch.editalId !== undefined) pushField('edital_id', params.patch.editalId);
  if (params.patch.fileName !== undefined) pushField('file_name', params.patch.fileName);
  if (params.patch.contentType !== undefined) pushField('content_type', params.patch.contentType);
  if (params.patch.sizeBytes !== undefined) pushField('size_bytes', params.patch.sizeBytes);
  if (params.patch.textContent !== undefined) {
    pushField('text_content', params.patch.textContent?.slice(0, TEXT_LIMIT) ?? null);
  }
  if (params.patch.metadata !== undefined) pushField('metadata', JSON.stringify(params.patch.metadata ?? {}));
  if (params.patch.jobId !== undefined) pushField('job_id', params.patch.jobId);
  if (params.patch.errorMessage !== undefined) pushField('error_message', params.patch.errorMessage);
  if (params.patch.processedAt !== undefined) pushField('processed_at', params.patch.processedAt);

  if (!fields.length) return getUserSourceById(params.id, params.userId);

  values.push(params.id);
  values.push(params.userId);

  const { rows } = await query<UserSource>(
    `
      UPDATE user_sources
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = $${idx} AND user_id = $${idx + 1}
      RETURNING *
    `,
    values
  );
  return rows[0] ?? null;
}

export async function getUserSourceById(id: string, userId: string): Promise<UserSource | null> {
  const { rows } = await query<UserSource>(
    `
      SELECT * FROM user_sources
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      LIMIT 1
    `,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function getUserSourceByIdUnsafe(id: string): Promise<UserSource | null> {
  const { rows } = await query<UserSource>(
    `
      SELECT * FROM user_sources
      WHERE id = $1 AND deleted_at IS NULL
      LIMIT 1
    `,
    [id]
  );
  return rows[0] ?? null;
}

export async function listUserSources(params: {
  userId: string;
  editalId?: string | null;
  status?: UserSourceStatus;
  type?: UserSourceType;
  limit?: number;
  offset?: number;
}): Promise<UserSource[]> {
  const limit = Math.min(params.limit ?? 50, 200);
  const offset = Math.max(params.offset ?? 0, 0);
  const filters: string[] = ['user_id = $1', 'deleted_at IS NULL'];
  const values: any[] = [params.userId];
  let idx = 2;

  if (params.editalId) {
    filters.push(`edital_id = $${idx}`);
    values.push(params.editalId);
    idx += 1;
  }
  if (params.status) {
    filters.push(`status = $${idx}`);
    values.push(params.status);
    idx += 1;
  }
  if (params.type) {
    filters.push(`type = $${idx}`);
    values.push(params.type);
    idx += 1;
  }

  const { rows } = await query<UserSource>(
    `
      SELECT *
      FROM user_sources
      WHERE ${filters.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT $${idx} OFFSET $${idx + 1}
    `,
    [...values, limit, offset]
  );
  return rows;
}

export async function getUserStorageUsageBytes(userId: string): Promise<number> {
  const { rows } = await query<{ total: string }>(
    `
      SELECT COALESCE(SUM(size_bytes), 0) AS total
      FROM user_sources
      WHERE user_id = $1 AND deleted_at IS NULL
    `,
    [userId]
  );
  const total = Number(rows[0]?.total ?? 0);
  return Number.isFinite(total) ? total : 0;
}

export async function listStudySources(params: {
  userId: string;
  editalId?: string | null;
  sourceIds?: string[];
}): Promise<{ url: string; title: string; excerpt: string; image_url?: string }[]> {
  const filters: string[] = ['user_id = $1', 'deleted_at IS NULL', 'status = $2'];
  const values: any[] = [params.userId, 'ready'];
  let idx = 3;

  if (params.editalId) {
    filters.push(`edital_id = $${idx}`);
    values.push(params.editalId);
    idx += 1;
  }
  if (params.sourceIds && params.sourceIds.length) {
    filters.push(`id = ANY($${idx}::uuid[])`);
    values.push(params.sourceIds);
    idx += 1;
  }

  const { rows } = await query<UserSource>(
    `
      SELECT id, title, url, text_content, metadata
      FROM user_sources
      WHERE ${filters.join(' AND ')}
      ORDER BY created_at DESC
      LIMIT 50
    `,
    values
  );

  return rows
    .map((row) => {
      const text = String(row.text_content || '').trim();
      if (!text) return null;
      const metadata = row.metadata || {};
      const imageUrl =
        typeof metadata.image_url === 'string' && metadata.image_url.trim()
          ? metadata.image_url.trim()
          : undefined;
      return {
        url: row.url || `/api/sources/${row.id}/download`,
        title: row.title || 'Fonte enviada',
        excerpt: text.slice(0, TEXT_LIMIT),
        image_url: imageUrl,
      };
    })
    .filter(Boolean) as { url: string; title: string; excerpt: string; image_url?: string }[];
}

export const UserSourcesService = {
  createUserSource,
  updateUserSource,
  getUserSourceById,
  getUserSourceByIdUnsafe,
  listUserSources,
  getUserStorageUsageBytes,
  listStudySources,
};

export default UserSourcesService;
