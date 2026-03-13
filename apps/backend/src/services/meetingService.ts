/**
 * Meeting Service
 * Transcribes audio via Whisper, analyzes with Claude to extract actions,
 * and manages meeting approval workflow + operational audit.
 */

import crypto from 'crypto';
import { query } from '../db';
import { env } from '../env';
import { generateCompletion } from './ai/claudeService';

export type MeetingStatus =
  | 'scheduled'
  | 'bot_scheduled'
  | 'joining'
  | 'in_call'
  | 'recorded'
  | 'transcript_pending'
  | 'transcribed'
  | 'analysis_pending'
  | 'analyzed'
  | 'approval_pending'
  | 'partially_approved'
  | 'completed'
  | 'failed'
  | 'archived';

export type MeetingFailedStage =
  | 'calendar_detect'
  | 'bot_create'
  | 'bot_join'
  | 'bot_finalize'
  | 'transcript_fetch'
  | 'analysis'
  | 'system_create'
  | 'whatsapp_notify';

export interface MeetingAction {
  type: 'briefing' | 'task' | 'campaign' | 'pauta' | 'note';
  title: string;
  description: string;
  responsible?: string | null;
  deadline?: string | null; // YYYY-MM-DD
  priority: 'high' | 'medium' | 'low';
  raw_excerpt: string;
  confidence_score?: number | null;
}

export interface MeetingAnalysis {
  summary: string;
  actions: MeetingAction[];
}

type MeetingEventInput = {
  meetingId: string;
  tenantId: string;
  clientId: string;
  eventType: string;
  stage?: string | null;
  status?: string | null;
  message?: string | null;
  actorType?: string | null;
  actorId?: string | null;
  payload?: Record<string, any> | null;
};

type UpdateMeetingStateParams = {
  meetingId: string;
  tenantId: string;
  changes: Record<string, any>;
  event?: Omit<MeetingEventInput, 'meetingId' | 'tenantId' | 'clientId'>;
};

const ANALYSIS_PROMPT = `Você é um analista de reuniões sênior. Analise a transcrição abaixo e extraia:

1. Um RESUMO executivo da reunião (máx 200 palavras, em bullets)
2. Todas as AÇÕES identificadas — decisões, tarefas, demandas, próximos passos

Para cada ação, classifique como:
- "briefing": quando envolve criar conteúdo, post, campanha, material de comunicação
- "campaign": quando é uma campanha completa com objetivo, público e prazo
- "pauta": quando é sugestão de pauta editorial / assunto para comunicar
- "task": quando é uma tarefa operacional (reunião, envio, entrega, etc)
- "note": quando é uma informação relevante sem ação clara, mas que deve ser registrada

Retorne APENAS um JSON válido no formato:
{
  "summary": "...",
  "actions": [
    {
      "type": "briefing|task|campaign|pauta|note",
      "title": "Título claro e objetivo da ação",
      "description": "Descrição completa com contexto suficiente para executar",
      "responsible": "Nome da pessoa mencionada como responsável (ou null)",
      "deadline": "YYYY-MM-DD ou null",
      "priority": "high|medium|low",
      "raw_excerpt": "Trecho da transcrição que originou esta ação",
      "confidence_score": 0.0
    }
  ]
}`;

// ── Whisper transcription ──────────────────────────────────────────────────

