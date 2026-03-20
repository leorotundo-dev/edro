/**
 * whatsappHealthWorker — monitors Evolution API connection and auto-reconnects.
 *
 * Runs every 5 minutes. For each evolution_instance:
 *   - If state === 'open' → healthy, skip.
 *   - If state !== 'open' → call /instance/connect/:name
 *       - If Evolution returns a QR code → session expired, emit operational signal + status = needs_qr
 *       - Otherwise → wait 4s, recheck. If open → resolved. If not → log warning.
 */

import { query } from '../db';
import { getInstanceStatus, isConfigured } from '../services/integrations/evolutionApiService';
import { env } from '../env';

const THROTTLE_MS = 5 * 60 * 1000;
let lastRunAt = 0;
let running = false;

export async function runWhatsAppHealthWorkerOnce(): Promise<void> {
  if (!isConfigured()) return;
  if (running) return;
  if (Date.now() - lastRunAt < THROTTLE_MS) return;
  running = true;

  try {
    const { rows } = await query<{ tenant_id: string; instance_name: string }>(
      `SELECT tenant_id, instance_name FROM evolution_instances`,
    ).catch(() => ({ rows: [] as Array<{ tenant_id: string; instance_name: string }> }));

    for (const inst of rows) {
      try {
        await checkAndHeal(inst.tenant_id, inst.instance_name);
      } catch (err: any) {
        console.error(`[whatsappHealth] tenant=${inst.tenant_id} error:`, err?.message);
      }
    }

    lastRunAt = Date.now();
  } finally {
    running = false;
  }
}

async function checkAndHeal(tenantId: string, name: string): Promise<void> {
  // Check current state from Evolution API — throws if Evolution server is unreachable
  let currentState: string;
  try {
    const status = await getInstanceStatus(tenantId);
    currentState = status.state;
  } catch {
    // Evolution API temporarily unavailable — don't change DB status, skip
    return;
  }

  if (currentState === 'open') {
    // Connected — clear any stale QR signal
    await resolveQrSignal(tenantId, name);
    return;
  }

  console.log(`[whatsappHealth] ${name}: state=${currentState}, attempting restart`);

  const base = (env.EVOLUTION_API_URL ?? '').replace(/\/$/, '');
  const key = env.EVOLUTION_API_KEY ?? '';

  // Use POST /instance/restart/:name — restores session from DB without touching credentials.
  // DO NOT use GET /instance/connect which generates a new QR if credentials are stale.
  const res = await fetch(`${base}/instance/restart/${name}`, {
    method: 'POST',
    headers: { apikey: key, 'Content-Type': 'application/json' },
  }).catch(() => null);

  if (!res) {
    // Evolution API unreachable — do not change status, will retry next cycle
    return;
  }

  // Give Baileys time to reconnect (multi-device handshake takes ~8s)
  await new Promise(r => setTimeout(r, 10000));

  try {
    const recheck = await getInstanceStatus(tenantId);
    if (recheck.state === 'open') {
      console.log(`[whatsappHealth] ${name}: reconnected successfully via restart`);
      await resolveQrSignal(tenantId, name);
      return;
    }

    // If still not open after restart, check if /instance/connect returns a QR
    // (session credentials truly expired — manual re-scan required)
    const connectRes = await fetch(`${base}/instance/connect/${name}`, {
      headers: { apikey: key, 'Content-Type': 'application/json' },
    }).catch(() => null);

    if (connectRes) {
      const data: any = await connectRes.json().catch(() => ({}));
      const hasQr = !!(data?.base64 || data?.qrcode?.base64 || data?.code);
      if (hasQr) {
        console.warn(`[whatsappHealth] ${name}: session credentials expired, QR required`);
        await query(
          `UPDATE evolution_instances SET status = 'needs_qr', last_seen_at = now() WHERE tenant_id = $1`,
          [tenantId],
        ).catch(() => {});
        await upsertQrSignal(tenantId, name);
        return;
      }
    }

    console.warn(`[whatsappHealth] ${name}: still not connected after restart (state=${recheck.state})`);
  } catch {
    // ignore — will retry next cycle
  }
}

async function upsertQrSignal(tenantId: string, name: string): Promise<void> {
  await query(
    `INSERT INTO operational_signals
       (tenant_id, domain, signal_type, severity, title, summary, actions, dedup_key)
     VALUES ($1, 'health', 'health', 80,
             'WhatsApp desconectado — re-escaneie o QR',
             'A sessão do WhatsApp expirou (Evolution API). Acesse Configurações → WhatsApp para reconectar.',
             $2, $3)
     ON CONFLICT (tenant_id, dedup_key) WHERE dedup_key IS NOT NULL AND resolved_at IS NULL
     DO UPDATE SET
       title = EXCLUDED.title,
       summary = EXCLUDED.summary`,
    [
      tenantId,
      JSON.stringify([{ label: 'Reconectar WhatsApp', href: '/admin/whatsapp' }]),
      `whatsapp-needs-qr-${name}`,
    ],
  ).catch(() => {});
}

async function resolveQrSignal(tenantId: string, name: string): Promise<void> {
  await query(
    `UPDATE operational_signals
     SET resolved_at = now()
     WHERE tenant_id = $1 AND dedup_key = $2 AND resolved_at IS NULL`,
    [tenantId, `whatsapp-needs-qr-${name}`],
  ).catch(() => {});
}
