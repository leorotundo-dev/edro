/**
 * whatsappBriefingService.ts
 *
 * Handles incoming WhatsApp Cloud API messages (audio or text) from clients.
 * For each message:
 *   1. Downloads the audio (if voice note) and transcribes via Whisper
 *   2. Passes transcript/text to BriefingCreator (Claude) to extract structured brief
 *   3. Saves the briefing to edro_briefings + sends a confirmation reply
 *
 * Connector setup (connectors table):
 *   provider:    'whatsapp'
 *   payload:     { phone_number_id: string, waba_id: string, client_phone: string }
 *   secrets_enc: encrypted({ access_token: string, verify_token: string })
 *
 * Called by: POST /webhook/whatsapp
 */
import { query } from '../../db/db';
import { decryptJSON } from '../../security/secrets';
import { env } from '../../env';
import { persistWhatsAppMessageMemory } from '../whatsappClientMemoryService';

const GRAPH_API = 'https://graph.facebook.com/v18.0';

// ── Types ─────────────────────────────────────────────────────────────────────

interface WhatsAppMessage {
  id:        string;
  from:      string;          // sender phone number
  timestamp: string;
  type:      'text' | 'audio' | 'document';
  text?:     { body: string };
  audio?:    { id: string; mime_type: string };
}

interface WhatsAppWebhookBody {
  object: string;
  entry?: Array<{
    id: string;
    changes?: Array<{
      value?: {
        metadata?:  { phone_number_id: string; display_phone_number: string };
        messages?:  WhatsAppMessage[];
        contacts?:  Array<{ profile: { name: string }; wa_id: string }>;
      };
    }>;
  }>;
}

// ── Meta Graph API helpers ─────────────────────────────────────────────────────

async function downloadMedia(mediaId: string, accessToken: string): Promise<Buffer> {
  // Step 1: resolve media URL
  const metaRes = await fetch(`${GRAPH_API}/${mediaId}?access_token=${accessToken}`);
  if (!metaRes.ok) throw new Error(`WhatsApp media URL fetch failed (${metaRes.status})`);
  const meta = await metaRes.json() as { url: string };

  // Step 2: download binary
  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!fileRes.ok) throw new Error(`WhatsApp media download failed (${fileRes.status})`);

  const buffer = await fileRes.arrayBuffer();
  return Buffer.from(buffer);
}

async function sendWhatsAppText(
  phoneNumberId: string,
  to:            string,
  text:          string,
  accessToken:   string,
): Promise<void> {
  await fetch(`${GRAPH_API}/${phoneNumberId}/messages`, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  }).catch(() => {}); // non-blocking
}

// ── Whisper transcription ──────────────────────────────────────────────────────

