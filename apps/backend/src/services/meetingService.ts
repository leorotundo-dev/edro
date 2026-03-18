/**
 * Meeting Service
 * Transcribes audio via Whisper, analyzes with Claude to extract actions,
 * and manages meeting approval workflow + operational audit.
 */

import crypto from 'crypto';
import { query } from '../db';
import { env } from '../env';
import { generateWithProvider } from './ai/copyOrchestrator';
import { getClientById, isInternalClientId } from '../repos/clientsRepo';
import {
  hasClientDocumentHash,
  insertClientDocument,
  insertClientInsight,
} from '../repos/clientIntelligenceRepo';
import { generatePautaSuggestionsFromMeetings } from './pautaSuggestionService';

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
  operation_lane?: 'atendimento' | 'operacao' | 'criacao' | 'midia' | 'estrategia' | 'cliente' | 'comercial' | null;
  required_skill?: string | null;
  owner_hint?: string | null;
  should_create_job?: boolean | null;
  needs_approval?: boolean | null;
  urgency_reason?: string | null;
}

export interface MeetingIntelligence {
  meeting_kind:
    | 'client_status'
    | 'client_briefing'
    | 'client_review'
    | 'internal_ops'
    | 'commercial'
    | 'alignment'
    | 'other';
  attention_level: 'critical' | 'high' | 'medium' | 'low';
  client_temperature: 'engaged' | 'neutral' | 'pressured' | 'at_risk' | 'blocked' | 'internal';
  account_pulse: string;
  recommended_next_step: string;
  owner_hint?: string | null;
  deadlines_cited: string[];
  decisions_taken: string[];
  production_directives: string[]; // explicit production/content rules stated in the meeting
  blockers: string[];
  risks: string[];
  opportunities: string[];
  approvals_needed: string[];
  follow_up_questions: string[];
  suggested_tags: string[];
}

export interface MeetingAnalysis {
  summary: string;
  intelligence: MeetingIntelligence;
  actions: MeetingAction[];
  model?: string;
  context_snapshot?: Record<string, any>;
}

export interface MeetingPrep {
  meeting_goal: string;
  opening_question: string;
  suggested_agenda: string[];
  agency_defense_points: string[];
  likely_client_pushbacks: string[];
  materials_to_prepare: string[];
  internal_alignment_notes: string[];
  red_flags: string[];
  success_criteria: string[];
  recommended_positioning: string;
}

