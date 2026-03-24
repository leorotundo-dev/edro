'use client';

export type OperationsJob = {
  id: string;
  client_id?: string | null;
  client_name?: string | null;
  client_logo_url?: string | null;
  client_brand_color?: string | null;
  title: string;
  summary?: string | null;
  job_type: string;
  complexity: 's' | 'm' | 'l';
  channel?: string | null;
  source: string;
  status: string;
  priority_score: number;
  priority_band: 'p0' | 'p1' | 'p2' | 'p3' | 'p4';
  impact_level: number;
  dependency_level: number;
  required_skill?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  owner_email?: string | null;
  assignees?: Array<{ user_id: string; name: string; email: string }>;
  external_link?: string | null;
  deadline_at?: string | null;
  estimated_minutes?: number | null;
  actual_minutes?: number | null;
  blocked_minutes?: number | null;
  queue_minutes?: number | null;
  is_urgent?: boolean;
  urgency_reason?: string | null;
  definition_of_done?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
  archived_at?: string | null;
  automation_status?: string | null;
  estimated_delivery_at?: string | null;
  history?: Array<{
    id: string;
    from_status?: string | null;
    to_status: string;
    changed_by_name?: string | null;
    changed_at: string;
    reason?: string | null;
  }>;
  comments?: Array<{
    id: string;
    author_name?: string | null;
    body: string;
    created_at: string;
  }>;
};

export type OperationsLookup = {
  code: string;
  label: string;
  default_skill?: string | null;
  default_definition_of_done?: string | null;
  category?: string | null;
};

export type OperationsClientLookup = {
  id: string;
  name: string;
  logo_url?: string | null;
  brand_color?: string | null;
};

export type OperationsOwner = {
  id: string;
  name: string;
  email: string;
  role: string;
  specialty?: string | null;
  skills?: string[] | null;
  person_type?: 'internal' | 'freelancer';
  freelancer_profile_id?: string | null;
};

const ESTIMATE_MATRIX: Record<string, Record<'s' | 'm' | 'l', number>> = {
  briefing: { s: 30, m: 60, l: 120 },
  copy: { s: 30, m: 90, l: 180 },
  design_static: { s: 60, m: 120, l: 240 },
  design_carousel: { s: 120, m: 240, l: 360 },
  video_edit: { s: 120, m: 360, l: 720 },
  campaign: { s: 180, m: 480, l: 960 },
  meeting: { s: 30, m: 60, l: 120 },
  approval: { s: 15, m: 30, l: 60 },
  publication: { s: 15, m: 30, l: 60 },
  urgent_request: { s: 60, m: 180, l: 360 },
};

const CHANNEL_MULTIPLIER: Record<string, number> = {
  instagram: 1,
  linkedin: 1,
  stories: 0.85,
  reels: 1.25,
  tiktok: 1.35,
  youtube: 1.4,
  blog: 1.3,
  site: 1.2,
  whatsapp: 0.8,
  email: 0.9,
};

export const STAGE_FLOW = [
  { key: 'intake', label: 'Entrada' },
  { key: 'planned', label: 'Classificação' },
  { key: 'ready', label: 'Pronto' },
  { key: 'allocated', label: 'Planejamento' },
  { key: 'in_progress', label: 'Produção' },
  { key: 'in_review', label: 'Revisão' },
  { key: 'awaiting_approval', label: 'Aprovação' },
  { key: 'approved', label: 'Aprovado' },
  { key: 'scheduled', label: 'Agendado' },
  { key: 'published', label: 'Entregue' },
  { key: 'done', label: 'Fechado' },
];

export const STAGE_LABELS: Record<string, string> = {
  intake: 'Entrada',
  planned: 'Classificação',
  ready: 'Pronto',
  allocated: 'Planejamento',
  in_progress: 'Produção',
  blocked: 'Bloqueado',
  in_review: 'Revisão',
  awaiting_approval: 'Aguardando aprovação',
  approved: 'Aprovado',
  scheduled: 'Agendado',
  published: 'Entregue',
  done: 'Fechado',
  archived: 'Arquivado',
};

export const PRIORITY_LABELS: Record<string, string> = {
  p0: 'P0 Crítico',
  p1: 'P1 Alto',
  p2: 'P2 Normal',
  p3: 'P3 Backlog',
  p4: 'P4 Solto',
};

export const SOURCE_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  meeting: 'Reunião',
  approval: 'Aprovação',
  briefing: 'Briefing',
  campaign: 'Campanha',
  calendar: 'Calendário',
  internal: 'Equipe interna',
  manual: 'Manual',
  publication: 'Publicação',
  jarvis: 'Jarvis',
  email: 'E-mail',
};

