/**
 * Meeting routes — upload, transcription, action approval
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { authGuard } from '../auth/rbac';
import { tenantGuard } from '../auth/tenantGuard';
import { requirePerm } from '../auth/rbac';
import multipart from '@fastify/multipart';
import mime from 'mime-types';
import {
  transcribeAudioBuffer,
  analyzeMeetingTranscript,
  createMeeting,
  saveMeetingTranscript,
  saveMeetingAnalysis,
  getMeeting,
  getMeetingStatus,
  listMeetingAudit,
  listMeetings,
  approveMeetingAction,
  rejectMeetingAction,
  ensureMeetingTables,
  notifyMeetingActions,
  updateMeetingState,
} from '../services/meetingService';
import { query } from '../db';
import { createBriefing } from '../repositories/edroBriefingRepository';
import { getClientById } from '../repos/clientsRepo';
import { enqueueJob } from '../jobs/jobQueue';
import { createCalendarMeeting } from '../services/integrations/googleCalendarService';
import { sendDirectMessage, isConfigured as isEvolutionConfigured } from '../services/integrations/evolutionApiService';
import { sendEmail } from '../services/emailService';
import { getRecallBotTranscript, isRecallConfigured } from '../services/integrations/recallService';
import { sendMeetingSummaryToWhatsApp } from '../jobs/meetBotWorker';

const AUDIO_MIMES = new Set([
  'audio/mpeg', 'audio/mp4', 'audio/mp3', 'audio/m4a',
  'audio/wav', 'audio/wave', 'audio/x-wav',
  'audio/ogg', 'audio/webm', 'video/webm', 'video/mp4',
]);

function isAudio(mimeType: string) {
  return AUDIO_MIMES.has(mimeType.toLowerCase());
}

export default async function meetingRoutes(app: FastifyInstance) {
  await ensureMeetingTables();
  await app.register(multipart, { limits: { fileSize: 200 * 1024 * 1024 } }); // 200 MB

  const scheduleRecallSchema = z.object({
    meeting_url: z.string().url(),
    scheduled_at: z.string().datetime(),
    title: z.string().min(2).max(200).optional(),
    platform: z.enum(['meet', 'zoom', 'teams', 'other']).optional(),
  });

  // ── Create instant Google Meet + schedule Jarvis bot ──────────────────────
  const instantMeetingSchema = z.object({
    title: z.string().min(2).max(200).default('Reunião Edro'),
    attendee_emails: z.array(z.string().email()).max(50).default([]),
    duration_minutes: z.number().int().min(15).max(480).default(60),
    description: z.string().max(2000).optional(),
    client_id: z.string().optional(),
    client_name: z.string().optional(),
    enqueue_bot: z.boolean().default(true),
    start_at: z.string().datetime().optional(), // ISO — defaults to now
  });

  app.post(
    '/meetings/instant',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const userEmail = (request.user as any).email as string;
      const body = instantMeetingSchema.parse(request.body ?? {});

      const startAt = body.start_at ? new Date(body.start_at) : new Date(Date.now() + 60_000);

      let event: Awaited<ReturnType<typeof createCalendarMeeting>>;
      try {
        event = await createCalendarMeeting({
          tenantId,
          title: body.title,
          startAt,
          durationMinutes: body.duration_minutes,
          attendeeEmails: body.attendee_emails,
          description: body.description,
          clientId: body.client_id ?? 'edro-internal',
          clientName: body.client_name ?? 'Edro',
        });
      } catch (err: any) {
        const msg = err?.message ?? 'Erro ao criar reunião no Google Calendar';
        const isConfig = msg.includes('não configurado') || msg.includes('Reconecte');
        return reply.status(isConfig ? 503 : 502).send({ success: false, error: msg });
      }

      // Save to meetings table
      const meeting = await createMeeting({
        tenantId,
        clientId: body.client_id ?? 'edro-internal',
        title: body.title,
        platform: 'meet',
        meetingUrl: event.meetUrl,
        createdBy: userEmail,
        source: 'instant',
        sourceRefId: event.eventId,
        status: 'scheduled',
        recordedAt: startAt,
      });

      // Upsert to calendar_auto_joins for tracking
      await query(
        `INSERT INTO calendar_auto_joins
           (tenant_id, calendar_event_id, event_title, video_url, video_platform, scheduled_at, meeting_id, client_id, job_enqueued_at, status)
         VALUES ($1, $2, $3, $4, 'meet', $5, $6, $7, $8, $9)
         ON CONFLICT (calendar_event_id) DO UPDATE
           SET video_url = EXCLUDED.video_url,
               meeting_id = EXCLUDED.meeting_id,
               client_id = EXCLUDED.client_id,
               status = EXCLUDED.status,
               updated_at = now()`,
        [
          tenantId,
          event.eventId,
          body.title,
          event.meetUrl,
          startAt,
          meeting.id,
          body.client_id ?? 'edro-internal',
          body.enqueue_bot ? new Date() : null,
          body.enqueue_bot ? 'queued' : 'meeting_created',
        ],
      ).catch(() => {}); // non-blocking

      // Enqueue Recall bot if requested
      if (body.enqueue_bot) {
        await enqueueJob(
          tenantId,
          'meet-bot',
          {
            videoUrl: event.meetUrl,
            eventTitle: body.title,
            scheduledAt: startAt.toISOString(),
            autoJoinId: null,
            source: 'instant',
            platform: 'meet',
            clientId: body.client_id ?? 'edro-internal',
            clientName: body.client_name ?? 'Edro',
            meetingId: meeting.id,
          },
        ).catch(() => {});
      }

      return reply.send({
        success: true,
        meeting_id: meeting.id,
        meet_url: event.meetUrl,
        html_link: event.htmlLink,
        event_id: event.eventId,
        start_at: startAt.toISOString(),
        end_at: event.endAt.toISOString(),
      });
    },
  );

  // ── Global pending proposals (Jarvis review hub) ──────────────────────────
  app.get(
    '/meetings/proposals',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const { rows } = await query(
        `SELECT
           m.id             AS meeting_id,
           m.title          AS meeting_title,
           m.client_id,
           m.recorded_at,
           m.summary,
           m.status         AS meeting_status,
           m.platform,
           ma.id            AS action_id,
           ma.type,
           ma.title,
           ma.description,
           ma.responsible,
           ma.deadline,
           ma.priority,
           ma.status,
           ma.raw_excerpt
         FROM meeting_actions ma
         JOIN meetings m ON m.id = ma.meeting_id
         WHERE ma.tenant_id = $1
           AND ma.status = 'pending'
           AND m.status IN ('analyzed', 'approval_pending', 'partially_approved')
         ORDER BY
           CASE ma.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
           m.recorded_at DESC
         LIMIT 200`,
        [tenantId],
      );

      // Group by meeting
      const meetingMap = new Map<string, any>();
      for (const row of rows) {
        if (!meetingMap.has(row.meeting_id)) {
          meetingMap.set(row.meeting_id, {
            meeting_id: row.meeting_id,
            meeting_title: row.meeting_title,
            client_id: row.client_id,
            recorded_at: row.recorded_at,
            summary: row.summary,
            platform: row.platform,
            actions: [],
          });
        }
        meetingMap.get(row.meeting_id).actions.push({
          action_id: row.action_id,
          type: row.type,
          title: row.title,
          description: row.description,
          responsible: row.responsible,
          deadline: row.deadline,
          priority: row.priority,
          status: row.status,
          raw_excerpt: row.raw_excerpt,
        });
      }

      return reply.send({
        success: true,
        data: Array.from(meetingMap.values()),
        total_pending: rows.length,
      });
    },
  );

  // ── Global dashboard stats ──────────────────────────────────────────────
  app.get(
    '/meetings/dashboard',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;

      const [statsRes, recentRes, pendingRes, clientsRes] = await Promise.all([
        query(
          `SELECT
             COUNT(*)::int AS total_meetings,
             COUNT(*) FILTER (WHERE status IN ('analyzed', 'approval_pending', 'partially_approved', 'completed'))::int AS analyzed,
             COUNT(*) FILTER (
               WHERE status IN ('scheduled', 'bot_scheduled', 'joining', 'in_call', 'recorded', 'transcript_pending', 'analysis_pending')
             )::int AS processing,
             COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
             COUNT(*) FILTER (WHERE recorded_at > NOW() - INTERVAL '7 days')::int AS last_7_days,
             COUNT(*) FILTER (WHERE recorded_at > NOW() - INTERVAL '30 days')::int AS last_30_days
           FROM meetings WHERE tenant_id = $1`,
          [tenantId],
        ),
        query(
          `SELECT m.id, m.title, m.client_id, c.name AS client_name,
                  m.platform, m.recorded_at, m.status, m.summary,
                  COUNT(ma.id)::int AS total_actions,
                  COUNT(ma.id) FILTER (WHERE ma.status = 'pending')::int AS pending_actions
           FROM meetings m
           LEFT JOIN clients c ON c.id = m.client_id
           LEFT JOIN meeting_actions ma ON ma.meeting_id = m.id
           WHERE m.tenant_id = $1
           GROUP BY m.id, c.name
           ORDER BY m.recorded_at DESC
           LIMIT 50`,
          [tenantId],
        ),
        query(
          `SELECT COUNT(*)::int AS total_pending
           FROM meeting_actions
           WHERE tenant_id = $1 AND status = 'pending'`,
          [tenantId],
        ),
        query(
          `SELECT m.client_id, c.name AS client_name,
                  COUNT(DISTINCT m.id)::int AS meeting_count,
                  COUNT(ma.id) FILTER (WHERE ma.status = 'pending')::int AS pending_actions
           FROM meetings m
           LEFT JOIN clients c ON c.id = m.client_id
           LEFT JOIN meeting_actions ma ON ma.meeting_id = m.id
           WHERE m.tenant_id = $1 AND m.recorded_at > NOW() - INTERVAL '90 days'
           GROUP BY m.client_id, c.name
           ORDER BY meeting_count DESC
           LIMIT 20`,
          [tenantId],
        ),
      ]);

      return reply.send({
        success: true,
        stats: statsRes.rows[0],
        recent: recentRes.rows,
        total_pending: pendingRes.rows[0]?.total_pending ?? 0,
        by_client: clientsRes.rows,
      });
    },
  );

  // ── Upload + transcribe + analyze ────────────────────────────────────────
  app.post<{ Params: { clientId: string } }>(
    '/clients/:clientId/meetings/upload',
    { preHandler: [authGuard, tenantGuard(), requirePerm('library:write')] },
    async (request, reply) => {
      const { clientId } = request.params;
      const tenantId = (request.user as any).tenant_id;
      const userEmail = (request.user as any).email;

      let data: any;
      try {
        data = await request.file();
      } catch {
        return reply.code(400).send({ error: 'Falha ao processar arquivo.' });
      }
      if (!data) return reply.code(400).send({ error: 'Nenhum arquivo enviado.' });

      const mimeType = (data.mimetype || mime.lookup(data.filename) || '') as string;
      if (!isAudio(mimeType)) {
        return reply.code(422).send({ error: 'Formato não suportado. Envie MP3, MP4, M4A, WAV, OGG ou WEBM.' });
      }

      const buffer = await data.toBuffer();
      const client = await getClientById(tenantId, clientId);
      const clientName = client?.name ?? clientId;

      // Create meeting record immediately
      const meeting = await createMeeting({
        tenantId,
        clientId,
        title: data.filename.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        platform: 'upload',
        createdBy: userEmail,
        source: 'upload',
        status: 'transcript_pending',
      });

      // Transcribe + analyze async (but wait for response — user is waiting)
      try {
        const transcript = await transcribeAudioBuffer(buffer, mimeType);
        await saveMeetingTranscript({
          meetingId: meeting.id,
          tenantId,
          transcript,
          provider: 'whisper',
          status: 'transcribed',
          actorType: 'user',
          actorId: userEmail,
        });
        await updateMeetingState({
          meetingId: meeting.id,
          tenantId,
          changes: { status: 'analysis_pending' },
          event: {
            eventType: 'meeting.analysis_started',
            stage: 'analysis',
            status: 'analysis_pending',
            message: 'Análise de upload iniciada',
            actorType: 'user',
            actorId: userEmail,
            payload: { provider: 'whisper' },
          },
        });
        const analysis = await analyzeMeetingTranscript(transcript, clientName);
        await saveMeetingAnalysis(meeting.id, transcript, analysis, tenantId, clientId, {
          transcriptProvider: 'whisper',
          replacePendingActions: true,
          actorType: 'user',
          actorId: userEmail,
        });

        // Notify admins (non-blocking)
        notifyMeetingActions(tenantId, clientId, meeting.id, data.filename ?? 'Upload', analysis.actions?.length ?? 0)
          .catch(() => {});

        const full = await getMeeting(tenantId, meeting.id);
        return reply.send({ success: true, meeting: full });
      } catch (err: any) {
        // Mark as failed but return meeting ID so user can retry
        await updateMeetingState({
          meetingId: meeting.id,
          tenantId,
          changes: {
            status: 'failed',
            failed_stage: 'analysis',
            failed_reason: err.message,
          },
          event: {
            eventType: 'meeting.analysis_failed',
            stage: 'analysis',
            status: 'failed',
            message: err.message,
            actorType: 'user',
            actorId: userEmail,
          },
        });
        return reply.code(500).send({ error: `Análise falhou: ${err.message}`, meeting_id: meeting.id });
      }
    },
  );

  // ── Manual Recall bot scheduling (no Google Calendar required) ──────────
  app.post<{ Params: { clientId: string } }>(
    '/clients/:clientId/meetings/recall-bot',
    { preHandler: [authGuard, tenantGuard(), requirePerm('library:write')] },
    async (request, reply) => {
      const { clientId } = request.params;
      const tenantId = (request.user as any).tenant_id;
      const body = scheduleRecallSchema.parse(request.body ?? {});

      if (!process.env.RECALL_API_KEY) {
        return reply.code(503).send({ error: 'RECALL_API_KEY não configurada no backend.' });
      }

      const client = await getClientById(tenantId, clientId);
      if (!client) return reply.code(404).send({ error: 'client_not_found' });

      const scheduledAt = new Date(body.scheduled_at);
      if (Number.isNaN(scheduledAt.getTime())) {
        return reply.code(400).send({ error: 'scheduled_at inválido.' });
      }

      const minLeadMs = 11 * 60 * 1000;
      if (scheduledAt.getTime() < Date.now() + minLeadMs) {
        return reply.code(422).send({
          error: 'Agende com pelo menos 11 minutos de antecedência para evitar falha de capacidade na Recall.',
        });
      }

      const meeting = await createMeeting({
        tenantId,
        clientId: client.id,
        title: body.title ?? `Reunião ${client.name}`,
        platform: body.platform ?? detectMeetingPlatform(body.meeting_url),
        meetingUrl: body.meeting_url,
        createdBy: (request.user as any).email ?? 'admin',
        source: 'manual_bot',
        status: 'scheduled',
        recordedAt: scheduledAt,
      });

      const row = await enqueueJob(
        tenantId,
        'meet-bot',
        {
          videoUrl: body.meeting_url,
          eventTitle: body.title ?? `Reunião ${client.name}`,
          scheduledAt: scheduledAt.toISOString(),
          source: 'manual',
          platform: body.platform ?? detectMeetingPlatform(body.meeting_url),
          clientId: client.id,
          clientName: client.name,
          meetingId: meeting.id,
        },
      );

      return reply.send({
        success: true,
        meeting_id: meeting.id,
        job_id: row.id,
        scheduled_at: scheduledAt.toISOString(),
      });
    },
  );

  // ── List meetings ─────────────────────────────────────────────────────────
  app.get<{ Params: { clientId: string } }>(
    '/clients/:clientId/meetings',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const { clientId } = request.params;
      const tenantId = (request.user as any).tenant_id;
      const meetings = await listMeetings(tenantId, clientId);
      return reply.send({ success: true, data: meetings });
    },
  );

  // ── Get meeting detail ────────────────────────────────────────────────────
  app.get<{ Params: { clientId: string; meetingId: string } }>(
    '/clients/:clientId/meetings/:meetingId',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const meeting = await getMeeting(tenantId, request.params.meetingId);
      if (!meeting) return reply.code(404).send({ error: 'not_found' });
      return reply.send({ success: true, data: meeting });
    },
  );

  // ── Operational status ───────────────────────────────────────────────────
  app.get<{ Params: { meetingId: string } }>(
    '/meetings/:meetingId/status',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const data = await getMeetingStatus(tenantId, request.params.meetingId);
      if (!data) return reply.code(404).send({ error: 'not_found' });
      return reply.send({ success: true, data });
    },
  );

  // ── Audit trail ──────────────────────────────────────────────────────────
  app.get<{ Params: { meetingId: string } }>(
    '/meetings/:meetingId/audit',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const data = await listMeetingAudit(tenantId, request.params.meetingId);
      if (!data) return reply.code(404).send({ error: 'not_found' });
      return reply.send({ success: true, data });
    },
  );

  // ── Retry bot lifecycle ──────────────────────────────────────────────────
  app.post<{ Params: { meetingId: string } }>(
    '/meetings/:meetingId/retry-bot',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any, reply) => {
      const tenantId = request.user.tenant_id;
      const userEmail = request.user.email ?? null;
      const meeting = await getMeetingStatus(tenantId, request.params.meetingId);
      if (!meeting) return reply.code(404).send({ error: 'not_found' });
      if (!isRecallConfigured()) return reply.code(503).send({ error: 'RECALL_API_KEY não configurada.' });
      if (!meeting.meeting_url) return reply.code(422).send({ error: 'meeting_url ausente.' });

      const clientName = await resolveMeetingClientName(tenantId, meeting.client_id);
      const autoJoinId = meeting.auto_join_id ?? null;

      let jobRow: any;
      let mode: 'schedule' | 'finalize' = 'finalize';

      if (meeting.bot_id) {
        jobRow = await enqueueJob(tenantId, 'meet-bot.finalize', {
          tenantId,
          clientId: meeting.client_id,
          clientName,
          meetingId: meeting.id,
          botId: meeting.bot_id,
          autoJoinId,
          finalizeAttempt: 0,
        });
      } else {
        mode = 'schedule';
        const scheduledAt = new Date(meeting.auto_join_scheduled_at ?? meeting.recorded_at ?? Date.now());
        if (scheduledAt.getTime() < Date.now() + 11 * 60 * 1000) {
          return reply.code(422).send({
            error: 'Sem bot_id e sem janela futura suficiente para reagendar. Use upload manual ou reprocessamento.',
          });
        }

        jobRow = await enqueueJob(tenantId, 'meet-bot', {
          meetingId: meeting.id,
          videoUrl: meeting.meeting_url,
          scheduledAt: scheduledAt.toISOString(),
          autoJoinId,
          source: meeting.source ?? 'manual_bot',
          platform: meeting.platform,
          clientId: meeting.client_id,
          clientName,
          eventTitle: meeting.title,
        });
      }

      await updateMeetingState({
        meetingId: meeting.id,
        tenantId,
        changes: {
          status: mode === 'finalize' ? 'transcript_pending' : 'scheduled',
          failed_stage: null,
          failed_reason: null,
        },
        event: {
          eventType: 'meeting.retry_requested',
          stage: mode === 'finalize' ? 'bot_finalize' : 'bot_create',
          status: mode === 'finalize' ? 'transcript_pending' : 'scheduled',
          message: `Retry manual do bot (${mode})`,
          actorType: 'user',
          actorId: userEmail,
          payload: { job_id: jobRow.id, mode },
        },
      });

      return reply.send({ success: true, mode, job_id: jobRow.id });
    },
  );

  // ── Refresh transcript from source ───────────────────────────────────────
  app.post<{ Params: { meetingId: string } }>(
    '/meetings/:meetingId/reprocess-transcript',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any, reply) => {
      const tenantId = request.user.tenant_id;
      const userEmail = request.user.email ?? null;
      const meeting = await getMeetingStatus(tenantId, request.params.meetingId);
      if (!meeting) return reply.code(404).send({ error: 'not_found' });

      let transcript = String(meeting.transcript ?? '').trim();
      let provider: 'recall' | 'whisper' | 'manual' = 'manual';

      if (meeting.bot_id) {
        transcript = (await getRecallBotTranscript(meeting.bot_id)).trim();
        provider = 'recall';
      } else if (transcript) {
        provider = (meeting.transcript_provider ?? 'manual') as 'recall' | 'whisper' | 'manual';
      }

      if (!transcript) {
        return reply.code(422).send({ error: 'Nenhuma fonte disponível para reprocessar o transcript.' });
      }

      await saveMeetingTranscript({
        meetingId: meeting.id,
        tenantId,
        transcript,
        provider,
        status: 'transcribed',
        actorType: 'user',
        actorId: userEmail,
      });

      return reply.send({
        success: true,
        provider,
        transcript_length: transcript.length,
      });
    },
  );

  // ── Re-run Claude analysis ───────────────────────────────────────────────
  app.post<{ Params: { meetingId: string } }>(
    '/meetings/:meetingId/reanalyze',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any, reply) => {
      const tenantId = request.user.tenant_id;
      const userEmail = request.user.email ?? null;
      const meeting = await getMeeting(tenantId, request.params.meetingId);
      if (!meeting) return reply.code(404).send({ error: 'not_found' });
      if (!meeting.transcript) return reply.code(422).send({ error: 'meeting_without_transcript' });

      const clientName = await resolveMeetingClientName(tenantId, meeting.client_id);
      await updateMeetingState({
        meetingId: meeting.id,
        tenantId,
        changes: { status: 'analysis_pending', failed_stage: null, failed_reason: null },
        event: {
          eventType: 'meeting.reanalysis_requested',
          stage: 'analysis',
          status: 'analysis_pending',
          message: 'Reanálise manual solicitada',
          actorType: 'user',
          actorId: userEmail,
        },
      });

      const analysis = await analyzeMeetingTranscript(String(meeting.transcript), clientName);
      const result = await saveMeetingAnalysis(meeting.id, String(meeting.transcript), analysis, tenantId, meeting.client_id, {
        transcriptProvider: (meeting.transcript_provider ?? 'manual') as 'recall' | 'whisper' | 'manual',
        replacePendingActions: true,
        actorType: 'user',
        actorId: userEmail,
      });

      await notifyMeetingActions(tenantId, meeting.client_id, meeting.id, meeting.title, analysis.actions?.length ?? 0)
        .catch(() => {});

      return reply.send({
        success: true,
        analysis_version: result.analysisVersion,
        action_count: result.actionCount,
        superseded_count: result.supersededCount,
      });
    },
  );

  // ── Resend WhatsApp summary ──────────────────────────────────────────────
  app.post<{ Params: { meetingId: string } }>(
    '/meetings/:meetingId/resend-whatsapp',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any, reply) => {
      const tenantId = request.user.tenant_id;
      const userEmail = request.user.email ?? null;
      const meeting = await getMeeting(tenantId, request.params.meetingId);
      if (!meeting) return reply.code(404).send({ error: 'not_found' });
      if (!meeting.summary) return reply.code(422).send({ error: 'meeting_without_summary' });

      const clientName = await resolveMeetingClientName(tenantId, meeting.client_id);
      const latestVersion = Number(meeting.analysis_version || 1);
      const actions = (Array.isArray(meeting.actions) ? meeting.actions : [])
        .filter((action: any) => Number(action.analysis_version || 1) === latestVersion)
        .filter((action: any) => action.status !== 'superseded')
        .map((action: any) => ({
          type: action.type,
          title: action.title,
          priority: action.priority || 'medium',
        }));

      const sent = await sendMeetingSummaryToWhatsApp(
        tenantId,
        meeting.client_id,
        clientName,
        meeting.id,
        { summary: meeting.summary, actions },
        true,
      );

      if (!sent) {
        return reply.code(409).send({ error: 'whatsapp_send_blocked_or_group_missing' });
      }

      await updateMeetingState({
        meetingId: meeting.id,
        tenantId,
        changes: { summary_sent_at: new Date() },
        event: {
          eventType: 'meeting.summary_resent',
          stage: 'whatsapp_notify',
          status: meeting.status,
          message: 'Resumo reenviado manualmente ao grupo do cliente',
          actorType: 'user',
          actorId: userEmail,
        },
      });

      return reply.send({ success: true });
    },
  );

  // ── Approve action → optionally create item in system ────────────────────
  const approveSchema = z.object({
    create_in_system: z.boolean().optional().default(true),
  });

  app.patch<{ Params: { actionId: string } }>(
    '/meeting-actions/:actionId/approve',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const { actionId } = request.params;
      const body = approveSchema.parse(request.body ?? {});

      // Load action
      const { rows } = await query(
        `SELECT ma.*, m.client_id, m.title AS meeting_title
         FROM meeting_actions ma
         JOIN meetings m ON m.id = ma.meeting_id
         WHERE ma.id = $1 AND ma.tenant_id = $2`,
        [actionId, tenantId],
      );
      const action = rows[0];
      if (!action) return reply.code(404).send({ error: 'not_found' });
      if (action.status !== 'pending') return reply.code(400).send({ error: 'Ação já processada.' });

      let systemItemId: string | undefined;
      let executionStatus: 'executed' | 'failed' | 'skipped' = body.create_in_system ? 'failed' : 'skipped';
      let executionError: string | undefined;
      let systemItemType: string | undefined;

      if (body.create_in_system) {
        try {
          systemItemId = await executeAction(action, tenantId);
          executionStatus = systemItemId ? 'executed' : 'skipped';
          systemItemType = systemItemId ? (action.type === 'campaign' ? 'campaign' : 'briefing') : undefined;
        } catch (e: any) {
          console.error('[meetings] executeAction failed:', e.message);
          executionError = e.message;
        }
      } else {
        executionStatus = 'skipped';
      }

      await approveMeetingAction(tenantId, actionId, {
        systemItemId,
        systemItemType,
        approvedBy: (request.user as any).email ?? null,
        executionStatus,
        executionError,
      });
      return reply.send({ success: true, system_item_id: systemItemId ?? null });
    },
  );

  // ── Approve all pending actions for a meeting ─────────────────────────────
  app.post<{ Params: { meetingId: string } }>(
    '/meetings/:meetingId/approve-all',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const { meetingId } = request.params;

      const { rows: actions } = await query(
        `SELECT ma.*, m.client_id, m.title AS meeting_title
         FROM meeting_actions ma
         JOIN meetings m ON m.id = ma.meeting_id
         WHERE ma.meeting_id = $1 AND ma.tenant_id = $2 AND ma.status = 'pending'`,
        [meetingId, tenantId],
      );

      const results = await Promise.allSettled(
        actions.map(async (action: any) => {
          let systemItemId: string | undefined;
          let executionStatus: 'executed' | 'failed' | 'skipped' = 'failed';
          let executionError: string | undefined;

          try {
            systemItemId = await executeAction(action, tenantId);
            executionStatus = systemItemId ? 'executed' : 'skipped';
          } catch (err: any) {
            executionError = err?.message ?? 'system_create_failed';
          }

          await approveMeetingAction(tenantId, action.id, {
            systemItemId,
            systemItemType: systemItemId ? (action.type === 'campaign' ? 'campaign' : 'briefing') : null,
            approvedBy: (request.user as any).email ?? null,
            executionStatus,
            executionError,
          });
          return { id: action.id, systemItemId };
        }),
      );

      const approved = results.filter(r => r.status === 'fulfilled').length;
      return reply.send({ success: true, approved, total: actions.length });
    },
  );

  // ── Reject action ─────────────────────────────────────────────────────────
  app.patch<{ Params: { actionId: string } }>(
    '/meeting-actions/:actionId/reject',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const ok = await rejectMeetingAction(tenantId, request.params.actionId, (request.user as any).email ?? null);
      if (!ok) return reply.code(404).send({ error: 'not_found' });
      return reply.send({ success: true });
    },
  );

  // ── Get meeting detail (admin — no clientId needed) ──────────────────────
  app.get<{ Params: { meetingId: string } }>(
    '/meetings/:meetingId/detail',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const meeting = await getMeeting(tenantId, request.params.meetingId);
      if (!meeting) return reply.code(404).send({ error: 'not_found' });
      return reply.send({ data: meeting });
    },
  );

  // ── Create meeting + schedule bot + send invites ──────────────────────────
  const createMeetingSchema = z.object({
    title: z.string().min(1),
    client_id: z.string().optional(),
    platform: z.enum(['meet', 'zoom', 'teams', 'other']),
    meeting_url: z.string().optional(),        // For Zoom/Teams — user provides link
    scheduled_at: z.string(),                   // ISO string
    duration_minutes: z.number().min(15).max(480).default(60),
    description: z.string().optional(),
    invite_contacts: z.array(z.object({
      name: z.string(),
      email: z.string().nullish(),
      phone: z.string().nullish(),
      send_via: z.enum(['whatsapp', 'email', 'both']).default('email'),
    })).optional(),
    schedule_bot: z.boolean().default(true),
  });

  app.post(
    '/meetings/create',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any, reply) => {
      const tenantId = request.user.tenant_id;
      const body = createMeetingSchema.parse(request.body || {});
      const startAt = new Date(body.scheduled_at);
      const clientId = body.client_id ?? 'edro-internal';
      const client = body.client_id ? await getClientById(tenantId, body.client_id) : null;
      const clientName = client?.name ?? 'Reunião Interna Edro';

      let meetingUrl = body.meeting_url ?? '';
      let htmlLink = '';
      let calendarEventId: string | null = null;
      let autoJoinId: string | null = null;

      // ── 1. Create video meeting link if platform is Google Meet ─────
      if (body.platform === 'meet') {
        const attendeeEmails = (body.invite_contacts ?? [])
          .map(c => c.email).filter(Boolean) as string[];

        const calResult = await createCalendarMeeting({
          tenantId,
          title: body.title,
          startAt,
          durationMinutes: body.duration_minutes,
          attendeeEmails,
          description: body.description,
          clientId,
          clientName,
        });

        meetingUrl = calResult.meetUrl;
        htmlLink = calResult.htmlLink;
        calendarEventId = calResult.eventId;
      }

      // ── 2. Create meeting record ─────────────────────────────────────
      const meetingRow = await createMeeting({
        tenantId,
        clientId,
        title: body.title,
        platform: body.platform,
        meetingUrl,
        createdBy: (request.user as any).email ?? 'admin',
        source: body.platform === 'meet' ? 'calendar' : 'manual_bot',
        sourceRefId: calendarEventId,
        status: 'scheduled',
        recordedAt: startAt,
      });
      const meetingId = meetingRow.id;

      if (body.platform === 'meet' && meetingUrl && calendarEventId) {
        const { rows: autoJoinRows } = await query<{ id: string }>(
          `INSERT INTO calendar_auto_joins
             (tenant_id, calendar_event_id, event_title, video_url, video_platform, scheduled_at, meeting_id, client_id, status)
           VALUES ($1, $2, $3, $4, 'meet', $5, $6, $7, 'meeting_created')
           ON CONFLICT (calendar_event_id) DO UPDATE
             SET event_title = EXCLUDED.event_title,
                 video_url = EXCLUDED.video_url,
                 meeting_id = EXCLUDED.meeting_id,
                 client_id = EXCLUDED.client_id,
                 status = EXCLUDED.status,
                 scheduled_at = EXCLUDED.scheduled_at,
                 updated_at = now()
           RETURNING id`,
          [
            tenantId,
            calendarEventId,
            body.title,
            meetingUrl,
            startAt,
            meetingId,
            clientId,
          ],
        ).catch(() => ({ rows: [] as Array<{ id: string }> }));

        autoJoinId = autoJoinRows[0]?.id ?? null;
      }

      // ── 3. Schedule Recall bot for transcription ─────────────────────
      if (body.schedule_bot && meetingUrl) {
        try {
          await enqueueJob(tenantId, 'meet-bot', {
            meetingId,
            videoUrl: meetingUrl,
            scheduledAt: startAt.toISOString(),
            autoJoinId,
            clientId,
            clientName,
            eventTitle: body.title,
            meeting_url: meetingUrl,
            scheduled_at: startAt.toISOString(),
            client_id: clientId,
            title: body.title,
            platform: body.platform,
            client_name: clientName,
            source: body.platform === 'meet' ? 'calendar' : 'manual_bot',
          });

          if (autoJoinId) {
            await query(
              `UPDATE calendar_auto_joins
                  SET status = 'queued',
                      job_enqueued_at = now(),
                      updated_at = now()
                WHERE id = $1`,
              [autoJoinId],
            ).catch(() => {});
          }
        } catch (err: any) {
          console.error('[meetings/create] Failed to enqueue bot:', err?.message);
        }
      }

      // ── 4. Send invites ──────────────────────────────────────────────
      const inviteResults: Array<{ name: string; channel: string; ok: boolean; error?: string }> = [];

      if (body.invite_contacts?.length) {
        const fmtDate = startAt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const fmtTime = startAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        const platformName = body.platform === 'meet' ? 'Google Meet'
          : body.platform === 'zoom' ? 'Zoom'
          : body.platform === 'teams' ? 'Microsoft Teams' : 'Video';

        const waText = `📅 *Convite de Reunião*\n\n` +
          `*${body.title}*\n` +
          `🗓 ${fmtDate} às ${fmtTime}\n` +
          `⏱ ${body.duration_minutes} minutos\n` +
          `📹 ${platformName}\n` +
          (meetingUrl ? `\n🔗 ${meetingUrl}\n` : '') +
          (body.description ? `\n${body.description}\n` : '') +
          `\n_Enviado via Edro Digital_`;

        for (const contact of body.invite_contacts) {
          // WhatsApp invite
          if ((contact.send_via === 'whatsapp' || contact.send_via === 'both') && contact.phone) {
            try {
              if (isEvolutionConfigured()) {
                await sendDirectMessage(tenantId, contact.phone, waText);
                inviteResults.push({ name: contact.name, channel: 'whatsapp', ok: true });
              } else {
                inviteResults.push({ name: contact.name, channel: 'whatsapp', ok: false, error: 'Evolution API não configurada' });
              }
            } catch (err: any) {
              inviteResults.push({ name: contact.name, channel: 'whatsapp', ok: false, error: err?.message });
            }
          }

          // Email invite
          if ((contact.send_via === 'email' || contact.send_via === 'both') && contact.email) {
            try {
              await sendEmail({
                to: contact.email,
                subject: `Convite: ${body.title} — ${fmtDate} ${fmtTime}`,
                html: `
                  <h2>${body.title}</h2>
                  <p><strong>Data:</strong> ${fmtDate} às ${fmtTime}</p>
                  <p><strong>Duração:</strong> ${body.duration_minutes} minutos</p>
                  <p><strong>Plataforma:</strong> ${platformName}</p>
                  ${meetingUrl ? `<p><strong>Link:</strong> <a href="${meetingUrl}">${meetingUrl}</a></p>` : ''}
                  ${body.description ? `<p>${body.description}</p>` : ''}
                  <hr><p style="color:#999;font-size:12px">Enviado via Edro Digital</p>
                `,
              });
              inviteResults.push({ name: contact.name, channel: 'email', ok: true });
            } catch (err: any) {
              inviteResults.push({ name: contact.name, channel: 'email', ok: false, error: err?.message });
            }
          }
        }
      }

      return reply.send({
        success: true,
        meeting_id: meetingId,
        meeting_url: meetingUrl,
        html_link: htmlLink,
        platform: body.platform,
        bot_scheduled: body.schedule_bot && !!meetingUrl,
        invites: inviteResults,
      });
    },
  );

  // ── List contacts for meeting invites ─────────────────────────────────────
  app.get(
    '/meetings/contacts',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any, reply) => {
      const tenantId = request.user.tenant_id;
      const clientId = (request.query as any)?.client_id;

      // Client contacts
      let contactsSql = `
        SELECT cc.id, cc.name, cc.role, cc.email, cc.phone, cc.client_id, cc.is_primary,
               c.name AS client_name, 'client_contact' AS source
        FROM client_contacts cc
        JOIN clients c ON c.id = cc.client_id
        WHERE cc.tenant_id = $1 AND cc.active = true
      `;
      const params: any[] = [tenantId];
      if (clientId) {
        params.push(clientId);
        contactsSql += ` AND cc.client_id = $${params.length}`;
      }
      contactsSql += ` ORDER BY cc.is_primary DESC, cc.name ASC`;

      const { rows: clientContacts } = await query(contactsSql, params);

      // Team members (users of the tenant)
      const { rows: teamMembers } = await query(
        `SELECT u.id, u.email, u.name, tu.role, 'team' AS source
         FROM tenant_users tu
         JOIN edro_users u ON u.id = tu.user_id
         WHERE tu.tenant_id = $1
         ORDER BY u.name ASC`,
        [tenantId],
      );

      return reply.send({
        contacts: clientContacts.map((c: any) => ({
          id: c.id,
          name: c.name,
          role: c.role,
          email: c.email,
          phone: c.phone,
          client_id: c.client_id,
          client_name: c.client_name,
          is_primary: c.is_primary,
          source: c.source,
        })),
        team: teamMembers.map((u: any) => ({
          id: u.id,
          name: u.name || u.email,
          email: u.email,
          role: u.role,
          source: u.source,
        })),
      });
    },
  );
}

// ── Execute approved action in system ─────────────────────────────────────

async function executeAction(action: any, tenantId: string): Promise<string | undefined> {
  if (action.type === 'briefing' || action.type === 'pauta' || action.type === 'task') {
    if (action.system_item_id) {
      return action.system_item_id;
    }

    if (action.meeting_id && action.excerpt_hash) {
      const { rows: existingRows } = await query<{ system_item_id: string }>(
        `SELECT system_item_id
           FROM meeting_actions
          WHERE meeting_id = $1
            AND tenant_id = $2
            AND type = $3
            AND excerpt_hash = $4
            AND status = 'approved'
            AND system_item_id IS NOT NULL
          ORDER BY approved_at DESC NULLS LAST, created_at DESC
          LIMIT 1`,
        [action.meeting_id, tenantId, action.type, action.excerpt_hash],
      ).catch(() => ({ rows: [] as Array<{ system_item_id: string }> }));

      if (existingRows[0]?.system_item_id) {
        return existingRows[0].system_item_id;
      }
    }

    // Try to resolve edro_clients UUID (may be null for internal meetings)
    let edroClientId: string | null = null;
    let mainClientId: string | null = null;

    if (action.client_id && action.client_id !== 'edro-internal') {
      const { rows: ecRows } = await query(
        `SELECT id FROM edro_clients WHERE client_id = $1 AND tenant_id = $2 LIMIT 1`,
        [action.client_id, tenantId],
      ).catch(() => ({ rows: [] as any[] }));
      edroClientId = ecRows[0]?.id ?? null;

      // Also try to find main_client_id from clients table
      const { rows: cRows } = await query(
        `SELECT id FROM clients WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
        [tenantId, action.client_id],
      ).catch(() => ({ rows: [] as any[] }));
      mainClientId = cRows[0]?.id ?? null;
    }

    const briefing = await createBriefing({
      clientId: edroClientId,
      mainClientId,
      title: action.type === 'task' ? `[Tarefa] ${action.title}` : action.title,
      status: 'briefing',
      payload: {
        objective: action.description,
        origin: 'meeting',
        type: action.type,
        meeting_action_id: action.id,
        meeting_title: action.meeting_title ?? null,
        responsible: action.responsible ?? null,
        deadline: action.deadline ?? null,
      },
      createdBy: 'jarvis-meeting',
      trafficOwner: action.responsible ?? null,
      dueAt: action.deadline ? new Date(action.deadline) : null,
      source: 'meeting',
    });
    return briefing.id;
  }

  // campaign and note: no immediate system creation
  return undefined;
}

function detectMeetingPlatform(url: string): 'meet' | 'zoom' | 'teams' | 'other' {
  if (url.includes('meet.google.com') || url.includes('hangouts.google.com')) return 'meet';
  if (url.includes('zoom.us')) return 'zoom';
  if (url.includes('teams.microsoft.com')) return 'teams';
  return 'other';
}

async function resolveMeetingClientName(tenantId: string, clientId: string | null | undefined): Promise<string> {
  if (!clientId || clientId === 'edro-internal') return 'Reunião Interna Edro';

  const client = await getClientById(tenantId, clientId).catch(() => null);
  if (client?.name) return client.name;

  const { rows } = await query<{ name: string }>(
    `SELECT name FROM clients WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
    [tenantId, clientId],
  ).catch(() => ({ rows: [] as Array<{ name: string }> }));

  return rows[0]?.name ?? 'Cliente';
}
