-- 0007_srs_progress_mnemonicos.sql
-- SRS expandido (Cap. 17), Progress (Cap. 40), Mnemônicos (Cap. 47)

-- =====================================================
-- PARTE 1: SRS SYSTEM EXPANDIDO (SRS-AI™)
-- =====================================================

-- Expandir tabela srs_cards existente com 7 variáveis
ALTER TABLE srs_cards
ADD COLUMN IF NOT EXISTS historico_acertos JSONB DEFAULT '[]', -- array de % de acertos
ADD COLUMN IF NOT EXISTS dificuldade_percebida INTEGER CHECK (dificuldade_percebida >= 1 AND dificuldade_percebida <= 5),
ADD COLUMN IF NOT EXISTS contexto_erro JSONB DEFAULT '[]', -- tags de contexto
ADD COLUMN IF NOT EXISTS estado_cognitivo_ultima_revisao NUMERIC(5,2); -- NEC no momento

-- 1. MAPA SRS (integração com conteúdo)
CREATE TABLE IF NOT EXISTS srs_card_content_map (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES srs_cards(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL, -- 'drop', 'questao', 'mnemonico'
  content_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (card_id, content_type, content_id)
);

CREATE INDEX IF NOT EXISTS idx_srs_card_content_map_card ON srs_card_content_map(card_id);

-- 2. INTERVALO PERSONALIZADO (por usuário)
CREATE TABLE IF NOT EXISTS srs_user_intervals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subtopico VARCHAR(255) NOT NULL,
  
  -- Multiplicadores Personalizados
  interval_multiplier NUMERIC(3,2) DEFAULT 1.0,
  ease_multiplier NUMERIC(3,2) DEFAULT 1.0,
  
  -- Baseado em performance
  avg_retention NUMERIC(5,2),
  avg_time_per_review INTEGER, -- segundos
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subtopico)
);

CREATE INDEX IF NOT EXISTS idx_srs_user_intervals_user ON srs_user_intervals(user_id);

-- =====================================================
-- PARTE 2: SISTEMA DE PROGRESS & MASTERY (Cap. 40)
-- =====================================================

-- 1. PROGRESS DIÁRIO
CREATE TABLE IF NOT EXISTS progress_diario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Métricas do Dia
  drops_completados INTEGER DEFAULT 0,
  questoes_respondidas INTEGER DEFAULT 0,
  questoes_corretas INTEGER DEFAULT 0,
  taxa_acerto NUMERIC(5,2),
  tempo_estudado_minutos INTEGER DEFAULT 0,
  srs_revisoes INTEGER DEFAULT 0,
  
  -- XP & Gamificação
  xp_ganho INTEGER DEFAULT 0,
  nivel INTEGER DEFAULT 1,
  streak INTEGER DEFAULT 0,
  
  -- Estados Médios
  avg_nec NUMERIC(5,2),
  avg_nca NUMERIC(5,2),
  avg_humor NUMERIC(3,1),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_progress_diario_user ON progress_diario(user_id, date DESC);

-- 2. PROGRESS SEMANAL
CREATE TABLE IF NOT EXISTS progress_semanal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL, -- segunda-feira
  
  -- Métricas da Semana
  total_drops INTEGER DEFAULT 0,
  total_questoes INTEGER DEFAULT 0,
  taxa_acerto NUMERIC(5,2),
  tempo_total_minutos INTEGER DEFAULT 0,
  dias_estudados INTEGER DEFAULT 0,
  
  -- Evolução
  evolucao_vs_semana_anterior NUMERIC(5,2), -- %
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

CREATE INDEX IF NOT EXISTS idx_progress_semanal_user ON progress_semanal(user_id, week_start DESC);

