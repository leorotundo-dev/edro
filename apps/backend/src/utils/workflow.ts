export const WORKFLOW_STAGES = [
  'briefing',
  'iclips_in',
  'alinhamento',
  'copy_ia',
  'aprovacao',
  'producao',
  'revisao',
  'entrega',
  'iclips_out'
] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

export const isWorkflowStage = (value: string): value is WorkflowStage =>
  (WORKFLOW_STAGES as readonly string[]).includes(value);

export const getStageIndex = (stage: WorkflowStage) =>
  WORKFLOW_STAGES.indexOf(stage);

export const getNextStage = (stage: WorkflowStage): WorkflowStage | null => {
  const index = getStageIndex(stage);
  if (index < 0) return null;
  return WORKFLOW_STAGES[index + 1] ?? null;
};

export type WorkflowStageUI = {
  key: WorkflowStage;
  label: string;
  icon?: string;
  color?: string;
  description?: string;
};

export const WORKFLOW_STAGES_UI: readonly WorkflowStageUI[] = [
  { key: 'briefing',    label: 'Briefing',       icon: 'description',  color: 'blue',   description: 'Coleta inicial de informações do cliente' },
  { key: 'iclips_in',  label: 'iClips Entrada',  icon: 'input',        color: 'purple', description: 'Entrada de conteúdo iClips' },
  { key: 'alinhamento', label: 'Alinhamento',    icon: 'groups',       color: 'yellow', description: 'Alinhamento estratégico com o cliente' },
  { key: 'copy_ia',    label: 'Copy IA',          icon: 'psychology',   color: 'cyan',   description: 'Geração de copy com inteligência artificial' },
  { key: 'aprovacao',  label: 'Aprovação',        icon: 'check_circle', color: 'orange', description: 'Aprovação de copy pelo gestor' },
  { key: 'producao',   label: 'Produção',         icon: 'palette',      color: 'pink',   description: 'Criação de assets visuais pelo designer' },
  { key: 'revisao',    label: 'Revisão',          icon: 'rate_review',  color: 'indigo', description: 'Revisão final antes da entrega' },
  { key: 'entrega',    label: 'Entrega',          icon: 'check_box',    color: 'green',  description: 'Entrega finalizada ao cliente' },
  { key: 'iclips_out', label: 'iClips Saída',    icon: 'output',       color: 'purple', description: 'Saída de conteúdo iClips' },
] as const;

export const getStageUI = (stage: WorkflowStage): WorkflowStageUI | undefined =>
  WORKFLOW_STAGES_UI.find((s) => s.key === stage);
