-- 0016_bancas_catalog.sql
-- Catalogo nacional de bancas organizadoras

CREATE TABLE IF NOT EXISTS bancas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT NOT NULL UNIQUE,
  sigla TEXT NOT NULL,
  nome TEXT NOT NULL,
  site TEXT,
  tipo TEXT DEFAULT 'organizadora',
  abrangencia TEXT DEFAULT 'nacional',
  uf TEXT,
  cidade TEXT,
  descricao TEXT,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bancas_sigla ON bancas(sigla);
CREATE INDEX IF NOT EXISTS idx_bancas_nome ON bancas USING GIN (to_tsvector('simple', nome));
CREATE INDEX IF NOT EXISTS idx_bancas_uf ON bancas(uf);

INSERT INTO bancas (slug, sigla, nome, site, tipo, abrangencia, uf, cidade, descricao, tags)
VALUES
  (
    'cebraspe',
    'CEBRASPE',
    'Centro Brasileiro de Pesquisa em Avaliacao e Selecao e de Promocao de Eventos',
    'https://www.cebraspe.org.br',
    'organizadora',
    'nacional',
    'DF',
    'Brasilia',
    'Antigo CESPE/UnB, referencia em provas de certo/errado e concursos federais.',
    ARRAY['certo-errado','federal','alto-nivel']
  ),
  (
    'fcc',
    'FCC',
    'Fundacao Carlos Chagas',
    'https://www.concursosfcc.com.br',
    'organizadora',
    'nacional',
    'SP',
    'Sao Paulo',
    'Tradicional banca paulista com estilo conteudista e provas de multipla escolha.',
    ARRAY['multipla-escolha','conteudista','nacional']
  ),
  (
    'fgv',
    'FGV',
    'Fundacao Getulio Vargas',
    'https://conhecimento.fgv.br/concursos',
    'organizadora',
    'nacional',
    'RJ',
    'Rio de Janeiro',
    'Conhecida por provas interpretativas e concursos fiscais/financeiros.',
    ARRAY['interpretativa','fiscal','financeiro']
  )
ON CONFLICT (slug) DO UPDATE SET
  sigla = EXCLUDED.sigla,
  nome = EXCLUDED.nome,
  site = EXCLUDED.site,
  tipo = EXCLUDED.tipo,
  abrangencia = EXCLUDED.abrangencia,
  uf = EXCLUDED.uf,
  cidade = EXCLUDED.cidade,
  descricao = EXCLUDED.descricao,
  tags = EXCLUDED.tags,
  updated_at = NOW();
