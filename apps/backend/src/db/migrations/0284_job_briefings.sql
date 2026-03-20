-- Job Briefing System: structured briefing linked to a job
-- Pre-fills from client profile; asks only job-specific data.
-- When approved, triggers automation_status = 'copy_pending'.

CREATE TABLE IF NOT EXISTS job_briefings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id              UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  tenant_id           TEXT NOT NULL,
  client_id           TEXT NOT NULL REFERENCES clients(id),

  -- Bloco 2: Contexto (por que este job existe agora)
  context_trigger     TEXT,
  -- lançamento_produto | ativacao_sazonalidade | oportunidade_tendencia
  -- demanda_cliente | estrategia_proativa | crise_reputacao

  consumer_moment     TEXT,
  -- descobrindo_problema | comparando_solucoes | decidindo_compra
  -- ja_cliente_upsell | pos_compra_retencao

  main_risk           TEXT,
  -- mensagem_generica | publico_errado | timing_incorreto
  -- tom_inadequado | saturacao_formato

  -- Bloco 3: Objetivo
  main_objective      TEXT,
  -- reconhecimento | engajamento | conversao | performance | mix

  success_metrics     TEXT[],
  -- taxa_salvamento | ctr | leads | alcance | engajamento | vendas

  -- Bloco 4: Público — seleciona entre clusters calculados + barreiras
  target_cluster_ids  UUID[],
  -- UUIDs de client_behavior_profiles rows

  specific_barriers   TEXT[],
  -- preco_alto | nao_conhece_marca | momento_errado
  -- nao_percebe_valor | concorrente_preferido | excesso_informacao

  -- Bloco 5: A Mensagem
  message_structure   TEXT,
  -- prova_social | transformacao | contraste | urgencia
  -- curiosidade | storytelling | dado_surpreendente

  desired_emotion     TEXT[],
  -- confianca | pertencimento | urgencia | admiracao
  -- alivio | inspiracao | divertimento | nostalgia

  desired_amd         TEXT,
  -- salvar | clicar | compartilhar | responder | marcar_amigo | proposta_direta

  -- Bloco 6: Tom override (NULL = usa perfil do cliente)
  tone_override       JSONB,
  -- { tone_profile, personality_traits[], formality_level, emoji_usage }

  -- Bloco 7: Restrições regulatórias (marca vem do perfil, não perguntamos)
  regulatory_flags    TEXT[],
  -- linguagem_promocional | produto_financeiro | alimento_bebida
  -- saude_medicamento | infantil | politico | sem_restricoes

  -- Bloco 9: Referências específicas do job
  ref_links           TEXT[],
  ref_notes           TEXT,

  -- Status do briefing
  status              TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
  submitted_at        TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  approved_by         UUID REFERENCES edro_users(id) ON DELETE SET NULL,
  rejection_reason    TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_briefings_job_id
  ON job_briefings(job_id);
-- One briefing per job (replace via UPDATE if draft)

CREATE INDEX IF NOT EXISTS idx_job_briefings_client_id
  ON job_briefings(client_id);

CREATE INDEX IF NOT EXISTS idx_job_briefings_tenant_status
  ON job_briefings(tenant_id, status);

-- Pieces requested in this briefing (Bloco 8)
CREATE TABLE IF NOT EXISTS job_briefing_pieces (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id   UUID NOT NULL REFERENCES job_briefings(id) ON DELETE CASCADE,
  format_type   TEXT NOT NULL,
  -- post_feed | carrossel | reels | stories | copy_legenda | roteiro_video
  -- blog | email | ads_copy | thread | banner | outro

  platform      TEXT,
  -- instagram | linkedin | tiktok | youtube | blog | email | whatsapp

  versions      INT NOT NULL DEFAULT 1 CHECK (versions BETWEEN 1 AND 10),
  priority      TEXT NOT NULL DEFAULT 'media'
    CHECK (priority IN ('alta', 'media', 'baixa')),
  notes         TEXT,
  sort_order    INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_briefing_pieces_briefing
  ON job_briefing_pieces(briefing_id, sort_order);

-- Auto-update updated_at on job_briefings
CREATE OR REPLACE FUNCTION set_job_briefings_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_job_briefings_updated_at ON job_briefings;
CREATE TRIGGER trg_job_briefings_updated_at
BEFORE UPDATE ON job_briefings
FOR EACH ROW EXECUTE FUNCTION set_job_briefings_updated_at();

-- Extend automation_status accepted values (comment only — enforced at app level)
-- New flow: briefing_approved → copy_pending (existing) → copy_done → image_pending → ...
-- Add 'briefing_approved' as a transient marker before copy_pending
COMMENT ON COLUMN jobs.automation_status IS
  'none | briefing_pending | briefing_approved | copy_pending | copy_done | image_pending | image_done | ready_for_review';
