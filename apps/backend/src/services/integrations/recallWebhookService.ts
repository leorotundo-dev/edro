import crypto from 'crypto';
import { Buffer } from 'buffer';
import { query } from '../../db';
import { isInternalClientId } from '../../repos/clientsRepo';
import { env } from '../../env';
import { enqueueJob } from '../../jobs/jobQueue';
import { getRecallBotTranscript } from './recallService';
import { recordMeetingEvent, saveMeetingTranscript, updateMeetingState } from '../meetingService';
import { logActivity } from '../integrationMonitor';

type RecallWebhookPayload = {
  event?: string;
  data?: {
    data?: {
      code?: string | null;
      sub_code?: string | null;
      updated_at?: string | null;
      message?: string | null;
      // bot.chat.message fields
      participant?: { name?: string | null; email?: string | null; is_host?: boolean } | null;
      text?: string | null;
      created_at?: string | null;
    };
    bot?: {
      id?: string;
      metadata?: Record<string, any> | null;
    };
    recording?: {
      id?: string;
      metadata?: Record<string, any> | null;
    };
    transcript?: {
      id?: string;
      metadata?: Record<string, any> | null;
    };
  };
};

type MeetingContext = {
  meetingId: string;
  tenantId: string;
  clientId: string;
  clientName: string;
  botId: string | null;
  autoJoinId: string | null;
  meetingUrl: string | null;
  status: string | null;
};

export function verifyRecallWebhookSignature(
  headers: Record<string, string | undefined>,
  payload: string,
  secret: string,
): void {
  const msgId = headers['webhook-id'] ?? headers['Webhook-Id'];
  const msgTimestamp = headers['webhook-timestamp'] ?? headers['Webhook-Timestamp'];
  const msgSignature = headers['webhook-signature'] ?? headers['Webhook-Signature'];

  if (!msgId || !msgTimestamp || !msgSignature) {
    throw new Error('missing_recall_signature_headers');
  }

  const timestampSeconds = Number(msgTimestamp);
  if (Number.isFinite(timestampSeconds)) {
    const driftSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestampSeconds);
    if (driftSeconds > 300) {
      throw new Error('stale_recall_signature');
    }
  }

  const prefix = 'whsec_';
  const base64Part = secret.startsWith(prefix) ? secret.slice(prefix.length) : secret;
  const key = Buffer.from(base64Part, 'base64');
  const signedContent = `${msgId}.${msgTimestamp}.${payload}`;
  const expectedSig = crypto
    .createHmac('sha256', key)
    .update(signedContent)
    .digest('base64');

  const passedSigs = String(msgSignature).split(' ');
  for (const versionedSig of passedSigs) {
    const [version, signature] = versionedSig.split(',');
    if (version !== 'v1' || !signature) continue;

    const sigBytes = Buffer.from(signature, 'base64');
    const expectedSigBytes = Buffer.from(expectedSig, 'base64');
    if (
      expectedSigBytes.length === sigBytes.length &&
      crypto.timingSafeEqual(new Uint8Array(expectedSigBytes), new Uint8Array(sigBytes))
    ) {
      return;
    }
  }

  throw new Error('invalid_recall_signature');
}

export async function ingestRecallWebhook(params: {
  headers: Record<string, string | undefined>;
  rawBody: string;
  payload: RecallWebhookPayload;
}): Promise<{ id: string; duplicate: boolean }> {
  const webhookId = params.headers['webhook-id'] ?? params.headers['Webhook-Id'] ?? null;
  const webhookTimestamp = params.headers['webhook-timestamp'] ?? params.headers['Webhook-Timestamp'] ?? null;
  const eventType = String(params.payload?.event ?? '').trim() || 'unknown';
  const botId = stringifyOrNull(params.payload?.data?.bot?.id);
  const recordingId = stringifyOrNull(params.payload?.data?.recording?.id);
  const transcriptId = stringifyOrNull(params.payload?.data?.transcript?.id);
  const metadata = params.payload?.data?.bot?.metadata ?? {};
  const tenantId = stringifyOrNull(metadata?.tenant_id);
  const clientId = stringifyOrNull(metadata?.client_id);
  const meetingId = stringifyOrNull(metadata?.meeting_id);

  if (webhookId) {
    const existing = await query<{ id: string }>(
      `SELECT id FROM recall_webhook_events WHERE webhook_id = $1 LIMIT 1`,
      [webhookId],
    ).catch(() => ({ rows: [] as Array<{ id: string }> }));
    if (existing.rows[0]) {
      return { id: existing.rows[0].id, duplicate: true };
    }
  }

  const { rows } = await query<{ id: string }>(
    `INSERT INTO recall_webhook_events
       (webhook_id, webhook_timestamp, event_type, bot_id, recording_id, transcript_id, tenant_id, client_id, meeting_id, payload, raw_body)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::uuid, $10::jsonb, $11)
     RETURNING id`,
    [
      webhookId,
      webhookTimestamp,
      eventType,
      botId,
      recordingId,
      transcriptId,
      tenantId,
      clientId,
      meetingId,
      JSON.stringify(params.payload),
      params.rawBody,
    ],
  );

  return { id: rows[0].id, duplicate: false };
}

