-- ==========================================
-- FIX MIGRATION 0003 - EXECUTAR NO RAILWAY
-- ==========================================
-- Este script corrige o problema da migração 0003 
-- que estava falhando devido à coluna 'hash' não existir
-- ==========================================

-- PASSO 1: Atualizar tabela drop_cache existente
DO $$
BEGIN
  -- Renomear cache_key para hash se existir
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='drop_cache' AND column_name='cache_key') THEN
    ALTER TABLE drop_cache RENAME COLUMN cache_key TO hash;
    RAISE NOTICE '✅ Coluna cache_key renomeada para hash';
  ELSE
    RAISE NOTICE 'ℹ️  Coluna cache_key não existe (pode já ter sido migrada)';
  END IF;
  
  -- Garantir que a coluna hash existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='drop_cache' AND column_name='hash') THEN
    -- Se a tabela não existe, criar ela
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_name='drop_cache') THEN
      CREATE TABLE drop_cache (
        id SERIAL PRIMARY KEY,
        blueprint_id INTEGER REFERENCES exam_blueprints(id) ON DELETE CASCADE,
        hash VARCHAR(64) NOT NULL,
        payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (blueprint_id, hash)
      );
      RAISE NOTICE '✅ Tabela drop_cache criada';
    ELSE
      -- Tabela existe mas sem a coluna hash, adicionar
      ALTER TABLE drop_cache ADD COLUMN hash VARCHAR(64);
      RAISE NOTICE '✅ Coluna hash adicionada';
    END IF;
  ELSE
    RAISE NOTICE '✅ Coluna hash já existe';
  END IF;
  
  -- Adicionar topic_code se não existir
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='drop_cache' AND column_name='topic_code') THEN
    ALTER TABLE drop_cache ADD COLUMN topic_code VARCHAR(255);
    RAISE NOTICE '✅ Coluna topic_code adicionada';
  END IF;
END $$;

-- PASSO 2: Adicionar colunas à tabela drops
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='drops' AND column_name='blueprint_id') THEN
    ALTER TABLE drops ADD COLUMN blueprint_id INTEGER REFERENCES exam_blueprints(id) ON DELETE SET NULL;
    RAISE NOTICE '✅ Coluna blueprint_id adicionada a drops';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='drops' AND column_name='topic_code') THEN
    ALTER TABLE drops ADD COLUMN topic_code VARCHAR(255);
    RAISE NOTICE '✅ Coluna topic_code adicionada a drops';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='drops' AND column_name='drop_type') THEN
    ALTER TABLE drops ADD COLUMN drop_type VARCHAR(50);
    RAISE NOTICE '✅ Coluna drop_type adicionada a drops';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='drops' AND column_name='drop_text') THEN
    ALTER TABLE drops ADD COLUMN drop_text TEXT;
    RAISE NOTICE '✅ Coluna drop_text adicionada a drops';
  END IF;
END $$;

-- PASSO 3: Criar tabela job_logs
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

-- PASSO 4: Criar tabela job_schedule
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

-- PASSO 5: Criar índices
DO $$
BEGIN
  -- Índices para drop_cache
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='drop_cache' AND column_name='blueprint_id') THEN
    CREATE INDEX IF NOT EXISTS idx_drop_cache_blueprint ON drop_cache(blueprint_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_name='drop_cache' AND column_name='hash') THEN
    CREATE INDEX IF NOT EXISTS idx_drop_cache_hash ON drop_cache(hash);
  END IF;
  
  -- Índices para drops
  CREATE INDEX IF NOT EXISTS idx_drops_blueprint ON drops(blueprint_id);
  CREATE INDEX IF NOT EXISTS idx_drops_topic_code ON drops(topic_code);
  
  -- Índices para job_logs
  CREATE INDEX IF NOT EXISTS idx_job_logs_job_name ON job_logs(job_name);
  CREATE INDEX IF NOT EXISTS idx_job_logs_created_at ON job_logs(started_at);
  
  -- Índice para job_schedule
  CREATE INDEX IF NOT EXISTS idx_job_schedule_job_name ON job_schedule(job_name);
  
  RAISE NOTICE '✅ Índices criados';
END $$;

-- PASSO 6: Inserir agendamentos padrão
INSERT INTO job_schedule (job_name, cron_expression, is_active)
VALUES
  ('extract-blueprints', '0 */6 * * *', true),  -- A cada 6 horas
  ('generate-drops', '0 0 * * *', true),        -- Diariamente à meia-noite
  ('rag-feeder', '0 2 * * *', true)             -- Diariamente às 2h da manhã
ON CONFLICT (job_name) DO NOTHING;

-- PASSO 7: Marcar migração 0003 como aplicada
INSERT INTO schema_migrations (name) 
VALUES ('0003_stage19_tables.sql')
ON CONFLICT (name) DO NOTHING;

-- PASSO 8: Verificação final
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================';
  RAISE NOTICE '  VERIFICAÇÃO FINAL';
  RAISE NOTICE '================================';
  
  -- Verificar tabelas
  RAISE NOTICE '';
  RAISE NOTICE '📊 TABELAS CRIADAS:';
  FOR rec IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_name IN ('drop_cache', 'job_logs', 'job_schedule')
    ORDER BY table_name
  LOOP
    RAISE NOTICE '  ✅ %', rec.table_name;
  END LOOP;
  
  -- Verificar colunas de drops
  RAISE NOTICE '';
  RAISE NOTICE '📊 COLUNAS EM DROPS:';
  FOR rec IN 
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'drops' 
      AND column_name IN ('blueprint_id', 'topic_code', 'drop_type', 'drop_text')
    ORDER BY column_name
  LOOP
    RAISE NOTICE '  ✅ drops.%', rec.column_name;
  END LOOP;
  
  -- Verificar agendamentos
  RAISE NOTICE '';
  RAISE NOTICE '📊 AGENDAMENTOS:';
  FOR rec IN SELECT job_name, cron_expression, is_active FROM job_schedule ORDER BY job_name LOOP
    RAISE NOTICE '  ✅ % - % (ativo: %)', rec.job_name, rec.cron_expression, rec.is_active;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================';
  RAISE NOTICE '  ✅ MIGRAÇÃO 0003 COMPLETA!';
  RAISE NOTICE '================================';
END $$;
