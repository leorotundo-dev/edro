'use client';

import { use, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { swrFetcher, apiPost, getApiBaseUrl } from '@/lib/api';
import clsx from 'clsx';

type OpsJob = {
  id: string;
  title: string;
  status: string;
  deadline_at: string | null;
  notes: string | null;
  priority_band: string | null;
  estimated_minutes: number | null;
  client_name: string | null;
  job_type_name: string | null;
  source: 'ops_job';
};

type Briefing = {
  id: string;
  title: string;
  status: string;
  due_at: string | null;
  payload: Record<string, any> | null;
  client_name: string | null;
  copy_approved_at: string | null;
  copy_approval_comment: string | null;
  source: 'briefing';
};

type JobDetail = OpsJob | Briefing;

type Profile = {
  id: string;
  display_name: string;
  active_timers?: { briefing_id: string; briefing_title?: string; started_at: string }[];
};

const OPS_STATUS_LABELS: Record<string, string> = {
  intake: 'Entrada',
  planned: 'Planejado',
  ready: 'Pronto para iniciar',
  allocated: 'Alocado',
  in_progress: 'Em produção',
  in_review: 'Em revisão',
  awaiting_approval: 'Aguardando aprovação',
  approved: 'Aprovado',
  blocked: 'Bloqueado',
  published: 'Publicado',
  done: 'Concluído',
};

const BRIEFING_STATUS_LABELS: Record<string, string> = {
  briefing: 'Briefing',
  iclips_in: 'iClips entrada',
  alinhamento: 'Alinhamento',
  copy_ia: 'Copy IA',
  aprovacao: 'Aprovação',
  producao: 'Produção',
  revisao: 'Revisão',
  iclips_out: 'iClips saída',
  done: 'Concluído',
};

const PRIORITY_LABELS: Record<string, string> = {
  p0: 'Crítico',
  p1: 'Alto',
  p2: 'Normal',
  p3: 'Baixo',
};

function useElapsed(startedAt: string | null) {
  const [secs, setSecs] = useState(
    startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0,
  );

  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setSecs((v) => v + 1), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  if (!startedAt) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

// ── Ops job timer (client-side only, logs via job_time_entries on stop) ──────

const TIMER_KEY = (jobId: string) => `ops_timer_${jobId}`;

function getOpsTimerStart(jobId: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TIMER_KEY(jobId));
}

function setOpsTimerStart(jobId: string, iso: string) {
  localStorage.setItem(TIMER_KEY(jobId), iso);
}

function clearOpsTimer(jobId: string) {
  localStorage.removeItem(TIMER_KEY(jobId));
}

function OpsTimerSection({ jobId }: { jobId: string }) {
  const [startedAt, setStartedAt] = useState<string | null>(() => getOpsTimerStart(jobId));
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [showStop, setShowStop] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const elapsed = useElapsed(startedAt);

  const handleStart = () => {
    const now = new Date().toISOString();
    setOpsTimerStart(jobId, now);
    setStartedAt(now);
  };

  const handleStop = async () => {
    if (!startedAt) return;
    setLoading(true);
    setError('');
    const startDate = new Date(startedAt);
    const endDate = new Date();
    const minutes = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 60000));
    try {
      const base = getApiBaseUrl();
      const token = localStorage.getItem('fl_token') ?? '';
      const res = await fetch(`${base}/api/jobs/${jobId}/time-entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ minutes, notes: description.trim() || null }),
      });
      if (!res.ok) throw new Error(await res.text());
      clearOpsTimer(jobId);
      setStartedAt(null);
      setShowStop(false);
      setDescription('');
      setSaved(true);
      setTimeout(() => setSaved(false), 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar tempo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="portal-card">
      <div className="portal-section-head">
        <div>
          <h3 className="portal-section-title">Registro de tempo</h3>
          <p className="portal-card-subtitle">
            Inicie o cronômetro ao começar e pare quando concluir.
          </p>
        </div>
        {startedAt && (
          <span className="portal-pill portal-pill-success">Em execução</span>
        )}
      </div>

      {saved && (
        <div className="portal-alert portal-alert-success" style={{ marginBottom: 16 }}>
          Tempo registrado com sucesso.
        </div>
      )}
      {error && (
        <div className="portal-alert portal-alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {startedAt ? (
        <div className="portal-page" style={{ gap: 16 }}>
          <div className="portal-stat-card">
            <div className="portal-stat-label">Tempo em execução</div>
            <div className="portal-stat-value">{elapsed}</div>
          </div>
          {!showStop ? (
            <button onClick={() => setShowStop(true)} className="portal-button-danger">
              Parar timer
            </button>
          ) : (
            <div className="portal-page" style={{ gap: 16 }}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="O que foi executado? (opcional)"
                rows={2}
                className="portal-textarea"
              />
              <div className="portal-inline-stack">
                <button onClick={() => setShowStop(false)} className="portal-button-ghost">
                  Cancelar
                </button>
                <button onClick={handleStop} disabled={loading} className="portal-button-danger">
                  {loading ? 'Salvando...' : 'Confirmar parada'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="portal-page" style={{ gap: 16 }}>
          <div className="portal-note">
            Nenhum timer ativo. Inicie ao começar a execução.
          </div>
          <button onClick={handleStart} className="portal-button">
            Iniciar timer
          </button>
        </div>
      )}
    </section>
  );
}

// ── Briefing timer section ────────────────────────────────────────────────────

function BriefingTimerSection({
  briefingId,
  profile,
  onRefresh,
}: {
  briefingId: string;
  profile: Profile;
  onRefresh: () => void;
}) {
  const activeTimer = profile.active_timers?.find((t) => t.briefing_id === briefingId) ?? null;
  const elapsed = useElapsed(activeTimer?.started_at ?? null);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [showStop, setShowStop] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    try {
      await apiPost('/freelancers/timer/start', { freelancer_id: profile.id, briefing_id: briefingId });
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      await apiPost('/freelancers/timer/stop', {
        freelancer_id: profile.id,
        briefing_id: briefingId,
        description: description.trim() || null,
      });
      setShowStop(false);
      setDescription('');
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="portal-card">
      <div className="portal-section-head">
        <div>
          <h3 className="portal-section-title">Registro de tempo</h3>
          <p className="portal-card-subtitle">
            Inicie o cronômetro ao começar e pare quando concluir.
          </p>
        </div>
        {activeTimer && <span className="portal-pill portal-pill-success">Em execução</span>}
      </div>

      {activeTimer ? (
        <div className="portal-page" style={{ gap: 16 }}>
          <div className="portal-stat-card">
            <div className="portal-stat-label">Tempo em execução</div>
            <div className="portal-stat-value">{elapsed}</div>
          </div>
          {!showStop ? (
            <button onClick={() => setShowStop(true)} className="portal-button-danger">
              Parar timer
            </button>
          ) : (
            <div className="portal-page" style={{ gap: 16 }}>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="O que foi executado? (opcional)"
                rows={2}
                className="portal-textarea"
              />
              <div className="portal-inline-stack">
                <button onClick={() => setShowStop(false)} className="portal-button-ghost">
                  Cancelar
                </button>
                <button onClick={handleStop} disabled={loading} className="portal-button-danger">
                  {loading ? 'Salvando...' : 'Confirmar parada'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="portal-page" style={{ gap: 16 }}>
          <div className="portal-note">
            Nenhum timer ativo. Inicie ao começar a execução.
          </div>
          <button onClick={handleStart} disabled={loading || !profile} className="portal-button">
            {loading ? 'Iniciando...' : 'Iniciar timer'}
          </button>
        </div>
      )}
    </section>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: jobData, isLoading: jobLoading } = useSWR<{ job: JobDetail }>(
    `/freelancers/portal/me/jobs/${id}`,
    swrFetcher,
  );
  const { data: profile, mutate: mutateProfile } = useSWR<Profile>(
    '/freelancers/portal/me',
    swrFetcher,
  );

  const job = jobData?.job;

  if (jobLoading || !profile) {
    return (
      <div className="portal-empty">
        <div>
          <p className="portal-card-title">Carregando job</p>
          <p className="portal-card-subtitle">Sincronizando informações...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="portal-page">
        <div className="portal-alert portal-alert-error">
          Job não encontrado ou não atribuído a você.
        </div>
        <button className="portal-button-ghost" onClick={() => router.push('/jobs')}>
          Voltar para Jobs
        </button>
      </div>
    );
  }

  const isOps = job.source === 'ops_job';
  const opsJob = isOps ? (job as OpsJob) : null;
  const briefing = !isOps ? (job as Briefing) : null;

  const deadline = isOps ? opsJob!.deadline_at : briefing!.due_at;
  const statusLabel = isOps
    ? (OPS_STATUS_LABELS[job.status] ?? job.status)
    : (BRIEFING_STATUS_LABELS[job.status] ?? job.status);

  const isOverdue =
    deadline && new Date(deadline) < new Date() && !['done', 'published'].includes(job.status);

  return (
    <div className="portal-page">
      {/* Header */}
      <div className="portal-page-header">
        <div>
          <span className="portal-kicker">
            {isOps ? 'Operação' : 'Briefing'} · {job.client_name ?? 'Cliente não informado'}
          </span>
          <h2 className="portal-page-title">{job.title}</h2>
          <p className="portal-page-subtitle">
            {deadline
              ? `Entrega: ${new Date(deadline).toLocaleDateString('pt-BR', { dateStyle: 'medium' })}`
              : 'Sem prazo definido'}
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
          <span
            className={clsx(
              'portal-pill',
              job.status === 'in_progress' || job.status === 'producao'
                ? 'portal-pill-accent'
                : job.status === 'awaiting_approval' || job.status === 'aprovacao'
                  ? 'portal-pill-warning'
                  : job.status === 'done'
                    ? 'portal-pill-success'
                    : job.status === 'blocked'
                      ? 'portal-pill-error'
                      : 'portal-pill-neutral',
            )}
          >
            {statusLabel}
          </span>
          {isOverdue && (
            <span className="portal-pill portal-pill-error">Atrasado</span>
          )}
        </div>
      </div>

      {/* Context card */}
      <section className="portal-card">
        <h3 className="portal-section-title" style={{ marginBottom: 16 }}>Contexto</h3>

        <div className="portal-profile-grid">
          <div className="portal-profile-field">
            <span className="portal-profile-label">Cliente</span>
            <span className="portal-profile-value">{job.client_name ?? '—'}</span>
          </div>

          {isOps && opsJob && (
            <>
              {opsJob.job_type_name && (
                <div className="portal-profile-field">
                  <span className="portal-profile-label">Tipo</span>
                  <span className="portal-profile-value">{opsJob.job_type_name}</span>
                </div>
              )}
              {opsJob.priority_band && (
                <div className="portal-profile-field">
                  <span className="portal-profile-label">Prioridade</span>
                  <span className="portal-profile-value">
                    {PRIORITY_LABELS[opsJob.priority_band] ?? opsJob.priority_band.toUpperCase()}
                  </span>
                </div>
              )}
              {opsJob.estimated_minutes != null && opsJob.estimated_minutes > 0 && (
                <div className="portal-profile-field">
                  <span className="portal-profile-label">Estimado</span>
                  <span className="portal-profile-value">
                    {opsJob.estimated_minutes >= 60
                      ? `${Math.floor(opsJob.estimated_minutes / 60)}h ${opsJob.estimated_minutes % 60 > 0 ? `${opsJob.estimated_minutes % 60}min` : ''}`.trim()
                      : `${opsJob.estimated_minutes}min`}
                  </span>
                </div>
              )}
            </>
          )}

          {!isOps && briefing && briefing.copy_approved_at && (
            <div className="portal-profile-field">
              <span className="portal-profile-label">Copy aprovada em</span>
              <span className="portal-profile-value">
                {new Date(briefing.copy_approved_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          )}
        </div>

        {/* Notes / payload */}
        {isOps && opsJob?.notes && (
          <div style={{ marginTop: 16 }}>
            <span className="portal-profile-label" style={{ display: 'block', marginBottom: 6 }}>
              Observações
            </span>
            <p className="portal-card-subtitle" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {opsJob.notes}
            </p>
          </div>
        )}

        {!isOps && briefing?.payload && typeof briefing.payload === 'object' && (
          <div style={{ marginTop: 16 }}>
            {Object.entries(briefing.payload)
              .filter(([, v]) => v && String(v).length > 0)
              .slice(0, 12)
              .map(([key, value]) => (
                <div key={key} style={{ marginBottom: 12 }}>
                  <span
                    className="portal-profile-label"
                    style={{ display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  >
                    {key.replace(/_/g, ' ')}
                  </span>
                  <p className="portal-card-subtitle" style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
                    {String(value)}
                  </p>
                </div>
              ))}
          </div>
        )}
      </section>

      {/* Timer section */}
      {isOps ? (
        <OpsTimerSection jobId={job.id} />
      ) : (
        profile && (
          <BriefingTimerSection
            briefingId={job.id}
            profile={profile}
            onRefresh={() => mutateProfile()}
          />
        )
      )}

      <button
        className="portal-button-ghost"
        style={{ alignSelf: 'flex-start' }}
        onClick={() => router.push('/jobs')}
      >
        ← Voltar
      </button>
    </div>
  );
}
