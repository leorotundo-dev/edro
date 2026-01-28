import { query } from '../db';

export async function createPostVersion(params: {
  post_asset_id: string;
  payload: any;
  diff?: any;
  created_by?: string | null;
}) {
  const { rows } = await query<{ v: number }>(
    `SELECT COALESCE(MAX(version),0) AS v FROM post_versions WHERE post_asset_id=$1`,
    [params.post_asset_id]
  );
  const next = Number(rows[0]?.v ?? 0) + 1;

  await query(
    `INSERT INTO post_versions (post_asset_id, version, payload, diff, created_by)
     VALUES ($1,$2,$3::jsonb,$4::jsonb,$5)`,
    [
      params.post_asset_id,
      next,
      JSON.stringify(params.payload ?? {}),
      JSON.stringify(params.diff ?? {}),
      params.created_by ?? null,
    ]
  );

  return next;
}

export async function listPostVersions(post_asset_id: string) {
  const { rows } = await query<any>(
    `SELECT * FROM post_versions WHERE post_asset_id=$1 ORDER BY version DESC`,
    [post_asset_id]
  );
  return rows;
}
