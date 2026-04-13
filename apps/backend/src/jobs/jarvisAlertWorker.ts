/**
 * Jarvis Alert Worker
 * Roda 2x/dia (08:00 e 16:00).
 * Cruza fontes por todos os tenants e gera alertas cross-source.
 */

import { query } from '../db';
import { runJarvisAlertEngine } from '../services/jarvisAlertEngine';
import { processAlerts } from '../services/jarvisDecisionEngine';
import { notifyEvent } from '../services/notificationService';
import {
  buildSystemHealthSnapshot,
  resolveAutoRepairPlan,
  runSystemRepair,
  SYSTEM_REPAIR_LABELS,
} from '../services/jarvisSystemHealthService';

async function tryFire(triggerKey: string, tenantId: string, metadata: object) {
  try {
    await query(
      `INSERT INTO agent_action_log (tenant_id, trigger_key, metadata)
       VALUES ($1::uuid, $2, $3::jsonb)`,
      [tenantId, triggerKey, JSON.stringify(metadata)],
    );
    return true;
  } catch {
    return false;
  }
}

async function loadAdminRecipients(tenantId: string) {
  const { rows } = await query<{ id: string; email: string | null }>(
    `SELECT eu.id, eu.email
       FROM edro_users eu
       JOIN tenant_users tu ON tu.user_id = eu.id
      WHERE tu.tenant_id = $1::uuid
        AND tu.role IN ('admin', 'manager', 'owner')
      ORDER BY tu.role ASC, eu.created_at ASC
      LIMIT 10`,
    [tenantId],
  ).catch(() => ({ rows: [] as { id: string; email: string | null }[] }));
  return rows;
}

async function notifyPendingJarvisDecisions(tenantId: string) {
  const decisions = await processAlerts(tenantId, 20).catch(() => []);
  const actionable = decisions.filter((item) => item.autonomy_level >= 2 && item.event.ref_id);
  if (!actionable.length) return;

  const admins = await loadAdminRecipients(tenantId);
  const baseUrl = process.env.APP_URL || process.env.WEB_URL || 'https://app.edro.digital';
  for (const decision of actionable) {
    const refId = String(decision.event.ref_id || '').trim();
    if (!refId) continue;
    const fired = await tryFire(`jarvis_alert_notify:${refId}`, tenantId, {
      client_id: decision.event.client_id,
      autonomy_level: decision.autonomy_level,
      category: decision.category,
    });
    if (!fired) continue;

    await Promise.allSettled(admins.map((admin) =>
      notifyEvent({
        event: 'jarvis_alert',
        tenantId,
        userId: admin.id,
        title: decision.event.title,
        body: decision.event.body,
        link: `${baseUrl}/jarvis`,
        recipientEmail: admin.email || undefined,
        defaultChannels: ['in_app'],
        payload: {
          alert_id: refId,
          client_id: decision.event.client_id,
          category: decision.category,
          autonomy_level: decision.autonomy_level,
        },
      }),
    ));
  }
}

async function runAutoRepairs(tenantId: string) {
  const snapshot = await buildSystemHealthSnapshot(tenantId).catch(() => null);
  if (!snapshot || snapshot.summary.open_issues <= 0) return;

  const repairPlan = resolveAutoRepairPlan(snapshot);
  if (!repairPlan.length) return;

  const admins = await loadAdminRecipients(tenantId);
  const baseUrl = process.env.APP_URL || process.env.WEB_URL || 'https://app.edro.digital';
  const bucket = new Date().toISOString().slice(0, 13);

  for (const repairType of repairPlan) {
    const triggerKey = `jarvis_auto_repair:${tenantId}:${repairType}:${bucket}`;
    const claimed = await tryFire(
      triggerKey,
      tenantId,
      { repair_type: repairType, status: snapshot.summary.status },
    );
    if (!claimed) continue;

    try {
      const result = await runSystemRepair(tenantId, repairType, snapshot);
      await query(
        `UPDATE agent_action_log
            SET metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb
          WHERE tenant_id = $1::uuid
            AND trigger_key = $2`,
        [
          tenantId,
          triggerKey,
          JSON.stringify({
            before_summary: result.before_summary,
            after_summary: result.after_summary,
            remaining_issues: result.remaining_issues,
            executed_repairs: result.executed_repairs,
            completed_at: new Date().toISOString(),
          }),
        ],
      ).catch(() => undefined);
      await Promise.allSettled(admins.map((admin) =>
        notifyEvent({
          event: 'jarvis_auto_repair',
          tenantId,
          userId: admin.id,
          title: `Jarvis auto-reparou: ${SYSTEM_REPAIR_LABELS[repairType]}`,
          body: `${result.before_summary.status} -> ${result.after_summary.status}. Restam ${result.remaining_issues.length} issue(s).`,
          link: `${baseUrl}/jarvis`,
          recipientEmail: admin.email || undefined,
          defaultChannels: ['in_app'],
          payload: {
            repair_type: repairType,
            before_summary: result.before_summary,
            after_summary: result.after_summary,
            executed_repairs: result.executed_repairs,
          },
        }),
      ));
    } catch (error: any) {
      console.error(`[jarvisAlertWorker] auto repair ${repairType} failed for tenant ${tenantId}:`, error?.message || error);
    }
  }
}

export async function runJarvisAlertWorkerOnce(): Promise<void> {
  // Reopen snoozed alerts whose snooze has expired
  await query(
    `UPDATE jarvis_alerts SET status = 'open', snoozed_until = null, updated_at = now()
     WHERE status = 'snoozed' AND snoozed_until <= now()`,
    [],
  );

  // Get all active tenants
  const tenantsRes = await query<{ tenant_id: string }>(
    `SELECT DISTINCT tenant_id FROM clients WHERE status = 'active' LIMIT 100`,
    [],
  );

  let totalSaved = 0;
  for (const { tenant_id } of tenantsRes.rows) {
    try {
      const saved = await runJarvisAlertEngine(tenant_id);
      totalSaved += saved;
      await runAutoRepairs(tenant_id);
      await notifyPendingJarvisDecisions(tenant_id);
    } catch (err) {
      console.error(`[jarvisAlertWorker] tenant ${tenant_id} failed:`, err);
    }
  }

  if (totalSaved > 0) {
    console.log(`[jarvisAlertWorker] ${totalSaved} novos alertas gerados.`);
  }
}
