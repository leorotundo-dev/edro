/**
 * Evolution API Service
 * Manages WhatsApp connections (including groups) via Evolution API.
 * https://doc.evolution-api.com/
 *
 * ENV vars required:
 *   EVOLUTION_API_URL  — e.g. https://evolution.yourserver.com
 *   EVOLUTION_API_KEY  — global API key
 */

import { env } from '../../env';
import { query } from '../../db';

// ── Types ──────────────────────────────────────────────────────────────────

export interface EvolutionGroup {
  id: string;          // JID like "5511999@g.us"
  subject: string;     // group name
  size: number;        // participant count
}

export interface EvolutionQrCode {
  base64: string;      // base64 PNG data URI
  code: string;        // raw qrcode string
}

export interface EvolutionInstanceStatus {
  instance: string;
  state: 'open' | 'close' | 'connecting';
  profileName?: string;
  profilePicUrl?: string;
  number?: string;
}

// ── HTTP helper ────────────────────────────────────────────────────────────

function baseUrl() {
  const url = env.EVOLUTION_API_URL;
  if (!url) throw new Error('EVOLUTION_API_URL não configurada.');
  return url.replace(/\/$/, '');
}

async function evolFetch(path: string, opts: RequestInit = {}) {
  const apiKey = env.EVOLUTION_API_KEY;
  if (!apiKey) throw new Error('EVOLUTION_API_KEY não configurada.');

  const res = await fetch(`${baseUrl()}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      'apikey': apiKey,
      ...(opts.headers ?? {}),
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Evolution API error (${res.status}): ${text.slice(0, 300)}`);
  }
  return res.json();
}

// ── Instance management ────────────────────────────────────────────────────

export function instanceName(tenantId: string): string {
  // Sanitize tenant_id to be a valid Evolution instance name
  return `edro-${tenantId.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 30)}`;
}

export async function createInstance(tenantId: string): Promise<void> {
  const name = instanceName(tenantId);

  try {
    await evolFetch('/instance/create', {
      method: 'POST',
      body: JSON.stringify({
        instanceName: name,
        qrcode: true,
        integration: 'WHATSAPP-BAILEYS',
      }),
    });
  } catch (err: any) {
    // 403 "already in use" means the instance was created before — that's fine
    if (!err?.message?.includes('403') && !err?.message?.toLowerCase().includes('already in use')) {
      throw err;
    }
  }

  await query(
    `INSERT INTO evolution_instances (tenant_id, instance_name, status)
     VALUES ($1, $2, 'connecting')
     ON CONFLICT (tenant_id) DO UPDATE SET status = 'connecting'`,
    [tenantId, name],
  );
}

export async function getQrCode(
  tenantId: string,
  { pollSeconds = 0 }: { pollSeconds?: number } = {},
): Promise<EvolutionQrCode> {
  const name = instanceName(tenantId);

  const once = async (): Promise<EvolutionQrCode> => {
    const data = await evolFetch(`/instance/connect/${name}`);
    // v2 returns { count, base64, code } when QR is ready; { count: 0 } when not ready yet
    return {
      base64: data.base64 ?? '',
      code: data.code ?? '',
    };
  };

  if (!pollSeconds) return once();

  // Poll until QR appears or timeout
  const deadline = Date.now() + pollSeconds * 1000;
  while (Date.now() < deadline) {
    const qr = await once();
    if (qr.base64) return qr;
    await new Promise(r => setTimeout(r, 2500));
  }
  return { base64: '', code: '' };
}

export async function getInstanceStatus(tenantId: string): Promise<EvolutionInstanceStatus> {
  const name = instanceName(tenantId);
  const data = await evolFetch(`/instance/connectionState/${name}`);

  const state = data.instance?.state ?? 'close';

  // Sync status to DB
  await query(
    `UPDATE evolution_instances
     SET status = $1,
         phone_number = COALESCE($2, phone_number),
         connected_at = CASE WHEN $1 = 'open' AND connected_at IS NULL THEN now() ELSE connected_at END,
         last_seen_at = now()
     WHERE tenant_id = $3`,
    [state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected',
     data.instance?.profileName ?? null,
     tenantId],
  );

  return {
    instance: name,
    state,
    profileName: data.instance?.profileName,
    number: data.instance?.number,
  };
}

