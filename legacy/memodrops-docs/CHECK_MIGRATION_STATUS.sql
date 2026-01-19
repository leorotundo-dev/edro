-- ==========================================
-- VERIFICAR STATUS DAS MIGRAÇÕES
-- ==========================================
-- Execute isso no Railway Query Editor
-- ==========================================

\echo '================================'
\echo '  STATUS DAS MIGRAÇÕES'
\echo '================================'
\echo ''

-- 1. Verificar quais migrações foram aplicadas
\echo '📋 MIGRAÇÕES APLICADAS:'
\echo ''
SELECT 
  name,
  to_char(run_at, 'YYYY-MM-DD HH24:MI:SS') as executada_em
FROM schema_migrations 
ORDER BY name;

\echo ''
\echo '================================'

-- 2. Checar se as 12 migrações estão aplicadas
SELECT 
  CASE 
    WHEN COUNT(*) = 12 THEN '✅ TODAS AS 12 MIGRAÇÕES APLICADAS!'
    WHEN COUNT(*) >= 10 THEN '⚠️  ' || COUNT(*) || ' de 12 migrações aplicadas - FALTAM ALGUMAS'
    ELSE '❌ APENAS ' || COUNT(*) || ' de 12 migrações aplicadas - PROBLEMA!'
  END as status,
  COUNT(*) as total_aplicadas
FROM schema_migrations
WHERE name LIKE '00%';

\echo ''
\echo '================================'
\echo '  TABELAS IMPORTANTES'
\echo '================================'
\echo ''

-- 3. Verificar tabelas críticas
\echo '📊 TABELAS DO SISTEMA:'
\echo ''
SELECT 
  t.table_name,
  '✅' as status
FROM (
  VALUES 
    ('drop_cache'),
    ('job_logs'),
    ('job_schedule'),
    ('jobs'),
    ('harvest_sources'),
    ('questions'),
    ('simulados'),
    ('user_srs_cards'),
    ('user_progress'),
    ('mnemonics')
) AS expected(table_name)
LEFT JOIN information_schema.tables t 
  ON t.table_name = expected.table_name 
  AND t.table_schema = 'public'
WHERE t.table_name IS NOT NULL
ORDER BY t.table_name;

\echo ''
\echo '================================'
\echo '  VERIFICAR COLUNA PROBLEMÁTICA'
\echo '================================'
\echo ''

-- 4. Verificar se drop_cache tem 'hash' ou 'cache_key'
\echo '🔍 COLUNAS EM DROP_CACHE:'
\echo ''
SELECT 
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'hash' THEN '✅ CORRETO (migração 0003 aplicada)'
    WHEN column_name = 'cache_key' THEN '❌ INCORRETO (precisa rodar FIX)'
    ELSE ''
  END as status
FROM information_schema.columns 
WHERE table_name = 'drop_cache'
  AND column_name IN ('hash', 'cache_key')
ORDER BY column_name;

\echo ''
\echo '================================'
\echo '  RESUMO FINAL'
\echo '================================'
\echo ''

-- 5. Resumo executivo
DO $$
DECLARE
  mig_count INTEGER;
  has_hash BOOLEAN;
  has_cache_key BOOLEAN;
  table_count INTEGER;
BEGIN
  -- Contar migrações
  SELECT COUNT(*) INTO mig_count 
  FROM schema_migrations 
  WHERE name LIKE '00%';
  
  -- Verificar coluna problemática
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drop_cache' AND column_name = 'hash'
  ) INTO has_hash;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'drop_cache' AND column_name = 'cache_key'
  ) INTO has_cache_key;
  
  -- Contar tabelas importantes
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
    AND table_name IN ('drop_cache', 'job_logs', 'job_schedule', 'questions', 'simulados', 'user_srs_cards', 'mnemonics');
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 MIGRAÇÕES: % de 12 aplicadas', mig_count;
  RAISE NOTICE '📊 TABELAS: % tabelas importantes criadas', table_count;
  RAISE NOTICE '';
  
  IF has_hash THEN
    RAISE NOTICE '✅ COLUNA: drop_cache.hash EXISTE (0003 aplicada corretamente)';
  ELSIF has_cache_key THEN
    RAISE NOTICE '❌ COLUNA: drop_cache.cache_key EXISTE (precisa aplicar FIX_MIGRATION_0003.sql)';
  ELSE
    RAISE NOTICE '⚠️  COLUNA: Nenhuma das duas existe (tabela pode não estar criada)';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '================================';
  
  IF mig_count = 12 AND has_hash AND table_count >= 7 THEN
    RAISE NOTICE '🎉 TUDO PERFEITO!';
    RAISE NOTICE 'Todas as 12 migrações aplicadas com sucesso!';
  ELSIF mig_count >= 10 AND has_hash THEN
    RAISE NOTICE '✅ QUASE LÁ!';
    RAISE NOTICE 'Faltam % migrações. Reinicie o backend para aplicá-las.', (12 - mig_count);
  ELSIF has_cache_key THEN
    RAISE NOTICE '⚠️  AÇÃO NECESSÁRIA!';
    RAISE NOTICE 'Execute FIX_MIGRATION_0003.sql no Railway Query Editor';
    RAISE NOTICE 'Depois reinicie o backend';
  ELSE
    RAISE NOTICE '❌ PROBLEMA DETECTADO!';
    RAISE NOTICE 'Apenas % migrações aplicadas', mig_count;
    RAISE NOTICE 'Me envie estes resultados para eu te ajudar';
  END IF;
  
  RAISE NOTICE '================================';
  RAISE NOTICE '';
END $$;