export async function transcribeAudioBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const ext = resolveExt(mimeType);
  const form = new FormData();
  form.append('file', new Blob([buffer.buffer as ArrayBuffer], { type: mimeType }), `audio.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'pt');
  form.append('response_format', 'verbose_json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Whisper error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json() as { text: string };
  return data.text;
}

function resolveExt(mimeType: string): string {
  if (mimeType.includes('mp4') || mimeType.includes('m4a') || mimeType.includes('mpeg')) return 'mp4';
  if (mimeType.includes('webm')) return 'webm';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('wav')) return 'wav';
  return 'mp3';
}

// ── Meeting analysis with Claude ───────────────────────────────────────────

export async function analyzeMeetingTranscript(
  transcript: string,
  clientName: string,
): Promise<MeetingAnalysis> {
  const prompt = `Cliente: ${clientName}\n\nTRANSCRIÇÃO DA REUNIÃO:\n${transcript.slice(0, 12000)}`;

  const result = await generateCompletion({
    prompt,
    systemPrompt: ANALYSIS_PROMPT,
    temperature: 0.2,
    maxTokens: 4096,
  });

  const text = result.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Resposta do modelo não continha JSON válido');

  const parsed = JSON.parse(jsonMatch[0]) as MeetingAnalysis;
  return {
    summary: String(parsed.summary || '').trim(),
    actions: Array.isArray(parsed.actions)
      ? parsed.actions.map((action) => ({
          ...action,
          title: String(action.title || '').trim(),
          description: String(action.description || '').trim(),
          raw_excerpt: String(action.raw_excerpt || '').trim(),
          confidence_score: normalizeConfidence(action.confidence_score),
          deadline: normalizeDeadline(action.deadline),
        }))
      : [],
  };
}

// ── DB bootstrap ───────────────────────────────────────────────────────────

export async function ensureMeetingTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS meetings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      title TEXT NOT NULL,
      platform TEXT,
      meeting_url TEXT,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      duration_secs INT,
      transcript TEXT,
      summary TEXT,
      status TEXT NOT NULL DEFAULT 'transcript_pending',
      audio_key TEXT,
      created_by TEXT,
      source TEXT,
      source_ref_id TEXT,
      bot_provider TEXT,
      bot_id TEXT,
      bot_status TEXT,
      transcript_provider TEXT,
      transcript_hash TEXT,
      analysis_version INT NOT NULL DEFAULT 1,
      failed_stage TEXT,
      failed_reason TEXT,
      retry_count INT NOT NULL DEFAULT 0,
      last_retry_at TIMESTAMPTZ,
      summary_sent_at TIMESTAMPTZ,
      approved_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      last_processed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS meeting_actions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      responsible TEXT,
      deadline DATE,
      priority TEXT DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'pending',
      system_item_id UUID,
      system_item_type TEXT,
      execution_status TEXT,
      execution_error TEXT,
      raw_excerpt TEXT,
      excerpt_hash TEXT,
      idempotency_key TEXT,
      confidence_score NUMERIC(5,4),
      analysis_version INT NOT NULL DEFAULT 1,
      approved_by TEXT,
      approved_at TIMESTAMPTZ,
      rejected_by TEXT,
      rejected_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS meeting_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      event_type TEXT NOT NULL,
      stage TEXT,
      status TEXT,
      message TEXT,
      actor_type TEXT,
      actor_id TEXT,
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  await query(`ALTER TABLE calendar_auto_joins ADD COLUMN IF NOT EXISTS client_id TEXT`).catch(() => {});
  await query(`ALTER TABLE calendar_auto_joins ADD COLUMN IF NOT EXISTS bot_id TEXT`).catch(() => {});
  await query(`ALTER TABLE calendar_auto_joins ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'detected'`).catch(() => {});
  await query(`ALTER TABLE calendar_auto_joins ADD COLUMN IF NOT EXISTS last_error TEXT`).catch(() => {});
  await query(`ALTER TABLE calendar_auto_joins ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0`).catch(() => {});
  await query(`ALTER TABLE calendar_auto_joins ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ`).catch(() => {});
  await query(`ALTER TABLE calendar_auto_joins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`).catch(() => {});
}

// ── CRUD / state ───────────────────────────────────────────────────────────

export async function createMeeting(params: {
  tenantId: string;
  clientId: string;
  title: string;
  platform?: string;
  meetingUrl?: string;
  createdBy?: string;
  source?: string;
  sourceRefId?: string | null;
  status?: MeetingStatus;
  recordedAt?: Date;
}) {
  const source = params.source ?? (params.platform === 'upload' ? 'upload' : 'manual_bot');
  const status = params.status ?? (source === 'upload' ? 'transcript_pending' : 'scheduled');

  const { rows } = await query(
    `INSERT INTO meetings
       (tenant_id, client_id, title, platform, meeting_url, created_by, source, source_ref_id, status, recorded_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, COALESCE($10, now()))
     RETURNING *`,
    [
      params.tenantId,
      params.clientId,
      params.title,
      params.platform ?? 'upload',
      params.meetingUrl ?? null,
      params.createdBy ?? null,
      source,
      params.sourceRefId ?? null,
      status,
      params.recordedAt ?? null,
    ],
  );

  const meeting = rows[0];
  await recordMeetingEvent({
    meetingId: meeting.id,
    tenantId: params.tenantId,
    clientId: params.clientId,
    eventType: 'meeting.created',
    stage: 'meeting',
    status,
    message: `Meeting criada via ${source}`,
    actorType: 'system',
    actorId: params.createdBy ?? source,
    payload: {
      platform: params.platform ?? 'upload',
      meeting_url: params.meetingUrl ?? null,
      source_ref_id: params.sourceRefId ?? null,
    },
  });
  return meeting;
}

export async function saveMeetingTranscript(params: {
  meetingId: string;
  tenantId: string;
  transcript: string;
  provider: 'recall' | 'whisper' | 'manual';
  status?: MeetingStatus;
  actorType?: string;
  actorId?: string;
}) {
  const transcriptHash = hashText(params.transcript);
  await updateMeetingState({
    meetingId: params.meetingId,
    tenantId: params.tenantId,
    changes: {
      transcript: params.transcript,
      transcript_provider: params.provider,
      transcript_hash: transcriptHash,
      failed_stage: null,
      failed_reason: null,
      last_processed_at: new Date(),
      status: params.status ?? 'transcribed',
    },
    event: {
      eventType: 'meeting.transcript_saved',
      stage: 'transcript',
      status: params.status ?? 'transcribed',
      message: `Transcript salvo via ${params.provider}`,
      actorType: params.actorType ?? 'system',
      actorId: params.actorId ?? params.provider,
      payload: {
        provider: params.provider,
        transcript_hash: transcriptHash,
        length: params.transcript.length,
      },
    },
  });
}

export async function saveMeetingAnalysis(
  meetingId: string,
  transcript: string,
  analysis: MeetingAnalysis,
  tenantId: string,
  clientId: string,
  options?: {
    transcriptProvider?: 'recall' | 'whisper' | 'manual';
    replacePendingActions?: boolean;
    actorType?: string;
    actorId?: string;
  },
): Promise<{ analysisVersion: number; actionCount: number; supersededCount: number }> {
  const { rows: meetingRows } = await query<{ analysis_version: number }>(
    `SELECT analysis_version FROM meetings WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [meetingId, tenantId],
  );
  if (!meetingRows.length) throw new Error('meeting_not_found');

  let analysisVersion = Number(meetingRows[0].analysis_version || 1);
  let supersededCount = 0;

  if (options?.replacePendingActions) {
    const supersedeRes = await query<{ id: string }>(
      `UPDATE meeting_actions
          SET status = 'superseded', updated_at = now()
        WHERE meeting_id = $1 AND tenant_id = $2 AND status = 'pending'
      RETURNING id`,
      [meetingId, tenantId],
    );
    supersededCount = supersedeRes.rows.length;
    analysisVersion += 1;
  }

  const normalizedActions = analysis.actions
    .map(normalizeAction)
    .filter((action) => action.title && action.type);

  const meetingStatus = normalizedActions.length > 0 ? 'approval_pending' : 'analyzed';
  const transcriptHash = hashText(transcript);

  await updateMeetingState({
    meetingId,
    tenantId,
    changes: {
      transcript,
      transcript_provider: options?.transcriptProvider ?? null,
      transcript_hash: transcriptHash,
      summary: analysis.summary,
      analysis_version: analysisVersion,
      status: meetingStatus,
      failed_stage: null,
      failed_reason: null,
      last_processed_at: new Date(),
    },
    event: {
      eventType: options?.replacePendingActions ? 'meeting.reanalyzed' : 'meeting.analyzed',
      stage: 'analysis',
      status: meetingStatus,
      message: `${normalizedActions.length} ação(ões) processadas`,
      actorType: options?.actorType ?? 'system',
      actorId: options?.actorId ?? 'jarvis',
      payload: {
        analysis_version: analysisVersion,
        superseded_count: supersededCount,
        transcript_hash: transcriptHash,
        action_count: normalizedActions.length,
      },
    },
  });

  for (const action of normalizedActions) {
    const hashes = buildActionHashes(action);
    await query(
      `INSERT INTO meeting_actions
         (meeting_id, tenant_id, client_id, type, title, description, responsible, deadline,
          priority, raw_excerpt, excerpt_hash, idempotency_key, confidence_score, analysis_version, updated_at)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, $11, $12, $13, $14, now())
       ON CONFLICT (meeting_id, analysis_version, idempotency_key)
       DO UPDATE SET
         description = EXCLUDED.description,
         responsible = EXCLUDED.responsible,
         deadline = EXCLUDED.deadline,
         priority = EXCLUDED.priority,
         raw_excerpt = EXCLUDED.raw_excerpt,
         excerpt_hash = EXCLUDED.excerpt_hash,
         confidence_score = EXCLUDED.confidence_score,
         updated_at = now()`,
      [
        meetingId,
        tenantId,
        clientId,
        action.type,
        action.title,
        action.description,
        action.responsible ?? null,
        action.deadline ?? null,
        action.priority,
        action.raw_excerpt ?? null,
        hashes.excerptHash,
        hashes.idempotencyKey,
        action.confidence_score ?? null,
        analysisVersion,
      ],
    );
  }

  return {
    analysisVersion,
    actionCount: normalizedActions.length,
    supersededCount,
  };
}

