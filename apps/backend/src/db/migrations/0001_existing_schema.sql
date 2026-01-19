-- 0001_existing_schema.sql
-- Migração inicial — representa o schema atual (tabelas já existentes no Railway)
-- Esta migração NÃO cria nada.
-- Ela serve apenas para registrar o estado inicial do projeto no sistema de migrações.

-- Tabelas existentes (Stages 1-4):
-- - users (auth, JWT)
-- - disciplines
-- - drops (com discipline_id, title, content, difficulty)
-- - user_drops (trilha de estudos)
-- - srs_cards (sistema de repetição espaçada)
-- - srs_reviews

-- Tabelas existentes (Stages 12-13):
-- - rag_blocks (com disciplina, topic_code, summary, embedding)
-- - drop_cache (com cache_key, blueprint_id, topic_code, payload)

-- Esta migração será registrada manualmente ou automaticamente
-- pelo sistema de migrações ao detectar que essas tabelas já existem.
