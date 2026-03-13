import { query } from '../db';
import { fetchJobs, markJob, enqueueJob } from './jobQueue';
import {
  createMeeting,
  analyzeMeetingTranscript,
  saveMeetingAnalysis,
  saveMeetingTranscript,
  notifyMeetingActions,
  updateMeetingState,
  recordMeetingEvent,
} from '../services/meetingService';
import {
  createRecallBot,
  getRecallBot,
  getRecallBotStatus,
  getRecallBotTranscript,
  isRecallConfigured,
} from '../services/integrations/recallService';
import { sendOutboundMessage } from '../services/groupOutboundService';

const FINALIZE_DELAY_MINUTES = 30;
const RETRY_DELAY_MINUTES = 15;
const MAX_FINALIZE_ATTEMPTS = 12;

let running = false;

export async function runMeetBotWorkerOnce(): Promise<void> {
  if (!isRecallConfigured() || running) return;
  running = true;

  try {
    await processJobs('meet-bot', handleScheduleJob);
    await processJobs('meet-bot.finalize', handleFinalizeJob);
  } finally {
    running = false;
  }
}

async function processJobs(
  type: string,
  handler: (job: any) => Promise<void>,
): Promise<void> {
  const jobs = await fetchJobs(type, 2);

  for (const job of jobs) {
    const claimed = await markJob(job.id, 'processing');
    if (!claimed) continue;

    try {
      await handler(job);
      await markJob(job.id, 'done');
    } catch (err: any) {
      const message = err?.message || `${type}_failed`;
      console.error(`[meetBotWorker] ${type} failed:`, message);
      await markJob(job.id, 'failed', message);
    }
  }
}

async function handleScheduleJob(job: any): Promise<void> {
  const payload = job.payload || {};
  const tenantId = String(payload.tenantId || payload.tenant_id || job.tenant_id || '');
  const clientId = String(payload.clientId || payload.client_id || '');
  const clientName = String(payload.clientName || payload.client_name || '');
  const eventTitle = String(payload.eventTitle || payload.event_title || payload.title || 'Reunião');
  const videoUrl = String(payload.videoUrl || payload.video_url || payload.meeting_url || '');
  const platform = String(payload.platform || '');
  const autoJoinId = stringifyOrEmpty(payload.autoJoinId || payload.auto_join_id);
  const source = String(payload.source || 'manual_bot');
  const scheduledAt = new Date(String(payload.scheduledAt || payload.scheduled_at || ''));
  const explicitMeetingId = stringifyOrEmpty(payload.meetingId || payload.meeting_id);

  if (!tenantId || !clientId || !clientName || !videoUrl || Number.isNaN(scheduledAt.getTime())) {
    throw new Error('invalid_meet_bot_payload');
  }

  const existing = await getExistingScheduledMeeting(autoJoinId, explicitMeetingId);
  const meetingId = existing?.meetingId || await createRecallMeeting({
    tenantId,
    clientId,
    title: eventTitle,
    platform,
    videoUrl,
    autoJoinId,
    explicitMeetingId,
    source,
    scheduledAt,
  });

  if (existing?.botId) {
    await updateMeetingState({
      meetingId,
      tenantId,
      changes: {
        status: 'bot_scheduled',
        bot_provider: 'recall',
        bot_id: existing.botId,
        bot_status: 'scheduled',
        failed_stage: null,
        failed_reason: null,
        source,
        source_ref_id: autoJoinId || null,
        meeting_url: videoUrl,
      },
      event: {
        eventType: 'meeting.bot_reused',
        stage: 'bot_create',
        status: 'bot_scheduled',
        message: 'Bot Recall já existente reutilizado',
        actorType: 'system',
        actorId: 'meetBotWorker',
        payload: { bot_id: existing.botId, auto_join_id: autoJoinId || null },
      },
    });

    await touchAutoJoin(autoJoinId, {
      client_id: clientId,
      bot_id: existing.botId,
      status: 'waiting',
      last_error: null,
    });

    await enqueueFinalizeJob({
      tenantId,
      clientId,
      clientName,
      meetingId,
      botId: existing.botId,
      scheduledAt,
      finalizeAttempt: 0,
      autoJoinId,
    });
    return;
  }

  try {
    const bot = await createRecallBot({
      meetingUrl: videoUrl,
      joinAt: scheduledAt.toISOString(),
      botName: `Edro.Studio - ${clientName}`,
      platform,
      metadata: {
        tenant_id: tenantId,
        client_id: clientId,
        client_name: clientName,
        meeting_id: meetingId,
        auto_join_id: autoJoinId || '',
      },
    });

    const botStatus = getRecallBotStatus(bot) || 'scheduled';

    await updateMeetingState({
      meetingId,
      tenantId,
      changes: {
        status: 'bot_scheduled',
        source,
        source_ref_id: autoJoinId || null,
        bot_provider: 'recall',
        bot_id: bot.id,
        bot_status: botStatus,
        audio_key: `recall:${bot.id}`,
        failed_stage: null,
        failed_reason: null,
        meeting_url: videoUrl,
        last_processed_at: new Date(),
      },
      event: {
        eventType: 'meeting.bot_created',
        stage: 'bot_create',
        status: 'bot_scheduled',
        message: 'Bot Recall agendado com sucesso',
        actorType: 'system',
        actorId: 'meetBotWorker',
        payload: {
          bot_id: bot.id,
          join_at: scheduledAt.toISOString(),
          platform,
          source,
        },
      },
    });

    await touchAutoJoin(autoJoinId, {
      client_id: clientId,
      meeting_id: meetingId,
      bot_id: bot.id,
      status: 'bot_created',
      last_error: null,
      increment_attempt_count: true,
    });

    await enqueueFinalizeJob({
      tenantId,
      clientId,
      clientName,
      meetingId,
      botId: bot.id,
      scheduledAt,
      finalizeAttempt: 0,
      autoJoinId,
    });

    await touchAutoJoin(autoJoinId, {
      status: 'waiting',
      last_error: null,
    });
  } catch (err: any) {
    await failMeetingLifecycle({
      tenantId,
      meetingId,
      clientId,
      autoJoinId,
      failedStage: 'bot_create',
      reason: err?.message || 'recall_bot_create_failed',
      eventType: 'meeting.bot_create_failed',
    });
    throw err;
  }
}