export const SKILL_LABELS: Record<string, string> = {
  atendimento: 'Atendimento',
  copy: 'Redação',
  design: 'Design',
  video: 'Vídeo',
  social: 'Social Media',
  estrategia: 'Estratégia',
  operacao: 'Operação',
  financeiro: 'Financeiro',
};

export function formatSourceLabel(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Sem origem';
  return SOURCE_LABELS[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatSkillLabel(value?: string | null) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'Especialidade indefinida';
  return SKILL_LABELS[normalized] || normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function formatMinutes(value?: number | null) {
  const minutes = Math.max(0, Number(value || 0));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (!hours) return `${mins}min`;
  if (!mins) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

export function formatDateTime(value?: string | null) {
  if (!value) return 'Sem prazo';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem prazo';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateLabel(value?: string | null) {
  if (!value) return 'Sem prazo';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem prazo';
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  }).format(date);
}

export function estimateJobMinutes(input: {
  jobType?: string | null;
  complexity?: 's' | 'm' | 'l' | null;
  channel?: string | null;
}) {
  const jobType = String(input.jobType || '').trim();
  const complexity = (input.complexity || 'm') as 's' | 'm' | 'l';
  const channel = String(input.channel || '').trim().toLowerCase();

  const baseByType = ESTIMATE_MATRIX[jobType] || ESTIMATE_MATRIX.copy;
  const base = baseByType[complexity] ?? baseByType.m;
  const multiplier = channel ? CHANNEL_MULTIPLIER[channel] ?? 1 : 1;

  return Math.max(15, Math.round(base * multiplier));
}

function daysUntil(deadline?: string | Date | null) {
  if (!deadline) return null;
  const date = deadline instanceof Date ? deadline : new Date(deadline);
  if (Number.isNaN(date.getTime())) return null;
  return (date.getTime() - Date.now()) / 86400000;
}

function urgencyScore(deadline?: string | Date | null) {
  const days = daysUntil(deadline);
  if (days === null) return 0;
  if (days <= 0) return 5;
  if (days <= 1) return 4;
  if (days <= 3) return 3;
  if (days <= 7) return 2;
  return 1;
}

export function calculatePriorityPreview(input: {
  deadlineAt?: string | null;
  impactLevel?: number | null;
  dependencyLevel?: number | null;
  clientWeight?: number | null;
  isUrgent?: boolean | null;
  intakeComplete?: boolean | null;
  blocked?: boolean | null;
}) {
  const sla = input.deadlineAt ? 4 : 1;
  const impact = Math.max(0, Math.min(5, Number(input.impactLevel ?? 2)));
  const dependency = Math.max(0, Math.min(5, Number(input.dependencyLevel ?? 2)));
  const clientWeight = Math.max(1, Math.min(5, Number(input.clientWeight ?? 3)));

  let score = sla + urgencyScore(input.deadlineAt) + impact + dependency + clientWeight;
  if (input.isUrgent) score += 2;
  if (input.intakeComplete === false) score -= 4;
  if (input.blocked) score -= 5;
  score = Math.max(0, Math.round(score));

  const priorityBand: OperationsJob['priority_band'] =
    score >= 18 ? 'p0'
      : score >= 14 ? 'p1'
        : score >= 10 ? 'p2'
          : score >= 6 ? 'p3'
            : 'p4';

  return { priorityScore: score, priorityBand };
}

export function getStageIndex(status: string) {
  const index = STAGE_FLOW.findIndex((item) => item.key === status);
  return index >= 0 ? index : 0;
}

export function isIntakeComplete(job: Partial<OperationsJob>) {
  if (job.metadata?.calendar_item?.standalone && job.source === 'meeting') {
    return true;
  }
  return Boolean(
    job.client_id &&
    job.job_type &&
    job.complexity &&
    job.source &&
    job.deadline_at &&
    job.required_skill &&
    job.owner_id
  );
}

export function getRisk(job: Partial<OperationsJob>) {
  if (job.metadata?.calendar_item?.standalone && job.source === 'meeting') {
    const meetingStatus = String(job.status || '').toLowerCase();
    if (meetingStatus === 'blocked') return { level: 'critical', label: 'Reunião bloqueada', score: 92 };
    if (meetingStatus === 'failed') return { level: 'critical', label: 'Reunião com falha', score: 94 };
    if (meetingStatus === 'scheduled' || meetingStatus === 'bot_scheduled' || meetingStatus === 'joining') {
      return { level: 'low', label: 'Reunião agendada', score: 18 };
    }
    if (meetingStatus === 'in_call') {
      return { level: 'low', label: 'Em andamento', score: 18 };
    }
    return { level: 'low', label: 'Registrada', score: 18 };
  }

  const signalBand = String(job.metadata?.risk_signal?.band || '').toLowerCase();
  const signalLabel = job.metadata?.risk_signal?.label as string | undefined;
  const signalScore = Number(job.metadata?.risk_signal?.score || 0);
  if (signalBand === 'critical' || signalBand === 'high' || signalBand === 'medium' || signalBand === 'low') {
    return {
      level: signalBand as 'low' | 'medium' | 'high' | 'critical',
      label: signalLabel || 'Sinal operacional',
      score: signalScore || (signalBand === 'critical' ? 95 : signalBand === 'high' ? 78 : signalBand === 'medium' ? 58 : 18),
    };
  }

  const deadline = job.deadline_at ? new Date(job.deadline_at) : null;
  const now = new Date();
  const diffHours = deadline ? (deadline.getTime() - now.getTime()) / 3600000 : null;
  const allocation = job.metadata?.allocation as { status?: string | null; starts_at?: string | null } | undefined;
  const allocationStart = allocation?.starts_at ? new Date(allocation.starts_at) : null;
  const allocationValid = allocationStart && !Number.isNaN(allocationStart.getTime()) ? allocationStart : null;
  const hasAllocation = Boolean(allocation?.status && !['done', 'dropped'].includes(String(allocation.status)));
  const isApprovalWindow = job.status === 'awaiting_approval' || job.job_type === 'approval';
  const isPublicationWindow = job.job_type === 'publication' || ['approved', 'scheduled', 'published'].includes(String(job.status || ''));
  const publicationStatus = String(job.metadata?.publication_status || '').toLowerCase();

  if (job.status === 'blocked') return { level: 'critical', label: 'Bloqueado', score: 95 };
  if (job.priority_band === 'p0' && !job.owner_id) return { level: 'critical', label: 'Sem responsável', score: 92 };
  if (publicationStatus === 'failed' && job.status !== 'published') {
    return { level: 'critical', label: 'Falha de publicação', score: 97 };
  }
  if (diffHours !== null && diffHours <= 0 && job.status !== 'done' && job.status !== 'archived') {
    if (publicationStatus === 'processing' && job.status !== 'published') {
      return { level: 'critical', label: 'Publicação em processamento', score: 90 };
    }
    return { level: 'critical', label: 'Atrasado', score: 98 };
  }
  if (deadline && allocationValid && allocationValid.getTime() > deadline.getTime()) {
    return { level: 'critical', label: 'Alocação depois do prazo', score: 96 };
  }
  if (diffHours !== null && diffHours <= 24 && isApprovalWindow) {
    return { level: 'critical', label: 'Aprovação travando entrega', score: 94 };
  }
  if (diffHours !== null && diffHours <= 24 && isPublicationWindow && !hasAllocation && job.status !== 'published') {
    return { level: 'critical', label: 'Publicação sem execução', score: 93 };
  }
  if (diffHours !== null && diffHours <= 24 && !hasAllocation && job.status !== 'done' && job.status !== 'published') {
    return { level: 'critical', label: 'Sem alocação para 24h', score: 91 };
  }
  if (diffHours !== null && diffHours <= 24 && job.status !== 'done' && job.status !== 'published') {
    if (publicationStatus === 'processing') {
      return { level: 'high', label: 'Publicação em processamento', score: 85 };
    }
    if (isPublicationWindow && allocation?.status === 'tentative') {
      return { level: 'high', label: 'Publicação sem execução confirmada', score: 86 };
    }
    if (allocation?.status === 'tentative') {
      return { level: 'high', label: 'Alocação ainda reservada', score: 84 };
    }
    if (isPublicationWindow) {
      return { level: 'high', label: 'Janela de publicação hoje', score: 83 };
    }
    return { level: 'high', label: 'Vence em 24h', score: 82 };
  }
  if (diffHours !== null && diffHours <= 72 && isApprovalWindow) {
    return { level: 'high', label: 'Aprovação pendente', score: 81 };
  }
  if (diffHours !== null && diffHours <= 72 && isPublicationWindow && !hasAllocation && job.status !== 'published') {
    return { level: 'high', label: 'Publicação sem encaixe', score: 79 };
  }
  if (diffHours !== null && diffHours <= 72 && !hasAllocation && job.status !== 'done' && job.status !== 'archived') {
    return { level: 'high', label: 'Sem alocação planejada', score: 78 };
  }
  if (job.status === 'awaiting_approval') return { level: 'high', label: 'Parado em aprovação', score: 76 };
  if (!isIntakeComplete(job)) return { level: 'medium', label: 'Entrada incompleta', score: 58 };
  if (!job.owner_id) return { level: 'medium', label: 'Sem responsável', score: 54 };
  return { level: 'low', label: 'Controlado', score: 18 };
}

export function getNextAction(job: Partial<OperationsJob>) {
  if (job.metadata?.calendar_item?.standalone && job.source === 'meeting') {
    const meetingStatus = String(job.status || '').toLowerCase();
    if (meetingStatus === 'scheduled' || meetingStatus === 'bot_scheduled' || meetingStatus === 'joining' || meetingStatus === 'in_call') {
      return { label: 'Acompanhar reunião', intent: 'primary' as const };
    }
    return { label: 'Abrir reuniões', intent: 'default' as const };
  }

  if (!job.client_id || !job.job_type || !job.deadline_at || !job.required_skill) {
    return { label: 'Completar entrada', intent: 'warning' as const };
  }
  if (!job.owner_id) {
    return { label: 'Definir responsável', intent: 'warning' as const };
  }
  if (job.status === 'blocked') {
    return { label: 'Resolver bloqueio', intent: 'error' as const };
  }
  if (job.status === 'intake' || job.status === 'planned') {
    return { label: 'Enviar para planejamento', intent: 'primary' as const };
  }
  if (job.status === 'ready') {
    return { label: 'Levar para alocação', intent: 'primary' as const };
  }
  if (job.status === 'allocated') {
    return { label: 'Iniciar produção', intent: 'primary' as const };
  }
  if (job.status === 'in_progress') {
    return { label: 'Mover para revisão', intent: 'primary' as const };
  }
  if (job.status === 'in_review') {
    return { label: 'Enviar para aprovação', intent: 'primary' as const };
  }
  if (job.status === 'awaiting_approval') {
    return { label: 'Cobrar aprovação', intent: 'warning' as const };
  }
  if (job.status === 'approved') {
    return { label: 'Agendar entrega', intent: 'success' as const };
  }
  if (job.status === 'scheduled') {
    return { label: 'Publicar / entregar', intent: 'success' as const };
  }
  if (job.status === 'published') {
    return { label: 'Fechar demanda', intent: 'success' as const };
  }
  if (job.status === 'done') {
    return { label: 'Arquivar', intent: 'default' as const };
  }
  return { label: 'Revisar contexto', intent: 'default' as const };
}

/** Returns the next status a job should advance to, or null if already terminal. */
export function getNextStatus(job: Partial<OperationsJob>): string | null {
  const STATUS_ADVANCE: Record<string, string> = {
    intake: 'planned',
    planned: 'ready',
    ready: 'allocated',
    allocated: 'in_progress',
    in_progress: 'in_review',
    in_review: 'awaiting_approval',
    awaiting_approval: 'approved',
    approved: 'scheduled',
    scheduled: 'published',
    published: 'done',
  };
  return STATUS_ADVANCE[job.status || ''] || null;
}

export type DeliveryStatus = {
  emoji: string;
  label: string;
  color: string;
};

/** Maps a job to the planilha-style STATUS DA ENTREGA: 🔥🔴🟢🟡✅ */
export function getDeliveryStatus(job: Partial<OperationsJob>): DeliveryStatus {
  const done = ['published', 'done'].includes(job.status || '');
  const standby = ['blocked', 'awaiting_approval', 'planned'].includes(job.status || '');
  const deadline = job.deadline_at ? new Date(job.deadline_at) : null;
  const overdue = deadline && deadline < new Date() && !done;

  if (done) return { emoji: '✅', label: 'Entregue', color: '#16a34a' };
  if (job.is_urgent || job.priority_band === 'p0') return { emoji: '🔥', label: 'Máxima', color: '#dc2626' };
  if (overdue) return { emoji: '🔴', label: 'Atrasado', color: '#dc2626' };
  if (standby) return { emoji: '🟡', label: 'Stand-by', color: '#d97706' };
  return { emoji: '🟢', label: 'No prazo', color: '#16a34a' };
}

export function groupBy<T>(list: T[], keyFn: (item: T) => string) {
  return list.reduce<Record<string, T[]>>((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}
