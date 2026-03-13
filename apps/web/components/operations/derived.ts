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

export type GroupedSection = {
  key: string;
  label: string;
  color?: string;
  count: number;
  jobs: OperationsJob[];
};

export function groupJobsByClient(jobs: OperationsJob[]): GroupedSection[] {
  const map = new Map<string, { label: string; color?: string; jobs: OperationsJob[] }>();
  jobs.forEach((job) => {
    const key = job.client_id || '__none__';
    const entry = map.get(key) || { label: job.client_name || 'Sem cliente', color: job.client_brand_color || undefined, jobs: [] };
    entry.jobs.push(job);
    map.set(key, entry);
  });
  return Array.from(map.entries())
    .map(([key, val]) => ({ key, label: val.label, color: val.color, count: val.jobs.length, jobs: val.jobs }))
    .sort((a, b) => b.count - a.count);
}

export function groupJobsByOwner(jobs: OperationsJob[]): GroupedSection[] {
  const map = new Map<string, { label: string; jobs: OperationsJob[] }>();
  jobs.forEach((job) => {
    const key = job.owner_id || '__none__';
    const entry = map.get(key) || { label: job.owner_name || 'Sem responsável', jobs: [] };
    entry.jobs.push(job);
    map.set(key, entry);
  });
  return Array.from(map.entries())
    .map(([key, val]) => ({ key, label: val.label, count: val.jobs.length, jobs: val.jobs }))
    .sort((a, b) => b.count - a.count);
}

export function groupJobsByRisk(jobs: OperationsJob[]): GroupedSection[] {
  const bands: Array<{ level: string; label: string; color: string }> = [
    { level: 'critical', label: 'Crítico', color: '#FA896B' },
    { level: 'high', label: 'Alto', color: '#FFAE1F' },
    { level: 'medium', label: 'Médio', color: '#5D87FF' },
    { level: 'low', label: 'Controlado', color: '#13DEB9' },
  ];
  return bands
    .map((band) => {
      const matched = jobs.filter((j) => getRisk(j).level === band.level);
      return { key: band.level, label: band.label, color: band.color, count: matched.length, jobs: matched };
    })
    .filter((s) => s.count > 0);
}

/** Jobs that are critical risk OR P0 without an owner. Max 6 returned. */
export function criticalAlerts(jobs: OperationsJob[]): OperationsJob[] {
  return jobs
    .filter((j) => !isClosedStatus(j.status))
    .filter((j) => getRisk(j).level === 'critical' || (j.priority_band === 'p0' && !j.owner_id))
    .sort((a, b) => getRisk(b).score - getRisk(a).score)
    .slice(0, 6);
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
