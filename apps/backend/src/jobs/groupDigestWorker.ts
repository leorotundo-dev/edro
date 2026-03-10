/**
 * Group Digest Worker.
 * Generates daily digests at 08:00 and weekly digests on Mondays.
 * Self-throttled: checks time before running.
 */

import { query } from '../db';
import { generateDigest } from '../services/groupDigestService';

let running = false;
let lastDailyRun = '';
let lastWeeklyRun = '';

function isEnabled(): boolean {
  const flag = process.env.GROUP_DIGEST_ENABLED;
  if (flag === undefined) return true;
  return flag === 'true' || flag === '1';
}

export async function runGroupDigestWorkerOnce(): Promise<void> {
  if (!isEnabled() || running) return;

  const now = new Date();
  const hour = now.getUTCHours() - 3; // BRT = UTC-3
  const adjustedHour = hour < 0 ? hour + 24 : hour;
  const dayKey = now.toISOString().slice(0, 10);
  const isMonday = now.getDay() === 1;

  // Only run daily digest around 08:00 BRT
  const shouldRunDaily = adjustedHour >= 8 && adjustedHour < 9 && lastDailyRun !== dayKey;
  // Weekly: Monday 08:00-09:00
  const weekKey = `${dayKey}-weekly`;
  const shouldRunWeekly = isMonday && adjustedHour >= 8 && adjustedHour < 9 && lastWeeklyRun !== weekKey;

  if (!shouldRunDaily && !shouldRunWeekly) return;

  running = true;
  try {
    // Find clients with notify_jarvis groups that have recent messages
    const { rows: clients } = await query<{ tenant_id: string; client_id: string }>(
      `SELECT DISTINCT g.tenant_id, g.client_id
       FROM whatsapp_groups g
       WHERE g.notify_jarvis = true
         AND g.client_id IS NOT NULL
         AND g.active = true
         AND g.last_message_at > NOW() - INTERVAL '7 days'`,
    );

    for (const { tenant_id, client_id } of clients) {
      try {
        if (shouldRunDaily) {
          await generateDigest(tenant_id, client_id, 'daily');
        }
        if (shouldRunWeekly) {
          await generateDigest(tenant_id, client_id, 'weekly');
        }
      } catch (err: any) {
        console.error(`[groupDigest] failed for client ${client_id}: ${err.message}`);
      }
    }

    if (shouldRunDaily) {
      lastDailyRun = dayKey;
      console.log(`[groupDigest] daily digests generated for ${clients.length} clients`);
    }
    if (shouldRunWeekly) {
      lastWeeklyRun = weekKey;
      console.log(`[groupDigest] weekly digests generated for ${clients.length} clients`);
    }
  } finally {
    running = false;
  }
}
