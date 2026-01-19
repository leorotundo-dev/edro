-- 0015_seed_harvest_sources.sql
-- Popula fontes padrão para o motor de harvest/scrapers

CREATE TABLE IF NOT EXISTS harvest_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  base_url TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 5,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO harvest_sources (id, name, base_url, type, enabled, priority, config)
VALUES
  (
    '1a3b96b0-0a8f-4edc-8be0-20d71c4d0f7d',
    'Cebraspe Concursos',
    'https://www.cebraspe.org.br/',
    'teoria',
    true,
    9,
    '{
      "seed_urls": [
        "https://www.cebraspe.org.br/concursos/",
        "https://www.cebraspe.org.br/concursos/?portal=1"
      ],
      "paths": [
        "/concursos/",
        "/concursos/?portal=1"
      ]
    }'::jsonb
  ),
  (
    '50e0a237-0d38-425f-9729-2efe3b63f3e2',
    'FGV Conhecimento',
    'https://conhecimento.fgv.br/concursos',
    'teoria',
    true,
    8,
    '{
      "seed_urls": [
        "https://conhecimento.fgv.br/concursos"
      ],
      "paths": [
        "/concursos",
        "/concursos?field_situacao_tid=1"
      ]
    }'::jsonb
  ),
  (
    '9a8397e5-1b82-4f2f-9683-d8afad9dca7e',
    'Instituto AOCP',
    'https://www.institutoaocp.org.br/',
    'teoria',
    true,
    7,
    '{
      "seed_urls": [
        "https://www.institutoaocp.org.br/concursos.jsp"
      ],
      "paths": [
        "/concursos.jsp",
        "/inscricoes.jsp"
      ]
    }'::jsonb
  ),
  (
    'd8a848d0-8876-4a8e-9f84-0cd13c37012d',
    'Vunesp',
    'https://www.vunesp.com.br/',
    'teoria',
    true,
    7,
    '{
      "seed_urls": [
        "https://www.vunesp.com.br/Concursos"
      ],
      "paths": [
        "/Concursos",
        "/MaisRecentes"
      ]
    }'::jsonb
  )
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  base_url = EXCLUDED.base_url,
  type = EXCLUDED.type,
  enabled = EXCLUDED.enabled,
  priority = EXCLUDED.priority,
  config = EXCLUDED.config,
  updated_at = NOW();
