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

export function useOperationsData(query = '?active=true') {
  const [jobs, setJobs] = useState<OperationsJob[]>([]);
  const [lookups, setLookups] = useState<OperationsLookups>(EMPTY_LOOKUPS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);

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
    try {
      await apiPost('/jobs/sync-sources', {});
    } catch {
      // Read-only profiles may not be allowed to trigger sync; keep the UI usable.
    }
  }, []);

  const load = useCallback(async (options?: { sync?: boolean }) => {
    setLoading(true);
    setError('');
    try {
      if (options?.sync !== false) {
        await syncSources();
      }
      const [lookupsRes, jobsRes] = await Promise.all([
        apiGet<LookupResponse>('/jobs/lookups'),
        apiGet<any>(`/jobs${query}`),
      ]);
      setLookups({
        jobTypes: lookupsRes?.jobTypes ?? [],
        skills: lookupsRes?.skills ?? [],
        channels: lookupsRes?.channels ?? [],
        clients: lookupsRes?.clients ?? [],
        owners: lookupsRes?.owners ?? [],
      });
      setJobs(normalizeJobsResponse(jobsRes));
    } catch (err: any) {
      setError(err?.message || 'Falha ao carregar a Central de Operações.');
    } finally {
      setLoading(false);
    }
  }, [query, syncSources]);

  useEffect(() => {
    load({ sync: true });
  }, [load]);

  const createJob = useCallback(async (payload: Record<string, any>) => {
    const response = await apiPost<{ data: OperationsJob }>('/jobs', payload);
    if (response?.data) {
      setJobs((current) => upsertJob(current, response.data));
      return response.data;
    }
    throw new Error('Falha ao criar demanda.');
  }, []);

  const updateJob = useCallback(async (jobId: string, payload: Record<string, any>) => {
    const response = await apiPatch<{ data: OperationsJob }>(`/jobs/${jobId}`, payload);
    if (response?.data) {
      setJobs((current) => upsertJob(current, response.data));
      return response.data;
    }
    throw new Error('Falha ao atualizar demanda.');
  }, []);

  const changeStatus = useCallback(async (jobId: string, status: string, reason?: string | null) => {
    const response = await apiPost<{ data: OperationsJob }>(`/jobs/${jobId}/status`, { status, reason });
    if (response?.data) {
      setJobs((current) => upsertJob(current, response.data));
      return response.data;
    }
    throw new Error('Falha ao atualizar status.');
  }, []);

  const fetchJob = useCallback(async (jobId: string) => {
    const response = await apiGet<{ data: OperationsJob }>(`/jobs/${jobId}`);
    if (response?.data) {
      setJobs((current) => upsertJob(current, response.data));
      return response.data;
    }
    throw new Error('Job não encontrado.');
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
    refresh: () => load({ sync: true }),
    syncSources,
    currentUser,
    currentUserId: currentUser?.id || currentUser?.sub || null,
    createJob,
    updateJob,
    changeStatus,
    fetchJob,
    setJobs,
  };
}