export interface MeetingPrepComparison {
  overall_alignment: 'high' | 'medium' | 'low';
  what_matched: string[];
  what_did_not_happen: string[];
  unexpected_topics: string[];
  defense_effectiveness: string;
  follow_up_gaps: string[];
  prep_quality_note: string;
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

const ANALYSIS_PROMPT = `Você é o Jarvis operacional da Edro.

Seu trabalho não é só resumir reunião. Seu trabalho é transformar reunião em decisão operacional clara para uma agência de marketing/comunicação.

Regras Edro:
1. Priorize o que vira execução real, gargalo, aprovação, risco, prazo ou decisão.
2. Não invente. Se algo estiver implícito, baixe confiança e deixe explícito no contexto.
3. Diferencie:
- "briefing": criação de conteúdo, peça, post, material, texto, roteiro, campanha, desdobramento criativo
- "campaign": campanha com objetivo, canal, público, janela e execução mais ampla
- "pauta": tema editorial, oportunidade de calendário, assunto de conteúdo ainda sem escopo fechado
- "task": ação operacional, follow-up, envio, ajuste, alinhamento, coleta, reunião, aprovação, publicação
- "note": informação importante, sem ação fechada
4. Só use "deadline" quando existir data explícita ou claramente inferível da reunião.
5. Use "priority=high" quando a ação estiver atrasada, bloquear entrega, envolver cliente pressionando, prazo muito próximo ou risco claro.
6. Em cada ação, indique a faixa operacional:
- atendimento
- operacao
- criacao
- midia
- estrategia
- cliente
- comercial
7. Em cada ação, sugira "required_skill" quando for útil (ex.: atendimento, operacao, design, copy, social_media, video, midia_paga, planejamento).
8. Em "recommended_next_step", escreva a próxima decisão mais útil para a Central de Operações.
9. Em "account_pulse", descreva em 1 frase curta o estado da conta/reunião no tom de operação.
10. Use o contexto da conta/operação fornecido. Se a reunião retoma algo que já existe, deixe isso explícito.

Retorne APENAS JSON válido no formato:
{
  "summary": "- bullet 1\\n- bullet 2\\n- bullet 3",
  "intelligence": {
    "meeting_kind": "client_status|client_briefing|client_review|internal_ops|commercial|alignment|other",
    "attention_level": "critical|high|medium|low",
    "client_temperature": "engaged|neutral|pressured|at_risk|blocked|internal",
    "account_pulse": "frase curta",
    "recommended_next_step": "próxima ação decisiva",
    "owner_hint": "área ou pessoa sugerida, ou null",
    "deadlines_cited": ["YYYY-MM-DD"],
    "decisions_taken": ["..."],
    "production_directives": ["regra de produção/conteúdo explícita — ex: 'Emails sempre 600px', 'Nunca mencionar concorrente X', 'Tom sempre formal no LinkedIn'"],
    "blockers": ["..."],
    "risks": ["..."],
    "opportunities": ["..."],
    "approvals_needed": ["..."],
    "follow_up_questions": ["..."],
    "suggested_tags": ["..."]
  },
  "actions": [
    {
      "type": "briefing|task|campaign|pauta|note",
      "title": "Título claro e objetivo da ação",
      "description": "Descrição completa com contexto suficiente para executar",
      "responsible": "Nome da pessoa mencionada como responsável (ou null)",
      "deadline": "YYYY-MM-DD ou null",
      "priority": "high|medium|low",
      "raw_excerpt": "Trecho da transcrição que originou esta ação",
      "confidence_score": 0.0,
      "operation_lane": "atendimento|operacao|criacao|midia|estrategia|cliente|comercial|null",
      "required_skill": "skill ou null",
      "owner_hint": "papel sugerido ou null",
      "should_create_job": true,
      "needs_approval": false,
      "urgency_reason": "motivo da urgência ou null"
    }
  ]
}`;

type MeetingAnalysisContext = {
  client: Record<string, any>;
  openJobs: Array<Record<string, any>>;
  pendingMeetingActions: Array<Record<string, any>>;
  recentMeetings: Array<Record<string, any>>;
  activeRisks: Array<Record<string, any>>;
};

const PREP_PROMPT = `Você é o estrategista de preparação de reunião da Edro.

Sua tarefa é preparar a equipe da agência ANTES da reunião acontecer.

Objetivo:
1. sugerir a pauta mais útil
2. antecipar temas sensíveis
3. preparar a defesa da agência quando houver pressão, cobrança, risco, atraso ou questionamento
4. indicar materiais e alinhamentos que a equipe deve levar

Regras:
1. Use o contexto operacional da conta.
2. Seja específico e prático. Nada de genérico vazio.
3. Se a reunião parecer interna, adapte o tom para operação interna.
4. Em "agency_defense_points", prepare argumentos curtos, objetivos e profissionais para defender a agência quando o assunto surgir.
5. Em "likely_client_pushbacks", descreva objeções prováveis do cliente.
6. Em "red_flags", destaque o que pode dar ruim na reunião.
7. Em "opening_question", sugira a melhor pergunta para abrir a reunião com clareza.

Retorne APENAS JSON válido no formato:
{
  "meeting_goal": "objetivo principal da reunião",
  "opening_question": "pergunta inicial recomendada",
  "suggested_agenda": ["..."],
  "agency_defense_points": ["..."],
  "likely_client_pushbacks": ["..."],
  "materials_to_prepare": ["..."],
  "internal_alignment_notes": ["..."],
  "red_flags": ["..."],
  "success_criteria": ["..."],
  "recommended_positioning": "postura recomendada da agência"
}`;

const PREP_COMPARISON_PROMPT = `Você é o auditor operacional da Edro.

Compare o briefing pré-reunião com o que de fato aconteceu na reunião.

Objetivo:
1. medir aderência entre o preparo e o resultado
2. identificar o que a equipe antecipou certo
3. mostrar o que faltou preparar
4. avaliar se a defesa da agência foi suficiente

Retorne APENAS JSON válido no formato:
{
  "overall_alignment": "high|medium|low",
  "what_matched": ["..."],
  "what_did_not_happen": ["..."],
  "unexpected_topics": ["..."],
  "defense_effectiveness": "avaliação curta",
  "follow_up_gaps": ["..."],
  "prep_quality_note": "síntese curta e objetiva"
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

async function buildMeetingAnalysisContext(
  tenantId: string,
  clientId: string | null | undefined,
  clientName: string,
): Promise<MeetingAnalysisContext> {
  const internalMeeting = isInternalClientId(clientId);
  const safeClientId = clientId && !internalMeeting ? clientId : null;
  const clientRow = safeClientId ? await getClientById(tenantId, safeClientId).catch(() => null) : null;

  const [openJobsRes, pendingActionsRes, recentMeetingsRes, riskRes] = await Promise.all([
    query(
      `SELECT
         j.id,
         j.title,
         j.status,
         j.priority_band,
         j.deadline_at,
         j.required_skill,
         j.source,
         COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name
       FROM jobs j
       LEFT JOIN edro_users u ON u.id = j.owner_id
      WHERE j.tenant_id = $1
        AND ($2::text IS NULL OR j.client_id = $2)
        AND j.status <> 'archived'
      ORDER BY
        CASE j.priority_band
          WHEN 'p0' THEN 0
          WHEN 'p1' THEN 1
          WHEN 'p2' THEN 2
          WHEN 'p3' THEN 3
          ELSE 4
        END,
        j.deadline_at ASC NULLS LAST,
        j.updated_at DESC
      LIMIT 8`,
      [tenantId, safeClientId],
    ).catch(() => ({ rows: [] as any[] })),
    query(
      `SELECT title, type, priority, responsible, deadline, description
         FROM meeting_actions
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR client_id = $2)
          AND status = 'pending'
        ORDER BY created_at DESC
        LIMIT 6`,
      [tenantId, safeClientId],
    ).catch(() => ({ rows: [] as any[] })),
    query(
      `SELECT title, recorded_at, status, summary
         FROM meetings
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR client_id = $2)
        ORDER BY recorded_at DESC
        LIMIT 4`,
      [tenantId, safeClientId],
    ).catch(() => ({ rows: [] as any[] })),
    query(
      `SELECT risk_type, risk_band, summary, suggested_action
         FROM risk_signals
        WHERE tenant_id = $1
          AND ($2::text IS NULL OR client_id = $2)
          AND resolved_at IS NULL
        ORDER BY risk_score DESC, updated_at DESC
        LIMIT 5`,
      [tenantId, safeClientId],
    ).catch(() => ({ rows: [] as any[] })),
  ]);

  const profile = clientRow?.profile ?? {};

  return {
    client: {
      id: safeClientId,
      name: clientRow?.name ?? clientName,
      segment_primary: clientRow?.segment_primary ?? (internalMeeting ? 'interno' : null),
      segment_secondary: clientRow?.segment_secondary ?? [],
      status: clientRow?.status ?? null,
      tone_profile: profile?.tone_profile ?? null,
      risk_tolerance: profile?.risk_tolerance ?? null,
      keywords: Array.isArray(profile?.keywords) ? profile.keywords.slice(0, 12) : [],
      pillars: Array.isArray(profile?.pillars) ? profile.pillars.slice(0, 10) : [],
      negative_keywords: Array.isArray(profile?.negative_keywords) ? profile.negative_keywords.slice(0, 10) : [],
    },
    openJobs: openJobsRes.rows.map((row) => ({
      title: row.title,
      status: row.status,
      priority_band: row.priority_band,
      deadline_at: row.deadline_at,
      required_skill: row.required_skill,
      source: row.source,
      owner_name: row.owner_name,
    })),
    pendingMeetingActions: pendingActionsRes.rows.map((row) => ({
      title: row.title,
      type: row.type,
      priority: row.priority,
      responsible: row.responsible,
      deadline: row.deadline,
      description: shortText(String(row.description ?? ''), 220),
    })),
    recentMeetings: recentMeetingsRes.rows.map((row) => ({
      title: row.title,
      recorded_at: row.recorded_at,
      status: row.status,
      summary: shortText(String(row.summary ?? ''), 220),
    })),
    activeRisks: riskRes.rows.map((row) => ({
      risk_type: row.risk_type,
      risk_band: row.risk_band,
      summary: row.summary,
      suggested_action: row.suggested_action,
    })),
  };
}

export async function analyzeMeetingTranscript(
  params: {
    transcript: string;
    clientName: string;
    tenantId: string;
    clientId: string | null | undefined;
    meetingTitle?: string | null;
    platform?: string | null;
    source?: string | null;
    chatMessages?: Array<{ sender_name: string; message_text: string; sent_at: string }> | null;
  },
): Promise<MeetingAnalysis> {
  const context = await buildMeetingAnalysisContext(
    params.tenantId,
    params.clientId,
    params.clientName,
  );

  const chatBlock = params.chatMessages && params.chatMessages.length > 0
    ? [
        '',
        'CHAT DA REUNIAO (mensagens escritas durante a call):',
        params.chatMessages
          .map((m) => `[${m.sent_at}] ${m.sender_name}: ${m.message_text}`)
          .join('\n')
          .slice(0, 4000),
      ].join('\n')
    : null;

  const prompt = [
    `CLIENTE: ${params.clientName}`,
    params.meetingTitle ? `TITULO DA REUNIAO: ${params.meetingTitle}` : null,
    params.platform ? `PLATAFORMA: ${params.platform}` : null,
    params.source ? `ORIGEM: ${params.source}` : null,
    '',
    'CONTEXTO DA CONTA E DA OPERACAO:',
    JSON.stringify(context, null, 2),
    '',
    'TRANSCRICAO DA REUNIAO:',
    params.transcript.slice(0, 16000),
    chatBlock,
  ].filter(Boolean).join('\n');

  const result = await generateWithProvider('gemini', {
    prompt,
    systemPrompt: ANALYSIS_PROMPT,
    temperature: 0.2,
    maxTokens: 4096,
  });

  const text = result.output.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Resposta do modelo não continha JSON válido');

  const parsed = JSON.parse(jsonMatch[0]) as MeetingAnalysis;
  return {
    summary: String(parsed.summary || '').trim(),
    intelligence: normalizeIntelligence(parsed.intelligence, params.clientId),
    actions: Array.isArray(parsed.actions)
      ? parsed.actions.map((action) => ({
          ...action,
          title: String(action.title || '').trim(),
          description: String(action.description || '').trim(),
          raw_excerpt: String(action.raw_excerpt || '').trim(),
          confidence_score: normalizeConfidence(action.confidence_score),
          deadline: normalizeDeadline(action.deadline),
          operation_lane: normalizeOperationLane(action.operation_lane),
          required_skill: normalizeOptionalText(action.required_skill),
          owner_hint: normalizeOptionalText(action.owner_hint),
          should_create_job: normalizeBoolean(action.should_create_job),
          needs_approval: normalizeBoolean(action.needs_approval),
          urgency_reason: normalizeOptionalText(action.urgency_reason),
        }))
      : [],
    model: result.model,
    context_snapshot: context,
  };
}

export async function generateMeetingPrep(params: {
  tenantId: string;
  clientId: string | null | undefined;
  clientName: string;
  meetingTitle: string;
  description?: string | null;
  platform?: string | null;
  scheduledAt?: string | Date | null;
}): Promise<{ prep: MeetingPrep; model: string; contextSnapshot: MeetingAnalysisContext }> {
  const context = await buildMeetingAnalysisContext(
    params.tenantId,
    params.clientId,
    params.clientName,
  );

  const prompt = [
    `CLIENTE: ${params.clientName}`,
    `TITULO DA REUNIAO: ${params.meetingTitle}`,
    params.platform ? `PLATAFORMA: ${params.platform}` : null,
    params.scheduledAt ? `DATA DA REUNIAO: ${new Date(params.scheduledAt).toISOString()}` : null,
    params.description ? `DESCRICAO/OBJETIVO INFORMADO:\n${params.description}` : null,
    '',
    'CONTEXTO DA CONTA E DA OPERACAO:',
    JSON.stringify(context, null, 2),
  ].filter(Boolean).join('\n');

  const result = await generateWithProvider('gemini', {
    prompt,
    systemPrompt: PREP_PROMPT,
    temperature: 0.2,
    maxTokens: 2600,
  });

  const text = result.output.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Resposta do modelo não continha JSON válido para o preparo da reunião');

  const parsed = JSON.parse(jsonMatch[0]) as Partial<MeetingPrep>;
  return {
    prep: normalizeMeetingPrep(parsed),
    model: result.model,
    contextSnapshot: context,
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
      analysis_payload JSONB,
      analysis_input_context JSONB,
      analysis_model TEXT,
      prep_payload JSONB,
      prep_generated_at TIMESTAMPTZ,
      prep_model TEXT,
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
      metadata JSONB,
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

  await query(`
    CREATE TABLE IF NOT EXISTS meeting_participants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
      tenant_id TEXT NOT NULL,
      client_id TEXT NOT NULL,
      dedupe_key TEXT NOT NULL,
      person_id UUID,
      client_contact_id UUID,
      edro_user_id UUID,
      display_name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      whatsapp_jid TEXT,
      is_internal BOOLEAN NOT NULL DEFAULT false,
      is_organizer BOOLEAN NOT NULL DEFAULT false,
      is_attendee BOOLEAN NOT NULL DEFAULT true,
      is_invited BOOLEAN NOT NULL DEFAULT false,
      is_speaker BOOLEAN NOT NULL DEFAULT false,
      response_status TEXT,
      invited_via TEXT,
      source_type TEXT,
      source_ref_id TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      CONSTRAINT meeting_participants_meeting_dedupe_unique UNIQUE (meeting_id, dedupe_key)
    )
  `);

  await query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS analysis_payload JSONB`);
  await query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS analysis_input_context JSONB`);
  await query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS analysis_model TEXT`);
  await query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS prep_payload JSONB`);
  await query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS prep_generated_at TIMESTAMPTZ`);
  await query(`ALTER TABLE meetings ADD COLUMN IF NOT EXISTS prep_model TEXT`);
  await query(`ALTER TABLE meeting_actions ADD COLUMN IF NOT EXISTS metadata JSONB`);
  await query(`ALTER TABLE calendar_auto_joins ADD COLUMN IF NOT EXISTS organizer_name TEXT`).catch(() => {});

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

  // Persist raw transcript to client intelligence repository immediately —
  // analysis may fail, but the transcript must never be lost.
  persistTranscriptToClientIntelligence({
    meetingId: params.meetingId,
    tenantId:  params.tenantId,
    transcript: params.transcript,
    transcriptHash,
    provider:  params.provider,
  }).catch((err: any) => console.error('[meetingService] persistTranscript failed:', err?.message));
}

