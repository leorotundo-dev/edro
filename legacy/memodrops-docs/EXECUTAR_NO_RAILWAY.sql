-- =====================================================
-- SISTEMA DE JOBS - EXECUTAR NO RAILWAY QUERY
-- =====================================================
-- 
-- INSTRUÇÕES:
-- 1. Acesse: https://railway.app
-- 2. Vá no projeto MemoDrops
-- 3. Clique no serviço PostgreSQL
-- 4. Aba "Query"
-- 5. Cole este SQL completo
-- 6. Clique em "Run Query"
-- 7. Aguarde completar
-- 8. Reinicie o backend
-- =====================================================

-- =====================================================
-- 0. CRIAR TABELA DE CONTROLE DE MIGRAÇÕES
-- =====================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- 1. JOBS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
  data JSONB DEFAULT '{}',
  result JSONB,
  error TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_priority ON jobs(priority DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled ON jobs(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_jobs_created ON jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_queue ON jobs(status, priority DESC, created_at ASC) 
  WHERE status = 'pending';

-- =====================================================
-- 2. JOB SCHEDULES (Cron-like)
-- =====================================================
CREATE TABLE IF NOT EXISTS job_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_job_schedules_enabled ON job_schedules(enabled);
CREATE INDEX IF NOT EXISTS idx_job_schedules_next_run ON job_schedules(next_run);

-- =====================================================
-- 3. JOB LOGS
-- =====================================================
CREATE TABLE IF NOT EXISTS job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_job_logs_job ON job_logs(job_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_job_logs_level ON job_logs(level);
CREATE INDEX IF NOT EXISTS idx_job_logs_timestamp ON job_logs(timestamp DESC);

-- =====================================================
-- 4. HARVEST SOURCES
-- =====================================================
CREATE TABLE IF NOT EXISTS harvest_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  base_url TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_harvest_sources_enabled ON harvest_sources(enabled);
CREATE INDEX IF NOT EXISTS idx_harvest_sources_type ON harvest_sources(type);
CREATE INDEX IF NOT EXISTS idx_harvest_sources_priority ON harvest_sources(priority DESC);

-- =====================================================
-- 5. HARVESTED CONTENT
-- =====================================================
CREATE TABLE IF NOT EXISTS harvested_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES harvest_sources(id) ON DELETE SET NULL,
  url TEXT NOT NULL,
  title VARCHAR(500),
  content_type VARCHAR(50),
  raw_html TEXT,
  parsed_content JSONB,
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_harvested_content_source ON harvested_content(source_id);
CREATE INDEX IF NOT EXISTS idx_harvested_content_status ON harvested_content(status);
CREATE INDEX IF NOT EXISTS idx_harvested_content_type ON harvested_content(content_type);
CREATE INDEX IF NOT EXISTS idx_harvested_content_created ON harvested_content(created_at DESC);

-- =====================================================
-- 6. INSERIR JOBS AGENDADOS PADRÃO
-- =====================================================
INSERT INTO job_schedules (name, type, schedule, data, enabled)
VALUES 
  -- Limpeza diária às 3h da manhã
  ('Daily Cleanup', 'cleanup', '0 3 * * *', '{}', true),
  
  -- Harvest diário às 2h da manhã
  ('Daily Harvest', 'harvest', '0 2 * * *', '{"limit": 20}', true),
  
  -- Atualização de estatísticas aos domingos às 4h
  ('Weekly Stats Update', 'update_stats', '0 4 * * 0', '{}', true),
  
  -- Geração de embeddings aos sábados à 1h (desabilitado por padrão)
  ('Weekly Embedding Generation', 'generate_embeddings', '0 1 * * 6', '{}', false)
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 7. REGISTRAR MIGRAÇÃO COMO APLICADA
-- =====================================================
INSERT INTO schema_migrations (name)
VALUES ('0011_jobs_system.sql')
ON CONFLICT (name) DO NOTHING;

-- =====================================================
-- 8. VERIFICAÇÃO - MOSTRAR RESULTADOS
-- =====================================================

-- Mostrar tabelas criadas
SELECT 
  'TABELA CRIADA' as status,
  table_name as nome,
  'jobs system' as categoria
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('jobs', 'job_schedules', 'job_logs', 'harvest_sources', 'harvested_content')
ORDER BY table_name;

-- Mostrar jobs agendados
SELECT 
  '🟢 JOB AGENDADO' as status,
  name as nome,
  schedule as cron,
  CASE WHEN enabled THEN 'ATIVO' ELSE 'INATIVO' END as estado
FROM job_schedules
ORDER BY name;

-- Mostrar índices criados
SELECT 
  'ÍNDICE CRIADO' as status,
  indexname as nome,
  tablename as tabela
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('jobs', 'job_schedules', 'job_logs', 'harvest_sources', 'harvested_content')
ORDER BY tablename, indexname;

-- =====================================================
-- ✅ PRONTO!
-- =====================================================
-- 
-- Próximos passos:
-- 1. Reiniciar o backend no Railway
-- 2. Verificar logs do backend
-- 3. Testar endpoint: GET /api/admin/jobs/stats
-- 
-- Para testar se funcionou, execute:
-- 
-- SELECT 'jobs' as tabela, COUNT(*) as total FROM jobs
-- UNION ALL
-- SELECT 'job_schedules', COUNT(*) FROM job_schedules
-- UNION ALL
-- SELECT 'job_logs', COUNT(*) FROM job_logs;
-- 
-- Resultado esperado:
-- - jobs: 0
-- - job_schedules: 4
-- - job_logs: 0
-- 
-- =====================================================
