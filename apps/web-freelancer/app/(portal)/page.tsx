'use client';

import useSWR from 'swr';
import { swrFetcher, apiPost } from '@/lib/api';
import clsx from 'clsx';
import Link from 'next/link';
import { useEffect, useState } from 'react';

type Profile = {
  id: string;
  display_name: string;
  hourly_rate_brl: string | null;
  active_timers?: { briefing_id: string; briefing_title?: string; started_at: string }[];
};

type Payable = {
  id: string;
  period_month: string;
  amount_brl: string;
  status: string;
};

function useElapsed(startedAt: string) {
  const [secs, setSecs] = useState(
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
  );

  useEffect(() => {
    const timer = setInterval(() => setSecs((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  const pad = (value: number) => String(value).padStart(2, '0');
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  return hours > 0 ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

function ActiveTimerCard({ timer, freelancerId, onStopped }: {
  timer: { briefing_id: string; briefing_title?: string; started_at: string };
  freelancerId: string;
  onStopped: () => void;
}) {
  const elapsed = useElapsed(timer.started_at);
  const [stopping, setStopping] = useState(false);

  const stop = async () => {
    setStopping(true);
    try {
      await apiPost('/freelancers/timer/stop', {
        freelancer_id: freelancerId,
        briefing_id: timer.briefing_id,
      });
      onStopped();
    } finally {
      setStopping(false);
    }
  };

  return (
    <div className="portal-card">
      <div className="portal-section-head">
        <div>
          <span className="portal-kicker">Timer ativo</span>
          <h3 className="portal-section-title" style={{ marginTop: 12 }}>{timer.briefing_title ?? 'Job em execucao'}</h3>
          <p className="portal-card-subtitle">O cronometro continua rodando ate voce encerrar este bloco.</p>
        </div>
        <span className="portal-stat-value" style={{ fontSize: '1.8rem' }}>{elapsed}</span>
      </div>
      <button onClick={stop} disabled={stopping} className="portal-button-danger">
        {stopping ? 'Parando...' : 'Parar timer'}
      </button>
    </div>
  );
}

export default function DashboardPage() {
  const { data: profile, mutate } = useSWR<Profile>('/freelancers/portal/me', swrFetcher);

  const currentMonth = (() => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  })();

  const { data: entriesData } = useSWR(`/freelancers/portal/me/entries?month=${currentMonth}`, swrFetcher);
  const { data: payablesData } = useSWR('/freelancers/portal/me/payables', swrFetcher);

  const totalMinutes = (entriesData?.entries ?? []).reduce((sum: number, entry: any) => sum + (entry.minutes ?? 0), 0);
  const pendingPayable = (payablesData?.payables ?? []).find((payable: Payable) => payable.status === 'open');
  const activeTimers = profile?.active_timers ?? [];

  function formatHours(minutes: number) {
    if (!minutes) return '0h';
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
  }

  if (!profile) {
    return <div className="portal-empty"><div><p className="portal-card-title">Carregando portal</p><p className="portal-card-subtitle">Sincronizando sua visao operacional.</p></div></div>;
  }

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <div>
          <span className="portal-kicker">Workspace freelancer</span>
          <h2 className="portal-page-title">Ola, {profile.display_name}</h2>
          <p className="portal-page-subtitle">
            Este painel concentra o que esta ativo agora, o volume de horas do mes e o proximo valor previsto para pagamento.
          </p>
        </div>
      </div>

      {activeTimers.map((timer) => (
        <ActiveTimerCard key={timer.briefing_id} timer={timer} freelancerId={profile.id} onStopped={() => mutate()} />
      ))}

      <section className="portal-hero-card">
        <div className="portal-stat-grid">
          <div className="portal-stat-card">
            <div className="portal-stat-label">Horas no mes</div>
            <div className="portal-stat-value">{formatHours(totalMinutes)}</div>
            <div className="portal-stat-meta">
              {profile.hourly_rate_brl
                ? `Estimativa bruta de R$ ${((totalMinutes / 60) * parseFloat(profile.hourly_rate_brl)).toFixed(2)}`
                : 'Sem valor hora cadastrado.'}
            </div>
          </div>
          <div className="portal-stat-card">
            <div className="portal-stat-label">Proximo pagamento</div>
            <div className="portal-stat-value">{pendingPayable ? `R$ ${parseFloat(pendingPayable.amount_brl).toFixed(2)}` : 'Sem pendencia'}</div>
            <div className="portal-stat-meta">{pendingPayable ? pendingPayable.period_month : 'Nenhum pagamento aberto no momento.'}</div>
          </div>
        </div>
      </section>

      <section className="portal-note">
        <div className="portal-section-head" style={{ marginBottom: 0 }}>
          <div>
            <h3 className="portal-section-title">Ritmo de operacao</h3>
            <p className="portal-card-subtitle">Seu painel agora segue o mesmo sistema visual do Edro Web, sem alterar o fluxo de trabalho existente.</p>
          </div>
          <span className={clsx('portal-pill', activeTimers.length ? 'portal-pill-success' : 'portal-pill-neutral')}>
            {activeTimers.length ? 'Em execucao' : 'Sem timer ativo'}
          </span>
        </div>
      </section>
    </div>
  );
}
