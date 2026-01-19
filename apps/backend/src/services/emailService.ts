import nodemailer from 'nodemailer';
import { env } from '../env';

type EmailPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
};

let transporter: nodemailer.Transporter | null = null;

function resolveTransporter(): nodemailer.Transporter | null {
  if (transporter) return transporter;

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null;
  }

  const port = env.SMTP_PORT ?? 587;
  const secure = port === 465;

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port,
    secure,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; error?: string }> {
  const client = resolveTransporter();
  if (!client) {
    return { ok: false, error: 'smtp_not_configured' };
  }

  try {
    await client.sendMail({
      from: env.SMTP_FROM || env.SMTP_USER,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    });

    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'smtp_send_failed' };
  }
}
