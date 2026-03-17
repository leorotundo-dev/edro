/**
 * Universal Inbound Webhook
 * One URL per client — accepts any JSON from Zapier, Make, n8n, or custom integrations.
 *
 * URL: POST /webhook/inbound/:clientToken
 * No auth required — the token IS the auth.
 *
 * Payload extraction priority:
 *   message > text > content > body > description > subject
 */

import crypto from 'crypto';
import { FastifyInstance } from 'fastify';
import { query } from '../db';
import { generateWithProvider } from '../services/ai/copyOrchestrator';
import { createBriefing } from '../repositories/edroBriefingRepository';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';

const BRIEFING_PROMPT = `Você é um assistente de agência. Uma mensagem chegou via webhook externo (Zapier/Make/n8n) de um cliente.
Extraia um briefing conciso. Retorne APENAS JSON: { "title": "...", "objective": "...", "notes": "..." }
Se não houver solicitação de conteúdo, retorne { "skip": true }.`;

// Best-effort extraction of a message string from arbitrary JSON payloads
function extractMessage(payload: any): string | null {
  if (!payload || typeof payload !== 'object') return null;

  // Common field names from Zapier / Make / n8n / Slack / custom
  const candidates = [
    payload.message,
    payload.text,
    payload.content,
    payload.body,
    payload.description,
    payload.subject,
    payload.summary,
    payload.note,
    payload.comment,
    // Nested: data.message, event.text, etc.
    payload.data?.message,
    payload.data?.text,
    payload.event?.text,
    payload.payload?.text,
    payload.payload?.message,
  ];

  for (const val of candidates) {
    if (typeof val === 'string' && val.trim().length > 3) {
      return val.trim();
    }
  }

  return null;
}

export default async function webhookUniversalRoutes(app: FastifyInstance) {

  // ── Health check (GET) ────────────────────────────────────────────────────
  app.get<{ Params: { clientToken: string } }>('/webhook/inbound/:clientToken', async (_request, reply) => {
    reply.send({ ok: true, service: 'edro-webhook' });
  });

  // ── Inbound webhook (POST) ────────────────────────────────────────────────
  app.post<{ Params: { clientToken: string } }>('/webhook/inbound/:clientToken', async (request, reply) => {
    // Ack immediately — process async
    reply.code(200).send({ received: true });

    const { clientToken } = request.params;

    try {
      // Resolve client from token
      const { rows } = await query(
        `SELECT id, tenant_id, name FROM clients WHERE webhook_secret = $1 LIMIT 1`,
        [clientToken],
      );
      if (!rows.length) return;

      const { id: clientId, tenant_id: tenantId, name: clientName } = rows[0];

      const rawPayload = request.body ?? {};
      const extractedMessage = extractMessage(rawPayload);

      // Detect source from User-Agent
      const ua = String(request.headers['user-agent'] || '').toLowerCase();
      const source = ua.includes('zapier') ? 'zapier'
        : ua.includes('make') || ua.includes('integromat') ? 'make'
        : ua.includes('n8n') ? 'n8n'
        : 'custom';

      const eventType = (rawPayload as any).event_type
        ?? (rawPayload as any).type
        ?? (rawPayload as any).action
        ?? null;

      // Persist event
      const { rows: evtRows } = await query(
        `INSERT INTO webhook_events
           (tenant_id, client_id, source, event_type, raw_payload, extracted_message)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id`,
        [tenantId, clientId, source, eventType, JSON.stringify(rawPayload), extractedMessage ?? null],
      );
      const eventId = evtRows[0]?.id;

      // If a message was found, send to Jarvis for briefing creation
      if (extractedMessage && extractedMessage.length >= 10) {
        await processWebhookMessage({
          tenantId,
          clientId,
          clientName,
          message: extractedMessage,
          source,
          eventId,
        }).catch(err => console.error('[webhookUniversal] processMessage failed:', err?.message));
      }
    } catch (err: any) {
      console.error('[webhookUniversal] error:', err?.message);
    }
  });
}

async function processWebhookMessage(params: {
  tenantId: string;
  clientId: string;
  clientName: string;
  message: string;
  source: string;
  eventId: string;
}) {
  const { tenantId, clientId, clientName, message, source, eventId } = params;

  const result = await generateWithProvider('gemini', {
    prompt: `Mensagem recebida via ${source} do cliente ${clientName}:\n"${message}"`,
    systemPrompt: BRIEFING_PROMPT,
    temperature: 0.1,
    maxTokens: 512,
  });

  const jsonMatch = result.output.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return;
  const parsed = JSON.parse(jsonMatch[0]);
  if (parsed.skip) return;

  // Resolve edro_clients UUID
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
      notes: `${parsed.notes ?? ''}\n\nOrigem: Webhook ${source} — "${message.slice(0, 200)}"`,
      origin: 'webhook',
      source,
      webhook_event_id: eventId,
    },
    createdBy: `jarvis-webhook-${source}`,
  });

  // Link briefing to webhook event
  await query(
    `UPDATE webhook_events SET briefing_id = $1, jarvis_processed = true WHERE id = $2`,
    [briefing.id, eventId],
  );
}

// ── Admin API routes (registered with /api prefix) ────────────────────────

export async function webhookAdminRoutes(app: FastifyInstance) {

  // GET /clients/:clientId/webhook-events — list recent webhook events for a client
  app.get<{ Params: { clientId: string } }>('/clients/:clientId/webhook-events', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { clientId } = request.params;

    const { rows } = await query(
      `SELECT id, source, event_type, extracted_message, raw_payload, jarvis_processed, briefing_id, created_at
       FROM webhook_events
       WHERE client_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC
       LIMIT 20`,
      [clientId, tenantId],
    );

    return reply.send({ data: rows });
  });

  // POST /clients/:clientId/webhook-secret/regenerate — regenerate webhook secret
  app.post<{ Params: { clientId: string } }>('/clients/:clientId/webhook-secret/regenerate', {
    preHandler: [authGuard, tenantGuard()],
  }, async (request, reply) => {
    const tenantId = (request.user as any).tenant_id;
    const { clientId } = request.params;

    const newSecret = crypto.randomUUID();

    await query(
      `UPDATE clients SET webhook_secret = $1 WHERE id = $2 AND tenant_id = $3`,
      [newSecret, clientId, tenantId],
    );

    return reply.send({ ok: true, webhook_secret: newSecret });
  });
}
