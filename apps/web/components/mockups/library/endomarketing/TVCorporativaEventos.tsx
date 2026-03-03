'use client';

import React from 'react';

interface TVCorporativaEventosProps {
  brandName?: string;
  title?: string;
  headline?: string;
  brandColor?: string;
  name?: string;
}

export const TVCorporativaEventos: React.FC<TVCorporativaEventosProps> = ({
  brandName = 'Empresa S.A.',
  title = 'Agenda da Semana',
  headline = '03 – 07 de Março',
  brandColor = '#6366f1',
  name = '',
}) => {
  const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
  const eventos = [
    { dia: 0, hora: '09:00', titulo: 'All-Hands Q1', local: 'Auditório A', cor: '#6366f1', dur: 90 },
    { dia: 0, hora: '14:00', titulo: 'Revisão de Budget', local: 'Sala 3', cor: '#f59e0b', dur: 60 },
    { dia: 1, hora: '10:00', titulo: 'Treinamento NR-10', local: 'Sala de Treinamento', cor: '#ef4444', dur: 120 },
    { dia: 2, hora: '08:30', titulo: 'Workshop de Inovação', local: 'Coworking B', cor: '#22c55e', dur: 180 },
    { dia: 2, hora: '15:00', titulo: 'Avaliação de Desempenho', local: 'RH – Sala 2', cor: '#a78bfa', dur: 60 },
    { dia: 3, hora: '11:00', titulo: 'Reunião de Diretoria', local: 'Board Room', cor: '#f97316', dur: 90 },
    { dia: 4, hora: '09:00', titulo: 'Integração Novos Colaboradores', local: 'Auditório B', cor: '#06b6d4', dur: 120 },
  ];

  return (
    <div style={{
      width: 560, height: 315,
      background: 'linear-gradient(160deg, #0f0f1a 0%, #1a1a2e 100%)',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      display: 'flex', flexDirection: 'column',
    }}>
      <style>{`
        @keyframes ev-in { from{opacity:0;transform:scaleY(0.8)} to{opacity:1;transform:scaleY(1)} }
        .ev-card { animation: ev-in 0.35s ease both; transform-origin: top; }
        .ev-card:nth-child(1){animation-delay:0.05s}
        .ev-card:nth-child(2){animation-delay:0.12s}
        .ev-card:nth-child(3){animation-delay:0.19s}
        .ev-card:nth-child(4){animation-delay:0.26s}
        .ev-card:nth-child(5){animation-delay:0.33s}
      `}</style>

      <div style={{ height: 4, background: `linear-gradient(90deg, ${brandColor}, #a78bfa, #06b6d4)` }} />

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '9px 20px 7px', borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 7, background: `${brandColor}33`,
            border: `1px solid ${brandColor}66`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{title}</div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>{brandName} · {headline}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {[{ label: '7 eventos', color: '#6366f1' }, { label: '3 salas', color: '#22c55e' }].map((b, i) => (
            <div key={i} style={{
              background: `${b.color}20`, border: `1px solid ${b.color}40`,
              borderRadius: 20, padding: '2px 9px',
            }}>
              <span style={{ color: b.color, fontSize: 9, fontWeight: 700 }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Day columns */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 6, padding: '8px 14px' }}>
        {dias.map((dia, di) => {
          const evsDia = eventos.filter(e => e.dia === di);
          return (
            <div key={di} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{
                textAlign: 'center', padding: '3px 0',
                borderRadius: 6,
                background: evsDia.length > 0 ? `${brandColor}20` : 'transparent',
                border: evsDia.length > 0 ? `1px solid ${brandColor}40` : '1px solid transparent',
              }}>
                <div style={{ color: evsDia.length > 0 ? brandColor : 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 700 }}>{dia}</div>
              </div>
              {evsDia.map((ev, ei) => (
                <div key={ei} className="ev-card" style={{
                  background: `${ev.cor}15`, borderRadius: 6, padding: '5px 6px',
                  borderLeft: `3px solid ${ev.cor}`,
                }}>
                  <div style={{ color: ev.cor, fontSize: 8, fontWeight: 700 }}>{ev.hora}</div>
                  <div style={{ color: 'white', fontSize: 9, fontWeight: 600, lineHeight: 1.2, marginTop: 1 }}>{ev.titulo}</div>
                  <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, marginTop: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    {ev.local}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{
        padding: '4px 20px 8px', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {[{ cor: '#6366f1', label: 'Institucional' }, { cor: '#ef4444', label: 'Treinamento' }, { cor: '#22c55e', label: 'Workshop' }, { cor: '#f59e0b', label: 'Gestão' }].map((l, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: l.cor }} />
              <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 8 }}>{l.label}</span>
            </div>
          ))}
        </div>
        <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
