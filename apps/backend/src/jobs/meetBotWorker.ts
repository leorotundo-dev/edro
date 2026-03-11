import { query } from '../db';
import { fetchJobs, markJob, enqueueJob } from './jobQueue';
import { createMeeting, analyzeMeetingTranscript, saveMeetingAnalysis, notifyMeetingActions } from '../services/meetingService';
import { createRecallBot, getRecallBot, getRecallBotStatus, getRecallBotTranscript, isRecallConfigured } from '../services/integrations/recallService';
import { sendGroupMessage, isConfigured as isEvolutionConfigured } from '../services/integrations/evolutionApiService';

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
  const eventTitle = String(payload.eventTitle || payload.event_title || 'Reunião');
  const videoUrl = String(payload.videoUrl || payload.video_url || '');
  const platform = String(payload.platform || '');
  const autoJoinId = payload.autoJoinId ? String(payload.autoJoinId) : '';
  const scheduledAt = new Date(String(payload.scheduledAt || payload.scheduled_at || ''));

  if (!tenantId || !clientId || !clientName || !videoUrl || Number.isNaN(scheduledAt.getTime())) {
    throw new Error('invalid_meet_bot_payload');
  }

  const existing = await getExistingScheduledMeeting(autoJoinId);
  if (existing?.botId) {
    await enqueueFinalizeJob({
      tenantId,
      clientId,
      clientName,
      meetingId: existing.meetingId,
      botId: existing.botId,
      scheduledAt,
      finalizeAttempt: 0,
    });
    return;
  }

  const meetingId = existing?.meetingId || await createRecallMeeting({
    tenantId,
    clientId,
    title: eventTitle,
    platform,
    videoUrl,
    autoJoinId,
  });

  const bot = await createRecallBot({
    meetingUrl: videoUrl,
    joinAt: scheduledAt.toISOString(),
    botName: `Edro Meeting Bot - ${clientName}`,
    platform,
    metadata: {
      tenant_id: tenantId,
      client_id: clientId,
      client_name: clientName,
      meeting_id: meetingId,
      auto_join_id: autoJoinId || '',
    },
  });

  await query(
    `UPDATE meetings
        SET audio_key = $1
      WHERE id = $2`,
    [`recall:${bot.id}`, meetingId],
  );

  await enqueueFinalizeJob({
    tenantId,
    clientId,
    clientName,
    meetingId,
    botId: bot.id,
    scheduledAt,
    finalizeAttempt: 0,
  });
}

async function handleFinalizeJob(job: any): Promise<void> {
  const payload = job.payload || {};
  const tenantId = String(payload.tenantId || payload.tenant_id || job.tenant_id || '');
  const clientId = String(payload.clientId || payload.client_id || '');
  const clientName = String(payload.clientName || payload.client_name || '');
  const meetingId = String(payload.meetingId || payload.meeting_id || '');
  const botId = String(payload.botId || payload.bot_id || '');
  const finalizeAttempt = Number(payload.finalizeAttempt || payload.finalize_attempt || 0);

  if (!tenantId || !clientId || !clientName || !meetingId || !botId) {
    throw new Error('invalid_meet_bot_finalize_payload');
  }

  const bot = await getRecallBot(botId);
  const status = getRecallBotStatus(bot);

  if (status === 'fatal') {
    await query(`UPDATE meetings SET status = 'failed' WHERE id = $1`, [meetingId]);
    throw new Error(`recall_bot_fatal:${JSON.stringify(bot.status).slice(0, 200)}`);
  }

  if (status !== 'done') {
    if (finalizeAttempt >= MAX_FINALIZE_ATTEMPTS) {
      await query(`UPDATE meetings SET status = 'failed' WHERE id = $1`, [meetingId]);
      throw new Error(`recall_bot_timeout:${status || 'unknown'}`);
    }

    await enqueueJob(
      tenantId,
      'meet-bot.finalize',
      {
        tenantId,
        clientId,
        clientName,
        meetingId,
        botId,
        finalizeAttempt: finalizeAttempt + 1,
      },
      { scheduledFor: minutesFromNow(RETRY_DELAY_MINUTES) },
    );
    return;
  }

  const transcript = (await getRecallBotTranscript(botId)).trim();
  if (!transcript) {
    if (finalizeAttempt >= MAX_FINALIZE_ATTEMPTS) {
      await query(`UPDATE meetings SET status = 'failed' WHERE id = $1`, [meetingId]);
      throw new Error('recall_empty_transcript');
    }

    await enqueueJob(
      tenantId,
      'meet-bot.finalize',
      {
        tenantId,
        clientId,
        clientName,
        meetingId,
        botId,
        finalizeAttempt: finalizeAttempt + 1,
      },
      { scheduledFor: minutesFromNow(RETRY_DELAY_MINUTES) },
    );
    return;
  }

  const analysis = await analyzeMeetingTranscript(transcript, clientName);
  await saveMeetingAnalysis(meetingId, transcript, analysis, tenantId, clientId);

  // Notify admins about extracted actions
  await notifyMeetingActions(tenantId, clientId, meetingId, clientName, analysis.actions?.length ?? 0)
    .catch((err: any) => console.error('[meetBotWorker] notification failed:', err?.message));

  // Send WhatsApp summary to client's linked group
  await sendMeetingSummaryToWhatsApp(tenantId, clientId, clientName, analysis)
    .catch((err: any) => console.error('[meetBotWorker] WhatsApp notification failed:', err?.message));
}

