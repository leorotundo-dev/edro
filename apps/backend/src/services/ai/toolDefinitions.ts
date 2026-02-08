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
    description: 'Lista briefings do cliente atual. Retorna titulo, status, data de criacao e deadline.',
    parameters: {
      status: { type: 'string', description: 'Filtrar por status', enum: ['draft', 'in_progress', 'done', 'cancelled'] },
      limit: { type: 'number', description: 'Maximo de resultados (default 10, max 20)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_briefing',
    description: 'Retorna detalhes completos de um briefing: titulo, payload, stages, copies gerados e tarefas.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing' },
    },
    required: ['briefing_id'],
    category: 'read',
  },
  {
    name: 'create_briefing',
    description: 'Cria um novo briefing para o cliente. Use quando o usuario pedir para criar um briefing, post, ou conteudo.',
    parameters: {
      title: { type: 'string', description: 'Titulo do briefing' },
      objective: { type: 'string', description: 'Objetivo (ex: engajamento, awareness, conversao)' },
      platform: { type: 'string', description: 'Plataforma alvo (instagram, facebook, linkedin, tiktok, youtube, twitter)' },
      format: { type: 'string', description: 'Formato do conteudo (post, reels, stories, carousel, video)' },
      deadline: { type: 'string', description: 'Data limite no formato YYYY-MM-DD' },
      channels: { type: 'array', description: 'Canais de distribuicao', items: { type: 'string' } },
      notes: { type: 'string', description: 'Notas ou instrucoes adicionais' },
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
    description: 'Gera opcoes de copy (texto criativo) para um briefing usando o pipeline de IA. Retorna preview do copy gerado.',
    parameters: {
      briefing_id: { type: 'string', description: 'UUID do briefing' },
      count: { type: 'number', description: 'Numero de opcoes a gerar (default 3, max 5)' },
      language: { type: 'string', description: 'Idioma (default pt)', enum: ['pt', 'en', 'es'] },
      instructions: { type: 'string', description: 'Instrucoes adicionais para a geracao do copy' },
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
      limit: { type: 'number', description: 'Maximo de resultados (default 10)' },
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

  // ── Clipping & Monitoramento ──
  {
    name: 'search_clipping',
    description: 'Busca noticias e materias matcheadas para o cliente. Retorna titulo, snippet, score de relevancia e URL.',
    parameters: {
      query: { type: 'string', description: 'Termo de busca (opcional - sem filtro retorna por score)' },
      min_score: { type: 'number', description: 'Score minimo de relevancia (0-100, default 0)' },
      recency: { type: 'string', description: 'Recencia', enum: ['24h', '7d', '30d'] },
      limit: { type: 'number', description: 'Maximo de resultados (default 10, max 20)' },
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
      limit: { type: 'number', description: 'Maximo de resultados (default 10)' },
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
      limit: { type: 'number', description: 'Maximo de resultados (default 10)' },
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
      limit: { type: 'number', description: 'Maximo de resultados (default 10)' },
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
      limit: { type: 'number', description: 'Maximo de resultados (default 10)' },
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
      limit: { type: 'number', description: 'Maximo de resultados (default 10)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'get_campaign',
    description: 'Retorna detalhes de uma campanha: formatos, metricas de performance, ROI e predicoes.',
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
      limit: { type: 'number', description: 'Maximo de resultados (default 10)' },
    },
    required: [],
    category: 'read',
  },
  {
    name: 'action_opportunity',
    description: 'Aceita (cria briefing automaticamente) ou dispensa uma oportunidade detectada.',
    parameters: {
      opportunity_id: { type: 'string', description: 'UUID da oportunidade' },
      action: { type: 'string', description: 'Acao a tomar', enum: ['accept', 'dismiss'] },
    },
    required: ['opportunity_id', 'action'],
    category: 'write',
  },

  // ── Inteligencia do Cliente ──
  {
    name: 'get_client_profile',
    description: 'Retorna o perfil completo do cliente: segmento, keywords, pilares de conteudo, tom de voz, publico-alvo.',
    parameters: {},
    required: [],
    category: 'read',
  },
  {
    name: 'get_intelligence_health',
    description: 'Verifica a saude das fontes de inteligencia: biblioteca, clipping, social listening, oportunidades.',
    parameters: {},
    required: [],
    category: 'read',
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
