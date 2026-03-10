/**
 * Evolution API webhook handler.
 * Receives WhatsApp group messages and feeds them to Jarvis intelligence.
 *
 * Register in Evolution API:
 *   URL: https://yourapi.com/webhook/evolution
 *   Events: MESSAGES_UPSERT, CONNECTION_UPDATE
 */

import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { transcribeAudioBuffer } from '../services/meetingService';
import { generateCompletion } from '../services/ai/claudeService';
import { instanceName } from '../services/integrations/evolutionApiService';
import { sendOutboundMessage } from '../services/groupOutboundService';
import { shouldJarvisReply, handleJarvisReply } from '../services/groupJarvisReplyService';
import { env } from '../env';

const BRIEFING_TRIGGER = /\b(brief(ing)?|pauta|post|conteúdo|campanha|cria|criar|precisamos)\b/i;
const URGENT_KEYWORDS = /\b(urgente|deadline|amanhã|hoje|cancelar|problema|erro|bug|reclamação|atraso|emergência|prazo)\b/i;
const MIN_TEXT_LENGTH = 10;

export default async function webhookEvolutionRoutes(app: FastifyInstance) {

  // ── CONNECTION_UPDATE — keep DB in sync ───────────────────────────────────
  // ── MESSAGES_UPSERT — process incoming messages ───────────────────────────
  app.post('/webhook/evolution', async (request, reply) => {
    // Return 200 immediately — process async
    reply.code(200).send({ received: true });

    const body = request.body as any;
    if (!body) return;

    const event = body.event as string | undefined;
    const instanceNameFromPayload = body.instance as string | undefined;

    try {
      if (event === 'connection.update') {
        await handleConnectionUpdate(instanceNameFromPayload, body.data);
        return;
      }

      if (event === 'messages.upsert') {
        await handleMessagesUpsert(instanceNameFromPayload, body.data);
        return;
      }
    } catch (err: any) {
      console.error('[webhookEvolution] Error:', err.message);
    }
  });
}

// ── Connection update ─────────────────────────────────────────────────────

async function handleConnectionUpdate(instanceNameStr: string | undefined, data: any) {
  if (!instanceNameStr) return;
  const state = data?.state ?? data?.connection;
  if (!state) return;

  const status = state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected';
  await query(
    `UPDATE evolution_instances
     SET status = $1,
         connected_at = CASE WHEN $1 = 'connected' AND connected_at IS NULL THEN now() ELSE connected_at END,
         last_seen_at = now()
     WHERE instance_name = $2`,
    [status, instanceNameStr],
  ).catch(() => {});
}

// ── Messages upsert ────────────────────────────────────────────────────────

async function handleMessagesUpsert(instanceNameStr: string | undefined, data: any) {
  if (!instanceNameStr) return;

  // Resolve tenant from instance name
  const { rows: instRows } = await query(
    `SELECT id, tenant_id FROM evolution_instances WHERE instance_name = $1`,
    [instanceNameStr],
  );
  if (!instRows.length) return;
  const { id: instanceId, tenant_id: tenantId } = instRows[0];

  const messages = Array.isArray(data) ? data : [data];

  for (const msg of messages) {
    try {
      await processMessage(msg, instanceId, tenantId);
    } catch (err: any) {
      console.error(`[webhookEvolution] processMessage failed: ${err.message}`);
    }
  }
}

