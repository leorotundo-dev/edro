import { query } from '../db';

export async function isEnabled(tenantId: string, key: string) {
  const { rows } = await query<{ enabled: boolean }>(
    `SELECT enabled FROM feature_flags WHERE tenant_id=$1 AND key=$2`,
    [tenantId, key]
  );
  return Boolean(rows[0]?.enabled);
}
