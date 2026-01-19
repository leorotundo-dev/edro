-- 0005_recco_engine.sql
-- ReccoEngine V3 - Sistema de Recomendação Integral (Cap. 44)
-- Motor de decisão: O QUE, QUANDO, COMO, QUANTO estudar

-- =====================================================
-- 1. INPUTS DO MOTOR (100+ variáveis)
-- =====================================================
CREATE TABLE IF NOT EXISTS recco_inputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Desempenho
  acertos INTEGER DEFAULT 0,
  erros INTEGER DEFAULT 0,
  taxa_acerto NUMERIC(5,2),
  dificuldade_percebida NUMERIC(3,1),
  tempo_por_drop INTEGER,
  
  -- SRS
  retencao_srs NUMERIC(5,2),
  cards_pending INTEGER DEFAULT 0,
  cards_overdue INTEGER DEFAULT 0,
  
  -- Banca
  desempenho_por_banca JSONB DEFAULT '{}',
  estilo_banca VARCHAR(50),
  
  -- Edital
  tempo_ate_prova INTEGER, -- dias
  topicos_cobertos INTEGER DEFAULT 0,
  topicos_faltantes INTEGER DEFAULT 0,
  
  -- Estado Cognitivo/Emocional
  humor INTEGER,
  energia INTEGER,
  foco INTEGER,
  distracao BOOLEAN DEFAULT false,
  saturacao BOOLEAN DEFAULT false,
  velocidade_cognitiva INTEGER,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recco_inputs_user ON recco_inputs(user_id, timestamp DESC);

-- =====================================================
-- 2. ESTADOS DO MOTOR (diagnóstico)
-- =====================================================
CREATE TABLE IF NOT EXISTS recco_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Estados Calculados
  estado_cognitivo VARCHAR(50), -- 'alto', 'medio', 'baixo', 'saturado'
  estado_emocional VARCHAR(50), -- 'motivado', 'ansioso', 'frustrado', 'neutro'
  estado_pedagogico VARCHAR(50), -- 'avancado', 'medio', 'iniciante', 'travado'
  
  -- Probabilidades
  prob_acerto NUMERIC(5,2),
  prob_retencao NUMERIC(5,2),
  prob_saturacao NUMERIC(5,2),
  
  -- Tempo Ótimo
  tempo_otimo_estudo INTEGER, -- minutos
  conteudo_ideal VARCHAR(255),
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recco_states_user ON recco_states(user_id, timestamp DESC);

-- =====================================================
-- 3. PRIORIZAÇÃO (o que é mais importante)
-- =====================================================
CREATE TABLE IF NOT EXISTS recco_prioridades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Prioridades
  urgencia_edital INTEGER CHECK (urgencia_edital >= 1 AND urgencia_edital <= 10),
  peso_banca INTEGER CHECK (peso_banca >= 1 AND peso_banca <= 10),
  proximidade_prova INTEGER CHECK (proximidade_prova >= 1 AND proximidade_prova <= 10),
  fraquezas_criticas INTEGER CHECK (fraquezas_criticas >= 1 AND fraquezas_criticas <= 10),
  temas_alta_probabilidade INTEGER CHECK (temas_alta_probabilidade >= 1 AND temas_alta_probabilidade <= 10),
  lacunas_memoria INTEGER CHECK (lacunas_memoria >= 1 AND lacunas_memoria <= 10),
  
  -- Lista Ordenada (JSON)
  lista_priorizada JSONB DEFAULT '[]',
  -- Exemplo: [
  --   { "action": "Estudar Regência", "score": 95, "reason": "erro recorrente" },
  --   { "action": "Revisar Pronomes", "score": 85, "reason": "retenção baixa" }
  -- ]
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recco_prioridades_user ON recco_prioridades(user_id, timestamp DESC);

-- =====================================================
-- 4. SELEÇÃO DE CONTEÚDO (o que entregar)
-- =====================================================
CREATE TABLE IF NOT EXISTS recco_selecao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Conteúdo Selecionado
  drops_selecionados JSONB DEFAULT '[]', -- [{ drop_id, score, reason }]
  blocos_selecionados JSONB DEFAULT '[]',
  questoes_selecionadas JSONB DEFAULT '[]',
  revisoes_srs JSONB DEFAULT '[]',
  simulados JSONB DEFAULT '[]',
  mnemonicos JSONB DEFAULT '[]',
  
  -- Trilha do Dia Final
  trilha_do_dia JSONB DEFAULT '{}',
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recco_selecao_user ON recco_selecao(user_id, timestamp DESC);

