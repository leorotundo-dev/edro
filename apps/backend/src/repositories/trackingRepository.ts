import { query } from '../db';

// =====================================================
// TYPES
// =====================================================

export interface TrackingEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_data: Record<string, any>;
  timestamp: Date;
  session_id?: string;
  created_at: Date;
}

export interface CognitiveState {
  id: string;
  user_id: string;
  session_id: string;
  foco?: number; // 0-100
  energia?: number; // 0-100
  velocidade?: number; // wpm
  tempo_por_drop?: number; // segundos
  hesitacao?: boolean;
  abandono_drop?: boolean;
  retorno_drop?: boolean;
  nec?: number; // Nível de Energia Cognitiva
  nca?: number; // Nível de Carga de Atenção
  timestamp: Date;
  created_at: Date;
}

export interface EmotionalState {
  id: string;
  user_id: string;
  session_id: string;
  humor_auto_reportado?: number; // 1-5
  frustracao_inferida?: boolean;
  ansiedade_inferida?: boolean;
  motivacao_inferida?: boolean;
  contexto?: string;
  timestamp: Date;
  created_at: Date;
}

export interface BehavioralState {
  id: string;
  user_id: string;
  session_id: string;
  hora_do_dia?: number; // 0-23
  duracao_sessao?: number; // minutos
  pausas?: number;
  ritmo_semanal?: number; // dias/semana
  timestamp: Date;
  created_at: Date;
}

export interface TrackingSession {
  id: string;
  user_id: string;
  started_at: Date;
  ended_at?: Date;
  duration_minutes?: number;
  drops_completed?: number;
  questions_answered?: number;
  avg_nec?: number;
  avg_nca?: number;
  created_at: Date;
}

export interface CognitiveStateAggregated {
  id: string;
  user_id: string;
  date: Date;
  avg_foco?: number;
  avg_energia?: number;
  avg_nec?: number;
  avg_nca?: number;
  total_sessions?: number;
  total_drops?: number;
  total_minutes?: number;
  created_at: Date;
  updated_at: Date;
}

export interface EmotionalStateAggregated {
  id: string;
  user_id: string;
  date: Date;
  frustracao_count?: number;
  ansiedade_count?: number;
  motivacao_alta_count?: number;
  avg_humor?: number;
  created_at: Date;
  updated_at: Date;
}

// =====================================================
// EVENTS
// =====================================================

export async function trackEvent(data: {
  user_id: string;
  event_type: string;
  event_data?: Record<string, any>;
  session_id?: string;
}): Promise<TrackingEvent> {
  const { rows } = await query<TrackingEvent>(
    `
      INSERT INTO tracking_events (user_id, event_type, event_data, session_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
    [data.user_id, data.event_type, JSON.stringify(data.event_data || {}), data.session_id]
  );
  return rows[0];
}

export async function getRecentEvents(userId: string, limit: number = 50): Promise<TrackingEvent[]> {
  const { rows } = await query<TrackingEvent>(
    `
      SELECT * FROM tracking_events
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT $2
    `,
    [userId, limit]
  );
  return rows;
}

// =====================================================
// COGNITIVE STATE
// =====================================================

export async function saveCognitiveState(data: {
  user_id: string;
  session_id: string;
  foco?: number;
  energia?: number;
  velocidade?: number;
  tempo_por_drop?: number;
  hesitacao?: boolean;
  abandono_drop?: boolean;
  retorno_drop?: boolean;
}): Promise<CognitiveState> {
  // Calcular NEC e NCA
  const nec = data.foco && data.energia ? (data.foco + data.energia) / 2 : null;
  const nca = data.velocidade && data.tempo_por_drop 
    ? data.velocidade / (data.tempo_por_drop / 60) // normalizar para wpm
    : null;

  const { rows } = await query<CognitiveState>(
    `
      INSERT INTO tracking_cognitive 
        (user_id, session_id, foco, energia, velocidade, tempo_por_drop, 
         hesitacao, abandono_drop, retorno_drop, nec, nca)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `,
    [
      data.user_id,
      data.session_id,
      data.foco,
      data.energia,
      data.velocidade,
      data.tempo_por_drop,
      data.hesitacao,
      data.abandono_drop,
      data.retorno_drop,
      nec,
      nca,
    ]
  );
  return rows[0];
}

export async function getCurrentCognitiveState(userId: string): Promise<CognitiveState | null> {
  const { rows } = await query<CognitiveState>(
    `
      SELECT * FROM tracking_cognitive
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] || null;
}

export async function getCognitiveStatesBySession(sessionId: string): Promise<CognitiveState[]> {
  const { rows } = await query<CognitiveState>(
    `
      SELECT * FROM tracking_cognitive
      WHERE session_id = $1
      ORDER BY timestamp ASC
    `,
    [sessionId]
  );
  return rows;
}

// =====================================================
// EMOTIONAL STATE
// =====================================================

