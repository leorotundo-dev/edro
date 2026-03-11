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
  saveMeetingAnalysis,
  getMeeting,
  listMeetings,
  approveMeetingAction,
  rejectMeetingAction,
  ensureMeetingTables,
  notifyMeetingActions,
} from '../services/meetingService';
import { query } from '../db';
import { createBriefing } from '../repositories/edroBriefingRepository';
import { getClientById } from '../repos/clientsRepo';
import { enqueueJob } from '../jobs/jobQueue';
import { createCalendarMeeting } from '../services/integrations/googleCalendarService';
import { sendDirectMessage, sendGroupMessage, isConfigured as isEvolutionConfigured } from '../services/integrations/evolutionApiService';
import { sendEmail } from '../services/emailService';
import { env } from '../env';

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
      });

      // Upsert to calendar_auto_joins for tracking
      await query(
        `INSERT INTO calendar_auto_joins
           (tenant_id, calendar_event_id, event_title, video_url, video_platform, scheduled_at, meeting_id, job_enqueued_at)
         VALUES ($1, $2, $3, $4, 'meet', $5, $6, $7)
         ON CONFLICT (calendar_event_id) DO UPDATE
           SET video_url = EXCLUDED.video_url,
               meeting_id = EXCLUDED.meeting_id`,
        [
          tenantId,
          event.eventId,
          body.title,
          event.meetUrl,
          startAt,
          meeting.id,
          body.enqueue_bot ? new Date() : null,
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
           AND m.status = 'analyzed'
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
             COUNT(*) FILTER (WHERE status = 'analyzed')::int AS analyzed,
             COUNT(*) FILTER (WHERE status = 'processing')::int AS processing,
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
      });

      // Transcribe + analyze async (but wait for response — user is waiting)
      try {
        const transcript = await transcribeAudioBuffer(buffer, mimeType);
        const analysis = await analyzeMeetingTranscript(transcript, clientName);
        await saveMeetingAnalysis(meeting.id, transcript, analysis, tenantId, clientId);

        // Notify admins (non-blocking)
        notifyMeetingActions(tenantId, clientId, meeting.id, data.filename ?? 'Upload', analysis.actions?.length ?? 0)
          .catch(() => {});

        const full = await getMeeting(tenantId, meeting.id);
        return reply.send({ success: true, meeting: full });
      } catch (err: any) {
        // Mark as failed but return meeting ID so user can retry
        await query(`UPDATE meetings SET status = 'failed' WHERE id = $1`, [meeting.id]);
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
        },
      );

      return reply.send({
        success: true,
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

      if (body.create_in_system) {
        try {
          systemItemId = await executeAction(action, tenantId);
        } catch (e: any) {
          console.error('[meetings] executeAction failed:', e.message);
        }
      }

      await approveMeetingAction(tenantId, actionId, systemItemId);
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
          const systemItemId = await executeAction(action, tenantId).catch(() => undefined);
          await approveMeetingAction(tenantId, action.id, systemItemId);
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
      const ok = await rejectMeetingAction(tenantId, request.params.actionId);
      if (!ok) return reply.code(404).send({ error: 'not_found' });
      return reply.send({ success: true });
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
      email: z.string().optional(),
      phone: z.string().optional(),
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

      let meetingUrl = body.meeting_url ?? '';
      let htmlLink = '';

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
        });

        meetingUrl = calResult.meetUrl;
        htmlLink = calResult.htmlLink;
      }

      // ── 2. Create meeting record ─────────────────────────────────────
      const meetingRow = await createMeeting({
        tenantId,
        clientId: body.client_id ?? '',
        title: body.title,
        platform: body.platform,
        meetingUrl,
        createdBy: (request.user as any).email ?? 'admin',
      });
      const meetingId = meetingRow.id;

      // ── 3. Schedule Recall bot for transcription ─────────────────────
      if (body.schedule_bot && meetingUrl) {
        try {
          await enqueueJob(tenantId, 'meet-bot', {
            meeting_id: meetingId,
            meeting_url: meetingUrl,
            scheduled_at: startAt.toISOString(),
            client_id: body.client_id,
            title: body.title,
            platform: body.platform,
          }, { scheduledFor: new Date(startAt.getTime() - 60_000) });
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
        `SELECT id, email, name, role, 'team' AS source
         FROM users
         WHERE tenant_id = $1 AND active = true
         ORDER BY name ASC`,
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
