-- ==========================================
-- FIX MIGRAÇÃO 0011 e 0012 - Jobs System
-- ==========================================

\echo '🔧 Criando tabelas de jobs...'

-- Criar tabela jobs
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  schedule VARCHAR(255),
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

\echo '✅ Tabela jobs criada'

-- Criar tabela job_schedules
CREATE TABLE IF NOT EXISTS job_schedules (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  schedule VARCHAR(255),
  enabled BOOLEAN DEFAULT true,
  last_run TIMESTAMPTZ,
  next_run TIMESTAMPTZ,
  config JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

\echo '✅ Tabela job_schedules criada'

-- Inserir jobs padrão
INSERT INTO jobs (name, description, schedule, enabled) VALUES
  ('extract-blueprints', 'Extrair estrutura de provas', '0 */6 * * *', true),
  ('generate-drops', 'Gerar drops de conteúdo', '0 0 * * *', true),
  ('rag-feeder', 'Alimentar sistema RAG', '0 2 * * *', true)
ON CONFLICT (name) DO NOTHING;

\echo '✅ Jobs padrão inseridos'

-- Marcar migrações como aplicadas
INSERT INTO schema_migrations (name) VALUES ('0011_jobs_system.sql') 
ON CONFLICT (name) DO NOTHING;

INSERT INTO schema_migrations (name) VALUES ('0012_backup_system.sql') 
ON CONFLICT (name) DO NOTHING;

\echo '✅ Migrações marcadas como aplicadas'
\echo ''
\echo '📊 Verificando resultado...'
\echo ''

-- Verificar migrações
\echo '=== MIGRAÇÕES APLICADAS ==='
SELECT name FROM schema_migrations ORDER BY name;

\echo ''
\echo '=== TABELAS CRIADAS ==='
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('jobs', 'job_schedules', 'job_logs', 'job_schedule')
ORDER BY table_name;

\echo ''
\echo '=== JOBS CADASTRADOS ==='
SELECT name, enabled, schedule FROM jobs ORDER BY name;

\echo ''
\echo '🎉 FIX COMPLETO! Reinicie o backend no Railway.'
