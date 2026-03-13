-- Cache de análise visual por cliente (Instagram, library, external)
CREATE TABLE IF NOT EXISTS client_visual_style (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       TEXT NOT NULL,
  client_id       TEXT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  source          TEXT NOT NULL DEFAULT 'instagram',  -- instagram | library | external

  -- Padrões extraídos via Claude Vision
  dominant_colors TEXT[],          -- hex codes extraídos dos posts
  color_harmony   TEXT,            -- complementary | analogous | monochromatic | triadic
  photo_style     TEXT,            -- lifestyle | product | editorial | flat_lay | candid | studio
  composition     TEXT,            -- centered | rule_of_thirds | asymmetric | minimal | busy
  mood            TEXT,            -- warm | cool | vibrant | muted | dark | bright
  typography_style TEXT,           -- modern_sans | classic_serif | bold_display | handwritten | none
  text_placement  TEXT,            -- overlay | separate | minimal_text | heavy_text

  -- Referências analisadas
  sample_urls     TEXT[],          -- URLs dos posts/imagens analisados
  sample_count    INT DEFAULT 0,

  -- Síntese final (prompt-ready, ~300 palavras)
  style_summary   TEXT NOT NULL,

  analyzed_at     TIMESTAMPTZ DEFAULT now(),
  expires_at      TIMESTAMPTZ DEFAULT now() + INTERVAL '14 days'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_client_visual_style_client_source
  ON client_visual_style(client_id, source);

CREATE INDEX IF NOT EXISTS idx_client_visual_style_expires
  ON client_visual_style(expires_at);