async function persistTranscriptToClientIntelligence(params: {
  meetingId: string;
  tenantId: string;
  transcript: string;
  transcriptHash: string;
  provider: string;
}): Promise<void> {
  const { rows } = await query<{
    client_id: string;
    title: string;
    platform: string | null;
    meeting_url: string | null;
    recorded_at: string | null;
    source: string | null;
    bot_id: string | null;
  }>(
    `SELECT client_id, title, platform, meeting_url, recorded_at, source, bot_id
       FROM meetings
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1`,
    [params.meetingId, params.tenantId],
  );
  const meeting = rows[0];
  if (!meeting) return;
  if (!meeting.client_id || isInternalClientId(meeting.client_id)) return;

  // Use a distinct hash so transcript-only and analyzed documents coexist.
  // When analysis completes, saveMeetingAnalysis will add an enriched document
  // with summary + intelligence under the "meeting:" prefix.
  const contentHash = hashText(`meeting_transcript:${params.meetingId}:${params.transcriptHash}`);
  const alreadyStored = await hasClientDocumentHash({
    tenantId: params.tenantId,
    clientId: meeting.client_id,
    contentHash,
  });
  if (alreadyStored) return;

  await insertClientDocument({
    tenantId:       params.tenantId,
    clientId:       meeting.client_id,
    sourceId:       params.meetingId,
    sourceType:     'meeting',
    platform:       meeting.platform ?? 'meeting',
    url:            meeting.meeting_url ?? null,
    rawUrl:         meeting.meeting_url ?? null,
    title:          meeting.title,
    contentText:    params.transcript,
    contentExcerpt: shortText(params.transcript, 400),
    language:       'pt-BR',
    publishedAt:    meeting.recorded_at ? new Date(meeting.recorded_at) : null,
    contentHash,
    metadata: {
      meeting_id:          params.meetingId,
      recorded_at:         meeting.recorded_at,
      source:              meeting.source,
      bot_id:              meeting.bot_id ?? null,
      transcript_provider: params.provider,
      transcript_only:     true, // analysis not yet complete
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
  const { rows: meetingRows } = await query<{
    analysis_version: number;
    client_id: string;
    title: string;
    platform: string | null;
    meeting_url: string | null;
    recorded_at: string | null;
    source: string | null;
    bot_id: string | null;
    transcript_provider: string | null;
  }>(
    `SELECT analysis_version, client_id, title, platform, meeting_url, recorded_at, source, bot_id, transcript_provider
       FROM meetings
      WHERE id = $1 AND tenant_id = $2
      LIMIT 1`,
    [meetingId, tenantId],
  );
  if (!meetingRows.length) throw new Error('meeting_not_found');

  const meetingRow = meetingRows[0];
  let analysisVersion = Number(meetingRow.analysis_version || 1);
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
  const normalizedIntelligence = normalizeIntelligence(analysis.intelligence, meetingRow.client_id);

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
      analysis_payload: {
        intelligence: normalizedIntelligence,
        action_hints: normalizedActions.map((action) => ({
          title: action.title,
          type: action.type,
          priority: action.priority,
          operation_lane: action.operation_lane ?? null,
          required_skill: action.required_skill ?? null,
          owner_hint: action.owner_hint ?? null,
          should_create_job: action.should_create_job ?? null,
          needs_approval: action.needs_approval ?? null,
          urgency_reason: action.urgency_reason ?? null,
        })),
      },
      analysis_input_context: analysis.context_snapshot ?? null,
      analysis_model: analysis.model ?? null,
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
        attention_level: normalizedIntelligence.attention_level,
        meeting_kind: normalizedIntelligence.meeting_kind,
        analysis_model: analysis.model ?? null,
      },
    },
  });

  for (const action of normalizedActions) {
    const hashes = buildActionHashes(action);
    await query(
      `INSERT INTO meeting_actions
         (meeting_id, tenant_id, client_id, type, title, description, responsible, deadline,
          priority, raw_excerpt, excerpt_hash, idempotency_key, metadata, confidence_score, analysis_version, updated_at)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8::date, $9, $10, $11, $12, $13::jsonb, $14, $15, now())
       ON CONFLICT (meeting_id, analysis_version, idempotency_key)
       DO UPDATE SET
         description = EXCLUDED.description,
         responsible = EXCLUDED.responsible,
         deadline = EXCLUDED.deadline,
         priority = EXCLUDED.priority,
         raw_excerpt = EXCLUDED.raw_excerpt,
         excerpt_hash = EXCLUDED.excerpt_hash,
         metadata = EXCLUDED.metadata,
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
        JSON.stringify({
          operation_lane: action.operation_lane ?? null,
          required_skill: action.required_skill ?? null,
          owner_hint: action.owner_hint ?? null,
          should_create_job: action.should_create_job ?? null,
          needs_approval: action.needs_approval ?? null,
          urgency_reason: action.urgency_reason ?? null,
        }),
        action.confidence_score ?? null,
        analysisVersion,
      ],
    );
  }

  await persistMeetingIntoClientIntelligence({
    meetingId,
    tenantId,
    clientId: meetingRow.client_id,
    meetingTitle: meetingRow.title,
    platform: meetingRow.platform,
    meetingUrl: meetingRow.meeting_url,
    recordedAt: meetingRow.recorded_at,
    source: meetingRow.source,
    botId: meetingRow.bot_id,
    transcriptProvider: options?.transcriptProvider ?? meetingRow.transcript_provider ?? null,
    transcript,
    transcriptHash,
    summary: analysis.summary,
    intelligence: normalizedIntelligence,
    actions: normalizedActions,
    analysisVersion,
  });

  // Non-blocking: generate pauta suggestions from newly created meeting actions
  if (meetingRow.client_id && !isInternalClientId(meetingRow.client_id) && normalizedActions.length > 0) {
    generatePautaSuggestionsFromMeetings({ client_id: meetingRow.client_id, tenant_id: tenantId }).catch(() => {});
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
            COALESCE(action_rows.actions, '[]'::json) AS actions,
            COALESCE(participant_rows.participants, '[]'::json) AS participants,
            COALESCE(participant_rows.participant_count, 0) AS participant_count,
            COALESCE(participant_rows.internal_participant_count, 0) AS internal_participant_count,
            COALESCE(participant_rows.external_participant_count, 0) AS external_participant_count,
            COALESCE(chat_rows.chat_messages, '[]'::json) AS chat_messages,
            COALESCE(chat_rows.chat_count, 0) AS chat_count
       FROM meetings m
       LEFT JOIN LATERAL (
         SELECT id, status, bot_id, last_error, attempt_count, scheduled_at
           FROM calendar_auto_joins
          WHERE meeting_id = m.id
          ORDER BY created_at DESC
          LIMIT 1
       ) caj ON true
       LEFT JOIN LATERAL (
         SELECT json_agg(ma.* ORDER BY ma.analysis_version DESC, ma.created_at) AS actions
           FROM meeting_actions ma
          WHERE ma.meeting_id = m.id
       ) action_rows ON true
       LEFT JOIN LATERAL (
         SELECT
           json_agg(
             json_build_object(
               'id',           mcm.id,
               'sender_name',  mcm.sender_name,
               'sender_email', mcm.sender_email,
               'is_host',      mcm.is_host,
               'message_text', mcm.message_text,
               'sent_at',      mcm.sent_at
             )
             ORDER BY mcm.sent_at ASC, mcm.created_at ASC
           ) FILTER (WHERE mcm.id IS NOT NULL) AS chat_messages,
           COUNT(mcm.id)::int AS chat_count
           FROM meeting_chat_messages mcm
          WHERE mcm.meeting_id = m.id
       ) chat_rows ON true
       LEFT JOIN LATERAL (
         SELECT
           json_agg(
             json_build_object(
               'id', mp.id,
               'person_id', mp.person_id,
               'client_contact_id', mp.client_contact_id,
               'edro_user_id', mp.edro_user_id,
               'display_name', mp.display_name,
               'email', mp.email,
               'phone', mp.phone,
               'whatsapp_jid', mp.whatsapp_jid,
               'is_internal', mp.is_internal,
               'is_organizer', mp.is_organizer,
               'is_attendee', mp.is_attendee,
               'is_invited', mp.is_invited,
               'is_speaker', mp.is_speaker,
               'response_status', mp.response_status,
               'invited_via', mp.invited_via,
               'source_type', mp.source_type,
               'source_ref_id', mp.source_ref_id,
               'metadata', mp.metadata
             )
             ORDER BY mp.is_organizer DESC, mp.is_internal DESC, mp.display_name ASC
           ) FILTER (WHERE mp.id IS NOT NULL) AS participants,
           COUNT(*)::int AS participant_count,
           COUNT(*) FILTER (WHERE mp.is_internal)::int AS internal_participant_count,
           COUNT(*) FILTER (WHERE NOT mp.is_internal)::int AS external_participant_count
          FROM meeting_participants mp
          WHERE mp.meeting_id = m.id
       ) participant_rows ON true
      WHERE m.id = $1 AND m.tenant_id = $2`,
    [meetingId, tenantId],
  );
  return rows[0] ?? null;
}

