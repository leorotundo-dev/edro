import { query } from '../../db';

type OperationalJob = {
  id: string;
  client_id: string | null;
  client_name: string | null;
  client_logo_url: string | null;
  client_brand_color: string | null;
  title: string;
  summary: string | null;
  job_type: string;
  complexity: 's' | 'm' | 'l';
  channel: string | null;
  source: string;
  status: string;
  priority_score: number;
  priority_band: 'p0' | 'p1' | 'p2' | 'p3' | 'p4';
  impact_level: number;
  dependency_level: number;
  required_skill: string | null;
  owner_id: string | null;
  owner_name: string | null;
  owner_email: string | null;
  owner_role: string | null;
  owner_person_type: 'internal' | 'freelancer' | null;
  owner_specialty: string | null;
  deadline_at: string | null;
  estimated_minutes: number | null;
  actual_minutes: number | null;
  blocked_minutes: number | null;
  queue_minutes: number | null;
  is_urgent: boolean;
  urgency_reason: string | null;
  definition_of_done: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

type RiskInfo = {
  level: 'low' | 'medium' | 'high' | 'critical';
  label: string;
  score: number;
};

type AllocationRuntimeRow = {
  id: string;
  tenant_id: string;
  job_id: string;
  owner_id: string | null;
  allocation_kind: string;
  status: AllocationStatus;
  week_start: string;
  planned_minutes: number | null;
  actual_minutes: number | null;
  starts_at: string | null;
  ends_at: string | null;
  notes: string | null;
};

type PlannerRow = {
  owner: {
    id: string;
    name: string;
    email: string | null;
    role: string | null;
    specialty: string | null;
    person_type: 'internal' | 'freelancer';
  };
  allocable_minutes: number;
  committed_minutes: number;
  tentative_minutes: number;
  usage: number;
  jobs: OperationalJob[];
};

type AllocationStatus = 'tentative' | 'committed' | 'blocked' | 'done' | 'dropped';

type UpsertAllocationInput = {
  jobId: string;
  ownerId: string;
  status: AllocationStatus;
  plannedMinutes?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  notes?: string | null;
  changedBy?: string | null;
};

function startOfWeekIso(input?: string | Date | null) {
  const date = input ? new Date(input) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 10);
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() - day + 1);
  return utc.toISOString().slice(0, 10);
}

function isClosedStatus(status?: string | null) {
  return status === 'done' || status === 'archived';
}

