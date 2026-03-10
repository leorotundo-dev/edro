'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { swrFetcher } from '@/lib/api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Entry = {
  id: string;
  briefing_id: string;
  briefing_title: string | null;
  started_at: string;
  ended_at: string;
  minutes: number;
  description: string | null;
};

function buildMonthOptions() {
  const opts = [];
  const now = new Date();
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    opts.push({ value: val, label: format(d, 'MMMM yyyy', { locale: ptBR }) });
  }
  return opts;
}

export default function HorasPage() {
  const monthOptions = buildMonthOptions();
  const [month, setMonth] = useState(monthOptions[0].value);

  const { data, isLoading } = useSWR<{ entries: Entry[] }>(
    `/freelancers/portal/me/entries?month=${month}`,
    swrFetcher,
  );

  const entries = data?.entries ?? [];
  const totalMinutes = entries.reduce((s, e) => s + (e.minutes ?? 0), 0);

  function fmtMins(mins: number) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m > 0 ? `${h}h ${m}min` : `${h}h`;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Horas</h1>
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="border border-slate-300 rounded-lg px-2 py-1 text-sm focus:outline-none"
        >
          {monthOptions.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {totalMinutes > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-xs text-blue-600">Total em {month}</p>
          <p className="text-2xl font-bold text-blue-700">{fmtMins(totalMinutes)}</p>
        </div>
      )}

      {isLoading ? (
        <p className="text-slate-400 text-sm">Carregando...</p>
      ) : !entries.length ? (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          <p className="text-slate-400 text-sm">Nenhuma hora registrada em {month}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 text-sm truncate">
                    {e.briefing_title ?? 'Job'}
                  </p>
                  {e.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{e.description}</p>
                  )}
                </div>
                <span className="shrink-0 text-sm font-bold text-slate-700">
                  {fmtMins(e.minutes)}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {new Date(e.started_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                {' → '}
                {new Date(e.ended_at).toLocaleString('pt-BR', { timeStyle: 'short' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
