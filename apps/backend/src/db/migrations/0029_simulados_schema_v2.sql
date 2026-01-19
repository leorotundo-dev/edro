-- 0029_simulados_schema_v2.sql
-- Ajusta schema de simulados para o modelo usado pelos repositories/rotas atuais.

-- Renomear tabelas antigas (legacy) se ainda estiverem no formato antigo
DO $$
BEGIN
  IF to_regclass('public.simulados_execucao') IS NOT NULL
     AND to_regclass('public.simulados_execucao_legacy') IS NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'simulados_execucao' AND column_name = 'questao_id') THEN
    ALTER TABLE simulados_execucao RENAME TO simulados_execucao_legacy;
  END IF;

  IF to_regclass('public.simulados_questoes') IS NOT NULL
     AND to_regclass('public.simulados_questoes_legacy') IS NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'simulados_questoes' AND column_name = 'simulado_id') THEN
    ALTER TABLE simulados_questoes RENAME TO simulados_questoes_legacy;
  END IF;

  IF to_regclass('public.simulados_resultados') IS NOT NULL
     AND to_regclass('public.simulados_resultados_legacy') IS NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'simulados_resultados' AND column_name = 'total_acertos') THEN
    ALTER TABLE simulados_resultados RENAME TO simulados_resultados_legacy;
  END IF;

  IF to_regclass('public.simulados_mapas') IS NOT NULL
     AND to_regclass('public.simulados_mapas_legacy') IS NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'simulados_mapas' AND column_name = 'tipo_mapa') THEN
    ALTER TABLE simulados_mapas RENAME TO simulados_mapas_legacy;
  END IF;
END $$;

-- Expandir tabela simulados para suportar o modelo atual
ALTER TABLE simulados ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE simulados ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE simulados ADD COLUMN IF NOT EXISTS discipline TEXT;
ALTER TABLE simulados ADD COLUMN IF NOT EXISTS exam_board TEXT;
ALTER TABLE simulados ADD COLUMN IF NOT EXISTS total_questions INTEGER;
ALTER TABLE simulados ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER;
ALTER TABLE simulados ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE simulados ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;

-- Tabela de execucao (nova)
CREATE TABLE IF NOT EXISTS simulados_execucao (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
  adaptive_state JSONB DEFAULT '{}'::jsonb,
  current_question INTEGER NOT NULL DEFAULT 0,
  mode VARCHAR(20) DEFAULT 'padrao',
  timer_seconds INTEGER,
  time_spent_seconds INTEGER DEFAULT 0,
  last_question_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_simulados_execucao_simulado
  ON simulados_execucao(simulado_id);
CREATE INDEX IF NOT EXISTS idx_simulados_execucao_user
  ON simulados_execucao(user_id, started_at DESC);

-- Tabela de respostas por execucao
CREATE TABLE IF NOT EXISTS simulados_questoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES simulados_execucao(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
  order_num INTEGER NOT NULL,
  selected_answer VARCHAR(5),
  is_correct BOOLEAN NOT NULL,
  time_spent INTEGER,
  difficulty INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (execution_id, order_num)
);

CREATE INDEX IF NOT EXISTS idx_simulados_questoes_execucao
  ON simulados_questoes(execution_id, order_num);

-- Resultados consolidados
CREATE TABLE IF NOT EXISTS simulados_resultados (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID NOT NULL REFERENCES simulados_execucao(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  simulado_id UUID NOT NULL REFERENCES simulados(id) ON DELETE CASCADE,
  total_questions INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  wrong_count INTEGER NOT NULL,
  accuracy NUMERIC(5,2) NOT NULL,
  total_time_seconds INTEGER NOT NULL,
  score INTEGER NOT NULL,
  grade VARCHAR(5) NOT NULL,
  finished_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulados_resultados_simulado
  ON simulados_resultados(simulado_id, finished_at DESC);

-- Mapas de analise
CREATE TABLE IF NOT EXISTS simulados_mapas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  result_id UUID NOT NULL REFERENCES simulados_resultados(id) ON DELETE CASCADE,
  mapa_tipo VARCHAR(50) NOT NULL,
  mapa_data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_simulados_mapas_result
  ON simulados_mapas(result_id);
