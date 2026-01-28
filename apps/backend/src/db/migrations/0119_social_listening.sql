CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SOCIAL LISTENING KEYWORDS
-- ============================================================
CREATE TABLE IF NOT EXISTS social_listening_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NULL REFERENCES clients(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  category TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS social_listening_keywords_unique
  ON social_listening_keywords (tenant_id, client_id, keyword);

CREATE INDEX IF NOT EXISTS social_listening_keywords_active
  ON social_listening_keywords (tenant_id, is_active, client_id);

-- ============================================================
-- SOCIAL LISTENING MENTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS social_listening_mentions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NULL REFERENCES clients(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL,
  external_id TEXT NOT NULL,
  content TEXT NOT NULL,
  author TEXT NULL,
  author_followers INT NULL,
  author_verified BOOLEAN NOT NULL DEFAULT false,
  engagement_likes INT NOT NULL DEFAULT 0,
  engagement_comments INT NOT NULL DEFAULT 0,
  engagement_shares INT NOT NULL DEFAULT 0,
  engagement_views INT NOT NULL DEFAULT 0,
  sentiment TEXT NOT NULL DEFAULT 'neutral',
  sentiment_score INT NOT NULL DEFAULT 50,
  keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  url TEXT NULL,
  language TEXT NULL,
  country TEXT NULL,
  published_at TIMESTAMPTZ NULL,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS social_listening_mentions_unique
  ON social_listening_mentions (tenant_id, platform, external_id);

CREATE INDEX IF NOT EXISTS social_listening_mentions_keyword
  ON social_listening_mentions (tenant_id, keyword);

CREATE INDEX IF NOT EXISTS social_listening_mentions_published
  ON social_listening_mentions (tenant_id, published_at DESC);

CREATE INDEX IF NOT EXISTS social_listening_mentions_sentiment
  ON social_listening_mentions (tenant_id, sentiment);

-- ============================================================
-- SOCIAL LISTENING TRENDS
-- ============================================================
CREATE TABLE IF NOT EXISTS social_listening_trends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id TEXT NULL REFERENCES clients(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,
  platform TEXT NOT NULL,
  mention_count INT NOT NULL DEFAULT 0,
  positive_count INT NOT NULL DEFAULT 0,
  negative_count INT NOT NULL DEFAULT 0,
  neutral_count INT NOT NULL DEFAULT 0,
  total_engagement INT NOT NULL DEFAULT 0,
  average_sentiment INT NOT NULL DEFAULT 50,
  related_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_authors JSONB NOT NULL DEFAULT '[]'::jsonb,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_listening_trends_lookup
  ON social_listening_trends (tenant_id, keyword, platform, created_at DESC);
