/**
 * Tool definitions for the Jarvis AI Agent.
 * Provider-agnostic schema + converters for Claude, OpenAI, Gemini.
 */

// ── Types ──────────────────────────────────────────────────────

export type ParamType = 'string' | 'number' | 'boolean' | 'array';

export type ToolParam = {
  type: ParamType;
  description: string;
  enum?: string[];
  items?: { type: string };
};

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, ToolParam>;
  required: string[];
  category: 'read' | 'write' | 'action';
};

// ── All Tool Definitions ───────────────────────────────────────

export const TOOLS: ToolDefinition[] = [
  // ── Briefings & Workflow ──
  {
    name: 'list_briefings',
    description: 'Lista briefings do cliente atual. Retorna título, status, data de criação e deadline.',
    parameters: {
      status: { type: 'string', description: 'Filtrar por status', enum: ['draft', 'in_progress', 'done', 'cancelled'] },
      limit: { type: 'number', description: 'Máximo de resultados (default 10, max 20)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_briefing',
    description: 'Retorna detalhes completos de um briefing: título, payload, stages, copies gerados e tarefas.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing' },
    },
    required: ['briefing_id'],
    category: 'read',
  },
  {
    name: 'create_briefing',
    description: 'Cria um novo briefing para o cliente. Use quando o usuário pedir para criar um briefing, post, ou conteúdo.',
    parameters: {
      title: { type: 'string', description: 'Título do briefing' },
      objective: { type: 'string', description: 'Objetivo (ex: engajamento, awareness, conversão)' },
      platform: { type: 'string', description: 'Plataforma alvo (instagram, facebook, linkedin, tiktok, youtube, twitter)' },
      format: { type: 'string', description: 'Formato do conteúdo (post, reels, stories, carousel, video)' },
      deadline: { type: 'string', description: 'Data limite no formato YYYY-MM-DD' },
      channels: { type: 'array', description: 'Canais de distribuição', items: { type: 'string' } },
      notes: { type: 'string', description: 'Notas ou instruções adicionais' },
    },
    required: ['title'],
    category: 'write',
  },
  {
    name: 'update_briefing_status',
    description: 'Atualiza o status de um briefing existente.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing' },
      status: { type: 'string', description: 'Novo status', enum: ['draft', 'in_progress', 'done', 'cancelled'] },
    },
    required: ['briefing_id', 'status'],
    category: 'write',
  },
  {
    name: 'generate_copy_for_briefing',
    description: 'Gera opções de copy (texto criativo) para um briefing usando o pipeline de IA. Retorna preview do copy gerado.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing' },
      count: { type: 'number', description: 'Número de opções a gerar (default 3, max 5)' },
      language: { type: 'string', description: 'Idioma (default pt)', enum: ['pt', 'en', 'es'] },
      instructions: { type: 'string', description: 'Instruções adicionais para a geração do copy' },
    },
    required: ['briefing_id'],
    category: 'action',
  },

  // ── Calendario & Eventos ──
  {
    name: 'list_upcoming_events',
    description: 'Lista eventos do calendario nos proximos dias. Inclui datas comemorativas, feriados e eventos de marketing relevantes.',
    parameters: {
      days: { type: 'number', description: 'Numero de dias a frente (default 14, max 60)' },
      categories: { type: 'array', description: 'Filtrar por categorias', items: { type: 'string' } },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'search_events',
    description: 'Busca eventos por nome ou palavra-chave. Util para encontrar datas comemorativas especificas.',
    parameters: {
      query: { type: 'string', description: 'Termo de busca' },
      year: { type: 'number', description: 'Ano (default ano atual)' },
      limit: { type: 'number', description: 'Máximo de resultados (default 10)' },
    },
    required: ['query'],
    category: 'read',
  },
  {
    name: 'get_event_relevance',
    description: 'Retorna a relevancia calculada de um evento especifico para o cliente atual.',
    parameters: {
      event_id: { type: 'string', description: 'ID do evento' },
    },
    required: ['event_id'],
    category: 'read',
  },
  {
    name: 'add_calendar_event',
    description: 'Adiciona uma data comemorativa ou evento personalizado ao calendário do cliente. Use quando o usuário pedir para adicionar, incluir ou marcar uma data no calendário. Se o evento veio de search_events, passe o event_id para associar o evento global ao cliente.',
    parameters: {
      title: { type: 'string', description: 'Título do evento (ex: "Dia do Pi", "Lançamento do Produto X")' },
      event_date: { type: 'string', description: 'Data no formato YYYY-MM-DD' },
      description: { type: 'string', description: 'Descrição ou oportunidade de conteúdo para esta data' },
      category: { type: 'string', description: 'Categoria (ex: comemorativo, marketing, produto, institucional)' },
      event_id: { type: 'string', description: 'ID do evento global retornado por search_events — se fornecido, associa o evento existente ao cliente' },
      notes: { type: 'string', description: 'Notas sobre por que este evento é relevante para o cliente' },
    },
    required: ['title', 'event_date'],
    category: 'write',
  },
  {
    name: 'schedule_meeting',
    description: 'Agenda uma reunião do cliente no Google Calendar/Meet e cria o registro operacional no sistema. Use quando o usuário pedir para marcar ou criar uma reunião.',
    parameters: {
      title: { type: 'string', description: 'Título da reunião' },
      scheduled_at: { type: 'string', description: 'Data/hora ISO da reunião' },
      duration_minutes: { type: 'number', description: 'Duração em minutos (default 60)' },
      description: { type: 'string', description: 'Descrição ou contexto da reunião' },
      attendee_emails: { type: 'array', description: 'Lista opcional de emails para convidar', items: { type: 'string' } },
      override_risk_guard: { type: 'boolean', description: 'Use true somente quando um humano aprovar prosseguir apesar da baixa tolerância a risco do cliente.' },
    },
    required: ['title', 'scheduled_at'],
    category: 'write',
  },
  {
    name: 'reschedule_meeting',
    description: 'Remarca uma reunião existente do cliente e sincroniza Google Calendar/Meet quando houver vínculo externo.',
    parameters: {
      meeting_id: { type: 'string', description: 'UUID da reunião' },
      scheduled_at: { type: 'string', description: 'Nova data/hora ISO da reunião' },
      duration_minutes: { type: 'number', description: 'Nova duração em minutos (default 60)' },
      title: { type: 'string', description: 'Novo título opcional da reunião' },
      description: { type: 'string', description: 'Nova descrição opcional da reunião' },
      attendee_emails: { type: 'array', description: 'Lista opcional de emails atualizada', items: { type: 'string' } },
      override_risk_guard: { type: 'boolean', description: 'Use true somente quando um humano aprovar prosseguir apesar da baixa tolerância a risco do cliente.' },
    },
    required: ['meeting_id', 'scheduled_at'],
    category: 'write',
  },
  {
    name: 'cancel_meeting',
    description: 'Cancela uma reunião existente, remove do Google Calendar quando houver vínculo e atualiza o status local.',
    parameters: {
      meeting_id: { type: 'string', description: 'UUID da reunião' },
      reason: { type: 'string', description: 'Motivo opcional do cancelamento' },
      override_risk_guard: { type: 'boolean', description: 'Use true somente quando um humano aprovar prosseguir apesar da baixa tolerância a risco do cliente.' },
    },
    required: ['meeting_id'],
    category: 'write',
  },

  // ── Campanhas ──
  {
    name: 'create_campaign',
    description: 'Cria uma nova campanha de marketing para o cliente. Use quando o usuário pedir para criar uma campanha, projeto ou iniciativa de comunicação.',
    parameters: {
      name: { type: 'string', description: 'Nome da campanha' },
      objective: { type: 'string', description: 'Objetivo da campanha (ex: awareness, engajamento, conversão, fidelização)' },
      platforms: { type: 'array', description: 'Plataformas alvo (instagram, linkedin, tiktok, facebook, youtube)', items: { type: 'string' } },
      start_date: { type: 'string', description: 'Data de início no formato YYYY-MM-DD' },
      end_date: { type: 'string', description: 'Data de término no formato YYYY-MM-DD' },
      budget_brl: { type: 'number', description: 'Orçamento em BRL (opcional)' },
    },
    required: ['name', 'objective', 'start_date'],
    category: 'write',
  },
  {
    name: 'generate_campaign_strategy',
    description: 'Gera estratégia comportamental completa para uma campanha existente (fases, audiências, behavior intents com AMDs e gatilhos, conceitos criativos). Use após criar a campanha.',
    parameters: {
      campaign_id: { type: 'string', description: 'UUID da campanha' },
    },
    required: ['campaign_id'],
    category: 'action',
  },
  {
    name: 'generate_behavioral_copy',
    description: 'Aciona AgentWriter + AgentAuditor para gerar copy comportamental para um behavior intent específico de uma campanha. Retorna draft, score Fogg, tom emocional e tags.',
    parameters: {
      campaign_id: { type: 'string', description: 'UUID da campanha' },
      behavior_intent_id: { type: 'string', description: 'ID do behavior intent dentro da campanha' },
      platform: { type: 'string', description: 'Plataforma (instagram, linkedin, tiktok, etc)' },
      format: { type: 'string', description: 'Formato do conteúdo (ex: Feed, Reels, Carrossel)' },
    },
    required: ['campaign_id', 'behavior_intent_id', 'platform'],
    category: 'action',
  },

  // ── Biblioteca de Conhecimento ──
  {
    name: 'add_library_note',
    description: 'Adiciona uma nota ou informação à biblioteca de conhecimento do cliente. Use para salvar insights, briefings informais, decisões de marca, referências textuais.',
    parameters: {
      title: { type: 'string', description: 'Título da nota' },
      content: { type: 'string', description: 'Conteúdo completo da nota' },
      category: { type: 'string', description: 'Categoria (ex: brand, concorrencia, produto, mercado, referencia)' },
      tags: { type: 'array', description: 'Tags para facilitar buscas', items: { type: 'string' } },
      use_in_ai: { type: 'boolean', description: 'Se true (padrão), este conteúdo será usado nos prompts de geração de copy' },
    },
    required: ['title', 'content'],
    category: 'write',
  },
  {
    name: 'add_library_url',
    description: 'Extrai e salva o conteúdo de uma URL na biblioteca do cliente (artigo, concorrente, referência). O conteúdo é extraído automaticamente e indexado para uso em IA.',
    parameters: {
      url: { type: 'string', description: 'URL completa a ser extraída e salva' },
      category: { type: 'string', description: 'Categoria (ex: concorrencia, referencia, mercado)' },
      tags: { type: 'array', description: 'Tags para facilitar buscas', items: { type: 'string' } },
    },
    required: ['url'],
    category: 'write',
  },

  // ── Clipping Avançado ──
  {
    name: 'create_briefing_from_clipping',
    description: 'Cria um briefing de conteúdo diretamente a partir de uma notícia/clipping. Use quando o usuário pedir para transformar uma notícia em post, conteúdo ou briefing.',
    parameters: {
      clipping_id: { type: 'string', description: 'UUID do item de clipping (retornado por search_clipping ou get_clipping_item)' },
      platform: { type: 'string', description: 'Plataforma alvo (default: instagram)' },
      format: { type: 'string', description: 'Formato do conteúdo (default: Feed)' },
      notes: { type: 'string', description: 'Instruções adicionais para o briefing' },
    },
    required: ['clipping_id'],
    category: 'write',
  },
  {
    name: 'pin_clipping_item',
    description: 'Fixa (destaca) um item de clipping para o cliente atual. Itens fixados aparecem em destaque no monitoramento.',
    parameters: {
      clipping_id: { type: 'string', description: 'UUID do item de clipping' },
    },
    required: ['clipping_id'],
    category: 'write',
  },
  {
    name: 'archive_clipping_item',
    description: 'Arquiva um item de clipping. Use quando o usuário disser que uma notícia não é relevante, pode ser descartada ou arquivada.',
    parameters: {
      clipping_id: { type: 'string', description: 'UUID do item de clipping' },
    },
    required: ['clipping_id'],
    category: 'write',
  },

  // ── Clipping & Monitoramento ──
  {
    name: 'search_clipping',
    description: 'Busca notícias e matérias matcheadas para o cliente. Retorna título, snippet, score de relevância e URL.',
    parameters: {
      query: { type: 'string', description: 'Termo de busca (opcional - sem filtro retorna por score)' },
      min_score: { type: 'number', description: 'Score mínimo de relevância (0-100, default 0)' },
      recency: { type: 'string', description: 'Recência', enum: ['24h', '7d', '30d'] },
      limit: { type: 'number', description: 'Máximo de resultados (default 10, max 20)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_clipping_item',
    description: 'Retorna detalhes completos de uma noticia: titulo, conteudo, URL, data, score, keywords matcheados.',
    parameters: {
      item_id: { type: 'string', description: 'UUID da noticia' },
    },
    required: ['item_id'],
    category: 'read',
  },
  {
    name: 'list_clipping_sources',
    description: 'Lista fontes de monitoramento (RSS, URLs) configuradas para o cliente.',
    parameters: {
      source_type: { type: 'string', description: 'Tipo de fonte', enum: ['RSS', 'URL', 'YOUTUBE'] },
    },
    required: [],
    category: 'read',
  },

  // ── Social Listening ──
  {
    name: 'list_social_trends',
    description: 'Lista tendencias de keywords monitorados com dados de volume, sentimento e engajamento.',
    parameters: {
      platform: { type: 'string', description: 'Filtrar por plataforma', enum: ['twitter', 'instagram', 'tiktok', 'youtube', 'linkedin', 'facebook', 'reddit'] },
      limit: { type: 'number', description: 'Máximo de resultados (default 10)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'search_social_mentions',
    description: 'Busca mencoes em redes sociais por keyword. Inclui sentimento, engajamento e autor.',
    parameters: {
      keyword: { type: 'string', description: 'Keyword para buscar' },
      platform: { type: 'string', description: 'Filtrar por plataforma', enum: ['twitter', 'instagram', 'tiktok', 'youtube', 'linkedin', 'facebook', 'reddit'] },
      sentiment: { type: 'string', description: 'Filtrar por sentimento', enum: ['positive', 'negative', 'neutral'] },
      limit: { type: 'number', description: 'Máximo de resultados (default 10)' },
    },
    required: ['keyword'],
    category: 'read',
  },
  {
    name: 'list_social_keywords',
    description: 'Lista as keywords ativamente monitoradas no social listening.',
    parameters: {},
    required: [],
    category: 'read',
  },

  // ── Biblioteca & Conhecimento ──
  {
    name: 'search_library',
    description: 'Busca na biblioteca de conhecimento do cliente. Retorna itens relevantes (notas, links, documentos) por keyword.',
    parameters: {
      query: { type: 'string', description: 'Termo de busca' },
      category: { type: 'string', description: 'Filtrar por categoria' },
      limit: { type: 'number', description: 'Máximo de resultados (default 10)' },
    },
    required: ['query'],
    category: 'read',
  },
  {
    name: 'list_library_items',
    description: 'Lista itens da biblioteca do cliente com filtros opcionais.',
    parameters: {
      type: { type: 'string', description: 'Tipo de item', enum: ['note', 'link', 'file', 'template'] },
      category: { type: 'string', description: 'Filtrar por categoria' },
      limit: { type: 'number', description: 'Máximo de resultados (default 10)' },
    },
    required: [],
    category: 'read',
  },

  // ── Campanhas ──
  {
    name: 'list_campaigns',
    description: 'Lista campanhas de marketing do cliente com status e budget.',
    parameters: {
      status: { type: 'string', description: 'Filtrar por status', enum: ['active', 'paused', 'completed', 'cancelled'] },
      limit: { type: 'number', description: 'Máximo de resultados (default 10)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_campaign',
    description: 'Retorna detalhes de uma campanha: formatos, métricas de performance, ROI e predições.',
    parameters: {
      campaign_id: { type: 'string', description: 'UUID da campanha' },
    },
    required: ['campaign_id'],
    category: 'read',
  },

  // ── Oportunidades AI ──
  {
    name: 'list_opportunities',
    description: 'Lista oportunidades de marketing detectadas pela IA (clipping, trends, calendario).',
    parameters: {
      priority: { type: 'string', description: 'Filtrar por prioridade', enum: ['urgent', 'high', 'medium', 'low'] },
      limit: { type: 'number', description: 'Máximo de resultados (default 10)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'action_opportunity',
    description: 'Aceita (cria briefing automaticamente) ou dispensa uma oportunidade detectada.',
    parameters: {
      opportunity_id: { type: 'string', description: 'UUID da oportunidade' },
      action: { type: 'string', description: 'Ação a tomar', enum: ['accept', 'dismiss'] },
    },
    required: ['opportunity_id', 'action'],
    category: 'write',
  },

  // ── Inteligencia do Cliente ──
  {
    name: 'get_client_profile',
    description: 'Retorna o perfil completo do cliente: segmento, keywords, pilares de conteúdo, tom de voz, público-alvo.',
    parameters: {},
    required: [],
    category: 'read',
  },
  {
    name: 'get_intelligence_health',
    description: 'Verifica a saúde das fontes de inteligência: biblioteca, clipping, social listening, oportunidades.',
    parameters: {},
    required: [],
    category: 'read',
  },

  // ── Client Content & Intelligence ──
  {
    name: 'search_client_content',
    description: 'Busca conteúdo publicado pelo cliente (posts em redes sociais e páginas do site). Sem query retorna os mais recentes.',
    parameters: {
      query: { type: 'string', description: 'Palavra-chave para buscar no titulo e conteudo dos posts/paginas' },
      limit: { type: 'number', description: 'Máximo de resultados (default 10, max 20)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'list_client_sources',
    description: 'Lista fontes de conteudo do cliente (sites, perfis sociais) com status de coleta.',
    parameters: {
      source_type: { type: 'string', description: 'Filtrar por tipo', enum: ['website', 'social'] },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_client_insights',
    description: 'Retorna o resumo de inteligência do cliente gerado por IA (posicionamento, tom, indústria, keywords, pilares, etc).',
    parameters: {},
    required: [],
    category: 'read',
  },
  {
    name: 'get_client_living_memory',
    description: 'Retorna a memória viva do cliente com diretivas ativas, evidências recentes relacionadas e compromissos pendentes. Use antes de gerar copy, campanha ou responder quando o briefing estiver fraco ou houver risco de contexto implícito fora do briefing.',
    parameters: {
      question: { type: 'string', description: 'Pergunta, assunto ou briefing resumido para ranquear as evidências mais relevantes' },
      days_back: { type: 'number', description: 'Janela de dias a investigar (padrão 60, máximo 120)' },
      limit_evidence: { type: 'number', description: 'Máximo de evidências relacionadas (padrão 6, máximo 10)' },
      limit_actions: { type: 'number', description: 'Máximo de compromissos pendentes (padrão 4, máximo 8)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_client_memory_facts',
    description: 'Retorna os fatos persistidos da memória viva do cliente, já tipados como directive, evidence ou commitment. Use quando precisar inspecionar o que está realmente consolidado para esse cliente, com rastreabilidade operacional.',
    parameters: {
      fact_types: { type: 'array', description: 'Filtrar por tipos de fato', items: { type: 'string' } },
      days_back: { type: 'number', description: 'Janela de dias para fatos com recência (padrão 60, máximo 120)' },
      limit: { type: 'number', description: 'Máximo de fatos retornados (padrão 20, máximo 50)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_client_memory_governance',
    description: 'Analisa a memória viva persistida do cliente e sugere ações de governança como archive ou replace para fatos velhos, duplicados ou conflitantes. Também aponta envelhecimento e conflitos internos da memória. Use quando precisar limpar, atualizar ou revisar a verdade ativa do cliente.',
    parameters: {
      days_back: { type: 'number', description: 'Janela máxima de análise em dias (padrão 365, máximo 365)' },
      limit: { type: 'number', description: 'Máximo de fatos ativos inspecionados (padrão 80, máximo 100)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_client_state',
    description: 'Retorna um snapshot unificado do cliente agora: saúde operacional, sinais, estado vivo e preview da memória viva. Use para perguntas como "como esse cliente está hoje?", "qual o contexto atual?" ou antes de tomar decisão estratégica mais ampla.',
    parameters: {},
    required: [],
    category: 'read',
  },
  {
    name: 'record_client_memory_fact',
    description: 'Registra um novo fato persistido na memória viva do cliente. Use apenas quando o usuário pedir explicitamente para salvar, registrar ou lembrar uma diretiva, compromisso ou evidência relevante para uso futuro.',
    parameters: {
      fact_type: { type: 'string', description: 'Tipo do fato', enum: ['directive', 'evidence', 'commitment'] },
      title: { type: 'string', description: 'Título curto e claro do fato que ficará visível na memória do cliente' },
      fact_text: { type: 'string', description: 'Texto completo do fato a registrar' },
      summary: { type: 'string', description: 'Resumo curto opcional do fato' },
      directive_type: { type: 'string', description: 'Obrigatório quando fact_type=directive', enum: ['boost', 'avoid'] },
      related_at: { type: 'string', description: 'Data/hora relevante em ISO, quando houver' },
      deadline: { type: 'string', description: 'Prazo em YYYY-MM-DD, quando houver compromisso' },
      priority: { type: 'string', description: 'Prioridade do compromisso', enum: ['high', 'medium', 'low'] },
      source_note: { type: 'string', description: 'Explicação da origem do fato, para auditoria humana' },
    },
    required: ['fact_type', 'title', 'fact_text'],
    category: 'write',
  },
  {
    name: 'apply_client_memory_governance',
    description: 'Aplica uma ação de governança na memória viva do cliente, arquivando um fato antigo ou marcando-o como substituído por um fato mais novo. Use somente com confirmação explícita do usuário.',
    parameters: {
      action: { type: 'string', description: 'Ação de governança', enum: ['archive', 'replace'] },
      target_fingerprint: { type: 'string', description: 'Fingerprint do fato alvo que será arquivado ou substituído' },
      replacement_fingerprint: { type: 'string', description: 'Fingerprint do fato mais novo que deve substituir o alvo, quando action=replace' },
      fact_type: { type: 'string', description: 'Tipo do novo fato, quando action=replace e não houver replacement_fingerprint', enum: ['directive', 'evidence', 'commitment'] },
      title: { type: 'string', description: 'Título do novo fato, quando action=replace e não houver replacement_fingerprint' },
      fact_text: { type: 'string', description: 'Texto completo do novo fato, quando action=replace e não houver replacement_fingerprint' },
      summary: { type: 'string', description: 'Resumo do novo fato, opcional' },
      directive_type: { type: 'string', description: 'Obrigatório para replacement de directive criado na hora', enum: ['boost', 'avoid'] },
      related_at: { type: 'string', description: 'Data/hora ISO do novo fato, quando aplicável' },
      deadline: { type: 'string', description: 'Prazo em YYYY-MM-DD do novo compromisso, quando aplicável' },
      priority: { type: 'string', description: 'Prioridade do novo compromisso', enum: ['high', 'medium', 'low'] },
      reason: { type: 'string', description: 'Motivo humano da ação de governança, para auditoria' },
      confirmed: { type: 'boolean', description: 'Deve ser true quando o usuário confirmar explicitamente a ação.' },
    },
    required: ['action', 'target_fingerprint'],
    category: 'write',
  },
  {
    name: 'get_context_packet',
    description: 'Retorna um packet unificado para decisão: estado atual do cliente, memória viva e diagnóstico do briefing atual quando houver. Use quando precisar montar rapidamente o quadro completo antes de responder, recomendar ou criar.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing atual, opcional quando já existir no contexto da conversa ou da tela.' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_client_reportei_summary',
    description: 'Retorna um resumo quantitativo do cliente a partir do raw lake do Reportei, organizado por famílias de métricas e top sinais por integração. Use quando precisar entender o que realmente está performando em alcance, engajamento, tráfego, conversão ou mídia paga.',
    parameters: {
      time_window: { type: 'string', description: 'Janela desejada (ex: 7d, 30d, 90d). Padrão 30d.' },
      platform: { type: 'string', description: 'Plataforma opcional (Instagram, LinkedIn, MetaAds, GoogleAds, GoogleAnalytics, Facebook).' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_briefing_diagnostics',
    description: 'Analisa a qualidade do briefing atual e retorna lacunas, tensões e recomendações com base na memória viva do cliente. Use antes de gerar copy, aprovar briefing ou responder quando o briefing estiver raso, ambíguo ou potencialmente conflitante.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing a diagnosticar. Opcional se a conversa já estiver no contexto de um briefing atual.' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'retrieve_client_evidence',
    description: 'Recupera evidências concretas sobre o cliente a partir de reuniões, chat de reunião, emails, WhatsApp, digests e documentos do cliente. Use para perguntas como "o que a cliente falou", "o que foi decidido", "quais evidências sustentam isso".',
    parameters: {
      question: { type: 'string', description: 'Pergunta ou assunto a investigar nas memórias do cliente' },
      source_types: { type: 'array', description: 'Fontes opcionais para restringir a busca: meeting, meeting_chat, gmail_message, whatsapp_message, whatsapp_insight, whatsapp_digest, client_document', items: { type: 'string' } },
      days_back: { type: 'number', description: 'Janela de dias a investigar (padrão 30, máximo 90)' },
      limit: { type: 'number', description: 'Máximo de evidências a retornar (padrão 8, máximo 12)' },
    },
    required: ['question'],
    category: 'read',
  },
  {
    name: 'create_post_pipeline',
    description: 'Cria um post de ponta a ponta para o cliente atual em background: cria o briefing, gera a copy principal, orquestra a direção de arte, abre a sessão criativa no Studio e opcionalmente já gera um link de aprovação. Use quando o usuário disser "cria um post pra mim" ou pedir um post pronto para produção.',
    parameters: {
      request: { type: 'string', description: 'Pedido completo do usuário para o post, incluindo tema, objetivo ou contexto' },
      title: { type: 'string', description: 'Título opcional do briefing/post' },
      objective: { type: 'string', description: 'Objetivo do post (ex: engajamento, awareness, conversão)' },
      platform: { type: 'string', description: 'Plataforma alvo (instagram, linkedin, tiktok, facebook, youtube)' },
      format: { type: 'string', description: 'Formato do conteúdo (post, reels, stories, carousel, video)' },
      deadline: { type: 'string', description: 'Prazo opcional no formato YYYY-MM-DD' },
      language: { type: 'string', description: 'Idioma da copy (padrão pt)', enum: ['pt', 'en', 'es'] },
      generate_approval_link: { type: 'boolean', description: 'Se true, gera também um link de aprovação externa para o briefing' },
    },
    required: ['request'],
    category: 'action',
  },
  {
    name: 'prepare_post_approval',
    description: 'Prepara a etapa de aprovação de um post já criado pelo Jarvis ou pelo Studio. Resolve briefing/sessão a partir do artifact anterior, pode gerar link de aprovação e opcionalmente enviar e-mail para o cliente quando houver e-mail. Use para pedidos como "gera o link de aprovação", "manda para aprovação" ou "prepara isso para o cliente revisar".',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing. Opcional se houver background_job_id ou creative_session_id.' },
      background_job_id: { type: 'string', description: 'ID do artifact create_post_pipeline gerado anteriormente pelo Jarvis.' },
      creative_session_id: { type: 'string', description: 'UUID da sessão criativa já aberta no Studio.' },
      client_email: { type: 'string', description: 'E-mail do cliente para envio opcional da aprovação.' },
      client_name: { type: 'string', description: 'Nome do cliente para personalizar o link e o e-mail.' },
      message: { type: 'string', description: 'Mensagem opcional para acompanhar a aprovação.' },
      expires_in_days: { type: 'number', description: 'Dias até expirar o link (default 7, máx 30).' },
      send_email: { type: 'boolean', description: 'Se true, tenta enviar um e-mail de aprovação quando houver client_email resolvido.' },
    },
    required: [],
    category: 'action',
  },
  {
    name: 'schedule_post_publication',
    description: 'Agenda a publicação de um post já criado. Resolve briefing/copy a partir do artifact anterior, marca a sessão como pronta para publicar e registra o agendamento. Só use quando o usuário pedir explicitamente para agendar/publicar em uma data.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing. Opcional se houver background_job_id ou creative_session_id.' },
      background_job_id: { type: 'string', description: 'ID do artifact create_post_pipeline gerado anteriormente pelo Jarvis.' },
      creative_session_id: { type: 'string', description: 'UUID da sessão criativa já aberta no Studio.' },
      channel: { type: 'string', description: 'Canal de publicação (instagram, facebook, linkedin, tiktok).' },
      scheduled_for: { type: 'string', description: 'Data/hora ISO do agendamento. Se omitido, usa próximo dia útil às 10h BRT.' },
      confirmed: { type: 'boolean', description: 'Deve ser true quando o usuário confirmar explicitamente o agendamento.' },
      notes: { type: 'string', description: 'Notas opcionais sobre esse agendamento.' },
    },
    required: ['confirmed'],
    category: 'action',
  },
  {
    name: 'publish_studio_post',
    description: 'Publica imediatamente um post que já tenha asset final selecionado no Studio. Resolve briefing/sessão pelo artifact anterior, usa a copy selecionada e publica no canal informado. Só use quando o usuário pedir explicitamente para publicar agora.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing. Opcional se houver background_job_id ou creative_session_id.' },
      background_job_id: { type: 'string', description: 'ID do artifact create_post_pipeline gerado anteriormente pelo Jarvis.' },
      creative_session_id: { type: 'string', description: 'UUID da sessão criativa.' },
      channel: { type: 'string', description: 'Canal alvo (instagram, facebook, linkedin, tiktok). Se omitido, tenta inferir da plataforma do workflow.' },
      title: { type: 'string', description: 'Título opcional para publicação, especialmente no LinkedIn.' },
      confirmed: { type: 'boolean', description: 'Deve ser true quando o usuário confirmar explicitamente a publicação.' },
      override_risk_guard: { type: 'boolean', description: 'Use true somente quando um humano aprovar prosseguir apesar da baixa tolerância a risco do cliente.' },
    },
    required: ['confirmed'],
    category: 'action',
  },
  // ── Web ──
  {
    name: 'web_search',
    description: 'Pesquisa informações atuais na internet. Use para buscar notícias recentes, tendências, dados de mercado, concorrentes, eventos atuais ou qualquer informação que não esteja na base do cliente. Retorna trechos relevantes de páginas web.',
    parameters: {
      query: { type: 'string', description: 'Termos de busca (em português ou inglês, seja específico)' },
      context: { type: 'string', description: 'Contexto adicional para refinar a busca (ex: setor, região, período)' },
    },
    required: ['query'],
    category: 'read',
  },
  {
    name: 'web_extract',
    description: 'Extrai o conteúdo completo de uma ou mais URLs específicas. Use quando o usuário mencionar um artigo, site de concorrente ou link que precisa ser analisado em profundidade.',
    parameters: {
      urls: { type: 'array', description: 'Lista de URLs para extrair conteúdo (máximo 3)', items: { type: 'string' } },
    },
    required: ['urls'],
    category: 'read',
  },
  {
    name: 'web_research',
    description: 'Pesquisa profunda sobre um tópico com múltiplas fontes e resposta consolidada. Use para benchmarks de mercado, análise de setor, pesquisa de concorrentes ou entender tendências com mais profundidade do que web_search.',
    parameters: {
      query: { type: 'string', description: 'Tópico a ser pesquisado em profundidade' },
      focus: { type: 'string', description: 'Foco da pesquisa', enum: ['trends', 'competitors', 'strategy', 'market_data', 'general'] },
    },
    required: ['query'],
    category: 'read',
  },

  // ── GRUPO 1: Lifecycle de Briefings ──────────────────────────
  {
    name: 'delete_briefing',
    description: 'Deleta permanentemente um briefing. Use apenas quando o usuário confirmar explicitamente que quer deletar.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing a deletar' },
    },
    required: ['briefing_id'],
    category: 'action',
  },
  {
    name: 'archive_briefing',
    description: 'Arquiva um briefing (não deleta — pode ser restaurado). Use quando o usuário quiser guardar mas tirar do fluxo ativo.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing a arquivar' },
    },
    required: ['briefing_id'],
    category: 'write',
  },
  {
    name: 'generate_approval_link',
    description: 'Gera um link de aprovação para o cliente revisar e aprovar o briefing externamente. O link expira em N dias.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing' },
      client_name: { type: 'string', description: 'Nome do cliente (para personalizar o link)' },
      expires_in_days: { type: 'number', description: 'Dias até expirar (default: 7, máx: 30)' },
    },
    required: ['briefing_id'],
    category: 'action',
  },
  {
    name: 'schedule_briefing',
    description: 'Agenda um briefing para publicação em uma data/canal específico. Requer que o briefing já tenha uma copy aprovada.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing' },
      copy_id: { type: 'string', description: 'UUID da copy version a publicar' },
      channel: { type: 'string', description: 'Canal de publicação (ex: instagram, linkedin, email)' },
      scheduled_for: { type: 'string', description: 'Data/hora no formato YYYY-MM-DDTHH:MM:SS' },
    },
    required: ['briefing_id', 'copy_id', 'channel', 'scheduled_for'],
    category: 'write',
  },

  // ── GRUPO 2: Workflow e Planejamento ─────────────────────────
  {
    name: 'update_task',
    description: 'Atualiza o status de uma tarefa de um briefing. Use quando o usuário disser que concluiu uma etapa, aprovou algo ou quer marcar como feito.',
    parameters: {
      task_id: { type: 'string', description: 'UUID da tarefa' },
      status: { type: 'string', description: 'Novo status', enum: ['pending', 'in_progress', 'done', 'cancelled'] },
    },
    required: ['task_id', 'status'],
    category: 'write',
  },
  {
    name: 'generate_strategic_brief',
    description: 'Gera um brief estratégico mensal para o cliente com diagnóstico, objetivos e recomendações baseados em dados reais do sistema.',
    parameters: {
      month: { type: 'number', description: 'Mês (1-12, default: próximo mês)' },
      year: { type: 'number', description: 'Ano (default: ano atual)' },
    },
    required: [],
    category: 'action',
  },

  // ── GRUPO 3: Inteligência Comportamental ─────────────────────
  {
    name: 'compute_behavior_profiles',
    description: 'Recalcula os perfis comportamentais da audiência do cliente com base nas métricas mais recentes das campanhas. Use quando o cliente tiver novos dados de performance.',
    parameters: {},
    required: [],
    category: 'action',
  },
  {
    name: 'compute_learning_rules',
    description: 'Recalcula as regras de aprendizado do cliente (quais AMDs e gatilhos geram uplift) com base nos dados mais recentes.',
    parameters: {},
    required: [],
    category: 'action',
  },

  // ── GRUPO 4: Pauta Inbox ──────────────────────────────────────
  {
    name: 'generate_pauta',
    description: 'Gera uma sugestão de pauta (briefing de conteúdo com 2 abordagens A/B) para o cliente. A IA cria as abordagens em segundo plano.',
    parameters: {
      title: { type: 'string', description: 'Tema ou título da pauta' },
      source_text: { type: 'string', description: 'Contexto, notícia ou ideia base para a pauta' },
      platforms: { type: 'array', description: 'Plataformas alvo (instagram, linkedin, etc)', items: { type: 'string' } },
      topic_category: { type: 'string', description: 'Categoria do conteúdo (ex: institucional, produto, educativo)' },
    },
    required: ['title'],
    category: 'action',
  },
  {
    name: 'list_pauta_inbox',
    description: 'Lista as sugestões de pauta pendentes do cliente com abordagens A e B geradas pela IA.',
    parameters: {
      status: { type: 'string', description: 'Filtrar por status', enum: ['pending', 'approved', 'rejected'] },
      limit: { type: 'number', description: 'Máximo de resultados (default: 10)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'approve_pauta',
    description: 'Aprova uma sugestão de pauta — cria automaticamente um briefing e registra feedback de preferência. Use approach A ou B.',
    parameters: {
      pauta_id: { type: 'string', description: 'UUID da sugestão de pauta' },
      approach: { type: 'string', description: 'Qual abordagem aprovar (A ou B)', enum: ['A', 'B'] },
    },
    required: ['pauta_id'],
    category: 'action',
  },
  {
    name: 'reject_pauta',
    description: 'Rejeita uma sugestão de pauta com motivo. O feedback alimenta o sistema de preferências para melhorar futuras sugestões.',
    parameters: {
      pauta_id: { type: 'string', description: 'UUID da sugestão de pauta' },
      reason: { type: 'string', description: 'Motivo da rejeição (opcional mas recomendado)' },
      tags: { type: 'array', description: 'Tags do motivo (ex: off_topic, tom_errado, ja_feito)', items: { type: 'string' } },
    },
    required: ['pauta_id'],
    category: 'write',
  },

  // ── GRUPO 5: Fontes de Clipping ───────────────────────────────
  {
    name: 'add_clipping_source',
    description: 'Adiciona uma nova fonte de monitoramento de notícias (RSS, URL de blog, portal de notícias) para o cliente.',
    parameters: {
      name: { type: 'string', description: 'Nome da fonte (ex: "Valor Econômico", "Blog Concorrente X")' },
      url: { type: 'string', description: 'URL do feed RSS ou página' },
      type: { type: 'string', description: 'Tipo da fonte', enum: ['RSS', 'NEWS', 'SOCIAL'] },
      include_keywords: { type: 'array', description: 'Palavras-chave para filtrar conteúdo relevante', items: { type: 'string' } },
    },
    required: ['name', 'url'],
    category: 'write',
  },
  {
    name: 'pause_clipping_source',
    description: 'Pausa o monitoramento de uma fonte de clipping (para de coletar novas notícias).',
    parameters: {
      source_id: { type: 'string', description: 'UUID da fonte de monitoramento' },
    },
    required: ['source_id'],
    category: 'write',
  },
  {
    name: 'resume_clipping_source',
    description: 'Retoma o monitoramento de uma fonte de clipping pausada.',
    parameters: {
      source_id: { type: 'string', description: 'UUID da fonte de monitoramento' },
    },
    required: ['source_id'],
    category: 'write',
  },

  // ── GRUPO 6: Análise e Relatórios ─────────────────────────────
  {
    name: 'analyze_cognitive_load',
    description: 'Analisa a carga cognitiva de um texto para uma plataforma específica. Retorna score Lc, densidade semântica, estresse tonal e se está dentro do range ideal para a plataforma.',
    parameters: {
      text: { type: 'string', description: 'Texto a analisar (copy, post, email)' },
      platform: { type: 'string', description: 'Plataforma alvo (instagram, linkedin, tiktok, email, etc)' },
    },
    required: ['text'],
    category: 'action',
  },
  {
    name: 'consult_gemini',
    description: 'Consulta o Gemini (Google) como especialista para obter uma perspectiva criativa ou analítica diferente. Use quando quiser um segundo ponto de vista sobre um conceito, copy, estratégia ou análise de mercado. O Gemini é especialmente bom em: raciocínio multimodal, análise de tendências culturais, criatividade visual e síntese de contexto amplo.',
    parameters: {
      question: { type: 'string', description: 'Pergunta ou briefing completo para o Gemini responder. Seja específico sobre o que você quer que ele contribua.' },
      context: { type: 'string', description: 'Contexto adicional relevante (cliente, produto, público-alvo, restrições)' },
    },
    required: ['question'],
    category: 'action',
  },
  {
    name: 'consult_openai',
    description: 'Consulta o GPT-4o (OpenAI) como especialista para obter uma perspectiva criativa ou analítica diferente. Use quando quiser um segundo ponto de vista sobre conceito, copy, estratégia, naming ou posicionamento. O GPT-4o é especialmente bom em: redação criativa, brainstorming de naming, variações de copy, análise de tom e voz de marca.',
    parameters: {
      question: { type: 'string', description: 'Pergunta ou briefing completo para o GPT-4o responder. Seja específico sobre o que você quer que ele contribua.' },
      context: { type: 'string', description: 'Contexto adicional relevante (cliente, produto, público-alvo, restrições)' },
    },
    required: ['question'],
    category: 'action',
  },

  // ── GRUPO 7: WhatsApp / Grupos ──────────────────────────────────
  {
    name: 'search_whatsapp_messages',
    description: 'Busca mensagens de grupos de WhatsApp associados ao cliente. Retorna mensagens recentes com nome do remetente, conteúdo e grupo de origem. Use para: "o que falaram no grupo", "últimas mensagens do WhatsApp", "o que o cliente pediu no zap".',
    parameters: {
      query: { type: 'string', description: 'Termo de busca dentro das mensagens (opcional — sem query retorna as mais recentes)' },
      group_name: { type: 'string', description: 'Nome parcial do grupo para filtrar (ex: "Ciclus", "Hotel")' },
      days_back: { type: 'number', description: 'Buscar últimos N dias (padrão 7, máximo 30)' },
      limit: { type: 'number', description: 'Máximo de mensagens a retornar (padrão 30, máximo 100)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'list_whatsapp_groups',
    description: 'Lista os grupos de WhatsApp linkados ao cliente com contagem de mensagens e última atividade.',
    parameters: {},
    required: [],
    category: 'read',
  },
  {
    name: 'get_whatsapp_insights',
    description: 'Retorna insights extraídos por IA das mensagens de WhatsApp do cliente: feedbacks, aprovações, reclamações, deadlines, preferências de estilo/tom.',
    parameters: {
      insight_type: { type: 'string', description: 'Filtrar por tipo de insight', enum: ['feedback', 'approval', 'request', 'preference', 'deadline', 'complaint', 'praise'] },
      days_back: { type: 'number', description: 'Últimos N dias (padrão 14)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_whatsapp_digests',
    description: 'Retorna resumos diários/semanais das conversas de WhatsApp do cliente, incluindo decisões-chave e ações pendentes.',
    parameters: {
      period: { type: 'string', description: 'Período do digest', enum: ['daily', 'weekly'] },
      limit: { type: 'number', description: 'Quantidade de digests (padrão 5)' },
    },
    required: [],
    category: 'read',
  },
];

// ── Operations Tools (tenant-scoped, no clientId required) ────

export const OPERATIONS_TOOLS: ToolDefinition[] = [
  // ── Read ──
  {
    name: 'list_operations_jobs',
    description: 'Lista jobs/demandas operacionais da agência com filtros. Retorna título, cliente, status, prioridade, responsável, prazo e risco. Use deadline_month+deadline_year para perguntas como "quantos jobs venceram em Janeiro?" ou "quais prazos caíram em março?".',
    parameters: {
      status: { type: 'string', description: 'Filtrar por status', enum: ['intake', 'planned', 'ready', 'allocated', 'in_progress', 'blocked', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published', 'done', 'archived'] },
      priority_band: { type: 'string', description: 'Filtrar por faixa de prioridade', enum: ['p0', 'p1', 'p2', 'p3'] },
      owner_id: { type: 'string', description: 'Filtrar por responsável (UUID)' },
      client_id: { type: 'string', description: 'Filtrar por cliente (ID)' },
      urgent: { type: 'boolean', description: 'Mostrar apenas urgentes' },
      unassigned: { type: 'boolean', description: 'Mostrar apenas sem responsável' },
      deadline_month: { type: 'number', description: 'Mês do prazo/deadline (1=Jan, 2=Fev, ..., 12=Dez). Use com deadline_year para filtrar por mês específico.' },
      deadline_year: { type: 'number', description: 'Ano do prazo/deadline (ex: 2026). Padrão: ano corrente se omitido.' },
      include_completed: { type: 'boolean', description: 'Se true, inclui jobs com status done e archived (necessário para análises históricas).' },
      limit: { type: 'number', description: 'Máximo de resultados (default 20, max 50)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_operations_job',
    description: 'Retorna detalhes completos de um job: título, cliente, status, prioridade, responsável, prazo, histórico de status e comentários.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
    },
    required: ['job_id'],
    category: 'read',
  },
  {
    name: 'get_operations_overview',
    description: 'Retorna snapshot da visão geral operacional: contagens por status, jobs em risco, gargalos, capacidade da equipe.',
    parameters: {},
    required: [],
    category: 'read',
  },
  {
    name: 'get_operations_risks',
    description: 'Retorna jobs em risco: atrasados, bloqueados, sem responsável com prazo próximo, P0 parados. Inclui nível de risco e sugestão de ação.',
    parameters: {},
    required: [],
    category: 'read',
  },
  {
    name: 'get_operations_signals',
    description: 'Retorna sinais operacionais ativos (alertas, avisos): atrasos, gargalos, capacidade excedida, deadlines próximos.',
    parameters: {
      limit: { type: 'number', description: 'Máximo de sinais (default 20)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_operations_team',
    description: 'Retorna membros da equipe com dados de alocação: nome, email, tipo (interno/freelancer), especialidade, jobs atribuídos, capacidade.',
    parameters: {},
    required: [],
    category: 'read',
  },
  {
    name: 'get_creative_ops_workload',
    description: 'Retorna a carga criativa da equipe: quem está sobrecarregado, em pressão, equilibrado ou com folga, com minutos comprometidos, próximos prazos, bloqueios e jobs sem dono. Use para perguntas como "quem está sobrecarregado?" ou "como está a carga dos DAs?".',
    parameters: {
      person_type: { type: 'string', description: 'Filtrar por tipo de pessoa', enum: ['all', 'freelancer', 'internal'] },
      specialty: { type: 'string', description: 'Filtrar por especialidade (ex: design, motion, copy)' },
      only_overloaded: { type: 'boolean', description: 'Mostrar só pessoas em sobrecarga ou pressão' },
      include_jobs: { type: 'boolean', description: 'Se true, inclui uma amostra dos jobs por pessoa' },
      limit: { type: 'number', description: 'Máximo de pessoas retornadas (default 12, max 25)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_da_capacity',
    description: 'Retorna a capacidade semanal dos DAs/freelas: slots totais, usados, disponíveis e ranking de quem pode absorver novas demandas. Use para "quem pode pegar mais?" ou "como está a capacidade da equipe de arte?".',
    parameters: {
      required_skill: { type: 'string', description: 'Skill desejada para filtrar o ranking (ex: design, video, social)' },
      limit: { type: 'number', description: 'Máximo de nomes retornados (default 10, max 20)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'suggest_job_allocation',
    description: 'Sugere os melhores responsáveis para um job com base em skill, plataforma, capacidade, carga atual e histórico. Use antes de atribuir ou redistribuir um job criativo.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
      limit: { type: 'number', description: 'Máximo de sugestões (default 5, max 8)' },
    },
    required: ['job_id'],
    category: 'read',
  },
  {
    name: 'suggest_creative_redistribution',
    description: 'Analisa a operação criativa e sugere redistribuições seguras de carga: quais jobs podem sair de quem está sobrecarregado e para quem devem ir. Use para perguntas como "o que devo redistribuir?" ou "quem devo desafogar?".',
    parameters: {
      owner_id: { type: 'string', description: 'UUID de um responsável específico para avaliar (opcional)' },
      max_jobs: { type: 'number', description: 'Máximo de sugestões de redistribuição (default 5, max 8)' },
      only_high_risk: { type: 'boolean', description: 'Se true, foca apenas em jobs com risco alto/crítico ou donos em pressão forte' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_creative_ops_risk_report',
    description: 'Retorna um relatório de risco criativo por responsável: quem está em pressão real, quem concentra jobs críticos/altos, bloqueios, prazos próximos e jobs sem dono. Use para "quem está em maior risco?", "qual DA está em perigo?" ou "onde a operação criativa pode estourar?".',
    parameters: {
      person_type: { type: 'string', description: 'Filtrar por tipo de pessoa', enum: ['all', 'freelancer', 'internal'] },
      owner_id: { type: 'string', description: 'UUID de um responsável específico (opcional)' },
      only_high_risk: { type: 'boolean', description: 'Se true, retorna apenas pessoas e jobs em alto/critico' },
      limit: { type: 'number', description: 'Máximo de responsáveis retornados (default 8, max 20)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_creative_ops_quality',
    description: 'Retorna qualidade operacional criativa por responsável: taxa de aprovação, pressão de retrabalho, média de revisões, mudanças pedidas em review e hotspots de qualidade. Use para "quem está gerando mais retrabalho?", "quem aprova melhor?" ou "como está a qualidade da equipe criativa?".',
    parameters: {
      person_type: { type: 'string', description: 'Filtrar por tipo de pessoa', enum: ['all', 'freelancer', 'internal'] },
      owner_id: { type: 'string', description: 'UUID de um responsável específico (opcional)' },
      specialty: { type: 'string', description: 'Filtrar por especialidade (ex: design, motion, social)' },
      days_back: { type: 'number', description: 'Janela histórica em dias (default 120, max 365)' },
      limit: { type: 'number', description: 'Máximo de responsáveis retornados (default 10, max 20)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_creative_ops_bottlenecks',
    description: 'Mapeia gargalos criativos por estágio, tipo de job e canal: onde há acúmulo, bloqueio, jobs sem dono, risco alto e retrabalho acima do saudável. Use para "onde está travando?", "qual etapa está congestionada?" ou "que tipo de peça está virando gargalo?".',
    parameters: {
      stage: { type: 'string', description: 'Filtrar por status/etapa específica (opcional)' },
      limit: { type: 'number', description: 'Máximo de grupos retornados por seção (default 6, max 12)' },
      only_high_impact: { type: 'boolean', description: 'Se true, mostra só gargalos com risco, bloqueio ou retrabalho relevante' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'apply_job_allocation_recommendation',
    description: 'Aplica a melhor recomendação de responsável para um job: define owner e cria/atualiza a alocação principal com janela sugerida. Só use depois que o usuário pedir explicitamente para executar a atribuição.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
      owner_id: { type: 'string', description: 'UUID do responsável escolhido. Se omitido, usa a melhor sugestão atual.' },
      confirmed: { type: 'boolean', description: 'Deve ser true somente quando o usuário confirmar a execução.' },
      notes: { type: 'string', description: 'Nota opcional sobre a decisão de alocação.' },
    },
    required: ['job_id', 'confirmed'],
    category: 'action',
  },
  {
    name: 'apply_creative_redistribution',
    description: 'Executa uma redistribuição criativa: move um job para outro responsável e recalcula a alocação principal. Só use quando o usuário confirmar explicitamente que quer aplicar a redistribuição.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job a mover' },
      to_owner_id: { type: 'string', description: 'UUID do novo responsável. Se omitido, usa a melhor alternativa elegível.' },
      confirmed: { type: 'boolean', description: 'Deve ser true somente quando o usuário confirmar a execução.' },
      notes: { type: 'string', description: 'Motivo ou nota sobre a redistribuição.' },
    },
    required: ['job_id', 'confirmed'],
    category: 'action',
  },
  {
    name: 'get_client_weekly_summary',
    description: 'Monta um resumo semanal consolidado de um cliente: WhatsApp recente, reuniões e decisões pendentes, jobs em andamento e alertas ativos. Use para perguntas como "me resume esse cliente na última semana".',
    parameters: {
      client_id: { type: 'string', description: 'ID do cliente. Opcional no planning quando o cliente atual já está no contexto.' },
      days_back: { type: 'number', description: 'Janela em dias (padrão 7, máximo 14).' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_operations_daily_brief',
    description: 'Gera o daily brief da agência com o que está pegando hoje: entregas do dia, bloqueios, sinais críticos e principal ação sugerida.',
    parameters: {},
    required: [],
    category: 'read',
  },
  {
    name: 'get_system_health',
      description: 'Diagnostica a saúde operacional do sistema para o tenant atual: fila de retries de webhooks, outbox do Trello, fila assíncrona do Jarvis, watches do Google e inteligência de clientes stale. Use quando o usuário pedir para checar se o sistema está saudável ou o que precisa ser corrigido.',
    parameters: {},
    required: [],
    category: 'read',
  },
  {
    name: 'get_operations_lookups',
    description: 'Retorna dados de referência para criação de jobs e ações operacionais: tipos de job, skills, canais, clientes, owners e boards/listas do Trello disponíveis.',
    parameters: {},
    required: [],
    category: 'read',
  },

  // ── Write ──
  {
    name: 'create_operations_job',
    description: 'Cria um novo job/demanda operacional. Use quando o gestor pedir para criar uma demanda, tarefa ou job.',
    parameters: {
      title: { type: 'string', description: 'Título do job' },
      client_id: { type: 'string', description: 'ID do cliente' },
      job_type: { type: 'string', description: 'Tipo de job (ex: copy, design_static, design_carousel, campaign, stories, reels, video, strategy, report)' },
      complexity: { type: 'string', description: 'Complexidade', enum: ['s', 'm', 'l'] },
      source: { type: 'string', description: 'Origem da demanda (ex: jarvis, client_request, internal, briefing)' },
      summary: { type: 'string', description: 'Descrição / resumo do job' },
      owner_id: { type: 'string', description: 'UUID do responsável (opcional)' },
      deadline_at: { type: 'string', description: 'Prazo no formato ISO (YYYY-MM-DDTHH:MM:SS)' },
      channel: { type: 'string', description: 'Canal (instagram, linkedin, tiktok, etc)' },
      is_urgent: { type: 'boolean', description: 'Se é urgente' },
      urgency_reason: { type: 'string', description: 'Motivo da urgência' },
    },
    required: ['title', 'job_type', 'complexity', 'source'],
    category: 'write',
  },
  {
    name: 'send_whatsapp_message',
    description: 'Envia uma mensagem de WhatsApp para cliente, responsável interno/freela ou número explícito. Exige confirmação explícita.',
    parameters: {
      message: { type: 'string', description: 'Mensagem a enviar.' },
      client_id: { type: 'string', description: 'ID do cliente para usar o WhatsApp principal dele.' },
      user_id: { type: 'string', description: 'UUID do usuário interno/freela que deve receber a mensagem.' },
      phone: { type: 'string', description: 'Número/WhatsApp explícito em E.164 ou jid.' },
      confirmed: { type: 'boolean', description: 'Deve ser true somente quando o usuário confirmar o envio.' },
      override_risk_guard: { type: 'boolean', description: 'Use true somente quando um humano aprovar prosseguir apesar da baixa tolerância a risco do cliente.' },
    },
    required: ['message'],
    category: 'action',
  },
  {
    name: 'send_email',
    description: 'Envia um e-mail para cliente, responsável interno/freela ou endereço explícito. Exige confirmação explícita.',
    parameters: {
      subject: { type: 'string', description: 'Assunto do e-mail.' },
      body: { type: 'string', description: 'Corpo do e-mail em texto simples.' },
      client_id: { type: 'string', description: 'ID do cliente para usar o contato principal.' },
      user_id: { type: 'string', description: 'UUID do usuário interno/freela que deve receber o e-mail.' },
      to: { type: 'string', description: 'E-mail explícito de destino.' },
      confirmed: { type: 'boolean', description: 'Deve ser true somente quando o usuário confirmar o envio.' },
      override_risk_guard: { type: 'boolean', description: 'Use true somente quando um humano aprovar prosseguir apesar da baixa tolerância a risco do cliente.' },
    },
    required: ['subject', 'body'],
    category: 'action',
  },
  {
    name: 'create_trello_card',
    description: 'Cria um card ad-hoc em um board/lista específica do Trello e espelha no Edro. Use quando o usuário pedir para abrir uma demanda rápida direto no board.',
    parameters: {
      board_id: { type: 'string', description: 'ID do board importado no Edro (project_boards.id).' },
      list_id: { type: 'string', description: 'ID da lista no Edro (project_lists.id).' },
      title: { type: 'string', description: 'Título do card.' },
      description: { type: 'string', description: 'Descrição/resumo do card.' },
      due_date: { type: 'string', description: 'Prazo opcional no formato YYYY-MM-DD.' },
      owner_id: { type: 'string', description: 'UUID opcional do responsável a vincular.' },
    },
    required: ['board_id', 'list_id', 'title'],
    category: 'action',
  },
  {
    name: 'update_operations_job',
    description: 'Atualiza campos de um job existente: título, responsável, prazo, prioridade, complexidade, etc.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job a atualizar' },
      title: { type: 'string', description: 'Novo título' },
      owner_id: { type: 'string', description: 'UUID do novo responsável' },
      deadline_at: { type: 'string', description: 'Novo prazo (ISO)' },
      summary: { type: 'string', description: 'Nova descrição' },
      complexity: { type: 'string', description: 'Nova complexidade', enum: ['s', 'm', 'l'] },
      is_urgent: { type: 'boolean', description: 'Marcar como urgente' },
      urgency_reason: { type: 'string', description: 'Motivo da urgência' },
    },
    required: ['job_id'],
    category: 'write',
  },

  // ── Action ──
  {
    name: 'execute_multi_step_workflow',
    description: 'Executa um workflow multi-step com confirmação única em lote, retomada do ponto de falha e compensação dos passos reversíveis. Use quando o usuário pedir para fazer uma sequência inteira de ações de uma vez.',
    parameters: {
      workflow_json: { type: 'string', description: 'JSON string com array de steps: [{"tool":"change_job_status","args":{...}}, ...].' },
      confirmed: { type: 'boolean', description: 'Deve ser true somente quando o usuário confirmar a execução do lote.' },
      manual_requeue: { type: 'boolean', description: 'Use true somente quando um humano confirmar o reenfileiramento manual de um workflow que caiu na fila morta.' },
    },
    required: ['workflow_json', 'confirmed'],
    category: 'action',
  },
  {
    name: 'run_system_repair',
      description: 'Executa um reparo operacional seguro no tenant atual. Pode processar retries de webhook, flush da fila do Trello, reenfileirar falhas permanentes do Trello, garantir webhooks do Trello, reconciliar boards dark do Trello, recuperar workflows presos do Jarvis, recuperar fila de reuniões do Google Calendar, renovar watches do Google, rodar fallback do Gmail, refresh da inteligência ou auto-reparar os gargalos detectados. Exige confirmação explícita.',
    parameters: {
      repair_type: {
        type: 'string',
        description: 'Tipo de reparo a executar.',
          enum: ['auto_repair', 'process_webhook_retries', 'flush_trello_outbox', 'recover_stale_trello_outbox', 'revive_dead_trello_outbox', 'ensure_trello_webhooks', 'replay_trello_webhook_events', 'reconcile_trello_dark_boards', 'recover_jarvis_background_jobs', 'recover_calendar_auto_joins', 'renew_google_watches', 'run_gmail_fallback', 'refresh_client_intelligence', 'refresh_jarvis_alerts'],
        },
      confirmed: { type: 'boolean', description: 'Deve ser true somente quando o usuário confirmar o reparo.' },
    },
    required: ['repair_type', 'confirmed'],
    category: 'action',
  },
  {
    name: 'change_job_status',
    description: 'Muda o status de um job. Use para avançar, bloquear, concluir ou retroceder um job na pipeline.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
      status: { type: 'string', description: 'Novo status', enum: ['intake', 'planned', 'ready', 'allocated', 'in_progress', 'blocked', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published', 'done'] },
      reason: { type: 'string', description: 'Motivo da mudança (opcional mas recomendado)' },
    },
    required: ['job_id', 'status'],
    category: 'action',
  },
  {
    name: 'assign_job_owner',
    description: 'Atribui um responsável a um job. Use quando o gestor pedir para atribuir, delegar ou alocar alguém a um job.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
      owner_id: { type: 'string', description: 'UUID do responsável a atribuir' },
    },
    required: ['job_id', 'owner_id'],
    category: 'action',
  },
  {
    name: 'resolve_operations_signal',
    description: 'Resolve (fecha) um sinal/alerta operacional. Use quando o gestor indicar que um alerta foi resolvido.',
    parameters: {
      signal_id: { type: 'string', description: 'UUID do sinal' },
    },
    required: ['signal_id'],
    category: 'action',
  },
  {
    name: 'snooze_operations_signal',
    description: 'Adia um sinal/alerta operacional por N horas. Use quando o gestor quiser adiar um alerta.',
    parameters: {
      signal_id: { type: 'string', description: 'UUID do sinal' },
      hours: { type: 'number', description: 'Horas para adiar (default 4, max 72)' },
    },
    required: ['signal_id'],
    category: 'action',
  },
  {
    name: 'manage_job_allocation',
    description: 'Cria ou atualiza a alocação de um job: responsável, tempo planejado, janela de trabalho, notas.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
      owner_id: { type: 'string', description: 'UUID do responsável' },
      planned_minutes: { type: 'number', description: 'Tempo planejado em minutos' },
      starts_at: { type: 'string', description: 'Início da janela (ISO datetime)' },
      ends_at: { type: 'string', description: 'Fim da janela (ISO datetime)' },
      notes: { type: 'string', description: 'Notas sobre a alocação' },
      status: { type: 'string', description: 'Status da alocação', enum: ['tentative', 'committed', 'blocked', 'done', 'dropped'] },
    },
    required: ['job_id', 'owner_id'],
    category: 'action',
  },
  // ── Briefing tools ──────────────────────────────────────────────────────────
  {
    name: 'get_job_briefing',
    description: 'Busca o briefing de um job e o contexto do cliente pré-preenchido (tom, clusters, estilo visual). Use antes de criar ou completar um briefing. Se houver um job já selecionado na tela atual, use esse contexto como prioridade.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
    },
    required: ['job_id'],
    category: 'read',
  },
  {
    name: 'fill_job_briefing',
    description: 'Preenche ou atualiza o briefing inteligente de um job. Informe os campos do job que são específicos — o perfil do cliente já é carregado automaticamente. Chame get_job_briefing primeiro para ver o contexto do cliente. Se a tela atual já estiver focada em um job, trate esse job como alvo padrão.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
      context_trigger: { type: 'string', description: 'Por que este job existe agora', enum: ['lançamento_produto', 'ativacao_sazonalidade', 'oportunidade_tendencia', 'demanda_cliente', 'estrategia_proativa', 'crise_reputacao'] },
      consumer_moment: { type: 'string', description: 'Momento do consumidor', enum: ['descobrindo_problema', 'comparando_solucoes', 'decidindo_compra', 'ja_cliente_upsell', 'pos_compra_retencao'] },
      main_risk: { type: 'string', description: 'Principal risco a evitar', enum: ['mensagem_generica', 'publico_errado', 'timing_incorreto', 'tom_inadequado', 'saturacao_formato'] },
      main_objective: { type: 'string', description: 'Objetivo principal', enum: ['reconhecimento', 'engajamento', 'conversao', 'performance', 'mix'] },
      success_metrics: { type: 'array', items: { type: 'string' }, description: 'Métricas de sucesso (ex: taxa_salvamento, ctr, leads, alcance, engajamento, vendas)' },
      specific_barriers: { type: 'array', items: { type: 'string' }, description: 'Barreiras de conversão (ex: preco_alto, nao_conhece_marca, momento_errado, nao_percebe_valor, concorrente_preferido, excesso_informacao)' },
      message_structure: { type: 'string', description: 'Estrutura da mensagem', enum: ['prova_social', 'transformacao', 'contraste', 'urgencia', 'curiosidade', 'storytelling', 'dado_surpreendente'] },
      desired_emotion: { type: 'array', items: { type: 'string' }, description: 'Emoções desejadas (máx 2): confianca, pertencimento, urgencia, admiracao, alivio, inspiracao, divertimento, nostalgia' },
      desired_amd: { type: 'string', description: 'Ação desejada (AMD)', enum: ['salvar', 'clicar', 'compartilhar', 'responder', 'marcar_amigo', 'proposta_direta'] },
      regulatory_flags: { type: 'array', items: { type: 'string' }, description: 'Restrições regulatórias: linguagem_promocional, produto_financeiro, alimento_bebida, saude_medicamento, infantil, politico, sem_restricoes' },
      ref_notes: { type: 'string', description: 'Notas e referências específicas para este job' },
      pieces: { type: 'array', items: { type: 'string' }, description: 'Array de peças como strings "formato|plataforma|versoes" (ex: "reels|instagram|2", "carrossel|instagram|1", "post_feed|linkedin|1")' },
    },
    required: ['job_id', 'context_trigger', 'consumer_moment', 'main_objective', 'desired_amd'],
    category: 'action',
  },
  {
    name: 'submit_job_briefing',
    description: 'Submete o briefing de um job para aprovação. O briefing deve estar preenchido (use fill_job_briefing antes). Se já houver um job em foco na tela, use-o como alvo padrão.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
    },
    required: ['job_id'],
    category: 'action',
  },
  {
    name: 'approve_job_briefing',
    description: 'Aprova o briefing de um job e dispara a geração de copy pelo pipeline de IA. Use depois de submit_job_briefing ou quando o briefing já estiver submetido. Se houver um job atual na tela, use esse contexto.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
    },
    required: ['job_id'],
    category: 'action',
  },
  {
    name: 'get_job_creative_drafts',
    description: 'Busca os rascunhos de copy e imagem gerados pela IA para um job. Retorna hook, corpo, CTA e score Fogg por peça. Se o usuário estiver olhando um job, use esse contexto.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
    },
    required: ['job_id'],
    category: 'read',
  },
  {
    name: 'approve_creative_draft',
    description: 'Aprova um rascunho de copy ou imagem gerado pela IA. Avança o job para o próximo estágio.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
      draft_id: { type: 'string', description: 'UUID do rascunho (obtido via get_job_creative_drafts)' },
    },
    required: ['job_id', 'draft_id'],
    category: 'action',
  },
  {
    name: 'regenerate_creative_draft',
    description: 'Descarta o rascunho atual e solicita nova geração de copy ou imagem para o job. Se existir um job em foco na tela, considere-o o alvo padrão.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
      step: { type: 'string', description: 'Etapa a regenerar', enum: ['copy', 'image'] },
    },
    required: ['job_id', 'step'],
    category: 'action',
  },
  {
    name: 'get_art_direction',
    description: 'Recupera a direção de arte atual de um job ou briefing: estratégia visual, layout proposto e prompt de imagem positivo/negativo.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job de operações' },
      briefing_id: { type: 'string', description: 'UUID do briefing do job' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'generate_art_direction',
    description: 'Executa o orquestrador de direção de arte: gera estratégia visual, layout e prompt de imagem a partir do copy aprovado.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing do job' },
      job_id: { type: 'string', description: 'UUID do job de operações' },
      copy: { type: 'string', description: 'Copy aprovado que servirá de base para a direção de arte' },
      platform: { type: 'string', description: 'Plataforma alvo (instagram, linkedin, facebook, etc)' },
      format: { type: 'string', description: 'Formato (feed, reels, stories, carrossel, etc)' },
    },
    required: ['copy'],
    category: 'action',
  },
  {
    name: 'generate_image',
    description: 'Gera uma imagem usando Fal.ai a partir de um prompt. Pode salvar o resultado no draft do job/briefing.',
    parameters: {
      prompt: { type: 'string', description: 'Prompt positivo para geração da imagem' },
      negative_prompt: { type: 'string', description: 'Elementos que devem ser evitados na imagem' },
      job_id: { type: 'string', description: 'UUID do job para salvar o resultado' },
      briefing_id: { type: 'string', description: 'UUID do briefing para salvar o resultado' },
      aspect_ratio: { type: 'string', description: 'Proporção da imagem. Ex.: 1:1, 9:16, 4:5, 16:9' },
      model: { type: 'string', description: 'Modelo Fal.ai. Ex.: flux-pro, flux-realism, recraft-v3, ideogram-v2' },
      confirmed: { type: 'boolean', description: 'true quando o usuário confirmar a geração da imagem' },
    },
    required: ['prompt'],
    category: 'action',
  },
  {
    name: 'iterate_image',
    description: 'Refina uma imagem já gerada aplicando novas instruções ao prompt original e cria uma nova variação do draft.',
    parameters: {
      draft_id: { type: 'string', description: 'UUID do draft de imagem a refinar' },
      instructions: { type: 'string', description: 'Instruções adicionais para a nova geração. Ex.: mais contraste, fundo mais escuro' },
      confirmed: { type: 'boolean', description: 'true quando o usuário confirmar a nova geração' },
    },
    required: ['draft_id', 'instructions'],
    category: 'action',
  },
  {
    name: 'approve_image',
    description: 'Aprova um draft de imagem gerado pela IA e marca o ativo como aprovado no pipeline do job.',
    parameters: {
      draft_id: { type: 'string', description: 'UUID do draft de imagem a aprovar' },
      notes: { type: 'string', description: 'Observações opcionais sobre a aprovação da imagem' },
    },
    required: ['draft_id'],
    category: 'action',
  },
  {
    name: 'list_recipes',
    description: 'Lista receitas criativas salvas. Inclui receitas globais do tenant e, quando houver contexto de cliente, também as receitas desse cliente.',
    parameters: {
      client_id: { type: 'string', description: 'ID do cliente para filtrar receitas. Aceita clients.id legado ou edro_clients.id' },
      platform: { type: 'string', description: 'Filtrar por plataforma (instagram, linkedin, etc)' },
      objective: { type: 'string', description: 'Filtrar por objetivo (awareness, conversion, engagement)' },
      limit: { type: 'number', description: 'Máximo de resultados. Padrão: 20, limite: 50' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_recipe',
    description: 'Retorna os detalhes completos de uma receita criativa pelo ID.',
    parameters: {
      recipe_id: { type: 'string', description: 'UUID da receita criativa' },
    },
    required: ['recipe_id'],
    category: 'read',
  },
  {
    name: 'create_recipe',
    description: 'Salva uma nova receita criativa reutilizável com configurações de pipeline, plataforma, formato, gatilho e notas de tom.',
    parameters: {
      name: { type: 'string', description: 'Nome descritivo da receita' },
      client_id: { type: 'string', description: 'ID do cliente. Aceita clients.id legado ou edro_clients.id. Se omitido, a receita fica global no tenant' },
      objective: { type: 'string', description: 'Objetivo da receita. Ex.: awareness, conversion, engagement, retention' },
      platform: { type: 'string', description: 'Plataforma alvo. Ex.: instagram, linkedin, facebook, tiktok' },
      format: { type: 'string', description: 'Formato principal. Ex.: Feed, Reels, Carrossel, Stories' },
      pipeline_type: { type: 'string', description: 'Tipo do pipeline. Ex.: standard, premium, adversarial' },
      trigger_id: { type: 'string', description: 'Gatilho persuasivo principal. Ex.: G01, G02, G03...' },
      provider: { type: 'string', description: 'Provedor principal de imagem. Ex.: fal, gemini, leonardo' },
      model: { type: 'string', description: 'Modelo específico do provedor' },
      tone_notes: { type: 'string', description: 'Notas de tom e voz para esta receita' },
    },
    required: ['name'],
    category: 'action',
  },
  {
    name: 'apply_recipe',
    description: 'Aplica uma receita ou template criativo para criar um novo briefing pré-configurado no Studio.',
    parameters: {
      recipe_id: { type: 'string', description: 'UUID da receita criativa' },
      template_id: { type: 'string', description: 'ID do template de briefing (edro_briefing_templates)' },
      client_id: { type: 'string', description: 'ID do cliente para o novo briefing. Aceita clients.id legado ou edro_clients.id' },
      title: { type: 'string', description: 'Título do novo briefing. Se omitido, usa o nome da receita/template' },
      additional_notes: { type: 'string', description: 'Notas extras a incluir no briefing criado' },
    },
    required: [],
    category: 'action',
  },
  {
    name: 'delete_recipe',
    description: 'Remove uma receita criativa salva. Não afeta briefings já criados a partir dela.',
    parameters: {
      recipe_id: { type: 'string', description: 'UUID da receita a remover' },
    },
    required: ['recipe_id'],
    category: 'action',
  },
  {
    name: 'list_platform_connections',
    description: 'Lista as plataformas conectadas de um cliente no Studio, incluindo status de conexão e último sync conhecido.',
    parameters: {
      client_id: { type: 'string', description: 'ID do cliente. Aceita clients.id legado ou edro_clients.id. Se omitido, usa o cliente em contexto.' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_platform_recommendations',
    description: 'Recomenda as melhores plataformas para publicar com base nas conexões do cliente, formato do conteúdo e performance recente de posts próprios.',
    parameters: {
      client_id: { type: 'string', description: 'ID do cliente. Aceita clients.id legado ou edro_clients.id. Se omitido, usa o cliente em contexto.' },
      format: { type: 'string', description: 'Formato do conteúdo: feed, reels, carrossel, stories.' },
      objective: { type: 'string', description: 'Objetivo principal: awareness, conversion, engagement.' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'schedule_to_platforms',
    description: 'Agenda um briefing/copy aprovado em múltiplas plataformas de uma vez, reaproveitando a fila de publicação já existente.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing a publicar' },
      copy_id: { type: 'string', description: 'UUID da copy aprovada. Se omitido, tenta usar a última selected/approved do briefing' },
      client_id: { type: 'string', description: 'ID do cliente para validar conexões. Aceita clients.id legado ou edro_clients.id' },
      platforms: { type: 'array', description: 'Lista de plataformas alvo. Ex.: [meta, linkedin, tiktok]', items: { type: 'string' } },
      scheduled_for: { type: 'string', description: 'Data/hora ISO 8601. Se omitido, usa o próximo dia útil às 10h BRT.' },
      confirmed: { type: 'boolean', description: 'true quando o usuário confirmar o agendamento' },
    },
    required: ['briefing_id'],
    category: 'action',
  },
  {
    name: 'navigate_to_view',
    description: 'Navega o usuário para uma tela específica do sistema. Use quando o usuário pedir "me leva até", "abrir", "ir para", "mostrar a tela de", etc.',
    parameters: {
      view: {
        type: 'string',
        description: 'Destino da navegação',
        enum: [
          'operacoes',
          'operacoes/kanban',
          'clientes',
          'campanhas',
          'equipe',
          'agenda',
          'admin/health',
          'admin/trello',
          'admin/campanhas',
        ],
      },
      label: { type: 'string', description: 'Texto descritivo curto do destino para exibir ao usuário' },
    },
    required: ['view'],
    category: 'action',
  },
];

export function getOperationsToolDefinitions(): ToolDefinition[] {
  return OPERATIONS_TOOLS;
}

// ── Provider Format Converters ──────────────────────────────────

function buildJsonSchema(tool: ToolDefinition) {
  const properties: Record<string, any> = {};
  for (const [key, param] of Object.entries(tool.parameters)) {
    const prop: any = { type: param.type, description: param.description };
    if (param.enum) prop.enum = param.enum;
    if (param.items) prop.items = param.items;
    properties[key] = prop;
  }
  return {
    type: 'object' as const,
    properties,
    required: tool.required,
  };
}

export function toClaudeTools(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: buildJsonSchema(t),
  }));
}

export function toOpenAITools(tools: ToolDefinition[]) {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: buildJsonSchema(t),
    },
  }));
}

export function toGeminiTools(tools: ToolDefinition[]) {
  const declarations = tools.map((t) => {
    const properties: Record<string, any> = {};
    for (const [key, param] of Object.entries(t.parameters)) {
      const prop: any = { type: param.type.toUpperCase(), description: param.description };
      if (param.enum) prop.enum = param.enum;
      if (param.items) prop.items = { type: (param.items.type || 'string').toUpperCase() };
      properties[key] = prop;
    }
    return {
      name: t.name,
      description: t.description,
      parameters: {
        type: 'OBJECT',
        properties,
        required: t.required,
      },
    };
  });
  return [{ function_declarations: declarations }];
}

export function getAllToolDefinitions(): ToolDefinition[] {
  return [...TOOLS, ...OPERATIONS_TOOLS];
}
