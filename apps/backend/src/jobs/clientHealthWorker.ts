/**
 * Client Health Worker — Fase 4 do ERP
 *
 * Roda toda segunda-feira. Para cada cliente ativo calcula um score 0–100
 * baseado em 5 fatores ponderados:
 *
 *   30% — Dias médios de atraso em faturas (invoices overdue)
 *   20% — Taxa de revisões de copy (revision requests vs total approvals)
 *   25% — Frequência de novos briefings nos últimos 60 dias
 *   15% — Crescimento de budget de mídia MoM
 *   10% — Percentual de faturas pagas em dia
 *
 * Score < 40 → dispara notificação 'client_risk' via notificationService.
 * Resultados persistidos em client_health_scores (UNIQUE client_id + period_date).
 */

import { pool, query } from '../db';

let lastRunDate: string | null = null;

// ── Scoring helpers ────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

/** Score 0–100 for average invoice delay (0 delay = 100, 30+ days = 0) */
function scoreInvoiceDelay(avgDelayDays: number): number {
  return clamp(100 - avgDelayDays * 3.33, 0, 100);
}

/** Score 0–100 for revision rate (0% = 100, 50%+ = 0) */
function scoreRevisionRate(revisionPct: number): number {
  return clamp(100 - revisionPct * 2, 0, 100);
}

/** Score 0–100 for briefing frequency (10+ in 60d = 100, 0 = 0) */
function scoreBriefingFreq(count: number): number {
  return clamp(count * 10, 0, 100);
}

/** Score 0–100 for media budget growth (+20% MoM = 100, -20% = 0) */
function scoreBudgetGrowth(growthPct: number): number {
  return clamp(50 + growthPct * 2.5, 0, 100);
}

/** Score 0–100 for on-time payment rate */
function scoreOnTimePct(paidOnTimePct: number): number {
  return clamp(paidOnTimePct, 0, 100);
}

// ── Worker ─────────────────────────────────────────────────────────────────────

