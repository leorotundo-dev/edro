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

  // ── JARVIS KB ──
  {
    name: 'search_jarvis_kb',
    description: 'Busca padrões aprendidos no KB do JARVIS para este cliente. Use quando precisar de evidência sobre o que funcionou antes (gatilhos, personas, AMDs, plataformas). Retorna até 5 entradas ordenadas por nível de evidência.',
    parameters: {
      query: { type: 'string', description: 'Termo de busca (ex: "loss aversion", "linkedin", "salvar", "persona CEO")' },
      category: { type: 'string', description: 'Filtrar por categoria: trigger | platform | amd | persona | proposal | health_finding' },
    },
    required: ['query'],
    category: 'read',
  },
];

// ── Operations Tools (tenant-scoped, no clientId required) ────

export const OPERATIONS_TOOLS: ToolDefinition[] = [
  // ── Read ──
  {
    name: 'list_operations_jobs',
    description: 'Lista jobs/demandas operacionais da agência com filtros. Retorna título, cliente, status, prioridade, responsável, prazo e risco.',
    parameters: {
      status: { type: 'string', description: 'Filtrar por status', enum: ['intake', 'planned', 'ready', 'allocated', 'in_progress', 'blocked', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published', 'done', 'archived'] },
      priority_band: { type: 'string', description: 'Filtrar por faixa de prioridade', enum: ['p0', 'p1', 'p2', 'p3'] },
      owner_id: { type: 'string', description: 'Filtrar por responsável (UUID)' },
      client_id: { type: 'string', description: 'Filtrar por cliente (ID)' },
      urgent: { type: 'boolean', description: 'Mostrar apenas urgentes' },
      unassigned: { type: 'boolean', description: 'Mostrar apenas sem responsável' },
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
    name: 'get_operations_lookups',
    description: 'Retorna dados de referência para criação de jobs: tipos de job, skills, canais, clientes e owners disponíveis.',
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
    description: 'Busca o briefing de um job e o contexto do cliente pré-preenchido (tom, clusters, estilo visual). Use antes de criar ou completar um briefing.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
    },
    required: ['job_id'],
    category: 'read',
  },
  {
    name: 'fill_job_briefing',
    description: 'Preenche ou atualiza o briefing inteligente de um job. Informe os campos do job que são específicos — o perfil do cliente já é carregado automaticamente. Chame get_job_briefing primeiro para ver o contexto do cliente.',
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
    description: 'Submete o briefing de um job para aprovação. O briefing deve estar preenchido (use fill_job_briefing antes).',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
    },
    required: ['job_id'],
    category: 'action',
  },
  {
    name: 'approve_job_briefing',
    description: 'Aprova o briefing de um job e dispara a geração de copy pelo pipeline de IA. Use depois de submit_job_briefing ou quando o briefing já estiver submetido.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
    },
    required: ['job_id'],
    category: 'action',
  },
  {
    name: 'get_job_creative_drafts',
    description: 'Busca os rascunhos de copy e imagem gerados pela IA para um job. Retorna hook, corpo, CTA e score Fogg por peça.',
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
    description: 'Descarta o rascunho atual e solicita nova geração de copy ou imagem para o job.',
    parameters: {
      job_id: { type: 'string', description: 'UUID do job' },
      step: { type: 'string', description: 'Etapa a regenerar', enum: ['copy', 'image'] },
    },
    required: ['job_id', 'step'],
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