export async function getMeeting(tenantId: string, meetingId: string) {
  const { rows } = await query(
    `SELECT m.*,
            caj.id AS auto_join_id,
            caj.status AS auto_join_status,
            caj.bot_id AS auto_join_bot_id,
            caj.last_error AS auto_join_last_error,
            caj.attempt_count AS auto_join_attempt_count,
            caj.scheduled_at AS auto_join_scheduled_at,
            json_agg(ma.* ORDER BY ma.analysis_version DESC, ma.created_at)
              FILTER (WHERE ma.id IS NOT NULL) AS actions
       FROM meetings m
       LEFT JOIN LATERAL (
         SELECT id, status, bot_id, last_error, attempt_count, scheduled_at
           FROM calendar_auto_joins
          WHERE meeting_id = m.id
          ORDER BY created_at DESC
          LIMIT 1
       ) caj ON true
       LEFT JOIN meeting_actions ma ON ma.meeting_id = m.id
      WHERE m.id = $1 AND m.tenant_id = $2
      GROUP BY m.id, caj.id, caj.status, caj.bot_id, caj.last_error, caj.attempt_count, caj.scheduled_at`,
    [meetingId, tenantId],
  );
  return rows[0] ?? null;
}

export async function listMeetings(tenantId: string, clientId: string, limit = 20) {
  const { rows } = await query(
    `SELECT m.*,
            COUNT(ma.id) FILTER (WHERE ma.status = 'pending')::int AS pending_actions,
            COUNT(ma.id)::int AS total_actions
       FROM meetings m
       LEFT JOIN meeting_actions ma ON ma.meeting_id = m.id
      WHERE m.tenant_id = $1 AND m.client_id = $2
      GROUP BY m.id
      ORDER BY m.recorded_at DESC
      LIMIT $3`,
    [tenantId, clientId, limit],
  );
  return rows;
}

