-- SQL para importar feiras e eventos ao calendário 2026
-- Gerado automaticamente

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Agroshow Copagril',
    'agroshow-copagril-marechal-candido-rondon-2026',
    'FEIRA em Marechal Cândido Rondon/PR. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-01-14',
    false,
    'NONE',
    'BR',
    'PR',
    'Marechal Cândido Rondon',
    '{"agronegocio"}',
    '{"agro","tecnologia","sementes"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ExpoPlastripel',
    'expoplastripel-barretos-2026',
    'FEIRA em Barretos/SP. Segmento: VAREJO ALIMENTÍCIO',
    'RETAIL',
    '2026-01-19',
    false,
    'NONE',
    'BR',
    'SP',
    'Barretos',
    '{"varejo"}',
    '{"plásticos","embalagens","varejo"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FIART - Feira Internacional de Artesanato',
    'fiart-feira-internacional-de-artesanato-natal-2026',
    'FEIRA em Natal/RN. Segmento: ARTESANATO',
    'CULTURAL',
    '2026-01-23',
    false,
    'NONE',
    'BR',
    'RN',
    'Natal',
    '{"geral"}',
    '{"artesanato","cultura","design"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Fertilizer LatinoAmericano',
    'fertilizer-latinoamericano-miami-2026',
    'CONGRESSO em Miami/INTERNACIONAL. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-01-26',
    false,
    'NONE',
    'INTL',
    NULL,
    'Miami',
    '{"agronegocio"}',
    '{"fertilizantes","agro","internacional"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'GULFOOD',
    'gulfood-dubai-2026',
    'FEIRA em Dubai/INTERNACIONAL. Segmento: ALIMENTOS',
    'RETAIL',
    '2026-01-26',
    false,
    'NONE',
    'INTL',
    NULL,
    'Dubai',
    '{"alimentos"}',
    '{"alimentos","bebidas","internacional"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Fenin Fashion Gramado',
    'fenin-fashion-gramado-gramado-2026',
    'FEIRA em Gramado/RS. Segmento: MODA',
    'RETAIL',
    '2026-01-27',
    false,
    'NONE',
    'BR',
    'RS',
    'Gramado',
    '{"moda"}',
    '{"moda","vestuário","fashion"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Salão Inspiramais',
    'salao-inspiramais-porto-alegre-2026',
    'FEIRA em Porto Alegre/RS. Segmento: TÊXTIL',
    'INSTITUTIONAL',
    '2026-01-27',
    false,
    'NONE',
    'BR',
    'RS',
    'Porto Alegre',
    '{"tecnologia"}',
    '{"têxtil","moda","design"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ABIMAD''41',
    'abimad-41-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: MÓVEIS E MADEIRA',
    'RETAIL',
    '2026-01-27',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"móveis","madeira","design"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'CIOSP',
    'ciosp-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: ODONTOLOGIA',
    'INSTITUTIONAL',
    '2026-01-28',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"odontologia","saúde","medicina"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'HEALTH INNOVATION FORUM (HIF)',
    'health-innovation-forum-hif-goiania-2026',
    'CONGRESSO em Goiânia/GO. Segmento: SAÚDE',
    'INSTITUTIONAL',
    '2026-01-28',
    false,
    'NONE',
    'BR',
    'GO',
    'Goiânia',
    '{"saude"}',
    '{"saúde","inovação","tecnologia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ABUP SHOW Home · Gift · Têxtil · Decor',
    'abup-show-home-gift-textil-decor-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CASA E DECORAÇÃO',
    'RETAIL',
    '2026-02-02',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"casa","decoração","têxtil","presentes"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FENINJER',
    'feninjer-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: INFANTIL',
    'INSTITUTIONAL',
    '2026-02-02',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"infantil","bebê","brinquedos"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Movelpar Home Show',
    'movelpar-home-show-arapongas-2026',
    'FEIRA em Arapongas/PR. Segmento: MÓVEIS',
    'RETAIL',
    '2026-02-03',
    false,
    'NONE',
    'BR',
    'PR',
    'Arapongas',
    '{"geral"}',
    '{"móveis","casa","decoração"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Feira do Cerrado',
    'feira-do-cerrado-monte-carmelo-2026',
    'FEIRA em Monte Carmelo/MG. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-02-04',
    false,
    'NONE',
    'BR',
    'MG',
    'Monte Carmelo',
    '{"agronegocio"}',
    '{"café","agro","cooperativa"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ABCasa Fair',
    'abcasa-fair-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CASA E DECORAÇÃO',
    'RETAIL',
    '2026-02-08',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"casa","decoração","utilidades"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Show Rural Coopavel',
    'show-rural-coopavel-cascavel-2026',
    'FEIRA em Cascavel/PR. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-02-09',
    false,
    'NONE',
    'BR',
    'PR',
    'Cascavel',
    '{"agronegocio"}',
    '{"agro","tecnologia","maquinário"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Festa Nacional da Uva',
    'festa-nacional-da-uva-caxias-do-sul-2026',
    'EVENTO CULTURAL em Caxias do Sul/RS. Segmento: CULTURAL',
    'INSTITUTIONAL',
    '2026-02-19',
    false,
    'NONE',
    'BR',
    'RS',
    'Caxias do Sul',
    '{"geral"}',
    '{"cultura","vinho","gastronomia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'LACTE',
    'lacte-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: TURISMO',
    'SEASONAL',
    '2026-02-23',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"turismo"}',
    '{"turismo","viagens","eventos"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Marmomac Brazil',
    'marmomac-brazil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ROCHAS E MÁRMORES',
    'INSTITUTIONAL',
    '2026-02-24',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"rochas","mármores","construção"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Show Tecnológico Copercampos',
    'show-tecnologico-copercampos-campos-novos-2026',
    'FEIRA em Campos Novos/SC. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-02-24',
    false,
    'NONE',
    'BR',
    'SC',
    'Campos Novos',
    '{"agronegocio"}',
    '{"agro","tecnologia","sementes"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Febratêxtil',
    'febratextil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: TÊXTIL',
    'INSTITUTIONAL',
    '2026-02-24',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"têxtil","moda","confecção"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ABRIN',
    'abrin-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: BRINQUEDOS',
    'INSTITUTIONAL',
    '2026-03-01',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"brinquedos","infantil","jogos"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FIMEC',
    'fimec-novo-hamburgo-2026',
    'FEIRA em Novo Hamburgo/RS. Segmento: CALÇADOS',
    'INSTITUTIONAL',
    '2026-03-03',
    false,
    'NONE',
    'BR',
    'RS',
    'Novo Hamburgo',
    '{"geral"}',
    '{"calçados","couro","moda"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'SIMASP',
    'simasp-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: AUTOMOTIVO',
    'RETAIL',
    '2026-03-04',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia","automotivo"}',
    '{"automotivo","peças","manutenção"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Festival DW! Semana de Design de São Paulo',
    'festival-dw-semana-de-design-de-sao-paulo-sao-paulo-2026',
    'EVENTO em São Paulo/SP. Segmento: DESIGN',
    'INSTITUTIONAL',
    '2026-03-05',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"design","arquitetura","criatividade"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'AgroRosário',
    'agrorosario-correntina-2026',
    'FEIRA em Correntina/BA. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-03-05',
    false,
    'NONE',
    'BR',
    'BA',
    'Correntina',
    '{"agronegocio"}',
    '{"agro","tecnologia","bahia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Expodireto Cotrijal',
    'expodireto-cotrijal-nao-me-toque-2026',
    'FEIRA em Não-Me-Toque/RS. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-03-09',
    false,
    'NONE',
    'BR',
    'RS',
    'Não-Me-Toque',
    '{"agronegocio"}',
    '{"agro","tecnologia","maquinário"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'EXPO REVESTIR',
    'expo-revestir-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CONSTRUÇÃO',
    'INSTITUTIONAL',
    '2026-03-09',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"construcao"}',
    '{"revestimentos","construção","design"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'HAUS DECOR SHOW',
    'haus-decor-show-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: DECORAÇÃO',
    'INSTITUTIONAL',
    '2026-03-09',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"decoração","casa","design"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Salão das Motopeças',
    'salao-das-motopecas-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: AUTOMOTIVO',
    'RETAIL',
    '2026-03-10',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia","automotivo"}',
    '{"motopeças","motocicletas","peças"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Farm Show',
    'farm-show-primavera-do-leste-2026',
    'FEIRA em Primavera do Leste/MT. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-03-10',
    false,
    'NONE',
    'BR',
    'MT',
    'Primavera do Leste',
    '{"agronegocio"}',
    '{"agro","tecnologia","mato grosso"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ABRADILAN Conexão Farma',
    'abradilan-conexao-farma-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: FARMACÊUTICO',
    'INSTITUTIONAL',
    '2026-03-10',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"farmácia","medicamentos","saúde"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Animal Health Expo Fórum',
    'animal-health-expo-forum-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: VETERINÁRIA',
    'INSTITUTIONAL',
    '2026-03-10',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"veterinária","saúde animal","pets"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ABAV TravelSP',
    'abav-travelsp-campinas-2026',
    'FEIRA em Campinas/SP. Segmento: TURISMO',
    'SEASONAL',
    '2026-03-11',
    false,
    'NONE',
    'BR',
    'SP',
    'Campinas',
    '{"turismo"}',
    '{"turismo","viagens","agências"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Smart Summit',
    'smart-summit-rio-de-janeiro-2026',
    'CONGRESSO em Rio de Janeiro/RJ. Segmento: TECNOLOGIA',
    'INSTITUTIONAL',
    '2026-03-12',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"tecnologia"}',
    '{"tecnologia","smart cities","inovação"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Pesca Trade Show',
    'pesca-trade-show-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: PESCA',
    'INSTITUTIONAL',
    '2026-03-12',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"pesca","náutica","esportes"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'South by Southwest (SXSW)',
    'south-by-southwest-sxsw-austin-2026',
    'CONGRESSO em Austin/INTERNACIONAL. Segmento: TECNOLOGIA E CULTURA',
    'INSTITUTIONAL',
    '2026-03-12',
    false,
    'NONE',
    'INTL',
    NULL,
    'Austin',
    '{"tecnologia"}',
    '{"tecnologia","música","cinema","internacional"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Expo Cakes',
    'expo-cakes-rio-de-janeiro-2026',
    'FEIRA em Rio de Janeiro/RJ. Segmento: CONFEITARIA',
    'INSTITUTIONAL',
    '2026-03-13',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"geral"}',
    '{"confeitaria","gastronomia","doces"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'YES Móvel Show São Paulo',
    'yes-movel-show-sao-paulo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: MÓVEIS',
    'RETAIL',
    '2026-03-16',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"móveis","decoração","casa"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ERP Summit',
    'erp-summit-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: TECNOLOGIA',
    'INSTITUTIONAL',
    '2026-03-17',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"erp","software","gestão"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Tecnoagro',
    'tecnoagro-chapadao-do-sul-2026',
    'FEIRA em Chapadão do Sul/MS. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-03-17',
    false,
    'NONE',
    'BR',
    'MS',
    'Chapadão do Sul',
    '{"agronegocio"}',
    '{"agro","tecnologia","mato grosso do sul"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'SRE Trade Show',
    'sre-trade-show-rio-de-janeiro-2026',
    'FEIRA em Rio de Janeiro/RJ. Segmento: IMOBILIÁRIO',
    'INSTITUTIONAL',
    '2026-03-17',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"geral"}',
    '{"imóveis","construção","mercado"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'MERCOAGRO',
    'mercoagro-chapeco-2026',
    'FEIRA em Chapecó/SC. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-03-17',
    false,
    'NONE',
    'BR',
    'SC',
    'Chapecó',
    '{"agronegocio"}',
    '{"agro","tecnologia","santa catarina"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    '108ª BIJOIAS',
    '108-bijoias-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: JOIAS',
    'INSTITUTIONAL',
    '2026-03-17',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"joias","bijuterias","acessórios"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Artesanal Sul',
    'artesanal-sul-porto-alegre-2026',
    'FEIRA em Porto Alegre/RS. Segmento: ARTESANATO',
    'CULTURAL',
    '2026-03-18',
    false,
    'NONE',
    'BR',
    'RS',
    'Porto Alegre',
    '{"geral"}',
    '{"artesanato","cultura","design"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'CONFEITAR EXPO',
    'confeitar-expo-recife-2026',
    'FEIRA em Recife/PE. Segmento: CONFEITARIA',
    'INSTITUTIONAL',
    '2026-03-19',
    false,
    'NONE',
    'BR',
    'PE',
    'Recife',
    '{"geral"}',
    '{"confeitaria","gastronomia","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FEMAGRI',
    'femagri-guaxupe-2026',
    'FEIRA em Guaxupé/MG. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-03-19',
    false,
    'NONE',
    'BR',
    'MG',
    'Guaxupé',
    '{"agronegocio"}',
    '{"agro","tecnologia","minas gerais"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'EFN- EXPO FRANQUIAS NORDESTE',
    'efn-expo-franquias-nordeste-recife-2026',
    'FEIRA em Recife/PE. Segmento: FRANQUIAS',
    'INSTITUTIONAL',
    '2026-03-19',
    false,
    'NONE',
    'BR',
    'PE',
    'Recife',
    '{"geral"}',
    '{"franquias","negócios","empreendedorismo"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Íntimi Expo',
    'intimi-expo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: MODA ÍNTIMA',
    'RETAIL',
    '2026-03-20',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia","moda"}',
    '{"moda íntima","lingerie","moda"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Congress Brazil Mobile & Expo',
    'congress-brazil-mobile-expo-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: TELECOMUNICAÇÕES',
    'INSTITUTIONAL',
    '2026-03-20',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"telecom","mobile","tecnologia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Show Safra',
    'show-safra-lucas-do-rio-verde-2026',
    'FEIRA em Lucas do Rio Verde/MT. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-03-23',
    false,
    'NONE',
    'BR',
    'MT',
    'Lucas do Rio Verde',
    '{"agronegocio"}',
    '{"agro","tecnologia","mato grosso"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'SNEC PV & ES LATAM',
    'snec-pv-es-latam-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ENERGIA SOLAR',
    'INSTITUTIONAL',
    '2026-03-24',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"energia solar","sustentabilidade","tecnologia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Fruit Attraction São Paulo',
    'fruit-attraction-sao-paulo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: FRUTAS',
    'INSTITUTIONAL',
    '2026-03-24',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"frutas","hortaliças","agro"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ExpoPrint Latin America',
    'expoprint-latin-america-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: GRÁFICA',
    'INSTITUTIONAL',
    '2026-03-24',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"gráfica","impressão","comunicação"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Smart City Expo Curitiba',
    'smart-city-expo-curitiba-curitiba-2026',
    'EXPO em Curitiba/PR. Segmento: TECNOLOGIA',
    'INSTITUTIONAL',
    '2026-03-25',
    false,
    'NONE',
    'BR',
    'PR',
    'Curitiba',
    '{"tecnologia"}',
    '{"smart cities","tecnologia","inovação"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'South Summit Brazil',
    'south-summit-brazil-porto-alegre-2026',
    'CONGRESSO em Porto Alegre/RS. Segmento: STARTUPS',
    'INSTITUTIONAL',
    '2026-03-25',
    false,
    'NONE',
    'BR',
    'RS',
    'Porto Alegre',
    '{"geral"}',
    '{"startups","inovação","empreendedorismo"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Expotel',
    'expotel-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: HOTELARIA',
    'INSTITUTIONAL',
    '2026-03-25',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"turismo"}',
    '{"hotelaria","turismo","hospitalidade"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'GEduc',
    'geduc-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: EDUCAÇÃO',
    'INSTITUTIONAL',
    '2026-03-25',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"educacao"}',
    '{"educação","gestão","ensino"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Feira Condo+',
    'feira-condo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CONDOMÍNIOS',
    'INSTITUTIONAL',
    '2026-03-25',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"condomínios","gestão","imóveis"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'NIS – Nutri Ingredients Summit',
    'nis-nutri-ingredients-summit-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: NUTRIÇÃO',
    'INSTITUTIONAL',
    '2026-03-31',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"nutrição","alimentos","saúde"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'AUTOCOM',
    'autocom-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: AUTOMOTIVO',
    'RETAIL',
    '2026-03-31',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia","automotivo"}',
    '{"automotivo","peças","manutenção"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Feira da Loucura por Sapatos',
    'feira-da-loucura-por-sapatos-novo-hamburgo-2026',
    'FEIRA em Novo Hamburgo/RS. Segmento: CALÇADOS',
    'INSTITUTIONAL',
    '2026-04-02',
    false,
    'NONE',
    'BR',
    'RS',
    'Novo Hamburgo',
    '{"geral"}',
    '{"calçados","moda","varejo"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Festival de Cervejas Artesanais',
    'festival-de-cervejas-artesanais-novo-hamburgo-2026',
    'EVENTO em Novo Hamburgo/RS. Segmento: CERVEJA',
    'INSTITUTIONAL',
    '2026-04-02',
    false,
    'NONE',
    'BR',
    'RS',
    'Novo Hamburgo',
    '{"geral"}',
    '{"cerveja","gastronomia","cultura"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Tecnoshow Comigo',
    'tecnoshow-comigo-rio-verde-2026',
    'FEIRA em Rio Verde/GO. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-04-06',
    false,
    'NONE',
    'BR',
    'GO',
    'Rio Verde',
    '{"agronegocio"}',
    '{"agro","tecnologia","goiás"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Anuga Select Brasil',
    'anuga-select-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ALIMENTOS',
    'RETAIL',
    '2026-04-07',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"alimentos"}',
    '{"alimentos","bebidas","gastronomia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'EXPO SUPERMERCADOS',
    'expo-supermercados-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: VAREJO',
    'RETAIL',
    '2026-04-07',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"varejo"}',
    '{"supermercados","varejo","alimentos"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FEICON',
    'feicon-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CONSTRUÇÃO',
    'INSTITUTIONAL',
    '2026-04-07',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"construcao"}',
    '{"construção","materiais","engenharia"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Private Label Brasil',
    'private-label-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: VAREJO',
    'RETAIL',
    '2026-04-07',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"varejo"}',
    '{"marca própria","varejo","produtos"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'RIO ARTES',
    'rio-artes-rio-de-janeiro-2026',
    'FEIRA em Rio de Janeiro/RJ. Segmento: ARTESANATO',
    'CULTURAL',
    '2026-04-08',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"geral"}',
    '{"artesanato","cultura","design"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Expo Óptica Brasil',
    'expo-optica-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ÓPTICA',
    'INSTITUTIONAL',
    '2026-04-08',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"óptica","saúde","oftalmologia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Expogrande',
    'expogrande-campos-grande-2026',
    'FEIRA em Campos Grande/MS. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-04-09',
    false,
    'NONE',
    'BR',
    'MS',
    'Campos Grande',
    '{"agronegocio"}',
    '{"agro","pecuária","mato grosso do sul"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Estética In São Paulo',
    'estetica-in-sao-paulo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: BELEZA',
    'RETAIL',
    '2026-04-11',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"beleza"}',
    '{"beleza","estética","cosméticos"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Yes Móvel Show Goiás',
    'yes-movel-show-goias-goiania-2026',
    'FEIRA em Goiânia/GO. Segmento: MÓVEIS',
    'RETAIL',
    '2026-04-14',
    false,
    'NONE',
    'BR',
    'GO',
    'Goiânia',
    '{"geral"}',
    '{"móveis","decoração","casa"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'LAAD Security Milipol Brazil',
    'laad-security-milipol-brazil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: SEGURANÇA',
    'INSTITUTIONAL',
    '2026-04-14',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"segurança","defesa","tecnologia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'BRAZIL PROMOTION DAY',
    'brazil-promotion-day-sao-paulo-2026',
    'EVENTO em São Paulo/SP. Segmento: PROMOÇÃO',
    'INSTITUTIONAL',
    '2026-04-14',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"promoção","marketing","varejo"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Intermodal South America',
    'intermodal-south-america-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: LOGÍSTICA',
    'INSTITUTIONAL',
    '2026-04-14',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"logística","transporte","supply chain"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Agreste Tex',
    'agreste-tex-caruaru-2026',
    'FEIRA em Caruaru/PE. Segmento: TÊXTIL',
    'INSTITUTIONAL',
    '2026-04-14',
    false,
    'NONE',
    'BR',
    'PE',
    'Caruaru',
    '{"tecnologia"}',
    '{"têxtil","moda","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Parecis SuperAgro',
    'parecis-superagro-campo-novo-do-parecis-2026',
    'FEIRA em Campo Novo do Parecis/MT. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-04-14',
    false,
    'NONE',
    'BR',
    'MT',
    'Campo Novo do Parecis',
    '{"agronegocio"}',
    '{"agro","tecnologia","mato grosso"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'PROTEMINAS',
    'proteminas-belo-horizonte-2026',
    'FEIRA em Belo Horizonte/MG. Segmento: PROTEÍNA ANIMAL',
    'INSTITUTIONAL',
    '2026-04-14',
    false,
    'NONE',
    'BR',
    'MG',
    'Belo Horizonte',
    '{"geral"}',
    '{"proteína","pecuária","agro"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FENAVID',
    'fenavid-belo-horizonte-2026',
    'FEIRA em Belo Horizonte/MG. Segmento: VIDRO',
    'INSTITUTIONAL',
    '2026-04-14',
    false,
    'NONE',
    'BR',
    'MG',
    'Belo Horizonte',
    '{"geral"}',
    '{"vidro","construção","indústria"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Agile Trends GOV',
    'agile-trends-gov-brasilia-2026',
    'CONGRESSO em Brasília/DF. Segmento: TECNOLOGIA',
    'INSTITUTIONAL',
    '2026-04-14',
    false,
    'NONE',
    'BR',
    'DF',
    'Brasília',
    '{"tecnologia"}',
    '{"tecnologia","governo","inovação"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'WTM Latin America',
    'wtm-latin-america-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: TURISMO',
    'SEASONAL',
    '2026-04-14',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"turismo"}',
    '{"turismo","viagens","hospitalidade"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Vtex Day',
    'vtex-day-sao-paulo-2026',
    'EVENTO em São Paulo/SP. Segmento: E-COMMERCE',
    'INSTITUTIONAL',
    '2026-04-16',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"e-commerce","tecnologia","varejo"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'IT Fórum Trancoso',
    'it-forum-trancoso-trancoso-2026',
    'CONGRESSO em Trancoso/BA. Segmento: TECNOLOGIA',
    'INSTITUTIONAL',
    '2026-04-16',
    false,
    'NONE',
    'BR',
    'BA',
    'Trancoso',
    '{"tecnologia"}',
    '{"tecnologia","TI","inovação"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Norte Show',
    'norte-show-sinop-2026',
    'FEIRA em Sinop/MT. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-04-21',
    false,
    'NONE',
    'BR',
    'MT',
    'Sinop',
    '{"agronegocio"}',
    '{"agro","tecnologia","norte"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Heli XP',
    'heli-xp-carapicuiba-2026',
    'EXPO em Carapicuíba/SP. Segmento: AVIAÇÃO',
    'INSTITUTIONAL',
    '2026-04-22',
    false,
    'NONE',
    'BR',
    'SP',
    'Carapicuíba',
    '{"geral"}',
    '{"aviação","helicópteros","aeronáutica"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'COPA – CONGRESSO PAULISTA DE ANESTESIOLOGIA',
    'copa-congresso-paulista-de-anestesiologia-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: MEDICINA',
    'INSTITUTIONAL',
    '2026-04-23',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"medicina","anestesiologia","saúde"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'MTM – Minas Travel Market',
    'mtm-minas-travel-market-belo-horizonte-2026',
    'FEIRA em Belo Horizonte/MG. Segmento: TURISMO',
    'SEASONAL',
    '2026-04-23',
    false,
    'NONE',
    'BR',
    'MG',
    'Belo Horizonte',
    '{"turismo"}',
    '{"turismo","viagens","minas gerais"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Mara Cakes Fair São Paulo',
    'mara-cakes-fair-sao-paulo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CONFEITARIA',
    'INSTITUTIONAL',
    '2026-04-23',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"confeitaria","gastronomia","doces"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Arnold Sports Festival South America',
    'arnold-sports-festival-south-america-sao-paulo-2026',
    'EVENTO em São Paulo/SP. Segmento: ESPORTES',
    'CULTURAL',
    '2026-04-24',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"esportes","fitness","bodybuilding"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Rio Boat Show',
    'rio-boat-show-rio-de-janeiro-2026',
    'FEIRA em Rio de Janeiro/RJ. Segmento: NÁUTICA',
    'INSTITUTIONAL',
    '2026-04-25',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"tecnologia"}',
    '{"náutica","barcos","esportes"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Festival do Cordeiro de Hidrolândia',
    'festival-do-cordeiro-de-hidrolandia-hidrolandia-2026',
    'EVENTO em Hidrolândia/GO. Segmento: GASTRONOMIA',
    'CULTURAL',
    '2026-04-25',
    false,
    'NONE',
    'BR',
    'GO',
    'Hidrolândia',
    '{"alimentos"}',
    '{"gastronomia","cultura","regional"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FIT 0/16',
    'fit-0-16-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: INFANTIL',
    'INSTITUTIONAL',
    '2026-04-26',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"infantil","moda","bebê"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Pueri Expo',
    'pueri-expo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: EDUCAÇÃO INFANTIL',
    'INSTITUTIONAL',
    '2026-04-26',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia","educacao"}',
    '{"educação","infantil","pedagogia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'AGRISHOW',
    'agrishow-ribeirao-preto-2026',
    'FEIRA em Ribeirão Preto/SP. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-04-27',
    false,
    'NONE',
    'BR',
    'SP',
    'Ribeirão Preto',
    '{"agronegocio"}',
    '{"agro","tecnologia","maquinário"}',
    10,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'NEW MEAT BRAZIL',
    'new-meat-brazil-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: PROTEÍNA ALTERNATIVA',
    'INSTITUTIONAL',
    '2026-04-29',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"proteína","alimentos","inovação"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'PLANT-BASED TECH',
    'plant-based-tech-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: ALIMENTOS',
    'RETAIL',
    '2026-04-29',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"alimentos"}',
    '{"alimentos","plant-based","sustentabilidade"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ExpoRaiz – Feira Nacional dos Campistas Raiz',
    'exporaiz-feira-nacional-dos-campistas-raiz-novo-hamburgo-2026',
    'FEIRA em Novo Hamburgo/RS. Segmento: CAMPING',
    'INSTITUTIONAL',
    '2026-04-30',
    false,
    'NONE',
    'BR',
    'RS',
    'Novo Hamburgo',
    '{"geral"}',
    '{"camping","lazer","turismo"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Gamescom LATAM',
    'gamescom-latam-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: GAMES',
    'INSTITUTIONAL',
    '2026-04-30',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"games","tecnologia","entretenimento"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Jornada Paulista de Radiologia – JPR',
    'jornada-paulista-de-radiologia-jpr-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: MEDICINA',
    'INSTITUTIONAL',
    '2026-04-30',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"medicina","radiologia","saúde"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FENASOJA',
    'fenasoja-santa-rosa-2026',
    'FEIRA em Santa Rosa/RS. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-05-01',
    false,
    'NONE',
    'BR',
    'RS',
    'Santa Rosa',
    '{"agronegocio"}',
    '{"agro","soja","tecnologia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FEIARTE',
    'feiarte-curitiba-2026',
    'FEIRA em Curitiba/PR. Segmento: ARTESANATO',
    'CULTURAL',
    '2026-05-01',
    false,
    'NONE',
    'BR',
    'PR',
    'Curitiba',
    '{"geral"}',
    '{"artesanato","cultura","design"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ILTM Latin America',
    'iltm-latin-america-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: TURISMO DE LUXO',
    'SEASONAL',
    '2026-05-04',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"turismo"}',
    '{"turismo","luxo","viagens"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Bett Brasil',
    'bett-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: EDUCAÇÃO E TECNOLOGIA',
    'INSTITUTIONAL',
    '2026-05-05',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia","educacao"}',
    '{"educação","tecnologia","ensino"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FEIMEC',
    'feimec-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: MECÂNICA',
    'INSTITUTIONAL',
    '2026-05-05',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"mecânica","indústria","manufatura"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ForÁgua',
    'foragua-serra-negra-2026',
    'CONGRESSO em Serra Negra/SP. Segmento: SANEAMENTO',
    'INSTITUTIONAL',
    '2026-05-06',
    false,
    'NONE',
    'BR',
    'SP',
    'Serra Negra',
    '{"geral"}',
    '{"saneamento","água","sustentabilidade"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Gramado Summit',
    'gramado-summit-gramado-2026',
    'CONGRESSO em Gramado/RS. Segmento: EMPREENDEDORISMO',
    'INSTITUTIONAL',
    '2026-05-06',
    false,
    'NONE',
    'BR',
    'RS',
    'Gramado',
    '{"geral"}',
    '{"empreendedorismo","inovação","negócios"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Abrint Global Congress',
    'abrint-global-congress-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: TELECOMUNICAÇÕES',
    'INSTITUTIONAL',
    '2026-05-06',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"telecom","internet","tecnologia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Autopar',
    'autopar-pinhais-2026',
    'FEIRA em Pinhais/PR. Segmento: AUTOMOTIVO',
    'RETAIL',
    '2026-05-06',
    false,
    'NONE',
    'BR',
    'PR',
    'Pinhais',
    '{"tecnologia","automotivo"}',
    '{"automotivo","peças","paraná"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Wine South America',
    'wine-south-america-bento-goncalves-2026',
    'FEIRA em Bento Gonçalves/RS. Segmento: VINHOS',
    'INSTITUTIONAL',
    '2026-05-12',
    false,
    'NONE',
    'BR',
    'RS',
    'Bento Gonçalves',
    '{"geral"}',
    '{"vinhos","gastronomia","cultura"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'SINDEPAT Summit',
    'sindepat-summit-rio-de-janeiro-2026',
    'CONGRESSO em Rio de Janeiro/RJ. Segmento: TECNOLOGIA',
    'INSTITUTIONAL',
    '2026-05-12',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"tecnologia"}',
    '{"tecnologia","TI","gestão"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FENAGRA',
    'fenagra-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: GRÁFICA',
    'INSTITUTIONAL',
    '2026-05-12',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"gráfica","impressão","comunicação"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'São Paulo Innovation Week',
    'sao-paulo-innovation-week-sao-paulo-2026',
    'EVENTO em São Paulo/SP. Segmento: INOVAÇÃO',
    'INSTITUTIONAL',
    '2026-05-13',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"inovação","tecnologia","startups"}',
    9,
    4,
    'Pesquisa',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Hospitalar',
    'hospitalar-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: SAÚDE',
    'INSTITUTIONAL',
    '2026-05-19',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"saude"}',
    '{"saúde","hospitalar","equipamentos médicos"}',
    10,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Web Summit Rio',
    'web-summit-rio-rio-de-janeiro-2026',
    'CONGRESSO em Rio de Janeiro/RJ. Segmento: TECNOLOGIA',
    'INSTITUTIONAL',
    '2026-06-08',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"tecnologia"}',
    '{"tecnologia","inovação","startups"}',
    10,
    5,
    'Pesquisa',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Escolar Office Brasil',
    'escolar-office-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: MATERIAL ESCOLAR',
    'INSTITUTIONAL',
    '2026-08-02',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"material escolar","papelaria","educação"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'LABACE',
    'labace-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: AVIAÇÃO',
    'INSTITUTIONAL',
    '2026-08-04',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"aviação","executiva","aeronáutica"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Fi South America',
    'fi-south-america-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: INGREDIENTES',
    'INSTITUTIONAL',
    '2026-08-04',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"ingredientes","alimentos","indústria"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Brazil Promotion',
    'brazil-promotion-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: PROMOÇÃO',
    'INSTITUTIONAL',
    '2026-08-04',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"promoção","marketing","varejo"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'The Brazil Conference & Expo',
    'the-brazil-conference-expo-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: NEGÓCIOS',
    'INSTITUTIONAL',
    '2026-08-04',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"negócios","empreendedorismo","inovação"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'MEC SHOW',
    'mec-show-serra-2026',
    'FEIRA em Serra/ES. Segmento: CONSTRUÇÃO',
    'INSTITUTIONAL',
    '2026-08-04',
    false,
    'NONE',
    'BR',
    'ES',
    'Serra',
    '{"construcao"}',
    '{"construção","materiais","espírito santo"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'SBF – Saúde Business Fórum',
    'sbf-saude-business-forum-a-definir-2026',
    'CONGRESSO em A DEFINIR/BR. Segmento: SAÚDE',
    'INSTITUTIONAL',
    '2026-08-04',
    false,
    'NONE',
    'BR',
    'BR',
    NULL,
    '{"saude"}',
    '{"saúde","gestão","negócios"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Embala Nordeste',
    'embala-nordeste-fortaleza-2026',
    'FEIRA em Fortaleza/CE. Segmento: EMBALAGENS',
    'INSTITUTIONAL',
    '2026-08-04',
    false,
    'NONE',
    'BR',
    'CE',
    'Fortaleza',
    '{"geral"}',
    '{"embalagens","indústria","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Multimodal Nordeste',
    'multimodal-nordeste-recife-2026',
    'FEIRA em Recife/PE. Segmento: LOGÍSTICA',
    'INSTITUTIONAL',
    '2026-08-04',
    false,
    'NONE',
    'BR',
    'PE',
    'Recife',
    '{"tecnologia"}',
    '{"logística","transporte","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Congresso Brasileiro do Agronegócio',
    'congresso-brasileiro-do-agronegocio-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-08-10',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"agronegocio"}',
    '{"agro","negócios","economia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Congresso ANDAV',
    'congresso-andav-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: TURISMO',
    'SEASONAL',
    '2026-08-11',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"turismo"}',
    '{"turismo","viagens","agências"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ExpoLazer & Outdoor Living',
    'expolazer-outdoor-living-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: LAZER',
    'INSTITUTIONAL',
    '2026-08-11',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"lazer","outdoor","piscinas"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'COP International',
    'cop-international-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: PROTEÍNA ANIMAL',
    'INSTITUTIONAL',
    '2026-08-11',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"proteína","pecuária","agro"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Expo-Hospital Brasil',
    'expo-hospital-brasil-belo-horizonte-2026',
    'FEIRA em Belo Horizonte/MG. Segmento: SAÚDE',
    'INSTITUTIONAL',
    '2026-08-11',
    false,
    'NONE',
    'BR',
    'MG',
    'Belo Horizonte',
    '{"saude"}',
    '{"saúde","hospitalar","minas gerais"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Fenasucro & Agrocana',
    'fenasucro-agrocana-sertaozinho-2026',
    'FEIRA em Sertãozinho/SP. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-08-11',
    false,
    'NONE',
    'BR',
    'SP',
    'Sertãozinho',
    '{"agronegocio"}',
    '{"agro","cana","açúcar"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Logistique',
    'logistique-balneario-camboriu-2026',
    'FEIRA em Balneário Camboriú/SC. Segmento: LOGÍSTICA',
    'INSTITUTIONAL',
    '2026-08-11',
    false,
    'NONE',
    'BR',
    'SC',
    'Balneário Camboriú',
    '{"tecnologia"}',
    '{"logística","transporte","santa catarina"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Encatho & Exprotel',
    'encatho-exprotel-florianopolis-2026',
    'FEIRA em Florianópolis/SC. Segmento: HOTELARIA',
    'INSTITUTIONAL',
    '2026-08-11',
    false,
    'NONE',
    'BR',
    'SC',
    'Florianópolis',
    '{"turismo"}',
    '{"hotelaria","turismo","hospitalidade"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Pet South America',
    'pet-south-america-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: PET',
    'INSTITUTIONAL',
    '2026-08-12',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"pet","animais","veterinária"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ABCASA Fair',
    'abcasa-fair-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CASA E DECORAÇÃO',
    'RETAIL',
    '2026-08-12',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"casa","decoração","utilidades"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Travel Next Minas',
    'travel-next-minas-belo-horizonte-2026',
    'FEIRA em Belo Horizonte/MG. Segmento: TURISMO',
    'SEASONAL',
    '2026-08-12',
    false,
    'NONE',
    'BR',
    'MG',
    'Belo Horizonte',
    '{"turismo"}',
    '{"turismo","viagens","minas gerais"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Pet Vet',
    'pet-vet-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: VETERINÁRIA',
    'INSTITUTIONAL',
    '2026-08-12',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"veterinária","saúde animal","pets"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Salão de Arte',
    'salao-de-arte-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ARTE',
    'INSTITUTIONAL',
    '2026-08-13',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"arte","cultura","galerias"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Estética In Sul',
    'estetica-in-sul-curitiba-2026',
    'FEIRA em Curitiba/PR. Segmento: BELEZA',
    'RETAIL',
    '2026-08-15',
    false,
    'NONE',
    'BR',
    'PR',
    'Curitiba',
    '{"beleza"}',
    '{"beleza","estética","sul"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'SET Expo',
    'set-expo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: BROADCAST',
    'INSTITUTIONAL',
    '2026-08-17',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"broadcast","TV","rádio","tecnologia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'MOVELSUL',
    'movelsul-bento-goncalves-2026',
    'FEIRA em Bento Gonçalves/RS. Segmento: MÓVEIS',
    'RETAIL',
    '2026-08-17',
    false,
    'NONE',
    'BR',
    'RS',
    'Bento Gonçalves',
    '{"geral"}',
    '{"móveis","decoração","sul"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Congresso Fenabrave',
    'congresso-fenabrave-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: AUTOMOTIVO',
    'RETAIL',
    '2026-08-17',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia","automotivo"}',
    '{"automotivo","concessionárias","veículos"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Navalshore',
    'navalshore-rio-de-janeiro-2026',
    'FEIRA em Rio de Janeiro/RJ. Segmento: NAVAL',
    'INSTITUTIONAL',
    '2026-08-18',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"geral"}',
    '{"naval","offshore","petróleo"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FEBRATEX',
    'febratex-blumenau-2026',
    'FEIRA em Blumenau/SC. Segmento: TÊXTIL',
    'INSTITUTIONAL',
    '2026-08-18',
    false,
    'NONE',
    'BR',
    'SC',
    'Blumenau',
    '{"tecnologia"}',
    '{"têxtil","moda","tecnologia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FEBRATEX Summit',
    'febratex-summit-blumenau-2026',
    'CONGRESSO em Blumenau/SC. Segmento: TÊXTIL',
    'INSTITUTIONAL',
    '2026-08-18',
    false,
    'NONE',
    'BR',
    'SC',
    'Blumenau',
    '{"tecnologia"}',
    '{"têxtil","moda","negócios"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'CONARH | ABRH',
    'conarh-abrh-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: RECURSOS HUMANOS',
    'INSTITUTIONAL',
    '2026-08-18',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"RH","gestão de pessoas","trabalho"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Jornada Bett Nordeste',
    'jornada-bett-nordeste-recife-2026',
    'CONGRESSO em Recife/PE. Segmento: EDUCAÇÃO',
    'INSTITUTIONAL',
    '2026-08-19',
    false,
    'NONE',
    'BR',
    'PE',
    'Recife',
    '{"educacao"}',
    '{"educação","tecnologia","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'IT Forum Praia do Forte',
    'it-forum-praia-do-forte-praia-do-forte-2026',
    'CONGRESSO em Praia do Forte/BA. Segmento: TECNOLOGIA',
    'INSTITUTIONAL',
    '2026-08-19',
    false,
    'NONE',
    'BR',
    'BA',
    'Praia do Forte',
    '{"tecnologia"}',
    '{"tecnologia","TI","bahia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Festa do Peão de Barretos',
    'festa-do-peao-de-barretos-barretos-2026',
    'EVENTO em Barretos/SP. Segmento: RODEIO',
    'INSTITUTIONAL',
    '2026-08-20',
    false,
    'NONE',
    'BR',
    'SP',
    'Barretos',
    '{"geral"}',
    '{"rodeio","cultura","entretenimento"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FEBRABAN TECH',
    'febraban-tech-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: TECNOLOGIA BANCÁRIA',
    'INSTITUTIONAL',
    '2026-08-24',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"bancos","tecnologia","fintech"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Concrete Show',
    'concrete-show-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CONSTRUÇÃO',
    'INSTITUTIONAL',
    '2026-08-25',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"construcao"}',
    '{"concreto","construção","engenharia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'INTERPLAST',
    'interplast-joinville-2026',
    'FEIRA em Joinville/SC. Segmento: PLÁSTICOS',
    'INSTITUTIONAL',
    '2026-08-25',
    false,
    'NONE',
    'BR',
    'SC',
    'Joinville',
    '{"tecnologia"}',
    '{"plásticos","indústria","tecnologia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'PL Connection',
    'pl-connection-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: MARCA PRÓPRIA',
    'INSTITUTIONAL',
    '2026-08-25',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"marca própria","varejo","produtos"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Cachoeiro Stone Fair',
    'cachoeiro-stone-fair-cachoeiro-de-itapemirim-2026',
    'FEIRA em Cachoeiro de Itapemirim/ES. Segmento: ROCHAS',
    'INSTITUTIONAL',
    '2026-08-25',
    false,
    'NONE',
    'BR',
    'ES',
    'Cachoeiro de Itapemirim',
    '{"geral"}',
    '{"rochas","mármores","granito"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Intersolar South America',
    'intersolar-south-america-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ENERGIA SOLAR',
    'INSTITUTIONAL',
    '2026-08-25',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"energia solar","sustentabilidade","tecnologia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Startup Summit',
    'startup-summit-florianopolis-2026',
    'CONGRESSO em Florianópolis/SC. Segmento: STARTUPS',
    'INSTITUTIONAL',
    '2026-08-26',
    false,
    'NONE',
    'BR',
    'SC',
    'Florianópolis',
    '{"geral"}',
    '{"startups","empreendedorismo","inovação"}',
    9,
    4,
    'Pesquisa',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Fitness Brasil Expo',
    'fitness-brasil-expo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: FITNESS',
    'INSTITUTIONAL',
    '2026-08-27',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"fitness","esportes","saúde"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Mara Cakes Fair Nordeste',
    'mara-cakes-fair-nordeste-recife-2026',
    'FEIRA em Recife/PE. Segmento: CONFEITARIA',
    'INSTITUTIONAL',
    '2026-08-28',
    false,
    'NONE',
    'BR',
    'PE',
    'Recife',
    '{"geral"}',
    '{"confeitaria","gastronomia","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Expointer',
    'expointer-esteio-2026',
    'FEIRA em Esteio/RS. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-08-29',
    false,
    'NONE',
    'BR',
    'RS',
    'Esteio',
    '{"agronegocio"}',
    '{"agro","pecuária","sul"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ISC Brasil',
    'isc-brasil-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: SEGURANÇA',
    'INSTITUTIONAL',
    '2026-09-01',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"segurança","tecnologia","proteção"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Bienal do Livro de São Paulo',
    'bienal-do-livro-de-sao-paulo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: LIVROS',
    'INSTITUTIONAL',
    '2026-09-04',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"livros","literatura","cultura"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ART MUNDI',
    'art-mundi-santos-2026',
    'FEIRA em Santos/SP. Segmento: ARTE',
    'INSTITUTIONAL',
    '2026-09-04',
    false,
    'NONE',
    'BR',
    'SP',
    'Santos',
    '{"geral"}',
    '{"arte","cultura","santos"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Mara Cakes Fair Nordeste',
    'mara-cakes-fair-nordeste-recife-2026',
    'FEIRA em Recife/PE. Segmento: CONFEITARIA',
    'INSTITUTIONAL',
    '2026-09-05',
    false,
    'NONE',
    'BR',
    'PE',
    'Recife',
    '{"geral"}',
    '{"confeitaria","gastronomia","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Beauty Fair',
    'beauty-fair-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: BELEZA',
    'RETAIL',
    '2026-09-05',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"beleza"}',
    '{"beleza","cosméticos","estética"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ExpoPostos & Conveniência',
    'expopostos-conveniencia-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: POSTOS DE COMBUSTÍVEL',
    'INSTITUTIONAL',
    '2026-09-08',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"postos","conveniência","varejo"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Feira Construir Aí',
    'feira-construir-ai-balneario-camboriu-2026',
    'FEIRA em Balneário Camboriú/SC. Segmento: CONSTRUÇÃO',
    'INSTITUTIONAL',
    '2026-09-08',
    false,
    'NONE',
    'BR',
    'SC',
    'Balneário Camboriú',
    '{"construcao"}',
    '{"construção","materiais","santa catarina"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Geronto Fair',
    'geronto-fair-gramado-2026',
    'FEIRA em Gramado/RS. Segmento: GERONTOLOGIA',
    'INSTITUTIONAL',
    '2026-09-09',
    false,
    'NONE',
    'BR',
    'RS',
    'Gramado',
    '{"geral"}',
    '{"gerontologia","saúde","idosos"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Logística do Futuro',
    'logistica-do-futuro-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: LOGÍSTICA',
    'INSTITUTIONAL',
    '2026-09-09',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"logística","supply chain","inovação"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FESQUA',
    'fesqua-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ESQUADRIAS',
    'INSTITUTIONAL',
    '2026-09-09',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"esquadrias","construção","alumínio"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Expolux',
    'expolux-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ILUMINAÇÃO',
    'INSTITUTIONAL',
    '2026-09-15',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"iluminação","design","tecnologia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'YES Móvel Show Campinas',
    'yes-movel-show-campinas-campinas-2026',
    'FEIRA em Campinas/SP. Segmento: MÓVEIS',
    'RETAIL',
    '2026-09-15',
    false,
    'NONE',
    'BR',
    'SP',
    'Campinas',
    '{"geral"}',
    '{"móveis","decoração","campinas"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Welding Show Brasil',
    'welding-show-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: SOLDAGEM',
    'INSTITUTIONAL',
    '2026-09-15',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"soldagem","metalurgia","indústria"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ACAPS Trade Show',
    'acaps-trade-show-serra-2026',
    'FEIRA em Serra/ES. Segmento: AUTOPEÇAS',
    'INSTITUTIONAL',
    '2026-09-15',
    false,
    'NONE',
    'BR',
    'ES',
    'Serra',
    '{"geral"}',
    '{"autopeças","automotivo","espírito santo"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Equipotel',
    'equipotel-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: HOTELARIA',
    'INSTITUTIONAL',
    '2026-09-15',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"turismo"}',
    '{"hotelaria","turismo","hospitalidade"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Intra-Log Expo South America',
    'intra-log-expo-south-america-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: LOGÍSTICA',
    'INSTITUTIONAL',
    '2026-09-15',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"logística","armazenagem","supply chain"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'LABEL & PACK EXPO',
    'label-pack-expo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: EMBALAGENS',
    'INSTITUTIONAL',
    '2026-09-15',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"embalagens","rótulos","indústria"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'INTERFORM',
    'interform-joinville-2026',
    'FEIRA em Joinville/SC. Segmento: FERRAMENTARIA',
    'INSTITUTIONAL',
    '2026-09-15',
    false,
    'NONE',
    'BR',
    'SC',
    'Joinville',
    '{"geral"}',
    '{"ferramentaria","moldes","indústria"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'CHINA HOME LIFE BRASIL',
    'china-home-life-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: UTILIDADES',
    'INSTITUTIONAL',
    '2026-09-16',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"utilidades","casa","importação"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'iFood Move',
    'ifood-move-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: DELIVERY',
    'INSTITUTIONAL',
    '2026-09-16',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"delivery","foodtech","tecnologia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'HIS – Healthcare Innovation Show',
    'his-healthcare-innovation-show-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: SAÚDE',
    'INSTITUTIONAL',
    '2026-09-16',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"saude"}',
    '{"saúde","inovação","tecnologia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Agile Trends',
    'agile-trends-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: TECNOLOGIA',
    'INSTITUTIONAL',
    '2026-09-17',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"tecnologia","agile","gestão"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'CIPRO | EXPOLAB',
    'cipro-expolab-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: LABORATÓRIOS',
    'INSTITUTIONAL',
    '2026-09-17',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"laboratórios","análises","saúde"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ROG.e',
    'rog-e-rio-de-janeiro-2026',
    'FEIRA em Rio de Janeiro/RJ. Segmento: PETRÓLEO E GÁS',
    'INSTITUTIONAL',
    '2026-09-21',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"geral"}',
    '{"petróleo","gás","energia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Paving Expo',
    'paving-expo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: PAVIMENTAÇÃO',
    'INSTITUTIONAL',
    '2026-09-22',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"pavimentação","asfalto","construção"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'CONAREC',
    'conarec-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: REFRIGERAÇÃO',
    'INSTITUTIONAL',
    '2026-09-23',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"refrigeração","ar condicionado","HVAC"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'in-cosmetics Latin America',
    'in-cosmetics-latin-america-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: COSMÉTICOS',
    'INSTITUTIONAL',
    '2026-09-23',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia","beleza"}',
    '{"cosméticos","ingredientes","beleza"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Modern Construction Show',
    'modern-construction-show-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CONSTRUÇÃO',
    'INSTITUTIONAL',
    '2026-09-29',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"construcao"}',
    '{"construção","tecnologia","inovação"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'MinasParts',
    'minasparts-belo-horizonte-2026',
    'FEIRA em Belo Horizonte/MG. Segmento: AUTOPEÇAS',
    'INSTITUTIONAL',
    '2026-09-30',
    false,
    'NONE',
    'BR',
    'MG',
    'Belo Horizonte',
    '{"geral"}',
    '{"autopeças","automotivo","minas gerais"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ABAV EXPO',
    'abav-expo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: TURISMO',
    'SEASONAL',
    '2026-09-30',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"turismo"}',
    '{"turismo","viagens","agências"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Agrominas',
    'agrominas-lambari-do-sul-2026',
    'FEIRA em Lambari do Sul/MG. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-10-01',
    false,
    'NONE',
    'BR',
    'MG',
    'Lambari do Sul',
    '{"agronegocio"}',
    '{"agro","minas gerais","tecnologia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Forcafé',
    'forcafe-lambari-2026',
    'FEIRA em Lambari/MG. Segmento: CAFÉ',
    'INSTITUTIONAL',
    '2026-10-01',
    false,
    'NONE',
    'BR',
    'MG',
    'Lambari',
    '{"geral"}',
    '{"café","agro","minas gerais"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Automotive Business Experience',
    'automotive-business-experience-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: AUTOMOTIVO',
    'RETAIL',
    '2026-10-01',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia","automotivo"}',
    '{"automotivo","negócios","indústria"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ProWine São Paulo',
    'prowine-sao-paulo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: VINHOS',
    'INSTITUTIONAL',
    '2026-10-06',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"vinhos","bebidas","gastronomia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FUTURECOM',
    'futurecom-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: TELECOMUNICAÇÕES',
    'INSTITUTIONAL',
    '2026-10-06',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"telecom","tecnologia","conectividade"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Data Center World Brasil',
    'data-center-world-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: DATA CENTER',
    'INSTITUTIONAL',
    '2026-10-06',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"data center","cloud","infraestrutura"}',
    8,
    4,
    'Pesquisa',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FEBRAVA RIO',
    'febrava-rio-rio-de-janeiro-2026',
    'FEIRA em Rio de Janeiro/RJ. Segmento: REFRIGERAÇÃO',
    'INSTITUTIONAL',
    '2026-10-06',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"geral"}',
    '{"refrigeração","ar condicionado","HVAC"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FISP – FISST',
    'fisp-fisst-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: SEGURANÇA DO TRABALHO',
    'INSTITUTIONAL',
    '2026-10-06',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"segurança","trabalho","EPI"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'EXPO ABTCP',
    'expo-abtcp-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: PAPEL E CELULOSE',
    'INSTITUTIONAL',
    '2026-10-06',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"papel","celulose","indústria"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'MRO BRASIL',
    'mro-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: MANUTENÇÃO AERONÁUTICA',
    'INSTITUTIONAL',
    '2026-10-07',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"aviação","manutenção","MRO"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Congresso SAE BRASIL',
    'congresso-sae-brasil-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: ENGENHARIA AUTOMOTIVA',
    'INSTITUTIONAL',
    '2026-10-07',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"automotivo","engenharia","tecnologia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Brasil Game Show (BGS)',
    'brasil-game-show-bgs-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: GAMES',
    'INSTITUTIONAL',
    '2026-10-09',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"games","entretenimento","tecnologia"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'CONSTRULEV Expo',
    'construlev-expo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CONSTRUÇÃO',
    'INSTITUTIONAL',
    '2026-10-14',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"construcao"}',
    '{"construção","leve","steel frame"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Diabetes On – São Paulo',
    'diabetes-on-sao-paulo-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: SAÚDE',
    'INSTITUTIONAL',
    '2026-10-18',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"saude"}',
    '{"diabetes","saúde","medicina"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Professional Fair RJ',
    'professional-fair-rj-rio-de-janeiro-2026',
    'FEIRA em Rio de Janeiro/RJ. Segmento: BELEZA',
    'RETAIL',
    '2026-10-18',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"beleza"}',
    '{"beleza","estética","profissional"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Feira do Empreendedor do SEBRAE-SP',
    'feira-do-empreendedor-do-sebrae-sp-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: EMPREENDEDORISMO',
    'INSTITUTIONAL',
    '2026-10-19',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"empreendedorismo","negócios","sebrae"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ECO EXPO (Ex-Waste Expo Brasil)',
    'eco-expo-ex-waste-expo-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: SUSTENTABILIDADE',
    'INSTITUTIONAL',
    '2026-10-20',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"sustentabilidade","reciclagem","meio ambiente"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FENASAN',
    'fenasan-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: SANEAMENTO',
    'INSTITUTIONAL',
    '2026-10-20',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"saneamento","meio ambiente","água"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'HIGIEXPO',
    'higiexpo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: LIMPEZA',
    'INSTITUTIONAL',
    '2026-10-20',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"limpeza","higiene","produtos"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Seafood Show Latin America',
    'seafood-show-latin-america-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: FRUTOS DO MAR',
    'INSTITUTIONAL',
    '2026-10-20',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"frutos do mar","pesca","gastronomia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ONDM – O Negócio da Moda – Edição Brasil',
    'ondm-o-negocio-da-moda-edicao-brasil-balneario-camboriu-2026',
    'FEIRA em Balneário Camboriú/SC. Segmento: MODA',
    'RETAIL',
    '2026-10-20',
    false,
    'NONE',
    'BR',
    'SC',
    'Balneário Camboriú',
    '{"moda"}',
    '{"moda","vestuário","negócios"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'HOSPITALMED',
    'hospitalmed-olinda-2026',
    'FEIRA em Olinda/PE. Segmento: SAÚDE',
    'INSTITUTIONAL',
    '2026-10-21',
    false,
    'NONE',
    'BR',
    'PE',
    'Olinda',
    '{"saude"}',
    '{"saúde","hospitalar","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ARENA M&T',
    'arena-m-t-fazenda-rio-grande-2026',
    'FEIRA em Fazenda Rio Grande/PR. Segmento: MINERAÇÃO',
    'INSTITUTIONAL',
    '2026-10-21',
    false,
    'NONE',
    'BR',
    'PR',
    'Fazenda Rio Grande',
    '{"geral"}',
    '{"mineração","equipamentos","tecnologia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FENALAW',
    'fenalaw-sao-paulo-2026',
    'CONGRESSO em São Paulo/SP. Segmento: DIREITO',
    'INSTITUTIONAL',
    '2026-10-27',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"direito","advocacia","jurídico"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Brazil Windpower',
    'brazil-windpower-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ENERGIA EÓLICA',
    'INSTITUTIONAL',
    '2026-10-27',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"energia eólica","sustentabilidade","tecnologia"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'AveSui',
    'avesui-cascavel-2026',
    'FEIRA em Cascavel/PR. Segmento: AVICULTURA',
    'INSTITUTIONAL',
    '2026-10-27',
    false,
    'NONE',
    'BR',
    'PR',
    'Cascavel',
    '{"geral"}',
    '{"avicultura","suinocultura","agro"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FruitBrasil',
    'fruitbrasil-americana-2026',
    'FEIRA em Americana/SP. Segmento: FRUTAS',
    'INSTITUTIONAL',
    '2026-10-28',
    false,
    'NONE',
    'BR',
    'SP',
    'Americana',
    '{"geral"}',
    '{"frutas","hortaliças","agro"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Enerclean',
    'enerclean-americana-2026',
    'FEIRA em Americana/SP. Segmento: ENERGIA LIMPA',
    'INSTITUTIONAL',
    '2026-10-28',
    false,
    'NONE',
    'BR',
    'SP',
    'Americana',
    '{"geral"}',
    '{"energia","sustentabilidade","tecnologia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Feira SUPER MIX',
    'feira-super-mix-olinda-2026',
    'FEIRA em Olinda/PE. Segmento: VAREJO',
    'RETAIL',
    '2026-11-04',
    false,
    'NONE',
    'BR',
    'PE',
    'Olinda',
    '{"varejo"}',
    '{"varejo","supermercados","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'HFN- HOTEL & FOOD NORDESTE',
    'hfn-hotel-food-nordeste-olinda-2026',
    'FEIRA em Olinda/PE. Segmento: HOTELARIA',
    'INSTITUTIONAL',
    '2026-11-04',
    false,
    'NONE',
    'BR',
    'PE',
    'Olinda',
    '{"turismo"}',
    '{"hotelaria","gastronomia","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FENATRAN',
    'fenatran-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: TRANSPORTE',
    'INSTITUTIONAL',
    '2026-11-09',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"transporte","veículos","logística"}',
    9,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'BFSHOW – 6ª edição',
    'bfshow-6-edicao-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: BELEZA',
    'RETAIL',
    '2026-11-10',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"beleza"}',
    '{"beleza","estética","cosméticos"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'REPARASUL',
    'reparasul-novo-hamburgo-2026',
    'FEIRA em Novo Hamburgo/RS. Segmento: AUTOMOTIVO',
    'RETAIL',
    '2026-11-11',
    false,
    'NONE',
    'BR',
    'RS',
    'Novo Hamburgo',
    '{"tecnologia","automotivo"}',
    '{"automotivo","reparação","peças"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FESTURIS',
    'festuris-gramado-2026',
    'FEIRA em Gramado/RS. Segmento: TURISMO',
    'SEASONAL',
    '2026-11-12',
    false,
    'NONE',
    'BR',
    'RS',
    'Gramado',
    '{"turismo"}',
    '{"turismo","viagens","gramado"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ExpoFrísia',
    'expofrisia-carambei-2026',
    'FEIRA em Carambeí/PR. Segmento: AGROPECUÁRIO',
    'SEASONAL',
    '2026-11-12',
    false,
    'NONE',
    'BR',
    'PR',
    'Carambeí',
    '{"agronegocio"}',
    '{"agro","leite","paraná"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Feira Petnor',
    'feira-petnor-olinda-2026',
    'FEIRA em Olinda/PE. Segmento: PET',
    'INSTITUTIONAL',
    '2026-11-15',
    false,
    'NONE',
    'BR',
    'PE',
    'Olinda',
    '{"geral"}',
    '{"pet","animais","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Barber Week',
    'barber-week-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: BARBEARIA',
    'INSTITUTIONAL',
    '2026-11-15',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"barbearia","beleza","masculino"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'EXPO CANNABIS BRASIL',
    'expo-cannabis-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CANNABIS',
    'INSTITUTIONAL',
    '2026-11-20',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"cannabis","medicinal","indústria"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'EXPOLOG',
    'expolog-fortaleza-2026',
    'FEIRA em Fortaleza/CE. Segmento: LOGÍSTICA',
    'INSTITUTIONAL',
    '2026-11-23',
    false,
    'NONE',
    'BR',
    'CE',
    'Fortaleza',
    '{"tecnologia"}',
    '{"logística","transporte","ceará"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'EXPO MOTORHOME',
    'expo-motorhome-pinhais-2026',
    'FEIRA em Pinhais/PR. Segmento: MOTORHOME',
    'INSTITUTIONAL',
    '2026-11-25',
    false,
    'NONE',
    'BR',
    'PR',
    'Pinhais',
    '{"geral"}',
    '{"motorhome","turismo","lazer"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Tomorrow.Blue Economy',
    'tomorrow-blue-economy-niteroi-2026',
    'CONGRESSO em Niterói/RJ. Segmento: ECONOMIA AZUL',
    'INSTITUTIONAL',
    '2026-11-25',
    false,
    'NONE',
    'BR',
    'RJ',
    'Niterói',
    '{"geral"}',
    '{"economia","sustentabilidade","oceano"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'CCXP',
    'ccxp-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CULTURA POP',
    'CULTURAL',
    '2026-12-03',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"cultura pop","entretenimento","games"}',
    10,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'VegFest',
    'vegfest-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: VEGANISMO',
    'INSTITUTIONAL',
    '2026-12-04',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"veganismo","alimentação","sustentabilidade"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'EXPOMAFE',
    'expomafe-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: MANUFATURA',
    'INSTITUTIONAL',
    '2026-05-04',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"manufatura","máquinas","ferramentas","indústria"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FLEXO & LABELS EXPERIENCE',
    'flexo-labels-experience-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: GRÁFICA',
    'INSTITUTIONAL',
    '2026-05-04',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"flexografia","rótulos","embalagens","impressão"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ForBeer',
    'forbeer-serra-negra-2026',
    'FEIRA em Serra Negra/SP. Segmento: CERVEJA',
    'INSTITUTIONAL',
    '2026-05-05',
    false,
    'NONE',
    'BR',
    'SP',
    'Serra Negra',
    '{"geral"}',
    '{"cerveja","bebidas","gastronomia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ForLAC',
    'forlac-lambari-2026',
    'FEIRA em Lambari/MG. Segmento: LATICÍNIOS',
    'INSTITUTIONAL',
    '2026-05-18',
    false,
    'NONE',
    'BR',
    'MG',
    'Lambari',
    '{"tecnologia"}',
    '{"laticínios","leite","queijo","agro"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FIEMA BRASIL',
    'fiema-brasil-bento-goncalves-2026',
    'FEIRA em Bento Gonçalves/RS. Segmento: METAL MECÂNICA',
    'INSTITUTIONAL',
    '2026-05-18',
    false,
    'NONE',
    'BR',
    'RS',
    'Bento Gonçalves',
    '{"geral"}',
    '{"metal","mecânica","indústria","ferramentas"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'NT2E',
    'nt2e-rio-de-janeiro-2026',
    'FEIRA em Rio de Janeiro/RJ. Segmento: TECNOLOGIA',
    'INSTITUTIONAL',
    '2026-05-20',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"tecnologia"}',
    '{"tecnologia","inovação","digital"}',
    7,
    4,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'BRASMIN',
    'brasmin-goiania-2026',
    'FEIRA em Goiânia/GO. Segmento: MINERAÇÃO',
    'INSTITUTIONAL',
    '2026-06-15',
    false,
    'NONE',
    'BR',
    'GO',
    'Goiânia',
    '{"geral"}',
    '{"mineração","equipamentos","tecnologia"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'IFAT Brasil',
    'ifat-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: MEIO AMBIENTE',
    'INSTITUTIONAL',
    '2026-06-23',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"meio ambiente","sustentabilidade","saneamento","água"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'INTERMACH',
    'intermach-joinville-2026',
    'FEIRA em Joinville/SC. Segmento: METAL MECÂNICA',
    'INSTITUTIONAL',
    '2026-07-15',
    false,
    'NONE',
    'BR',
    'SC',
    'Joinville',
    '{"geral"}',
    '{"metal","mecânica","máquinas","indústria"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'INDUSPAR',
    'induspar-pinhais-2026',
    'FEIRA em Pinhais/PR. Segmento: INDÚSTRIA',
    'INSTITUTIONAL',
    '2026-08-03',
    false,
    'NONE',
    'BR',
    'PR',
    'Pinhais',
    '{"geral"}',
    '{"indústria","manufatura","paraná"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Fimma Brasil',
    'fimma-brasil-bento-goncalves-2026',
    'FEIRA em Bento Gonçalves/RS. Segmento: MADEIRA E MÓVEIS',
    'RETAIL',
    '2026-08-09',
    false,
    'NONE',
    'BR',
    'RS',
    'Bento Gonçalves',
    '{"geral"}',
    '{"madeira","móveis","marcenaria","indústria"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'EXPOFRUIT',
    'expofruit-mossoro-2026',
    'FEIRA em Mossoró/RN. Segmento: FRUTAS',
    'INSTITUTIONAL',
    '2026-08-25',
    false,
    'NONE',
    'BR',
    'RN',
    'Mossoró',
    '{"geral"}',
    '{"frutas","hortaliças","agro","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Glass South America',
    'glass-south-america-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: VIDRO',
    'INSTITUTIONAL',
    '2026-09-08',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"vidro","construção","indústria"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'E-squadria Show',
    'e-squadria-show-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ESQUADRIAS',
    'INSTITUTIONAL',
    '2026-09-08',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"esquadrias","alumínio","construção"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'FIEE',
    'fiee-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ELÉTRICA E ELETRÔNICA',
    'INSTITUTIONAL',
    '2026-09-14',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"elétrica","eletrônica","energia","automação"}',
    8,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'VICTAM LatAm',
    'victam-latam-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ALIMENTAÇÃO ANIMAL',
    'INSTITUTIONAL',
    '2026-09-14',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"ração","alimentação animal","agro"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'SIM - Semana Industrial Mineira',
    'sim-semana-industrial-mineira-belo-horizonte-2026',
    'FEIRA em Belo Horizonte/MG. Segmento: INDÚSTRIA',
    'INSTITUTIONAL',
    '2026-09-14',
    false,
    'NONE',
    'BR',
    'MG',
    'Belo Horizonte',
    '{"geral"}',
    '{"indústria","manufatura","minas gerais"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'TRANSMODAL GOIÁS',
    'transmodal-goias-anapolis-2026',
    'FEIRA em Anápolis/GO. Segmento: LOGÍSTICA',
    'INSTITUTIONAL',
    '2026-09-22',
    false,
    'NONE',
    'BR',
    'GO',
    'Anápolis',
    '{"tecnologia"}',
    '{"logística","transporte","goiás"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Analitica Latin America',
    'analitica-latin-america-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: LABORATÓRIOS',
    'INSTITUTIONAL',
    '2026-09-28',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"laboratórios","análises","científico"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'ABRAFATI Show',
    'abrafati-show-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: TINTAS',
    'INSTITUTIONAL',
    '2026-09-28',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"tintas","vernizes","revestimentos"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'RIOPARTS',
    'rioparts-rio-de-janeiro-2026',
    'FEIRA em Rio de Janeiro/RJ. Segmento: AUTOPEÇAS',
    'INSTITUTIONAL',
    '2026-09-29',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"geral"}',
    '{"autopeças","automotivo","rio de janeiro"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'LAVTECH',
    'lavtech-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: LAVANDERIA',
    'INSTITUTIONAL',
    '2026-10-05',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"lavanderia","limpeza","hotelaria"}',
    6,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Maquintex + Signs Norte e Nordeste + Pack&Graph',
    'maquintex-signs-norte-e-nordeste-pack-graph-fortaleza-2026',
    'FEIRA em Fortaleza/CE. Segmento: GRÁFICA E EMBALAGENS',
    'INSTITUTIONAL',
    '2026-10-05',
    false,
    'NONE',
    'BR',
    'CE',
    'Fortaleza',
    '{"geral"}',
    '{"gráfica","embalagens","sinalização","nordeste"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'NT EXPO',
    'nt-expo-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: TECNOLOGIA',
    'INSTITUTIONAL',
    '2026-10-19',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia"}',
    '{"tecnologia","TI","inovação"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'TUBOTECH',
    'tubotech-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: TUBOS',
    'INSTITUTIONAL',
    '2026-10-27',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"tubos","tubulações","indústria"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'WIRE Brasil',
    'wire-brasil-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: ARAMES E CABOS',
    'INSTITUTIONAL',
    '2026-10-27',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"geral"}',
    '{"arames","cabos","fios","indústria"}',
    7,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Salão do Automóvel',
    'salao-do-automovel-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: AUTOMOTIVO',
    'RETAIL',
    '2026-10-30',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"tecnologia","automotivo"}',
    '{"automóveis","veículos","carros","automotivo"}',
    10,
    5,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Bienal do Livro Rio',
    'bienal-do-livro-rio-rio-de-janeiro-2026',
    'FEIRA em Rio de Janeiro/RJ. Segmento: LIVROS',
    'INSTITUTIONAL',
    '2026-11-01',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"geral"}',
    '{"livros","literatura","cultura","rio de janeiro"}',
    8,
    3,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'Enflor | Garden Fair',
    'enflor-garden-fair-holambra-2026',
    'FEIRA em Holambra/SP. Segmento: FLORES E PLANTAS',
    'INSTITUTIONAL',
    '2026-10-15',
    false,
    'NONE',
    'BR',
    'SP',
    'Holambra',
    '{"geral"}',
    '{"flores","plantas","jardinagem","paisagismo"}',
    7,
    3,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'CONSTRUMETAL',
    'construmetal-sao-paulo-2026',
    'FEIRA em São Paulo/SP. Segmento: CONSTRUÇÃO',
    'INSTITUTIONAL',
    '2026-09-15',
    false,
    'NONE',
    'BR',
    'SP',
    'São Paulo',
    '{"construcao"}',
    '{"construção","metal","estruturas"}',
    7,
    3,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'RIO PIPELINE',
    'rio-pipeline-rio-de-janeiro-2026',
    'FEIRA em Rio de Janeiro/RJ. Segmento: PETRÓLEO E GÁS',
    'INSTITUTIONAL',
    '2026-08-15',
    false,
    'NONE',
    'BR',
    'RJ',
    'Rio de Janeiro',
    '{"geral"}',
    '{"petróleo","gás","pipeline","energia"}',
    7,
    3,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();

INSERT INTO calendar_events (
    name, slug, description, event_type, date, is_recurring, recurrence,
    country, state, city, segments, tags, base_priority, confidence_level,
    source, status
) VALUES (
    'METALURGIA',
    'metalurgia-joinville-2026',
    'FEIRA em Joinville/SC. Segmento: METALURGIA',
    'INSTITUTIONAL',
    '2026-07-20',
    false,
    'NONE',
    'BR',
    'SC',
    'Joinville',
    '{"geral"}',
    '{"metalurgia","fundição","indústria"}',
    7,
    3,
    'Portal Radar',
    'ACTIVE'
) ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    event_type = EXCLUDED.event_type,
    date = EXCLUDED.date,
    segments = EXCLUDED.segments,
    tags = EXCLUDED.tags,
    base_priority = EXCLUDED.base_priority,
    confidence_level = EXCLUDED.confidence_level,
    updated_at = NOW();


-- Total de 263 eventos importados
