-- Migration 0289: Rich Job Catalog — 4 categories, point weights, PP size
--
-- Architecture:
--   - 1 Ponto = R$ 50,00 (global, same for every client)
--   - Client wallet points = fee × (1 - tax - margin) / 50
--     Ex: R$10k fee, 10% tax, 60% margin → R$3.000 → 60 points/month
--   - Each job consumes point_weight from the client's wallet
--   - Freelancer always sees the BRL value, never the client name

-- ── 1. Rebuild job_size_prices with full catalog ─────────────────────────────
DROP TABLE IF EXISTS job_size_prices CASCADE;

CREATE TABLE job_size_prices (
  id                SERIAL PRIMARY KEY,
  category          TEXT NOT NULL CHECK (category IN ('design','video','copy','management')),
  size              TEXT NOT NULL CHECK (size IN ('PP','P','M','G','GG')),
  label             TEXT NOT NULL,
  description       TEXT NOT NULL,
  ref_price_brl     NUMERIC(10,2) NOT NULL,  -- min (or fixed) freelancer fee
  ref_price_max_brl NUMERIC(10,2),           -- max fee (NULL if fixed price)
  point_weight      NUMERIC(4,2) NOT NULL,   -- points consumed from client wallet
  point_weight_max  NUMERIC(4,2),           -- max points (NULL if fixed)
  is_recurring      BOOLEAN NOT NULL DEFAULT false,
  sort_order        INT NOT NULL DEFAULT 0,
  UNIQUE(category, size)
);

-- ── 2. Insert catalog ────────────────────────────────────────────────────────
INSERT INTO job_size_prices
  (category, size, label, description, ref_price_brl, ref_price_max_brl, point_weight, point_weight_max, is_recurring, sort_order)
VALUES
  -- 🎨 Design e Visual
  ('design','PP','Adaptação',           'Redimensionar arte para outro formato (Feed→Story) ou troca de texto simples',      25.00,    NULL,  0.5,  NULL, false, 1),
  ('design','P', 'Arte Padrão',         'Post Social Media estático simples, arte para e-mail marketing',                   50.00,    NULL,  1.0,  NULL, false, 2),
  ('design','M', 'Arte Complexa',       'Carrossel até 5 telas, manipulação de imagem avançada, arte 3D básica',           100.00,    NULL,  2.0,  NULL, false, 3),
  ('design','G', 'Key Visual',          'Conceito visual de campanha do zero (KV), e-book/apresentação institucional',      300.00,    NULL,  6.0,  NULL, false, 4),
  ('design','GG','Projeto Web/Branding','Landing Page no Figma, Identidade Visual (Logo + Manual de Marca)',                800.00, 1500.00, 16.0, 30.0, false, 5),

  -- 🎬 Vídeo e Motion
  ('video','P','Corte/Edição Simples',      'Reels/TikTok falado até 1 min com legendas dinâmicas básicas',                 75.00,    NULL,  1.5,  NULL, false, 1),
  ('video','M','Motion 2D/Edição Dinâmica', 'Animar arte estática (Motion Design), vídeo YouTube até 10 min com inserções',150.00,    NULL,  3.0,  NULL, false, 2),
  ('video','G','Vídeo Hero/Manifesto',      'Edição complexa, color grading, sound design avançado ou animação 3D',        400.00,  600.00,  8.0, 12.0, false, 3),

  -- ✍️ Copy e Estratégia
  ('copy','P','Copy Express',   'Legendas para 4 posts ou 1 roteiro simples para Reels',                                   50.00,    NULL,  1.0,  NULL, false, 1),
  ('copy','M','Conteúdo Denso', 'Artigo de blog otimizado para SEO ou roteiro completo para vídeo YouTube',               125.00,    NULL,  2.5,  NULL, false, 2),
  ('copy','G','Estratégia',     'Calendário editorial do mês inteiro ou funil completo de e-mails',                        300.00,    NULL,  6.0,  NULL, false, 3),

  -- ⚙️ Gestão e Performance (recorrentes mensais)
  ('management','G', 'Gestão de Tráfego',        'Setup e otimização de campanhas Meta/Google Ads para 1 cliente',         500.00,    NULL, 10.0,  NULL, true,  1),
  ('management','GG','Atendimento/Gestão de Conta','Reuniões com cliente, briefings no sistema, relatórios mensais',       700.00,    NULL, 14.0,  NULL, true,  2);

-- ── 3. Add job_category to jobs ───────────────────────────────────────────────
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS job_category TEXT CHECK (job_category IN ('design','video','copy','management'));

-- ── 4. Extend job_size check to include PP ────────────────────────────────────
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_job_size_check;
ALTER TABLE jobs ADD CONSTRAINT jobs_job_size_check
  CHECK (job_size IN ('PP','P','M','G','GG'));

-- Backfill job_points from the new fractional weights where category is known
-- (falls back to old integer mapping for jobs without category)
UPDATE jobs j
   SET job_points = (
     SELECT point_weight
       FROM job_size_prices jsp
      WHERE jsp.size = j.job_size
        AND jsp.category = j.job_category
      LIMIT 1
   )
 WHERE job_category IS NOT NULL
   AND job_size IS NOT NULL
   AND job_points IS NULL;

-- ── 5. Point value: 1 point = R$50 (global agency constant)
-- Stored as a tenant-level config for future flexibility.
-- For now seeded via the backend default (50.00).
-- No schema change needed — computed as: budget / 50 in the wallet endpoint.