async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const ext = mimeType.includes('ogg') ? 'ogg' : 'mp4';
  const form = new FormData();
  form.append('file', new Blob([audioBuffer.buffer as ArrayBuffer], { type: mimeType }), `audio.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'pt');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method:  'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body:    form,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Whisper error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json() as { text: string };
  return data.text;
}

// ── BriefingCreator (Claude) ──────────────────────────────────────────────────

interface ExtractedBrief {
  title:       string;
  objective:   string;
  target:      string;
  tone:        string;
  deadline:    string | null;
  key_message: string;
  cta:         string;
}

async function extractBriefFromText(text: string, clientName: string): Promise<ExtractedBrief> {
  const { generateCompletion } = await import('../ai/claudeService');

  const prompt = `You are a creative briefing assistant for a digital marketing agency called Edro.
A client named "${clientName}" sent this message via WhatsApp:

"""
${text}
"""

Extract a structured creative brief from this message. Respond ONLY with valid JSON:
{
  "title": "short brief title (max 10 words)",
  "objective": "main campaign objective",
  "target": "target audience",
  "tone": "communication tone (ex: descontraído, formal, inspirador)",
  "deadline": "deadline in ISO date (YYYY-MM-DD) or null if not mentioned",
  "key_message": "core message to communicate",
  "cta": "desired call to action"
}

If a field is not mentioned, infer from context or use a reasonable default. Always respond in Brazilian Portuguese.`;

  const result = await generateCompletion({ prompt, temperature: 0.3, maxTokens: 600 });
  const text2  = result.text.trim();

  // Extract JSON from response
  const match = text2.match(/\{[\s\S]*\}/);
  if (!match) return {
    title: 'Briefing via WhatsApp',
    objective: text.slice(0, 200),
    target: 'A definir',
    tone: 'A definir',
    deadline: null,
    key_message: text.slice(0, 300),
    cta: 'A definir',
  };

  return JSON.parse(match[0]) as ExtractedBrief;
}

// ── Main: process incoming WhatsApp message ───────────────────────────────────

export async function processWhatsAppMessage(
  phoneNumberId:  string,
  message:        WhatsAppMessage,
  contactName:    string,
  accessToken:    string,
): Promise<void> {
  const senderPhone = message.from;

  // Find the connector (client) that matches this phone number
  const { rows: connectors } = await query(
    `SELECT c.id AS connector_id, c.tenant_id, c.client_id, c.payload, c.secrets_enc,
            cl.name AS client_name
     FROM connectors c
     JOIN clients cl ON cl.id = c.client_id
     WHERE c.provider = 'whatsapp'
       AND c.status   = 'active'
       AND c.payload->>'phone_number_id' = $1
       AND c.payload->>'client_phone'    = $2`,
    [phoneNumberId, senderPhone],
  );

  if (!connectors.length) {
    // Unknown sender — silently ignore (could be wrong number or unconfigured connector)
    console.log(`[whatsapp] Unknown sender: ${senderPhone} on phone_number_id ${phoneNumberId}`);
    return;
  }

  const conn       = connectors[0];
  const tenantId   = conn.tenant_id as string;
  const clientId   = conn.client_id as string;
  const clientName = conn.client_name as string;

  let rawText = '';

  try {
    if (message.type === 'text' && message.text?.body) {
      rawText = message.text.body;
    } else if (message.type === 'audio' && message.audio?.id) {
      // Transcribe audio
      const audioBuffer = await downloadMedia(message.audio.id, accessToken);
      rawText = await transcribeAudio(audioBuffer, message.audio.mime_type || 'audio/ogg');
    } else {
      return; // Unsupported message type
    }

    if (!rawText.trim()) return;

    const { rows: storedMessageRows } = await query<{ id: string; created_at: string }>(
      `INSERT INTO whatsapp_messages
         (id, tenant_id, client_id, phone_number_id, wa_message_id, sender_phone, direction, type, raw_text, created_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4, $5, 'inbound', $6, $7, now())
       ON CONFLICT (wa_message_id) DO UPDATE
         SET raw_text = COALESCE(whatsapp_messages.raw_text, EXCLUDED.raw_text)
       RETURNING id, created_at`,
      [tenantId, clientId, phoneNumberId, message.id, senderPhone, message.type, rawText.slice(0, 4000)],
    ).catch(() => ({ rows: [] as Array<{ id: string; created_at: string }> }));

    await persistWhatsAppMessageMemory({
      tenantId,
      clientId,
      externalMessageId: message.id,
      text: rawText,
      senderName: contactName,
      senderPhone,
      direction: 'inbound',
      messageType: message.type,
      createdAt: storedMessageRows[0]?.created_at ? new Date(storedMessageRows[0].created_at) : new Date(),
      channel: 'cloud',
    }).catch(() => {});

    // Extract structured brief via Claude
    const brief = await extractBriefFromText(rawText, clientName);

    // Save briefing to edro_briefings
    const title = brief.title || 'Briefing via WhatsApp';
    await query(
      `INSERT INTO edro_briefings
         (id, tenant_id, main_client_id, title, status, source, payload, created_at, updated_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, 'todo', 'whatsapp', $4::jsonb, now(), now())`,
      [
        tenantId,
        clientId,
        title,
        JSON.stringify({
          objective:   brief.objective,
          target:      brief.target,
          tone:        brief.tone,
          due_at:      brief.deadline,
          key_message: brief.key_message,
          cta:         brief.cta,
          raw_message: rawText.slice(0, 2000),
          whatsapp_sender: senderPhone,
          contact_name:    contactName,
        }),
      ],
    );

    // Send confirmation to client
    await sendWhatsAppText(
      phoneNumberId,
      senderPhone,
      `✅ Briefing recebido, ${contactName.split(' ')[0]}! Já está na fila da equipe Edro.\n\n📋 *${title}*\nVamos entrar em contato em breve.`,
      accessToken,
    );
  } catch (err: any) {
    console.error(`[whatsapp] Error processing message from ${senderPhone}:`, err?.message);
    // Try to send error reply (best-effort)
    await sendWhatsAppText(
      phoneNumberId,
      senderPhone,
      '❌ Desculpe, não consegui processar sua mensagem agora. Por favor, tente novamente ou entre em contato diretamente com a agência.',
      accessToken,
    ).catch(() => {});
  }
}

// ── Webhook entry point ───────────────────────────────────────────────────────

export async function handleWhatsAppWebhook(
  body:           WhatsAppWebhookBody,
  phoneNumberId?: string,
): Promise<void> {
  if (body.object !== 'whatsapp_business_account') return;

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      if (!value) continue;

      const pid      = value.metadata?.phone_number_id ?? phoneNumberId ?? '';
      const messages = value.messages ?? [];
      const contacts = value.contacts ?? [];

      // Resolve the access token for this phone_number_id
      const { rows } = await query(
        `SELECT secrets_enc FROM connectors
         WHERE provider = 'whatsapp' AND status = 'active'
           AND payload->>'phone_number_id' = $1
         LIMIT 1`,
        [pid],
      );
      if (!rows.length) continue;

      const secrets     = await decryptJSON(rows[0].secrets_enc).catch(() => ({} as any));
      const accessToken = (secrets.access_token as string) || '';
      if (!accessToken) continue;

      for (const msg of messages) {
        const contact = contacts.find((c) => c.wa_id === msg.from);
        const name    = contact?.profile?.name ?? msg.from;
        // Process async, don't await (webhook must return 200 fast)
        processWhatsAppMessage(pid, msg, name, accessToken).catch((e) =>
          console.error('[whatsapp] async error:', e?.message),
        );
      }
    }
  }
}
