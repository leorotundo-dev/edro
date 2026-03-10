'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { swrFetcher, apiPost } from '@/lib/api';

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
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
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
    } catch { /* silent */ } finally {
      setStopping(false);
    }
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm font-semibold text-green-800">Timer ativo</span>
        </div>
        <p className="text-xs text-green-700 mt-0.5 truncate max-w-48">{timer.briefing_title ?? 'Job'}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-mono text-lg font-bold text-green-700">{elapsed}</span>
        <button
          onClick={stop}
          disabled={stopping}
          className="bg-red-500 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-red-600 disabled:opacity-50"
        >
          {stopping ? '...' : 'Parar'}
        </button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: profile, mutate } = useSWR<Profile>('/freelancers/portal/me', swrFetcher);

  const currentMonth = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  })();

  const { data: entriesData } = useSWR(
    `/freelancers/portal/me/entries?month=${currentMonth}`,
    swrFetcher,
  );
  const { data: payablesData } = useSWR('/freelancers/portal/me/payables', swrFetcher);

  const totalMinutes = (entriesData?.entries ?? []).reduce((s: number, e: any) => s + (e.minutes ?? 0), 0);
  const pendingPayable = (payablesData?.payables ?? []).find((p: Payable) => p.status === 'open');
  const activeTimers = profile?.active_timers ?? [];

  function formatHours(mins: number) {
    if (!mins) return '0h';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  if (!profile) {
    return <div className="text-center py-12 text-slate-400 text-sm">Carregando...</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Olá, {profile.display_name} 👋</h1>
        <p className="text-sm text-slate-500">{currentMonth}</p>
      </div>

      {/* Active timer */}
      {activeTimers.map((t, i) => (
        <ActiveTimerCard
          key={i}
          timer={t}
          freelancerId={profile.id}
          onStopped={() => mutate()}
        />
      ))}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Horas no mês</p>
          <p className="text-2xl font-bold text-blue-600">{formatHours(totalMinutes)}</p>
          {profile.hourly_rate_brl && (
            <p className="text-xs text-slate-400 mt-0.5">
              ≈ R$ {((totalMinutes / 60) * parseFloat(profile.hourly_rate_brl)).toFixed(2)}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500 mb-1">Próximo pagamento</p>
          {pendingPayable ? (
            <>
              <p className="text-2xl font-bold text-orange-500">
                R$ {parseFloat(pendingPayable.amount_brl).toFixed(2)}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">{pendingPayable.period_month}</p>
            </>
          ) : (
            <p className="text-sm text-slate-400 mt-1">Nenhum pendente</p>
          )}
        </div>
      </div>
    </div>
  );
}
