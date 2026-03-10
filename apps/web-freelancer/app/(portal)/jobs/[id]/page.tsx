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
  const [secs, setSecs] = useState(
    startedAt ? Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000) : 0,
  );
  useEffect(() => {
    if (!startedAt) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [startedAt]);
  if (!startedAt) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: profile, mutate: mutateProfile } = useSWR<Profile>('/freelancers/portal/me', swrFetcher);
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [showStop, setShowStop] = useState(false);

  const activeTimer = profile?.active_timers?.find((t) => t.briefing_id === id) ?? null;
  const elapsed = useElapsed(activeTimer?.started_at ?? null);

  const handleStart = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      await apiPost('/freelancers/timer/start', { freelancer_id: profile.id, briefing_id: id });
      await mutateProfile();
    } catch { /* silent */ } finally {
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
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <a href="/jobs" className="text-blue-600 text-sm hover:underline">← Jobs</a>

      <h1 className="text-xl font-bold text-slate-800">Job</h1>
      <p className="text-xs text-slate-500 font-mono">{id}</p>

      {/* Timer section */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <h2 className="font-semibold text-slate-700 text-sm">Timesheet</h2>

        {activeTimer ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse inline-block" />
              <span className="font-mono text-2xl font-bold text-green-600">{elapsed}</span>
            </div>

            {!showStop ? (
              <button
                onClick={() => setShowStop(true)}
                className="bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-red-600"
              >
                Parar timer
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descrição do trabalho (opcional)..."
                  rows={2}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowStop(false)}
                    className="flex-1 border border-slate-300 text-slate-600 text-sm py-2 rounded-lg hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleStop}
                    disabled={loading}
                    className="flex-1 bg-red-500 text-white text-sm py-2 rounded-lg hover:bg-red-600 disabled:opacity-50"
                  >
                    {loading ? 'Parando...' : 'Confirmar parada'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={handleStart}
            disabled={loading || !profile}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Iniciando...' : '▶ Iniciar timer'}
          </button>
        )}
      </div>
    </div>
  );
}
