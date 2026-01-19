-- 0009_questoes_english_columns.sql
-- Adiciona colunas em inglês para compatibilidade com o código

-- =====================================================
-- ADICIONAR COLUNAS EM INGLÊS
-- =====================================================

-- Adicionar novas colunas
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS question_text TEXT;
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS question_type VARCHAR(50) DEFAULT 'multiple_choice';
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS alternatives JSONB;
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS correct_answer VARCHAR(5);
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS explanation TEXT;
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS concepts JSONB DEFAULT '[]';
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS cognitive_level VARCHAR(50);
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS estimated_time_seconds INTEGER;
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS quality_score NUMERIC(4,2);
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS ai_generated BOOLEAN DEFAULT false;
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft';
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS discipline VARCHAR(100);
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS topic VARCHAR(255);
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS exam_board VARCHAR(100);
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS difficulty INTEGER;
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';

-- =====================================================
-- COPIAR DADOS DAS COLUNAS EXISTENTES
-- =====================================================

-- Copiar dados das colunas em português para as em inglês
UPDATE questoes SET 
  question_text = COALESCE(question_text, enunciado),
  alternatives = COALESCE(alternatives, alternativas),
  correct_answer = COALESCE(correct_answer, correta),
  explanation = COALESCE(explanation, COALESCE(explicacao_longa, explicacao_curta)),
  difficulty = COALESCE(difficulty, dificuldade),
  topic = COALESCE(topic, subtopico),
  exam_board = COALESCE(exam_board, banca),
  cognitive_level = COALESCE(cognitive_level, nivel_cognitivo),
  estimated_time_seconds = COALESCE(estimated_time_seconds, tempo_estimado),
  ai_generated = CASE WHEN criado_por = 'IA' THEN true ELSE false END,
  status = COALESCE(status, 'draft')
WHERE question_text IS NULL OR alternatives IS NULL;

-- =====================================================
-- CRIAR ÍNDICES NAS NOVAS COLUNAS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_questoes_question_type ON questoes(question_type);
CREATE INDEX IF NOT EXISTS idx_questoes_status ON questoes(status);
CREATE INDEX IF NOT EXISTS idx_questoes_ai_generated ON questoes(ai_generated);
CREATE INDEX IF NOT EXISTS idx_questoes_difficulty_new ON questoes(difficulty);
CREATE INDEX IF NOT EXISTS idx_questoes_exam_board_new ON questoes(exam_board);
CREATE INDEX IF NOT EXISTS idx_questoes_topic ON questoes(topic);
CREATE INDEX IF NOT EXISTS idx_questoes_discipline ON questoes(discipline);

-- Índice GIN para busca em JSON
CREATE INDEX IF NOT EXISTS idx_questoes_concepts_gin ON questoes USING gin(concepts);
CREATE INDEX IF NOT EXISTS idx_questoes_tags_gin ON questoes USING gin(tags);

-- =====================================================
-- TABELA DE ESTATÍSTICAS (atualizar para inglês)
-- =====================================================

ALTER TABLE questoes_estatisticas ADD COLUMN IF NOT EXISTS total_attempts INTEGER DEFAULT 0;
ALTER TABLE questoes_estatisticas ADD COLUMN IF NOT EXISTS correct_attempts INTEGER DEFAULT 0;
ALTER TABLE questoes_estatisticas ADD COLUMN IF NOT EXISTS wrong_attempts INTEGER DEFAULT 0;
ALTER TABLE questoes_estatisticas ADD COLUMN IF NOT EXISTS average_time_seconds INTEGER;
ALTER TABLE questoes_estatisticas ADD COLUMN IF NOT EXISTS difficulty_real NUMERIC(3,1);
ALTER TABLE questoes_estatisticas ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT NOW();

-- Copiar dados existentes
UPDATE questoes_estatisticas SET
  total_attempts = COALESCE(total_attempts, total_tentativas),
  correct_attempts = COALESCE(correct_attempts, total_acertos),
  wrong_attempts = COALESCE(wrong_attempts, total_erros),
  average_time_seconds = COALESCE(average_time_seconds, tempo_medio),
  last_updated = COALESCE(last_updated, updated_at)
WHERE total_attempts = 0 OR total_attempts IS NULL;

-- =====================================================
-- COMENTÁRIOS
-- =====================================================

COMMENT ON COLUMN questoes.question_text IS 'Texto completo da questão';
COMMENT ON COLUMN questoes.question_type IS 'Tipo: multiple_choice ou true_false';
COMMENT ON COLUMN questoes.alternatives IS 'Array de alternativas em JSON';
COMMENT ON COLUMN questoes.correct_answer IS 'Letra da resposta correta (a-e)';
COMMENT ON COLUMN questoes.explanation IS 'Explicação detalhada da resposta';
COMMENT ON COLUMN questoes.concepts IS 'Conceitos abordados na questão';
COMMENT ON COLUMN questoes.cognitive_level IS 'Nível cognitivo (Bloom): remember, understand, apply, analyze, evaluate, create';
COMMENT ON COLUMN questoes.estimated_time_seconds IS 'Tempo estimado de resolução em segundos';
COMMENT ON COLUMN questoes.quality_score IS 'Score de qualidade da questão (0-10)';
COMMENT ON COLUMN questoes.ai_generated IS 'Se foi gerada por IA ou manualmente';
COMMENT ON COLUMN questoes.status IS 'Status: draft, active, archived';
COMMENT ON COLUMN questoes.discipline IS 'Disciplina da questão';
COMMENT ON COLUMN questoes.topic IS 'Tópico/subtópico da questão';
COMMENT ON COLUMN questoes.exam_board IS 'Banca examinadora (CESPE, FCC, FGV, VUNESP, outro)';
COMMENT ON COLUMN questoes.difficulty IS 'Nível de dificuldade (1-5)';

-- =====================================================
-- CONSTRAINTS
-- =====================================================

-- Adicionar constraints de validação
ALTER TABLE questoes ADD CONSTRAINT check_difficulty_range 
  CHECK (difficulty IS NULL OR (difficulty >= 1 AND difficulty <= 5));

ALTER TABLE questoes ADD CONSTRAINT check_quality_score_range 
  CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 10));

ALTER TABLE questoes ADD CONSTRAINT check_status_values 
  CHECK (status IN ('draft', 'active', 'archived'));

ALTER TABLE questoes ADD CONSTRAINT check_question_type_values 
  CHECK (question_type IN ('multiple_choice', 'true_false'));

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_questoes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
DROP TRIGGER IF EXISTS trigger_questoes_updated_at ON questoes;
CREATE TRIGGER trigger_questoes_updated_at
  BEFORE UPDATE ON questoes
  FOR EACH ROW
  EXECUTE FUNCTION update_questoes_updated_at();

-- =====================================================
-- FINALIZAÇÃO
-- =====================================================

-- Vacuum e analyze removidos (não podem rodar em transação)
-- Execute manualmente se necessário: VACUUM ANALYZE questoes; VACUUM ANALYZE questoes_estatisticas;