export async function processRecallWebhookEvent(webhookEventId: string): Promise<void> {
  const { rows } = await query<{
    id: string;
    event_type: string;
    tenant_id: string | null;
    client_id: string | null;
    payload: RecallWebhookPayload;
  }>(
    `SELECT id, event_type, tenant_id, client_id, payload
       FROM recall_webhook_events
      WHERE id = $1
      LIMIT 1`,
    [webhookEventId],
  );

  const stored = rows[0];
  if (!stored) return;

  try {
    const payload = stored.payload ?? {};
    const context = await resolveMeetingContext(payload);
    if (!context) {
      await markWebhookEvent(webhookEventId, 'ignored', 'meeting_not_found');
      if (stored.tenant_id) {
        logActivity({
          tenantId: stored.tenant_id,
          service: 'recall',
          event: stored.event_type || 'webhook_ignored',
          status: 'degraded',
          errorMsg: 'meeting_not_found',
          meta: {
            webhook_event_id: webhookEventId,
            client_id: stored.client_id,
          },
        });
      }
      return;
    }

    await applyRecallWebhookToMeeting(context, payload);
    await markWebhookEvent(webhookEventId, 'processed', null);
    logActivity({
      tenantId: context.tenantId,
      service: 'recall',
      event: stored.event_type || 'webhook_processed',
      status: 'ok',
      records: 1,
      meta: {
        webhook_event_id: webhookEventId,
        client_id: context.clientId,
        meeting_id: context.meetingId,
        bot_id: context.botId,
      },
    });
  } catch (error: any) {
    await markWebhookEvent(webhookEventId, 'failed', error?.message ?? 'recall_webhook_processing_failed');
    if (stored.tenant_id) {
      logActivity({
        tenantId: stored.tenant_id,
        service: 'recall',
        event: stored.event_type || 'webhook_failed',
        status: 'error',
        errorMsg: error?.message ?? 'recall_webhook_processing_failed',
        meta: {
          webhook_event_id: webhookEventId,
          client_id: stored.client_id,
        },
      });
    }
    throw error;
  }
}

