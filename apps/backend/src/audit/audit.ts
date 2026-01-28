import { query } from '../db';

export async function audit(params: {
  actor_user_id?: string | null;
  actor_email?: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  before?: any;
  after?: any;
  ip?: string | null;
  user_agent?: string | null;
}) {
  await query(
    `INSERT INTO audit_log (actor_user_id, actor_email, action, entity_type, entity_id, before, after, ip, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8,$9)`,
    [
      params.actor_user_id ?? null,
      params.actor_email ?? null,
      params.action,
      params.entity_type,
      params.entity_id,
      params.before ? JSON.stringify(params.before) : null,
      params.after ? JSON.stringify(params.after) : null,
      params.ip ?? null,
      params.user_agent ?? null,
    ]
  );
}
