import { query } from '../db';
import { syncReporteiInsightsForClient } from '../services/reporteiInsights';
import { syncClientDeliveredBriefings } from '../services/briefingPostMetricsService';

export async function runDailyInsightsJob(tenantId?: string | null) {
  const { rows: clients } = await query<any>(
    tenantId ? `SELECT * FROM clients WHERE tenant_id=$1` : `SELECT * FROM clients`,
    tenantId ? [tenantId] : []
  );

  for (const client of clients) {
    await syncReporteiInsightsForClient(client, { tenantId });
  }
}

export async function syncDeliveredBriefingMetricsCron(tenantId?: string | null) {
  // Only sync clients that have at least one Reportei connector configured
  const { rows: clients } = await query<any>(
    `SELECT DISTINCT c.id, c.tenant_id FROM clients c
     INNER JOIN connectors cn ON cn.client_id=c.id AND cn.provider='reportei'
     ${tenantId ? 'WHERE c.tenant_id=$1' : ''}
     LIMIT 100`,
    tenantId ? [tenantId] : []
  );

  for (const client of clients) {
    try {
      await syncClientDeliveredBriefings(client.id, client.tenant_id);
    } catch {
      // continue with next client
    }
  }
}
