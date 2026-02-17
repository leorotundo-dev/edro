/**
 * WhatsApp Cloud API integration for notifications.
 *
 * Required env vars:
 *   WHATSAPP_TOKEN         – Permanent access token from Meta
 *   WHATSAPP_PHONE_ID      – Phone number ID from WhatsApp Business
 *   WHATSAPP_API_VERSION   – Graph API version (default v21.0)
 */

const BASE_URL = 'https://graph.facebook.com';

function getConfig() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const version = process.env.WHATSAPP_API_VERSION || 'v21.0';

  if (!token || !phoneId) return null;

  return { token, phoneId, version };
}

function normalizePhone(raw: string): string {
  // Strip everything except digits and leading +
  let cleaned = raw.replace(/[^+\d]/g, '');
  // Ensure country code (default BR +55)
  if (!cleaned.startsWith('+')) {
    cleaned = cleaned.startsWith('55') ? `+${cleaned}` : `+55${cleaned}`;
  }
  // Remove the leading + for WhatsApp API
  return cleaned.replace(/^\+/, '');
}

type SendTextResult = { ok: boolean; messageId?: string; error?: string };

export async function sendWhatsAppText(to: string, text: string): Promise<SendTextResult> {
  const config = getConfig();
  if (!config) {
    return { ok: false, error: 'whatsapp_not_configured' };
  }

  const phone = normalizePhone(to);
  const url = `${BASE_URL}/${config.version}/${config.phoneId}/messages`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone,
        type: 'text',
        text: { body: text },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message || JSON.stringify(data);
      console.error('[whatsapp] send failed:', errMsg);
      return { ok: false, error: errMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    return { ok: true, messageId };
  } catch (err: any) {
    console.error('[whatsapp] fetch failed:', err?.message);
    return { ok: false, error: err?.message || 'fetch_failed' };
  }
}

export function isWhatsAppConfigured(): boolean {
  return getConfig() !== null;
}
