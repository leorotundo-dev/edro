/**
 * Monthly Reports Worker
 *
 * Roda todo dia 1 do mês às 06h (auto-throttled).
 * Para cada cliente ativo com tenant_id:
 *   1. Gera PDF do mês anterior via generateClientReportPdf()
 *   2. Salva em storage (S3 ou local)
 *   3. Upserta registro em client_monthly_reports
 *
 * Admin pode triggar manualmente via POST /admin/reports/monthly/generate
 */

import { query } from '../db';
import { saveFile } from '../library/storage';

let lastRun = 0;
const RUN_INTERVAL_MS = 60 * 60 * 1000; // check every hour, run only on day 1

export async function runMonthlyReportsWorkerOnce() {
  const now = new Date();

  // Only run on day 1 of each month
  if (now.getDate() !== 1) return;
  if (now.getHours() < 6) return;

  // Self-throttle: max once per day
  if (Date.now() - lastRun < 23 * 60 * 60 * 1000) return;
  lastRun = Date.now();

  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const month = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;

  console.log(`[monthlyReports] Generating reports for ${month}...`);

  // Fetch all active clients with tenant_id
  const clientsRes = await query<{ id: string; tenant_id: string; name: string }>(
    `SELECT c.id, c.tenant_id, c.name
     FROM clients c
     WHERE c.status = 'active'
       AND c.tenant_id IS NOT NULL
     ORDER BY c.name`,
  );

  const { generateClientReportPdf } = await import('../services/clientReportService');

  let generated = 0;
  for (const client of clientsRes.rows) {
    try {
      // Skip if already generated this month
      const exists = await query(
        `SELECT id FROM client_monthly_reports WHERE client_id = $1 AND period_month = $2`,
        [client.id, month],
      );
      if (exists.rows.length > 0) continue;

      const pdfBuffer = await generateClientReportPdf(client.id, month);
      const key = `reports/${client.tenant_id}/${client.id}/${month}.pdf`;
      await saveFile(pdfBuffer, key);

      const label = prevMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      const title = `Relatório ${label.charAt(0).toUpperCase() + label.slice(1)} — ${client.name}`;

      await query(
        `INSERT INTO client_monthly_reports (tenant_id, client_id, period_month, title, pdf_key)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (client_id, period_month)
         DO UPDATE SET pdf_key = EXCLUDED.pdf_key, generated_at = NOW()`,
        [client.tenant_id, client.id, month, title, key],
      );

      generated++;
      console.log(`[monthlyReports] Generated for ${client.name} (${month})`);
    } catch (err: any) {
      console.error(`[monthlyReports] Failed for ${client.name}:`, err?.message);
    }
  }

  console.log(`[monthlyReports] Done: ${generated}/${clientsRes.rows.length} reports generated for ${month}`);
}

/**
 * Manually generate reports for a specific month (admin trigger).
 * Called from POST /admin/reports/monthly/generate
 */
export async function generateMonthlyReportsForAll(month: string): Promise<{ generated: number; failed: number }> {
  const clientsRes = await query<{ id: string; tenant_id: string; name: string }>(
    `SELECT c.id, c.tenant_id, c.name
     FROM clients c
     WHERE c.status = 'active' AND c.tenant_id IS NOT NULL
     ORDER BY c.name`,
  );

  const { generateClientReportPdf } = await import('../services/clientReportService');
  const [year, mon] = month.split('-').map(Number);
  const prevMonth = new Date(year, mon - 1, 1);
  const label = prevMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  let generated = 0, failed = 0;
  for (const client of clientsRes.rows) {
    try {
      const pdfBuffer = await generateClientReportPdf(client.id, month);
      const key = `reports/${client.tenant_id}/${client.id}/${month}.pdf`;
      await saveFile(pdfBuffer, key);

      const title = `Relatório ${label.charAt(0).toUpperCase() + label.slice(1)} — ${client.name}`;
      await query(
        `INSERT INTO client_monthly_reports (tenant_id, client_id, period_month, title, pdf_key)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (client_id, period_month)
         DO UPDATE SET pdf_key = EXCLUDED.pdf_key, generated_at = NOW()`,
        [client.tenant_id, client.id, month, title, key],
      );
      generated++;
    } catch {
      failed++;
    }
  }
  return { generated, failed };
}

export async function generateMonthlyReportsForTenant(
  tenantId: string,
  month: string,
): Promise<{ generated: number; failed: number }> {
  const clientsRes = await query<{ id: string; tenant_id: string; name: string }>(
    `SELECT c.id, c.tenant_id, c.name
     FROM clients c
     WHERE c.status = 'active'
       AND c.tenant_id = $1
     ORDER BY c.name`,
    [tenantId],
  );

  const { generateClientReportPdf } = await import('../services/clientReportService');
  const [year, mon] = month.split('-').map(Number);
  const prevMonth = new Date(year, mon - 1, 1);
  const label = prevMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  let generated = 0;
  let failed = 0;
  for (const client of clientsRes.rows) {
    try {
      const pdfBuffer = await generateClientReportPdf(client.id, month);
      const key = `reports/${client.tenant_id}/${client.id}/${month}.pdf`;
      await saveFile(pdfBuffer, key);

      const title = `Relatório ${label.charAt(0).toUpperCase() + label.slice(1)} — ${client.name}`;
      await query(
        `INSERT INTO client_monthly_reports (tenant_id, client_id, period_month, title, pdf_key)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (client_id, period_month)
         DO UPDATE SET pdf_key = EXCLUDED.pdf_key, generated_at = NOW()`,
        [client.tenant_id, client.id, month, title, key],
      );
      generated++;
    } catch {
      failed++;
    }
  }

  return { generated, failed };
}
