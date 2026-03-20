export const WORKFLOW_STAGES = [
  'briefing',
  'copy_ia',
  'alinhamento',
  'producao',
  'aprovacao_interna',
  'ajustes',
  'aprovacao_cliente',
  'concluido',
] as const;

// Etapas legadas — mantidas para não quebrar briefings antigos no banco
export const LEGACY_STAGES = ['iclips_in', 'iclips_out', 'aprovacao', 'revisao', 'entrega'] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];
export type LegacyStage = (typeof LEGACY_STAGES)[number];
export type AnyStage = WorkflowStage | LegacyStage;

export const isWorkflowStage = (value: string): value is WorkflowStage =>
  (WORKFLOW_STAGES as readonly string[]).includes(value);

export const getStageIndex = (stage: WorkflowStage) =>
  WORKFLOW_STAGES.indexOf(stage);

export const getNextStage = (stage: WorkflowStage): WorkflowStage | null => {
  const index = getStageIndex(stage);
  if (index < 0) return null;
  return WORKFLOW_STAGES[index + 1] ?? null;
};

/** Normaliza etapas legadas para o novo fluxo */
export const normalizeLegacyStage = (stage: string): WorkflowStage => {
  switch (stage) {
    case 'iclips_in': return 'alinhamento';
    case 'iclips_out': return 'aprovacao_cliente';
    case 'aprovacao': return 'aprovacao_interna';
    case 'revisao': return 'ajustes';
    case 'entrega': return 'concluido';
    default: return isWorkflowStage(stage) ? stage : 'briefing';
  }
};

export type WorkflowStageUI = {
  key: string;
  label: string;
  icon?: string;
  color?: string;
  description?: string;
};

export const WORKFLOW_STAGES_UI: readonly WorkflowStageUI[] = [
  { key: 'briefing',          label: 'Briefing',            icon: 'description',  color: 'blue',   description: 'Novo job — briefing preenchido pelo gestor' },
  { key: 'copy_ia',           label: 'Copy IA',             icon: 'psychology',   color: 'purple', description: 'Sistema gerando copy automaticamente' },
  { key: 'alinhamento',       label: 'Alinhamento',         icon: 'groups',       color: 'yellow', description: 'Freelancer aceito — reunião de alinhamento agendada' },
  { key: 'producao',          label: 'Produção',            icon: 'palette',      color: 'teal',   description: 'Freelancer executando o job' },
  { key: 'aprovacao_interna', label: 'Aprovação Interna',   icon: 'check_circle', color: 'orange', description: 'Job finalizado — aprovação interna pela equipe' },
  { key: 'ajustes',           label: 'Ajustes',             icon: 'rate_review',  color: 'red',    description: 'Ajustes solicitados — freelancer corrigindo' },
  { key: 'aprovacao_cliente', label: 'Aprovação Cliente',   icon: 'how_to_vote',  color: 'indigo', description: 'Aprovação final pelo cliente no portal' },
  { key: 'concluido',         label: 'Concluído',           icon: 'check_box',    color: 'green',  description: 'Job aprovado e entregue' },
] as const;

export const getStageUI = (stage: WorkflowStage): WorkflowStageUI | undefined =>
  WORKFLOW_STAGES_UI.find((s) => s.key === stage);
