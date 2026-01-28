import { query } from '../db';

export async function enqueuePublish(params: {
  tenant_id?: string | null;
  post_asset_id: string;
  scheduled_for: string;
  channel: string;
  payload: any;
}) {
  await query(
    `INSERT INTO publish_queue (tenant_id, post_asset_id, scheduled_for, channel, payload)
     VALUES ($1,$2,$3,$4,$5::jsonb)`,
    [
      params.tenant_id ?? null,
      params.post_asset_id,
      params.scheduled_for,
      params.channel,
      JSON.stringify(params.payload ?? {}),
    ]
  );
}

export async function fetchDue(limit = 20) {
  const { rows } = await query<any>(
    `SELECT * FROM publish_queue
     WHERE status='queued' AND scheduled_for <= now()
     ORDER BY scheduled_for ASC
     LIMIT $1`,
    [limit]
  );
  return rows;
}

export async function markProcessing(id: string) {
  await query(
    `UPDATE publish_queue SET status='processing', updated_at=now(), attempts=attempts+1 WHERE id=$1`,
    [id]
  );
}

export async function markPublished(id: string) {
  await query(`UPDATE publish_queue SET status='published', updated_at=now() WHERE id=$1`, [id]);
}

export async function markFailed(id: string, error: string) {
  await query(
    `UPDATE publish_queue SET status='failed', error_message=$2, updated_at=now() WHERE id=$1`,
    [id, error]
  );
}
