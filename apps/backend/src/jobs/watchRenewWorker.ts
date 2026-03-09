/**
 * Watch Renewal Worker
 *
 * Runs once per day. Finds Gmail and Google Calendar watch channels
 * expiring within 2 days and renews them automatically.
 *
 * Without this, both Gmail Pub/Sub watch (7 days) and Calendar push
 * channels (6 days) expire silently and stop delivering notifications.
 */

import { query } from '../db';
import { watchGmailInbox } from '../services/integrations/gmailService';
import { watchCalendar } from '../services/integrations/googleCalendarService';

let running = false;
let lastRunDate = '';

export async function runWatchRenewWorkerOnce(): Promise<void> {
  if (running) return;
  const today = new Date().toISOString().slice(0, 10);
  if (lastRunDate === today) return;
  running = true;

  try {
    await renewGmailWatches();
    await renewCalendarWatches();
    lastRunDate = today;
  } catch (err: any) {
    console.error('[watchRenew] Worker failed:', err.message);
  } finally {
    running = false;
  }
}

async function renewGmailWatches(): Promise<void> {
  const { rows } = await query<{ tenant_id: string; email_address: string }>(
    `SELECT tenant_id, email_address
     FROM gmail_connections
     WHERE refresh_token IS NOT NULL
       AND (watch_expiry IS NULL OR watch_expiry < NOW() + INTERVAL '2 days')`,
  ).catch(() => ({ rows: [] as any[] }));

  if (!rows.length) return;
  console.log(`[watchRenew] Renewing ${rows.length} Gmail watch(es)`);

  for (const row of rows) {
    try {
      await watchGmailInbox(row.tenant_id);
      console.log(`[watchRenew] Gmail renewed for ${row.email_address}`);
    } catch (err: any) {
      console.error(`[watchRenew] Gmail renewal failed for ${row.email_address}:`, err.message);
    }
  }
}

async function renewCalendarWatches(): Promise<void> {
  const { rows } = await query<{ tenant_id: string; email_address: string }>(
    `SELECT tenant_id, email_address
     FROM google_calendar_channels
     WHERE refresh_token IS NOT NULL
       AND (expires_at IS NULL OR expires_at < NOW() + INTERVAL '2 days')`,
  ).catch(() => ({ rows: [] as any[] }));

  if (!rows.length) return;
  console.log(`[watchRenew] Renewing ${rows.length} Calendar watch(es)`);

  for (const row of rows) {
    try {
      await watchCalendar(row.tenant_id);
      console.log(`[watchRenew] Calendar renewed for ${row.email_address}`);
    } catch (err: any) {
      console.error(`[watchRenew] Calendar renewal failed for ${row.email_address}:`, err.message);
    }
  }
}
