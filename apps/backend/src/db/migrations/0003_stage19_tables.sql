-- 0003_stage19_tables.sql
-- Tabelas e alterações do Stage 19 (Scheduler de Jobs)

-- 1) Atualizar tabela drop_cache existente
-- A tabela já existe com 'cache_key', precisamos migrar para 'hash'
DO $$
BEGIN
  -- Verificar se a coluna cache_key existe e renomear para hash
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='drop_cache' AND column_name='cache_key') THEN
    ALTER TABLE drop_cache RENAME COLUMN cache_key TO hash;
  END IF;
  
  -- Adicionar coluna hash se não existir (caso seja criação nova)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='drop_cache' AND column_name='hash') THEN
    -- Criar a tabela se não existir
    CREATE TABLE IF NOT EXISTS drop_cache (
      id SERIAL PRIMARY KEY,
      blueprint_id INTEGER REFERENCES exam_blueprints(id) ON DELETE CASCADE,
      hash VARCHAR(64) NOT NULL,
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (blueprint_id, hash)
    );
  END IF;
  
  -- Adicionar created_at se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='drop_cache' AND column_name='created_at') THEN
    ALTER TABLE drop_cache ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  
  -- Adicionar outras colunas se não existirem
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='drop_cache' AND column_name='topic_code') THEN
    ALTER TABLE drop_cache ADD COLUMN topic_code VARCHAR(255);
  END IF;
END $$;

-- 2) Adicionar colunas à tabela drops se não existirem
ALTER TABLE drops
ADD COLUMN IF NOT EXISTS blueprint_id INTEGER REFERENCES exam_blueprints(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS topic_code VARCHAR(255),
ADD COLUMN IF NOT EXISTS drop_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS drop_text TEXT;

-- 3) Criar tabela job_logs para rastrear execução de jobs
CREATE TABLE IF NOT EXISTS job_logs (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  items_processed INTEGER DEFAULT 0,
  items_failed INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);

-- 4) Criar tabela job_schedule para controlar agendamentos
CREATE TABLE IF NOT EXISTS job_schedule (
  id SERIAL PRIMARY KEY,
  job_name VARCHAR(255) NOT NULL UNIQUE,
  cron_expression VARCHAR(255) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5) Índices para performance
-- Só criar índices se as colunas existirem
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='drop_cache' AND column_name='blueprint_id') THEN
    CREATE INDEX IF NOT EXISTS idx_drop_cache_blueprint ON drop_cache(blueprint_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='drop_cache' AND column_name='hash') THEN
    CREATE INDEX IF NOT EXISTS idx_drop_cache_hash ON drop_cache(hash);
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_drops_blueprint ON drops(blueprint_id);
CREATE INDEX IF NOT EXISTS idx_drops_topic_code ON drops(topic_code);
CREATE INDEX IF NOT EXISTS idx_job_logs_job_name ON job_logs(job_name);
CREATE INDEX IF NOT EXISTS idx_job_logs_started_at ON job_logs(started_at);
CREATE INDEX IF NOT EXISTS idx_job_schedule_job_name ON job_schedule(job_name);

-- 6) Inserir agendamentos padrão
INSERT INTO job_schedule (job_name, cron_expression, is_active)
VALUES
  ('extract-blueprints', '0 */6 * * *', true),  -- A cada 6 horas
  ('generate-drops', '0 0 * * *', true),        -- Diariamente à meia-noite
  ('rag-feeder', '0 2 * * *', true)             -- Diariamente às 2h da manhã
ON CONFLICT (job_name) DO NOTHING;
