-- 0002_new_stage16_tables.sql
-- Tabelas novas do Stage 16

-- 1) Harvest: editais e fontes brutas
CREATE TABLE IF NOT EXISTS harvest_items (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  raw_html TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- 2) Blueprints de provas / editais
CREATE TABLE IF NOT EXISTS exam_blueprints (
  id SERIAL PRIMARY KEY,
  harvest_item_id INTEGER REFERENCES harvest_items(id),
  exam_code TEXT,
  banca TEXT,
  cargo TEXT,
  disciplina TEXT,
  blueprint JSONB NOT NULL,
  priorities JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3) QA & Reviews
CREATE TABLE IF NOT EXISTS qa_reviews (
  id SERIAL PRIMARY KEY,
  drop_id INTEGER,
  status TEXT NOT NULL,
  notes TEXT,
  cost_input_tokens INTEGER,
  cost_output_tokens INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) Métricas agregadas
CREATE TABLE IF NOT EXISTS metrics_daily (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (date, metric_name)
);

-- 5) User stats / personalização
CREATE TABLE IF NOT EXISTS user_stats (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  topic_code TEXT NOT NULL,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  next_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, topic_code)
);

-- 6) Pré-requisitos entre tópicos
CREATE TABLE IF NOT EXISTS topic_prereqs (
  id SERIAL PRIMARY KEY,
  topic_code TEXT NOT NULL,
  prereq_topic_code TEXT NOT NULL
);

-- 7) Logs de tentativas do usuário
CREATE TABLE IF NOT EXISTS exam_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  drop_id INTEGER,
  was_correct BOOLEAN,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_harvest_items_status ON harvest_items(status);
CREATE INDEX IF NOT EXISTS idx_exam_blueprints_disciplina ON exam_blueprints(disciplina);
CREATE INDEX IF NOT EXISTS idx_user_stats_user_topic ON user_stats(user_id, topic_code);
CREATE INDEX IF NOT EXISTS idx_exam_logs_user ON exam_logs(user_id, answered_at);