async function computeHealthScores() {
  // Get all active tenants
  const tenantsRes = await pool.query(`SELECT id FROM tenants`);

  for (const tenant of tenantsRes.rows) {
    const tenantId = tenant.id;

    // Get all active clients for this tenant
    const clientsRes = await pool.query(
      `SELECT id, name FROM clients WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId],
    );

    for (const client of clientsRes.rows) {
      const clientId = client.id;

      try {
        // Factor 1: avg invoice delay (days between due_date and paid_at for overdue)
        const delayRes = await pool.query(
          `SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (paid_at - due_date)) / 86400), 0) AS avg_delay_days
           FROM invoices
           WHERE client_id = $1 AND status = 'paid' AND due_date IS NOT NULL AND paid_at > due_date
             AND created_at > NOW() - INTERVAL '90 days'`,
          [clientId],
        );
        const avgDelayDays = parseFloat(delayRes.rows[0].avg_delay_days) || 0;

        // Factor 2: revision rate (thread messages from client vs total thread entries)
        const threadRes = await pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE cat.author_type = 'client' AND cat.message NOT ILIKE '✓%') AS revisions,
             COUNT(*) FILTER (WHERE cat.author_type = 'client' AND cat.message ILIKE '✓%') AS approvals
           FROM copy_approval_thread cat
           JOIN edro_briefings b ON b.id = cat.briefing_id
           WHERE (b.main_client_id = $1 OR b.client_id = $1)
             AND cat.created_at > NOW() - INTERVAL '60 days'`,
          [clientId],
        );
        const revisions = parseInt(threadRes.rows[0].revisions) || 0;
        const approvals = parseInt(threadRes.rows[0].approvals) || 0;
        const totalApprovals = approvals + revisions;
        const revisionPct = totalApprovals > 0 ? (revisions / totalApprovals) * 100 : 0;

        // Factor 3: briefing frequency in last 60 days
        const briefFreqRes = await pool.query(
          `SELECT COUNT(*) AS cnt FROM edro_briefings
           WHERE (main_client_id = $1 OR client_id = $1)
             AND created_at > NOW() - INTERVAL '60 days'`,
          [clientId],
        );
        const briefCount = parseInt(briefFreqRes.rows[0].cnt) || 0;

        // Factor 4: media budget growth MoM
        const curMonth = new Date().toISOString().slice(0, 7);
        const prevDate = new Date();
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevMonth = prevDate.toISOString().slice(0, 7);

        const budgetRes = await pool.query(
          `SELECT period_month, SUM(planned_brl) AS total
           FROM media_budgets
           WHERE client_id = $1 AND period_month IN ($2, $3)
           GROUP BY period_month`,
          [clientId, curMonth, prevMonth],
        );
        const budgetByMonth: Record<string, number> = {};
        for (const row of budgetRes.rows) {
          budgetByMonth[row.period_month] = parseFloat(row.total) || 0;
        }
        const curBudget = budgetByMonth[curMonth] || 0;
        const prevBudget = budgetByMonth[prevMonth] || 0;
        const growthPct = prevBudget > 0 ? ((curBudget - prevBudget) / prevBudget) * 100 : 0;

        // Factor 5: on-time payment rate
        const paymentRes = await pool.query(
          `SELECT
             COUNT(*) FILTER (WHERE status = 'paid' AND (paid_at <= due_date OR due_date IS NULL)) AS on_time,
             COUNT(*) FILTER (WHERE status IN ('paid', 'overdue')) AS total
           FROM invoices
           WHERE client_id = $1 AND created_at > NOW() - INTERVAL '90 days'`,
          [clientId],
        );
        const onTime = parseInt(paymentRes.rows[0].on_time) || 0;
        const totalInv = parseInt(paymentRes.rows[0].total) || 0;
        const onTimePct = totalInv > 0 ? (onTime / totalInv) * 100 : 100; // default 100 if no invoices

        // Compute weighted score
        const s1 = scoreInvoiceDelay(avgDelayDays)  * 0.30;
        const s2 = scoreRevisionRate(revisionPct)   * 0.20;
        const s3 = scoreBriefingFreq(briefCount)    * 0.25;
        const s4 = scoreBudgetGrowth(growthPct)     * 0.15;
        const s5 = scoreOnTimePct(onTimePct)        * 0.10;
        const score = Math.round(s1 + s2 + s3 + s4 + s5);

        const factors = {
          invoice_delay_days: avgDelayDays,
          revision_pct: revisionPct,
          briefings_60d: briefCount,
          budget_growth_pct: growthPct,
          on_time_pct: onTimePct,
          scores: { s1, s2, s3, s4, s5 },
        };

        // Determine trend (compare with last score)
        const prevScoreRes = await pool.query(
          `SELECT score FROM client_health_scores
           WHERE client_id = $1 ORDER BY period_date DESC LIMIT 1`,
          [clientId],
        );
        let trend: 'up' | 'stable' | 'down' = 'stable';
        if (prevScoreRes.rows.length) {
          const prev = prevScoreRes.rows[0].score;
          if (score > prev + 5) trend = 'up';
          else if (score < prev - 5) trend = 'down';
        }

        // Upsert
        const today = new Date().toISOString().slice(0, 10);
        await pool.query(
          `INSERT INTO client_health_scores (tenant_id, client_id, period_date, score, factors, trend)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (client_id, period_date)
           DO UPDATE SET score = EXCLUDED.score, factors = EXCLUDED.factors, trend = EXCLUDED.trend`,
          [tenantId, clientId, today, score, JSON.stringify(factors), trend],
        );

        // Alert if score < 40
        if (score < 40) {
          // Dedup: only fire once per day per client
          try {
            await pool.query(
              `INSERT INTO agent_action_log (tenant_id, trigger_key, metadata)
               VALUES ($1, $2, $3)`,
              [tenantId, `client_risk:${clientId}`, JSON.stringify({ score, client_name: client.name })],
            );

            // Fire notification to tenant admins (best-effort)
            const { notifyEvent } = await import('../services/notificationService');
            const admins = await pool.query(
              `SELECT eu.id, eu.email FROM edro_users eu
               JOIN tenant_users tu ON tu.user_id = eu.id
               WHERE tu.tenant_id = $1 AND tu.role IN ('admin', 'owner') LIMIT 5`,
              [tenantId],
            );
            await Promise.allSettled(admins.rows.map((a) =>
              notifyEvent({
                event: 'client_risk',
                tenantId,
                userId: a.id,
                title: `Cliente em risco: ${client.name}`,
                body: `Score ${score}/100 (${trend})`,
                recipientEmail: a.email,
                payload: { clientId, score, trend },
              }),
            ));
          } catch {
            // Dedup index blocks duplicate — already fired today
          }
        }
      } catch (err: any) {
        console.error(`[clientHealth] error for client ${clientId}:`, err?.message);
      }
    }
  }
}

// ── Entry point ────────────────────────────────────────────────────────────────

export async function runClientHealthWorkerOnce() {
  // Run only on Mondays (day === 1)
  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);

  if (now.getDay() !== 1) return;
  if (lastRunDate === dateKey) return;  // already ran today

  lastRunDate = dateKey;
  console.log('[clientHealth] computing client health scores...');
  try {
    await computeHealthScores();
    console.log('[clientHealth] done');
  } catch (err: any) {
    console.error('[clientHealth] failed:', err?.message);
  }
}