export async function disconnectInstance(tenantId: string): Promise<void> {
  const name = instanceName(tenantId);
  await evolFetch(`/instance/logout/${name}`, { method: 'DELETE' });
  await query(
    `UPDATE evolution_instances SET status = 'disconnected', connected_at = NULL WHERE tenant_id = $1`,
    [tenantId],
  );
}

// ── Group management ───────────────────────────────────────────────────────

export async function fetchGroups(tenantId: string): Promise<EvolutionGroup[]> {
  const name = instanceName(tenantId);
  const data = await evolFetch(`/group/fetchAllGroups/${name}?getParticipants=false`);
  const groups: EvolutionGroup[] = (Array.isArray(data) ? data : []).map((g: any) => ({
    id: g.id,
    subject: g.subject ?? g.id,
    size: g.size ?? 0,
  }));
  return groups;
}

export async function linkGroupToClient(
  tenantId: string,
  groupJid: string,
  clientId: string,
  options: { autoBriefing?: boolean; notifyJarvis?: boolean } = {},
): Promise<void> {
  const { rows: inst } = await query(
    `SELECT id FROM evolution_instances WHERE tenant_id = $1`,
    [tenantId],
  );
  if (!inst.length) throw new Error('Instância não encontrada. Conecte o WhatsApp primeiro.');

  // Get group name from Evolution API
  const name = instanceName(tenantId);
  let groupName = groupJid;
  try {
    const data = await evolFetch(`/group/findGroupInfos/${name}?groupJid=${encodeURIComponent(groupJid)}`);
    groupName = data.subject ?? groupJid;
  } catch { /* ignore — use JID as name */ }

  await query(
    `INSERT INTO whatsapp_groups
       (tenant_id, instance_id, group_jid, group_name, client_id, auto_briefing, notify_jarvis)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (instance_id, group_jid) DO UPDATE
       SET client_id = $5, auto_briefing = $6, notify_jarvis = $7, active = true`,
    [tenantId, inst[0].id, groupJid, groupName, clientId,
     options.autoBriefing ?? false, options.notifyJarvis ?? true],
  );
}

export async function unlinkGroup(tenantId: string, groupJid: string): Promise<void> {
  await query(
    `UPDATE whatsapp_groups SET active = false, client_id = NULL
     WHERE tenant_id = $1 AND group_jid = $2`,
    [tenantId, groupJid],
  );
}

// ── Send message ───────────────────────────────────────────────────────────

export async function sendGroupMessage(tenantId: string, groupJid: string, text: string): Promise<void> {
  const name = instanceName(tenantId);
  await evolFetch(`/message/sendText/${name}`, {
    method: 'POST',
    body: JSON.stringify({ number: groupJid, text }),
  });
}

// ── DB helpers ─────────────────────────────────────────────────────────────

export async function ensureEvolutionTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS evolution_instances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL UNIQUE,
      instance_name TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'disconnected',
      phone_number TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      connected_at TIMESTAMPTZ,
      last_seen_at TIMESTAMPTZ
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS whatsapp_groups (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      instance_id UUID NOT NULL REFERENCES evolution_instances(id) ON DELETE CASCADE,
      group_jid TEXT NOT NULL,
      group_name TEXT NOT NULL,
      client_id TEXT,
      active BOOLEAN NOT NULL DEFAULT true,
      auto_briefing BOOLEAN NOT NULL DEFAULT false,
      notify_jarvis BOOLEAN NOT NULL DEFAULT true,
      participant_count INT,
      last_message_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(instance_id, group_jid)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS whatsapp_group_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      group_id UUID NOT NULL,
      client_id TEXT,
      wa_message_id TEXT NOT NULL UNIQUE,
      sender_jid TEXT NOT NULL,
      sender_name TEXT,
      type TEXT NOT NULL DEFAULT 'text',
      content TEXT,
      media_url TEXT,
      briefing_id UUID,
      processed BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export function isConfigured(): boolean {
  return !!(env.EVOLUTION_API_URL && env.EVOLUTION_API_KEY);
}
