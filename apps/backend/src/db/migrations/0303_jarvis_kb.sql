-- Migration 0303: Jarvis KB — memória persistente do JARVIS por cliente e da agência

-- ── KB por cliente ────────────────────────────────────────────────────────────
-- Cada entrada representa um padrão aprendido para um cliente específico.
-- Sintetizado automaticamente a partir de learning_rules + intelligenceEngine.

CREATE TABLE IF NOT EXISTS jarvis_kb_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       TEXT NOT NULL,
  client_id       TEXT REFERENCES clients(id) ON DELETE CASCADE,

  topic           TEXT NOT NULL,         -- ex: "trigger:loss_aversion", "platform:linkedin", "persona:cfo"
  category        TEXT NOT NULL,         -- trigger | platform | amd | persona | dark_funnel | anti_pattern
  content         TEXT NOT NULL,         -- descrição em linguagem natural do padrão
  evidence_level  TEXT NOT NULL DEFAULT 'hypothesis'
                    CHECK (evidence_level IN ('hypothesis','one_case','pattern','rule')),

  uplift_metric   TEXT,                  -- save_rate | click_rate | eng_rate | conversion_rate
  uplift_value    NUMERIC(8,2),          -- % de uplift sobre baseline
  confidence      NUMERIC(4,2),          -- 0.0 a 0.95
  sample_size     INT DEFAULT 1,

  source          TEXT NOT NULL,         -- learning_rules | social | clipping | meeting | reportei | manual
  source_data     JSONB,                 -- dados brutos que geraram esta entrada

  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jarvis_kb_client_idx
  ON jarvis_kb_entries(tenant_id, client_id, category, evidence_level);

CREATE UNIQUE INDEX IF NOT EXISTS jarvis_kb_dedup_idx
  ON jarvis_kb_entries(tenant_id, client_id, topic);

-- ── KB da agência (Cérebro Mãe) ──────────────────────────────────────────────
-- Padrões promovidos quando confirmados em 3+ clientes independentes.
-- Alimenta o JARVIS ao planejar campanhas para qualquer cliente.

CREATE TABLE IF NOT EXISTS jarvis_agency_kb_entries (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       TEXT NOT NULL,

  topic           TEXT NOT NULL,
  category        TEXT NOT NULL,
  content         TEXT NOT NULL,
  evidence_level  TEXT NOT NULL DEFAULT 'pattern'
                    CHECK (evidence_level IN ('pattern','rule')),

  client_count    INT NOT NULL DEFAULT 1,     -- quantos clientes confirmaram
  client_ids      TEXT[] NOT NULL DEFAULT '{}', -- quais clientes
  avg_uplift      NUMERIC(8,2),
  avg_confidence  NUMERIC(4,2),

  promoted_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_validated  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jarvis_agency_kb_tenant_idx
  ON jarvis_agency_kb_entries(tenant_id, category, evidence_level);

CREATE UNIQUE INDEX IF NOT EXISTS jarvis_agency_kb_dedup_idx
  ON jarvis_agency_kb_entries(tenant_id, topic);
