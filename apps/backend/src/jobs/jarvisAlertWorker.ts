/**
 * Jarvis Alert Worker
 * Roda 2x/dia (08:00 e 16:00).
 * Cruza fontes por todos os tenants e gera alertas cross-source.
 */

import { query } from '../db';
import { runJarvisAlertEngine } from '../services/jarvisAlertEngine';
import { processAlerts } from '../services/jarvisDecisionEngine';
import { notifyEvent } from '../services/notificationService';

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

async function notifyPendingJarvisDecisions(tenantId: string) {
  const decisions = await processAlerts(tenantId, 20).catch(() => []);
  const actionable = decisions.filter((item) => item.autonomy_level >= 2 && item.event.ref_id);
  if (!actionable.length) return;

  const { rows: admins } = await query<{ id: string; email: string | null }>(
    `SELECT eu.id, eu.email
       FROM edro_users eu
       JOIN tenant_users tu ON tu.user_id = eu.id
      WHERE tu.tenant_id = $1::uuid
        AND tu.role IN ('admin', 'manager', 'owner')
      ORDER BY tu.role ASC, eu.created_at ASC
      LIMIT 10`,
    [tenantId],
  ).catch(() => ({ rows: [] as { id: string; email: string | null }[] }));

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
      await notifyPendingJarvisDecisions(tenant_id);
    } catch (err) {
      console.error(`[jarvisAlertWorker] tenant ${tenant_id} failed:`, err);
    }
  }

  if (totalSaved > 0) {
    console.log(`[jarvisAlertWorker] ${totalSaved} novos alertas gerados.`);
  }
}
