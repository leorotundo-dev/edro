/**
 * Central gateway for all outbound WhatsApp group messages.
 * Handles rate limiting, quiet hours, deduplication, and audit logging.
 */

import { query } from '../db';
import { sendGroupMessage } from './integrations/evolutionApiService';
import { persistWhatsAppMessageMemory } from './whatsappClientMemoryService';

const MAX_OUTBOUND_PER_DAY = 10;
const DEFAULT_QUIET_START = 21; // 21:00 BRT
const DEFAULT_QUIET_END = 8;   // 08:00 BRT

export type OutboundScenario =
  | 'briefing_confirm'
  | 'digest_daily'
  | 'digest_weekly'
  | 'deadline_alert'
  | 'jarvis_reply'
  | 'meeting_summary'
  | 'meeting_prep';

// Map scenario → group opt-in column
const SCENARIO_FLAG: Record<OutboundScenario, string> = {
  briefing_confirm: 'notify_briefing_confirm',
  digest_daily: 'notify_digest',
  digest_weekly: 'notify_digest',
  deadline_alert: 'notify_deadlines',
  jarvis_reply: 'notify_jarvis_reply',
  meeting_summary: 'notify_jarvis',
  meeting_prep: 'notify_jarvis',
};

export async function sendOutboundMessage(params: {
  tenantId: string;
  groupId: string;
  groupJid: string;
  clientId?: string;
  scenario: OutboundScenario;
  triggerKey: string;
  messageText: string;
  aiTokensIn?: number;
  aiTokensOut?: number;
  bypassQuietHours?: boolean;
}): Promise<{ sent: boolean; reason?: string }> {
  const { tenantId, groupId, groupJid, clientId, scenario, triggerKey, messageText } = params;

  // 1. Dedup — check if this triggerKey already sent
  const { rows: existing } = await query(
    `SELECT id FROM whatsapp_outbound_messages WHERE trigger_key = $1`,
    [triggerKey],
  );
  if (existing.length) return { sent: false, reason: 'duplicate' };

  // 2. Check opt-in flag
  const flagCol = SCENARIO_FLAG[scenario];
  const { rows: groupRows } = await query(
    `SELECT ${flagCol}, quiet_hours_start, quiet_hours_end,
            outbound_count_today, outbound_count_date
     FROM whatsapp_groups WHERE id = $1`,
    [groupId],
  );
  if (!groupRows.length) return { sent: false, reason: 'group_not_found' };

  const group = groupRows[0];
  if (group[flagCol] === false) return { sent: false, reason: 'opt_out' };

  // 3. Quiet hours check (BRT = UTC-3)
  if (!params.bypassQuietHours && isWithinQuietHours(group.quiet_hours_start, group.quiet_hours_end)) {
    return { sent: false, reason: 'quiet_hours' };
  }

  // 4. Rate limit
  const today = new Date().toISOString().slice(0, 10);
  let countToday = group.outbound_count_today ?? 0;
  if (group.outbound_count_date !== today) countToday = 0;

  if (countToday >= MAX_OUTBOUND_PER_DAY) {
    return { sent: false, reason: 'rate_limit' };
  }

  // 5. Send via Evolution API
  try {
    const formatted = formatJarvisMessage(messageText);
    await sendGroupMessage(tenantId, groupJid, formatted);
  } catch (err: any) {
    const msg: string = err.message ?? '';
    if (!msg.includes('No sessions') && !msg.includes('SessionError')) {
      console.warn(`[groupOutbound] Send failed (${scenario}): ${msg}`);
    }
    return { sent: false, reason: `send_error: ${msg}` };
  }

  // 6. Log + update rate counter
  await query(
    `INSERT INTO whatsapp_outbound_messages
       (tenant_id, group_id, client_id, scenario, trigger_key, message_text, ai_tokens_in, ai_tokens_out)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (trigger_key) DO NOTHING`,
    [tenantId, groupId, clientId ?? null, scenario, triggerKey, messageText,
     params.aiTokensIn ?? 0, params.aiTokensOut ?? 0],
  );

  if (clientId) {
    await persistWhatsAppMessageMemory({
      tenantId,
      clientId,
      externalMessageId: triggerKey,
      text: messageText,
      senderName: 'Jarvis',
      direction: 'outbound',
      messageType: 'text',
      channel: 'group',
    }).catch((err: any) => {
      console.warn(`[groupOutbound] persistWhatsAppMessageMemory failed: ${err.message}`);
    });
  }

  await query(
    `UPDATE whatsapp_groups
     SET outbound_count_today = CASE WHEN outbound_count_date = $2 THEN outbound_count_today + 1 ELSE 1 END,
         outbound_count_date = $2
     WHERE id = $1`,
    [groupId, today],
  );

  return { sent: true };
}

export function isWithinQuietHours(quietStart: number | null, quietEnd: number | null): boolean {
  const start = quietStart ?? DEFAULT_QUIET_START;
  const end = quietEnd ?? DEFAULT_QUIET_END;

  // Current hour in BRT (UTC-3)
  const nowBrt = new Date(Date.now() - 3 * 3600000);
  const hour = nowBrt.getUTCHours();

  if (start > end) {
    // Overnight: e.g. 21:00 → 08:00
    return hour >= start || hour < end;
  }
  return hour >= start && hour < end;
}

export function formatJarvisMessage(body: string): string {
  const brandUrl = process.env.APP_URL || process.env.WEB_URL || 'https://edro-production.up.railway.app';
  return `🤖 *Jarvis* — Assistente Edro\n\n${body}\n\n_Mensagem automática • ${brandUrl.replace(/^https?:\/\//, '')}_`;
}

/**
 * Check Jarvis reply cooldown: max 1 reply per group every 2 minutes
 */
export async function isJarvisOnCooldown(groupId: string): Promise<boolean> {
  const { rows } = await query(
    `SELECT sent_at FROM whatsapp_outbound_messages
     WHERE group_id = $1 AND scenario = 'jarvis_reply'
     ORDER BY sent_at DESC LIMIT 1`,
    [groupId],
  );
  if (!rows.length) return false;
  const elapsed = Date.now() - new Date(rows[0].sent_at).getTime();
  return elapsed < 120_000; // 2 minutes
}