async function handleFinalizeJob(job: any): Promise<void> {
  const payload = job.payload || {};
  const tenantId = String(payload.tenantId || payload.tenant_id || job.tenant_id || '');
  const clientId = String(payload.clientId || payload.client_id || '');
  const clientName = String(payload.clientName || payload.client_name || '');
  const meetingId = String(payload.meetingId || payload.meeting_id || '');
  const botId = String(payload.botId || payload.bot_id || '');
  const autoJoinId = stringifyOrEmpty(payload.autoJoinId || payload.auto_join_id);
  const finalizeAttempt = Number(payload.finalizeAttempt || payload.finalize_attempt || 0);

  if (!tenantId || !clientId || !clientName || !meetingId || !botId) {
    throw new Error('invalid_meet_bot_finalize_payload');
  }

  const bot = await getRecallBot(botId);
  const status = getRecallBotStatus(bot);
  const lifecycleStatus = mapRecallBotStatus(status);

  await updateMeetingState({
    meetingId,
    tenantId,
    changes: {
      bot_status: status || null,
      status: lifecycleStatus,
      last_processed_at: new Date(),
    },
    event: {
      eventType: 'meeting.bot_status_polled',
      stage: 'bot_finalize',
      status: lifecycleStatus,
      message: `Recall status: ${status || 'unknown'}`,
      actorType: 'system',
      actorId: 'meetBotWorker',
      payload: { bot_id: botId, attempt: finalizeAttempt },
    },
  });

  if (status === 'fatal') {
    await failMeetingLifecycle({
      tenantId,
      meetingId,
      clientId,
      autoJoinId,
      failedStage: 'bot_finalize',
      reason: `recall_bot_fatal:${JSON.stringify(bot.status).slice(0, 200)}`,
      eventType: 'meeting.bot_failed',
    });
    throw new Error(`recall_bot_fatal:${JSON.stringify(bot.status).slice(0, 200)}`);
  }

  if (status !== 'done') {
    if (finalizeAttempt >= MAX_FINALIZE_ATTEMPTS) {
      await failMeetingLifecycle({
        tenantId,
        meetingId,
        clientId,
        autoJoinId,
        failedStage: 'bot_finalize',
        reason: `recall_bot_timeout:${status || 'unknown'}`,
        eventType: 'meeting.bot_timeout',
      });
      throw new Error(`recall_bot_timeout:${status || 'unknown'}`);
    }

    await bumpRetryCounters(tenantId, meetingId, clientId, autoJoinId, {
      stage: 'bot_finalize',
      message: `Recall ainda não finalizou (${status || 'unknown'})`,
      attempt: finalizeAttempt + 1,
    });

    await enqueueJob(
      tenantId,
      'meet-bot.finalize',
      {
        tenantId,
        clientId,
        clientName,
        meetingId,
        botId,
        autoJoinId,
        finalizeAttempt: finalizeAttempt + 1,
      },
      { scheduledFor: minutesFromNow(RETRY_DELAY_MINUTES) },
    );
    return;
  }

  const transcript = (await getRecallBotTranscript(botId)).trim();
  if (!transcript) {
    if (finalizeAttempt >= MAX_FINALIZE_ATTEMPTS) {
      await failMeetingLifecycle({
        tenantId,
        meetingId,
        clientId,
        autoJoinId,
        failedStage: 'transcript_fetch',
        reason: 'recall_empty_transcript',
        eventType: 'meeting.transcript_empty',
      });
      throw new Error('recall_empty_transcript');
    }

    await updateMeetingState({
      meetingId,
      tenantId,
      changes: {
        status: 'transcript_pending',
        bot_status: status || null,
      },
      event: {
        eventType: 'meeting.transcript_retry_scheduled',
        stage: 'transcript_fetch',
        status: 'transcript_pending',
        message: 'Transcript ainda indisponível; retry agendado',
        actorType: 'system',
        actorId: 'meetBotWorker',
        payload: { bot_id: botId, attempt: finalizeAttempt + 1 },
      },
    });

    await bumpRetryCounters(tenantId, meetingId, clientId, autoJoinId, {
      stage: 'transcript_fetch',
      message: 'Transcript vazia; retry agendado',
      attempt: finalizeAttempt + 1,
    });

    await enqueueJob(
      tenantId,
      'meet-bot.finalize',
      {
        tenantId,
        clientId,
        clientName,
        meetingId,
        botId,
        autoJoinId,
        finalizeAttempt: finalizeAttempt + 1,
      },
      { scheduledFor: minutesFromNow(RETRY_DELAY_MINUTES) },
    );
    return;
  }

  await saveMeetingTranscript({
    meetingId,
    tenantId,
    transcript,
    provider: 'recall',
    status: 'transcribed',
    actorType: 'system',
    actorId: 'meetBotWorker',
  });

  await touchAutoJoin(autoJoinId, {
    status: 'processing',
    last_error: null,
  });

  try {
    await updateMeetingState({
      meetingId,
      tenantId,
      changes: { status: 'analysis_pending' },
      event: {
        eventType: 'meeting.analysis_started',
        stage: 'analysis',
        status: 'analysis_pending',
        message: 'Análise Claude iniciada',
        actorType: 'system',
        actorId: 'meetBotWorker',
        payload: { provider: 'claude' },
      },
    });

    const analysis = await analyzeMeetingTranscript(transcript, clientName);
    await saveMeetingAnalysis(meetingId, transcript, analysis, tenantId, clientId, {
      transcriptProvider: 'recall',
      replacePendingActions: true,
      actorType: 'system',
      actorId: 'meetBotWorker',
    });

    await notifyMeetingActions(tenantId, clientId, meetingId, clientName, analysis.actions?.length ?? 0)
      .catch((err: any) => console.error('[meetBotWorker] notification failed:', err?.message));

    const sent = await sendMeetingSummaryToWhatsApp(tenantId, clientId, clientName, meetingId, analysis, false)
      .catch((err: any) => {
        console.error('[meetBotWorker] WhatsApp notification failed:', err?.message);
        return false;
      });

    if (sent) {
      await updateMeetingState({
        meetingId,
        tenantId,
        changes: { summary_sent_at: new Date() },
        event: {
          eventType: 'meeting.summary_sent',
          stage: 'whatsapp_notify',
          status: 'approval_pending',
          message: 'Resumo enviado ao grupo do cliente',
          actorType: 'system',
          actorId: 'meetBotWorker',
          payload: { channel: 'whatsapp' },
        },
      });
    }

    await touchAutoJoin(autoJoinId, {
      status: 'done',
      processed_at: new Date(),
      last_error: null,
    });
  } catch (err: any) {
    await failMeetingLifecycle({
      tenantId,
      meetingId,
      clientId,
      autoJoinId,
      failedStage: 'analysis',
      reason: err?.message || 'meeting_analysis_failed',
      eventType: 'meeting.analysis_failed',
    });
    throw err;
  }
}

