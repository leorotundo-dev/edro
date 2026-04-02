/**
 * jarvisCreationWorker.ts
 *
 * Closes the Jarvis "loop de produção autônoma":
 *   Gatilho → Conceito → Copy → Arte → Handoff para aprovação
 *
 * Runs 1x/day ~09:00.
 * For each CRIACAO-level decision from the Decision Engine:
 *   1. Creates a skeleton edro_briefing (status='draft', source='jarvis_auto')
 *   2. Runs jarvisExecutor → generates conceito + copy + visual brief + arte
 *   3. Saves copy variants and concept into the briefing payload
 *   4. Marks alert as actioned
 *   5. Notifies account manager: "Proposta pronta — 1 clique para aprovar"
 *
 * Safety limits:
 *   - Max 2 autonomous creations per tenant per day
 *   - Requires client_id in the alert (skips global alerts)
 *   - Skips if client already has a jarvis_auto draft from today
 */

import { query } from '../db';
import { notifyEvent } from '../services/notificationService';
import { processAlerts } from '../services/jarvisDecisionEngine';

const MAX_PER_DAY = 2;
const AUTONOMY_THRESHOLD = 3; // CRIACAO level

let lastRunDate = '';

export async function triggerJarvisCreationNow(): Promise<void> {
  lastRunDate = '';
  return runJarvisCreationWorkerOnce();
}

export async function runJarvisCreationWorkerOnce(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const hour = new Date().getHours();

  // Time gate: only run between 08:00 and 10:00
  if (lastRunDate === today) return;
  if (hour < 8 || hour > 10) return;
  lastRunDate = today;

  // Fetch all open tenants
  const { rows: tenants } = await query<{ id: string }>(
    `SELECT DISTINCT tenant_id::text AS id FROM jarvis_alerts WHERE status = 'open'`,
  );

  for (const tenant of tenants) {
    await runForTenant(tenant.id);
  }
}

async function runForTenant(tenantId: string): Promise<void> {
  // Anti-fatigue: skip if already created 2+ today
  const { rows: todayCreated } = await query<{ cnt: string }>(
    `SELECT COUNT(*)::text AS cnt FROM edro_briefings
     WHERE tenant_id = $1 AND source = 'jarvis_auto'
       AND created_at >= CURRENT_DATE`,
    [tenantId],
  ).catch(() => ({ rows: [{ cnt: '0' }] }));
  if (parseInt(todayCreated[0]?.cnt ?? '0', 10) >= MAX_PER_DAY) return;

  // Get classified decisions for this tenant
  const decisions = await processAlerts(tenantId, 20).catch(() => [] as any[]);
  const createTargets = decisions
    .filter((d: any) => d.autonomy_level >= AUTONOMY_THRESHOLD && d.client_id)
    .slice(0, MAX_PER_DAY);

  if (!createTargets.length) return;

  // Load jarvisExecutor lazily to avoid circular deps at boot
  const { runJarvisExecutor } = await import('../services/jarvisExecutor') as any;

  for (const decision of createTargets) {
    await processOneDecision(tenantId, decision, runJarvisExecutor);
  }
}

async function processOneDecision(
  tenantId: string,
  decision: any,
  runJarvisExecutor: any,
): Promise<void> {
  const clientId: string = decision.client_id;

  // Check if client already has a draft auto-generated today
  const { rows: existing } = await query<{ id: string }>(
    `SELECT id FROM edro_briefings
     WHERE tenant_id = $1 AND main_client_id = $2
       AND source = 'jarvis_auto' AND created_at >= CURRENT_DATE
     LIMIT 1`,
    [tenantId, clientId],
  ).catch(() => ({ rows: [] }));
  if (existing.length > 0) return;

  // Infer briefing fields from alert context
  const alertTitle: string = decision.title ?? 'Pauta Auto-Gerada pelo Jarvis';
  const platform: string | null = decision.source === 'clipping' ? 'instagram'
    : decision.source === 'competitors' ? 'instagram'
    : null;

  // 1. Create skeleton briefing
  const { rows: briefingRows } = await query<{ id: string; title: string }>(
    `INSERT INTO edro_briefings
       (tenant_id, main_client_id, title, status, source, payload, created_by)
     VALUES ($1, $2, $3, 'draft', 'jarvis_auto', $4::jsonb, 'system')
     RETURNING id, title`,
    [
      tenantId,
      clientId,
      alertTitle,
      JSON.stringify({
        objective: decision.body ?? alertTitle,
        platform: platform ?? 'instagram',
        auto_generated: true,
        jarvis_creation: true,
        source_alert_id: decision.ref_id ?? null,
        decision_weight: decision.weight,
        decision_category: decision.category,
      }),
    ],
  );

  const briefingId = briefingRows[0]?.id;
  if (!briefingId) return;

  // 2. Run full executor pipeline (conceito → copy → arte)
  let executorResult: any = null;
  try {
    executorResult = await runJarvisExecutor({
      briefingId,
      clientId,
      tenantId,
      platform: platform ?? undefined,
      skipArte: false,
    });
  } catch (err: any) {
    console.warn(`[jarvisCreationWorker] executor failed for briefing ${briefingId}:`, err?.message);
    // Briefing still exists as skeleton — not ideal but not a rollback
    return;
  }

  // 3. Enrich briefing payload with executor results
  const enriched = {
    objective: decision.body ?? alertTitle,
    platform: platform ?? 'instagram',
    auto_generated: true,
    jarvis_creation: true,
    source_alert_id: decision.ref_id ?? null,
    decision_weight: decision.weight,
    decision_category: decision.category,
    // Executor results
    conceito: executorResult.conceito?.chosen ?? null,
    visual_brief: executorResult.visual_brief ?? null,
    copy_variants: executorResult.copy?.variants ?? [],
    arte_url: executorResult.arte?.imageUrl ?? null,
    sources_used: executorResult.sources_used ?? [],
    duration_ms: executorResult.duration_ms ?? 0,
  };

  await query(
    `UPDATE edro_briefings SET payload = $1::jsonb, updated_at = now() WHERE id = $2`,
    [JSON.stringify(enriched), briefingId],
  ).catch(() => {});

  // 4. Mark alert as actioned (non-fatal)
  if (decision.ref_id) {
    await query(
      `UPDATE jarvis_alerts SET status = 'actioned', updated_at = now() WHERE id = $1`,
      [decision.ref_id],
    ).catch(() => {});
  }

  // 5. Notify account manager
  try {
    const [clientRes, amRes] = await Promise.all([
      query<{ name: string }>(`SELECT name FROM clients WHERE id = $1 LIMIT 1`, [clientId]),
      query<{ id: string; email: string }>(
        `SELECT id, email FROM users WHERE tenant_id = $1 AND role IN ('admin','account_manager') ORDER BY created_at ASC LIMIT 1`,
        [tenantId],
      ),
    ]);
    const clientName = clientRes.rows[0]?.name ?? 'Cliente';
    const am = amRes.rows[0];
    if (am) {
      const headline = executorResult.conceito?.chosen?.headline_concept ?? alertTitle;
      await notifyEvent({
        event: 'jarvis_creation',
        tenantId,
        userId: am.id,
        title: `Proposta pronta — ${clientName}`,
        body: `"${headline}" · 1 clique para aprovar`,
        link: `/studio/brief?id=${briefingId}`,
        recipientEmail: am.email,
        payload: { briefing_id: briefingId, client_id: clientId, has_arte: !!executorResult.arte?.imageUrl },
      });
    }
  } catch {
    // Notification failure is non-fatal
  }
}
