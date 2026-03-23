/**
 * Instagram DMs Webhook Handler
 * Receives Instagram Direct Messages via Meta webhook and routes them to Jarvis.
 *
 * Register in Meta App Dashboard:
 *   Callback URL:   https://api.edro.digital/webhook/instagram
 *   Verify Token:   META_VERIFY_TOKEN env var
 *   Subscriptions:  messages, messaging_postbacks
 *
 * ENV vars:
 *   META_VERIFY_TOKEN — same token configured in Meta App settings
 *   META_APP_SECRET   — used for payload signature verification (optional hardening)
 */

import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { env } from '../env';
import { generateWithProvider } from '../services/ai/copyOrchestrator';
import { createBriefing } from '../repositories/edroBriefingRepository';
import {
  getCapturedRawBody,
  registerRawBodyCapture,
  verifyMetaWebhookSignature,
} from '../services/integrations/webhookSecurityService';

const BRIEFING_PROMPT = `Você é um assistente de agência. Uma mensagem chegou via Instagram Direct de um cliente.
Extraia um briefing conciso. Retorne APENAS JSON: { "title": "...", "objective": "...", "notes": "..." }
Se não houver solicitação de conteúdo (é só uma saudação ou pergunta simples), retorne { "skip": true }.`;

const MIN_TEXT_LENGTH = 10;

export default async function webhookInstagramRoutes(app: FastifyInstance) {
  registerRawBodyCapture(app, ['/webhook/instagram']);

  // ── Webhook verification (GET challenge from Meta) ────────────────────────
  app.get('/webhook/instagram', { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } }, async (request: any, reply) => {
    const {
      'hub.mode': mode,
      'hub.verify_token': token,
      'hub.challenge': challenge,
    } = request.query as Record<string, string>;

    const expected = env.META_VERIFY_TOKEN || env.WHATSAPP_WEBHOOK_SECRET;
    if (mode === 'subscribe' && token === expected) {
      console.log('[webhookInstagram] Webhook verified.');
      // codeql[js/reflected-xss] Standard Meta webhook challenge — opaque numeric token echoed only after verify_token validation
      return reply.type('text/plain').send(String(challenge));
    }
    return reply.status(403).send('Forbidden');
  });

  // ── Inbound messages (POST from Meta) ────────────────────────────────────
  // codeql[js/missing-rate-limiting] rate limiting applied via Fastify { config: { rateLimit: { max: 300 } } } — not recognised by CodeQL's Express sanitizer
  app.post('/webhook/instagram', { config: { rateLimit: { max: 300, timeWindow: '1 minute' } } }, async (request, reply) => {
    if (env.META_APP_SECRET) {
      try {
        verifyMetaWebhookSignature(request.headers as Record<string, string | string[] | undefined>, getCapturedRawBody(request), env.META_APP_SECRET);
      } catch (error: any) {
        request.log.warn({ error: error?.message }, '[webhookInstagram] signature verification failed');
        return reply.code(401).send({ error: 'invalid_signature' });
      }
    }

    // Ack immediately — Meta expects 200 within 20s
    reply.code(200).send({ received: true });

    const body = request.body as any;
    if (!body?.entry) return;

    for (const entry of body.entry as any[]) {
      const pageId = entry.id as string;

      // Messaging events
      for (const messaging of entry.messaging ?? []) {
        try {
          await processInstagramMessage(pageId, messaging);
        } catch (err: any) {
          console.error('[webhookInstagram] processMessage error:', err?.message);
        }
      }
    }
  });
}

// ── Resolve tenant + client from Instagram page ID ────────────────────────

async function resolveTenantFromPage(pageId: string): Promise<{
  tenantId: string;
  clientId: string | null;
} | null> {
  // connectors table stores instagram_page_id in secrets_meta JSONB
  const { rows } = await query(
    `SELECT c.tenant_id, c.client_id
     FROM connectors c
     WHERE c.type = 'instagram'
       AND c.secrets_meta->>'page_id' = $1
     LIMIT 1`,
    [pageId],
  );
  if (!rows.length) return null;
  return { tenantId: rows[0].tenant_id, clientId: rows[0].client_id ?? null };
}

// ── Process a single messaging event ─────────────────────────────────────

