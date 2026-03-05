-- Gestão de freelancers: perfis, timers, time entries e pagamentos

-- Perfis de freelancer (ligados a edro_users com role='staff')
CREATE TABLE IF NOT EXISTS freelancer_profiles (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES edro_users(id) ON DELETE CASCADE,
  display_name     TEXT NOT NULL,
  specialty        TEXT,              -- 'copy', 'design', 'video', 'revisao'
  hourly_rate_brl  NUMERIC(10,2),     -- NULL = projeto flat-fee
  pix_key          TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS freelancer_profiles_user_id_idx ON freelancer_profiles(user_id);

-- Sessões de timer ativas (máx. 1 por freelancer por briefing)
CREATE TABLE IF NOT EXISTS active_timers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  briefing_id   UUID NOT NULL REFERENCES edro_briefings(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (freelancer_id, briefing_id)
);

-- Entradas de horas registradas
CREATE TABLE IF NOT EXISTS time_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  briefing_id   UUID NOT NULL REFERENCES edro_briefings(id) ON DELETE CASCADE,
  started_at    TIMESTAMPTZ NOT NULL,
  ended_at      TIMESTAMPTZ NOT NULL,
  minutes       INTEGER NOT NULL,    -- calculado na inserção: EXTRACT(EPOCH FROM ended_at - started_at)/60
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS time_entries_freelancer_idx ON time_entries(freelancer_id, started_at);
CREATE INDEX IF NOT EXISTS time_entries_briefing_idx   ON time_entries(briefing_id);

-- Lançamentos de pagamento mensais
CREATE TABLE IF NOT EXISTS freelancer_payables (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freelancer_id UUID NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  period_month  TEXT NOT NULL,           -- 'YYYY-MM'
  total_minutes INTEGER,                 -- NULL para flat-fee
  flat_fee_brl  NUMERIC(10,2),           -- NULL para hourly
  amount_brl    NUMERIC(10,2) NOT NULL,
  status        TEXT NOT NULL DEFAULT 'open',  -- 'open' | 'paid'
  paid_at       TIMESTAMPTZ,
  notes         TEXT,
  pdf_url       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (freelancer_id, period_month)
);

-- Atribuição de freelancers a briefings (complementa traffic_owner texto)
ALTER TABLE edro_briefings
  ADD COLUMN IF NOT EXISTS assignees JSONB NOT NULL DEFAULT '[]';
-- formato: [{ "user_id": "uuid", "display_name": "Ana Souza", "role": "copy" }]
-- traffic_owner (TEXT) mantido para backward compat
