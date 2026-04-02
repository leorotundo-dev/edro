export type PortalAreaId =
  | 'inicio'
  | 'pedidos'
  | 'agenda'
  | 'aprovacoes'
  | 'biblioteca'
  | 'resultados'
  | 'conta'
  | 'assistente';

export type BlueprintStatus = 'ready' | 'new' | 'migration';

export type PortalBlockKind =
  | 'summary'
  | 'list'
  | 'timeline'
  | 'actions'
  | 'scheduler'
  | 'files'
  | 'insights'
  | 'governance'
  | 'assistant';

export type PortalNavBlueprint = {
  id: PortalAreaId;
  label: string;
  href: string;
  status: BlueprintStatus;
  objective: string;
  currentRoutes: string[];
};

export type PortalBlockBlueprint = {
  id: string;
  title: string;
  kind: PortalBlockKind;
  purpose: string;
  actions?: string[];
  sourceRoutes?: string[];
  sourceEndpoints?: string[];
};

export type PortalPageBlueprint = {
  id: PortalAreaId;
  title: string;
  subtitle: string;
  objective: string;
  status: BlueprintStatus;
  currentRoutes: string[];
  dataSources: string[];
  blocks: PortalBlockBlueprint[];
  implementationNotes: string[];
};

export type PortalMigrationItem = {
  current: string;
  target: string;
  action: 'keep' | 'rename' | 'merge' | 'move' | 'create';
  reason: string;
};

export type PortalContractGroup = {
  area: PortalAreaId;
  reuse: string[];
  create: string[];
};

export const portalTargetNavigation: PortalNavBlueprint[] = [
  {
    id: 'inicio',
    label: 'Início',
    href: '/',
    status: 'migration',
    objective: 'Ser a visão da conta: o que está acontecendo, o que depende do cliente e o que vem em seguida.',
    currentRoutes: ['/'],
  },
  {
    id: 'pedidos',
    label: 'Pedidos',
    href: '/pedidos',
    status: 'migration',
    objective: 'Unificar solicitações e projetos em uma só jornada de pedido.',
    currentRoutes: ['/briefing', '/briefing/novo', '/jobs', '/jobs/[id]'],
  },
  {
    id: 'agenda',
    label: 'Agenda',
    href: '/agenda',
    status: 'new',
    objective: 'Traduzir pauta da conta e agendamento de reuniões em uma experiência única.',
    currentRoutes: [],
  },
  {
    id: 'aprovacoes',
    label: 'Aprovações',
    href: '/aprovacoes',
    status: 'migration',
    objective: 'Centralizar todas as decisões do cliente em uma fila própria.',
    currentRoutes: ['/aprovacoes', '/jobs/[id]'],
  },
  {
    id: 'biblioteca',
    label: 'Biblioteca',
    href: '/biblioteca',
    status: 'new',
    objective: 'Ser a memória viva da conta: arquivos, entregas, marca e campanhas.',
    currentRoutes: [],
  },
  {
    id: 'resultados',
    label: 'Resultados',
    href: '/resultados',
    status: 'migration',
    objective: 'Traduzir relatórios em leitura executiva de valor e próximos passos.',
    currentRoutes: ['/relatorios'],
  },
  {
    id: 'conta',
    label: 'Conta',
    href: '/conta',
    status: 'migration',
    objective: 'Reunir contatos, aprovadores, acessos, dados cadastrais e financeiro da conta.',
    currentRoutes: ['/faturas'],
  },
  {
    id: 'assistente',
    label: 'Assistente',
    href: '/assistente',
    status: 'new',
    objective: 'Criar a camada conversacional do portal, contextualizada na conta do cliente.',
    currentRoutes: [],
  },
];

