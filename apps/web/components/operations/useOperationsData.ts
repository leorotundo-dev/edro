'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
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
      // Use Trello as the data source for the Operations Center
      const feed = await apiGet<{ jobs: OperationsJob[]; owners: any[]; clients: any[]; sync_health?: SyncHealth }>('/trello/ops-feed');
      setJobs(feed?.jobs ?? []);
      setLookups({
        jobTypes: [],
        skills: [],
        channels: [],
        clients: feed?.clients ?? [],
        owners: feed?.owners ?? [],
      });
      if (feed?.sync_health) setSyncHealth(feed.sync_health);
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar dados do Trello.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load({ sync: true });
  }, [load]);

  const createJob = useCallback(async (payload: Record<string, any>): Promise<OperationsJob> => {
    const response = await apiPost<{ data: OperationsJob }>('/jobs', { ...payload, source: payload.source || 'manual' });
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
    // For other fields, optimistically update local state only
    setJobs((current) => current.map((j) => j.id === jobId ? { ...j, ...payload } : j));
    return null;
  }, [changeStatus]);

  const fetchJob = useCallback(async (jobId: string) => {
    // Return from local state (already loaded from Trello feed)
    const found = jobs.find((j) => j.id === jobId);
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