export async function getMeetingStatus(tenantId: string, meetingId: string) {
  const { rows } = await query(
    `SELECT
        m.*,
        COALESCE(action_stats.total_actions, 0) AS total_actions,
        COALESCE(action_stats.pending_actions, 0) AS pending_actions,
        COALESCE(action_stats.approved_actions, 0) AS approved_actions,
        COALESCE(action_stats.rejected_actions, 0) AS rejected_actions,
        caj.id AS auto_join_id,
        caj.status AS auto_join_status,
        caj.bot_id AS auto_join_bot_id,
        caj.last_error AS auto_join_last_error,
        caj.attempt_count AS auto_join_attempt_count,
        caj.scheduled_at AS auto_join_scheduled_at,
        latest_event.event_type AS latest_event_type,
        latest_event.stage AS latest_event_stage,
        latest_event.message AS latest_event_message,
        latest_event.created_at AS latest_event_at
       FROM meetings m
       LEFT JOIN LATERAL (
         SELECT
           COUNT(*)::int AS total_actions,
           COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_actions,
           COUNT(*) FILTER (WHERE status = 'approved')::int AS approved_actions,
           COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected_actions
           FROM meeting_actions
          WHERE meeting_id = m.id
       ) action_stats ON true
       LEFT JOIN LATERAL (
         SELECT id, status, bot_id, last_error, attempt_count, scheduled_at
           FROM calendar_auto_joins
          WHERE meeting_id = m.id
          ORDER BY created_at DESC
          LIMIT 1
       ) caj ON true
       LEFT JOIN LATERAL (
         SELECT event_type, stage, message, created_at
           FROM meeting_events
          WHERE meeting_id = m.id
          ORDER BY created_at DESC
          LIMIT 1
       ) latest_event ON true
      WHERE m.id = $1 AND m.tenant_id = $2
      LIMIT 1`,
    [meetingId, tenantId],
  );
  return rows[0] ?? null;
}

