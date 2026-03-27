-- 0304_da_knowledge_library.sql
-- Biblioteca estruturada de conhecimento do motor de Direcao de Arte da Edro.

DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector extension not available, DA knowledge embeddings disabled';
END $$;

CREATE TABLE IF NOT EXISTS da_canons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'draft', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_da_canons_scope_slug
  ON da_canons ((COALESCE(tenant_id, 'global')), slug);

CREATE INDEX IF NOT EXISTS idx_da_canons_scope_status
  ON da_canons ((COALESCE(tenant_id, 'global')), status, sort_order);

CREATE TABLE IF NOT EXISTS da_canon_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NULL,
  canon_id UUID NOT NULL REFERENCES da_canons(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  summary_short TEXT NULL,
  summary_medium TEXT NULL,
  summary_long TEXT NULL,
  definition TEXT NOT NULL,
  when_to_use JSONB NOT NULL DEFAULT '[]'::jsonb,
  when_to_avoid JSONB NOT NULL DEFAULT '[]'::jsonb,
  heuristics JSONB NOT NULL DEFAULT '[]'::jsonb,
  critique_checks JSONB NOT NULL DEFAULT '[]'::jsonb,
  examples JSONB NOT NULL DEFAULT '[]'::jsonb,
  related_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  source_confidence NUMERIC(5,2) NOT NULL DEFAULT 0.80,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('active', 'draft', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (canon_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_da_canon_entries_scope_status
  ON da_canon_entries ((COALESCE(tenant_id, 'global')), status, canon_id);

CREATE INDEX IF NOT EXISTS idx_da_canon_entries_canon
  ON da_canon_entries (canon_id, status, title);

CREATE TABLE IF NOT EXISTS da_canon_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NULL,
  entry_id UUID NOT NULL REFERENCES da_canon_entries(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL
    CHECK (source_type IN ('book', 'article', 'course', 'paper', 'site', 'internal', 'manual', 'other')),
  title TEXT NOT NULL,
  author TEXT NULL,
  url TEXT NULL,
  notes TEXT NULL,
  trust_score NUMERIC(5,2) NOT NULL DEFAULT 0.80,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_da_canon_sources_entry
  ON da_canon_sources (entry_id, trust_score DESC);

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS da_canon_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NULL,
    entry_id UUID NOT NULL REFERENCES da_canon_entries(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_type TEXT NOT NULL
      CHECK (chunk_type IN ('definition', 'history', 'heuristic', 'application', 'critique', 'example', 'reference')),
    content TEXT NOT NULL,
    token_estimate INTEGER NULL,
    embedding vector(1536) NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entry_id, chunk_index)
  );
EXCEPTION WHEN OTHERS THEN
  CREATE TABLE IF NOT EXISTS da_canon_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT NULL,
    entry_id UUID NOT NULL REFERENCES da_canon_entries(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_type TEXT NOT NULL
      CHECK (chunk_type IN ('definition', 'history', 'heuristic', 'application', 'critique', 'example', 'reference')),
    content TEXT NOT NULL,
    token_estimate INTEGER NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entry_id, chunk_index)
  );
  RAISE NOTICE 'Created da_canon_chunks without embedding column (vector not available)';
END $$;

CREATE INDEX IF NOT EXISTS idx_da_canon_chunks_entry
  ON da_canon_chunks (entry_id, chunk_type, chunk_index);

CREATE INDEX IF NOT EXISTS idx_da_canon_chunks_scope
  ON da_canon_chunks ((COALESCE(tenant_id, 'global')), chunk_type);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_da_canon_chunks_embedding
    ON da_canon_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'DA canon chunk vector index not created';
END $$;

CREATE TABLE IF NOT EXISTS da_entry_relations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NULL,
  from_entry_id UUID NOT NULL REFERENCES da_canon_entries(id) ON DELETE CASCADE,
  to_entry_id UUID NOT NULL REFERENCES da_canon_entries(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL
    CHECK (relation_type IN ('supports', 'contrasts_with', 'historical_predecessor', 'historical_successor', 'applies_to', 'related_to')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (from_entry_id, to_entry_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_da_entry_relations_from
  ON da_entry_relations (from_entry_id, relation_type);

CREATE INDEX IF NOT EXISTS idx_da_entry_relations_to
  ON da_entry_relations (to_entry_id, relation_type);

CREATE TABLE IF NOT EXISTS da_moodboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NULL,
  canon_id UUID NULL REFERENCES da_canons(id) ON DELETE SET NULL,
  client_id TEXT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NULL,
  scope TEXT NOT NULL DEFAULT 'global'
    CHECK (scope IN ('global', 'client', 'campaign')),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'draft', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_da_moodboards_scope
  ON da_moodboards ((COALESCE(tenant_id, 'global')), scope, status);

CREATE INDEX IF NOT EXISTS idx_da_moodboards_client
  ON da_moodboards (client_id, status);

CREATE TABLE IF NOT EXISTS da_moodboard_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NULL,
  moodboard_id UUID NOT NULL REFERENCES da_moodboards(id) ON DELETE CASCADE,
  reference_id UUID NULL REFERENCES da_references(id) ON DELETE SET NULL,
  entry_id UUID NULL REFERENCES da_canon_entries(id) ON DELETE SET NULL,
  image_url TEXT NULL,
  source_url TEXT NULL,
  file_key TEXT NULL,
  caption TEXT NULL,
  why_it_matters TEXT NULL,
  rank INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'rejected', 'archived')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_da_moodboard_items_board
  ON da_moodboard_items (moodboard_id, status, rank);

CREATE INDEX IF NOT EXISTS idx_da_moodboard_items_reference
  ON da_moodboard_items (reference_id);

INSERT INTO da_canons (tenant_id, slug, title, description, status, sort_order, metadata)
VALUES
  (
    NULL,
    'fundamentos_visuais',
    'Fundamentos da Visao',
    'Percepcao, composicao, hierarquia, grid, cor e linguagem visual que sustentam qualquer peca.',
    'active',
    10,
    '{"pillar":"core","training_order":1}'::jsonb
  ),
  (
    NULL,
    'tipografia',
    'Dominio Tipografico',
    'Familias, tons de voz, legibilidade, psicologia das fontes e uso tipografico em diferentes contextos.',
    'active',
    20,
    '{"pillar":"core","training_order":2}'::jsonb
  ),
  (
    NULL,
    'historia_estilo',
    'Historia e Estilo',
    'Movimentos, escolas e repertorios historicos que moldam direcao de arte, design grafico e cultura visual.',
    'active',
    30,
    '{"pillar":"core","training_order":3}'::jsonb
  ),
  (
    NULL,
    'formatos_aplicacoes',
    'Formatos e Aplicacoes',
    'Aplicacao do criterio visual por midia, formato, objetivo e superficie de uso.',
    'active',
    40,
    '{"pillar":"core","training_order":4}'::jsonb
  ),
  (
    NULL,
    'acessibilidade_critica',
    'Acessibilidade e Critica',
    'Contraste, inclusao, clareza, avaliacao tecnica e feedback para calibrar o julgamento do DA.',
    'active',
    50,
    '{"pillar":"core","training_order":5}'::jsonb
  )
ON CONFLICT ((COALESCE(tenant_id, 'global')), slug)
DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  status = EXCLUDED.status,
  sort_order = EXCLUDED.sort_order,
  metadata = EXCLUDED.metadata,
  updated_at = now();
