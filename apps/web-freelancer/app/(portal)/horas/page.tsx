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
  const options = [];
  const now = new Date();
  for (let index = 0; index < 6; index += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value, label: format(date, 'MMMM yyyy', { locale: ptBR }) });
  }
  return options;
}

export default function HorasPage() {
  const monthOptions = buildMonthOptions();
  const [month, setMonth] = useState(monthOptions[0].value);

  const { data, isLoading } = useSWR<{ entries: Entry[] }>(`/freelancers/portal/me/entries?month=${month}`, swrFetcher);
  const entries = data?.entries ?? [];
  const totalMinutes = entries.reduce((sum, entry) => sum + (entry.minutes ?? 0), 0);

  function formatMinutes(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest > 0 ? `${hours}h ${rest}min` : `${hours}h`;
  }

  return (
    <div className="portal-page">
      <div className="portal-page-header">
        <div>
          <span className="portal-kicker">Horas</span>
          <h2 className="portal-page-title">Registro por periodo</h2>
          <p className="portal-page-subtitle">Historico de blocos de trabalho registrados no mes selecionado.</p>
        </div>
        <div style={{ minWidth: 220 }}>
          <label className="portal-field-label" htmlFor="hours-month">Periodo</label>
          <select id="hours-month" value={month} onChange={(e) => setMonth(e.target.value)} className="portal-select">
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {totalMinutes > 0 && (
        <section className="portal-hero-card">
          <div className="portal-stat-card">
            <div className="portal-stat-label">Total acumulado</div>
            <div className="portal-stat-value">{formatMinutes(totalMinutes)}</div>
            <div className="portal-stat-meta">Periodo {month}</div>
          </div>
        </section>
      )}

      <section className="portal-card">
        {isLoading ? (
          <div className="portal-empty"><div><p className="portal-card-title">Carregando apontamentos</p><p className="portal-card-subtitle">Buscando os lancamentos do periodo.</p></div></div>
        ) : !entries.length ? (
          <div className="portal-empty"><div><p className="portal-card-title">Nenhuma hora registrada</p><p className="portal-card-subtitle">Nao ha apontamentos para {month}.</p></div></div>
        ) : (
          <div className="portal-list">
            {entries.map((entry) => (
              <div key={entry.id} className="portal-list-card">
                <div className="portal-list-row">
                  <div>
                    <p className="portal-card-title">{entry.briefing_title ?? 'Job'}</p>
                    {entry.description && <p className="portal-card-subtitle">{entry.description}</p>}
                    <p className="portal-card-subtitle">
                      {new Date(entry.started_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      {' -> '}
                      {new Date(entry.ended_at).toLocaleString('pt-BR', { timeStyle: 'short' })}
                    </p>
                  </div>
                  <span className="portal-pill portal-pill-accent">{formatMinutes(entry.minutes)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
