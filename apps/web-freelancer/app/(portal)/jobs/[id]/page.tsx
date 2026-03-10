'use client';

import { use, useEffect, useState } from 'react';
import useSWR from 'swr';
import { swrFetcher, apiPost } from '@/lib/api';

type Profile = {
  id: string;
  display_name: string;
  active_timers?: { briefing_id: string; started_at: string }[];
};

function useElapsed(startedAt: string | null) {
  const [secs, setSecs] = useState(startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0);

  useEffect(() => {
    if (!startedAt) return undefined;
    const timer = setInterval(() => setSecs((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  if (!startedAt) return null;
  const pad = (value: number) => String(value).padStart(2, '0');
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: profile, mutate: mutateProfile } = useSWR<Profile>('/freelancers/portal/me', swrFetcher);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [showStop, setShowStop] = useState(false);

  const activeTimer = profile?.active_timers?.find((timer) => timer.briefing_id === id) ?? null;
  const elapsed = useElapsed(activeTimer?.started_at ?? null);

  const handleStart = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await apiPost('/freelancers/timer/start', { freelancer_id: profile.id, briefing_id: id });
      await mutateProfile();
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await apiPost('/freelancers/timer/stop', {
        freelancer_id: profile.id,
        briefing_id: id,
        description: description.trim() || null,
      });
      setShowStop(false);
      setDescription('');
      await mutateProfile();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="portal-page">
      <div>
        <span className="portal-kicker">Job</span>
        <h2 className="portal-page-title">Executar e registrar tempo</h2>
        <p className="portal-page-subtitle">ID operacional {id}</p>
      </div>

      <section className="portal-card">
        <div className="portal-section-head">
          <div>
            <h3 className="portal-section-title">Timesheet</h3>
            <p className="portal-card-subtitle">Inicie ou finalize o bloco de trabalho associado a este job.</p>
          </div>
          {activeTimer && <span className="portal-pill portal-pill-success">Timer ativo</span>}
        </div>

        {activeTimer ? (
          <div className="portal-page" style={{ gap: 16 }}>
            <div className="portal-stat-card">
              <div className="portal-stat-label">Tempo em execucao</div>
              <div className="portal-stat-value">{elapsed}</div>
            </div>

            {!showStop ? (
              <button onClick={() => setShowStop(true)} className="portal-button-danger">Parar timer</button>
            ) : (
              <div className="portal-page" style={{ gap: 16 }}>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descricao opcional do que foi executado..."
                  rows={3}
                  className="portal-textarea"
                />
                <div className="portal-inline-stack">
                  <button onClick={() => setShowStop(false)} className="portal-button-ghost">Cancelar</button>
                  <button onClick={handleStop} disabled={loading} className="portal-button-danger">
                    {loading ? 'Parando...' : 'Confirmar parada'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="portal-page" style={{ gap: 16 }}>
            <div className="portal-note">
              Nenhum timer ativo para este job no momento. Inicie quando comecar a execucao para manter o historico consistente.
            </div>
            <button onClick={handleStart} disabled={loading || !profile} className="portal-button">
              {loading ? 'Iniciando...' : 'Iniciar timer'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
