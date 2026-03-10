/**
 * Meeting Service
 * Transcribes audio via Whisper, analyzes with Claude to extract actions,
 * and manages meeting approval workflow.
 */

import { query } from '../db';
import { env } from '../env';
import { generateCompletion } from './ai/claudeService';

// ── Types ──────────────────────────────────────────────────────────────────

export interface MeetingAction {
  type: 'briefing' | 'task' | 'campaign' | 'pauta' | 'note';
  title: string;
  description: string;
  responsible?: string;
  deadline?: string;      // YYYY-MM-DD
  priority: 'high' | 'medium' | 'low';
  raw_excerpt: string;
}

export interface MeetingAnalysis {
  summary: string;
  actions: MeetingAction[];
}

// ── Whisper transcription ──────────────────────────────────────────────────

export async function transcribeAudioBuffer(buffer: Buffer, mimeType: string): Promise<string> {
  const apiKey = env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY não configurada');

  const ext = resolveExt(mimeType);
  const form = new FormData();
  form.append('file', new Blob([buffer.buffer as ArrayBuffer], { type: mimeType }), `audio.${ext}`);
  form.append('model', 'whisper-1');
  form.append('language', 'pt');
  form.append('response_format', 'verbose_json');  // includes duration

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Whisper error (${res.status}): ${err.slice(0, 200)}`);
  }

  const data = await res.json() as { text: string; duration?: number };
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
      "raw_excerpt": "Trecho da transcrição que originou esta ação"
    }
  ]
}`;

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

  return JSON.parse(jsonMatch[0]) as MeetingAnalysis;
}

// ── DB operations ──────────────────────────────────────────────────────────

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
      status TEXT NOT NULL DEFAULT 'processing',
      audio_key TEXT,
      created_by TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
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
      raw_excerpt TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

export async function createMeeting(params: {
  tenantId: string;
  clientId: string;
  title: string;
  platform?: string;
  meetingUrl?: string;
  createdBy?: string;
}) {
  const { rows } = await query(
    `INSERT INTO meetings (tenant_id, client_id, title, platform, meeting_url, created_by)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [params.tenantId, params.clientId, params.title, params.platform ?? 'upload', params.meetingUrl ?? null, params.createdBy ?? null],
  );
  return rows[0];
}

export async function saveMeetingAnalysis(meetingId: string, transcript: string, analysis: MeetingAnalysis, tenantId: string, clientId: string) {
  await query(
    `UPDATE meetings SET transcript = $1, summary = $2, status = 'analyzed' WHERE id = $3`,
    [transcript, analysis.summary, meetingId],
  );

  for (const action of analysis.actions) {
    await query(
      `INSERT INTO meeting_actions (meeting_id, tenant_id, client_id, type, title, description, responsible, deadline, priority, raw_excerpt)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10)`,
      [
        meetingId, tenantId, clientId,
        action.type, action.title, action.description,
        action.responsible ?? null,
        action.deadline ?? null,
        action.priority,
        action.raw_excerpt ?? null,
      ],
    );
  }
}

export async function getMeeting(tenantId: string, meetingId: string) {
  const { rows } = await query(
    `SELECT m.*,
       json_agg(ma.* ORDER BY ma.created_at) FILTER (WHERE ma.id IS NOT NULL) AS actions
     FROM meetings m
     LEFT JOIN meeting_actions ma ON ma.meeting_id = m.id
     WHERE m.id = $1 AND m.tenant_id = $2
     GROUP BY m.id`,
    [meetingId, tenantId],
  );
  return rows[0] ?? null;
}

export async function listMeetings(tenantId: string, clientId: string, limit = 20) {
  const { rows } = await query(
    `SELECT m.*,
       COUNT(ma.id) FILTER (WHERE ma.status = 'pending') AS pending_actions,
       COUNT(ma.id) AS total_actions
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

export async function approveMeetingAction(
  tenantId: string,
  actionId: string,
  systemItemId?: string,
): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE meeting_actions
     SET status = 'approved', system_item_id = $1
     WHERE id = $2 AND tenant_id = $3`,
    [systemItemId ?? null, actionId, tenantId],
  );
  return (rowCount ?? 0) > 0;
}

export async function rejectMeetingAction(tenantId: string, actionId: string): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE meeting_actions SET status = 'rejected' WHERE id = $1 AND tenant_id = $2`,
    [actionId, tenantId],
  );
  return (rowCount ?? 0) > 0;
}

// ── Notifications ──────────────────────────────────────────────────

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
