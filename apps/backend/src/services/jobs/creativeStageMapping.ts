import type { CreativeStage } from '../../types/creativeWorkflow';

export function mapCreativeStageToJobStatus(stage: CreativeStage) {
  switch (stage) {
    case 'briefing':
    case 'copy':
    case 'arte':
    case 'refino_canvas':
      return 'in_progress';
    case 'revisao':
      return 'in_review';
    case 'aprovacao':
      return 'awaiting_approval';
    case 'exportacao':
      return 'approved';
    default:
      return 'in_progress';
  }
}

export function deriveCreativeStageFromJobStatus(status?: string | null): CreativeStage {
  switch (status) {
    case 'in_review':
      return 'revisao';
    case 'awaiting_approval':
      return 'aprovacao';
    case 'approved':
    case 'scheduled':
    case 'published':
      return 'exportacao';
    default:
      return 'briefing';
  }
}
