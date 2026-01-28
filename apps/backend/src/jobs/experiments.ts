import { performanceProvider } from '../providers';
import { query } from '../db';

function resolveClientProfile(row: any) {
  const profile = row.profile || {};
  return { ...profile, id: row.id, name: row.name, tenant_id: row.tenant_id };
}

export async function runExperimentResultsJob(tenantId?: string | null) {
  const params: any[] = [];
  let where = `WHERE status='running'`;
  if (tenantId) {
    params.push(tenantId);
    where += ` AND tenant_id=$${params.length}`;
  }

  const { rows: experiments } = await query<any>(
    `SELECT * FROM experiments ${where} ORDER BY started_at DESC`,
    params
  );

  for (const exp of experiments) {
    const { rows: clients } = await query<any>(
      `SELECT * FROM clients WHERE id=$1 AND tenant_id=$2`,
      [exp.client_id, exp.tenant_id]
    );
    if (!clients[0]) continue;

    const client = resolveClientProfile(clients[0]);
    let perf = null;
    try {
      perf = await performanceProvider.getPerformance({
        client,
        platform: exp.platform,
        window: '7d',
      });
    } catch {
      perf = null;
    }

    const { rows: variants } = await query<any>(
      `SELECT variant_key FROM experiment_variants WHERE experiment_id=$1`,
      [exp.id]
    );

    for (const v of variants) {
      await query(
        `INSERT INTO experiment_results (experiment_id, variant_key, time_window, metrics)
         VALUES ($1,$2,$3,$4::jsonb)`,
        [exp.id, v.variant_key, '7d', JSON.stringify({ performance: perf, note: 'stub' })]
      );
    }
  }

  return { ok: true, processed: experiments.length };
}
