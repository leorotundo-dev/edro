-- 0020_seed_pci_source.sql
-- Seed PCI Concursos source for harvest engine

INSERT INTO harvest_sources (id, name, base_url, type, enabled, priority, config)
VALUES (
  '2b1f0b1d-5b1d-4d80-b32a-3f3d27d5806b',
  'PCI Concursos',
  'https://www.pciconcursos.com.br/noticias/',
  'edital',
  true,
  10,
  '{
    "seed_urls": [
      "https://www.pciconcursos.com.br/noticias/",
      "https://www.pciconcursos.com.br/noticias/nacional/",
      "https://www.pciconcursos.com.br/noticias/sudeste/",
      "https://www.pciconcursos.com.br/noticias/sul/",
      "https://www.pciconcursos.com.br/noticias/norte/",
      "https://www.pciconcursos.com.br/noticias/nordeste/",
      "https://www.pciconcursos.com.br/noticias/centrooeste/",
      "https://www.pciconcursos.com.br/concursos/nacional/",
      "https://www.pciconcursos.com.br/concursos/sudeste/",
      "https://www.pciconcursos.com.br/concursos/sul/",
      "https://www.pciconcursos.com.br/concursos/norte/",
      "https://www.pciconcursos.com.br/concursos/nordeste/",
      "https://www.pciconcursos.com.br/concursos/centrooeste/"
    ],
    "linkPatterns": [
      "pciconcursos.com.br/noticias/"
    ],
    "urlIncludePatterns": [
      "pciconcursos.com.br/noticias/[^/]+/?$"
    ],
    "urlExcludePatterns": [
      "pciconcursos.com.br/noticias/(nacional|sudeste|sul|norte|nordeste|centrooeste)/?$"
    ],
    "allowedDomains": [
      "pciconcursos.com.br"
    ],
    "textExcludePatterns": [
      "apostila",
      "curso"
    ],
    "banca": "PCI Concursos"
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
