/**
 * Twilio WhatsApp notification service.
 *
 * Required env vars:
 *   TWILIO_ACCOUNT_SID       – Twilio Account SID (starts with AC)
 *   TWILIO_AUTH_TOKEN        – Twilio Auth Token
 *   TWILIO_WHATSAPP_FROM     – Sender number, e.g. whatsapp:+14155238886
 *   TWILIO_AGENCY_WHATSAPP   – Agency phone(s) to receive alerts, comma-separated
 *                              e.g. whatsapp:+5511999990000,whatsapp:+5511888880000
 */

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01';

function getConfig() {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from  = process.env.TWILIO_WHATSAPP_FROM;
  const to    = process.env.TWILIO_AGENCY_WHATSAPP;
  if (!sid || !token || !from || !to) return null;
  return { sid, token, from, recipients: to.split(',').map(s => s.trim()).filter(Boolean) };
}

export function isTwilioConfigured(): boolean {
  return getConfig() !== null;
}

export async function sendTwilioWhatsApp(message: string): Promise<boolean> {
  const cfg = getConfig();
  if (!cfg) return false;

  const auth = Buffer.from(`${cfg.sid}:${cfg.token}`).toString('base64');
  const url   = `${TWILIO_BASE}/Accounts/${cfg.sid}/Messages.json`;

  let allOk = true;
  for (const to of cfg.recipients) {
    try {
      const body = new URLSearchParams({ From: cfg.from, To: to, Body: message });
      const res  = await fetch(url, {
        method:  'POST',
        headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body:    body.toString(),
        signal:  AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        const err = await res.text().catch(() => '');
        console.warn(`[twilio] Failed to send to ${to}: ${res.status} ${err}`);
        allOk = false;
      }
    } catch (e) {
      console.warn(`[twilio] Error sending to ${to}:`, e);
      allOk = false;
    }
  }
  return allOk;
}