-- 3. PROGRESS MENSAL
CREATE TABLE IF NOT EXISTS progress_mensal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- primeiro dia do mês
  
  -- Métricas do Mês
  total_drops INTEGER DEFAULT 0,
  total_questoes INTEGER DEFAULT 0,
  taxa_acerto NUMERIC(5,2),
  tempo_total_minutos INTEGER DEFAULT 0,
  dias_estudados INTEGER DEFAULT 0,
  
  -- Evolução
  evolucao_vs_mes_anterior NUMERIC(5,2), -- %
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, month)
);

CREATE INDEX IF NOT EXISTS idx_progress_mensal_user ON progress_mensal(user_id, month DESC);

-- 4. MASTERY POR SUBTÓPICO
CREATE TABLE IF NOT EXISTS mastery_subtopicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subtopico VARCHAR(255) NOT NULL,
  disciplina_id UUID REFERENCES disciplines(id) ON DELETE SET NULL,
  
  -- Mastery Score (0-100%)
  mastery_score NUMERIC(5,2) DEFAULT 0,
  
  -- Componentes do Score
  taxa_acerto NUMERIC(5,2),
  retencao_srs NUMERIC(5,2),
  velocidade_resposta NUMERIC(5,2),
  consistencia NUMERIC(5,2),
  
  -- Status
  nivel VARCHAR(50), -- 'iniciante', 'intermediario', 'avancado', 'expert'
  
  -- Histórico
  tentativas INTEGER DEFAULT 0,
  acertos INTEGER DEFAULT 0,
  ultima_tentativa TIMESTAMPTZ,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, subtopico)
);

CREATE INDEX IF NOT EXISTS idx_mastery_subtopicos_user ON mastery_subtopicos(user_id);
CREATE INDEX IF NOT EXISTS idx_mastery_subtopicos_score ON mastery_subtopicos(mastery_score DESC);

-- 5. EVOLUÇÃO GERAL (timeline)
CREATE TABLE IF NOT EXISTS progress_evolucao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Snapshot de Evolução
  snapshot_type VARCHAR(50), -- 'diario', 'semanal', 'mensal', 'milestone'
  
  -- Métricas no Momento
  total_drops_ate_agora INTEGER DEFAULT 0,
  total_questoes_ate_agora INTEGER DEFAULT 0,
  taxa_acerto_geral NUMERIC(5,2),
  mastery_score_medio NUMERIC(5,2),
  nivel INTEGER DEFAULT 1,
  xp_total INTEGER DEFAULT 0,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_progress_evolucao_user ON progress_evolucao(user_id, timestamp DESC);

-- =====================================================
-- PARTE 3: SISTEMA DE MNEMÔNICOS (Cap. 47)
-- =====================================================

-- 1. MNEMÔNICOS BASE
CREATE TABLE IF NOT EXISTS mnemonicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Conteúdo
  tecnica VARCHAR(50) NOT NULL, -- 'acronimo', 'historia', 'imagem', 'substituicao', '1-3-1', 'associacao_absurda', 'emocao', 'turbo'
  texto_principal TEXT NOT NULL,
  versoes_alternativas JSONB DEFAULT '[]',
  explicacao TEXT,
  
  -- Classificação
  disciplina_id UUID REFERENCES disciplines(id) ON DELETE SET NULL,
  subtopico VARCHAR(255),
  banca VARCHAR(100),
  nivel_dificuldade INTEGER CHECK (nivel_dificuldade >= 1 AND nivel_dificuldade <= 5),
  
  -- Personalização
  estilo_cognitivo VARCHAR(50), -- 'visual', 'narrativo', 'logico', 'intuitivo', 'auditivo', 'rapido', 'profundo'
  emocao_ativada VARCHAR(50),
  
  -- Eficácia
  forca_memoria NUMERIC(3,2) CHECK (forca_memoria >= 0 AND forca_memoria <= 1),
  
  -- Autoria
  criado_por VARCHAR(50) DEFAULT 'IA', -- 'IA' ou 'Humano' ou 'Usuario'
  versao VARCHAR(20) DEFAULT 'v1.0',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mnemonicos_disciplina ON mnemonicos(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_mnemonicos_subtopico ON mnemonicos(subtopico);
CREATE INDEX IF NOT EXISTS idx_mnemonicos_tecnica ON mnemonicos(tecnica);

-- 2. MNEMÔNICOS DO USUÁRIO (biblioteca pessoal)
CREATE TABLE IF NOT EXISTS mnemonicos_usuario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mnemonico_id UUID NOT NULL REFERENCES mnemonicos(id) ON DELETE CASCADE,
  
  -- Relação
  favorito BOOLEAN DEFAULT false,
  criado_por_usuario BOOLEAN DEFAULT false,
  
  -- Uso
  vezes_usado INTEGER DEFAULT 0,
  ultima_vez_usado TIMESTAMPTZ,
  funciona_bem BOOLEAN, -- feedback do usuário
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, mnemonico_id)
);

