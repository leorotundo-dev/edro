-- 0006_questoes_simulados.sql
-- Sistema de Questões (Cap. 46) + Simulados Avançados (Cap. 45)

-- =====================================================
-- PARTE 1: SISTEMA DE QUESTÕES
-- =====================================================

-- 1. QUESTÕES BASE (já existe parcialmente, expandir)
CREATE TABLE IF NOT EXISTS questoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Conteúdo
  enunciado TEXT NOT NULL,
  alternativas JSONB NOT NULL, -- ["A", "B", "C", "D", "E"]
  correta VARCHAR(5) NOT NULL,
  explicacao_curta TEXT,
  explicacao_longa TEXT,
  
  -- Classificação
  subtopico VARCHAR(255),
  disciplina_id UUID REFERENCES disciplines(id) ON DELETE SET NULL,
  banca VARCHAR(100),
  dificuldade INTEGER CHECK (dificuldade >= 1 AND dificuldade <= 5) DEFAULT 3, -- N1-N5
  nivel_cognitivo VARCHAR(50), -- 'conhecimento', 'compreensão', 'aplicação', 'análise'
  
  -- Probabilidade
  probabilidade_prova NUMERIC(3,2) CHECK (probabilidade_prova >= 0 AND probabilidade_prova <= 1),
  tempo_estimado INTEGER, -- segundos
  
  -- Metadados
  tags JSONB DEFAULT '[]',
  contexto_semantico TEXT,
  pegadinhas JSONB DEFAULT '[]',
  
  -- Autoria
  criado_por VARCHAR(50) DEFAULT 'IA', -- 'IA' ou 'Humano'
  versao VARCHAR(20) DEFAULT 'v1.0',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questoes_disciplina ON questoes(disciplina_id);
CREATE INDEX IF NOT EXISTS idx_questoes_banca ON questoes(banca);
CREATE INDEX IF NOT EXISTS idx_questoes_dificuldade ON questoes(dificuldade);
CREATE INDEX IF NOT EXISTS idx_questoes_subtopico ON questoes(subtopico);

-- 2. TAGS DAS QUESTÕES (20+ categorias)
CREATE TABLE IF NOT EXISTS questoes_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  
  -- Tags Pedagógicas
  topico VARCHAR(255),
  subtopico VARCHAR(255),
  pre_requisito VARCHAR(255),
  habilidade_cognitiva VARCHAR(100),
  recurso_textual VARCHAR(100),
  tipo_pegadinha VARCHAR(100),
  
  -- Tags de Banca
  estilo_fcc BOOLEAN DEFAULT false,
  estilo_fgv BOOLEAN DEFAULT false,
  estilo_cebraspe BOOLEAN DEFAULT false,
  estilo_vunesp BOOLEAN DEFAULT false,
  
  -- Tags Cognitivas
  requer_atencao BOOLEAN DEFAULT false,
  requer_memoria BOOLEAN DEFAULT false,
  requer_raciocinio BOOLEAN DEFAULT false,
  requer_velocidade BOOLEAN DEFAULT false,
  
  -- Tags Emocionais
  potencial_frustrante BOOLEAN DEFAULT false,
  potencial_motivador BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questoes_tags_questao ON questoes_tags(questao_id);

-- 3. ESTATÍSTICAS POR QUESTÃO
CREATE TABLE IF NOT EXISTS questoes_estatisticas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  questao_id UUID NOT NULL UNIQUE REFERENCES questoes(id) ON DELETE CASCADE,
  
  -- Métricas
  taxa_acerto_global NUMERIC(5,2),
  taxa_acerto_por_banca JSONB DEFAULT '{}',
  taxa_acerto_por_nivel JSONB DEFAULT '{}',
  taxa_erro_por_subtopico JSONB DEFAULT '{}',
  tempo_medio INTEGER, -- segundos
  dificuldade_real NUMERIC(3,1), -- ajustada baseado em acertos
  distrator_mais_escolhido VARCHAR(5),
  padrao_erro_comum TEXT,
  
  -- Contadores
  total_tentativas INTEGER DEFAULT 0,
  total_acertos INTEGER DEFAULT 0,
  total_erros INTEGER DEFAULT 0,
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questoes_estatisticas_questao ON questoes_estatisticas(questao_id);

-- 4. VERSÕES DE QUESTÕES (IA corrige automaticamente)
CREATE TABLE IF NOT EXISTS questoes_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  versao VARCHAR(20) NOT NULL,
  motivo_update TEXT,
  alteracoes JSONB DEFAULT '{}',
  autor_ia VARCHAR(50),
  autor_humano VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questoes_versions_questao ON questoes_versions(questao_id);

