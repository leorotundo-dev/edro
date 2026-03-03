'use client';

import React from 'react';

interface TVCorporativaHorariosProps {
  brandName?: string;
  title?: string;
  headline?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaHorarios: React.FC<TVCorporativaHorariosProps> = ({
  brandName = 'Empresa S.A.',
  title = 'Escala de Turnos',
  headline = 'Semana de 03 – 07/03',
  brandColor = '#0891b2',
  name = '',
}) => {
  const turnos = [
    { label: 'Manhã', hora: '06:00–14:00', cor: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
    { label: 'Tarde', hora: '14:00–22:00', cor: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
    { label: 'Noite', hora: '22:00–06:00', cor: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' },
    { label: 'Folga', hora: '–', cor: '#6b7280', bg: 'rgba(107,114,128,0.1)' },
  ];

  const colaboradores = [
    { nome: 'Ana C.', seg: 0, ter: 1, qua: 3, qui: 0, sex: 1 },
    { nome: 'Bruno S.', seg: 1, ter: 1, qua: 1, qui: 2, sex: 3 },
    { nome: 'Camila R.', seg: 2, ter: 3, qua: 0, qui: 1, sex: 0 },
    { nome: 'Diego N.', seg: 0, ter: 2, qua: 1, qui: 3, sex: 2 },
    { nome: 'Elena M.', seg: 1, ter: 0, qua: 2, qui: 0, sex: 1 },
    { nome: 'Felipe A.', seg: 3, ter: 1, qua: 0, qui: 2, sex: 0 },
  ];

  const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(150deg, #050e1a 0%, #0a1929 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes hor-row { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        .hor-row { animation: hor-row 0.35s ease both; }
        .hor-row:nth-child(1){animation-delay:0.05s}
        .hor-row:nth-child(2){animation-delay:0.1s}
        .hor-row:nth-child(3){animation-delay:0.15s}
        .hor-row:nth-child(4){animation-delay:0.2s}
        .hor-row:nth-child(5){animation-delay:0.25s}
        .hor-row:nth-child(6){animation-delay:0.3s}
      `}</style>

      <div style={{ height: 4, background: `linear-gradient(90deg, #f59e0b, ${brandColor}, #8b5cf6)` }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 18px 7px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{brandName} · {headline}</div>
          </div>
        </div>
        {/* Legend */}
        <div style={{ display: 'flex', gap: 8 }}>
          {turnos.slice(0, 3).map((t, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: t.cor }} />
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 8 }}>{t.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {/* Day header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: '80px repeat(5,1fr)',
          gap: 4, marginBottom: 4,
        }}>
          <div />
          {dias.map((d, i) => (
            <div key={i} style={{
              textAlign: 'center', padding: '4px 0',
              background: 'rgba(255,255,255,0.05)', borderRadius: 5,
            }}>
              <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: 700 }}>{d}</span>
            </div>
          ))}
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {colaboradores.map((col, ci) => (
            <div key={ci} className="hor-row" style={{
              display: 'grid', gridTemplateColumns: '80px repeat(5,1fr)', gap: 4,
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: 'rgba(255,255,255,0.04)', borderRadius: 5, padding: '4px 7px',
              }}>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  background: `${brandColor}33`, border: `1px solid ${brandColor}55`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 700, color: brandColor, flexShrink: 0,
                }}>
                  {col.nome.split(' ')[0][0]}{col.nome.split(' ')[1]?.[0] ?? ''}
                </div>
                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9 }}>{col.nome}</span>
              </div>
              {[col.seg, col.ter, col.qua, col.qui, col.sex].map((ti, di) => {
                const t = turnos[ti];
                return (
                  <div key={di} style={{
                    background: t.bg, borderRadius: 5, padding: '4px 0',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    border: `1px solid ${t.cor}33`,
                  }}>
                    <span style={{ color: t.cor, fontSize: 8, fontWeight: 700 }}>{t.label}</span>
                    <span style={{ color: `${t.cor}99`, fontSize: 7 }}>{t.hora}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div style={{
        padding: '4px 18px 8px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>Gestão de Pessoas · RH</span>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
