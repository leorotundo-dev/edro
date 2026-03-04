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
];

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
  return TOOLS;
}