function isCommittedStatus(status?: string | null) {
  return ['allocated', 'in_progress', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published'].includes(status || '');
}

function isTentativeStatus(status?: string | null) {
  return ['intake', 'planned', 'ready'].includes(status || '');
}

function ownerAllocableMinutes(owner?: { person_type?: string | null; role?: string | null } | null) {
  if (!owner) return 0;
  if (owner.person_type === 'freelancer') return 16 * 60;
  if (owner.role === 'admin' || owner.role === 'manager') return 22 * 60;
  return 28 * 60;
}

function deriveAllocationStatus(status?: string | null): AllocationStatus {
  if (status === 'blocked') return 'blocked';
  if (isTentativeStatus(status)) return 'tentative';
  if (isClosedStatus(status)) return 'done';
  return 'committed';
}

function calendarItemTypeForJob(job: OperationalJob) {
  if (job.job_type === 'meeting') return 'meeting_window';
  if (job.job_type === 'publication' || ['approved', 'scheduled', 'published'].includes(job.status)) return 'publication_window';
  if (job.status === 'awaiting_approval' || job.job_type === 'approval') return 'approval_window';
  if (['allocated', 'in_progress', 'in_review'].includes(job.status)) return 'production_window';
  const risk = getRisk(job);
  if (['critical', 'high'].includes(risk.level)) return 'risk_window';
  return 'deadline_window';
}

function shouldCreatePlanningCheckpoint(job: OperationalJob, allocation?: Partial<AllocationRuntimeRow> | null) {
  if (!job.deadline_at || isClosedStatus(job.status)) return false;
  if (!['intake', 'planned', 'ready'].includes(String(job.status || ''))) return false;
  if (allocation?.status && !['done', 'dropped'].includes(String(allocation.status))) return false;
  const deadline = new Date(job.deadline_at);
  if (Number.isNaN(deadline.getTime())) return false;
  const diffHours = (deadline.getTime() - Date.now()) / 3600000;
  return diffHours <= 72;
}

function planningCheckpointStartsAt(job: OperationalJob) {
  if (!job.deadline_at) return null;
  const deadline = new Date(job.deadline_at);
  if (Number.isNaN(deadline.getTime())) return null;
  const checkpoint = new Date(deadline);
  checkpoint.setUTCHours(checkpoint.getUTCHours() - 24);
  const now = new Date();
  return checkpoint.getTime() < now.getTime() ? now.toISOString() : checkpoint.toISOString();
}

function agendaLayerFromItemType(itemType?: string | null) {
  switch (String(itemType || '').toLowerCase()) {
    case 'meeting_window':
    case 'meetings':
      return 'meetings';
    case 'publication_window':
    case 'publications':
      return 'publications';
    case 'approval_window':
    case 'approvals':
      return 'approvals';
    case 'planning_checkpoint':
    case 'production_window':
    case 'production':
    case 'production_block':
      return 'production';
    case 'risk_window':
    case 'risks':
      return 'risks';
    default:
      return 'deadlines';
  }
}

function calendarItemLabel(itemType?: string | null) {
  const normalized = String(itemType || '').toLowerCase();
  if (normalized === 'planning_checkpoint') return 'Checkpoint operacional';
  if (normalized === 'approval_window') return 'Janela de aprovação';
  if (normalized === 'publication_window') return 'Janela de publicação';
  if (normalized === 'production_window') return 'Janela de produção';
  if (normalized === 'production_block') return 'Bloco de produção';
  if (normalized === 'meeting_window' || normalized === 'meetings') return 'Reuniões';
  if (normalized === 'risk_window' || normalized === 'risks') return 'Riscos';
  if (normalized === 'deadline_window' || normalized === 'deadlines') return 'Prazo de entrega';

  const layer = agendaLayerFromItemType(itemType);
  return layer === 'deadlines' ? 'Prazos'
    : layer === 'approvals' ? 'Aprovações'
      : layer === 'publications' ? 'Publicações'
        : layer === 'production' ? 'Produção'
          : layer === 'meetings' ? 'Reuniões'
          : 'Riscos';
}

function calendarItemRuntimeLabel(job: Partial<OperationalJob>, itemType?: string | null) {
  const publicationStatus = String(job.metadata?.publication_status || '').toLowerCase();
  if (publicationStatus === 'failed') return 'Falha de publicação';
  if (publicationStatus === 'processing') return 'Publicação em processamento';
  return calendarItemLabel(itemType);
}

function meetingCalendarLabel(status?: string | null) {
  const meetingStatus = String(status || '').toLowerCase();
  return ['scheduled', 'bot_scheduled', 'joining', 'in_call'].includes(meetingStatus)
    ? 'Reunião agendada'
    : 'Reunião registrada';
}

function buildNativeMeetingJob(row: any, extra?: { risk?: RiskInfo; riskSummary?: string; riskAction?: string }) {
  const recordedAt = row.recorded_at as string;
  const meetingStatus = String(row.status || '').toLowerCase();

  return {
    id: `meeting:${row.id}`,
    client_id: row.client_id,
    client_name: row.client_name,
    client_logo_url: row.client_logo_url,
    client_brand_color: row.client_brand_color,
    title: row.title || 'Reunião',
    summary: row.summary || (row.meeting_url ? `Link: ${row.meeting_url}` : 'Reunião registrada na operação.'),
    job_type: 'meeting',
    complexity: 'm',
    channel: null,
    source: 'meeting',
    status: meetingStatus || 'scheduled',
    priority_score: 12,
    priority_band: 'p2',
    impact_level: 3,
    dependency_level: 2,
    required_skill: 'atendimento',
    owner_id: null,
    owner_name: row.created_by_name || null,
    owner_email: null,
    owner_role: null,
    owner_person_type: null,
    owner_specialty: null,
    deadline_at: recordedAt,
    estimated_minutes: Number(row.duration_secs || 0) > 0 ? Math.max(15, Math.round(Number(row.duration_secs) / 60)) : 60,
    actual_minutes: null,
    blocked_minutes: 0,
    queue_minutes: 0,
    is_urgent: false,
    urgency_reason: null,
    definition_of_done: 'Reunião realizada e registrada na operação.',
    metadata: {
      calendar_item: {
        source_type: 'meeting',
        source_id: row.id,
        item_type: 'meeting_window',
        layer: 'meetings',
        label: meetingCalendarLabel(row.status),
        starts_at: recordedAt,
        ends_at: recordedAt,
        status: meetingStatus || 'scheduled',
        priority_band: 'p2',
        risk_level: extra?.risk?.level || 'low',
        capacity_minutes: Number(row.duration_secs || 0) > 0 ? Math.max(15, Math.round(Number(row.duration_secs) / 60)) : 60,
        meeting_id: row.id,
        meeting_url: row.meeting_url,
        platform: row.platform,
        standalone: true,
      },
      ...(extra?.risk ? {
        risk_signal: {
          score: extra.risk.score,
          band: extra.risk.level,
          label: extra.risk.label,
          summary: extra.riskSummary,
          suggested_action: extra.riskAction,
          source_type: 'meeting',
        },
      } : {}),
    },
    created_at: recordedAt,
    updated_at: recordedAt,
  } as OperationalJob;
}

function getNativeMeetingRisk(row: any): { risk: RiskInfo; summary: string; action: string } | null {
  const meetingStatus = String(row.status || '').toLowerCase();
  const hasLink = Boolean(String(row.meeting_url || '').trim());
  const hasClient = Boolean(String(row.client_id || '').trim());
  const recordedAt = row.recorded_at ? new Date(row.recorded_at) : null;
  const diffHours = recordedAt && !Number.isNaN(recordedAt.getTime())
    ? (recordedAt.getTime() - Date.now()) / 3600000
    : null;

  if (meetingStatus === 'failed') {
    return {
      risk: { level: 'critical', label: 'Reunião com falha', score: 96 },
      summary: `A reunião "${row.title || 'Reunião'}" falhou e precisa de rechecagem operacional.`,
      action: 'Abrir reuniões, revisar o registro e confirmar a recuperação da chamada.',
    };
  }
  if (!hasLink && diffHours !== null && diffHours <= 24 && ['scheduled', 'bot_scheduled', 'joining', 'in_call'].includes(meetingStatus)) {
    return {
      risk: { level: 'critical', label: 'Reunião sem link', score: 93 },
      summary: `A reunião "${row.title || 'Reunião'}" já entrou na janela crítica sem link válido.`,
      action: 'Abrir reuniões e corrigir o link antes do horário da chamada.',
    };
  }
  if (!hasLink && ['scheduled', 'bot_scheduled', 'joining', 'in_call'].includes(meetingStatus)) {
    return {
      risk: { level: 'high', label: 'Reunião sem link', score: 81 },
      summary: `A reunião "${row.title || 'Reunião'}" ainda não tem link confirmado na operação.`,
      action: 'Abrir reuniões e definir o link antes de seguir com a agenda.',
    };
  }
  if (!hasClient) {
    return {
      risk: { level: 'medium', label: 'Reunião sem cliente', score: 58 },
      summary: `A reunião "${row.title || 'Reunião'}" ainda não está ligada a um cliente.`,
      action: 'Abrir reuniões e vincular o cliente para a operação não perder contexto.',
    };
  }
  return null;
}

function normalizedAllocationStart(allocation?: Partial<AllocationRuntimeRow> | null) {
  const raw = allocation?.starts_at || null;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function getRisk(job: Partial<OperationalJob>, allocation?: Partial<AllocationRuntimeRow> | null): RiskInfo {
  const deadline = job.deadline_at ? new Date(job.deadline_at) : null;
  const now = new Date();
  const diffHours = deadline ? (deadline.getTime() - now.getTime()) / 3600000 : null;
  const allocationStart = normalizedAllocationStart(allocation);
  const allocationStatus = allocation?.status || null;
  const hasAllocation = Boolean(allocation && allocation.owner_id && allocationStatus && !['done', 'dropped'].includes(allocationStatus));
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
  if (deadline && allocationStart && allocationStart.getTime() > deadline.getTime()) {
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
    if (isPublicationWindow && allocationStatus === 'tentative') {
      return { level: 'high', label: 'Publicação sem execução confirmada', score: 86 };
    }
    if (allocationStatus === 'tentative') {
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
  if (diffHours !== null && diffHours <= 72 && !hasAllocation && !isClosedStatus(job.status)) {
    return { level: 'high', label: 'Sem alocação planejada', score: 78 };
  }
  if (job.status === 'awaiting_approval') return { level: 'high', label: 'Parado em aprovação', score: 76 };
  if (!job.client_id || !job.job_type || !job.deadline_at || !job.required_skill) {
    return { level: 'medium', label: 'Entrada incompleta', score: 58 };
  }
  if (!job.owner_id) return { level: 'medium', label: 'Sem responsável', score: 54 };
  return { level: 'low', label: 'Controlado', score: 18 };
}

function riskSummary(job: OperationalJob, risk: RiskInfo) {
  if (risk.level === 'critical' && risk.label === 'Atrasado') {
    return `A demanda "${job.title}" já passou do prazo e precisa de ação imediata.`;
  }
  if (risk.level === 'critical' && risk.label === 'Bloqueado') {
    return `A demanda "${job.title}" está bloqueada no fluxo e já afeta a operação.`;
  }
  if (risk.level === 'critical' && risk.label === 'Alocação depois do prazo') {
    return `A demanda "${job.title}" foi planejada para depois do prazo final.`;
  }
  if (risk.level === 'critical' && risk.label === 'Falha de publicação') {
    return `A demanda "${job.title}" teve falha na publicação e precisa de correção imediata.`;
  }
  if (risk.level === 'critical' && risk.label === 'Aprovação travando entrega') {
    return `A demanda "${job.title}" depende de aprovação imediata para não estourar a entrega.`;
  }
  if (risk.level === 'critical' && risk.label === 'Publicação sem execução') {
    return `A demanda "${job.title}" já entrou na janela de publicação sem execução confirmada.`;
  }
  if (risk.level === 'critical' && risk.label === 'Publicação em processamento') {
    return `A demanda "${job.title}" ainda está em processamento na janela final de publicação.`;
  }
  if (risk.level === 'critical' && risk.label === 'Sem alocação para 24h') {
    return `A demanda "${job.title}" vence em até 24 horas e ainda não tem alocação confirmada.`;
  }
  if (risk.level === 'critical' && risk.label === 'Sem responsável') {
    return `A demanda "${job.title}" é crítica e ainda está sem responsável.`;
  }
  if (risk.level === 'high' && risk.label === 'Sem alocação planejada') {
    return `A demanda "${job.title}" já está perto do prazo e ainda não entrou no plano da semana.`;
  }
  if (risk.level === 'high' && risk.label === 'Alocação ainda reservada') {
    return `A demanda "${job.title}" depende de uma alocação ainda não confirmada.`;
  }
  if (risk.level === 'high' && risk.label === 'Publicação em processamento') {
    return `A demanda "${job.title}" já entrou na janela final e segue em processamento.`;
  }
  if (risk.level === 'high' && risk.label === 'Publicação sem execução confirmada') {
    return `A demanda "${job.title}" está perto de publicar, mas a execução ainda está só reservada.`;
  }
  if (risk.level === 'high' && risk.label === 'Publicação sem encaixe') {
    return `A demanda "${job.title}" está perto da publicação e ainda não entrou no plano da semana.`;
  }
  if (risk.level === 'high' && risk.label === 'Janela de publicação hoje') {
    return `A demanda "${job.title}" já entrou na janela de publicação de hoje.`;
  }
  if (risk.level === 'high' && risk.label === 'Aprovação pendente') {
    return `A demanda "${job.title}" precisa de aprovação nos próximos dias para não travar a entrega.`;
  }
  if (risk.level === 'high' && risk.label === 'Vence em 24h') {
    return `A demanda "${job.title}" vence nas próximas 24 horas.`;
  }
  if (risk.level === 'high' && risk.label === 'Parado em aprovação') {
    return `A demanda "${job.title}" está parada aguardando aprovação.`;
  }
  if (risk.level === 'medium' && risk.label === 'Entrada incompleta') {
    return `A demanda "${job.title}" ainda não tem contexto suficiente para seguir.`;
  }
  if (risk.level === 'medium' && risk.label === 'Sem responsável') {
    return `A demanda "${job.title}" ainda precisa de responsável definido.`;
  }
  return `A demanda "${job.title}" está controlada.`;
}

function riskAction(job: OperationalJob, risk: RiskInfo) {
  if (risk.level === 'critical' && risk.label === 'Atrasado') return 'Replanejar imediatamente e redistribuir a carga.';
  if (risk.level === 'critical' && risk.label === 'Bloqueado') return 'Resolver o bloqueio antes de seguir a produção.';
  if (risk.level === 'critical' && risk.label === 'Alocação depois do prazo') return 'Antecipar a execução ou renegociar a entrega antes que o prazo estoure.';
  if (risk.level === 'critical' && risk.label === 'Falha de publicação') return 'Corrigir a publicação, reprocessar a saída e confirmar o canal agora.';
  if (risk.level === 'critical' && risk.label === 'Aprovação travando entrega') return 'Cobrar aprovação agora ou renegociar a janela de entrega.';
  if (risk.level === 'critical' && risk.label === 'Publicação sem execução') return 'Confirmar execução e horário de publicação imediatamente.';
  if (risk.level === 'critical' && risk.label === 'Publicação em processamento') return 'Validar o processamento e confirmar a publicação sem esperar o próximo ciclo.';
  if (risk.level === 'critical' && risk.label === 'Sem alocação para 24h') return 'Definir responsável e bloco de execução ainda hoje.';
  if (risk.level === 'critical' && risk.label === 'Sem responsável') return 'Definir responsável e levar a demanda para a alocação.';
  if (risk.level === 'high' && risk.label === 'Sem alocação planejada') return 'Levar a demanda para a alocação antes que vire atraso.';
  if (risk.level === 'high' && risk.label === 'Alocação ainda reservada') return 'Confirmar a alocação ou redistribuir a carga.';
  if (risk.level === 'high' && risk.label === 'Publicação em processamento') return 'Acompanhar o processamento e validar o canal antes do horário final.';
  if (risk.level === 'high' && risk.label === 'Publicação sem execução confirmada') return 'Confirmar o bloco de execução antes da janela de publicação.';
  if (risk.level === 'high' && risk.label === 'Publicação sem encaixe') return 'Levar a demanda para a alocação antes da janela de publicação.';
  if (risk.level === 'high' && risk.label === 'Janela de publicação hoje') return 'Validar peça, horário e responsável antes da saída.';
  if (risk.level === 'high' && risk.label === 'Aprovação pendente') return 'Cobrar aprovação e proteger a janela de entrega.';
  if (risk.level === 'high' && risk.label === 'Vence em 24h') return 'Puxar a demanda para a frente da fila hoje.';
  if (risk.level === 'high' && risk.label === 'Parado em aprovação') return 'Cobrar aprovação e proteger a janela de entrega.';
  if (risk.level === 'medium' && risk.label === 'Entrada incompleta') return 'Completar contexto, prazo e especialidade antes de seguir.';
  if (risk.level === 'medium' && risk.label === 'Sem responsável') return 'Atribuir responsável para liberar a demanda.';
  return 'Monitorar.';
}

function sortByOperationalPriority(a: OperationalJob, b: OperationalJob) {
  const priorityRank = { p0: 0, p1: 1, p2: 2, p3: 3, p4: 4 } as const;
  const riskRank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  const riskA = riskRank[getRisk(a).level];
  const riskB = riskRank[getRisk(b).level];
  const prioA = priorityRank[a.priority_band] ?? 4;
  const prioB = priorityRank[b.priority_band] ?? 4;
  const timeA = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
  const timeB = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;

  return (riskA - riskB) || (prioA - prioB) || (timeA - timeB);
}

async function fetchOperationalJobs(tenantId: string) {
  const { rows } = await query<OperationalJob>(
    `SELECT
       j.*,
       c.name AS client_name,
       c.profile->>'logo_url' AS client_logo_url,
       c.profile->'brand_colors'->>0 AS client_brand_color,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
       u.email AS owner_email,
       tu.role AS owner_role,
       fp.specialty AS owner_specialty,
       CASE WHEN fp.id IS NOT NULL THEN 'freelancer' ELSE 'internal' END AS owner_person_type
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     LEFT JOIN edro_users u ON u.id::text = j.owner_id
     LEFT JOIN tenant_users tu ON tu.user_id::text = j.owner_id AND tu.tenant_id::text = j.tenant_id
     LEFT JOIN freelancer_profiles fp ON fp.user_id::text = j.owner_id
    WHERE j.tenant_id = $1
      AND j.status <> 'archived'
    ORDER BY j.updated_at DESC`,
    [tenantId],
  );

  return rows;
}

async function fetchOperationalJobById(tenantId: string, jobId: string) {
  const jobs = await fetchOperationalJobs(tenantId);
  return jobs.find((job) => job.id === jobId) || null;
}

async function fetchPrimaryAllocationByJobId(tenantId: string, jobId: string) {
  const { rows } = await query<AllocationRuntimeRow>(
    `SELECT *
       FROM job_allocations
      WHERE tenant_id = $1
        AND job_id = $2
        AND allocation_kind = 'primary'
      LIMIT 1`,
    [tenantId, jobId],
  );
  return rows[0] || null;
}

export async function syncAllocations(tenantId: string) {
  const jobs = await fetchOperationalJobs(tenantId);
  const activeByJobId = new Map<string, OperationalJob>();

  for (const job of jobs) {
    if (!job.owner_id || isClosedStatus(job.status)) continue;
    activeByJobId.set(job.id, job);
    const status = deriveAllocationStatus(job.status);
    await query(
      `INSERT INTO job_allocations (
         tenant_id, job_id, owner_id, allocation_kind, status, week_start, planned_minutes, starts_at, ends_at, updated_at
       ) VALUES ($1,$2,$3,'primary',$4,$5,$6,$7,$8,now())
       ON CONFLICT (tenant_id, job_id, allocation_kind) DO UPDATE
         SET owner_id = EXCLUDED.owner_id,
             status = CASE
               WHEN job_allocations.status IN ('done', 'dropped') THEN EXCLUDED.status
               WHEN EXCLUDED.status = 'blocked' THEN 'blocked'
               WHEN job_allocations.status = 'blocked' AND EXCLUDED.status <> 'blocked' THEN EXCLUDED.status
               ELSE job_allocations.status
             END,
             week_start = COALESCE(job_allocations.week_start, EXCLUDED.week_start),
             planned_minutes = CASE
               WHEN COALESCE(job_allocations.planned_minutes, 0) > 0 THEN job_allocations.planned_minutes
               ELSE EXCLUDED.planned_minutes
             END,
             starts_at = COALESCE(job_allocations.starts_at, EXCLUDED.starts_at),
             ends_at = COALESCE(job_allocations.ends_at, EXCLUDED.ends_at),
             updated_at = now()`,
      [
        tenantId,
        job.id,
        job.owner_id,
        status,
        startOfWeekIso(job.deadline_at || job.updated_at),
        Number(job.estimated_minutes || 0),
        job.deadline_at ?? null,
        job.deadline_at ?? null,
      ],
    );
  }

  await query(
    `UPDATE job_allocations ja
        SET status = CASE
              WHEN j.status IN ('done', 'archived') THEN 'done'
              ELSE 'dropped'
            END,
            updated_at = now()
       FROM jobs j
      WHERE ja.tenant_id = $1
        AND ja.job_id = j.id
        AND (j.owner_id IS NULL OR j.status IN ('done', 'archived'))
        AND ja.status NOT IN ('done', 'dropped')`,
    [tenantId],
  );

  return { total_jobs: activeByJobId.size };
}

export async function upsertJobAllocation(tenantId: string, input: UpsertAllocationInput) {
  const jobRes = await query<OperationalJob>(
    `SELECT
       j.*,
       c.name AS client_name,
       c.profile->>'logo_url' AS client_logo_url,
       c.profile->'brand_colors'->>0 AS client_brand_color,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
       u.email AS owner_email,
       tu.role AS owner_role,
       fp.specialty AS owner_specialty,
       CASE WHEN fp.id IS NOT NULL THEN 'freelancer' ELSE 'internal' END AS owner_person_type
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     LEFT JOIN edro_users u ON u.id::text = j.owner_id
     LEFT JOIN tenant_users tu ON tu.user_id::text = j.owner_id AND tu.tenant_id::text = j.tenant_id
     LEFT JOIN freelancer_profiles fp ON fp.user_id::text = j.owner_id
    WHERE j.tenant_id = $1 AND j.id = $2
    LIMIT 1`,
    [tenantId, input.jobId],
  );

  if (!jobRes.rows.length) {
    throw new Error('Demanda não encontrada.');
  }

  const job = jobRes.rows[0];
  if (isClosedStatus(job.status) && input.status !== 'done' && input.status !== 'dropped') {
    throw new Error('Não é possível alocar uma demanda fechada.');
  }

  const allocRes = await query<any>(
    `SELECT *
       FROM job_allocations
      WHERE tenant_id = $1 AND job_id = $2 AND allocation_kind = 'primary'
      LIMIT 1`,
    [tenantId, input.jobId],
  );
  const current = allocRes.rows[0] || null;
  const weekStart = startOfWeekIso(input.startsAt || current?.week_start || job.deadline_at || job.updated_at);
  const plannedMinutes = Math.max(0, Number(input.plannedMinutes ?? current?.planned_minutes ?? job.estimated_minutes ?? 0));
  const nextStatus = input.status;

  let nextJobStatus = job.status;
  if (nextStatus === 'blocked') {
    nextJobStatus = 'blocked';
  } else if (input.ownerId && ['intake', 'planned', 'ready'].includes(job.status)) {
    nextJobStatus = nextStatus === 'tentative' ? 'planned' : 'allocated';
  } else if (job.status === 'blocked') {
    nextJobStatus = nextStatus === 'tentative' ? 'planned' : 'allocated';
  }

  await query(
    `UPDATE jobs
        SET owner_id = $3,
            status = $4
      WHERE tenant_id = $1 AND id = $2`,
    [tenantId, input.jobId, input.ownerId, nextJobStatus],
  );

  if (current && current.owner_id !== input.ownerId) {
    await query(
      `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.jobId, job.status, nextJobStatus, input.changedBy ?? null, 'allocation_owner_changed'],
    );
  } else if (job.status !== nextJobStatus) {
    await query(
      `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.jobId, job.status, nextJobStatus, input.changedBy ?? null, 'allocation_status_sync'],
    );
  }

  const allocationUpsert = await query<any>(
    `INSERT INTO job_allocations (
       tenant_id, job_id, owner_id, allocation_kind, status, week_start, planned_minutes, starts_at, ends_at, notes, updated_at
     ) VALUES ($1,$2,$3,'primary',$4,$5,$6,$7,$8,$9,now())
     ON CONFLICT (tenant_id, job_id, allocation_kind) DO UPDATE
       SET owner_id = EXCLUDED.owner_id,
           status = EXCLUDED.status,
           week_start = EXCLUDED.week_start,
           planned_minutes = EXCLUDED.planned_minutes,
           starts_at = EXCLUDED.starts_at,
           ends_at = EXCLUDED.ends_at,
           notes = EXCLUDED.notes,
           updated_at = now()
     RETURNING *`,
    [
      tenantId,
      input.jobId,
      input.ownerId,
      nextStatus,
      weekStart,
      plannedMinutes,
      input.startsAt ?? job.deadline_at ?? null,
      input.endsAt ?? job.deadline_at ?? null,
      input.notes ?? current?.notes ?? null,
    ],
  );

  const updatedJobRes = await fetchOperationalJobs(tenantId);
  const updatedJob = updatedJobRes.find((item) => item.id === input.jobId) || null;

  return {
    allocation: allocationUpsert.rows[0],
    job: updatedJob,
  };
}

export async function dropJobAllocation(tenantId: string, jobId: string, changedBy?: string | null) {
  const jobRes = await query<OperationalJob>(
    `SELECT
       j.*,
       c.name AS client_name,
       c.profile->>'logo_url' AS client_logo_url,
       c.profile->'brand_colors'->>0 AS client_brand_color,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
       u.email AS owner_email,
       tu.role AS owner_role,
       fp.specialty AS owner_specialty,
       CASE WHEN fp.id IS NOT NULL THEN 'freelancer' ELSE 'internal' END AS owner_person_type
     FROM jobs j
     LEFT JOIN clients c ON c.id = j.client_id
     LEFT JOIN edro_users u ON u.id::text = j.owner_id
     LEFT JOIN tenant_users tu ON tu.user_id::text = j.owner_id AND tu.tenant_id::text = j.tenant_id
     LEFT JOIN freelancer_profiles fp ON fp.user_id::text = j.owner_id
    WHERE j.tenant_id = $1 AND j.id = $2
    LIMIT 1`,
    [tenantId, jobId],
  );

  if (!jobRes.rows.length) {
    throw new Error('Demanda não encontrada.');
  }

  const job = jobRes.rows[0];
  if (isClosedStatus(job.status)) {
    throw new Error('Não é possível soltar a alocação de uma demanda fechada.');
  }

  await query(
    `UPDATE job_allocations
        SET owner_id = NULL,
            status = 'dropped',
            updated_at = now()
      WHERE tenant_id = $1
        AND job_id = $2
        AND allocation_kind = 'primary'`,
    [tenantId, jobId],
  );

  const nextStatus = job.status === 'blocked' ? 'planned' : 'planned';
  await query(
    `UPDATE jobs
        SET owner_id = NULL,
            status = $3
      WHERE tenant_id = $1 AND id = $2`,
    [tenantId, jobId, nextStatus],
  );

  await query(
    `INSERT INTO job_status_history (job_id, from_status, to_status, changed_by, reason)
     VALUES ($1, $2, $3, $4, $5)`,
    [jobId, job.status, nextStatus, changedBy ?? null, 'allocation_dropped'],
  );

  const updatedJobRes = await fetchOperationalJobs(tenantId);
  const updatedJob = updatedJobRes.find((item) => item.id === jobId) || null;

  return { job: updatedJob };
}

export async function syncCalendarItems(tenantId: string) {
  const jobs = await fetchOperationalJobs(tenantId);
  const { rows: allocationRows } = await query<AllocationRuntimeRow>(
    `SELECT *
       FROM job_allocations
      WHERE tenant_id = $1
        AND allocation_kind = 'primary'
        AND status IN ('tentative', 'committed', 'blocked')
        AND starts_at IS NOT NULL`,
    [tenantId],
  );
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const allocationsByJobId = new Map<string, AllocationRuntimeRow>();
  for (const allocation of allocationRows) {
    allocationsByJobId.set(allocation.job_id, allocation);
  }
  let synced = 0;

  for (const job of jobs) {
    if (!job.deadline_at || isClosedStatus(job.status)) continue;
    const allocation = allocationsByJobId.get(job.id);
    const risk = getRisk(job, allocation);
    await query(
      `INSERT INTO calendar_items (
         tenant_id, source_type, source_id, client_id, job_id, owner_id, item_type, title, starts_at, ends_at,
         status, priority_band, risk_level, capacity_minutes, metadata, updated_at
       ) VALUES (
         $1,'job',$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11,$12,$13::jsonb,now()
       )
       ON CONFLICT (tenant_id, source_type, source_id, item_type) DO UPDATE
         SET client_id = EXCLUDED.client_id,
             owner_id = EXCLUDED.owner_id,
             title = EXCLUDED.title,
             starts_at = EXCLUDED.starts_at,
             ends_at = EXCLUDED.ends_at,
             status = EXCLUDED.status,
             priority_band = EXCLUDED.priority_band,
             risk_level = EXCLUDED.risk_level,
             capacity_minutes = EXCLUDED.capacity_minutes,
             metadata = EXCLUDED.metadata,
             updated_at = now()`,
      [
        tenantId,
        job.id,
        job.client_id,
        job.id,
        job.owner_id,
        calendarItemTypeForJob(job),
        job.title,
        job.deadline_at,
        job.deadline_at,
        job.priority_band,
        risk.level,
        Number(job.estimated_minutes || 0),
        JSON.stringify({
          label: calendarItemRuntimeLabel(job, calendarItemTypeForJob(job)),
          job_type: job.job_type,
          source: job.source,
          publication_status: job.metadata?.publication_status || null,
          client_name: job.client_name,
          owner_name: job.owner_name,
        }),
      ],
    );
    synced += 1;

    if (shouldCreatePlanningCheckpoint(job, allocation)) {
      const checkpointStartsAt = planningCheckpointStartsAt(job);
      if (checkpointStartsAt) {
        await query(
          `INSERT INTO calendar_items (
             tenant_id, source_type, source_id, client_id, job_id, owner_id, item_type, title, starts_at, ends_at,
             status, priority_band, risk_level, capacity_minutes, metadata, updated_at
           ) VALUES (
             $1,'checkpoint',$2,$3,$4,$5,'planning_checkpoint',$6,$7,$8,'active',$9,$10,$11,$12::jsonb,now()
           )
           ON CONFLICT (tenant_id, source_type, source_id, item_type) DO UPDATE
             SET client_id = EXCLUDED.client_id,
                 owner_id = EXCLUDED.owner_id,
                 title = EXCLUDED.title,
                 starts_at = EXCLUDED.starts_at,
                 ends_at = EXCLUDED.ends_at,
                 status = EXCLUDED.status,
                 priority_band = EXCLUDED.priority_band,
                 risk_level = EXCLUDED.risk_level,
                 capacity_minutes = EXCLUDED.capacity_minutes,
                 metadata = EXCLUDED.metadata,
                 updated_at = now()`,
          [
            tenantId,
            job.id,
            job.client_id,
            job.id,
            job.owner_id,
            job.title,
            checkpointStartsAt,
            job.deadline_at,
            job.priority_band,
            risk.level,
            Number(job.estimated_minutes || 0),
            JSON.stringify({
              label: 'Checkpoint operacional',
              job_type: job.job_type,
              source: job.source,
              client_name: job.client_name,
              owner_name: job.owner_name,
            }),
          ],
        );
        synced += 1;
      }
    }
  }

  for (const allocation of allocationRows) {
    const job = jobsById.get(allocation.job_id);
    if (!job || isClosedStatus(job.status) || !allocation.starts_at) continue;
    const risk = getRisk(job, allocation);
    const plannedMinutes = Number(allocation.planned_minutes || job.estimated_minutes || 0);
    const startsAt = allocation.starts_at;
    const endsAt = allocation.ends_at || (() => {
      const date = new Date(startsAt);
      if (Number.isNaN(date.getTime())) return startsAt;
      date.setUTCMinutes(date.getUTCMinutes() + Math.max(0, plannedMinutes));
      return date.toISOString();
    })();

    await query(
      `INSERT INTO calendar_items (
         tenant_id, source_type, source_id, client_id, job_id, owner_id, item_type, title, starts_at, ends_at,
         status, priority_band, risk_level, capacity_minutes, metadata, updated_at
       ) VALUES (
         $1,'allocation',$2,$3,$4,$5,'production_block',$6,$7,$8,$9,$10,$11,$12,$13::jsonb,now()
       )
       ON CONFLICT (tenant_id, source_type, source_id, item_type) DO UPDATE
         SET client_id = EXCLUDED.client_id,
             job_id = EXCLUDED.job_id,
             owner_id = EXCLUDED.owner_id,
             title = EXCLUDED.title,
             starts_at = EXCLUDED.starts_at,
             ends_at = EXCLUDED.ends_at,
             status = EXCLUDED.status,
             priority_band = EXCLUDED.priority_band,
             risk_level = EXCLUDED.risk_level,
             capacity_minutes = EXCLUDED.capacity_minutes,
             metadata = EXCLUDED.metadata,
             updated_at = now()`,
      [
        tenantId,
        allocation.id,
        job.client_id,
        job.id,
        allocation.owner_id || job.owner_id,
        job.title,
        startsAt,
        endsAt,
        allocation.status,
        job.priority_band,
        risk.level,
        plannedMinutes,
        JSON.stringify({
          label: 'Bloco de produção',
          job_type: job.job_type,
          source: job.source,
          client_name: job.client_name,
          owner_name: job.owner_name,
          allocation_status: allocation.status,
          allocation_kind: allocation.allocation_kind,
        }),
      ],
    );
    synced += 1;
  }

  await query(
    `DELETE FROM calendar_items
      WHERE tenant_id = $1
        AND source_type = 'job'
        AND NOT EXISTS (
          SELECT 1
            FROM jobs j
           WHERE j.id::text = calendar_items.source_id
             AND j.tenant_id = $1
             AND j.status <> 'archived'
             AND j.deadline_at IS NOT NULL
        )`,
    [tenantId],
  );

  await query(
    `DELETE FROM calendar_items
      WHERE tenant_id = $1
        AND source_type = 'allocation'
        AND NOT EXISTS (
          SELECT 1
            FROM job_allocations ja
            JOIN jobs j ON j.id = ja.job_id
           WHERE ja.id::text = calendar_items.source_id
             AND ja.tenant_id = $1
             AND ja.allocation_kind = 'primary'
             AND ja.status IN ('tentative', 'committed', 'blocked')
             AND ja.starts_at IS NOT NULL
             AND j.tenant_id = $1
             AND j.status NOT IN ('done', 'archived')
        )`,
    [tenantId],
  );

  await query(
    `DELETE FROM calendar_items
      WHERE tenant_id = $1
        AND source_type = 'checkpoint'
        AND NOT EXISTS (
          SELECT 1
            FROM jobs j
            LEFT JOIN job_allocations ja
              ON ja.job_id = j.id
             AND ja.tenant_id = $1
             AND ja.allocation_kind = 'primary'
             AND ja.status IN ('tentative', 'committed', 'blocked')
           WHERE j.id::text = calendar_items.source_id
             AND j.tenant_id = $1
             AND j.status NOT IN ('done', 'archived')
             AND j.deadline_at IS NOT NULL
             AND j.status IN ('intake', 'planned', 'ready')
             AND (
               ja.id IS NULL
               OR ja.status IN ('done', 'dropped')
             )
             AND (EXTRACT(EPOCH FROM (j.deadline_at - NOW())) / 3600.0) <= 72
        )`,
    [tenantId],
  );

  return { synced };
}

async function syncCalendarItemsForJob(tenantId: string, jobId: string) {
  const job = await fetchOperationalJobById(tenantId, jobId);
  const allocation = await fetchPrimaryAllocationByJobId(tenantId, jobId);
  let synced = 0;

  if (job && job.deadline_at && !isClosedStatus(job.status)) {
    const risk = getRisk(job, allocation);
    await query(
      `INSERT INTO calendar_items (
         tenant_id, source_type, source_id, client_id, job_id, owner_id, item_type, title, starts_at, ends_at,
         status, priority_band, risk_level, capacity_minutes, metadata, updated_at
       ) VALUES (
         $1,'job',$2,$3,$4,$5,$6,$7,$8,$9,'active',$10,$11,$12,$13::jsonb,now()
       )
       ON CONFLICT (tenant_id, source_type, source_id, item_type) DO UPDATE
         SET client_id = EXCLUDED.client_id,
             owner_id = EXCLUDED.owner_id,
             title = EXCLUDED.title,
             starts_at = EXCLUDED.starts_at,
             ends_at = EXCLUDED.ends_at,
             status = EXCLUDED.status,
             priority_band = EXCLUDED.priority_band,
             risk_level = EXCLUDED.risk_level,
             capacity_minutes = EXCLUDED.capacity_minutes,
             metadata = EXCLUDED.metadata,
             updated_at = now()`,
      [
        tenantId,
        job.id,
        job.client_id,
        job.id,
        job.owner_id,
        calendarItemTypeForJob(job),
        job.title,
        job.deadline_at,
        job.deadline_at,
        job.priority_band,
        risk.level,
        Number(job.estimated_minutes || 0),
        JSON.stringify({
          label: calendarItemRuntimeLabel(job, calendarItemTypeForJob(job)),
          job_type: job.job_type,
          source: job.source,
          publication_status: job.metadata?.publication_status || null,
          client_name: job.client_name,
          owner_name: job.owner_name,
        }),
      ],
    );
    synced += 1;

    if (shouldCreatePlanningCheckpoint(job, allocation)) {
      const checkpointStartsAt = planningCheckpointStartsAt(job);
      if (checkpointStartsAt) {
        await query(
          `INSERT INTO calendar_items (
             tenant_id, source_type, source_id, client_id, job_id, owner_id, item_type, title, starts_at, ends_at,
             status, priority_band, risk_level, capacity_minutes, metadata, updated_at
           ) VALUES (
             $1,'checkpoint',$2,$3,$4,$5,'planning_checkpoint',$6,$7,$8,'active',$9,$10,$11,$12::jsonb,now()
           )
           ON CONFLICT (tenant_id, source_type, source_id, item_type) DO UPDATE
             SET client_id = EXCLUDED.client_id,
                 owner_id = EXCLUDED.owner_id,
                 title = EXCLUDED.title,
                 starts_at = EXCLUDED.starts_at,
                 ends_at = EXCLUDED.ends_at,
                 status = EXCLUDED.status,
                 priority_band = EXCLUDED.priority_band,
                 risk_level = EXCLUDED.risk_level,
                 capacity_minutes = EXCLUDED.capacity_minutes,
                 metadata = EXCLUDED.metadata,
                 updated_at = now()`,
          [
            tenantId,
            job.id,
            job.client_id,
            job.id,
            job.owner_id,
            job.title,
            checkpointStartsAt,
            job.deadline_at,
            job.priority_band,
            risk.level,
            Number(job.estimated_minutes || 0),
            JSON.stringify({
              label: 'Checkpoint operacional',
              job_type: job.job_type,
              source: job.source,
              client_name: job.client_name,
              owner_name: job.owner_name,
            }),
          ],
        );
        synced += 1;
      }
    } else {
      await query(
        `DELETE FROM calendar_items
          WHERE tenant_id = $1
            AND source_type = 'checkpoint'
            AND source_id = $2`,
        [tenantId, jobId],
      );
    }
  } else {
    await query(
      `DELETE FROM calendar_items
        WHERE tenant_id = $1
          AND source_type = 'job'
          AND source_id = $2`,
      [tenantId, jobId],
    );
    await query(
      `DELETE FROM calendar_items
        WHERE tenant_id = $1
          AND source_type = 'checkpoint'
          AND source_id = $2`,
      [tenantId, jobId],
    );
  }

  if (job && allocation && allocation.starts_at && !isClosedStatus(job.status) && ['tentative', 'committed', 'blocked'].includes(allocation.status)) {
    const risk = getRisk(job, allocation);
    const plannedMinutes = Number(allocation.planned_minutes || job.estimated_minutes || 0);
    const startsAt = allocation.starts_at;
    const endsAt = allocation.ends_at || (() => {
      const date = new Date(startsAt);
      if (Number.isNaN(date.getTime())) return startsAt;
      date.setUTCMinutes(date.getUTCMinutes() + Math.max(0, plannedMinutes));
      return date.toISOString();
    })();

    await query(
      `INSERT INTO calendar_items (
         tenant_id, source_type, source_id, client_id, job_id, owner_id, item_type, title, starts_at, ends_at,
         status, priority_band, risk_level, capacity_minutes, metadata, updated_at
       ) VALUES (
         $1,'allocation',$2,$3,$4,$5,'production_block',$6,$7,$8,$9,$10,$11,$12,$13::jsonb,now()
       )
       ON CONFLICT (tenant_id, source_type, source_id, item_type) DO UPDATE
         SET client_id = EXCLUDED.client_id,
             job_id = EXCLUDED.job_id,
             owner_id = EXCLUDED.owner_id,
             title = EXCLUDED.title,
             starts_at = EXCLUDED.starts_at,
             ends_at = EXCLUDED.ends_at,
             status = EXCLUDED.status,
             priority_band = EXCLUDED.priority_band,
             risk_level = EXCLUDED.risk_level,
             capacity_minutes = EXCLUDED.capacity_minutes,
             metadata = EXCLUDED.metadata,
             updated_at = now()`,
      [
        tenantId,
        allocation.id,
        job.client_id,
        job.id,
        allocation.owner_id || job.owner_id,
        job.title,
        startsAt,
        endsAt,
        allocation.status,
        job.priority_band,
        risk.level,
        plannedMinutes,
        JSON.stringify({
          label: 'Bloco de produção',
          job_type: job.job_type,
          source: job.source,
          client_name: job.client_name,
          owner_name: job.owner_name,
          allocation_status: allocation.status,
          allocation_kind: allocation.allocation_kind,
        }),
      ],
    );
    synced += 1;
  } else {
    await query(
      `DELETE FROM calendar_items
        WHERE tenant_id = $1
          AND source_type = 'allocation'
          AND job_id = $2`,
      [tenantId, jobId],
    );
  }

  return { synced };
}

export async function syncRiskSignals(tenantId: string) {
  const jobs = await fetchOperationalJobs(tenantId);
  const { rows: allocationRows } = await query<AllocationRuntimeRow>(
    `SELECT *
       FROM job_allocations
      WHERE tenant_id = $1
        AND allocation_kind = 'primary'
        AND status IN ('tentative', 'committed', 'blocked')`,
    [tenantId],
  );
  const allocationsByJobId = new Map<string, AllocationRuntimeRow>();
  for (const allocation of allocationRows) {
    allocationsByJobId.set(allocation.job_id, allocation);
  }
  let activeSignals = 0;

  for (const job of jobs) {
    const allocation = allocationsByJobId.get(job.id);
    const risk = getRisk(job, allocation);
    if (risk.level === 'low') {
      await query(
        `UPDATE risk_signals
            SET resolved_at = now(),
                updated_at = now()
          WHERE tenant_id = $1
            AND entity_type = 'job'
            AND entity_id = $2
            AND risk_type = 'operational'
            AND resolved_at IS NULL`,
        [tenantId, job.id],
      );
      continue;
    }

    await query(
      `INSERT INTO risk_signals (
         tenant_id, entity_type, entity_id, client_id, job_id, owner_id, risk_type, risk_score, risk_band,
         summary, suggested_action, metadata, resolved_at, updated_at
       ) VALUES (
         $1,'job',$2,$3,$4,$5,'operational',$6,$7,$8,$9,$10::jsonb,NULL,now()
       )
       ON CONFLICT (tenant_id, entity_type, entity_id, risk_type) DO UPDATE
         SET client_id = EXCLUDED.client_id,
             job_id = EXCLUDED.job_id,
             owner_id = EXCLUDED.owner_id,
             risk_score = EXCLUDED.risk_score,
             risk_band = EXCLUDED.risk_band,
             summary = EXCLUDED.summary,
             suggested_action = EXCLUDED.suggested_action,
             metadata = EXCLUDED.metadata,
             resolved_at = NULL,
             updated_at = now()`,
      [
        tenantId,
        job.id,
        job.client_id,
        job.id,
        job.owner_id,
        risk.score,
        risk.level,
        riskSummary(job, risk),
        riskAction(job, risk),
        JSON.stringify({
          label: risk.label,
          priority_band: job.priority_band,
          status: job.status,
          deadline_at: job.deadline_at,
          publication_status: job.metadata?.publication_status || null,
          allocation_status: allocation?.status || null,
          allocation_starts_at: allocation?.starts_at || null,
          allocation_planned_minutes: Number(allocation?.planned_minutes || 0),
        }),
      ],
    );
    activeSignals += 1;
  }

  return { active_signals: activeSignals };
}

async function syncRiskSignalForJob(tenantId: string, jobId: string) {
  const job = await fetchOperationalJobById(tenantId, jobId);
  const allocation = await fetchPrimaryAllocationByJobId(tenantId, jobId);

  if (!job || isClosedStatus(job.status)) {
    await query(
      `UPDATE risk_signals
          SET resolved_at = now(),
              updated_at = now()
        WHERE tenant_id = $1
          AND entity_type = 'job'
          AND entity_id = $2
          AND risk_type = 'operational'
          AND resolved_at IS NULL`,
      [tenantId, jobId],
    );
    return { active_signals: 0 };
  }

  const risk = getRisk(job, allocation);
  if (risk.level === 'low') {
    await query(
      `UPDATE risk_signals
          SET resolved_at = now(),
              updated_at = now()
        WHERE tenant_id = $1
          AND entity_type = 'job'
          AND entity_id = $2
          AND risk_type = 'operational'
          AND resolved_at IS NULL`,
      [tenantId, job.id],
    );
    return { active_signals: 0 };
  }

  await query(
    `INSERT INTO risk_signals (
       tenant_id, entity_type, entity_id, client_id, job_id, owner_id, risk_type, risk_score, risk_band,
       summary, suggested_action, metadata, resolved_at, updated_at
     ) VALUES (
       $1,'job',$2,$3,$4,$5,'operational',$6,$7,$8,$9,$10::jsonb,NULL,now()
     )
     ON CONFLICT (tenant_id, entity_type, entity_id, risk_type) DO UPDATE
       SET client_id = EXCLUDED.client_id,
           job_id = EXCLUDED.job_id,
           owner_id = EXCLUDED.owner_id,
           risk_score = EXCLUDED.risk_score,
           risk_band = EXCLUDED.risk_band,
           summary = EXCLUDED.summary,
           suggested_action = EXCLUDED.suggested_action,
           metadata = EXCLUDED.metadata,
           resolved_at = NULL,
           updated_at = now()`,
    [
      tenantId,
      job.id,
      job.client_id,
      job.id,
      job.owner_id,
      risk.score,
      risk.level,
      riskSummary(job, risk),
      riskAction(job, risk),
      JSON.stringify({
        label: risk.label,
        priority_band: job.priority_band,
        status: job.status,
        deadline_at: job.deadline_at,
        publication_status: job.metadata?.publication_status || null,
        allocation_status: allocation?.status || null,
        allocation_starts_at: allocation?.starts_at || null,
        allocation_planned_minutes: Number(allocation?.planned_minutes || 0),
      }),
    ],
  );

  return { active_signals: 1 };
}

export async function syncOperationalRuntimeForJob(tenantId: string, jobId: string) {
  const [calendar, risks] = await Promise.all([
    syncCalendarItemsForJob(tenantId, jobId),
    syncRiskSignalForJob(tenantId, jobId),
  ]);

  return { calendar, risks };
}

export async function buildPlannerSnapshot(tenantId: string) {
  await syncAllocations(tenantId);

  const { rows: ownerRows } = await query<any>(
    `SELECT
       u.id,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS name,
       u.email,
       tu.role,
       fp.specialty,
       CASE WHEN fp.id IS NOT NULL THEN 'freelancer' ELSE 'internal' END AS person_type
     FROM tenant_users tu
     JOIN edro_users u ON u.id = tu.user_id
     LEFT JOIN freelancer_profiles fp ON fp.user_id = u.id
    WHERE tu.tenant_id = $1
    ORDER BY name ASC`,
    [tenantId],
  );

  const jobs = await fetchOperationalJobs(tenantId);
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const { rows: allocationRows } = await query<any>(
    `SELECT *
       FROM job_allocations
      WHERE tenant_id = $1
        AND status IN ('tentative', 'committed', 'blocked')
      ORDER BY week_start ASC, updated_at DESC`,
    [tenantId],
  );

  const byOwner = new Map<string, PlannerRow>();
  for (const owner of ownerRows) {
    const allocable = ownerAllocableMinutes(owner);
    byOwner.set(owner.id, {
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        role: owner.role,
        specialty: owner.specialty,
        person_type: owner.person_type,
      },
      allocable_minutes: allocable,
      committed_minutes: 0,
      tentative_minutes: 0,
      usage: 0,
      jobs: [],
    });
  }

  for (const allocation of allocationRows) {
    const bucket = byOwner.get(allocation.owner_id);
    const job = jobsById.get(allocation.job_id);
    if (!bucket || !job) continue;
    if (allocation.status === 'tentative') {
      bucket.tentative_minutes += Number(allocation.planned_minutes || 0);
    } else {
      bucket.committed_minutes += Number(allocation.planned_minutes || 0);
    }
    bucket.jobs.push({
      ...job,
      metadata: {
        ...(job.metadata || {}),
        allocation: {
          id: allocation.id,
          status: allocation.status,
          planned_minutes: Number(allocation.planned_minutes || 0),
          week_start: allocation.week_start,
          starts_at: allocation.starts_at,
          ends_at: allocation.ends_at,
          notes: allocation.notes,
        },
      },
    });
  }

  const owners = Array.from(byOwner.values())
    .map((row) => ({
      ...row,
      usage: row.allocable_minutes ? (row.committed_minutes + row.tentative_minutes) / row.allocable_minutes : 0,
      jobs: row.jobs.sort(sortByOperationalPriority),
    }))
    .sort((a, b) => b.usage - a.usage);

  const unassigned_jobs = jobs
    .filter((job) => !job.owner_id && !isClosedStatus(job.status))
    .sort(sortByOperationalPriority);

  return {
    owners,
    unassigned_jobs,
  };
}

export async function buildCalendarSnapshot(tenantId: string) {
  await syncCalendarItems(tenantId);

  const { rows } = await query<any>(
    `SELECT
       ci.source_type AS calendar_source_type,
       ci.source_id AS calendar_source_id,
       ci.item_type AS calendar_item_type,
       ci.starts_at AS calendar_starts_at,
       ci.ends_at AS calendar_ends_at,
       ci.status AS calendar_item_status,
       ci.priority_band AS calendar_item_priority_band,
       ci.risk_level AS calendar_item_risk_level,
       ci.capacity_minutes AS calendar_capacity_minutes,
       ci.metadata AS calendar_item_metadata,
       j.*,
       c.name AS client_name,
       c.profile->>'logo_url' AS client_logo_url,
       c.profile->'brand_colors'->>0 AS client_brand_color,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
       u.email AS owner_email,
       tu.role AS owner_role,
       fp.specialty AS owner_specialty,
       CASE WHEN fp.id IS NOT NULL THEN 'freelancer' ELSE 'internal' END AS owner_person_type
     FROM calendar_items ci
     JOIN jobs j ON j.id = ci.job_id
     LEFT JOIN clients c ON c.id = ci.client_id
     LEFT JOIN edro_users u ON u.id = ci.owner_id
     LEFT JOIN tenant_users tu ON tu.user_id = ci.owner_id AND tu.tenant_id::text = ci.tenant_id
     LEFT JOIN freelancer_profiles fp ON fp.user_id = ci.owner_id
    WHERE ci.tenant_id = $1
    ORDER BY ci.starts_at ASC, j.priority_score DESC`,
    [tenantId],
  );

  const daysMap = new Map<string, { day: string; jobs: OperationalJob[]; layerSummary: Array<{ key: string; label: string; count: number }> }>();

  for (const row of rows) {
    const calendarStartsAt = row.calendar_starts_at as string;
    const dayKey = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(new Date(calendarStartsAt));

    const job = {
      ...(row as OperationalJob),
      metadata: {
        ...((row.metadata as Record<string, any> | null) || {}),
        calendar_item: {
          source_type: row.calendar_source_type,
          source_id: row.calendar_source_id,
          item_type: row.calendar_item_type,
          layer: agendaLayerFromItemType(row.calendar_item_type),
          starts_at: row.calendar_starts_at,
          ends_at: row.calendar_ends_at,
          status: row.calendar_item_status,
          priority_band: row.calendar_item_priority_band,
          risk_level: row.calendar_item_risk_level,
          capacity_minutes: Number(row.calendar_capacity_minutes || 0),
          ...(row.calendar_item_metadata || {}),
        },
      },
    } as OperationalJob;

    if (!daysMap.has(dayKey)) {
      daysMap.set(dayKey, { day: dayKey, jobs: [], layerSummary: [] });
    }
    daysMap.get(dayKey)!.jobs.push(job);
  }

  for (const entry of daysMap.values()) {
    const summaryMap = new Map<string, number>();
    for (const job of entry.jobs) {
      const key = agendaLayerFromItemType(job.metadata?.calendar_item?.item_type);
      summaryMap.set(key, (summaryMap.get(key) || 0) + 1);
    }
    entry.layerSummary = Array.from(summaryMap.entries()).map(([key, count]) => ({
      key,
      label: calendarItemLabel(key),
      count,
    }));
    entry.jobs.sort((a, b) => {
      const timeA = new Date(String(a.metadata?.calendar_item?.starts_at || a.deadline_at || a.updated_at || a.created_at || Date.now())).getTime();
      const timeB = new Date(String(b.metadata?.calendar_item?.starts_at || b.deadline_at || b.updated_at || b.created_at || Date.now())).getTime();
      return (timeA - timeB) || sortByOperationalPriority(a, b);
    });
  }

  const { rows: meetingRows } = await query<any>(
    `SELECT
       m.id,
       m.client_id,
       c.name AS client_name,
       c.profile->>'logo_url' AS client_logo_url,
       c.profile->'brand_colors'->>0 AS client_brand_color,
       m.title,
       m.platform,
       m.meeting_url,
       m.recorded_at,
       m.duration_secs,
       m.summary,
       m.status,
       COALESCE(NULLIF(u.name, ''), NULLIF(m.created_by, ''), split_part(u.email, '@', 1)) AS created_by_name
     FROM meetings m
     LEFT JOIN clients c ON c.id = m.client_id
     LEFT JOIN edro_users u ON u.id::text = m.created_by
    WHERE m.tenant_id = $1
      AND m.status <> 'archived'
      AND m.recorded_at >= NOW() - INTERVAL '14 days'
      AND m.recorded_at <= NOW() + INTERVAL '60 days'
    ORDER BY m.recorded_at ASC`,
    [tenantId],
  );

  for (const row of meetingRows) {
    const recordedAt = row.recorded_at as string | null;
    if (!recordedAt) continue;

    const dayKey = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    }).format(new Date(recordedAt));

    const meetingStatus = String(row.status || '').toLowerCase();
    const calendarLabel = ['scheduled', 'bot_scheduled', 'joining', 'in_call'].includes(meetingStatus)
      ? 'Reunião agendada'
      : 'Reunião registrada';

    const meetingJob = {
      id: `meeting:${row.id}`,
      client_id: row.client_id,
      client_name: row.client_name,
      client_logo_url: row.client_logo_url,
      client_brand_color: row.client_brand_color,
      title: row.title || 'Reunião',
      summary: row.summary || (row.meeting_url ? `Link: ${row.meeting_url}` : 'Reunião registrada na operação.'),
      job_type: 'meeting',
      complexity: 'm',
      channel: null,
      source: 'meeting',
      status: meetingStatus || 'scheduled',
      priority_score: 12,
      priority_band: 'p2',
      impact_level: 3,
      dependency_level: 2,
      required_skill: 'atendimento',
      owner_id: null,
      owner_name: row.created_by_name || null,
      owner_email: null,
      owner_role: null,
      owner_person_type: null,
      owner_specialty: null,
      deadline_at: recordedAt,
      estimated_minutes: Number(row.duration_secs || 0) > 0 ? Math.max(15, Math.round(Number(row.duration_secs) / 60)) : 60,
      actual_minutes: null,
      blocked_minutes: 0,
      queue_minutes: 0,
      is_urgent: false,
      urgency_reason: null,
      definition_of_done: 'Reunião realizada e registrada na operação.',
      metadata: {
        calendar_item: {
          source_type: 'meeting',
          source_id: row.id,
          item_type: 'meeting_window',
          layer: 'meetings',
          label: calendarLabel,
          starts_at: recordedAt,
          ends_at: recordedAt,
          status: meetingStatus || 'scheduled',
          priority_band: 'p2',
          risk_level: 'low',
          capacity_minutes: 0,
          meeting_id: row.id,
          meeting_url: row.meeting_url,
          platform: row.platform,
          standalone: true,
        },
      },
      created_at: recordedAt,
      updated_at: recordedAt,
    } as OperationalJob;

    if (!daysMap.has(dayKey)) {
      daysMap.set(dayKey, { day: dayKey, jobs: [], layerSummary: [] });
    }
    daysMap.get(dayKey)!.jobs.push(meetingJob);
  }

  for (const entry of daysMap.values()) {
    const summaryMap = new Map<string, number>();
    for (const job of entry.jobs) {
      const key = agendaLayerFromItemType(job.metadata?.calendar_item?.item_type);
      summaryMap.set(key, (summaryMap.get(key) || 0) + 1);
    }
    entry.layerSummary = Array.from(summaryMap.entries()).map(([key, count]) => ({
      key,
      label: calendarItemLabel(key),
      count,
    }));
    entry.jobs.sort((a, b) => {
      const timeA = new Date(String(a.metadata?.calendar_item?.starts_at || a.deadline_at || a.updated_at || a.created_at || Date.now())).getTime();
      const timeB = new Date(String(b.metadata?.calendar_item?.starts_at || b.deadline_at || b.updated_at || b.created_at || Date.now())).getTime();
      return (timeA - timeB) || sortByOperationalPriority(a, b);
    });
  }

  return {
    days: Array.from(daysMap.values()),
  };
}