-- 5. MAPA DE ERROS (padrões de erro do aluno)
CREATE TABLE IF NOT EXISTS questoes_erro_map (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  
  -- Erro
  resposta_escolhida VARCHAR(5),
  tempo_gasto INTEGER, -- segundos
  hesitou BOOLEAN DEFAULT false,
  
  -- Contexto
  nec NUMERIC(5,2), -- estado cognitivo no momento do erro
  nca NUMERIC(5,2),
  ansiedade BOOLEAN DEFAULT false,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questoes_erro_map_user ON questoes_erro_map(user_id);
CREATE INDEX IF NOT EXISTS idx_questoes_erro_map_questao ON questoes_erro_map(questao_id);

-- 6. QUESTÕES SIMILARES (recomendação)
CREATE TABLE IF NOT EXISTS questoes_similares (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  similar_questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  similaridade_score NUMERIC(3,2) CHECK (similaridade_score >= 0 AND similaridade_score <= 1),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (questao_id, similar_questao_id)
);

CREATE INDEX IF NOT EXISTS idx_questoes_similares_questao ON questoes_similares(questao_id);

-- =====================================================
-- PARTE 2: SISTEMA DE SIMULADOS
-- =====================================================

-- 1. SIMULADOS (9 tipos)
CREATE TABLE IF NOT EXISTS simulados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Tipo
  tipo VARCHAR(50) NOT NULL, -- 'rapido', 'medio', 'completo', 'banca_pura', 'banca_mista', 'adaptativo', 'turbo', 'tematico', 'revisao'
  
  -- Configuração
  total_questoes INTEGER NOT NULL,
  banca VARCHAR(100),
  disciplinas JSONB DEFAULT '[]',
  dificuldade_inicial INTEGER CHECK (dificuldade_inicial >= 1 AND dificuldade_inicial <= 5),
  adaptativo BOOLEAN DEFAULT false,
  
  -- Modo Timer
  modo_timer VARCHAR(50) DEFAULT 'padrao', -- 'padrao', 'turbo', 'consciente'
  tempo_total_segundos INTEGER,
  
  -- Status
  status VARCHAR(50) DEFAULT 'iniciado', -- 'iniciado', 'em_andamento', 'pausado', 'finalizado'
  
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulados_user ON simulados(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_simulados_status ON simulados(status);

-- 2. QUESTÕES DO SIMULADO
CREATE TABLE IF NOT EXISTS simulados_questoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
  questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  dificuldade_no_momento INTEGER, -- pode mudar se adaptativo
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (simulado_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_simulados_questoes_simulado ON simulados_questoes(simulado_id, ordem);

-- 3. EXECUÇÃO DO SIMULADO (respostas em tempo real)
CREATE TABLE IF NOT EXISTS simulados_execucao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
  questao_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  
  -- Resposta
  resposta_escolhida VARCHAR(5),
  correta BOOLEAN NOT NULL,
  tempo_gasto INTEGER, -- segundos
  hesitou BOOLEAN DEFAULT false,
  pulou BOOLEAN DEFAULT false,
  
  -- Estado Cognitivo/Emocional no momento
  foco INTEGER,
  energia INTEGER,
  nec NUMERIC(5,2),
  ansiedade BOOLEAN DEFAULT false,
  
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulados_execucao_simulado ON simulados_execucao(simulado_id);
CREATE INDEX IF NOT EXISTS idx_simulados_execucao_questao ON simulados_execucao(questao_id);

-- 4. RESULTADOS DO SIMULADO (análise final)
CREATE TABLE IF NOT EXISTS simulados_resultados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulado_id UUID NOT NULL UNIQUE REFERENCES simulados(id) ON DELETE CASCADE,
  
  -- Acertos/Erros
  total_acertos INTEGER DEFAULT 0,
  total_erros INTEGER DEFAULT 0,
  taxa_acerto NUMERIC(5,2),
  
  -- Por Disciplina
  acerto_por_disciplina JSONB DEFAULT '{}',
  
  -- Por Subtópico
  acerto_por_subtopico JSONB DEFAULT '{}',
  
  -- Por Nível Cognitivo
  acerto_por_nivel_cognitivo JSONB DEFAULT '{}',
  
  -- Por Estilo de Banca
  acerto_por_estilo_banca JSONB DEFAULT '{}',
  
  -- Tempo
  tempo_total_segundos INTEGER,
  tempo_medio_por_questao INTEGER,
  questoes_lentas JSONB DEFAULT '[]',
  questoes_rapidas JSONB DEFAULT '[]',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulados_resultados_simulado ON simulados_resultados(simulado_id);

-- 5. MAPAS DE ANÁLISE (10 mapas)
CREATE TABLE IF NOT EXISTS simulados_mapas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
  tipo_mapa VARCHAR(50) NOT NULL, -- 'erros', 'acertos', 'cognitivo', 'emocional', 'tempo', 'dificuldade', 'banca', 'competencias', 'prioridades', 'evolucao'
  
  -- Dados do Mapa
  dados JSONB NOT NULL DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulados_mapas_simulado ON simulados_mapas(simulado_id);
CREATE INDEX IF NOT EXISTS idx_simulados_mapas_tipo ON simulados_mapas(tipo_mapa);

-- 6. RECOMENDAÇÕES PÓS-SIMULADO
CREATE TABLE IF NOT EXISTS simulados_recomendacoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Recomendações
  drops_reforco JSONB DEFAULT '[]',
  mnemonicos JSONB DEFAULT '[]',
  questoes_fixacao JSONB DEFAULT '[]',
  ajustes_srs JSONB DEFAULT '{}',
  trilha_reorganizada BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulados_recomendacoes_simulado ON simulados_recomendacoes(simulado_id);
CREATE INDEX IF NOT EXISTS idx_simulados_recomendacoes_user ON simulados_recomendacoes(user_id);
