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
} from '../services/meetingService';
import { query } from '../db';
import { createBriefing } from '../repositories/edroBriefingRepository';
import { getClientById } from '../repos/clientsRepo';
import { enqueueJob } from '../jobs/jobQueue';

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
}

// ── Execute approved action in system ─────────────────────────────────────

async function executeAction(action: any, tenantId: string): Promise<string | undefined> {
  if (action.type === 'briefing' || action.type === 'pauta') {
    // Resolve edro_clients UUID
    const { rows } = await query(
      `SELECT id FROM edro_clients WHERE client_id = $1 AND tenant_id = $2 LIMIT 1`,
      [action.client_id, tenantId],
    );
    if (!rows.length) return undefined;
    const edroClientId = rows[0].id;

    const briefing = await createBriefing({
      client_id: edroClientId,
      title: action.title,
      status: 'draft',
      payload: {
        objective: action.description,
        origin: 'meeting',
        meeting_action_id: action.id,
        responsible: action.responsible ?? null,
        deadline: action.deadline ?? null,
      },
      created_by: 'jarvis-meeting',
    });
    return briefing.id;
  }

  if (action.type === 'task') {
    // Create a simple briefing as task placeholder (no campaign system yet for standalone tasks)
    const { rows } = await query(
      `SELECT id FROM edro_clients WHERE client_id = $1 AND tenant_id = $2 LIMIT 1`,
      [action.client_id, tenantId],
    );
    if (!rows.length) return undefined;

    const briefing = await createBriefing({
      client_id: rows[0].id,
      title: `[Tarefa] ${action.title}`,
      status: 'draft',
      payload: {
        objective: action.description,
        origin: 'meeting',
        type: 'task',
        responsible: action.responsible ?? null,
        deadline: action.deadline ?? null,
      },
      created_by: 'jarvis-meeting',
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