export async function listMeetingAudit(tenantId: string, meetingId: string) {
  const meeting = await getMeetingStatus(tenantId, meetingId);
  if (!meeting) return null;

  const { rows: events } = await query(
    `SELECT id, event_type, stage, status, message, actor_type, actor_id, payload, created_at
       FROM meeting_events
      WHERE meeting_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC
      LIMIT 200`,
    [meetingId, tenantId],
  );

  const autoJoinId = meeting.auto_join_id ?? null;
  const { rows: jobs } = await query(
    `SELECT id, type, status, attempts, error_message, scheduled_for, created_at, updated_at, payload
       FROM job_queue
      WHERE tenant_id = $1::uuid
        AND (
          payload->>'meetingId' = $2 OR
          payload->>'meeting_id' = $2 OR
          payload->>'botId' = COALESCE($3, '') OR
          payload->>'bot_id' = COALESCE($3, '') OR
          payload->>'autoJoinId' = COALESCE($4, '') OR
          payload->>'auto_join_id' = COALESCE($4, '')
        )
      ORDER BY created_at DESC
      LIMIT 100`,
    [tenantId, meetingId, meeting.bot_id ?? null, autoJoinId],
  ).catch(() => ({ rows: [] as any[] }));

  return {
    meeting,
    events,
    jobs,
  };
}

export async function approveMeetingAction(
  tenantId: string,
  actionId: string,
  options?: {
    systemItemId?: string;
    systemItemType?: string | null;
    approvedBy?: string | null;
    executionStatus?: string | null;
    executionError?: string | null;
  },
): Promise<boolean> {
  const { rows } = await query<{ meeting_id: string; client_id: string }>(
    `UPDATE meeting_actions
        SET status = 'approved',
            system_item_id = $1,
            system_item_type = $2,
            approved_by = $3,
            approved_at = now(),
            execution_status = $4,
            execution_error = $5,
            updated_at = now()
      WHERE id = $6 AND tenant_id = $7
      RETURNING meeting_id, client_id`,
    [
      options?.systemItemId ?? null,
      options?.systemItemType ?? null,
      options?.approvedBy ?? null,
      options?.executionStatus ?? null,
      options?.executionError ?? null,
      actionId,
      tenantId,
    ],
  );

  if (!rows.length) return false;

  await refreshMeetingApprovalStatus(tenantId, rows[0].meeting_id, rows[0].client_id);
  await recordMeetingEvent({
    meetingId: rows[0].meeting_id,
    tenantId,
    clientId: rows[0].client_id,
    eventType: 'meeting.action_approved',
    stage: 'approval',
    status: 'approved',
    actorType: 'user',
    actorId: options?.approvedBy ?? null,
    message: 'Ação aprovada',
    payload: {
      action_id: actionId,
      system_item_id: options?.systemItemId ?? null,
      execution_status: options?.executionStatus ?? null,
      execution_error: options?.executionError ?? null,
    },
  });
  return true;
}

