'use client';

import { getRisk, type OperationsJob, type OperationsOwner } from './model';

export function isClosedStatus(status?: string | null) {
  return status === 'done' || status === 'archived';
}

export function isCommittedStatus(status?: string | null) {
  return ['allocated', 'in_progress', 'in_review', 'awaiting_approval', 'approved', 'scheduled', 'published'].includes(status || '');
}

export function isTentativeStatus(status?: string | null) {
  return ['intake', 'planned', 'ready'].includes(status || '');
}

export function ownerAllocableMinutes(owner?: OperationsOwner | null) {
  if (!owner) return 0;
  if (owner.person_type === 'freelancer') return 16 * 60;
  if (owner.role === 'admin' || owner.role === 'manager') return 22 * 60;
  return 28 * 60;
}

export function ownerCommittedMinutes(jobs: OperationsJob[], ownerId?: string | null) {
  return jobs
    .filter((job) => job.owner_id === ownerId && !isClosedStatus(job.status) && isCommittedStatus(job.status))
    .reduce((sum, job) => sum + Number(job.estimated_minutes || 0), 0);
}

export function ownerTentativeMinutes(jobs: OperationsJob[], ownerId?: string | null) {
  return jobs
    .filter((job) => job.owner_id === ownerId && !isClosedStatus(job.status) && isTentativeStatus(job.status))
    .reduce((sum, job) => sum + Number(job.estimated_minutes || 0), 0);
}

export function ownerActiveJobs(jobs: OperationsJob[], ownerId?: string | null) {
  return jobs.filter((job) => job.owner_id === ownerId && !isClosedStatus(job.status));
}

export function jobsForToday(jobs: OperationsJob[]) {
  const today = new Date();
  return jobs.filter((job) => {
    if (!job.deadline_at || isClosedStatus(job.status)) return false;
    const date = new Date(job.deadline_at);
    return date.getFullYear() === today.getFullYear()
      && date.getMonth() === today.getMonth()
      && date.getDate() === today.getDate();
  });
}

export function jobsByAttentionClient(jobs: OperationsJob[]) {
  const map = new Map<string, {
    clientId: string;
    clientName: string;
    clientLogoUrl?: string | null;
    clientBrandColor?: string | null;
    total: number;
    critical: number;
    open: number;
  }>();
  jobs.forEach((job) => {
    if (!job.client_id || isClosedStatus(job.status)) return;
    const entry = map.get(job.client_id) || {
      clientId: job.client_id,
      clientName: job.client_name || 'Sem nome',
      clientLogoUrl: job.client_logo_url || null,
      clientBrandColor: job.client_brand_color || null,
      total: 0,
      critical: 0,
      open: 0,
    };
    entry.total += Number(job.estimated_minutes || 0);
    entry.open += 1;
    if (['critical', 'high'].includes(getRisk(job).level)) {
      entry.critical += 1;
    }
    map.set(job.client_id, entry);
  });
  return Array.from(map.values()).sort((a, b) => (b.critical - a.critical) || (b.total - a.total));
}

export function sortByOperationalPriority(a: OperationsJob, b: OperationsJob) {
  const priorityRank = { p0: 0, p1: 1, p2: 2, p3: 3, p4: 4 } as const;
  const riskRank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  const riskA = riskRank[getRisk(a).level as keyof typeof riskRank] ?? 4;
  const riskB = riskRank[getRisk(b).level as keyof typeof riskRank] ?? 4;
  const prioA = priorityRank[a.priority_band] ?? 4;
  const prioB = priorityRank[b.priority_band] ?? 4;
  const timeA = a.deadline_at ? new Date(a.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;
  const timeB = b.deadline_at ? new Date(b.deadline_at).getTime() : Number.MAX_SAFE_INTEGER;

  return (riskA - riskB) || (prioA - prioB) || (timeA - timeB);
}

export function agendaLayer(job: OperationsJob) {
  const calendarItemType = String(job.metadata?.calendar_item?.item_type || '').toLowerCase();
  if (calendarItemType === 'meeting_window') return 'meetings';
  if (calendarItemType === 'publication_window') return 'publications';
  if (calendarItemType === 'approval_window') return 'approvals';
  if (calendarItemType === 'planning_checkpoint') return 'production';
  if (calendarItemType === 'production_window') return 'production';
  if (calendarItemType === 'risk_window') return 'risks';
  if (calendarItemType === 'deadline_window') return 'deadlines';
  if (calendarItemType === 'meetings') return 'meetings';
  if (calendarItemType === 'publications') return 'publications';
  if (calendarItemType === 'approvals') return 'approvals';
  if (calendarItemType === 'production' || calendarItemType === 'production_block') return 'production';
  if (calendarItemType === 'risks') return 'risks';
  if (calendarItemType === 'deadlines') return 'deadlines';
  if (job.job_type === 'meeting') return 'meetings';
  if (job.job_type === 'publication' || job.status === 'scheduled' || job.status === 'published') return 'publications';
  if (job.status === 'awaiting_approval' || job.job_type === 'approval') return 'approvals';
  if (['allocated', 'in_progress', 'in_review'].includes(job.status)) return 'production';
  if (['critical', 'high'].includes(getRisk(job).level)) return 'risks';
  return 'deadlines';
}
