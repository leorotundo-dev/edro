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

  // Auto-configure webhook so Evolution API sends events to our endpoint
  await configureWebhook(name).catch((err) => {
    console.warn(`[evolutionApi] Webhook config failed for ${name}: ${err.message}`);
  });
}

/**
 * Configure the Evolution API webhook for an instance.
 * Points to our /webhook/evolution endpoint with MESSAGES_UPSERT + CONNECTION_UPDATE events.
 */
export async function configureWebhook(nameOrTenantId: string): Promise<void> {
  // Accept either an instance name (edro-...) or a tenantId
  const name = nameOrTenantId.startsWith('edro-') ? nameOrTenantId : instanceName(nameOrTenantId);

  const apiBaseUrl = env.PUBLIC_API_URL;
  if (!apiBaseUrl) {
    console.warn('[evolutionApi] PUBLIC_API_URL not set — skipping webhook config');
    return;
  }

  // Strip /api suffix since webhooks are registered without prefix
  const baseUrl = apiBaseUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
  const webhookUrl = `${baseUrl}/webhook/evolution`;

  await evolFetch(`/webhook/set/${name}`, {
    method: 'POST',
    body: JSON.stringify({
      webhook: {
        url: webhookUrl,
        webhook_by_events: false,
        webhook_base64: false,
        events: [
          'MESSAGES_UPSERT',
          'CONNECTION_UPDATE',
        ],
        enabled: true,
      },
    }),
  });

  console.log(`[evolutionApi] Webhook configured for ${name} → ${webhookUrl}`);
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

/**
 * Restart an existing instance WITHOUT deleting credentials.
 * Uses POST /instance/restart/:name — Baileys reconnects using saved DB credentials.
 *
 * Only use forceRecreate=true when the session is truly unrecoverable (corrupted auth).
 */
export async function restartInstance(tenantId: string, forceRecreate = false): Promise<void> {
  const name = instanceName(tenantId);

  if (!forceRecreate) {
    // Soft restart — keeps session credentials in DB, just restarts the Baileys client
    await evolFetch(`/instance/restart/${name}`, { method: 'POST' });
    console.log(`[evolutionApi] Restarted instance ${name}`);
    return;
  }

  // Hard recreate — only when session is truly unrecoverable
  try {
    await evolFetch(`/instance/delete/${name}`, { method: 'DELETE' });
    console.log(`[evolutionApi] Deleted instance ${name} for hard recreate`);
  } catch (err: any) {
    console.warn(`[evolutionApi] Delete before recreate failed (may not exist): ${err.message}`);
  }

  await createInstance(tenantId);
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
  // Warm up group metadata cache before sending. Evolution v2.1.1 has shown
  // intermittent `findGroup` failures right after channel startup for group sends.
  await fetchGroups(tenantId).catch(() => {});
  await evolFetch(`/message/sendText/${name}`, {
    method: 'POST',
    body: JSON.stringify({ number: groupJid, text }),
  });
}

/** Send a text message to an individual phone number via Evolution API */
export async function sendDirectMessage(tenantId: string, phone: string, text: string): Promise<void> {
  const name = instanceName(tenantId);
  // Normalize phone to JID format if not already
  const jid = phone.includes('@') ? phone : `${phone.replace(/\D/g, '')}@s.whatsapp.net`;
  await evolFetch(`/message/sendText/${name}`, {
    method: 'POST',
    body: JSON.stringify({ number: jid, text }),
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
      insight_extracted BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  // Ensure insight_extracted exists on older tables
  await query(`ALTER TABLE whatsapp_group_messages ADD COLUMN IF NOT EXISTS insight_extracted BOOLEAN DEFAULT false`).catch(() => {});
}

export function isConfigured(): boolean {
  return !!(env.EVOLUTION_API_URL && env.EVOLUTION_API_KEY);
}

// ── History sync ──────────────────────────────────────────────────────────

export interface EvolutionHistoryMessage {
  key: { id: string; remoteJid: string; fromMe: boolean; participant?: string };
  pushName?: string;
  message?: any;
  messageTimestamp?: number | string;
}

/**
 * Fetch historical messages from a group via Evolution API.
 * Returns raw Evolution API message objects (same format as MESSAGES_UPSERT).
 */
export async function fetchGroupHistory(
  tenantId: string,
  groupJid: string,
  limit = 200,
): Promise<EvolutionHistoryMessage[]> {
  const name = instanceName(tenantId);

  const data = await evolFetch(`/chat/findMessages/${name}`, {
    method: 'POST',
    body: JSON.stringify({
      where: { key: { remoteJid: groupJid } },
      limit,
    }),
  });

  // Handle various Evolution API v2 response formats:
  // - Array directly: [msg, msg, ...]
  // - { messages: [msg, ...] }
  // - { messages: { records: [msg, ...] } }
  // - { data: [msg, ...] }
  let msgs: any[];
  if (Array.isArray(data)) {
    msgs = data;
  } else if (Array.isArray(data?.messages)) {
    msgs = data.messages;
  } else if (Array.isArray(data?.messages?.records)) {
    msgs = data.messages.records;
  } else if (Array.isArray(data?.data)) {
    msgs = data.data;
  } else {
    console.warn(`[evolutionApi] fetchGroupHistory unexpected response shape for ${groupJid}:`, JSON.stringify(data).slice(0, 300));
    msgs = [];
  }
  return msgs as EvolutionHistoryMessage[];
}

/**
 * Sync historical messages for a single linked group.
 * Skips messages already saved (idempotent via wa_message_id UNIQUE).
 * Returns count of newly inserted messages.
 */
export async function syncGroupHistory(
  tenantId: string,
  groupId: string,
  groupJid: string,
  clientId: string | null,
  limit = 200,
): Promise<number> {
  const messages = await fetchGroupHistory(tenantId, groupJid, limit);
  let inserted = 0;

  for (const msg of messages) {
    const waMessageId = msg.key?.id;
    if (!waMessageId) continue;
    if (msg.key.fromMe) continue; // skip own messages

    const senderJid = (msg.key.participant ?? '') as string;
    const senderName = msg.pushName ?? senderJid.split('@')[0] ?? 'Desconhecido';

    // Extract text content (simplified — no audio transcription for history)
    const message = msg.message ?? {};
    const text = message.conversation
      ?? message.extendedTextMessage?.text
      ?? message.ephemeralMessage?.message?.extendedTextMessage?.text
      ?? null;
    const isAudio = !!(message.audioMessage ?? message.pttMessage);
    const isImage = !!message.imageMessage;
    const isDoc = !!(message.documentMessage ?? message.documentWithCaptionMessage);
    const type = text ? 'text' : isAudio ? 'audio' : isImage ? 'image' : isDoc ? 'document' : 'unknown';
    const content = text ?? (isImage ? message.imageMessage?.caption : null) ?? (isDoc ? (message.documentMessage?.caption ?? message.documentMessage?.fileName) : null);

    if (!content && type === 'unknown') continue;

    // Parse timestamp
    const ts = msg.messageTimestamp
      ? new Date(Number(msg.messageTimestamp) * (Number(msg.messageTimestamp) > 1e12 ? 1 : 1000))
      : new Date();

    const { rowCount } = await query(
      `INSERT INTO whatsapp_group_messages
         (tenant_id, group_id, client_id, wa_message_id, sender_jid, sender_name, type, content, processed, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false, $9)
       ON CONFLICT (wa_message_id) DO NOTHING`,
      [tenantId, groupId, clientId, waMessageId, senderJid, senderName, type, content, ts],
    );
    if (rowCount && rowCount > 0) inserted++;
  }

  // Update group last_message_at
  if (inserted > 0) {
    await query(
      `UPDATE whatsapp_groups SET last_message_at = (
         SELECT MAX(created_at) FROM whatsapp_group_messages WHERE group_id = $1
       ) WHERE id = $1`,
      [groupId],
    );
  }

  return inserted;
}