export async function listMeetings(tenantId: string, clientId: string, limit = 20) {
  await archiveStaleUncapturedMeetings(tenantId);
  const { rows } = await query(
    `SELECT m.*,
            COUNT(ma.id) FILTER (WHERE ma.status = 'pending')::int AS pending_actions,
            COUNT(ma.id)::int AS total_actions
       FROM meetings m
       LEFT JOIN meeting_actions ma ON ma.meeting_id = m.id
      WHERE m.tenant_id = $1 AND m.client_id = $2 AND m.status <> 'archived'
      GROUP BY m.id
      ORDER BY m.recorded_at DESC
      LIMIT $3`,
    [tenantId, clientId, limit],
  );
  return rows;
}

export async function archiveStaleUncapturedMeetings(tenantId: string): Promise<number> {
  const { rows } = await query<{
    id: string;
    client_id: string;
    title: string;
    status: string;
    recorded_at: string | null;
  }>(
    `SELECT m.id, m.client_id, m.title, m.status, m.recorded_at
       FROM meetings m
      WHERE m.tenant_id = $1
        AND m.status IN ('scheduled', 'bot_scheduled', 'joining', 'in_call', 'recorded', 'transcript_pending', 'analysis_pending', 'failed')
        AND m.bot_id IS NULL
        AND COALESCE(NULLIF(trim(m.transcript), ''), NULL) IS NULL
        AND COALESCE(NULLIF(trim(m.summary), ''), NULL) IS NULL
        AND COALESCE(m.last_processed_at, m.recorded_at) < (
          NOW()
          - (COALESCE(m.duration_secs, 3600) * INTERVAL '1 second')
          - INTERVAL '2 hours'
        )
      ORDER BY m.recorded_at ASC
      LIMIT 200`,
    [tenantId],
  );

  if (!rows.length) return 0;

  for (const meeting of rows) {
    await updateMeetingState({
      meetingId: meeting.id,
      tenantId,
      changes: {
        status: 'archived',
        failed_stage: 'bot_finalize',
        failed_reason: 'no_recording_captured',
        completed_at: new Date(),
        last_processed_at: new Date(),
      },
      event: {
        eventType: 'meeting.archived_without_recording',
        stage: 'bot_finalize',
        status: 'archived',
        message: 'Reunião passada sem gravação/transcript foi arquivada automaticamente.',
        actorType: 'system',
        actorId: 'meetingService',
        payload: {
          previous_status: meeting.status,
          recorded_at: meeting.recorded_at,
          archive_reason: 'no_recording_captured',
        },
      },
    });
  }

  return rows.length;
}

