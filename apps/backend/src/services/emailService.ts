import nodemailer from 'nodemailer';
import { env } from '../env';

type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

type DeliveryResult = { ok: boolean; error?: string; provider?: string };

// ── Resend (REST, no extra dep) ───────────────────────────────────────────────

async function sendViaResend(payload: EmailPayload): Promise<DeliveryResult> {
  const apiKey = env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, error: 'resend_not_configured' };

  const from = env.RESEND_FROM || 'Edro Digital <noreply@edro.digital>';

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
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) return null;

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
  if (env.RESEND_API_KEY) {
    const result = await sendViaResend(payload);
    if (result.ok) return result;
    console.warn('[email] Resend failed, falling back to SMTP:', result.error);
  }

  return sendViaSMTP(payload);
}
