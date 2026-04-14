import { query } from '../db';

export async function enqueueJob(
  tenant_id: string,
  type: string,
  payload: any,
  options?: { scheduledFor?: Date | string },
) {
  const scheduledFor =
    options?.scheduledFor instanceof Date
      ? options.scheduledFor.toISOString()
      : options?.scheduledFor ?? null;

  const { rows } = await query<any>(
    `INSERT INTO job_queue (tenant_id, type, payload, scheduled_for)
     VALUES ($1,$2,$3::jsonb, COALESCE($4::timestamptz, NOW()))
     RETURNING *`,
    [tenant_id, type, JSON.stringify(payload), scheduledFor]
  );
  return rows[0];
}

export async function fetchJobs(type: string, limit = 5) {
  const { rows } = await query<any>(
    `UPDATE job_queue
     SET status='processing', updated_at=NOW(), attempts=attempts+1
     WHERE id IN (
       SELECT id FROM job_queue
       WHERE status='queued' AND scheduled_for <= NOW() AND type=$1
       ORDER BY created_at ASC
       LIMIT $2
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [type, limit]
  );
  return rows;
}

export async function getJobById(id: string, tenantId: string) {
  const { rows } = await query<any>(
    `SELECT * FROM job_queue WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [id, tenantId]
  );
  return rows[0] ?? null;
}

export async function mergeJobPayload(id: string, patch: Record<string, any>): Promise<boolean> {
  const { rows } = await query<{ id: string }>(
    `UPDATE job_queue
     SET payload = COALESCE(payload, '{}'::jsonb) || $2::jsonb,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id`,
    [id, JSON.stringify(patch)]
  );
  return rows.length > 0;
}

export async function rescheduleJob(
  id: string,
  scheduledFor: Date | string,
  patch?: Record<string, any>,
): Promise<boolean> {
  const scheduledAt =
    scheduledFor instanceof Date
      ? scheduledFor.toISOString()
      : String(scheduledFor || '').trim();
  if (!scheduledAt) return false;

  const { rows } = await query<{ id: string }>(
    `UPDATE job_queue
     SET status='queued',
         error_message=NULL,
         scheduled_for=$2::timestamptz,
         payload = CASE
           WHEN $3::jsonb IS NULL THEN payload
           ELSE COALESCE(payload, '{}'::jsonb) || $3::jsonb
         END,
         updated_at=NOW()
     WHERE id = $1
       AND status='processing'
     RETURNING id`,
    [id, scheduledAt, patch ? JSON.stringify(patch) : null],
  );

  return rows.length > 0;
}

export async function markJob(id: string, status: 'processing' | 'done' | 'failed', error?: string): Promise<boolean> {
  if (status === 'processing') {
    // Accept both 'queued' and 'processing' so fetchJobs (which already marks atomically)
    // and legacy markJob callers both work correctly without double-increment attempts.
    const { rows } = await query<{ id: string }>(
      `UPDATE job_queue
       SET status='processing', error_message=NULL, updated_at=NOW()
       WHERE id=$1 AND status IN ('queued', 'processing')
       RETURNING id`,
      [id]
    );
    return rows.length > 0;
  }

  const normalizedError = error ? String(error).slice(0, 500) : null;
  const { rows } = await query<{ id: string }>(
    `UPDATE job_queue
     SET status=$2, error_message=$3, updated_at=NOW()
     WHERE id=$1 AND status='processing'
     RETURNING id`,
    [id, status, normalizedError]
  );

  return rows.length > 0;
}