async function getExistingScheduledMeeting(
  autoJoinId: string,
  explicitMeetingId: string,
): Promise<{ meetingId: string | null; botId: string | null } | null> {
  if (explicitMeetingId) {
    const { rows } = await query<{ id: string; bot_id: string | null }>(
      `SELECT id, bot_id FROM meetings WHERE id = $1 LIMIT 1`,
      [explicitMeetingId],
    );
    if (rows.length) {
      return { meetingId: rows[0].id, botId: rows[0].bot_id ?? null };
    }
  }

  if (!autoJoinId) return null;

  const { rows } = await query<{ meeting_id: string | null; bot_id: string | null }>(
    `SELECT caj.meeting_id, COALESCE(caj.bot_id, m.bot_id) AS bot_id
       FROM calendar_auto_joins caj
       LEFT JOIN meetings m ON m.id = caj.meeting_id
      WHERE caj.id = $1
      LIMIT 1`,
    [autoJoinId],
  );

  if (!rows[0]?.meeting_id) return null;
  return {
    meetingId: rows[0].meeting_id,
    botId: rows[0].bot_id ?? null,
  };
}

async function createRecallMeeting(params: {
  tenantId: string;
  clientId: string;
  title: string;
  platform: string;
  videoUrl: string;
  autoJoinId: string;
  explicitMeetingId: string;
  source: string;
  scheduledAt: Date;
}): Promise<string> {
  if (params.explicitMeetingId) {
    await updateMeetingState({
      meetingId: params.explicitMeetingId,
      tenantId: params.tenantId,
      changes: {
        source: params.source,
        source_ref_id: params.autoJoinId || null,
        meeting_url: params.videoUrl,
        platform: params.platform || 'meet',
        status: 'scheduled',
        failed_stage: null,
        failed_reason: null,
      },
      event: {
        eventType: 'meeting.scheduled_for_bot',
        stage: 'meeting',
        status: 'scheduled',
        message: 'Meeting existente reaproveitada para bot Recall',
        actorType: 'system',
        actorId: 'meetBotWorker',
        payload: {
          auto_join_id: params.autoJoinId || null,
          platform: params.platform,
          scheduled_at: params.scheduledAt.toISOString(),
        },
      },
    });
    await touchAutoJoin(params.autoJoinId, {
      meeting_id: params.explicitMeetingId,
      client_id: params.clientId,
      status: 'meeting_created',
      last_error: null,
    });
    return params.explicitMeetingId;
  }

  const meeting = await createMeeting({
    tenantId: params.tenantId,
    clientId: params.clientId,
    title: params.title,
    platform: params.platform || 'meet',
    meetingUrl: params.videoUrl,
    createdBy: 'recall-bot',
    source: params.source,
    sourceRefId: params.autoJoinId || null,
    status: 'scheduled',
    recordedAt: params.scheduledAt,
  });

  await touchAutoJoin(params.autoJoinId, {
    meeting_id: meeting.id,
    client_id: params.clientId,
    status: 'meeting_created',
    last_error: null,
  });

  return meeting.id;
}

