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
  generateMeetingPrep,
  getMeeting,
  getMeetingStatus,
  listMeetingAudit,
  listMeetings,
  archiveStaleUncapturedMeetings,
  approveMeetingAction,
  rejectMeetingAction,
  ensureMeetingTables,
  notifyMeetingActions,
  updateMeetingState,
} from '../services/meetingService';
import { query } from '../db';
import { createBriefing } from '../repositories/edroBriefingRepository';
import { ensureInternalClient, getClientById, isInternalClientId } from '../repos/clientsRepo';
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
    enqueue_bot: z.boolean().optional(),
    start_at: z.string().datetime().optional(), // ISO — defaults to now
  });

  app.post(
    '/meetings/instant',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const userEmail = (request.user as any).email as string;
      const body = instantMeetingSchema.parse(request.body ?? {});
      const shouldScheduleBot = true;
      const resolvedClient = body.client_id
        ? await getClientById(tenantId, body.client_id)
        : await ensureInternalClient(tenantId);
      if (body.client_id && !resolvedClient) {
        return reply.code(404).send({ success: false, error: 'Cliente não encontrado.' });
      }
      const clientId = resolvedClient?.id ?? body.client_id ?? null;
      const clientName = body.client_name ?? resolvedClient?.name ?? 'Reunião Interna Edro';

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
          clientId: clientId ?? undefined,
          clientName,
        });
      } catch (err: any) {
        const msg = err?.message ?? 'Erro ao criar reunião no Google Calendar';
        const isConfig = msg.includes('não configurado') || msg.includes('Reconecte');
        return reply.status(isConfig ? 503 : 502).send({ success: false, error: msg });
      }

      // Save to meetings table
      const meeting = await createMeeting({
        tenantId,
        clientId: clientId!,
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
          clientId,
          shouldScheduleBot ? new Date() : null,
          shouldScheduleBot ? 'queued' : 'meeting_created',
        ],
      ).catch(() => {}); // non-blocking

      // Enqueue Recall bot for every new meeting
      if (shouldScheduleBot) {
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
            clientId,
            clientName,
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
      let rows: any[] = [];
      try {
        const res = await query(
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
        rows = res.rows;
      } catch (err: any) {
        console.error('[meetings/proposals] query failed:', err?.message);
      }

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

  // ── Archived meetings list ───────────────────────────────────────────────
  app.get(
    '/meetings/archived',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      const { rows } = await query(
        `SELECT m.id, m.title, m.client_id, c.name AS client_name,
                m.platform, m.recorded_at, m.status, m.summary, m.analysis_payload, m.bot_id,
                COUNT(ma.id)::int AS total_actions,
                COUNT(ma.id) FILTER (WHERE ma.status = 'pending')::int AS pending_actions
         FROM meetings m
         LEFT JOIN clients c ON c.id = m.client_id
         LEFT JOIN meeting_actions ma ON ma.meeting_id = m.id
         WHERE m.tenant_id = $1
           AND m.status = 'archived'
         GROUP BY m.id, c.name
         ORDER BY m.recorded_at DESC
         LIMIT 30`,
        [tenantId],
      ).catch(() => ({ rows: [] }));
      return reply.send({ data: rows });
    },
  );

  // ── Global dashboard stats ──────────────────────────────────────────────
  app.get(
    '/meetings/dashboard',
    { preHandler: [authGuard, tenantGuard()] },
    async (request, reply) => {
      const tenantId = (request.user as any).tenant_id;
      await archiveStaleUncapturedMeetings(tenantId).catch((err: any) => {
        console.error('[meetings/dashboard] archiveStale failed:', err?.message);
      });

      const [statsRes, recentRes, pendingRes, clientsRes] = await Promise.all([
        query(
          `SELECT
             COUNT(*) FILTER (WHERE status <> 'archived')::int AS total_meetings,
             COUNT(*) FILTER (WHERE status IN ('analyzed', 'approval_pending', 'partially_approved', 'completed'))::int AS analyzed,
             COUNT(*) FILTER (
               WHERE status IN ('scheduled', 'bot_scheduled', 'joining', 'in_call', 'recorded', 'transcript_pending', 'analysis_pending')
             )::int AS processing,
             COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
             COUNT(*) FILTER (WHERE status <> 'archived' AND recorded_at > NOW() - INTERVAL '7 days')::int AS last_7_days,
             COUNT(*) FILTER (WHERE status <> 'archived' AND recorded_at > NOW() - INTERVAL '30 days')::int AS last_30_days
           FROM meetings WHERE tenant_id = $1`,
          [tenantId],
        ).catch((err: any) => { console.error('[meetings/dashboard] stats failed:', err?.message); return { rows: [{}] }; }),
        query(
          `SELECT m.id, m.title, m.client_id, c.name AS client_name,
                  m.platform, m.recorded_at, m.status, m.summary, m.analysis_payload,
                  COUNT(ma.id)::int AS total_actions,
                  COUNT(ma.id) FILTER (WHERE ma.status = 'pending')::int AS pending_actions
           FROM meetings m
           LEFT JOIN clients c ON c.id = m.client_id
           LEFT JOIN meeting_actions ma ON ma.meeting_id = m.id
           WHERE m.tenant_id = $1
             AND m.status <> 'archived'
           GROUP BY m.id, c.name
           ORDER BY m.recorded_at DESC
           LIMIT 50`,
          [tenantId],
        ).catch((err: any) => { console.error('[meetings/dashboard] recent failed:', err?.message); return { rows: [] }; }),
        query(
          `SELECT COUNT(*)::int AS total_pending
           FROM meeting_actions
           WHERE tenant_id = $1 AND status = 'pending'`,
          [tenantId],
        ).catch((err: any) => { console.error('[meetings/dashboard] pending failed:', err?.message); return { rows: [{ total_pending: 0 }] }; }),
        query(
          `SELECT m.client_id, c.name AS client_name,
                  COUNT(DISTINCT m.id)::int AS meeting_count,
                  COUNT(ma.id) FILTER (WHERE ma.status = 'pending')::int AS pending_actions
           FROM meetings m
           LEFT JOIN clients c ON c.id = m.client_id
           LEFT JOIN meeting_actions ma ON ma.meeting_id = m.id
           WHERE m.tenant_id = $1 AND m.recorded_at > NOW() - INTERVAL '90 days'
             AND m.status <> 'archived'
           GROUP BY m.client_id, c.name
           ORDER BY meeting_count DESC
           LIMIT 20`,
          [tenantId],
        ).catch((err: any) => { console.error('[meetings/dashboard] by_client failed:', err?.message); return { rows: [] }; }),
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
        const analysis = await analyzeMeetingTranscript({
          transcript,
          clientName,
          tenantId,
          clientId,
          meetingTitle: meeting.title,
          platform: meeting.platform,
          source: meeting.source,
        });
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
        try {
          transcript = (await getRecallBotTranscript(meeting.bot_id)).trim();
          provider = 'recall';
        } catch (err: any) {
          return reply.code(502).send({ error: `Recall API error: ${err?.message ?? 'unknown'}` });
        }
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

  // ── Unarchive meeting ────────────────────────────────────────────────────
  app.post<{ Params: { meetingId: string } }>(
    '/meetings/:meetingId/unarchive',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any, reply) => {
      const tenantId = request.user.tenant_id;
      const userEmail = request.user.email ?? null;
      const meeting = await getMeetingStatus(tenantId, request.params.meetingId);
      if (!meeting) return reply.code(404).send({ error: 'not_found' });
      if (meeting.status !== 'archived') return reply.code(422).send({ error: 'Reunião não está arquivada.' });

      const newStatus = meeting.transcript ? 'transcribed' : meeting.bot_id ? 'transcript_pending' : 'failed';

      await updateMeetingState({
        meetingId: meeting.id,
        tenantId,
        changes: {
          status: newStatus,
          completed_at: null,
          failed_stage: null,
          failed_reason: null,
          last_processed_at: new Date(),
        },
        event: {
          eventType: 'meeting.unarchived',
          stage: 'meeting',
          status: newStatus,
          message: 'Reunião restaurada manualmente.',
          actorType: 'user',
          actorId: userEmail,
          payload: { previous_status: 'archived' },
        },
      });

      return reply.send({ success: true, status: newStatus });
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

      const analysis = await analyzeMeetingTranscript({
        transcript: String(meeting.transcript),
        clientName,
        tenantId,
        clientId: meeting.client_id,
        meetingTitle: meeting.title,
        platform: meeting.platform,
        source: meeting.source,
      });
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
        {
          summary: meeting.summary,
          actions,
          intelligence: meeting.analysis_payload?.intelligence ?? null,
        },
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
      role: z.string().nullish(),
      source: z.enum(['client_contact', 'team']).optional().default('client_contact'),
      send_via: z.enum(['whatsapp', 'email', 'both']).default('email'),
    })).optional(),
    schedule_bot: z.boolean().optional(),
  });

  app.post(
    '/meetings/create',
    { preHandler: [authGuard, tenantGuard()] },
    async (request: any, reply) => {
      const tenantId = request.user.tenant_id;
      const parsed = createMeetingSchema.safeParse(request.body || {});
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Payload inválido para criação de reunião.',
          error_code: 'invalid_meeting_payload',
          details: parsed.error.flatten(),
        });
      }

      try {
        const body = parsed.data;
        const startAt = new Date(body.scheduled_at);
        if (Number.isNaN(startAt.getTime())) {
          return reply.code(400).send({
            success: false,
            error: 'Data e hora inválidas para a reunião.',
            error_code: 'invalid_scheduled_at',
          });
        }

        const client = body.client_id
          ? await getClientById(tenantId, body.client_id)
          : await ensureInternalClient(tenantId);
        if (body.client_id && !client) {
          return reply.code(404).send({ success: false, error: 'Cliente não encontrado.', error_code: 'client_not_found' });
        }
        const clientId = client?.id ?? body.client_id ?? null;
        const clientName = client?.name ?? 'Reunião Interna Edro';

        let meetingUrl = body.meeting_url ?? '';
        let htmlLink = '';
        let calendarEventId: string | null = null;
        let autoJoinId: string | null = null;

        if (body.platform === 'meet') {
          const attendeeEmails = (body.invite_contacts ?? [])
            .map((contact) => contact.email)
            .filter(Boolean) as string[];

          let calResult: Awaited<ReturnType<typeof createCalendarMeeting>>;
          try {
            calResult = await createCalendarMeeting({
              tenantId,
              title: body.title,
              startAt,
              durationMinutes: body.duration_minutes,
              attendeeEmails,
              description: body.description,
              clientId,
              clientName,
            });
          } catch (err: any) {
            const message = String(err?.message || 'Erro ao criar reunião no Google Meet.');
            const isConfigError = message.includes('não configurado') || message.includes('Reconecte');
            return reply.status(isConfigError ? 503 : 502).send({
              success: false,
              error: isConfigError
                ? 'Google Calendar não está conectado para este tenant. Conecte a integração ou use Video/Zoom/Teams com link manual.'
                : message,
              error_code: isConfigError ? 'google_calendar_not_configured' : 'google_meet_create_failed',
            });
          }

          meetingUrl = calResult.meetUrl;
          htmlLink = calResult.htmlLink;
          calendarEventId = calResult.eventId;
        }

        const meetingRow = await createMeeting({
          tenantId,
          clientId: clientId!,
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
        let meetingPrep: Awaited<ReturnType<typeof generateMeetingPrep>> | null = null;

        const hasAgencyInvite = (body.invite_contacts ?? []).some((contact) => contact.source === 'team');
        if (hasAgencyInvite) {
          try {
            meetingPrep = await generateMeetingPrep({
              tenantId,
              clientId,
              clientName,
              meetingTitle: body.title,
              description: body.description,
              platform: body.platform,
              scheduledAt: startAt,
            });
            await updateMeetingState({
              meetingId,
              tenantId,
              changes: {
                prep_payload: meetingPrep.prep,
                prep_generated_at: new Date(),
                prep_model: meetingPrep.model,
              },
              event: {
                eventType: 'meeting.prep_generated',
                stage: 'pre_meeting',
                status: 'scheduled',
                message: 'Briefing pré-reunião gerado para a equipe',
                actorType: 'system',
                actorId: 'jarvis',
                payload: {
                  model: meetingPrep.model,
                  meeting_goal: meetingPrep.prep.meeting_goal,
                },
              },
            });
          } catch (err: any) {
            console.error('[meetings/create] Failed to generate meeting prep:', err?.message);
          }
        }

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

        const shouldScheduleBot = true;

        if (shouldScheduleBot && meetingUrl) {
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
            const prepText = contact.source === 'team' && meetingPrep
              ? buildInternalMeetingPrepText(meetingPrep.prep)
              : '';
            const finalWhatsAppText = prepText ? `${waText}\n\n${prepText}` : waText;
            const finalEmailHtml = buildMeetingInviteEmailHtml({
              title: body.title,
              date: fmtDate,
              time: fmtTime,
              duration: body.duration_minutes,
              platformName,
              meetingUrl,
              description: body.description,
              prep: contact.source === 'team' ? meetingPrep?.prep ?? null : null,
            });
            const finalEmailText = buildMeetingInviteEmailText({
              title: body.title,
              date: fmtDate,
              time: fmtTime,
              duration: body.duration_minutes,
              platformName,
              meetingUrl,
              description: body.description,
              prep: contact.source === 'team' ? meetingPrep?.prep ?? null : null,
            });

            if ((contact.send_via === 'whatsapp' || contact.send_via === 'both') && contact.phone) {
              try {
                if (isEvolutionConfigured()) {
                  await sendDirectMessage(tenantId, contact.phone, finalWhatsAppText);
                  inviteResults.push({ name: contact.name, channel: 'whatsapp', ok: true });
                } else {
                  inviteResults.push({ name: contact.name, channel: 'whatsapp', ok: false, error: 'Evolution API não configurada' });
                }
              } catch (err: any) {
                inviteResults.push({ name: contact.name, channel: 'whatsapp', ok: false, error: err?.message });
              }
            }

            if ((contact.send_via === 'email' || contact.send_via === 'both') && contact.email) {
              try {
                await sendEmail({
                  to: contact.email,
                  subject: `Convite: ${body.title} — ${fmtDate} ${fmtTime}`,
                  text: finalEmailText,
                  html: finalEmailHtml,
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
          bot_scheduled: shouldScheduleBot && !!meetingUrl,
          prep_generated: Boolean(meetingPrep),
          invites: inviteResults,
        });
      } catch (err: any) {
        const message = err?.message ?? 'Erro interno ao criar reunião.';
        console.error('[meetings/create] Unhandled failure:', {
          message,
          code: err?.code,
          detail: err?.detail,
          constraint: err?.constraint,
          stack: err?.stack,
          tenantId,
        });

        if (err?.code === '23503' && err?.constraint === 'meetings_client_id_fkey') {
          return reply.code(400).send({
            success: false,
            error: 'O cliente selecionado para a reunião não existe mais. Atualize a página e tente novamente.',
            error_code: 'invalid_meeting_client',
          });
        }

        return reply.code(500).send({
          success: false,
          error: message,
          error_code: 'meeting_create_failed',
        });
      }
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

    if (action.client_id && !isInternalClientId(action.client_id)) {
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
        operation_lane: action.metadata?.operation_lane ?? null,
        required_skill: action.metadata?.required_skill ?? null,
        owner_hint: action.metadata?.owner_hint ?? null,
        should_create_job: action.metadata?.should_create_job ?? null,
        needs_approval: action.metadata?.needs_approval ?? null,
        urgency_reason: action.metadata?.urgency_reason ?? null,
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
  if (!clientId || isInternalClientId(clientId)) return 'Reunião Interna Edro';

  const client = await getClientById(tenantId, clientId).catch(() => null);
  if (client?.name) return client.name;

  const { rows } = await query<{ name: string }>(
    `SELECT name FROM clients WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
    [tenantId, clientId],
  ).catch(() => ({ rows: [] as Array<{ name: string }> }));

  return rows[0]?.name ?? 'Cliente';
}

function renderPrepSection(title: string, items: string[] | undefined | null) {
  if (!items?.length) return '';
  return `\n${title}\n${items.map((item) => `- ${item}`).join('\n')}`;
}

function buildInternalMeetingPrepText(prep: Awaited<ReturnType<typeof generateMeetingPrep>>['prep']) {
  return `🧠 *Briefing pré-reunião Edro*\n\n` +
    `🎯 *Objetivo principal:*\n${prep.meeting_goal}\n\n` +
    `❓ *Pergunta de abertura:*\n${prep.opening_question}\n\n` +
    renderPrepSection('🗂 *Pauta sugerida:*', prep.suggested_agenda) +
    renderPrepSection('🛡 *Pontos de defesa da agência:*', prep.agency_defense_points) +
    renderPrepSection('⚠️ *Possíveis objeções do cliente:*', prep.likely_client_pushbacks) +
    renderPrepSection('📎 *Materiais para levar:*', prep.materials_to_prepare) +
    renderPrepSection('🚨 *Red flags:*', prep.red_flags) +
    renderPrepSection('✅ *Critérios de sucesso:*', prep.success_criteria) +
    (prep.recommended_positioning ? `\n\n🎙 *Postura recomendada:*\n${prep.recommended_positioning}` : '');
}

function buildMeetingInviteEmailHtml(input: {
  title: string;
  date: string;
  time: string;
  duration: number;
  platformName: string;
  meetingUrl?: string | null;
  description?: string | null;
  prep?: Awaited<ReturnType<typeof generateMeetingPrep>>['prep'] | null;
}) {
  const prep = input.prep;
  const renderList = (title: string, items?: string[] | null) => (
    items?.length
      ? `<p><strong>${title}</strong></p><ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`
      : ''
  );

  return `
    <h2>${escapeHtml(input.title)}</h2>
    <p><strong>Data:</strong> ${input.date} às ${input.time}</p>
    <p><strong>Duração:</strong> ${input.duration} minutos</p>
    <p><strong>Plataforma:</strong> ${escapeHtml(input.platformName)}</p>
    ${input.meetingUrl ? `<p><strong>Link:</strong> <a href="${escapeHtml(input.meetingUrl)}">${escapeHtml(input.meetingUrl)}</a></p>` : ''}
    ${input.description ? `<p>${escapeHtml(input.description)}</p>` : ''}
    ${prep ? `
      <hr />
      <h3>Briefing pré-reunião da equipe</h3>
      <p><strong>Objetivo:</strong> ${escapeHtml(prep.meeting_goal)}</p>
      <p><strong>Pergunta de abertura:</strong> ${escapeHtml(prep.opening_question)}</p>
      ${renderList('Pauta sugerida', prep.suggested_agenda)}
      ${renderList('Pontos de defesa da agência', prep.agency_defense_points)}
      ${renderList('Possíveis objeções do cliente', prep.likely_client_pushbacks)}
      ${renderList('Materiais para preparar', prep.materials_to_prepare)}
      ${renderList('Alinhamentos internos', prep.internal_alignment_notes)}
      ${renderList('Red flags', prep.red_flags)}
      ${renderList('Critérios de sucesso', prep.success_criteria)}
      ${prep.recommended_positioning ? `<p><strong>Postura recomendada:</strong> ${escapeHtml(prep.recommended_positioning)}</p>` : ''}
    ` : ''}
    <hr><p style="color:#999;font-size:12px">Enviado via Edro Digital</p>
  `;
}

function buildMeetingInviteEmailText(input: {
  title: string;
  date: string;
  time: string;
  duration: number;
  platformName: string;
  meetingUrl?: string | null;
  description?: string | null;
  prep?: Awaited<ReturnType<typeof generateMeetingPrep>>['prep'] | null;
}) {
  const prep = input.prep;
  return [
    input.title,
    `Data: ${input.date} às ${input.time}`,
    `Duração: ${input.duration} minutos`,
    `Plataforma: ${input.platformName}`,
    input.meetingUrl ? `Link: ${input.meetingUrl}` : null,
    input.description ?? null,
    prep ? '' : null,
    prep ? 'BRIEFING PRÉ-REUNIÃO DA EQUIPE' : null,
    prep ? `Objetivo: ${prep.meeting_goal}` : null,
    prep ? `Pergunta de abertura: ${prep.opening_question}` : null,
    prep ? renderPrepSection('Pauta sugerida:', prep.suggested_agenda) : null,
    prep ? renderPrepSection('Pontos de defesa da agência:', prep.agency_defense_points) : null,
    prep ? renderPrepSection('Possíveis objeções do cliente:', prep.likely_client_pushbacks) : null,
    prep ? renderPrepSection('Materiais para preparar:', prep.materials_to_prepare) : null,
    prep ? renderPrepSection('Alinhamentos internos:', prep.internal_alignment_notes) : null,
    prep ? renderPrepSection('Red flags:', prep.red_flags) : null,
    prep ? renderPrepSection('Critérios de sucesso:', prep.success_criteria) : null,
    prep?.recommended_positioning ? `Postura recomendada: ${prep.recommended_positioning}` : null,
    '',
    'Enviado via Edro Digital',
  ].filter(Boolean).join('\n');
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
