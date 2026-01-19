'use client';

import { useEffect, useState } from 'react';
import { Card, Badge } from '@edro/ui';
import { api } from '@/lib/api';
import { ProgressBar } from '@/components/ProgressBar';

const POLL_DELAY_MS = 8000;

type JobStatus = 'pending' | 'running' | 'completed' | 'failed';

type JobProgressProps = {
  jobId: string | number | null;
  title?: string;
  description?: string;
  className?: string;
};

const statusConfig: Record<JobStatus, { label: string; variant: 'warning' | 'success' | 'danger' }> = {
  pending: { label: 'Na fila', variant: 'warning' },
  running: { label: 'Em andamento', variant: 'warning' },
  completed: { label: 'Concluido', variant: 'success' },
  failed: { label: 'Falhou', variant: 'danger' },
};

export function JobProgress({ jobId, title, description, className = '' }: JobProgressProps) {
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      let jobData: any = null;
      try {
        const response = await api.getJobStatus(String(jobId));
        jobData = response?.data ?? response;
        if (!active || !jobData) return;
        setStatus(jobData.status ?? null);
        setError(jobData.error ?? null);
        const result = jobData.result ?? null;
        if (result && typeof result === 'object') {
          setProgress(typeof result.progress === 'number' ? result.progress : null);
          setStep(typeof result.step === 'string' ? result.step : null);
        } else {
          setProgress(null);
          setStep(null);
        }
      } catch {
        if (!active) return;
      }

      if (!active) return;
      if (jobData?.status === 'completed' || jobData?.status === 'failed') return;
      timer = setTimeout(poll, POLL_DELAY_MS);
    };

    void poll();

    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [jobId]);

  if (!jobId) return null;

  const config = status ? statusConfig[status] : null;
  const showProgress = typeof progress === 'number' && Number.isFinite(progress);

  return (
    <Card className={`p-4 space-y-2 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-main">{title || 'Processamento'}</p>
          {description ? <p className="text-xs text-text-muted">{description}</p> : null}
        </div>
        {config ? (
          <Badge variant={config.variant} size="sm">
            {config.label}
          </Badge>
        ) : null}
      </div>
      {step ? <p className="text-xs text-text-muted">{step}</p> : null}
      {showProgress ? (
        <ProgressBar value={progress ?? 0} size="sm" showPercentage />
      ) : (
        <div className="h-2 w-full rounded-full bg-secondary-lilac/50 overflow-hidden">
          <div className="h-2 w-1/3 bg-primary-500 animate-pulse" />
        </div>
      )}
      {error ? <p className="text-xs text-red-600">Falha: {error}</p> : null}
      <p className="text-[11px] text-text-muted">Job: {jobId}</p>
    </Card>
  );
}