export async function saveEmotionalState(data: {
  user_id: string;
  session_id: string;
  humor_auto_reportado?: number;
  frustracao_inferida?: boolean;
  ansiedade_inferida?: boolean;
  motivacao_inferida?: boolean;
  contexto?: string;
}): Promise<EmotionalState> {
  const { rows } = await query<EmotionalState>(
    `
      INSERT INTO tracking_emotional 
        (user_id, session_id, humor_auto_reportado, frustracao_inferida, 
         ansiedade_inferida, motivacao_inferida, contexto)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
    [
      data.user_id,
      data.session_id,
      data.humor_auto_reportado,
      data.frustracao_inferida,
      data.ansiedade_inferida,
      data.motivacao_inferida,
      data.contexto,
    ]
  );
  return rows[0];
}

export async function getCurrentEmotionalState(userId: string): Promise<EmotionalState | null> {
  const { rows } = await query<EmotionalState>(
    `
      SELECT * FROM tracking_emotional
      WHERE user_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] || null;
}

// =====================================================
// BEHAVIORAL STATE
// =====================================================

export async function saveBehavioralState(data: {
  user_id: string;
  session_id: string;
  hora_do_dia?: number;
  duracao_sessao?: number;
  pausas?: number;
  ritmo_semanal?: number;
}): Promise<BehavioralState> {
  const { rows } = await query<BehavioralState>(
    `
      INSERT INTO tracking_behavioral 
        (user_id, session_id, hora_do_dia, duracao_sessao, pausas, ritmo_semanal)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
    [
      data.user_id,
      data.session_id,
      data.hora_do_dia,
      data.duracao_sessao,
      data.pausas,
      data.ritmo_semanal,
    ]
  );
  return rows[0];
}

// =====================================================
// SESSIONS
// =====================================================

export async function createSession(userId: string): Promise<TrackingSession> {
  const { rows } = await query<TrackingSession>(
    `
      INSERT INTO tracking_sessions (user_id)
      VALUES ($1)
      RETURNING *
    `,
    [userId]
  );
  return rows[0];
}

export async function endSession(sessionId: string, data: {
  drops_completed?: number;
  questions_answered?: number;
}): Promise<TrackingSession> {
  // Calcular duração e médias
  const { rows: sessionRows } = await query<TrackingSession>(
    'SELECT * FROM tracking_sessions WHERE id = $1',
    [sessionId]
  );
  const session = sessionRows[0];
  if (!session) throw new Error('Session not found');

  const duration_minutes = Math.floor((Date.now() - session.started_at.getTime()) / 1000 / 60);

  // Calcular médias de NEC e NCA da sessão
  const { rows: cogRows } = await query<{ avg_nec: number; avg_nca: number }>(
    `
      SELECT AVG(nec) as avg_nec, AVG(nca) as avg_nca
      FROM tracking_cognitive
      WHERE session_id = $1
    `,
    [sessionId]
  );
  const avg_nec = cogRows[0]?.avg_nec;
  const avg_nca = cogRows[0]?.avg_nca;

  const { rows } = await query<TrackingSession>(
    `
      UPDATE tracking_sessions
      SET ended_at = NOW(),
          duration_minutes = $2,
          drops_completed = $3,
          questions_answered = $4,
          avg_nec = $5,
          avg_nca = $6
      WHERE id = $1
      RETURNING *
    `,
    [sessionId, duration_minutes, data.drops_completed, data.questions_answered, avg_nec, avg_nca]
  );
  return rows[0];
}

export async function getActiveSession(userId: string): Promise<TrackingSession | null> {
  const { rows } = await query<TrackingSession>(
    `
      SELECT * FROM tracking_sessions
      WHERE user_id = $1 AND ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `,
    [userId]
  );
  return rows[0] || null;
}

export async function getUserSessions(userId: string, limit: number = 10): Promise<TrackingSession[]> {
  const { rows } = await query<TrackingSession>(
    `
      SELECT * FROM tracking_sessions
      WHERE user_id = $1
      ORDER BY started_at DESC
      LIMIT $2
    `,
    [userId, limit]
  );
  return rows;
}

// =====================================================
// AGGREGATED STATES (para dashboards)
// =====================================================

export async function getCognitiveStateAggregated(userId: string, date: Date): Promise<CognitiveStateAggregated | null> {
  const { rows } = await query<CognitiveStateAggregated>(
    `
      SELECT * FROM cognitive_states
      WHERE user_id = $1 AND date = $2
      LIMIT 1
    `,
    [userId, date]
  );
  return rows[0] || null;
}

export async function getEmotionalStateAggregated(userId: string, date: Date): Promise<EmotionalStateAggregated | null> {
  const { rows } = await query<EmotionalStateAggregated>(
    `
      SELECT * FROM emotional_states
      WHERE user_id = $1 AND date = $2
      LIMIT 1
    `,
    [userId, date]
  );
  return rows[0] || null;
}

// =====================================================
// HELPERS - Calcular Estado Atual do Usuário
// =====================================================

export async function calculateCurrentState(userId: string): Promise<{
  cognitive: CognitiveState | null;
  emotional: EmotionalState | null;
  nec: number | null;
  nca: number | null;
}> {
  const cognitive = await getCurrentCognitiveState(userId);
  const emotional = await getCurrentEmotionalState(userId);

  return {
    cognitive,
    emotional,
    nec: cognitive?.nec || null,
    nca: cognitive?.nca || null,
  };
}