async function processInstagramMessage(pageId: string, messaging: any) {
  const senderId = messaging.sender?.id as string | undefined;
  if (!senderId) return;

  // Skip messages sent by the page itself
  if (messaging.sender?.id === messaging.recipient?.id) return;

  const tenantCtx = await resolveTenantFromPage(pageId);
  if (!tenantCtx) return; // Instagram account not configured for any tenant

  const { tenantId, clientId } = tenantCtx;

  // Idempotency via message ID
  const messageId = messaging.message?.mid as string | undefined;
  if (messageId) {
    const { rows: existing } = await query(
      `SELECT id FROM instagram_messages WHERE id::text = $1 OR raw_payload->>'mid' = $1`,
      [messageId],
    );
    if (existing.length) return;
  }

  const { type, content, mediaUrl } = extractInstagramContent(messaging);
  if (!content && !mediaUrl) return;

  // Persist message
  const { rows: inserted } = await query(
    `INSERT INTO instagram_messages
       (tenant_id, client_id, instagram_thread_id, sender_id, type, content, media_url, raw_payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      tenantId,
      clientId,
      messaging.sender?.id ?? null,
      senderId,
      type,
      content ?? null,
      mediaUrl ?? null,
      JSON.stringify(messaging),
    ],
  );
  const msgRow = inserted[0];

  if (!clientId || !content || content.length < MIN_TEXT_LENGTH) return;

  // Create briefing via Jarvis
  await autoCreateBriefingFromInstagram({
    tenantId,
    clientId,
    senderId,
    content,
    messageDbId: msgRow.id,
  }).catch(err => console.error('[webhookInstagram] briefing creation failed:', err?.message));
}

// ── Extract content from Instagram messaging event ────────────────────────

function extractInstagramContent(messaging: any): {
  type: string;
  content: string | null;
  mediaUrl: string | null;
} {
  const msg = messaging.message ?? {};

  if (msg.text) {
    return { type: 'text', content: msg.text, mediaUrl: null };
  }

  if (msg.attachments?.length) {
    const att = msg.attachments[0];
    const mediaUrl = att.payload?.url ?? null;
    if (att.type === 'audio') return { type: 'audio', content: null, mediaUrl };
    if (att.type === 'image') return { type: 'image', content: null, mediaUrl };
    if (att.type === 'video') return { type: 'video', content: null, mediaUrl };
    if (att.type === 'story_mention' || att.type === 'story_reply') {
      return { type: 'story_reply', content: att.payload?.title ?? null, mediaUrl };
    }
  }

  if (messaging.reaction) {
    return { type: 'reaction', content: messaging.reaction.emoji ?? null, mediaUrl: null };
  }

  return { type: 'unknown', content: null, mediaUrl: null };
}

// ── Auto-create briefing from Instagram DM ────────────────────────────────

async function autoCreateBriefingFromInstagram(params: {
  tenantId: string;
  clientId: string;
  senderId: string;
  content: string;
  messageDbId: string;
}) {
  const { tenantId, clientId, senderId, content, messageDbId } = params;

  const result = await generateWithProvider('gemini', {
    prompt: `Mensagem recebida via Instagram Direct de ${senderId}:\n"${content}"`,
    systemPrompt: BRIEFING_PROMPT,
    temperature: 0.1,
    maxTokens: 512,
  });

  const jsonMatch = result.output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return;
  const parsed = JSON.parse(jsonMatch[0]);
  if (parsed.skip) return;

  const { rows: edroRows } = await query(
    `SELECT id FROM edro_clients WHERE client_id = $1 AND tenant_id = $2 LIMIT 1`,
    [clientId, tenantId],
  );
  if (!edroRows.length) return;

  const briefing = await createBriefing({
    clientId: edroRows[0].id,
    title: parsed.title,
    status: 'draft',
    payload: {
      objective: parsed.objective,
      notes: `${parsed.notes ?? ''}\n\nOrigem: Instagram Direct — "${content.slice(0, 200)}"`,
      origin: 'instagram_dm',
      sender_id: senderId,
      instagram_message_db_id: messageDbId,
    },
    createdBy: 'jarvis-instagram',
  });

  await query(
    `UPDATE instagram_messages SET briefing_id = $1, jarvis_processed = true WHERE id = $2`,
    [briefing.id, messageDbId],
  );
}