async function enqueueFinalizeJob(params: {
  tenantId: string;
  clientId: string;
  clientName: string;
  meetingId: string;
  botId: string;
  scheduledAt: Date;
  finalizeAttempt: number;
  autoJoinId: string;
}): Promise<void> {
  const scheduledFor = new Date(
    Math.max(
      params.scheduledAt.getTime() + FINALIZE_DELAY_MINUTES * 60 * 1000,
      Date.now() + 5 * 60 * 1000,
    ),
  );

  await enqueueJob(
    params.tenantId,
    'meet-bot.finalize',
    {
      tenantId: params.tenantId,
      clientId: params.clientId,
      clientName: params.clientName,
      meetingId: params.meetingId,
      botId: params.botId,
      autoJoinId: params.autoJoinId || null,
      finalizeAttempt: params.finalizeAttempt,
    },
    { scheduledFor },
  );
}

export async function sendMeetingSummaryToWhatsApp(
  tenantId: string,
  clientId: string,
  clientName: string,
  meetingId: string,
  analysis: { summary: string; actions: Array<{ type: string; title: string; priority: string }> },
  force: boolean,
): Promise<boolean> {
  const { rows: groups } = await query(
    `SELECT wg.id, wg.group_jid
       FROM whatsapp_groups wg
      WHERE wg.client_id = $1
        AND wg.tenant_id = $2
        AND wg.active = true
        AND wg.notify_jarvis = true
      LIMIT 1`,
    [clientId, tenantId],
  );

  if (!groups.length) return false;

  const actionCount = analysis.actions?.length ?? 0;
  const actionLines = (analysis.actions ?? []).slice(0, 5).map((action) => {
    const emoji = action.type === 'briefing'
      ? '📋'
      : action.type === 'task'
        ? '✅'
        : action.type === 'campaign'
          ? '💡'
          : action.type === 'pauta'
            ? '📝'
            : '📌';
    const prio = action.priority === 'high' ? '🔴' : action.priority === 'medium' ? '🟡' : '🟢';
    return `${emoji} ${prio} ${action.title}`;
  }).join('\n');

  const messageText = `🤖 *Edro.Studio — Análise de Reunião*\n\n` +
    `👤 *Cliente:* ${clientName}\n\n` +
    `📝 *Resumo:*\n${(analysis.summary ?? '').slice(0, 500)}\n\n` +
    (actionCount > 0
      ? `⚡ *${actionCount} acao${actionCount > 1 ? 'es' : ''} extraida${actionCount > 1 ? 's' : ''}:*\n${actionLines}\n\n`
      : '') +
    `_Acesse o painel para aprovar as acoes sugeridas._`;

  const group = groups[0];
  const result = await sendOutboundMessage({
    tenantId,
    groupId: group.id,
    groupJid: group.group_jid,
    clientId,
    scenario: 'meeting_summary',
    triggerKey: force
      ? `meeting_summary:${meetingId}:manual:${Date.now()}`
      : `meeting_summary:${meetingId}:${group.id}`,
    messageText,
    bypassQuietHours: false,
  });

  return result.sent;
}