async function getExistingScheduledMeeting(autoJoinId: string): Promise<{ meetingId: string | null; botId: string | null } | null> {
  if (!autoJoinId) return null;

  const { rows } = await query<{ meeting_id: string | null; audio_key: string | null }>(
    `SELECT caj.meeting_id, m.audio_key
       FROM calendar_auto_joins caj
       LEFT JOIN meetings m ON m.id = caj.meeting_id
      WHERE caj.id = $1
      LIMIT 1`,
    [autoJoinId],
  );

  if (!rows[0]?.meeting_id) return null;

  const audioKey = rows[0].audio_key || '';
  const botId = audioKey.startsWith('recall:') ? audioKey.slice('recall:'.length) : null;
  return { meetingId: rows[0].meeting_id, botId };
}

async function createRecallMeeting(params: {
  tenantId: string;
  clientId: string;
  title: string;
  platform: string;
  videoUrl: string;
  autoJoinId: string;
}): Promise<string> {
  const meeting = await createMeeting({
    tenantId: params.tenantId,
    clientId: params.clientId,
    title: params.title,
    platform: params.platform || 'meet',
    meetingUrl: params.videoUrl,
    createdBy: 'recall-bot',
  });

  if (params.autoJoinId) {
    await query(
      `UPDATE calendar_auto_joins
          SET meeting_id = $1
        WHERE id = $2`,
      [meeting.id, params.autoJoinId],
    );
  }

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
      finalizeAttempt: params.finalizeAttempt,
    },
    { scheduledFor },
  );
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * After Jarvis analyzes a meeting, send a summary to the client's WhatsApp group.
 * Finds groups linked to the client and sends a formatted message with
 * the summary + extracted actions.
 */
async function sendMeetingSummaryToWhatsApp(
  tenantId: string,
  clientId: string,
  clientName: string,
  analysis: { summary: string; actions: Array<{ type: string; title: string; priority: string }> },
): Promise<void> {
  if (!isEvolutionConfigured()) return;

  // Find WhatsApp groups linked to this client
  const { rows: groups } = await query(
    `SELECT wg.group_jid
     FROM whatsapp_groups wg
     JOIN evolution_instances ei ON ei.id = wg.instance_id
     WHERE wg.client_id = $1 AND wg.tenant_id = $2 AND wg.active = true AND wg.notify_jarvis = true
     LIMIT 1`,
    [clientId, tenantId],
  );

  if (!groups.length) return;

  const actionCount = analysis.actions?.length ?? 0;
  const actionLines = (analysis.actions ?? []).slice(0, 5).map(a => {
    const emoji = a.type === 'briefing' ? '📋' : a.type === 'task' ? '✅' : a.type === 'campaign' ? '💡' : a.type === 'pauta' ? '📝' : '📌';
    const prio = a.priority === 'high' ? '🔴' : a.priority === 'medium' ? '🟡' : '🟢';
    return `${emoji} ${prio} ${a.title}`;
  }).join('\n');

  const text = `🤖 *Jarvis — Analise de Reuniao*\n\n` +
    `👤 *Cliente:* ${clientName}\n\n` +
    `📝 *Resumo:*\n${(analysis.summary ?? '').slice(0, 500)}\n\n` +
    (actionCount > 0
      ? `⚡ *${actionCount} acao${actionCount > 1 ? 'es' : ''} extraida${actionCount > 1 ? 's' : ''}:*\n${actionLines}\n\n`
      : '') +
    `_Acesse o painel para aprovar as acoes sugeridas._`;

  await sendGroupMessage(tenantId, groups[0].group_jid, text);
  console.log(`[meetBotWorker] WhatsApp summary sent to ${groups[0].group_jid} for client ${clientId}`);
}
