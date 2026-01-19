-- ==========================================
-- VERIFICAÇÃO DO FIX - EXECUTAR APÓS FIX
-- ==========================================

\echo '================================'
\echo '  VERIFICAÇÃO DE MIGRAÇÕES'
\echo '================================'
\echo ''

-- 1. Verificar migrações aplicadas
\echo '📋 MIGRAÇÕES APLICADAS:'
SELECT 
  name, 
  to_char(run_at, 'YYYY-MM-DD HH24:MI:SS') as executada_em
FROM schema_migrations 
ORDER BY run_at DESC;

\echo ''
\echo '================================'
\echo '  VERIFICAÇÃO DE TABELAS'
\echo '================================'
\echo ''

-- 2. Verificar tabelas do sistema de jobs
\echo '📊 TABELAS DO SISTEMA DE JOBS:'
SELECT 
  table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables t WHERE t.table_name = tables_list.table_name) 
    THEN '✅ EXISTE'
    ELSE '❌ FALTANDO'
  END as status
FROM (
  VALUES 
    ('jobs'),
    ('job_schedules'), 
    ('job_schedule'),
    ('job_logs'),
    ('harvest_sources'),
    ('harvested_content')
) AS tables_list(table_name)
ORDER BY table_name;

\echo ''
\echo '================================'
\echo '  VERIFICAÇÃO DE COLUNAS'
\echo '================================'
\echo ''

-- 3. Verificar colunas importantes
\echo '📊 COLUNAS EM DROP_CACHE:'
SELECT 
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns 
WHERE table_name = 'drop_cache'
ORDER BY ordinal_position;

\echo ''
\echo '📊 COLUNAS ADICIONADAS EM DROPS:'
SELECT 
  column_name,
  data_type,
  CASE WHEN is_nullable = 'YES' THEN 'NULL' ELSE 'NOT NULL' END as nullable
FROM information_schema.columns 
WHERE table_name = 'drops'
  AND column_name IN ('blueprint_id', 'topic_code', 'drop_type', 'drop_text')
ORDER BY ordinal_position;

\echo ''
\echo '================================'
\echo '  VERIFICAÇÃO DE ÍNDICES'
\echo '================================'
\echo ''

-- 4. Verificar índices criados
\echo '📊 ÍNDICES CRIADOS:'
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    indexname LIKE 'idx_drop_cache%' OR
    indexname LIKE 'idx_drops_%' OR
    indexname LIKE 'idx_job_%' OR
    indexname LIKE 'idx_harvest%'
  )
ORDER BY tablename, indexname;

\echo ''
\echo '================================'
\echo '  AGENDAMENTOS DE JOBS'
\echo '================================'
\echo ''

-- 5. Verificar agendamentos
\echo '📅 JOBS AGENDADOS:'
SELECT 
  job_name,
  cron_expression,
  is_active,
  to_char(last_run_at, 'YYYY-MM-DD HH24:MI:SS') as ultima_execucao,
  to_char(next_run_at, 'YYYY-MM-DD HH24:MI:SS') as proxima_execucao
FROM job_schedule
ORDER BY job_name;

-- Se a tabela job_schedules também existir (nova estrutura)
\echo ''
\echo '📅 JOB SCHEDULES (NOVA ESTRUTURA):'
SELECT 
  name,
  type,
  schedule,
  enabled,
  to_char(last_run, 'YYYY-MM-DD HH24:MI:SS') as ultima_execucao,
  to_char(next_run, 'YYYY-MM-DD HH24:MI:SS') as proxima_execucao
FROM job_schedules
ORDER BY name;

\echo ''
\echo '================================'
\echo '  CONTAGEM DE DADOS'
\echo '================================'
\echo ''

-- 6. Contar registros
\echo '🔢 QUANTIDADE DE REGISTROS:'
SELECT 
  'drop_cache' as tabela,
  COUNT(*) as total
FROM drop_cache
UNION ALL
SELECT 
  'job_logs',
  COUNT(*)
FROM job_logs
UNION ALL
SELECT 
  'job_schedule',
  COUNT(*)
FROM job_schedule
UNION ALL
SELECT 
  'jobs',
  COUNT(*)
FROM jobs
UNION ALL
SELECT 
  'harvest_sources',
  COUNT(*)
FROM harvest_sources
UNION ALL
SELECT 
  'harvested_content',
  COUNT(*)
FROM harvested_content
ORDER BY tabela;

\echo ''
\echo '================================'
\echo '  STATUS FINAL'
\echo '================================'
\echo ''

-- 7. Resumo final
DO $$
DECLARE
  mig_count INTEGER;
  table_count INTEGER;
  index_count INTEGER;
BEGIN
  -- Contar migrações
  SELECT COUNT(*) INTO mig_count 
  FROM schema_migrations 
  WHERE name IN ('0001_existing_schema.sql', '0002_new_stage16_tables.sql', '0003_stage19_tables.sql');
  
  -- Contar tabelas
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('drop_cache', 'job_logs', 'job_schedule', 'jobs', 'job_schedules');
  
  -- Contar índices
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND (indexname LIKE 'idx_drop_cache%' OR indexname LIKE 'idx_job%');
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migrações aplicadas: % / 3', mig_count;
  RAISE NOTICE '✅ Tabelas criadas: % / 5+', table_count;
  RAISE NOTICE '✅ Índices criados: %', index_count;
  RAISE NOTICE '';
  
  IF mig_count >= 3 AND table_count >= 3 THEN
    RAISE NOTICE '🎉 TUDO CERTO! Sistema pronto para uso!';
  ELSE
    RAISE NOTICE '⚠️  ATENÇÃO: Algumas migrações/tabelas podem estar faltando';
  END IF;
  
  RAISE NOTICE '';
END $$;