export const portalMigrationMap: PortalMigrationItem[] = [
  {
    current: 'Início',
    target: 'Início',
    action: 'keep',
    reason: 'A home permanece, mas deixa de ser dashboard simples para virar visão da conta.',
  },
  {
    current: 'Projetos',
    target: 'Pedidos',
    action: 'merge',
    reason: 'O cliente não deveria distinguir internamente entre request e job; ele vê uma jornada única.',
  },
  {
    current: 'Solicitações',
    target: 'Pedidos',
    action: 'merge',
    reason: 'Solicitações e projetos pertencem ao mesmo fluxo de pedido.',
  },
  {
    current: 'Aprovações',
    target: 'Aprovações',
    action: 'keep',
    reason: 'Mantém top-level, mas deixa de ser apenas um filtro de jobs em review.',
  },
  {
    current: 'Relatórios',
    target: 'Resultados',
    action: 'rename',
    reason: 'O cliente precisa de leitura executiva, não só uma lista de PDFs.',
  },
  {
    current: 'Faturas',
    target: 'Conta',
    action: 'move',
    reason: 'Financeiro da conta deve morar dentro da governança da relação, não como top-level isolado.',
  },
  {
    current: '—',
    target: 'Agenda',
    action: 'create',
    reason: 'A conta precisa de pauta, reuniões e disponibilidade de entrega.',
  },
  {
    current: '—',
    target: 'Biblioteca',
    action: 'create',
    reason: 'A conta precisa de memória documental, entregas e ativos de marca.',
  },
  {
    current: '—',
    target: 'Assistente',
    action: 'create',
    reason: 'O portal ganha uma camada conversacional contextualizada na conta.',
  },
];

export const portalBackendContracts: PortalContractGroup[] = [
  {
    area: 'inicio',
    reuse: [
      'GET /portal/client/me',
      'GET /portal/client/jobs',
      'GET /portal/client/invoices',
      'GET /portal/client/briefings',
    ],
    create: ['GET /portal/client/home'],
  },
  {
    area: 'pedidos',
    reuse: [
      'GET /portal/client/jobs',
      'GET /portal/client/jobs/:id',
      'POST /portal/client/jobs/:id/approve',
      'POST /portal/client/jobs/:id/revision',
      'GET /portal/client/briefings',
      'POST /portal/client/briefings/enrich',
      'POST /portal/client/briefings',
      'POST /portal/client/jobs/request',
      'GET /portal/client/jobs/:id/artworks',
      'POST /portal/client/artworks/:id/approve',
      'POST /portal/client/artworks/:id/revision',
    ],
    create: [
      'GET /portal/client/requests',
      'POST /portal/client/requests',
      'GET /portal/client/requests/:id',
    ],
  },
  {
    area: 'agenda',
    reuse: [],
    create: [
      'GET /portal/client/calendar',
      'GET /portal/client/meeting-slots',
      'POST /portal/client/meetings',
      'POST /portal/client/requests/availability',
    ],
  },
  {
    area: 'aprovacoes',
    reuse: [
      'GET /portal/client/jobs',
      'GET /portal/client/jobs/:id',
      'GET /portal/client/jobs/:id/artworks',
      'POST /portal/client/jobs/:id/approve',
      'POST /portal/client/jobs/:id/revision',
      'POST /portal/client/artworks/:id/approve',
      'POST /portal/client/artworks/:id/revision',
    ],
    create: ['GET /portal/client/approvals', 'GET /portal/client/approvals/:id'],
  },
  {
    area: 'biblioteca',
    reuse: [],
    create: ['GET /portal/client/library', 'GET /portal/client/library/:id'],
  },
  {
    area: 'resultados',
    reuse: [
      'GET /portal/client/reports',
      'GET /portal/client/reports/:month/pdf',
    ],
    create: ['GET /portal/client/results'],
  },
  {
    area: 'conta',
    reuse: ['GET /portal/client/me', 'GET /portal/client/invoices'],
    create: [
      'GET /portal/client/account',
      'GET /portal/client/account/contacts',
      'GET /portal/client/account/access',
    ],
  },
  {
    area: 'assistente',
    reuse: [],
    create: ['POST /portal/client/assistant'],
  },
];

