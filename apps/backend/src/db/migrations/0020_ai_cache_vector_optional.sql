-- 0020: Tenta habilitar pgvector e converter ai_cache.embedding para vector(1536) quando possível

DO $$
BEGIN
  -- Criar extensão pgvector se disponível
  BEGIN
    EXECUTE 'CREATE EXTENSION IF NOT EXISTS vector';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Extensão vector não disponível neste Postgres, mantendo embedding como JSONB.';
  END;

  -- Alterar coluna embedding para vector(1536) apenas se o tipo existir
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vector') THEN
    ALTER TABLE ai_cache
      ALTER COLUMN embedding TYPE vector(1536)
      USING NULL::vector(1536);
    RAISE NOTICE 'Coluna embedding convertida para vector(1536). Dados anteriores foram zerados.';
  END IF;
END $$;
