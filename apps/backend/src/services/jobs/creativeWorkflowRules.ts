import type { CreativeStage } from '../../types/creativeWorkflow';

const allowedTransitions: Record<CreativeStage, CreativeStage[]> = {
  briefing: ['copy'],
  copy: ['arte', 'refino_canvas', 'briefing'],
  arte: ['refino_canvas', 'revisao', 'copy'],
  refino_canvas: ['arte', 'revisao'],
  revisao: ['arte', 'aprovacao', 'copy'],
  aprovacao: ['arte', 'exportacao', 'revisao'],
  exportacao: [],
};

export function canTransitionCreativeStage(from: CreativeStage, to: CreativeStage) {
  if (from === to) return true;
  return allowedTransitions[from]?.includes(to) ?? false;
}
