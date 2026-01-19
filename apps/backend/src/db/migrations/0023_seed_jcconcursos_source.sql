-- 0023_seed_jcconcursos_source.sql
-- Seed JC Concursos source for harvest engine

INSERT INTO harvest_sources (id, name, base_url, type, enabled, priority, config)
VALUES (
  '7d3a98f1-0c3b-4a6d-9f2d-6c0a1f123abc',
  'JC Concursos',
  'https://jcconcursos.com.br/concursos/inscricoes-abertas',
  'edital',
  true,
  9,
  '{
    "seed_urls": [
      "https://jcconcursos.com.br/concursos/inscricoes-abertas",
      "https://jcconcursos.com.br/concursos/em-andamento",
      "https://jcconcursos.com.br/concursos/previstos",
      "https://jcconcursos.com.br/concursos/autorizados"
    ],
    "linkPatterns": [
      "jcconcursos.com.br/concurso/"
    ],
    "urlIncludePatterns": [
      "jcconcursos.com.br/concurso/"
    ],
    "allowedDomains": [
      "jcconcursos.com.br"
    ],
    "textIncludePatterns": [
      ".*"
    ],
    "banca": "JC Concursos"
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