export async function getMeetingStatus(tenantId: string, meetingId: string) {
  const { rows } = await query(
    `SELECT
        m.*,
        COALESCE(action_stats.total_actions, 0) AS total_actions,
        COALESCE(action_stats.pending_actions, 0) AS pending_actions,
        COALESCE(action_stats.approved_actions, 0) AS approved_actions,
        COALESCE(action_stats.rejected_actions, 0) AS rejected_actions,
        COALESCE(participant_stats.participant_count, 0) AS participant_count,
        COALESCE(participant_stats.internal_participant_count, 0) AS internal_participant_count,
        COALESCE(participant_stats.external_participant_count, 0) AS external_participant_count,
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
         SELECT
           COUNT(*)::int AS participant_count,
           COUNT(*) FILTER (WHERE is_internal)::int AS internal_participant_count,
           COUNT(*) FILTER (WHERE NOT is_internal)::int AS external_participant_count
           FROM meeting_participants
          WHERE meeting_id = m.id
       ) participant_stats ON true
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

  const columnMap: Record<string, { column: string; cast?: string }> = {
    title: { column: 'title' },
    platform: { column: 'platform' },
    meeting_url: { column: 'meeting_url' },
    transcript: { column: 'transcript' },
    summary: { column: 'summary' },
    status: { column: 'status' },
    audio_key: { column: 'audio_key' },
    source: { column: 'source' },
    source_ref_id: { column: 'source_ref_id' },
    bot_provider: { column: 'bot_provider' },
    bot_id: { column: 'bot_id' },
    bot_status: { column: 'bot_status' },
    transcript_provider: { column: 'transcript_provider' },
    transcript_hash: { column: 'transcript_hash' },
    analysis_payload: { column: 'analysis_payload', cast: 'jsonb' },
    analysis_input_context: { column: 'analysis_input_context', cast: 'jsonb' },
    analysis_model: { column: 'analysis_model' },
    prep_payload: { column: 'prep_payload', cast: 'jsonb' },
    prep_generated_at: { column: 'prep_generated_at' },
    prep_model: { column: 'prep_model' },
    analysis_version: { column: 'analysis_version' },
    failed_stage: { column: 'failed_stage' },
    failed_reason: { column: 'failed_reason' },
    retry_count: { column: 'retry_count' },
    last_retry_at: { column: 'last_retry_at' },
    summary_sent_at: { column: 'summary_sent_at' },
    approved_at: { column: 'approved_at' },
    completed_at: { column: 'completed_at' },
    last_processed_at: { column: 'last_processed_at' },
    duration_secs: { column: 'duration_secs' },
    recorded_at: { column: 'recorded_at' },
    created_by: { column: 'created_by' },
    updated_at: { column: 'updated_at' },
  };

  const updates: string[] = [];
  const values: any[] = [];
  let index = 1;

  for (const [key, rawValue] of Object.entries(params.changes)) {
    const mapped = columnMap[key];
    if (!mapped) continue;
    updates.push(`${mapped.column} = $${index}${mapped.cast ? `::${mapped.cast}` : ''}`);
    values.push(mapped.cast === 'jsonb' && rawValue != null ? JSON.stringify(rawValue) : rawValue);
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

function normalizeOptionalText(value: unknown): string | null {
  if (value == null) return null;
  const normalized = String(value).trim();
  return normalized ? normalized : null;
}

function normalizeBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  return null;
}

function normalizeOperationLane(value: unknown): MeetingAction['operation_lane'] {
  const normalized = normalizeOptionalText(value);
  if (!normalized) return null;
  const lane = normalized.toLowerCase();
  if (['atendimento', 'operacao', 'criacao', 'midia', 'estrategia', 'cliente', 'comercial'].includes(lane)) {
    return lane as MeetingAction['operation_lane'];
  }
  return null;
}

function normalizeStringArray(value: unknown, limit = 8): string[] {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  for (const item of value) {
    const normalized = normalizeOptionalText(item);
    if (normalized) unique.add(normalized);
    if (unique.size >= limit) break;
  }
  return Array.from(unique);
}

function normalizeMeetingPrep(value: Partial<MeetingPrep> | null | undefined): MeetingPrep {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, any>;
  return {
    meeting_goal: normalizeOptionalText(raw.meeting_goal) ?? 'Alinhar a reunião com clareza e sair com próximos passos fechados.',
    opening_question: normalizeOptionalText(raw.opening_question) ?? 'Qual é a principal decisão que precisamos fechar hoje?',
    suggested_agenda: normalizeStringArray(raw.suggested_agenda, 8),
    agency_defense_points: normalizeStringArray(raw.agency_defense_points, 8),
    likely_client_pushbacks: normalizeStringArray(raw.likely_client_pushbacks, 8),
    materials_to_prepare: normalizeStringArray(raw.materials_to_prepare, 8),
    internal_alignment_notes: normalizeStringArray(raw.internal_alignment_notes, 8),
    red_flags: normalizeStringArray(raw.red_flags, 8),
    success_criteria: normalizeStringArray(raw.success_criteria, 8),
    recommended_positioning: normalizeOptionalText(raw.recommended_positioning) ?? 'Entrar com postura objetiva, consultiva e orientada a decisão.',
  };
}

function normalizeMeetingKind(value: unknown, clientId: string | null | undefined): MeetingIntelligence['meeting_kind'] {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  const fallback = isInternalClientId(clientId) ? 'internal_ops' : 'alignment';
  if (!normalized) return fallback;
  if (['client_status', 'client_briefing', 'client_review', 'internal_ops', 'commercial', 'alignment', 'other'].includes(normalized)) {
    return normalized as MeetingIntelligence['meeting_kind'];
  }
  return fallback;
}

function normalizeAttentionLevel(value: unknown): MeetingIntelligence['attention_level'] {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  if (normalized === 'critical' || normalized === 'high' || normalized === 'medium' || normalized === 'low') {
    return normalized;
  }
  return 'medium';
}

function normalizeClientTemperature(
  value: unknown,
  clientId: string | null | undefined,
): MeetingIntelligence['client_temperature'] {
  const normalized = normalizeOptionalText(value)?.toLowerCase();
  const fallback = isInternalClientId(clientId) ? 'internal' : 'neutral';
  if (!normalized) return fallback;
  if (['engaged', 'neutral', 'pressured', 'at_risk', 'blocked', 'internal'].includes(normalized)) {
    return normalized as MeetingIntelligence['client_temperature'];
  }
  return fallback;
}

function normalizeIntelligence(value: unknown, clientId: string | null | undefined): MeetingIntelligence {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, any>;
  return {
    meeting_kind: normalizeMeetingKind(raw.meeting_kind, clientId),
    attention_level: normalizeAttentionLevel(raw.attention_level),
    client_temperature: normalizeClientTemperature(raw.client_temperature, clientId),
    account_pulse: normalizeOptionalText(raw.account_pulse) ?? 'Leitura operacional ainda sem pulso claro.',
    recommended_next_step: normalizeOptionalText(raw.recommended_next_step) ?? 'Revisar a reunião e decidir a próxima ação.',
    owner_hint: normalizeOptionalText(raw.owner_hint),
    deadlines_cited: normalizeStringArray(raw.deadlines_cited, 6).map((entry) => normalizeDeadline(entry) ?? entry).slice(0, 6),
    decisions_taken: normalizeStringArray(raw.decisions_taken, 6),
    production_directives: normalizeStringArray(raw.production_directives, 8),
    blockers: normalizeStringArray(raw.blockers, 6),
    risks: normalizeStringArray(raw.risks, 6),
    opportunities: normalizeStringArray(raw.opportunities, 6),
    approvals_needed: normalizeStringArray(raw.approvals_needed, 6),
    follow_up_questions: normalizeStringArray(raw.follow_up_questions, 6),
    suggested_tags: normalizeStringArray(raw.suggested_tags, 8),
  };
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
    operation_lane: normalizeOperationLane(action.operation_lane),
    required_skill: normalizeOptionalText(action.required_skill),
    owner_hint: normalizeOptionalText(action.owner_hint),
    should_create_job: normalizeBoolean(action.should_create_job),
    needs_approval: normalizeBoolean(action.needs_approval),
    urgency_reason: normalizeOptionalText(action.urgency_reason),
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

async function persistMeetingIntoClientIntelligence(params: {
  meetingId: string;
  tenantId: string;
  clientId: string;
  meetingTitle: string;
  platform: string | null;
  meetingUrl: string | null;
  recordedAt: string | null;
  source: string | null;
  botId: string | null;
  transcriptProvider: string | null;
  transcript: string;
  transcriptHash: string;
  summary: string;
  intelligence: MeetingIntelligence;
  actions: MeetingAction[];
  analysisVersion: number;
}) {
  if (!params.clientId || isInternalClientId(params.clientId)) return;
  if (!params.transcript.trim() || !params.summary.trim()) return;

  const meetingHash = hashText(`meeting:${params.meetingId}:${params.transcriptHash}`);
  const alreadyStored = await hasClientDocumentHash({
    tenantId: params.tenantId,
    clientId: params.clientId,
    contentHash: meetingHash,
  });

  if (!alreadyStored) {
    await insertClientDocument({
      tenantId: params.tenantId,
      clientId: params.clientId,
      sourceId: params.meetingId,
      sourceType: 'meeting',
      platform: params.platform ?? 'meeting',
      url: params.meetingUrl ?? null,
      rawUrl: params.meetingUrl ?? null,
      title: params.meetingTitle,
      contentText: params.transcript,
      contentExcerpt: shortText(params.summary, 400),
      language: 'pt-BR',
      publishedAt: params.recordedAt ? new Date(params.recordedAt) : null,
      contentHash: meetingHash,
      metadata: {
        meeting_id: params.meetingId,
        recorded_at: params.recordedAt,
        source: params.source,
        bot_present: Boolean(params.botId || params.transcriptProvider === 'recall'),
        bot_id: params.botId ?? null,
        transcript_provider: params.transcriptProvider,
        attention_level: params.intelligence.attention_level,
        meeting_kind: params.intelligence.meeting_kind,
        action_count: params.actions.length,
        suggested_tags: params.intelligence.suggested_tags,
      },
    });
  }

  const period = `meeting:${params.meetingId}:v${params.analysisVersion}`;
  const { rows: existingInsightRows } = await query<{ id: string }>(
    `SELECT id
       FROM client_insights
      WHERE tenant_id = $1 AND client_id = $2 AND period = $3
      LIMIT 1`,
    [params.tenantId, params.clientId, period],
  );

  if (existingInsightRows[0]) return;

  await insertClientInsight({
    tenantId: params.tenantId,
    clientId: params.clientId,
    period,
    summary: {
      source: 'meeting_intelligence',
      meeting_id: params.meetingId,
      meeting_title: params.meetingTitle,
      recorded_at: params.recordedAt,
      platform: params.platform ?? 'meeting',
      transcript_provider: params.transcriptProvider,
      bot_present: Boolean(params.botId || params.transcriptProvider === 'recall'),
      summary_text: params.summary,
      attention_level: params.intelligence.attention_level,
      meeting_kind: params.intelligence.meeting_kind,
      client_temperature: params.intelligence.client_temperature,
      account_pulse: params.intelligence.account_pulse,
      recommended_next_step: params.intelligence.recommended_next_step,
      owner_hint: params.intelligence.owner_hint ?? null,
      deadlines_cited: params.intelligence.deadlines_cited,
      decisions_taken: params.intelligence.decisions_taken,
      production_directives: params.intelligence.production_directives,
      blockers: params.intelligence.blockers,
      risks: params.intelligence.risks,
      opportunities: params.intelligence.opportunities,
      approvals_needed: params.intelligence.approvals_needed,
      follow_up_questions: params.intelligence.follow_up_questions,
      suggested_tags: params.intelligence.suggested_tags,
      action_count: params.actions.length,
      actions: params.actions.slice(0, 12).map((action) => ({
        type: action.type,
        title: action.title,
        priority: action.priority,
        responsible: action.responsible ?? null,
        deadline: action.deadline ?? null,
        operation_lane: action.operation_lane ?? null,
        required_skill: action.required_skill ?? null,
        needs_approval: action.needs_approval ?? null,
        should_create_job: action.should_create_job ?? null,
      })),
      updated_at: new Date().toISOString(),
    },
  });
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

function shortText(value: string, limit: number) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim();
  if (normalized.length <= limit) return normalized;
  return `${normalized.slice(0, Math.max(0, limit - 1)).trim()}…`;
}
