-- Core schema for Edro (stage 2)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stage 3 - Core content and simple trail
CREATE TABLE IF NOT EXISTS disciplines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  discipline_id UUID NOT NULL REFERENCES disciplines(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  difficulty INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_drops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  last_opened_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, drop_id)
);

-- Stage 4 - SRS básico

CREATE TABLE IF NOT EXISTS srs_cards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  drop_id UUID NOT NULL REFERENCES drops(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'learning',
  interval_days INTEGER NOT NULL DEFAULT 1,
  ease_factor DOUBLE PRECISION NOT NULL DEFAULT 2.5,
  repetition INTEGER NOT NULL DEFAULT 0,
  next_review_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, drop_id)
);

CREATE TABLE IF NOT EXISTS srs_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  card_id UUID NOT NULL REFERENCES srs_cards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  grade INTEGER NOT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Stage 12 - RAG (Retrieval-Augmented Generation)

CREATE TABLE IF NOT EXISTS rag_blocks (
  id SERIAL PRIMARY KEY,
  disciplina TEXT NOT NULL,
  topic_code TEXT NOT NULL,
  banca TEXT,
  source_url TEXT NOT NULL,
  summary TEXT NOT NULL,
  embedding REAL[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rag_blocks_disciplina_topic ON rag_blocks(disciplina, topic_code);

-- Stage 13 - Cache de Drops

CREATE TABLE IF NOT EXISTS drop_cache (
  id SERIAL PRIMARY KEY,
  cache_key TEXT UNIQUE NOT NULL,
  blueprint_id INTEGER NOT NULL,
  topic_code TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_drop_cache_blueprint_topic ON drop_cache(blueprint_id, topic_code);


-- Stage 16 - Harvest e Blueprints de Provas

CREATE TABLE IF NOT EXISTS harvest_items (
  id SERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  raw_html TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS exam_blueprints (
  id SERIAL PRIMARY KEY,
  harvest_item_id INTEGER REFERENCES harvest_items(id),
  exam_code TEXT,
  banca TEXT,
  cargo TEXT,
  disciplina TEXT,
  blueprint JSONB NOT NULL,
  priorities JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_harvest_items_status ON harvest_items(status);
CREATE INDEX IF NOT EXISTS idx_exam_blueprints_disciplina ON exam_blueprints(disciplina);
