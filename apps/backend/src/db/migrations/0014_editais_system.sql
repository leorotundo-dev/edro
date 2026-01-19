-- Migration 0014: Sistema de Editais
-- Cria as tabelas necessárias para gerenciar editais de concursos públicos

CREATE TABLE IF NOT EXISTS editais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Informações Básicas
  codigo TEXT NOT NULL UNIQUE,
  titulo TEXT NOT NULL,
  orgao TEXT NOT NULL,
  banca TEXT,
  
  -- Status e Datas
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado', 'em_andamento', 'suspenso', 'cancelado', 'concluido')),
  data_publicacao DATE,
  data_inscricao_inicio DATE,
  data_inscricao_fim DATE,
  data_prova_prevista DATE,
  data_prova_realizada DATE,
  
  -- Informações Detalhadas
  descricao TEXT,
  cargos JSONB DEFAULT '[]'::jsonb, -- Array de objetos com cargo, vagas, salario, requisitos
  disciplinas JSONB DEFAULT '[]'::jsonb, -- Array de disciplinas cobradas
  conteudo_programatico JSONB DEFAULT '{}'::jsonb, -- Estrutura do conteúdo por disciplina
  
  -- Documentos e Links
  link_edital_completo TEXT,
  link_inscricao TEXT,
  arquivos JSONB DEFAULT '[]'::jsonb, -- Array de arquivos anexos
  
  -- Estatísticas
  numero_vagas INTEGER DEFAULT 0,
  numero_inscritos INTEGER DEFAULT 0,
  taxa_inscricao DECIMAL(10, 2),
  
  -- Metadados
  tags JSONB DEFAULT '[]'::jsonb,
  observacoes TEXT,
  
  -- Auditoria
  criado_por UUID REFERENCES users(id),
  atualizado_por UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Cronograma de Eventos do Edital
CREATE TABLE IF NOT EXISTS edital_eventos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edital_id UUID NOT NULL REFERENCES editais(id) ON DELETE CASCADE,
  
  tipo TEXT NOT NULL CHECK (tipo IN ('inscricao', 'prova', 'resultado', 'recurso', 'convocacao', 'outro')),
  titulo TEXT NOT NULL,
  descricao TEXT,
  data_inicio TIMESTAMPTZ,
  data_fim TIMESTAMPTZ,
  
  link_externo TEXT,
  concluido BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de Questões do Edital (relacionamento)
CREATE TABLE IF NOT EXISTS edital_questoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edital_id UUID NOT NULL REFERENCES editais(id) ON DELETE CASCADE,
  questao_id UUID NOT NULL,
  disciplina TEXT NOT NULL,
  topico TEXT,
  peso DECIMAL(5, 2) DEFAULT 1.0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (edital_id, questao_id)
);

-- Tabela de Usuários Interessados (alunos que acompanham o edital)
CREATE TABLE IF NOT EXISTS edital_usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  edital_id UUID NOT NULL REFERENCES editais(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  cargo_interesse TEXT,
  notificacoes_ativas BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE (edital_id, user_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_editais_status ON editais(status);
CREATE INDEX IF NOT EXISTS idx_editais_banca ON editais(banca);
CREATE INDEX IF NOT EXISTS idx_editais_orgao ON editais(orgao);
CREATE INDEX IF NOT EXISTS idx_editais_data_publicacao ON editais(data_publicacao);
CREATE INDEX IF NOT EXISTS idx_editais_data_prova_prevista ON editais(data_prova_prevista);
CREATE INDEX IF NOT EXISTS idx_editais_tags ON editais USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_edital_eventos_edital_id ON edital_eventos(edital_id);
CREATE INDEX IF NOT EXISTS idx_edital_eventos_tipo ON edital_eventos(tipo);
CREATE INDEX IF NOT EXISTS idx_edital_eventos_data_inicio ON edital_eventos(data_inicio);

CREATE INDEX IF NOT EXISTS idx_edital_questoes_edital_id ON edital_questoes(edital_id);
CREATE INDEX IF NOT EXISTS idx_edital_questoes_disciplina ON edital_questoes(disciplina);

CREATE INDEX IF NOT EXISTS idx_edital_usuarios_user_id ON edital_usuarios(user_id);
CREATE INDEX IF NOT EXISTS idx_edital_usuarios_edital_id ON edital_usuarios(edital_id);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_editais_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_editais_updated_at
  BEFORE UPDATE ON editais
  FOR EACH ROW
  EXECUTE FUNCTION update_editais_updated_at();

CREATE TRIGGER trigger_update_edital_eventos_updated_at
  BEFORE UPDATE ON edital_eventos
  FOR EACH ROW
  EXECUTE FUNCTION update_editais_updated_at();

CREATE TRIGGER trigger_update_edital_usuarios_updated_at
  BEFORE UPDATE ON edital_usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_editais_updated_at();

-- View para estatísticas de editais
CREATE OR REPLACE VIEW editais_stats AS
SELECT 
  e.id,
  e.codigo,
  e.titulo,
  e.status,
  e.banca,
  e.numero_vagas,
  COUNT(DISTINCT eu.user_id) as usuarios_interessados,
  COUNT(DISTINCT eq.questao_id) as total_questoes,
  e.data_prova_prevista,
  e.created_at
FROM editais e
LEFT JOIN edital_usuarios eu ON e.id = eu.edital_id
LEFT JOIN edital_questoes eq ON e.id = eq.edital_id
GROUP BY e.id;

COMMENT ON TABLE editais IS 'Tabela principal de editais de concursos públicos';
COMMENT ON TABLE edital_eventos IS 'Cronograma de eventos e etapas de cada edital';
COMMENT ON TABLE edital_questoes IS 'Relacionamento entre editais e questões de provas';
COMMENT ON TABLE edital_usuarios IS 'Usuários que acompanham determinado edital';