export async function buildRiskSnapshot(tenantId: string) {
  await syncRiskSignals(tenantId);

  const { rows } = await query<any>(
    `SELECT
       rs.risk_score AS signal_risk_score,
       rs.risk_band AS signal_risk_band,
       rs.summary AS signal_summary,
       rs.suggested_action AS signal_suggested_action,
       rs.metadata AS signal_metadata,
       j.*,
       c.name AS client_name,
       c.profile->>'logo_url' AS client_logo_url,
       c.profile->'brand_colors'->>0 AS client_brand_color,
       COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
       u.email AS owner_email,
       tu.role AS owner_role,
       fp.specialty AS owner_specialty,
       CASE WHEN fp.id IS NOT NULL THEN 'freelancer' ELSE 'internal' END AS owner_person_type,
       ja.status AS allocation_status,
       ja.planned_minutes AS allocation_planned_minutes,
       ja.starts_at AS allocation_starts_at,
       ja.ends_at AS allocation_ends_at,
       ja.notes AS allocation_notes
     FROM risk_signals rs
     JOIN jobs j ON j.id = rs.job_id
     LEFT JOIN clients c ON c.id = rs.client_id
     LEFT JOIN edro_users u ON u.id = rs.owner_id
     LEFT JOIN tenant_users tu ON tu.user_id = rs.owner_id AND tu.tenant_id::text = rs.tenant_id
     LEFT JOIN freelancer_profiles fp ON fp.user_id = rs.owner_id
     LEFT JOIN job_allocations ja
       ON ja.job_id = j.id
      AND ja.tenant_id = rs.tenant_id
      AND ja.allocation_kind = 'primary'
      AND ja.status IN ('tentative', 'committed', 'blocked')
    WHERE rs.tenant_id = $1
      AND rs.resolved_at IS NULL
    ORDER BY rs.risk_score DESC, j.deadline_at ASC NULLS LAST`,
    [tenantId],
  );

  const critical: OperationalJob[] = [];
  const high: OperationalJob[] = [];
  const clientMap = new Map<string, {
    clientId: string;
    clientName: string;
    clientLogoUrl?: string | null;
    clientBrandColor?: string | null;
    total: number;
    critical: number;
    open: number;
  }>();

  for (const row of rows) {
    const job = {
      ...(row as OperationalJob),
      metadata: {
        ...((row.metadata as Record<string, any> | null) || {}),
        allocation: row.allocation_status ? {
          status: row.allocation_status,
          planned_minutes: Number(row.allocation_planned_minutes || 0),
          starts_at: row.allocation_starts_at,
          ends_at: row.allocation_ends_at,
          notes: row.allocation_notes,
        } : undefined,
        risk_signal: {
          score: Number(row.signal_risk_score || 0),
          band: row.signal_risk_band,
          summary: row.signal_summary,
          suggested_action: row.signal_suggested_action,
          ...(row.signal_metadata || {}),
        },
      },
    } as OperationalJob;
    const riskBand = String(row.signal_risk_band || '').toLowerCase();
    if (riskBand === 'critical') critical.push(job);
    else if (riskBand === 'high' || riskBand === 'medium') high.push(job);

    if (job.client_id) {
      const current = clientMap.get(job.client_id) || {
        clientId: job.client_id,
        clientName: job.client_name || 'Sem nome',
        clientLogoUrl: job.client_logo_url || null,
        clientBrandColor: job.client_brand_color || null,
        total: 0,
        critical: 0,
        open: 0,
      };
      current.total += Number(job.estimated_minutes || 0);
      current.open += 1;
      if (riskBand === 'critical') current.critical += 1;
      clientMap.set(job.client_id, current);
    }
  }

  const { rows: meetingRows } = await query<any>(
    `SELECT
       m.id,
       m.client_id,
       c.name AS client_name,
       c.profile->>'logo_url' AS client_logo_url,
       c.profile->'brand_colors'->>0 AS client_brand_color,
       m.title,
       m.platform,
       m.meeting_url,
       m.recorded_at,
       m.duration_secs,
       m.summary,
       m.status,
       COALESCE(NULLIF(u.name, ''), NULLIF(m.created_by, ''), split_part(u.email, '@', 1)) AS created_by_name
     FROM meetings m
     LEFT JOIN clients c ON c.id = m.client_id
     LEFT JOIN edro_users u ON u.id::text = m.created_by
    WHERE m.tenant_id = $1
      AND m.status <> 'archived'
      AND m.recorded_at >= NOW() - INTERVAL '14 days'
      AND m.recorded_at <= NOW() + INTERVAL '14 days'
    ORDER BY m.recorded_at ASC`,
    [tenantId],
  );

  for (const row of meetingRows) {
    const meetingRisk = getNativeMeetingRisk(row);
    if (!meetingRisk) continue;

    const meetingJob = buildNativeMeetingJob(row, {
      risk: meetingRisk.risk,
      riskSummary: meetingRisk.summary,
      riskAction: meetingRisk.action,
    });

    if (meetingRisk.risk.level === 'critical') critical.push(meetingJob);
    else high.push(meetingJob);

    if (meetingJob.client_id) {
      const current = clientMap.get(meetingJob.client_id) || {
        clientId: meetingJob.client_id,
        clientName: meetingJob.client_name || 'Sem nome',
        clientLogoUrl: meetingJob.client_logo_url || null,
        clientBrandColor: meetingJob.client_brand_color || null,
        total: 0,
        critical: 0,
        open: 0,
      };
      current.total += Number(meetingJob.estimated_minutes || 0);
      current.open += 1;
      if (meetingRisk.risk.level === 'critical') current.critical += 1;
      clientMap.set(meetingJob.client_id, current);
    }
  }

  return {
    critical: critical.sort(sortByOperationalPriority),
    high: high.sort(sortByOperationalPriority),
    client_risk: Array.from(clientMap.values()).sort((a, b) => (b.critical - a.critical) || (b.total - a.total)),
  };
}