export const portalPageBlueprints: Record<PortalAreaId, PortalPageBlueprint> = {
  inicio: {
    id: 'inicio',
    title: 'Início',
    subtitle: 'A visão da conta em uma tela.',
    objective: 'Responder rapidamente o que está acontecendo, o que depende do cliente e o que vem em seguida.',
    status: 'migration',
    currentRoutes: ['/'],
    dataSources: [
      'GET /portal/client/home',
      'GET /portal/client/jobs',
      'GET /portal/client/briefings',
      'GET /portal/client/invoices',
    ],
    blocks: [
      {
        id: 'ongoing',
        title: 'Em andamento',
        kind: 'summary',
        purpose: 'Resumo do que a agência está executando agora para a conta.',
        actions: ['Abrir pedidos'],
        sourceRoutes: ['/jobs'],
        sourceEndpoints: ['GET /portal/client/jobs'],
      },
      {
        id: 'upcoming',
        title: 'Próximas entregas',
        kind: 'timeline',
        purpose: 'Próximos marcos, entregas e datas importantes.',
        actions: ['Abrir agenda'],
      },
      {
        id: 'pending',
        title: 'Pendências suas',
        kind: 'actions',
        purpose: 'Tudo o que depende do cliente: aprovações, retornos e documentos.',
        actions: ['Abrir aprovações', 'Abrir biblioteca'],
      },
      {
        id: 'cta',
        title: 'Novo pedido',
        kind: 'actions',
        purpose: 'Atalhos para novo briefing, ajuste ou reunião.',
        actions: ['Novo briefing', 'Novo ajuste', 'Agendar reunião'],
        sourceRoutes: ['/briefing/novo'],
      },
    ],
    implementationNotes: [
      'A home precisa trocar o foco de job para relação de conta.',
      'O cliente não deve ver backlog interno, apenas compromisso, pendência e próxima ação.',
    ],
  },
  pedidos: {
    id: 'pedidos',
    title: 'Pedidos',
    subtitle: 'A jornada unificada entre solicitação e produção.',
    objective: 'Substituir a separação entre solicitações e projetos por uma visão contínua de pedido.',
    status: 'migration',
    currentRoutes: ['/briefing', '/briefing/novo', '/jobs', '/jobs/[id]'],
    dataSources: [
      'GET /portal/client/requests',
      'GET /portal/client/jobs',
      'GET /portal/client/briefings',
    ],
    blocks: [
      {
        id: 'request-list',
        title: 'Lista de pedidos',
        kind: 'list',
        purpose: 'Concentrar todos os pedidos em uma timeline de status.',
        actions: ['Filtrar', 'Buscar', 'Abrir detalhe'],
        sourceRoutes: ['/briefing', '/jobs'],
      },
      {
        id: 'request-form',
        title: 'Novo pedido',
        kind: 'actions',
        purpose: 'Substituir o wizard atual por entrada mais contextual e com prazo inteligente.',
        actions: ['Novo briefing', 'Novo ajuste', 'Repetir entrega'],
        sourceRoutes: ['/briefing/novo'],
        sourceEndpoints: [
          'POST /portal/client/briefings/enrich',
          'POST /portal/client/briefings',
        ],
      },
      {
        id: 'request-detail',
        title: 'Detalhe do pedido',
        kind: 'timeline',
        purpose: 'Exibir a linha do tempo do pedido, entregas e aprovações relacionadas.',
        actions: ['Aprovar', 'Pedir ajuste', 'Comentar'],
        sourceRoutes: ['/jobs/[id]'],
        sourceEndpoints: [
          'GET /portal/client/jobs/:id',
          'GET /portal/client/jobs/:id/artworks',
        ],
      },
    ],
    implementationNotes: [
      'Status traduzidos para o cliente: Enviado, Em análise, Aceito, Em produção, Aguardando aprovação, Entregue.',
      'O cliente não precisa diferenciar request de briefing interno; ele precisa acompanhar um pedido.',
    ],
  },
  agenda: {
    id: 'agenda',
    title: 'Agenda',
    subtitle: 'Pauta da conta e reuniões no mesmo lugar.',
    objective: 'Combinar compromissos da conta com o agendador de reuniões da agência.',
    status: 'new',
    currentRoutes: [],
    dataSources: [
      'GET /portal/client/calendar',
      'GET /portal/client/meeting-slots',
      'POST /portal/client/meetings',
    ],
    blocks: [
      {
        id: 'calendar',
        title: 'Pauta da conta',
        kind: 'timeline',
        purpose: 'Mostrar entregas previstas, aprovações com vencimento, reuniões e datas importantes.',
        actions: ['Abrir entrega', 'Ver aprovações', 'Filtrar por mês'],
      },
      {
        id: 'scheduler',
        title: 'Reuniões',
        kind: 'scheduler',
        purpose: 'Trazer o agendador da agência para dentro do portal.',
        actions: ['Agendar reunião', 'Reagendar', 'Cancelar'],
      },
      {
        id: 'availability',
        title: 'Disponibilidade de entrega',
        kind: 'summary',
        purpose: 'Traduzir capacidade da agência em janelas de entrega disponíveis, apertadas ou indisponíveis.',
        actions: ['Validar prazo do pedido'],
      },
    ],
    implementationNotes: [
      'Job usa janela de entrega; reunião usa slot de agenda.',
      'A agenda não deve expor a operação interna nem outros clientes.',
    ],
  },
  aprovacoes: {
    id: 'aprovacoes',
    title: 'Aprovações',
    subtitle: 'Tudo o que depende de um ok do cliente.',
    objective: 'Transformar aprovação em objeto próprio, não apenas filtro de jobs em review.',
    status: 'migration',
    currentRoutes: ['/aprovacoes', '/jobs/[id]'],
    dataSources: [
      'GET /portal/client/approvals',
      'GET /portal/client/jobs/:id',
      'GET /portal/client/jobs/:id/artworks',
    ],
    blocks: [
      {
        id: 'approval-queue',
        title: 'Fila de aprovações',
        kind: 'list',
        purpose: 'Centralizar copy, criativos e materiais que aguardam decisão.',
        actions: ['Aprovar', 'Pedir ajuste', 'Comentar'],
        sourceRoutes: ['/aprovacoes'],
      },
      {
        id: 'approval-detail',
        title: 'Detalhe da aprovação',
        kind: 'actions',
        purpose: 'Exibir preview, contexto e impacto do atraso na aprovação.',
        actions: ['Aprovar', 'Reprovar', 'Baixar'],
        sourceRoutes: ['/jobs/[id]'],
      },
    ],
    implementationNotes: [
      'Aprovação precisa mostrar prazo, impacto do atraso e próxima ação da agência.',
    ],
  },
  biblioteca: {
    id: 'biblioteca',
    title: 'Biblioteca',
    subtitle: 'A memória documental da conta.',
    objective: 'Centralizar entregas aprovadas, ativos de marca, documentos e campanhas passadas.',
    status: 'new',
    currentRoutes: [],
    dataSources: ['GET /portal/client/library', 'GET /portal/client/library/:id'],
    blocks: [
      {
        id: 'recent-files',
        title: 'Arquivos recentes',
        kind: 'files',
        purpose: 'Entregas recentes e arquivos mais usados pela conta.',
        actions: ['Baixar', 'Filtrar', 'Buscar'],
      },
      {
        id: 'brand-assets',
        title: 'Marca',
        kind: 'files',
        purpose: 'Brandbook, logos, documentos-chave e referências permanentes.',
        actions: ['Ver marca', 'Abrir documento'],
      },
      {
        id: 'campaign-archive',
        title: 'Campanhas',
        kind: 'files',
        purpose: 'Histórico de entregas por campanha, ação ou período.',
        actions: ['Abrir campanha', 'Baixar pacote'],
      },
    ],
    implementationNotes: [
      'Biblioteca precisa ser orientada a memória da conta, não a storage cru.',
    ],
  },
  resultados: {
    id: 'resultados',
    title: 'Resultados',
    subtitle: 'Leitura executiva do trabalho e da performance.',
    objective: 'Substituir a lista de relatórios por uma visão de valor entregue e próximos passos.',
    status: 'migration',
    currentRoutes: ['/relatorios'],
    dataSources: [
      'GET /portal/client/results',
      'GET /portal/client/reports',
      'GET /portal/client/reports/:month/pdf',
    ],
    blocks: [
      {
        id: 'period-summary',
        title: 'Resumo do período',
        kind: 'insights',
        purpose: 'Síntese do mês, com entregas, performance e aprendizados.',
        actions: ['Baixar PDF', 'Abrir mês'],
        sourceRoutes: ['/relatorios'],
      },
      {
        id: 'highlights',
        title: 'O que performou',
        kind: 'insights',
        purpose: 'Destacar os melhores resultados e o que isso significa para a conta.',
        actions: ['Ver detalhe'],
      },
      {
        id: 'next-moves',
        title: 'Próximos passos',
        kind: 'actions',
        purpose: 'Recomendações e próximos movimentos sugeridos pela agência.',
        actions: ['Transformar em pedido'],
      },
    ],
    implementationNotes: [
      'Resultados não deve ser um dashboard técnico; precisa ser leitura executiva com clareza de valor.',
    ],
  },
  conta: {
    id: 'conta',
    title: 'Conta',
    subtitle: 'Governança da relação com a agência.',
    objective: 'Reunir contatos, aprovadores, acessos, dados cadastrais e financeiro da conta.',
    status: 'migration',
    currentRoutes: ['/faturas'],
    dataSources: ['GET /portal/client/account', 'GET /portal/client/invoices'],
    blocks: [
      {
        id: 'contacts',
        title: 'Contatos e aprovadores',
        kind: 'governance',
        purpose: 'Quem solicita, quem aprova e quem participa da relação com a agência.',
        actions: ['Editar contato', 'Ver aprovadores'],
      },
      {
        id: 'billing',
        title: 'Financeiro da conta',
        kind: 'governance',
        purpose: 'Concentrar faturas, histórico financeiro e documentos relacionados.',
        actions: ['Baixar fatura'],
        sourceRoutes: ['/faturas'],
        sourceEndpoints: ['GET /portal/client/invoices'],
      },
      {
        id: 'settings',
        title: 'Preferências e dados',
        kind: 'governance',
        purpose: 'Dados cadastrais, marcas, unidades e preferências de atendimento.',
        actions: ['Atualizar dados'],
      },
    ],
    implementationNotes: [
      'Faturas deixam de ser item top-level e entram como subdomínio da conta.',
    ],
  },
  assistente: {
    id: 'assistente',
    title: 'Assistente',
    subtitle: 'A camada conversacional da conta.',
    objective: 'Permitir que o cliente consulte status, decisões e disponibilidade sem navegar por várias telas.',
    status: 'new',
    currentRoutes: [],
    dataSources: ['POST /portal/client/assistant'],
    blocks: [
      {
        id: 'conversation',
        title: 'Conversa contextual',
        kind: 'assistant',
        purpose: 'Responder perguntas sobre pedidos, agenda, aprovações e histórico da conta.',
        actions: ['Perguntar', 'Abrir pedido', 'Abrir reunião'],
      },
      {
        id: 'suggested-prompts',
        title: 'Atalhos',
        kind: 'assistant',
        purpose: 'Perguntas rápidas como “o que depende de mim?” ou “qual a próxima entrega?”.',
        actions: ['Perguntar novamente'],
      },
    ],
    implementationNotes: [
      'O assistente precisa ser restrito ao contexto da conta, não à operação interna da agência.',
    ],
  },
};

export const portalImplementationOrder: PortalAreaId[] = [
  'inicio',
  'pedidos',
  'agenda',
  'aprovacoes',
  'biblioteca',
  'resultados',
  'conta',
  'assistente',
];