export async function rejectMeetingAction(
  tenantId: string,
  actionId: string,
  rejectedBy?: string | null,
): Promise<boolean> {
  const { rows } = await query<{ meeting_id: string; client_id: string }>(
    `UPDATE meeting_actions
        SET status = 'rejected',
            rejected_by = $1,
            rejected_at = now(),
            execution_status = COALESCE(execution_status, 'skipped'),
            updated_at = now()
      WHERE id = $2 AND tenant_id = $3
      RETURNING meeting_id, client_id`,
    [rejectedBy ?? null, actionId, tenantId],
  );

  if (!rows.length) return false;

  await refreshMeetingApprovalStatus(tenantId, rows[0].meeting_id, rows[0].client_id);
  await recordMeetingEvent({
    meetingId: rows[0].meeting_id,
    tenantId,
    clientId: rows[0].client_id,
    eventType: 'meeting.action_rejected',
    stage: 'approval',
    status: 'rejected',
    actorType: 'user',
    actorId: rejectedBy ?? null,
    message: 'Ação rejeitada',
    payload: { action_id: actionId },
  });
  return true;
}

export async function recordMeetingEvent(input: MeetingEventInput): Promise<void> {
  await query(
    `INSERT INTO meeting_events
       (meeting_id, tenant_id, client_id, event_type, stage, status, message, actor_type, actor_id, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
    [
      input.meetingId,
      input.tenantId,
      input.clientId,
      input.eventType,
      input.stage ?? null,
      input.status ?? null,
      input.message ?? null,
      input.actorType ?? null,
      input.actorId ?? null,
      input.payload ? JSON.stringify(input.payload) : null,
    ],
  );
}

export async function updateMeetingState(params: UpdateMeetingStateParams) {
  const { rows: currentRows } = await query<{ client_id: string }>(
    `SELECT client_id FROM meetings WHERE id = $1 AND tenant_id = $2 LIMIT 1`,
    [params.meetingId, params.tenantId],
  );
  if (!currentRows.length) return null;

  const columnMap: Record<string, string> = {
    title: 'title',
    platform: 'platform',
    meeting_url: 'meeting_url',
    transcript: 'transcript',
    summary: 'summary',
    status: 'status',
    audio_key: 'audio_key',
    source: 'source',
    source_ref_id: 'source_ref_id',
    bot_provider: 'bot_provider',
    bot_id: 'bot_id',
    bot_status: 'bot_status',
    transcript_provider: 'transcript_provider',
    transcript_hash: 'transcript_hash',
    analysis_version: 'analysis_version',
    failed_stage: 'failed_stage',
    failed_reason: 'failed_reason',
    retry_count: 'retry_count',
    last_retry_at: 'last_retry_at',
    summary_sent_at: 'summary_sent_at',
    approved_at: 'approved_at',
    completed_at: 'completed_at',
    last_processed_at: 'last_processed_at',
    duration_secs: 'duration_secs',
    recorded_at: 'recorded_at',
    created_by: 'created_by',
    updated_at: 'updated_at',
  };

  const updates: string[] = [];
  const values: any[] = [];
  let index = 1;

  for (const [key, rawValue] of Object.entries(params.changes)) {
    const column = columnMap[key];
    if (!column) continue;
    updates.push(`${column} = $${index}`);
    values.push(rawValue);
    index += 1;
  }

  if (!updates.length) return null;
  updates.push(`updated_at = now()`);
  values.push(params.meetingId, params.tenantId);

  const { rows } = await query(
    `UPDATE meetings
        SET ${updates.join(', ')}
      WHERE id = $${index} AND tenant_id = $${index + 1}
      RETURNING *`,
    values,
  );

  const updated = rows[0] ?? null;
  if (updated && params.event) {
    await recordMeetingEvent({
      meetingId: params.meetingId,
      tenantId: params.tenantId,
      clientId: currentRows[0].client_id,
      ...params.event,
    });
  }
  return updated;
}

export async function notifyMeetingActions(
  tenantId: string,
  clientId: string,
  meetingId: string,
  meetingTitle: string,
  actionCount: number,
): Promise<void> {
  if (actionCount === 0) return;
  try {
    const { notifyEvent } = await import('./notificationService');
    const { rows: admins } = await query(
      `SELECT eu.id, eu.email FROM edro_users eu
       JOIN tenant_users tu ON tu.user_id = eu.id
       WHERE tu.tenant_id = $1 AND tu.role IN ('admin', 'owner') LIMIT 5`,
      [tenantId],
    );
    const link = `/clients/${clientId}/meetings`;
    const title = `Reuniao analisada: ${meetingTitle}`;
    const body = `${actionCount} acao${actionCount > 1 ? 'es' : ''} extraida${actionCount > 1 ? 's' : ''} da reuniao "${meetingTitle}". Revise e aprove.`;
    await Promise.allSettled(
      admins.map((a: any) =>
        notifyEvent({
          event: 'meeting_analyzed',
          tenantId,
          userId: a.id,
          title,
          body,
          link,
          recipientEmail: a.email,
          payload: { meetingId, clientId, actionCount },
        }),
      ),
    );
  } catch (err: any) {
    console.error('[meetingService] notifyMeetingActions error:', err?.message);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function refreshMeetingApprovalStatus(tenantId: string, meetingId: string, clientId: string) {
  const { rows } = await query<{
    total: string;
    pending: string;
    approved: string;
    rejected: string;
  }>(
    `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')::int AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
       FROM meeting_actions
      WHERE meeting_id = $1 AND tenant_id = $2`,
    [meetingId, tenantId],
  );

  const stats = rows[0];
  if (!stats) return;

  const total = Number(stats.total || 0);
  const pending = Number(stats.pending || 0);
  const approved = Number(stats.approved || 0);
  const rejected = Number(stats.rejected || 0);

  let nextStatus: MeetingStatus = pending > 0 ? 'approval_pending' : 'completed';
  if (pending === 0 && approved > 0 && rejected > 0) nextStatus = 'partially_approved';
  if (pending > 0) nextStatus = 'approval_pending';
  if (pending === 0 && total === 0) nextStatus = 'analyzed';

  const changes: Record<string, any> = { status: nextStatus };
  if (pending === 0 && approved > 0) changes.approved_at = new Date();
  if (pending === 0) changes.completed_at = new Date();

  await updateMeetingState({
    meetingId,
    tenantId,
    changes,
    event: {
      eventType: 'meeting.approval_status_refreshed',
      stage: 'approval',
      status: nextStatus,
      message: `Aprovação atualizada: ${approved}/${total} aprovadas, ${rejected}/${total} rejeitadas`,
      actorType: 'system',
      actorId: 'meetingService',
      payload: { total, pending, approved, rejected },
    },
  });

  if (pending === 0) {
    await recordMeetingEvent({
      meetingId,
      tenantId,
      clientId,
      eventType: 'meeting.review_completed',
      stage: 'approval',
      status: nextStatus,
      message: 'Revisão da reunião concluída',
      actorType: 'system',
      actorId: 'meetingService',
      payload: { total, approved, rejected },
    });
  }
}

function normalizeDeadline(value: string | null | undefined): string | null {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

function normalizeConfidence(value: unknown): number | null {
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return Number(value.toFixed(4));
}

function normalizeAction(action: MeetingAction): MeetingAction {
  return {
    type: action.type,
    title: String(action.title || '').trim(),
    description: String(action.description || '').trim(),
    responsible: action.responsible ? String(action.responsible).trim() : null,
    deadline: normalizeDeadline(action.deadline),
    priority: action.priority || 'medium',
    raw_excerpt: String(action.raw_excerpt || '').trim(),
    confidence_score: normalizeConfidence(action.confidence_score),
  };
}

function buildActionHashes(action: MeetingAction) {
  const excerptHash = hashText(normalizeText(action.raw_excerpt || action.description || action.title));
  const idempotencyKey = hashText([
    action.type,
    normalizeText(action.title),
    normalizeText(action.description),
    normalizeText(action.responsible ?? ''),
    action.deadline ?? '',
    action.priority ?? 'medium',
    excerptHash,
  ].join('|'));
  return { excerptHash, idempotencyKey };
}

function normalizeText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function hashText(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
