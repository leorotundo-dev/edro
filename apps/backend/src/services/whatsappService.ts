/**
 * WhatsApp Cloud API integration for notifications.
 *
 * Required env vars:
 *   WHATSAPP_TOKEN         – Permanent access token from Meta
 *   WHATSAPP_PHONE_ID      – Phone number ID from WhatsApp Business
 *   WHATSAPP_API_VERSION   – Graph API version (default v21.0)
 */

import { logActivity } from './integrationMonitor';

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

type SendWhatsAppTextOptions = {
  tenantId?: string | null;
  event?: string;
  meta?: Record<string, any>;
};

const EDRO_SENDER_HEADER = '*Edro.Studio*\n\n';

export async function sendWhatsAppText(
  to: string,
  text: string,
  options?: SendWhatsAppTextOptions,
): Promise<SendTextResult> {
  const config = getConfig();
  const tenantId = options?.tenantId ?? null;
  const event = options?.event ?? 'message_sent';
  const phone = normalizePhone(to);
  const body = text.startsWith(EDRO_SENDER_HEADER) ? text : EDRO_SENDER_HEADER + text;
  if (!config) {
    if (tenantId) {
      logActivity({
        tenantId,
        service: 'whatsapp',
        event,
        status: 'error',
        errorMsg: 'whatsapp_not_configured',
        meta: {
          provider: 'meta_cloud_api',
          to: phone,
          ...(options?.meta ?? {}),
        },
      });
    }
    return { ok: false, error: 'whatsapp_not_configured' };
  }

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
        text: { body: body },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      const errMsg = data?.error?.message || JSON.stringify(data);
      console.error('[whatsapp] send failed:', errMsg);
      return { ok: false, error: errMsg };
    }

    const messageId = data?.messages?.[0]?.id;
    if (tenantId) {
      logActivity({
        tenantId,
        service: 'whatsapp',
        event,
        status: 'ok',
        records: 1,
        meta: {
          provider: 'meta_cloud_api',
          phone_number_id: config.phoneId,
          to: phone,
          message_id: messageId ?? null,
          ...(options?.meta ?? {}),
        },
      });
    }
    return { ok: true, messageId };
  } catch (err: any) {
    console.error('[whatsapp] fetch failed:', err?.message);
    if (tenantId) {
      logActivity({
        tenantId,
        service: 'whatsapp',
        event,
        status: 'error',
        errorMsg: err?.message || 'fetch_failed',
        meta: {
          provider: 'meta_cloud_api',
          phone_number_id: config.phoneId,
          to: phone,
          ...(options?.meta ?? {}),
        },
      });
    }
    return { ok: false, error: err?.message || 'fetch_failed' };
  }
}

export function isWhatsAppConfigured(): boolean {
  return getConfig() !== null;
}
