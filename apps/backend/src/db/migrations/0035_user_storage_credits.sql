-- 0035_user_storage_credits.sql
-- Storage por usuario + creditos/limites de uso

CREATE TABLE IF NOT EXISTS plans (
  code VARCHAR(50) PRIMARY KEY,
  name TEXT NOT NULL,
  price_cents INTEGER,
  duration_days INTEGER,
  features JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE plans ADD COLUMN IF NOT EXISTS credits_monthly INTEGER;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS actions_monthly INTEGER;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS storage_limit_mb INTEGER;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS upload_limit_mb INTEGER;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS currency VARCHAR(8) DEFAULT 'BRL';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS interval VARCHAR(16) DEFAULT 'month';
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_product_id TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS stripe_price_id TEXT;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

DO $$
DECLARE
  job_id_type text;
  job_id_clause text;
  create_sql text;
BEGIN
  SELECT data_type INTO job_id_type
  FROM information_schema.columns
  WHERE table_name = 'jobs' AND column_name = 'id';

  IF job_id_type = 'integer' THEN
    job_id_clause := 'INTEGER REFERENCES jobs(id) ON DELETE SET NULL';
  ELSIF job_id_type = 'uuid' THEN
    job_id_clause := 'UUID REFERENCES jobs(id) ON DELETE SET NULL';
  ELSE
    job_id_clause := 'TEXT';
  END IF;

  create_sql := format(
    'CREATE TABLE IF NOT EXISTS user_sources (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      edital_id UUID REFERENCES editais(id) ON DELETE SET NULL,
      type VARCHAR(32) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT ''pending'',
      title TEXT,
      url TEXT,
      s3_key TEXT,
      file_name TEXT,
      content_type TEXT,
      size_bytes BIGINT,
      text_content TEXT,
      metadata JSONB DEFAULT ''{}''::jsonb,
      job_id %s,
      error_message TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      processed_at TIMESTAMPTZ,
      deleted_at TIMESTAMPTZ
    );',
    job_id_clause
  );

  EXECUTE create_sql;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_sources_user ON user_sources(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_sources_edital ON user_sources(edital_id);
CREATE INDEX IF NOT EXISTS idx_user_sources_status ON user_sources(status);

CREATE TABLE IF NOT EXISTS user_credits (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  monthly_remaining INTEGER,
  monthly_reset_at TIMESTAMPTZ,
  actions_used INTEGER NOT NULL DEFAULT 0,
  actions_reset_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_credit_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason VARCHAR(64) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_credit_ledger_user ON user_credit_ledger(user_id, created_at DESC);
