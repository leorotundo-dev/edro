/**
 * whatsappBriefingService.ts
 *
 * Receives an incoming WhatsApp message (text or audio), extracts a
 * structured creative briefing via AI, persists it, and replies to
 * the sender with a confirmation + link.
 *
 * Flow:
 *   text message  →  Claude extracts briefing fields
 *   audio message →  download from Meta CDN → Whisper transcription → Claude extraction
 *   both          →  createBriefing() + sendWhatsAppText() confirmation
 */

import FormData from 'form-data';
import { sendWhatsAppText } from './whatsappService';
import { createBriefing } from '../repositories/edroBriefingRepository';
import { ClaudeService } from './ai/claudeService';
import { query } from '../db/db';

const WA_API_BASE = 'https://graph.facebook.com';
const WA_VERSION  = process.env.WHATSAPP_API_VERSION || 'v21.0';
const WA_TOKEN    = process.env.WHATSAPP_TOKEN || '';

// ── Download a WhatsApp media file using its media ID ──────────────────────
async function downloadWhatsAppMedia(mediaId: string): Promise<{ buffer: Buffer; mimeType: string }> {
  // Step 1: resolve media URL
  const metaRes = await fetch(`${WA_API_BASE}/${WA_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
  });
  if (!metaRes.ok) throw new Error(`WA media lookup failed (${metaRes.status})`);
  const meta = await metaRes.json() as { url: string; mime_type: string };

  // Step 2: download binary
  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${WA_TOKEN}` },
  });
  if (!fileRes.ok) throw new Error(`WA media download failed (${fileRes.status})`);

  const buffer   = Buffer.from(await fileRes.arrayBuffer());
  const mimeType = meta.mime_type || 'audio/ogg';
  return { buffer, mimeType };
}

// ── Transcribe audio via OpenAI Whisper ────────────────────────────────────
async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const OpenAI = (await import('openai')).default;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Map MIME type to a file extension Whisper accepts
  const extMap: Record<string, string> = {
    'audio/ogg':  'ogg',
    'audio/mpeg': 'mp3',
    'audio/wav':  'wav',
    'audio/mp4':  'm4a',
    'audio/aac':  'aac',
  };
  const ext = extMap[mimeType] || 'ogg';

  // Build a FormData-compatible File from the buffer
  const form = new FormData();
  form.append('file', buffer, { filename: `audio.${ext}`, contentType: mimeType });
  form.append('model', 'whisper-1');
  form.append('language', 'pt');

  const url = 'https://api.openai.com/v1/audio/transcriptions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      ...form.getHeaders(),
    },
    body: form.getBuffer() as unknown as BodyInit,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Whisper transcription failed (${res.status}): ${err.slice(0, 200)}`);
  }
  const data = await res.json() as { text: string };
  return data.text || '';
}

// ── Extract structured briefing fields from raw text via Claude ────────────
async function extractBriefingFields(text: string): Promise<{
  title: string;
  objective: string;
  target_audience: string;
  tone: string;
  platform: string;
  deadline: string;
  additional_notes: string;
}> {
  const prompt = `Você é um assistente de briefing de agência de marketing.
A mensagem abaixo foi enviada pelo cliente via WhatsApp. Extraia as informações para um briefing criativo.

Mensagem do cliente:
"""
${text.slice(0, 2000)}
"""

