-- 0208: DarkFunnelEvent — captura de sinais invisíveis de atribuição
--
-- Registra tudo que acontece fora dos cliques rastreáveis:
-- leads que dizem "vi num grupo de WhatsApp", "alguém me mandou no Slack", etc.
--
-- Fonte: formulários de lead, notas de reunião comercial, respostas de e-mail.

CREATE TABLE IF NOT EXISTS dark_funnel_events (
  id               UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID         NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id        TEXT         NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Como o sinal foi capturado
  source_type      TEXT         NOT NULL
                   CHECK (source_type IN (
                     'form_field',       -- campo "Como chegou até nós?" em formulário
                     'sales_call_note',  -- anotação durante chamada comercial
                     'crm_custom_field', -- campo customizado no CRM
                     'email_reply'       -- parsing de resposta de e-mail
                   )),

  -- Texto bruto capturado (ex: "vi num grupo de WhatsApp")
  raw_text         TEXT         NOT NULL,

  -- Canal inferido automaticamente pelo parser
  parsed_channel   TEXT
                   CHECK (parsed_channel IN (
                     'whatsapp', 'slack', 'teams',
                     'email_forward', 'linkedin', 'instagram',
                     'unknown_group', 'direct', 'other'
                   )),

  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),

  -- IDs de conteúdos relacionados (campaign_format.id ou copy_version.id)
  related_content_ids TEXT[]    NOT NULL DEFAULT '{}',

  -- Estágio da jornada em que o sinal ocorreu
  journey_stage    TEXT
                   CHECK (journey_stage IN (
                     'first_touch_dark',   -- primeiro contato via dark social
                     'middle_touch_dark',  -- nutrição / consideração invisível
                     'last_touch_dark'     -- última interação antes de converter
                   )),

  notes            TEXT,
  recorded_by      TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dark_funnel_client
  ON dark_funnel_events (tenant_id, client_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_dark_funnel_channel
  ON dark_funnel_events (tenant_id, parsed_channel)
  WHERE parsed_channel IS NOT NULL;
