/**
 * Group Deadline Alert Worker.
 * Sends WhatsApp alerts to groups when linked briefings have upcoming deadlines.
 * Runs every tick but self-throttles to 09:00, 14:00, 18:00 BRT.
 */

import { query } from '../db';
import { sendOutboundMessage } from '../services/groupOutboundService';

let running = false;

const ALERT_HOURS_BRT = [9, 14, 18];
let lastRunHourBrt = -1;

export async function runGroupDeadlineAlertWorkerOnce(): Promise<void> {
  if (running) return;

  // Self-throttle: only run at 09, 14, 18 BRT
  const nowBrt = new Date(Date.now() - 3 * 3600000);
  const hourBrt = nowBrt.getUTCHours();
  if (!ALERT_HOURS_BRT.includes(hourBrt)) return;
  if (lastRunHourBrt === hourBrt) return;

  running = true;
  try {
    lastRunHourBrt = hourBrt;
    await processDeadlineAlerts();
  } finally {
    running = false;
  }
}

async function processDeadlineAlerts(): Promise<void> {
  // Find briefings with due_at in the next 24h, not done/cancelled
  const { rows: briefings } = await query(
    `SELECT b.id, b.title, b.due_at, b.status,
            b.main_client_id AS client_id,
            c.tenant_id,
            c.name AS client_name
     FROM edro_briefings b
     JOIN clients c ON c.id = b.main_client_id
     WHERE b.due_at IS NOT NULL
       AND b.main_client_id IS NOT NULL
       AND b.due_at > NOW()
       AND b.due_at < NOW() + INTERVAL '24 hours'
       AND b.status NOT IN ('done', 'archived', 'cancelled', 'approved')
     ORDER BY b.due_at ASC
     LIMIT 20`,
  );

  if (!briefings.length) return;

  for (const b of briefings) {
    try {
      await sendDeadlineAlert(b);
    } catch (err: any) {
      console.error(`[groupDeadlineAlert] Error for briefing ${b.id}: ${err.message}`);
    }
  }
}

async function sendDeadlineAlert(briefing: any): Promise<void> {
  const { client_id: clientId, tenant_id: tenantId, title, due_at, client_name: clientName } = briefing;
  if (!clientId || !tenantId) return;

  // Find groups linked to this client with deadline alerts enabled
  const { rows: groups } = await query(
    `SELECT g.id, g.group_jid
     FROM whatsapp_groups g
     WHERE g.client_id = $1 AND g.tenant_id = $2
       AND g.active = true AND g.notify_deadlines = true`,
    [clientId, tenantId],
  );

  if (!groups.length) return;

  const dueDate = new Date(due_at);
  const hoursLeft = Math.round((dueDate.getTime() - Date.now()) / 3600000);
  const dateStr = dueDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  const messageText = `⏰ *Alerta de Prazo*\n\n📋 *${title}*\n🏢 ${clientName}\n📅 Entrega: ${dateStr}\n⏳ Faltam: ${hoursLeft}h`;

  const triggerKey = `deadline_alert:${briefing.id}:${dueDate.toISOString().slice(0, 10)}`;
  const bypassQuietHours = hoursLeft <= 2;

  for (const g of groups) {
    await sendOutboundMessage({
      tenantId,
      groupId: g.id,
      groupJid: g.group_jid,
      clientId,
      scenario: 'deadline_alert',
      triggerKey: `${triggerKey}:${g.id}`,
      messageText,
      bypassQuietHours,
    }).catch(() => {});
  }
}
