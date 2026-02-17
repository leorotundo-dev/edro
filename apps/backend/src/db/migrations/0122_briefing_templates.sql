-- Briefing templates for quick briefing creation
CREATE TABLE IF NOT EXISTS edro_briefing_templates (
  id TEXT PRIMARY KEY DEFAULT 'tpl_' || substr(gen_random_uuid()::text, 1, 12),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'social',
  objective TEXT,
  target_audience TEXT,
  channels TEXT[] DEFAULT '{}',
  additional_notes TEXT,
  platform_config JSONB DEFAULT '{}',
  is_system BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_briefing_templates_tenant ON edro_briefing_templates(tenant_id);

-- Seed default system templates
INSERT INTO edro_briefing_templates (id, tenant_id, name, category, objective, target_audience, channels, additional_notes, is_system)
VALUES
  ('tpl_lancamento', '00000000-0000-0000-0000-000000000000', 'Campanha de Lançamento', 'launch', 'Lançar produto ou serviço novo, gerando awareness e conversão', 'Público geral + base de clientes existente', '{instagram,facebook,linkedin,email}', 'Incluir contagem regressiva e teaser antes do lançamento. Priorizar vídeo curto e carrossel.', true),
  ('tpl_social_semanal', '00000000-0000-0000-0000-000000000000', 'Post Semanal Redes Sociais', 'social', 'Manter presença digital constante e engajamento orgânico', 'Seguidores atuais e potenciais', '{instagram,facebook,linkedin}', 'Alternar entre formatos: imagem, carrossel, reels. Incluir CTA em cada post.', true),
  ('tpl_trafego_pago', '00000000-0000-0000-0000-000000000000', 'Campanha de Tráfego Pago', 'ads', 'Gerar leads qualificados ou vendas diretas via anúncios', 'Público segmentado por interesse e comportamento', '{meta_ads,google_ads}', 'Criar variações A/B de headline e CTA. Definir budget e período da campanha.', true),
  ('tpl_newsletter', '00000000-0000-0000-0000-000000000000', 'Newsletter Mensal', 'email', 'Nutrir base de contatos com conteúdo relevante e ofertas', 'Base de emails opt-in', '{email}', 'Estrutura: 1 destaque, 2-3 notícias, 1 CTA principal. Tom informativo e acessível.', true),
  ('tpl_sazonal', '00000000-0000-0000-0000-000000000000', 'Campanha Sazonal / Datas Comemorativas', 'seasonal', 'Capitalizar datas comerciais com ofertas e conteúdo temático', 'Público geral + clientes fiéis', '{instagram,facebook,email,meta_ads}', 'Adaptar identidade visual à data. Criar senso de urgência com deadline da promoção.', true)
ON CONFLICT (id) DO NOTHING;
