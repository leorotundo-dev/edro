/**
 * DA Billing Service — Jarvis Bedel
 *
 * Calcula cobrança por job concluído, controla slots de capacidade semanal,
 * e gera extrato mensal por freelancer.
 */

import { query } from '../db';

// ─── Types ────────────────────────────────────────────────────────────────────

export type JobSize = 'P' | 'M' | 'G';

export interface BillingRate {
  id: string;
  freelancer_id: string;
  job_size: JobSize;
  rate_cents: number;
  currency: string;
  effective_from: string;
}

export interface BillingEntry {
  id: string;
  freelancer_id: string;
  job_id: string;
  job_size: JobSize;
  rate_cents: number;
  status: 'pending' | 'approved' | 'paid' | 'disputed';
  period_month: string;
  created_at: string;
}

export interface CapacitySlot {
  freelancer_id: string;
  week_start: string;
  slots_total: number;
  slots_used: number;
  slots_blocked: number;
  slots_available: number;
}

// ─── Rates ────────────────────────────────────────────────────────────────────

export async function getFreelancerRates(
  freelancerId: string,
  tenantId: string,
): Promise<BillingRate[]> {
  const { rows } = await query<BillingRate>(
    `SELECT id, freelancer_id, job_size, rate_cents, currency, effective_from::text
     FROM da_billing_rates
     WHERE freelancer_id = $1 AND tenant_id = $2
     ORDER BY job_size, effective_from DESC`,
    [freelancerId, tenantId],
  );
  return rows;
}

export async function upsertFreelancerRate(
  tenantId: string,
  freelancerId: string,
  jobSize: JobSize,
  rateCents: number,
  effectiveFrom?: string,
  notes?: string,
): Promise<BillingRate> {
  const from = effectiveFrom ?? new Date().toISOString().slice(0, 10);
  const { rows } = await query<BillingRate>(
    `INSERT INTO da_billing_rates (tenant_id, freelancer_id, job_size, rate_cents, effective_from, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, freelancer_id, job_size, effective_from)
     DO UPDATE SET rate_cents = EXCLUDED.rate_cents, notes = EXCLUDED.notes, updated_at = now()
     RETURNING id, freelancer_id, job_size, rate_cents, currency, effective_from::text`,
    [tenantId, freelancerId, jobSize, rateCents, from, notes ?? null],
  );
  return rows[0];
}

/** Gets the most recent applicable rate for a freelancer+size on a given date. */
async function getApplicableRate(
  freelancerId: string,
  tenantId: string,
  jobSize: JobSize,
  onDate: string,
): Promise<number> {
  const { rows } = await query<{ rate_cents: number }>(
    `SELECT rate_cents FROM da_billing_rates
     WHERE freelancer_id = $1 AND tenant_id = $2 AND job_size = $3
       AND effective_from <= $4
     ORDER BY effective_from DESC
     LIMIT 1`,
    [freelancerId, tenantId, jobSize, onDate],
  );
  return rows[0]?.rate_cents ?? 0;
}

// ─── Billing Entries ──────────────────────────────────────────────────────────

/**
 * Auto-creates a billing entry when a job is marked as 'concluido'.
 * Called from jobs.ts route after status update.
 */
export async function createBillingEntryForJob(
  tenantId: string,
  jobId: string,
  freelancerId: string,
  jobSize: JobSize,
): Promise<BillingEntry | null> {
  const today = new Date().toISOString().slice(0, 10);
  const periodMonth = today.slice(0, 7); // 'YYYY-MM'

  const rateCents = await getApplicableRate(freelancerId, tenantId, jobSize, today);
  if (rateCents === 0) return null; // no rate configured — skip

  const { rows } = await query<BillingEntry>(
    `INSERT INTO da_billing_entries
       (tenant_id, freelancer_id, job_id, job_size, rate_cents, period_month)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (job_id, freelancer_id) DO NOTHING
     RETURNING id, freelancer_id, job_id, job_size, rate_cents, status, period_month, created_at`,
    [tenantId, freelancerId, jobId, jobSize, rateCents, periodMonth],
  );
  return rows[0] ?? null;
}

export async function getFreelancerBillingEntries(
  freelancerId: string,
  tenantId: string,
  periodMonth?: string,
): Promise<Array<BillingEntry & { job_title: string; client_name: string }>> {
  const whereMonth = periodMonth ? `AND de.period_month = $3` : '';
  const params: any[] = [freelancerId, tenantId];
  if (periodMonth) params.push(periodMonth);

  const { rows } = await query(
    `SELECT de.*, j.title AS job_title, c.name AS client_name
     FROM da_billing_entries de
     JOIN edro_jobs j ON j.id = de.job_id
     LEFT JOIN clients c ON c.id = j.client_id
     WHERE de.freelancer_id = $1 AND de.tenant_id = $2
     ${whereMonth}
     ORDER BY de.created_at DESC`,
    params,
  );
  return rows as any[];
}

