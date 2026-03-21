-- Migration 0291: Freelancer Analytics — Ratings, Partners Hub
--
-- Adds:
--   freelancer_briefing_ratings — freelancer rates the quality of each briefing (reverse rating)
--   agency_partners             — B2B partner discounts curated by the agency

-- ── 1. Reverse ratings: freelancer rates briefing quality ─────────────────────
CREATE TABLE IF NOT EXISTS freelancer_briefing_ratings (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id             UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  freelancer_id      UUID NOT NULL REFERENCES freelancer_profiles(id) ON DELETE CASCADE,
  tenant_id          TEXT NOT NULL,
  briefing_quality   INT  NOT NULL CHECK (briefing_quality   BETWEEN 1 AND 5),
  overall_experience INT  NOT NULL CHECK (overall_experience BETWEEN 1 AND 5),
  notes              TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  UNIQUE(job_id, freelancer_id)
);

CREATE INDEX IF NOT EXISTS idx_briefing_ratings_freelancer ON freelancer_briefing_ratings(freelancer_id);
CREATE INDEX IF NOT EXISTS idx_briefing_ratings_job        ON freelancer_briefing_ratings(job_id);
-- Admin insight: average briefing quality per account manager
CREATE INDEX IF NOT EXISTS idx_briefing_ratings_tenant     ON freelancer_briefing_ratings(tenant_id, created_at);

-- ── 2. Agency partners hub — B2B benefits (no CLT-style benefits!) ───────────
CREATE TABLE IF NOT EXISTS agency_partners (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      TEXT NOT NULL,
  category       TEXT NOT NULL CHECK (category IN (
                   'contabilidade', 'software', 'coworking', 'educacao', 'banco', 'outro'
                 )),
  name           TEXT NOT NULL,
  description    TEXT,
  logo_emoji     TEXT DEFAULT '🤝',
  discount_text  TEXT,
  link_url       TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  sort_order     INT DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_partners_tenant ON agency_partners(tenant_id, is_active, sort_order);