-- =====================================================
-- 5. SEQUENCIAMENTO (ordem pedagógica)
-- =====================================================
CREATE TABLE IF NOT EXISTS recco_sequencia (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Sequência Final
  sequencia JSONB DEFAULT '[]',
  -- Exemplo: [
  --   { "type": "drop", "id": "uuid", "order": 1, "reason": "aquecimento" },
  --   { "type": "question", "id": "uuid", "order": 2, "reason": "fixação" }
  -- ]
  
  -- Curvas Aplicadas
  curva_dificuldade VARCHAR(50), -- 'progressiva', 'inversa', 'plana'
  curva_cognitiva VARCHAR(50),
  curva_emocional VARCHAR(50),
  curva_foco VARCHAR(50),
  curva_energia VARCHAR(50),
  curva_pedagogica VARCHAR(50),
  curva_banca VARCHAR(50),
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recco_sequencia_user ON recco_sequencia(user_id, timestamp DESC);

-- =====================================================
-- 6. REFORÇO (após erros/fraquezas)
-- =====================================================
CREATE TABLE IF NOT EXISTS recco_reforco (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subtopico_id UUID,
  
  -- Reforços Inseridos
  drops_reforco JSONB DEFAULT '[]',
  mnemonicos_reforco JSONB DEFAULT '[]',
  questoes_fixacao JSONB DEFAULT '[]',
  ajustes_srs JSONB DEFAULT '{}',
  trilhas_alternativas JSONB DEFAULT '[]',
  
  -- Motivo
  motivo VARCHAR(255), -- 'erros repetidos', 'queda retenção', etc
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recco_reforco_user ON recco_reforco(user_id);
CREATE INDEX IF NOT EXISTS idx_recco_reforco_subtopico ON recco_reforco(subtopico_id);

-- =====================================================
-- 7. FEEDBACK DO MOTOR (eficácia)
-- =====================================================
CREATE TABLE IF NOT EXISTS recco_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recco_id UUID, -- referência a recco_selecao ou recco_sequencia
  
  -- Feedback
  aluno_completou BOOLEAN DEFAULT false,
  aluno_acertou BOOLEAN,
  aluno_satisfeito BOOLEAN,
  tempo_real INTEGER, -- minutos reais gastos
  tempo_previsto INTEGER, -- minutos previstos
  
  -- Aprendizado do Motor
  ajuste_sugerido TEXT,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recco_feedback_user ON recco_feedback(user_id, timestamp DESC);

-- =====================================================
-- 8. VERSÕES DO MOTOR (A/B testing, evolução)
-- =====================================================
CREATE TABLE IF NOT EXISTS recco_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version VARCHAR(50) NOT NULL UNIQUE, -- 'v3.0', 'v3.1', etc
  active BOOLEAN DEFAULT false,
  
  -- Configurações
  config JSONB DEFAULT '{}',
  weights JSONB DEFAULT '{}', -- pesos dos critérios
  
  -- Performance
  avg_satisfaction NUMERIC(3,1),
  avg_completion_rate NUMERIC(5,2),
  total_uses INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 9. PREDIÇÕES (para análise futura)
-- =====================================================
CREATE TABLE IF NOT EXISTS recco_predictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Predições
  prob_aprovacao NUMERIC(5,2),
  prob_desistencia NUMERIC(5,2),
  dias_ate_pronto INTEGER,
  topicos_fracos_previstos JSONB DEFAULT '[]',
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recco_predictions_user ON recco_predictions(user_id, timestamp DESC);

-- =====================================================
-- 10. FLAGS COGNITIVAS/EMOCIONAIS (triggers)
-- =====================================================
CREATE TABLE IF NOT EXISTS recco_cognitive_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Flags
  foco_baixo BOOLEAN DEFAULT false,
  energia_baixa BOOLEAN DEFAULT false,
  saturacao BOOLEAN DEFAULT false,
  velocidade_lenta BOOLEAN DEFAULT false,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recco_emotional_flags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Flags
  ansiedade BOOLEAN DEFAULT false,
  frustracao BOOLEAN DEFAULT false,
  desmotivacao BOOLEAN DEFAULT false,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recco_cognitive_flags_user ON recco_cognitive_flags(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_recco_emotional_flags_user ON recco_emotional_flags(user_id, timestamp DESC);