/** Summary for admin: total pending, approved, paid per period. */
export async function getBillingPeriodSummary(
  tenantId: string,
  periodMonth: string,
): Promise<Array<{ freelancer_id: string; name: string; total_cents: number; status: string; count: number }>> {
  const { rows } = await query(
    `SELECT de.freelancer_id,
            COALESCE(u.full_name, u.email) AS name,
            de.status,
            SUM(de.rate_cents) AS total_cents,
            COUNT(*) AS count
     FROM da_billing_entries de
     JOIN edro_users u ON u.id = de.freelancer_id
     WHERE de.tenant_id = $1 AND de.period_month = $2
     GROUP BY de.freelancer_id, u.full_name, u.email, de.status
     ORDER BY name, de.status`,
    [tenantId, periodMonth],
  );
  return rows as any[];
}

export async function approveBillingEntry(
  entryId: string,
  tenantId: string,
  approvedBy: string,
): Promise<void> {
  await query(
    `UPDATE da_billing_entries
     SET status = 'approved', approved_at = now(), approved_by = $3, updated_at = now()
     WHERE id = $1 AND tenant_id = $2 AND status = 'pending'`,
    [entryId, tenantId, approvedBy],
  );
}

export async function markBillingEntryPaid(entryId: string, tenantId: string): Promise<void> {
  await query(
    `UPDATE da_billing_entries
     SET status = 'paid', paid_at = now(), updated_at = now()
     WHERE id = $1 AND tenant_id = $2 AND status = 'approved'`,
    [entryId, tenantId],
  );
}

// ─── Capacity Slots ───────────────────────────────────────────────────────────

/** Returns the Monday of the ISO week containing the given date. */
function toWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

export async function getWeeklyCapacity(
  tenantId: string,
  weekStart?: string,
): Promise<CapacitySlot[]> {
  const week = weekStart ?? toWeekStart(new Date());

  const { rows } = await query<{
    freelancer_id: string;
    week_start: string;
    slots_total: number;
    slots_used: number;
    slots_blocked: number;
  }>(
    `SELECT s.freelancer_id, s.week_start::text, s.slots_total, s.slots_used, s.slots_blocked
     FROM da_capacity_slots s
     WHERE s.tenant_id = $1 AND s.week_start = $2`,
    [tenantId, week],
  );

  return rows.map((r) => ({
    ...r,
    slots_available: Math.max(0, r.slots_total - r.slots_used - r.slots_blocked),
  }));
}

/**
 * Ensures a capacity slot row exists for the given freelancer + week,
 * then increments slots_used by 1. Called when a job is assigned.
 */
export async function consumeCapacitySlot(
  tenantId: string,
  freelancerId: string,
  week?: string,
): Promise<void> {
  const weekStart = week ?? toWeekStart(new Date());

  // Upsert row then increment
  await query(
    `INSERT INTO da_capacity_slots (tenant_id, freelancer_id, week_start)
     VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, freelancer_id, week_start) DO NOTHING`,
    [tenantId, freelancerId, weekStart],
  );

  await query(
    `UPDATE da_capacity_slots
     SET slots_used = slots_used + 1, updated_at = now()
     WHERE tenant_id = $1 AND freelancer_id = $2 AND week_start = $3`,
    [tenantId, freelancerId, weekStart],
  );
}

export async function releaseCapacitySlot(
  tenantId: string,
  freelancerId: string,
  week?: string,
): Promise<void> {
  const weekStart = week ?? toWeekStart(new Date());
  await query(
    `UPDATE da_capacity_slots
     SET slots_used = GREATEST(0, slots_used - 1), updated_at = now()
     WHERE tenant_id = $1 AND freelancer_id = $2 AND week_start = $3`,
    [tenantId, freelancerId, weekStart],
  );
}

/**
 * Returns available DAs ranked by capacity for the current week,
 * filtered by required skill. Used by the auto-allocation suggestion.
 */
export async function getAvailableDAs(
  tenantId: string,
  requiredSkill?: string,
): Promise<Array<{ freelancer_id: string; name: string; slots_available: number; score: number }>> {
  const weekStart = toWeekStart(new Date());

  // Ensure slots exist for all active DAs this week
  await query(
    `INSERT INTO da_capacity_slots (tenant_id, freelancer_id, week_start)
     SELECT $1, u.id, $3
     FROM edro_users u
     WHERE u.tenant_id = $1
       AND u.role = 'freelancer'
       AND u.is_active = true
     ON CONFLICT (tenant_id, freelancer_id, week_start) DO NOTHING`,
    [tenantId, requiredSkill ?? null, weekStart],
  );

  const skillFilter = requiredSkill
    ? `AND (u.skills @> $3::jsonb OR u.skills IS NULL)`
    : '';
  const params: any[] = [tenantId, weekStart];
  if (requiredSkill) params.push(JSON.stringify([requiredSkill]));

  const { rows } = await query(
    `SELECT
       s.freelancer_id,
       COALESCE(u.full_name, u.email) AS name,
       GREATEST(0, s.slots_total - s.slots_used - s.slots_blocked) AS slots_available,
       COALESCE(u.allocation_score, 50) AS score
     FROM da_capacity_slots s
     JOIN edro_users u ON u.id = s.freelancer_id
     WHERE s.tenant_id = $1 AND s.week_start = $2
       AND GREATEST(0, s.slots_total - s.slots_used - s.slots_blocked) > 0
       ${skillFilter}
     ORDER BY slots_available DESC, score DESC
     LIMIT 10`,
    params,
  );
  return rows as any[];
}
