export type ModernizeArchetype =
  | 'ai-chat'
  | 'ai-image'
  | 'blog-posts'
  | 'blog-detail'
  | 'blog-manage'
  | 'contacts-users'
  | 'contacts'
  | 'user-profile'
  | 'integration'
  | 'role-access'
  | 'invoice'
  | 'calendar'
  | 'reports'
  | 'form-wizard'
  | 'kanban'
  | 'custom';

export type ModernizeMode = 'use_ready' | 'adapt' | 'custom';
export type ModernizeStatus = 'ready' | 'in_progress' | 'planned';

export type ModernizeFamily = {
  key: string;
  label: string;
  archetype: ModernizeArchetype;
  mode: ModernizeMode;
  status: ModernizeStatus;
  priority: number;
  routes: string[];
  notes?: string;
};

export const MODERNIZE_FAMILIES: ModernizeFamily[] = [
  {
    key: 'jarvis',
    label: 'Jarvis',
    archetype: 'ai-chat',
    mode: 'adapt',
    status: 'ready',
    priority: 3,
    routes: ['/jarvis', '/edro/jarvis'],
    notes: 'Chat principal, histórico lateral e prompts iniciais.',
  },
  {
    key: 'studio-image',
    label: 'Studio Image',
    archetype: 'ai-image',
    mode: 'adapt',
    status: 'in_progress',
    priority: 4,
    routes: ['/studio/editor'],
    notes: 'Gerador visual, prompt, variantes e preview.',
  },
  {
    key: 'clipping',
    label: 'Clipping',
    archetype: 'blog-posts',
    mode: 'adapt',
    status: 'ready',
    priority: 2,
    routes: ['/clipping', '/clients/[id]/clipping'],
    notes: 'Feed editorial no centro; fontes e ingestão fora do fluxo principal.',
  },
  {
    key: 'clipping-detail',
    label: 'Clipping Detail',
    archetype: 'blog-detail',
    mode: 'use_ready',
    status: 'ready',
    priority: 2,
    routes: ['/clipping/[id]'],
  },
  {
    key: 'social-listening',
    label: 'Social Listening',
    archetype: 'blog-posts',
    mode: 'adapt',
    status: 'ready',
    priority: 2,
    routes: ['/social-listening', '/clients/[id]/social-listening'],
    notes: 'Feed de menções no centro; insights e monitoramento em modos secundários.',
  },
  {
    key: 'people',
    label: 'Pessoas / Users / Equipe',
    archetype: 'contacts-users',
    mode: 'use_ready',
    status: 'ready',
    priority: 1,
    routes: ['/admin/pessoas', '/admin/users', '/admin/equipe', '/contatos'],
    notes: 'Maior aderência 1:1 com Contacts / Users do Modernize.',
  },
  {
    key: 'client-identity',
    label: 'Identidade do Cliente',
    archetype: 'user-profile',
    mode: 'adapt',
    status: 'ready',
    priority: 3,
    routes: ['/clients/[id]/identidade'],
    notes: 'DNA, editorial, contatos, biblioteca e configurações.',
  },
  {
    key: 'client-connectors',
    label: 'Conectores do Cliente',
    archetype: 'integration',
    mode: 'use_ready',
    status: 'ready',
    priority: 1,
    routes: ['/clients/[id]/connectors'],
  },
  {
    key: 'client-permissions',
    label: 'Permissões do Cliente',
    archetype: 'role-access',
    mode: 'use_ready',
    status: 'ready',
    priority: 1,
    routes: ['/clients/[id]/permissions'],
  },
  {
    key: 'admin-integrations',
    label: 'Integrações Admin',
    archetype: 'integration',
    mode: 'use_ready',
    status: 'ready',
    priority: 1,
    routes: ['/admin/integrations'],
  },
  {
    key: 'finance',
    label: 'Financeiro',
    archetype: 'invoice',
    mode: 'adapt',
    status: 'ready',
    priority: 5,
    routes: ['/admin/financeiro', '/admin/pagamentos', '/financeiro'],
  },
  {
    key: 'reports',
    label: 'Relatórios',
    archetype: 'reports',
    mode: 'use_ready',
    status: 'ready',
    priority: 5,
    routes: ['/admin/relatorios', '/clients/[id]/reports', '/insights', '/performance'],
  },
  {
    key: 'calendar',
    label: 'Calendário / Reuniões',
    archetype: 'calendar',
    mode: 'use_ready',
    status: 'ready',
    priority: 5,
    routes: ['/calendar', '/admin/reunioes'],
  },
  {
    key: 'wizard',
    label: 'Wizards',
    archetype: 'form-wizard',
    mode: 'use_ready',
    status: 'ready',
    priority: 6,
    routes: ['/clients/novo', '/clients/new'],
  },
  {
    key: 'board',
    label: 'Kanban',
    archetype: 'kanban',
    mode: 'adapt',
    status: 'ready',
    priority: 6,
    routes: ['/board', '/admin/operacoes/jobs?view=board'],
    notes: 'Visão secundária de fluxo. Não é o arquétipo da Central inteira.',
  },
  {
    key: 'operations',
    label: 'Central de Operações',
    archetype: 'custom',
    mode: 'custom',
    status: 'in_progress',
    priority: 4,
    routes: ['/admin/operacoes', '/admin/operacoes/jobs', '/admin/operacoes/semana', '/admin/operacoes/radar', '/admin/operacoes/qualidade'],
    notes: 'Cockpit proprietário. Herdar gramática do Modernize, não a página pronta.',
  },
  {
    key: 'library',
    label: 'Biblioteca',
    archetype: 'blog-manage',
    mode: 'adapt',
    status: 'ready',
    priority: 4,
    routes: ['/library', '/clients/[id]/library'],
    notes: 'Catálogo de ativos com envelope canônico de workspace.',
  },
  {
    key: 'support',
    label: 'Suporte',
    archetype: 'reports',
    mode: 'adapt',
    status: 'ready',
    priority: 5,
    routes: ['/support'],
    notes: 'Central de ajuda alinhada à gramática de tickets e suporte.',
  },
  {
    key: 'client-directory',
    label: 'Clientes',
    archetype: 'contacts-users',
    mode: 'adapt',
    status: 'ready',
    priority: 3,
    routes: ['/clients'],
    notes: 'Diretório principal de clientes com leitura de workspace.',
  },
  {
    key: 'my-area',
    label: 'Minha Área / Minha Fila',
    archetype: 'user-profile',
    mode: 'adapt',
    status: 'ready',
    priority: 4,
    routes: ['/minha-area', '/meu-trabalho'],
    notes: 'Workspaces pessoais de produção, capacidade e fila.',
  },
];

export function getModernizeFamilyByRoute(route: string) {
  return MODERNIZE_FAMILIES.find((family) => family.routes.includes(route)) ?? null;
}

export function getFamiliesByArchetype(archetype: ModernizeArchetype) {
  return MODERNIZE_FAMILIES.filter((family) => family.archetype === archetype);
}