Retorne APENAS um JSON válido com os campos:
{
  "title": "título curto e descritivo para o briefing (máx 60 chars)",
  "objective": "objetivo principal da campanha/peça",
  "target_audience": "público-alvo descrito brevemente",
  "tone": "tom de comunicação (ex: profissional, descontraído, urgente)",
  "platform": "plataforma principal (ex: Instagram, LinkedIn, Google Ads, email)",
  "deadline": "prazo mencionado pelo cliente ou ''",
  "additional_notes": "outras informações relevantes"
}`;

  const aiRes = await ClaudeService.generateCompletion({ prompt, maxTokens: 400, temperature: 0.2 });
  try {
    const json = aiRes.text.match(/\{[\s\S]*\}/)?.[0] || '{}';
    return JSON.parse(json);
  } catch {
    return {
      title:            text.slice(0, 55) + '…',
      objective:        text.slice(0, 200),
      target_audience:  '',
      tone:             '',
      platform:         '',
      deadline:         '',
      additional_notes: '',
    };
  }
}

// ── Resolve tenant + client by WhatsApp phone number ──────────────────────
async function resolveByPhone(phone: string): Promise<{ tenantId: string; clientId: string; clientName: string } | null> {
  // Normalize: strip country code prefix for fuzzy match
  const normalized = phone.replace(/^55/, '').replace(/\D/g, '');

  const { rows } = await query<{ id: string; tenant_id: string; name: string; whatsapp_phone?: string }>(
    `SELECT id, tenant_id, name, whatsapp_phone
     FROM clients
     WHERE whatsapp_phone IS NOT NULL
       AND REGEXP_REPLACE(whatsapp_phone, '[^0-9]', '', 'g') LIKE $1
     LIMIT 1`,
    [`%${normalized}`],
  );

  if (rows.length) {
    return { tenantId: rows[0].tenant_id, clientId: rows[0].id, clientName: rows[0].name };
  }
  return null;
}

// ── Format a short preview of the briefing for the WhatsApp reply ──────────
function buildReply(fields: ReturnType<typeof extractBriefingFields> extends Promise<infer T> ? T : never, briefingId: string): string {
  const BASE = process.env.APP_URL || 'https://app.edro.digital';
  const lines: string[] = [
    `✅ *Briefing criado com sucesso!*`,
    ``,
    `📋 *${fields.title}*`,
  ];
  if (fields.objective)        lines.push(`🎯 Objetivo: ${fields.objective.slice(0, 100)}`);
  if (fields.platform)         lines.push(`📱 Plataforma: ${fields.platform}`);
  if (fields.target_audience)  lines.push(`👥 Público: ${fields.target_audience.slice(0, 80)}`);
  if (fields.deadline)         lines.push(`⏰ Prazo: ${fields.deadline}`);
  lines.push(``, `🔗 Abrir briefing: ${BASE}/edro/briefings/${briefingId}`);
  lines.push(``, `_Responda a esta mensagem para adicionar mais detalhes._`);
  return lines.join('\n');
}

// ── Main entry point ────────────────────────────────────────────────────────
export async function handleWhatsAppMessage(message: {
  from:      string;           // sender phone (e.g. "5511999887766")
  type:      'text' | 'audio' | 'voice' | string;
  text?:     { body: string };
  audio?:    { id: string; mime_type?: string };
  voice?:    { id: string; mime_type?: string };
}): Promise<void> {
  const from = message.from;

  // 1. Resolve client by phone number
  const resolved = await resolveByPhone(from);
  if (!resolved) {
    await sendWhatsAppText(from,
      '🤖 Olá! Não encontrei seu cadastro como cliente na plataforma Edro.\n\n' +
      'Peça para sua agência cadastrar seu número de WhatsApp no seu perfil de cliente.',
    );
    return;
  }
  const { tenantId, clientId, clientName } = resolved;

  // 2. Get raw text (or transcribe audio)
  let rawText = '';

  if (message.type === 'text' && message.text?.body) {
    rawText = message.text.body.trim();
  } else if ((message.type === 'audio' || message.type === 'voice') && (message.audio?.id || message.voice?.id)) {
    const mediaId   = (message.audio?.id || message.voice?.id)!;
    const mimeType  = message.audio?.mime_type || message.voice?.mime_type || 'audio/ogg';
    try {
      await sendWhatsAppText(from, `🎤 Recebi seu áudio! Transcrevendo... aguarde um momento.`);
      const { buffer } = await downloadWhatsAppMedia(mediaId);
      rawText = await transcribeAudio(buffer, mimeType);
      if (!rawText.trim()) throw new Error('Transcrição vazia');
    } catch (err: any) {
      await sendWhatsAppText(from, `❌ Não consegui transcrever o áudio: ${err?.message || 'erro desconhecido'}.\n\nTente enviar sua solicitação por texto.`);
      return;
    }
  } else {
    // Unsupported message type
    await sendWhatsAppText(from,
      '🤖 Entendido! Para criar um briefing, envie:\n\n' +
      '• Uma mensagem de texto descrevendo a demanda, ou\n' +
      '• Um áudio explicando o que precisa.\n\n' +
      'Inclua: objetivo, público-alvo, plataforma e prazo.',
    );
    return;
  }

  if (rawText.length < 10) {
    await sendWhatsAppText(from, '🤖 Mensagem muito curta. Descreva melhor o que você precisa para que eu possa criar o briefing.');
    return;
  }

  // 3. Extract briefing fields via Claude
  const fields = await extractBriefingFields(rawText);

  // 4. Create briefing in DB
  const briefing = await createBriefing({
    clientId,
    mainClientId: clientId,
    title:        fields.title || rawText.slice(0, 55),
    status:       'briefing',
    source:       'whatsapp',
    payload: {
      objective:        fields.objective,
      target_audience:  fields.target_audience,
      tone:             fields.tone,
      platform:         fields.platform,
      deadline:         fields.deadline,
      additional_notes: fields.additional_notes,
      whatsapp_raw_text: rawText.slice(0, 1000),
      whatsapp_from:    from,
    },
    createdBy: `whatsapp:${from}`,
  });

  // 5. Send confirmation
  const replyText = buildReply(fields, briefing.id);
  await sendWhatsAppText(from, replyText);

  console.log(`[whatsapp-briefing] Created briefing ${briefing.id} for client ${clientName} (${clientId}) from phone ${from}`);
}