CREATE INDEX IF NOT EXISTS idx_mnemonicos_usuario_user ON mnemonicos_usuario(user_id);
CREATE INDEX IF NOT EXISTS idx_mnemonicos_usuario_favorito ON mnemonicos_usuario(user_id, favorito);

-- 3. VERSÕES DE MNEMÔNICOS (evolução)
CREATE TABLE IF NOT EXISTS mnemonicos_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mnemonico_id UUID NOT NULL REFERENCES mnemonicos(id) ON DELETE CASCADE,
  versao VARCHAR(20) NOT NULL,
  motivo TEXT,
  alteracoes JSONB DEFAULT '{}',
  ia_model VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mnemonicos_versions_mnemonico ON mnemonicos_versions(mnemonico_id);

-- 4. MAPA DE MNEMÔNICOS PARA SRS
CREATE TABLE IF NOT EXISTS mnemonicos_srs_map (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mnemonico_id UUID NOT NULL REFERENCES mnemonicos(id) ON DELETE CASCADE,
  srs_card_id UUID NOT NULL REFERENCES srs_cards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mnemonico_id, srs_card_id)
);

CREATE INDEX IF NOT EXISTS idx_mnemonicos_srs_map_mnemonico ON mnemonicos_srs_map(mnemonico_id);
CREATE INDEX IF NOT EXISTS idx_mnemonicos_srs_map_card ON mnemonicos_srs_map(srs_card_id);

-- 5. TRACKING DE MNEMÔNICOS (eficácia)
CREATE TABLE IF NOT EXISTS mnemonicos_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mnemonico_id UUID NOT NULL REFERENCES mnemonicos(id) ON DELETE CASCADE,
  
  -- Eficácia Medida
  ajudou_lembrar BOOLEAN,
  tempo_para_lembrar INTEGER, -- segundos
  
  -- Contexto
  contexto VARCHAR(255), -- 'srs_review', 'questao', 'simulado'
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mnemonicos_tracking_user ON mnemonicos_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_mnemonicos_tracking_mnemonico ON mnemonicos_tracking(mnemonico_id);

-- 6. ÍNDICE POR DISCIPLINA/BANCA
CREATE TABLE IF NOT EXISTS mnemonicos_disciplina (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mnemonico_id UUID NOT NULL REFERENCES mnemonicos(id) ON DELETE CASCADE,
  disciplina_id UUID NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mnemonico_id, disciplina_id)
);

CREATE TABLE IF NOT EXISTS mnemonicos_banca (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  mnemonico_id UUID NOT NULL REFERENCES mnemonicos(id) ON DELETE CASCADE,
  banca VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mnemonico_id, banca)
);

CREATE INDEX IF NOT EXISTS idx_mnemonicos_disciplina_mnemonico ON mnemonicos_disciplina(mnemonico_id);
CREATE INDEX IF NOT EXISTS idx_mnemonicos_disciplina_disciplina ON mnemonicos_disciplina(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_mnemonicos_banca_mnemonico ON mnemonicos_banca(mnemonico_id);
CREATE INDEX IF NOT EXISTS idx_mnemonicos_banca_banca ON mnemonicos_banca(banca);
