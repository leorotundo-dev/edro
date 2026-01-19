-- ============================================
-- FIX MANUAL PARA RAILWAY
-- Execute este SQL diretamente no banco do Railway
-- ============================================

-- ============================================
-- PASSO 1: Verificar se a migração 0011 está marcada
-- ============================================
SELECT * FROM schema_migrations 
WHERE name = '0011_jobs_system.sql';

-- Se NÃO aparecer nada, execute:
INSERT INTO schema_migrations (name) 
VALUES ('0011_jobs_system.sql') 
ON CONFLICT DO NOTHING;

-- ============================================
-- PASSO 2: Criar/Atualizar tabela jobs
-- ============================================

-- Criar tabela se não existir
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  type VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  data JSONB DEFAULT '{}',
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna scheduled_for se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'jobs' 
    AND column_name = 'scheduled_for'
  ) THEN
    ALTER TABLE jobs ADD COLUMN scheduled_for TIMESTAMPTZ;
  END IF;
END $$;

-- ============================================
-- PASSO 3: Criar índices necessários
-- ============================================

CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_queue ON jobs(status, priority DESC, created_at ASC) 
  WHERE status = 'pending';

-- ============================================
-- PASSO 4: Marcar migração 0013 como aplicada
-- ============================================

INSERT INTO schema_migrations (name) 
VALUES ('0013_fix_jobs_scheduled_for.sql') 
ON CONFLICT DO NOTHING;

-- ============================================
-- PASSO 5: Criar outras tabelas do sistema de jobs
-- ============================================

-- Tabela de agendamento de jobs
CREATE TABLE IF NOT EXISTS job_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(100) NOT NULL,
  schedule VARCHAR(100) NOT NULL,
  data JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_schedule_enabled ON job_schedule(enabled);
CREATE INDEX IF NOT EXISTS idx_job_schedule_next_run ON job_schedule(next_run);

-- Tabela de logs de jobs
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_logs_job ON job_logs(job_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_level ON job_logs(level);
CREATE INDEX IF NOT EXISTS idx_job_logs_timestamp ON job_logs(timestamp DESC);

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================

-- Verificar se tudo está OK
SELECT 
  'scheduled_for column exists' as check_name,
  EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'jobs' 
    AND column_name = 'scheduled_for'
  ) as status;

SELECT 
  'idx_jobs_scheduled exists' as check_name,
  EXISTS (
    SELECT 1 
    FROM pg_indexes 
    WHERE tablename = 'jobs' 
    AND indexname = 'idx_jobs_scheduled'
  ) as status;

SELECT 
  'migration 0013 applied' as check_name,
  EXISTS (
    SELECT 1 
    FROM schema_migrations 
    WHERE name = '0013_fix_jobs_scheduled_for.sql'
  ) as status;

-- Mostrar estrutura da tabela jobs
\d jobs

-- Mostrar todas as migrações aplicadas
SELECT * FROM schema_migrations ORDER BY id;

-- ============================================
-- RESULTADO ESPERADO:
-- ============================================
-- Todas as queries devem retornar 'true'
-- A tabela jobs deve ter 14 colunas
-- Deve haver 13 migrações na tabela schema_migrations
-- ============================================

-- APÓS EXECUTAR ESTE SQL:
-- 1. Restart do serviço backend no Railway
-- 2. Verificar logs - não deve mais ter erro de scheduled_for
-- ============================================