export async function buildOverviewSnapshot(tenantId: string) {
  const [jobs, checkpointRes, approvalRes] = await Promise.all([
    fetchOperationalJobs(tenantId),
    query<any>(
      `SELECT
         ci.source_type AS calendar_source_type,
         ci.source_id AS calendar_source_id,
         ci.item_type AS calendar_item_type,
         ci.starts_at AS calendar_starts_at,
         ci.ends_at AS calendar_ends_at,
         ci.status AS calendar_item_status,
         ci.priority_band AS calendar_item_priority_band,
         ci.risk_level AS calendar_item_risk_level,
         ci.capacity_minutes AS calendar_capacity_minutes,
         ci.metadata AS calendar_item_metadata,
         j.*,
         c.name AS client_name,
         c.profile->>'logo_url' AS client_logo_url,
         c.profile->'brand_colors'->>0 AS client_brand_color,
         COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
         u.email AS owner_email,
         tu.role AS owner_role,
         fp.specialty AS owner_specialty,
         CASE WHEN fp.id IS NOT NULL THEN 'freelancer' ELSE 'internal' END AS owner_person_type
       FROM calendar_items ci
       JOIN jobs j ON j.id = ci.job_id
       LEFT JOIN clients c ON c.id = ci.client_id
       LEFT JOIN edro_users u ON u.id = ci.owner_id
       LEFT JOIN tenant_users tu ON tu.user_id = ci.owner_id AND tu.tenant_id::text = ci.tenant_id
       LEFT JOIN freelancer_profiles fp ON fp.user_id = ci.owner_id
      WHERE ci.tenant_id = $1
        AND ci.source_type = 'checkpoint'
        AND ci.status = 'active'
      ORDER BY ci.starts_at ASC, j.priority_score DESC
      LIMIT 6`,
      [tenantId],
    ),
    query<any>(
      `SELECT
         j.*,
         c.name AS client_name,
         c.profile->>'logo_url' AS client_logo_url,
         c.profile->'brand_colors'->>0 AS client_brand_color,
         COALESCE(NULLIF(u.name, ''), split_part(u.email, '@', 1)) AS owner_name,
         u.email AS owner_email,
         tu.role AS owner_role,
         fp.specialty AS owner_specialty,
         CASE WHEN fp.id IS NOT NULL THEN 'freelancer' ELSE 'internal' END AS owner_person_type
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       LEFT JOIN edro_users u ON u.id::text = j.owner_id
       LEFT JOIN tenant_users tu ON tu.user_id::text = j.owner_id AND tu.tenant_id::text = j.tenant_id
       LEFT JOIN freelancer_profiles fp ON fp.user_id::text = j.owner_id
      WHERE j.tenant_id = $1
        AND j.source = 'approval'
        AND j.status IN ('awaiting_approval', 'blocked')
      ORDER BY
        CASE WHEN j.status = 'blocked' THEN 0 ELSE 1 END,
        j.deadline_at ASC NULLS LAST,
        j.priority_score DESC
      LIMIT 6`,
      [tenantId],
    ),
  ]);

  const checkpoints = checkpointRes.rows.map((row) => ({
    ...(row as OperationalJob),
    metadata: {
      ...((row.metadata as Record<string, any> | null) || {}),
      calendar_item: {
        source_type: row.calendar_source_type,
        source_id: row.calendar_source_id,
        item_type: row.calendar_item_type,
        layer: agendaLayerFromItemType(row.calendar_item_type),
        starts_at: row.calendar_starts_at,
        ends_at: row.calendar_ends_at,
        status: row.calendar_item_status,
        priority_band: row.calendar_item_priority_band,
        risk_level: row.calendar_item_risk_level,
        capacity_minutes: Number(row.calendar_capacity_minutes || 0),
        ...(row.calendar_item_metadata || {}),
      },
    },
  })) as OperationalJob[];

  const approvals = approvalRes.rows as OperationalJob[];
  const pendingApprovals = approvals.filter((job) => job.status === 'awaiting_approval');
  const blockedApprovals = approvals.filter((job) => job.status === 'blocked');
  const nearDeadlineJobs = jobs.filter((job) => {
    if (!job.deadline_at || isClosedStatus(job.status)) return false;
    const diffHours = (new Date(job.deadline_at).getTime() - Date.now()) / 3600000;
    return Number.isFinite(diffHours) && diffHours <= 24;
  }).sort(sortByOperationalPriority);

  return {
    checkpoints,
    approvals,
    summary: {
      checkpoints_total: checkpoints.length,
      approvals_pending_total: pendingApprovals.length,
      approvals_blocked_total: blockedApprovals.length,
      near_deadline_total: nearDeadlineJobs.length,
    },
  };
}

export async function rebuildOperationalRuntime(tenantId: string) {
  const [allocations, calendar, risks] = await Promise.all([
    syncAllocations(tenantId),
    syncCalendarItems(tenantId),
    syncRiskSignals(tenantId),
  ]);

  return { allocations, calendar, risks };
}