async function applyRecallWebhookToMeeting(context: MeetingContext, payload: RecallWebhookPayload): Promise<void> {
  const eventType = String(payload.event ?? '');
  const eventData = payload.data?.data ?? {};
  const code = String(eventData.code ?? '').trim();
  const subCode = String(eventData.sub_code ?? '').trim() || null;
  const message = String(eventData.message ?? '').trim() || null;
  const reason = [code || null, subCode, message].filter(Boolean).join(': ') || null;

  if (eventType.startsWith('bot.')) {
    const nextStatus = mapRecallWebhookStatus(eventType);
    await updateMeetingState({
      meetingId: context.meetingId,
      tenantId: context.tenantId,
      changes: {
        bot_status: eventType.replace(/^bot\./, ''),
        status: nextStatus,
        failed_stage: eventType === 'bot.fatal' ? 'bot_finalize' : null,
        failed_reason: eventType === 'bot.fatal' ? reason : null,
        last_processed_at: new Date(),
      },
      event: {
        eventType: 'meeting.recall_webhook',
        stage: eventType === 'bot.fatal' ? 'bot_finalize' : 'bot_webhook',
        status: nextStatus,
        message: reason ?? eventType,
        actorType: 'system',
        actorId: 'recallWebhook',
        payload: {
          recall_event: eventType,
          code,
          sub_code: subCode,
          bot_id: context.botId,
        },
      },
    });

    if (context.autoJoinId) {
      await query(
        `UPDATE calendar_auto_joins
            SET status = $2,
                bot_id = COALESCE($3, bot_id),
                last_error = $4,
                processed_at = CASE WHEN $2 = 'done' THEN now() ELSE processed_at END,
                updated_at = now()
          WHERE id = $1`,
        [
          context.autoJoinId,
          eventType === 'bot.done' ? 'done' : eventType === 'bot.fatal' ? 'failed' : 'processing',
          context.botId,
          eventType === 'bot.fatal' ? reason : null,
        ],
      ).catch(() => {});
    }
  }

  if (eventType === 'transcript.failed') {
    if (context.autoJoinId) {
      await query(
        `UPDATE calendar_auto_joins
            SET status = 'failed',
                last_error = $2,
                updated_at = now()
          WHERE id = $1`,
        [context.autoJoinId, reason ?? 'transcript_failed'],
      ).catch(() => {});
    }

    await updateMeetingState({
      meetingId: context.meetingId,
      tenantId: context.tenantId,
      changes: {
        status: 'failed',
        failed_stage: 'transcript_fetch',
        failed_reason: reason ?? 'transcript_failed',
        last_processed_at: new Date(),
      },
      event: {
        eventType: 'meeting.transcript_failed',
        stage: 'transcript_fetch',
        status: 'failed',
        message: reason ?? 'Transcript failed',
        actorType: 'system',
        actorId: 'recallWebhook',
        payload: {
          recall_event: eventType,
          code,
          sub_code: subCode,
        },
      },
    });
    return;
  }

  if (eventType === 'recording.failed') {
    if (context.autoJoinId) {
      await query(
        `UPDATE calendar_auto_joins
            SET status = 'failed',
                last_error = $2,
                updated_at = now()
          WHERE id = $1`,
        [context.autoJoinId, reason ?? 'recording_failed'],
      ).catch(() => {});
    }

    await updateMeetingState({
      meetingId: context.meetingId,
      tenantId: context.tenantId,
      changes: {
        status: 'failed',
        failed_stage: 'bot_finalize',
        failed_reason: reason ?? 'recording_failed',
        last_processed_at: new Date(),
      },
      event: {
        eventType: 'meeting.recording_failed',
        stage: 'bot_finalize',
        status: 'failed',
        message: reason ?? 'Recording failed',
        actorType: 'system',
        actorId: 'recallWebhook',
        payload: {
          recall_event: eventType,
          code,
          sub_code: subCode,
        },
      },
    });
    return;
  }

  if (eventType === 'transcript.done') {
    try {
      const transcript = await getRecallBotTranscript(context.botId ?? '');
      if (transcript.trim()) {
        await saveMeetingTranscript({
          meetingId: context.meetingId,
          tenantId: context.tenantId,
          transcript,
          provider: 'recall',
          status: 'transcribed',
          actorType: 'system',
          actorId: 'recallWebhook',
        });
      }
    } catch {
      // The finalize job below remains the durable fallback.
    }
  }

  if (eventType === 'bot.chat.message') {
    const chatData = payload.data?.data ?? {};
    const text = String(chatData.text ?? '').trim();
    if (text && context.meetingId) {
      await query(
        `INSERT INTO meeting_chat_messages
           (meeting_id, tenant_id, client_id, sender_name, sender_email, is_host, message_text, sent_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          context.meetingId,
          context.tenantId,
          context.clientId,
          chatData.participant?.name ?? null,
          chatData.participant?.email ?? null,
          chatData.participant?.is_host ?? false,
          text,
          chatData.created_at ?? null,
        ],
      ).catch(() => {});
    }
    return;
  }

  if (['bot.call_ended', 'bot.done', 'recording.done', 'transcript.done'].includes(eventType)) {
    await enqueueImmediateFinalize(context);
  }
}

async function resolveMeetingContext(payload: RecallWebhookPayload): Promise<MeetingContext | null> {
  const metadata = payload.data?.bot?.metadata ?? {};
  const explicitMeetingId = stringifyOrNull(metadata?.meeting_id);
  const explicitTenantId = stringifyOrNull(metadata?.tenant_id);
  const explicitClientId = stringifyOrNull(metadata?.client_id);
  const explicitClientName = stringifyOrNull(metadata?.client_name);
  const autoJoinId = stringifyOrNull(metadata?.auto_join_id);
  const botId = stringifyOrNull(payload.data?.bot?.id);

  if (explicitMeetingId && explicitTenantId) {
    const { rows } = await query<{
      id: string;
      tenant_id: string;
      client_id: string;
      meeting_url: string | null;
      status: string | null;
      bot_id: string | null;
    }>(
      `SELECT id, tenant_id, client_id, meeting_url, status, bot_id
         FROM meetings
        WHERE id = $1 AND tenant_id = $2
        LIMIT 1`,
      [explicitMeetingId, explicitTenantId],
    ).catch(() => ({ rows: [] as any[] }));

    if (rows[0]) {
      return {
        meetingId: rows[0].id,
        tenantId: rows[0].tenant_id,
        clientId: rows[0].client_id,
        clientName: explicitClientName ?? (await resolveClientName(rows[0].tenant_id, rows[0].client_id)),
        botId: botId ?? rows[0].bot_id ?? null,
        autoJoinId,
        meetingUrl: rows[0].meeting_url ?? null,
        status: rows[0].status ?? null,
      };
    }
  }

  if (!botId) return null;

  const { rows } = await query<{
    id: string;
    tenant_id: string;
    client_id: string;
    meeting_url: string | null;
    status: string | null;
    source_ref_id: string | null;
    bot_id: string | null;
  }>(
    `SELECT id, tenant_id, client_id, meeting_url, status, source_ref_id, bot_id
       FROM meetings
      WHERE bot_id = $1 OR audio_key = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [botId, `recall:${botId}`],
  ).catch(() => ({ rows: [] as any[] }));

  if (!rows[0]) return null;

  return {
    meetingId: rows[0].id,
    tenantId: rows[0].tenant_id,
    clientId: rows[0].client_id,
    clientName: explicitClientName ?? (await resolveClientName(rows[0].tenant_id, rows[0].client_id)),
    botId: botId ?? rows[0].bot_id ?? null,
    autoJoinId: autoJoinId ?? rows[0].source_ref_id ?? null,
    meetingUrl: rows[0].meeting_url ?? null,
    status: rows[0].status ?? null,
  };
}

async function enqueueImmediateFinalize(context: MeetingContext): Promise<void> {
  if (!context.botId) return;

  const { rows: queuedRows } = await query<{ id: string }>(
    `SELECT id
       FROM job_queue
      WHERE tenant_id = $1::uuid
        AND type = 'meet-bot.finalize'
        AND status IN ('queued', 'processing')
        AND (
          payload->>'meetingId' = $2 OR
          payload->>'meeting_id' = $2 OR
          payload->>'botId' = $3 OR
          payload->>'bot_id' = $3
        )
      LIMIT 1`,
    [context.tenantId, context.meetingId, context.botId],
  ).catch(() => ({ rows: [] as Array<{ id: string }> }));

  if (queuedRows[0]) return;

  await enqueueJob(
    context.tenantId,
    'meet-bot.finalize',
    {
      tenantId: context.tenantId,
      clientId: context.clientId,
      clientName: context.clientName,
      meetingId: context.meetingId,
      botId: context.botId,
      autoJoinId: context.autoJoinId,
      finalizeAttempt: 0,
    },
    { scheduledFor: new Date(Date.now() + 10_000) },
  );

  await recordMeetingEvent({
    meetingId: context.meetingId,
    tenantId: context.tenantId,
    clientId: context.clientId,
    eventType: 'meeting.finalize_enqueued_from_webhook',
    stage: 'bot_finalize',
    status: 'transcript_pending',
    message: 'Finalize antecipado via webhook da Recall',
    actorType: 'system',
    actorId: 'recallWebhook',
    payload: {
      bot_id: context.botId,
      auto_join_id: context.autoJoinId,
    },
  });
}

async function resolveClientName(tenantId: string, clientId: string): Promise<string> {
  if (!clientId || isInternalClientId(clientId)) return 'Reunião Interna Edro';

  const { rows } = await query<{ name: string }>(
    `SELECT name FROM clients WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
    [tenantId, clientId],
  ).catch(() => ({ rows: [] as Array<{ name: string }> }));

  return rows[0]?.name ?? 'Cliente';
}

function mapRecallWebhookStatus(eventType: string): string {
  switch (eventType) {
    case 'bot.joining_call':
    case 'bot.in_waiting_room':
    case 'bot.recording_permission_allowed':
    case 'bot.recording_permission_denied':
      return 'joining';
    case 'bot.in_call_not_recording':
    case 'bot.in_call_recording':
      return 'in_call';
    case 'bot.call_ended':
    case 'bot.done':
      return 'transcript_pending';
    case 'bot.fatal':
      return 'failed';
    default:
      return 'bot_scheduled';
  }
}

async function markWebhookEvent(id: string, status: 'processed' | 'failed' | 'ignored', errorMessage: string | null): Promise<void> {
  await query(
    `UPDATE recall_webhook_events
        SET status = $2,
            error_message = $3,
            processed_at = CASE WHEN $2 IN ('processed', 'ignored') THEN now() ELSE processed_at END,
            updated_at = now()
      WHERE id = $1`,
    [id, status, errorMessage?.slice(0, 500) ?? null],
  );
}

function stringifyOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

export function isRecallWebhookVerificationConfigured(): boolean {
  return Boolean(env.RECALL_WEBHOOK_SECRET);
}
