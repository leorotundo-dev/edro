import { query } from '../db';
import { syncReporteiInsightsForClient } from '../services/reporteiInsights';

export async function runDailyInsightsJob(tenantId?: string | null) {
  const { rows: clients } = await query<any>(
    tenantId ? `SELECT * FROM clients WHERE tenant_id=$1` : `SELECT * FROM clients`,
    tenantId ? [tenantId] : []
  );

  for (const client of clients) {
    await syncReporteiInsightsForClient(client, { tenantId });
  }
}
