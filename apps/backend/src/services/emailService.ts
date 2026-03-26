import nodemailer from 'nodemailer';
import { env } from '../env';
import { logActivity } from './integrationMonitor';

type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  /** When provided, activity is logged to the integration monitor. */
  tenantId?: string;
};

type DeliveryResult = { ok: boolean; error?: string; provider?: string };

export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

export function isEmailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY) || isSmtpConfigured();
}

// ── Resend (REST, no extra dep) ───────────────────────────────────────────────

async function sendViaResend(payload: EmailPayload): Promise<DeliveryResult> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'resend_not_configured' };

  const from = env.RESEND_FROM || 'Edro Studio <onboarding@resend.dev>';

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [payload.to],
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return { ok: false, error: `resend_${res.status}: ${body}` };
    }

    return { ok: true, provider: 'resend' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'resend_fetch_failed' };
  }
}

// ── SMTP (nodemailer) ─────────────────────────────────────────────────────────

let transporter: nodemailer.Transporter | null = null;

function resolveTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;
  if (!isSmtpConfigured()) return null;

  const port = env.SMTP_PORT ?? 587;
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  return transporter;
}

async function sendViaSMTP(payload: EmailPayload): Promise<DeliveryResult> {
  const client = resolveTransporter();
  if (!client) return { ok: false, error: 'smtp_not_configured' };

  try {
    await client.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });
    return { ok: true, provider: 'smtp' };
  } catch (err: any) {
    return { ok: false, error: err?.message || 'smtp_send_failed' };
  }
}

// ── Public API — tries Resend first, SMTP as fallback ────────────────────────

export async function sendEmail(payload: EmailPayload): Promise<DeliveryResult> {
  let result: DeliveryResult;
  const resendEnabled = Boolean(env.RESEND_API_KEY);

  if (resendEnabled) {
    result = await sendViaResend(payload);
    if (!result.ok) {
      console.warn('[email] Resend failed, falling back to SMTP:', result.error);
      result = await sendViaSMTP(payload);
    }
  } else {
    result = await sendViaSMTP(payload);
  }

  if (payload.tenantId) {
    const usedProvider = result.provider ?? (resendEnabled ? 'resend' : 'smtp');
    const usedSmtpFallback = Boolean(result.ok && resendEnabled && usedProvider === 'smtp');
    logActivity({
      tenantId: payload.tenantId,
      service: 'resend',
      event: result.ok
        ? usedSmtpFallback
          ? 'email_sent_fallback'
          : 'email_sent'
        : 'email_failed',
      status: result.ok
        ? usedSmtpFallback
          ? 'degraded'
          : 'ok'
        : 'error',
      errorMsg: result.ok ? undefined : result.error,
      meta: {
        provider: usedProvider,
        fallback_from: usedSmtpFallback ? 'resend' : undefined,
        to: payload.to,
        subject: payload.subject,
      },
    });
  }

  return result;
}
