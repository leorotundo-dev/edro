'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPatch, apiPost } from '@/lib/api';
import type { OperationsClientLookup, OperationsJob, OperationsLookup, OperationsOwner } from './model';

type LookupResponse = {
  jobTypes?: OperationsLookup[];
  skills?: OperationsLookup[];
  channels?: OperationsLookup[];
  clients?: OperationsClientLookup[];
  owners?: OperationsOwner[];
};

type SessionUser = {
  id?: string;
  sub?: string;
  name?: string;
  email?: string;
};

export type OperationsLookups = {
  jobTypes: OperationsLookup[];
  skills: OperationsLookup[];
  channels: OperationsLookup[];
  clients: OperationsClientLookup[];
  owners: OperationsOwner[];
};

const EMPTY_LOOKUPS: OperationsLookups = {
  jobTypes: [],
  skills: [],
  channels: [],
  clients: [],
  owners: [],
};

function normalizeJobsResponse(payload: any): OperationsJob[] {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.jobs)) return payload.jobs;
  return [];
}

function upsertJob(list: OperationsJob[], job: OperationsJob) {
  const next = list.some((item) => item.id === job.id)
    ? list.map((item) => (item.id === job.id ? { ...item, ...job } : item))
    : [job, ...list];
  return next;
}

function normalizeDeadlineForTrello(value?: string | null) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

export type SyncHealth = {
  stale_boards: number;
  unlinked_boards: number;
  unmapped_lists: number;
  oldest_sync_hours: number | null;
  needs_attention: boolean;
};

export function useOperationsData(query = '?active=true') {
  const [jobs, setJobs] = useState<OperationsJob[]>([]);
  const [lookups, setLookups] = useState<OperationsLookups>(EMPTY_LOOKUPS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [syncHealth, setSyncHealth] = useState<SyncHealth | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem('edro_user');
    if (!raw) return;
    try {
      setCurrentUser(JSON.parse(raw));
    } catch {
      setCurrentUser(null);
    }
  }, []);

  const syncSources = useCallback(async () => {
    // No-op in Trello mode — data is always fresh from the DB
  }, []);

  const load = useCallback(async (_options?: { sync?: boolean }) => {
    setLoading(true);
    setError('');
    try {
      // Fetch jobs feed + static lookups in parallel
      const [feed, staticLookups] = await Promise.all([
        apiGet<{ jobs: OperationsJob[]; owners: any[]; clients: any[]; sync_health?: SyncHealth }>(`/trello/ops-feed${query}`),
        apiGet<{ jobTypes: OperationsLookup[]; skills: OperationsLookup[]; channels: OperationsLookup[] }>('/jobs/lookups').catch(() => null),
      ]);
      const nextJobs = feed?.jobs ?? [];
      setJobs(nextJobs);
      setLookups({
        jobTypes: staticLookups?.jobTypes ?? [],
        skills: staticLookups?.skills ?? [],
        channels: staticLookups?.channels ?? [],
        clients: feed?.clients ?? [],
        owners: feed?.owners ?? [],
      });
      if (feed?.sync_health) setSyncHealth(feed.sync_health);
      return nextJobs;
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar dados do Trello.');
      return [] as OperationsJob[];
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    load({ sync: true });
  }, [load]);

  const createJob = useCallback(async (payload: Record<string, any>): Promise<OperationsJob> => {
    const response = await apiPost<{ data: OperationsJob }>('/trello/ops-cards', { ...payload, source: payload.source || 'manual' });
    if (!response?.data) throw new Error('Erro ao criar job.');
    setJobs((current) => [response.data!, ...current]);
    return response.data!;
  }, []);

  const changeStatus = useCallback(async (jobId: string, status: string, _reason?: string | null) => {
    const response = await apiPost<{ ok: boolean; data?: OperationsJob }>(`/trello/ops-cards/${jobId}/status`, { status });
    if (response?.data) {
      setJobs((current) => upsertJob(current, response.data!));
      return response.data;
    }
    // Reload to reflect the change
    await load();
    return null;
  }, [load]);

  const updateJob = useCallback(async (jobId: string, payload: Record<string, any>) => {
    // Partial update: if there's a status change, route to Trello
    if (payload.status) {
      return changeStatus(jobId, payload.status);
    }

    const currentJob = jobs.find((job) => job.id === jobId);
    if (currentJob?.source === 'trello') {
      const response = await apiPatch<{ data?: OperationsJob }>(`/trello/ops-cards/${jobId}`, {
        title: payload.title,
        summary: payload.summary,
        deadline_at: payload.deadline_at !== undefined ? normalizeDeadlineForTrello(payload.deadline_at) : undefined,
        owner_id: payload.owner_id,
      });
      if (response?.data) {
        setJobs((current) => upsertJob(current, response.data!));
        return response.data;
      }
      const nextJobs = await load();
      return nextJobs.find((job) => job.id === jobId) ?? null;
    }

    const response = await apiPatch<{ data?: OperationsJob }>(`/jobs/${jobId}`, payload);
    if (response?.data) {
      setJobs((current) => upsertJob(current, response.data!));
      return response.data;
    }
    const nextJobs = await load();
    return nextJobs.find((job) => job.id === jobId) ?? null;
  }, [changeStatus, jobs, load, lookups.owners]);

  const fetchJob = useCallback(async (jobId: string) => {
    const found = jobs.find((j) => j.id === jobId);
    if (found?.source === 'trello') {
      const response = await apiGet<{ data?: OperationsJob }>(`/trello/ops-cards/${jobId}`);
      if (response?.data) {
        setJobs((current) => upsertJob(current, response.data!));
        return response.data;
      }
    }
    if (found) return found;
    throw new Error('Card não encontrado.');
  }, [jobs]);

  const deleteJob = useCallback(async (_jobId: string) => {
    // Deletion not available in Trello mode — archive via kanban
    throw new Error('Arquivar cards via Central de Operações não disponível no modo Trello.');
  }, []);

  const jobsById = useMemo(
    () => jobs.reduce<Record<string, OperationsJob>>((acc, item) => {
      acc[item.id] = item;
      return acc;
    }, {}),
    [jobs]
  );

  return {
    jobs,
    jobsById,
    lookups,
    loading,
    error,
    syncHealth,
    refresh: () => load({ sync: true }),
    syncSources,
    currentUser,
    currentUserId: currentUser?.id || currentUser?.sub || null,
    createJob,
    updateJob,
    changeStatus,
    fetchJob,
    deleteJob,
    setJobs,
  };
}