async function processMessage(msg: any, instanceId: string, tenantId: string) {
  const key = msg.key ?? {};
  const waMessageId = key.id as string | undefined;
  if (!waMessageId) return;

  // Only process group messages
  const remoteJid = key.remoteJid as string | undefined;
  if (!remoteJid?.endsWith('@g.us')) return;

  // Skip own messages
  if (key.fromMe) return;

  // Idempotency
  const { rows: existing } = await query(
    `SELECT id FROM whatsapp_group_messages WHERE wa_message_id = $1`, [waMessageId],
  );
  if (existing.length) return;

  // Find linked group
  const { rows: groupRows } = await query(
    `SELECT id, client_id, auto_briefing, notify_jarvis, notify_jarvis_reply
     FROM whatsapp_groups
     WHERE instance_id = $1 AND group_jid = $2 AND active = true`,
    [instanceId, remoteJid],
  );
  if (!groupRows.length) return; // group not linked, ignore

  const group = groupRows[0];
  const senderJid = (key.participant ?? msg.participant ?? '') as string;
  const senderName = msg.pushName ?? senderJid.split('@')[0] ?? 'Desconhecido';

  // Extract content based on message type
  const { type, content, mediaUrl } = await extractContent(msg, tenantId);
  if (!content && !mediaUrl) return;

  // Extract reply context (quoted message stanzaId)
  const message = msg.message ?? {};
  const replyToWaId = message.extendedTextMessage?.contextInfo?.stanzaId
    ?? message.ephemeralMessage?.message?.extendedTextMessage?.contextInfo?.stanzaId
    ?? null;

  // Save message
  await query(
    `INSERT INTO whatsapp_group_messages
       (tenant_id, group_id, client_id, wa_message_id, sender_jid, sender_name, type, content, media_url, processed, reply_to_wa_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false, $10)
     ON CONFLICT (wa_message_id) DO NOTHING`,
    [tenantId, group.id, group.client_id ?? null, waMessageId, senderJid, senderName, type, content ?? null, mediaUrl ?? null, replyToWaId],
  );

  // Update group last_message_at
  await query(
    `UPDATE whatsapp_groups SET last_message_at = now() WHERE id = $1`, [group.id],
  );

  if (!group.client_id) return; // not linked to a client — just store

  // Urgent fast-path: detect urgent keywords and insert insight immediately (no worker delay)
  if (group.notify_jarvis && type === 'text' && content && URGENT_KEYWORDS.test(content) && content.length >= MIN_TEXT_LENGTH) {
    await insertUrgentInsight(tenantId, group.client_id, waMessageId, senderName, content).catch(() => {});
  }

  // Auto-briefing: if message looks like a content request
  if (group.auto_briefing && type === 'text' && content && BRIEFING_TRIGGER.test(content) && content.length >= MIN_TEXT_LENGTH) {
    // Fetch thread context (previous messages in the group for richer briefings)
    const threadContext = await getThreadContext(group.id, tenantId).catch(() => '');

    await autoCreateBriefingFromMessage({
      tenantId,
      clientId: group.client_id,
      senderName,
      content,
      groupMessageId: waMessageId,
      threadContext,
      groupId: group.id,
      groupJid: remoteJid!,
    }).catch(() => {});
  }

  // Jarvis smart reply: detect question and respond with AI
  if (group.notify_jarvis_reply && type === 'text' && content && shouldJarvisReply(content)) {
    handleJarvisReply({
      tenantId,
      clientId: group.client_id,
      groupId: group.id,
      groupJid: remoteJid!,
      senderName,
      content,
      waMessageId,
    }).catch((err) => console.error(`[webhookEvolution] Jarvis reply failed: ${err.message}`));
  }
}

// ── Content extraction ────────────────────────────────────────────────────

async function extractContent(msg: any, tenantId: string): Promise<{
  type: string;
  content: string | null;
  mediaUrl: string | null;
}> {
  const message = msg.message ?? {};

  // Text message
  const text = message.conversation
    ?? message.extendedTextMessage?.text
    ?? message.ephemeralMessage?.message?.extendedTextMessage?.text
    ?? null;
  if (text) return { type: 'text', content: text, mediaUrl: null };

  // Audio / voice note — transcribe with Whisper
  const audioMsg = message.audioMessage ?? message.pttMessage;
  if (audioMsg) {
    const transcription = await transcribeEvolutionAudio(msg, tenantId).catch(() => null);
    return { type: 'audio', content: transcription, mediaUrl: null };
  }

  // Image with optional caption
  const imageMsg = message.imageMessage;
  if (imageMsg) {
    const caption = imageMsg.caption ?? null;
    return { type: 'image', content: caption, mediaUrl: null };
  }

  // Document
  const docMsg = message.documentMessage ?? message.documentWithCaptionMessage?.message?.documentMessage;
  if (docMsg) {
    const caption = docMsg.caption ?? docMsg.fileName ?? null;
    return { type: 'document', content: caption, mediaUrl: null };
  }

  return { type: 'unknown', content: null, mediaUrl: null };
}

