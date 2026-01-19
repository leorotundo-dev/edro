-- 0004_tracking_system.sql
-- Sistema de Tracking Cognitivo/Emocional (Cap. 39)
-- CRÍTICO: Desbloqueia 10+ sistemas

-- =====================================================
-- 1. TRACKING DE EVENTOS (Telemetria em tempo real)
-- =====================================================
CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(100) NOT NULL, -- drop_started, drop_completed, question_answered, etc
  event_data JSONB NOT NULL DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_events_user ON tracking_events(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_events_type ON tracking_events(event_type);
CREATE INDEX IF NOT EXISTS idx_tracking_events_session ON tracking_events(session_id);

-- =====================================================
-- 2. TRACKING COGNITIVO (15 sinais essenciais)
-- =====================================================
CREATE TABLE IF NOT EXISTS tracking_cognitive (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  
  -- Sinais Cognitivos (0-100)
  foco INTEGER CHECK (foco >= 0 AND foco <= 100),
  energia INTEGER CHECK (energia >= 0 AND energia <= 100),
  velocidade INTEGER, -- palavras por minuto (wpm)
  tempo_por_drop INTEGER, -- segundos
  hesitacao BOOLEAN DEFAULT false,
  abandono_drop BOOLEAN DEFAULT false,
  retorno_drop BOOLEAN DEFAULT false,
  
  -- Métricas Derivadas
  nec NUMERIC(5,2), -- Nível de Energia Cognitiva = (foco + energia) / 2
  nca NUMERIC(5,2), -- Nível de Carga de Atenção = velocidade / tempo_medio
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_cognitive_user ON tracking_cognitive(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_cognitive_session ON tracking_cognitive(session_id);

-- =====================================================
-- 3. TRACKING EMOCIONAL (4 estados inferidos)
-- =====================================================
CREATE TABLE IF NOT EXISTS tracking_emotional (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  
  -- Estados Emocionais
  humor_auto_reportado INTEGER CHECK (humor_auto_reportado >= 1 AND humor_auto_reportado <= 5),
  frustracao_inferida BOOLEAN DEFAULT false,
  ansiedade_inferida BOOLEAN DEFAULT false,
  motivacao_inferida BOOLEAN DEFAULT false,
  
  -- Contexto
  contexto TEXT,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_emotional_user ON tracking_emotional(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_emotional_session ON tracking_emotional(session_id);

-- =====================================================
-- 4. TRACKING COMPORTAMENTAL (4 padrões)
-- =====================================================
CREATE TABLE IF NOT EXISTS tracking_behavioral (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL,
  
  -- Padrões Comportamentais
  hora_do_dia INTEGER CHECK (hora_do_dia >= 0 AND hora_do_dia <= 23),
  duracao_sessao INTEGER, -- minutos
  pausas INTEGER DEFAULT 0, -- count
  ritmo_semanal NUMERIC(3,1), -- dias/semana
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_behavioral_user ON tracking_behavioral(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tracking_behavioral_session ON tracking_behavioral(session_id);

-- =====================================================
-- 5. SESSÕES DE ESTUDO
-- =====================================================
CREATE TABLE IF NOT EXISTS tracking_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  drops_completed INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  avg_nec NUMERIC(5,2),
  avg_nca NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tracking_sessions_user ON tracking_sessions(user_id, started_at DESC);

-- =====================================================
-- 6. ESTADOS COGNITIVOS AGREGADOS (para dashboards)
-- =====================================================
CREATE TABLE IF NOT EXISTS cognitive_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Médias do dia
  avg_foco NUMERIC(5,2),
  avg_energia NUMERIC(5,2),
  avg_nec NUMERIC(5,2),
  avg_nca NUMERIC(5,2),
  
  -- Contadores
  total_sessions INTEGER DEFAULT 0,
  total_drops INTEGER DEFAULT 0,
  total_minutes INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_cognitive_states_user ON cognitive_states(user_id, date DESC);

-- =====================================================
-- 7. ESTADOS EMOCIONAIS AGREGADOS (para dashboards)
-- =====================================================
CREATE TABLE IF NOT EXISTS emotional_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Contadores
  frustracao_count INTEGER DEFAULT 0,
  ansiedade_count INTEGER DEFAULT 0,
  motivacao_alta_count INTEGER DEFAULT 0,
  avg_humor NUMERIC(3,1),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_emotional_states_user ON emotional_states(user_id, date DESC);
