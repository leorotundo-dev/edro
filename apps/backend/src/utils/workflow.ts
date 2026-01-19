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
