import { query } from '../db';

export async function enqueueJob(tenant_id: string, type: string, payload: any) {
  const { rows } = await query<any>(
    `INSERT INTO job_queue (tenant_id, type, payload) VALUES ($1,$2,$3::jsonb) RETURNING *`,
    [tenant_id, type, JSON.stringify(payload)]
  );
  return rows[0];
}

export async function fetchJobs(type: string, limit = 5) {
  const { rows } = await query<any>(
    `SELECT * FROM job_queue
     WHERE status='queued' AND scheduled_for <= NOW() AND type=$1
     ORDER BY created_at ASC
     LIMIT $2`,
    [type, limit]
  );
  return rows;
}

export async function markJob(id: string, status: 'processing' | 'done' | 'failed', error?: string): Promise<boolean> {
  if (status === 'processing') {
    const { rows } = await query<{ id: string }>(
      `UPDATE job_queue
       SET status='processing', error_message=NULL, updated_at=NOW(), attempts=attempts+1
       WHERE id=$1 AND status='queued'
       RETURNING id`,
      [id]
    );
    return rows.length > 0;
  }

  const { rows } = await query<{ id: string }>(
    `UPDATE job_queue
     SET status=$2, error_message=$3, updated_at=NOW()
     WHERE id=$1 AND status='processing'
     RETURNING id`,
    [id, status, error ?? null]
  );

  return rows.length > 0;
}
