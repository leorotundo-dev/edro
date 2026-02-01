/**
 * Shared Workflow Configuration for Edro Briefing System
 * Used by both backend and frontend to ensure consistency
 */

export const WORKFLOW_STAGES = [
  'briefing',
  'iclips_in',
  'alinhamento',
  'copy_ia',
  'aprovacao',
  'producao',
  'revisao',
  'entrega',
  'iclips_out',
] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

export const isWorkflowStage = (value: string): value is WorkflowStage =>
  (WORKFLOW_STAGES as readonly string[]).includes(value);

export const getStageIndex = (stage: WorkflowStage) => WORKFLOW_STAGES.indexOf(stage);

export const getNextStage = (stage: WorkflowStage): WorkflowStage | null => {
  const index = getStageIndex(stage);
  if (index < 0) return null;
  return WORKFLOW_STAGES[index + 1] ?? null;
};

export const getPreviousStage = (stage: WorkflowStage): WorkflowStage | null => {
  const index = getStageIndex(stage);
  if (index <= 0) return null;
  return WORKFLOW_STAGES[index - 1] ?? null;
};

export const isValidTransition = (from: WorkflowStage, to: WorkflowStage): boolean => {
  const fromIndex = getStageIndex(from);
  const toIndex = getStageIndex(to);

  // Allow progression to next stage
  if (toIndex === fromIndex + 1) return true;

  // Allow going back one stage (for rejections)
  if (toIndex === fromIndex - 1) return true;

  // Disallow skipping stages or going back more than one
  return false;
};

/**
 * UI Metadata for workflow stages
 * Used by frontend for display purposes
 */
export type WorkflowStageUI = {
  key: WorkflowStage;
  label: string;
  icon: string;
  color: string;
  description?: string;
};

export const WORKFLOW_STAGES_UI: readonly WorkflowStageUI[] = [
  {
    key: 'briefing',
    label: 'Briefing',
    icon: 'description',
    color: 'blue',
    description: 'Coleta inicial de informações do cliente',
  },
  {
    key: 'iclips_in',
    label: 'iClips Entrada',
    icon: 'input',
    color: 'purple',
    description: 'Entrada de conteúdo iClips',
  },
  {
    key: 'alinhamento',
    label: 'Alinhamento',
    icon: 'groups',
    color: 'yellow',
    description: 'Alinhamento estratégico com o cliente',
  },
  {
    key: 'copy_ia',
    label: 'Copy IA',
    icon: 'psychology',
    color: 'cyan',
    description: 'Geração de copy com inteligência artificial',
  },
  {
    key: 'aprovacao',
    label: 'Aprovação',
    icon: 'check_circle',
    color: 'orange',
    description: 'Aprovação de copy pelo gestor',
  },
  {
    key: 'producao',
    label: 'Produção',
    icon: 'palette',
    color: 'pink',
    description: 'Criação de assets visuais pelo designer',
  },
  {
    key: 'revisao',
    label: 'Revisão',
    icon: 'rate_review',
    color: 'indigo',
    description: 'Revisão final antes da entrega',
  },
  {
    key: 'entrega',
    label: 'Entrega',
    icon: 'check_box',
    color: 'green',
    description: 'Entrega finalizada ao cliente',
  },
  {
    key: 'iclips_out',
    label: 'iClips Saída',
    icon: 'output',
    color: 'purple',
    description: 'Saída de conteúdo iClips',
  },
] as const;

export const getStageUI = (stage: WorkflowStage): WorkflowStageUI | undefined => {
  return WORKFLOW_STAGES_UI.find((s) => s.key === stage);
};

export const STAGE_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700 border-blue-300',
  purple: 'bg-purple-100 text-purple-700 border-purple-300',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
  cyan: 'bg-cyan-100 text-cyan-700 border-cyan-300',
  orange: 'bg-orange-100 text-orange-700 border-orange-300',
  pink: 'bg-pink-100 text-pink-700 border-pink-300',
  indigo: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  green: 'bg-green-100 text-green-700 border-green-300',
};