async function touchAutoJoin(autoJoinId: string, changes: Record<string, any>): Promise<void> {
  if (!autoJoinId) return;

  const columnMap: Record<string, string> = {
    client_id: 'client_id',
    meeting_id: 'meeting_id',
    bot_id: 'bot_id',
    status: 'status',
    last_error: 'last_error',
    processed_at: 'processed_at',
    job_enqueued_at: 'job_enqueued_at',
  };

  const updates: string[] = [];
  const values: any[] = [];
  let index = 1;

  for (const [key, value] of Object.entries(changes)) {
    if (key === 'increment_attempt_count') continue;
    const column = columnMap[key];
    if (!column) continue;
    updates.push(`${column} = $${index}`);
    values.push(value);
    index += 1;
  }

  if (changes.increment_attempt_count) {
    updates.push(`attempt_count = attempt_count + 1`);
  }
  updates.push(`updated_at = now()`);

  values.push(autoJoinId);
  await query(
    `UPDATE calendar_auto_joins
        SET ${updates.join(', ')}
      WHERE id = $${index}`,
    values,
  );
}

async function bumpRetryCounters(
  tenantId: string,
  meetingId: string,
  clientId: string,
  autoJoinId: string,
  params: { stage: string; message: string; attempt: number },
) {
  await query(
    `UPDATE meetings
        SET retry_count = retry_count + 1,
            last_retry_at = now(),
            updated_at = now()
      WHERE id = $1 AND tenant_id = $2`,
    [meetingId, tenantId],
  );

  await touchAutoJoin(autoJoinId, {
    status: 'queued',
    last_error: params.message,
    increment_attempt_count: true,
  });

  await recordMeetingEvent({
    meetingId,
    tenantId,
    clientId,
    eventType: 'meeting.retry_scheduled',
    stage: params.stage,
    status: 'queued',
    message: params.message,
    actorType: 'system',
    actorId: 'meetBotWorker',
    payload: { attempt: params.attempt },
  });
}

async function failMeetingLifecycle(params: {
  tenantId: string;
  meetingId: string;
  clientId: string;
  autoJoinId: string;
  failedStage: string;
  reason: string;
  eventType: string;
}) {
  await updateMeetingState({
    meetingId: params.meetingId,
    tenantId: params.tenantId,
    changes: {
      status: 'failed',
      failed_stage: params.failedStage,
      failed_reason: params.reason,
      last_processed_at: new Date(),
    },
    event: {
      eventType: params.eventType,
      stage: params.failedStage,
      status: 'failed',
      message: params.reason,
      actorType: 'system',
      actorId: 'meetBotWorker',
      payload: { failed_stage: params.failedStage },
    },
  });

  await touchAutoJoin(params.autoJoinId, {
    status: 'failed',
    last_error: params.reason,
  });
}

function mapRecallBotStatus(status: string): string {
  switch (status) {
    case 'joining':
    case 'waiting_room':
    case 'recording_permission_required':
      return 'joining';
    case 'in_call':
    case 'recording':
      return 'in_call';
    case 'done':
      return 'transcript_pending';
    case 'fatal':
      return 'failed';
    default:
      return 'bot_scheduled';
  }
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

function stringifyOrEmpty(value: unknown): string {
  return value ? String(value) : '';
}