async function transcribeEvolutionAudio(msg: any, tenantId: string): Promise<string | null> {
  // Evolution API media download
  const { rows: instRows } = await query(
    `SELECT instance_name FROM evolution_instances WHERE tenant_id = $1`, [tenantId],
  );
  if (!instRows.length) return null;

  const apiKey = env.EVOLUTION_API_KEY;
  const apiUrl = env.EVOLUTION_API_URL;
  if (!apiKey || !apiUrl) return null;

  const mediaRes = await fetch(`${apiUrl.replace(/\/$/, '')}/chat/getBase64FromMediaMessage/${instRows[0].instance_name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: apiKey },
    body: JSON.stringify({ message: msg }),
  });

  if (!mediaRes.ok) return null;
  const mediaData = await mediaRes.json() as { base64?: string; mimetype?: string };
  if (!mediaData.base64) return null;

  const buffer = Buffer.from(mediaData.base64, 'base64');
  const mimeType = mediaData.mimetype ?? 'audio/ogg';

  return transcribeAudioBuffer(buffer, mimeType);
}

// ── Auto-briefing from message ────────────────────────────────────────────

// ── Thread context for richer briefings ───────────────────────────────────

async function getThreadContext(groupId: string, tenantId: string): Promise<string> {
  const { rows } = await query(
    `SELECT sender_name, content
     FROM whatsapp_group_messages
     WHERE group_id = $1 AND tenant_id = $2 AND content IS NOT NULL
     ORDER BY created_at DESC
     LIMIT 5`,
    [groupId, tenantId],
  );
  if (rows.length <= 1) return '';
  return rows.reverse().map((r: any) => `${r.sender_name}: ${(r.content || '').slice(0, 200)}`).join('\n');
}

const BRIEFING_EXTRACT_PROMPT = `Você é um assistente de agência. A mensagem abaixo foi enviada por um cliente em um grupo de WhatsApp.
Extraia um briefing conciso a partir dessa mensagem e do contexto da conversa.
Retorne APENAS JSON: { "title": "...", "objective": "...", "notes": "..." }
Se não houver solicitação clara de conteúdo, retorne { "skip": true }.`;

async function autoCreateBriefingFromMessage(params: {
  tenantId: string;
  clientId: string;
  senderName: string;
  content: string;
  groupMessageId: string;
  threadContext?: string;
  groupId?: string;
  groupJid?: string;
}) {
  const { tenantId, clientId, senderName, content, groupMessageId, threadContext, groupId, groupJid } = params;

  const contextBlock = threadContext ? `\n\nContexto da conversa recente:\n${threadContext}\n` : '';
  const result = await generateCompletion({
    prompt: `${contextBlock}Mensagem de ${senderName}:\n"${content}"`,
    systemPrompt: BRIEFING_EXTRACT_PROMPT,
    temperature: 0.1,
    maxTokens: 512,
  });

  const jsonMatch = result.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return;
  const parsed = JSON.parse(jsonMatch[0]);
  if (parsed.skip) return;

  // Resolve edro_clients UUID
  const { rows: edroRows } = await query(
    `SELECT id FROM edro_clients WHERE client_id = $1 AND tenant_id = $2 LIMIT 1`,
    [clientId, tenantId],
  );
  if (!edroRows.length) return;

  const { createBriefing } = await import('../repositories/edroBriefingRepository');
  const briefing = await createBriefing({
    clientId: edroRows[0].id,
    title: parsed.title,
    status: 'draft',
    payload: {
      objective: parsed.objective,
      notes: `${parsed.notes ?? ''}\n\nOrigem: WhatsApp grupo — "${content.slice(0, 200)}"`,
      origin: 'whatsapp_group',
      wa_message_id: groupMessageId,
      sender: senderName,
    },
    createdBy: 'jarvis-whatsapp',
  });

  // Link briefing to message
  await query(
    `UPDATE whatsapp_group_messages SET briefing_id = $1, processed = true WHERE wa_message_id = $2`,
    [briefing.id, groupMessageId],
  );

  // Send briefing confirmation to the group
  if (groupId && groupJid) {
    const confirmText = `✅ *Briefing capturado!*\n\n📋 *Título:* ${parsed.title}\n🎯 *Objetivo:* ${parsed.objective || 'N/A'}\n👤 *Solicitante:* ${senderName}\n\nO briefing foi criado automaticamente e está disponível no painel. A equipe será notificada.`;

    sendOutboundMessage({
      tenantId,
      groupId,
      groupJid,
      clientId,
      scenario: 'briefing_confirm',
      triggerKey: `briefing_confirm:${briefing.id}`,
      messageText: confirmText,
    }).catch(() => {});
  }
}

// ── Urgent insight fast-path ──────────────────────────────────────────────

async function insertUrgentInsight(
  tenantId: string,
  clientId: string,
  waMessageId: string,
  senderName: string,
  content: string,
) {
  // Resolve message UUID from wa_message_id
  const { rows } = await query(
    `SELECT id FROM whatsapp_group_messages WHERE wa_message_id = $1`,
    [waMessageId],
  );
  if (!rows.length) return;

  await query(
    `INSERT INTO whatsapp_message_insights
       (tenant_id, client_id, message_id, insight_type, summary, sentiment, urgency, entities, confidence)
     VALUES ($1, $2, $3, 'request', $4, 'neutral', 'urgent', $5, 0.9)
     ON CONFLICT DO NOTHING`,
    [
      tenantId,
      clientId,
      rows[0].id,
      `[URGENTE] ${senderName}: ${content.slice(0, 300)}`,
      JSON.stringify({ people: [senderName], topics: [] }),
    ],
  );

  // Mark as insight_extracted so the worker doesn't re-process
  await query(
    `UPDATE whatsapp_group_messages SET insight_extracted = true WHERE id = $1`,
    [rows[0].id],
  );
}
