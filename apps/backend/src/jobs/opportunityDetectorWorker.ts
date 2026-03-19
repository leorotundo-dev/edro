/**
 * Opportunity Detector Worker
 *
 * Roda 1x/dia às 06:00 BRT (09:00 UTC).
 * Para cada cliente ativo do tenant, detecta oportunidades de conteúdo
 * combinando 5 fontes de dados:
 *   1. Clipping (score > 80, últimos 7 dias)
 *   2. Social Listening (keywords em crescimento > 30%)
 *   3. Calendário (eventos relevantes nos próximos 14 dias)
 *   4. Web Intelligence (Tavily — tendências do setor)
 *   5. Google Trends (search interest para keywords do cliente)
 *
 * Claude analisa as fontes e gera oportunidades com title, description,
 * suggested_action, priority e confidence. Deduplicação por hash.
 *
 * Output: ai_opportunities table, consumido por:
 *   - /admin/intelligence UI
 *   - autoBriefingFromOpportunityWorker (gera briefings prontos das top opportunities)
 *   - planning page por cliente
 */

import { query } from '../db';
import { runOpportunityDetectorForAllClients } from './opportunityDetector';

const MAX_TENANTS_PER_TICK = 3;
let lastRunDate = '';

export async function triggerOpportunityDetectorNow(): Promise<void> {
  lastRunDate = '';
  return runOpportunityDetectorWorkerOnce();
}

export async function runOpportunityDetectorWorkerOnce(): Promise<void> {
  // Self-throttle: 1x/dia às 06:00 BRT (09:00 UTC)
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  const hour = now.getUTCHours();
  if (hour < 9 || hour > 10) return;
  if (lastRunDate === dateKey) return;

  lastRunDate = dateKey;
  console.log('[opportunityDetector] Starting daily run...');

  // Get active tenants (tenants that have at least 1 active client)
  const tenantsRes = await query<{ tenant_id: string }>(
    `SELECT DISTINCT tenant_id FROM clients WHERE status = 'active' OR status IS NULL LIMIT $1`,
    [MAX_TENANTS_PER_TICK],
  );

  if (!tenantsRes.rows.length) {
    console.log('[opportunityDetector] No active tenants found.');
    return;
  }

  let totalOpportunities = 0;
  for (const { tenant_id } of tenantsRes.rows) {
    try {
      console.log(`[opportunityDetector] Running for tenant ${tenant_id}...`);
      await runOpportunityDetectorForAllClients(tenant_id);
      // Count new opportunities created today
      const { rows } = await query<{ count: string }>(
        `SELECT COUNT(*)::int as count FROM ai_opportunities
         WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '1 hour'`,
        [tenant_id],
      );
      const n = parseInt(rows[0]?.count ?? '0');
      totalOpportunities += n;
      console.log(`[opportunityDetector] Tenant ${tenant_id}: ${n} new opportunities`);
    } catch (err: any) {
      console.error(`[opportunityDetector] Error for tenant ${tenant_id}:`, err?.message);
    }
  }

  console.log(`[opportunityDetector] Done: ${totalOpportunities} total new opportunities across ${tenantsRes.rows.length} tenant(s).`);
}
