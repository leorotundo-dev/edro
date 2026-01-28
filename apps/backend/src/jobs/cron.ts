import { performanceProvider } from '../providers';
import { query } from '../db';

export async function runDailyInsightsJob(tenantId?: string | null) {
  const { rows: clients } = await query<any>(
    tenantId ? `SELECT * FROM clients WHERE tenant_id=$1` : `SELECT * FROM clients`,
    tenantId ? [tenantId] : []
  );

  for (const client of clients) {
    const platforms = ['Instagram', 'MetaAds', 'LinkedIn'];

    for (const platform of platforms) {
      try {
        const perf = await performanceProvider.getPerformance({
          client,
          platform: platform as any,
          window: '30d',
        });

        await query(
          `INSERT INTO learned_insights (tenant_id, client_id, platform, time_window, payload)
           VALUES ($1,$2,$3,$4,$5::jsonb)`,
          [client.tenant_id ?? tenantId ?? null, client.id, platform, '30d', JSON.stringify(perf)]
        );
      } catch {
        continue;
      }
    }
  }
}
