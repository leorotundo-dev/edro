import { query } from '../db';

export async function createPostAssetsFromCalendar(
  calendarId: string,
  posts: any[],
  options?: { tenantId?: string | null; status?: string }
) {
  const status = options?.status ?? 'draft';
  for (let i = 0; i < posts.length; i += 1) {
    await query(
      `INSERT INTO post_assets (tenant_id, calendar_id, post_index, status, payload)
       VALUES ($1,$2,$3,$4,$5::jsonb)
       ON CONFLICT DO NOTHING`,
      [options?.tenantId ?? null, calendarId, i, status, JSON.stringify(posts[i])]
    );

    const sources = posts[i]?.library_sources;
    if (Array.isArray(sources) && sources.length) {
      const { rows } = await query<{ id: string }>(
        `SELECT id FROM post_assets WHERE calendar_id=$1 AND post_index=$2 AND tenant_id=$3`,
        [calendarId, i, options?.tenantId ?? null]
      );
      const postAssetId = rows[0]?.id;
      if (postAssetId) {
        await query(`DELETE FROM post_sources WHERE post_asset_id=$1`, [postAssetId]);
        for (const source of sources) {
          await query(
            `INSERT INTO post_sources (tenant_id, post_asset_id, library_item_id, chunk_ids, score)
             VALUES ($1,$2,$3,$4::uuid[],$5)`,
            [
              options?.tenantId ?? null,
              postAssetId,
              source.library_item_id,
              source.chunk_ids ?? [],
              source.score ?? null,
            ]
          );
        }
      }
    }
  }
}

export async function setPostStatus(params: {
  calendar_id: string;
  post_index: number;
  status: 'draft' | 'review' | 'approved' | 'published' | 'rejected';
  reviewer?: string;
  notes?: string;
}) {
  const { rows } = await query<{ status: string }>(
    `SELECT status FROM post_assets WHERE calendar_id=$1 AND post_index=$2`,
    [params.calendar_id, params.post_index]
  );
  if (rows[0]?.status === 'published') {
    throw new Error('locked_published_post');
  }

  const stampApproved = params.status === 'approved' ? 'NOW()' : 'NULL';
  const stampPublished = params.status === 'published' ? 'NOW()' : 'NULL';

  await query(
    `
    UPDATE post_assets
    SET status=$3,
        reviewer=$4,
        notes=$5,
        approved_at=${stampApproved},
        published_at=${stampPublished},
        updated_at=NOW()
    WHERE calendar_id=$1 AND post_index=$2
    `,
    [params.calendar_id, params.post_index, params.status, params.reviewer ?? null, params.notes ?? null]
  );
}

export async function listPostAssets(calendar_id: string, tenantId?: string | null) {
  const { rows } = await query<any>(
    `SELECT * FROM post_assets WHERE calendar_id=$1 AND tenant_id=$2 ORDER BY post_index ASC`,
    [calendar_id, tenantId ?? null]
  );
  return rows;
}
