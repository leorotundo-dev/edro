'use client';

import React from 'react';

interface NewsletterTreinamentosProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
  body?: string;
}

export const NewsletterTreinamentos: React.FC<NewsletterTreinamentosProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#8b5cf6',
  title = 'Capacitação em Destaque',
  headline = 'Março 2025',
  name = 'Desenvolvimento de Pessoas',
  body = 'Invista no seu desenvolvimento! Confira os treinamentos disponíveis este mês, as vagas restantes e se inscreva antes que esgotem.',
}) => {
  const cursos = [
    {
      titulo: 'NR-35 — Trabalho em Altura',
      data: '10/03', hora: '08h00',
      instrutor: 'João Ferreira', cargaH: '8h',
      vagasTotal: 20, vagasRestantes: 3,
      obrig: true, cor: '#ef4444',
    },
    {
      titulo: 'Excel Avançado para Gestores',
      data: '12/03', hora: '14h00',
      instrutor: 'Ana Souza', cargaH: '6h',
      vagasTotal: 15, vagasRestantes: 8,
      obrig: false, cor: '#3b82f6',
    },
    {
      titulo: 'Liderança Situacional',
      data: '14/03', hora: '09h00',
      instrutor: 'Carlos Melo', cargaH: '16h',
      vagasTotal: 12, vagasRestantes: 5,
      obrig: false, cor: '#10b981',
    },
  ];

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes nt-course { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
        .nt-course { animation: nt-course 0.4s ease both; }
        .nt-course:nth-child(1){animation-delay:0.05s}
        .nt-course:nth-child(2){animation-delay:0.15s}
        .nt-course:nth-child(3){animation-delay:0.25s}
        @keyframes nt-bar { from{width:0} to{width:var(--w)} }
        .nt-bar-fill { animation: nt-bar 0.8s ease both 0.3s; }
      `}</style>

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${brandColor}, #7c3aed)`, padding: '24px 28px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>{brandName} · {name}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{headline}</div>
          </div>
          <div style={{ fontSize: 28 }}>📚</div>
        </div>
        <h1 style={{ color: 'white', fontSize: 20, fontWeight: 900, margin: '0 0 4px' }}>{title}</h1>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, margin: 0 }}>{body}</p>
      </div>

      {/* Cursos */}
      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cursos.map((c, i) => {
          const pctOcupado = Math.round(((c.vagasTotal - c.vagasRestantes) / c.vagasTotal) * 100);
          return (
            <div key={i} className="nt-course" style={{
              background: '#f9fafb', borderRadius: 10, padding: '14px',
              border: '1px solid #e5e7eb', borderLeft: `3px solid ${c.cor}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
                <div>
                  {c.obrig && (
                    <span style={{
                      background: '#fee2e2', border: '1px solid #fca5a5',
                      color: '#dc2626', fontSize: 7, fontWeight: 800,
                      padding: '1px 5px', borderRadius: 3, marginRight: 5,
                    }}>OBRIGATÓRIO</span>
                  )}
                  <span style={{ color: '#111827', fontSize: 13, fontWeight: 800 }}>{c.titulo}</span>
                </div>
              </div>
              {/* Meta info */}
              <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span style={{ color: '#6b7280', fontSize: 10 }}>{c.data} às {c.hora}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                  </svg>
                  <span style={{ color: '#6b7280', fontSize: 10 }}>{c.instrutor}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                  </svg>
                  <span style={{ color: '#6b7280', fontSize: 10 }}>{c.cargaH}</span>
                </div>
              </div>
              {/* Barra de vagas */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ color: '#6b7280', fontSize: 9 }}>Vagas preenchidas</span>
                  <span style={{
                    color: c.vagasRestantes <= 4 ? '#dc2626' : '#16a34a',
                    fontSize: 9, fontWeight: 700,
                  }}>{c.vagasRestantes} restantes</span>
                </div>
                <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${pctOcupado}%`,
                    background: c.vagasRestantes <= 4 ? '#ef4444' : c.cor,
                    borderRadius: 3,
                  }} />
                </div>
              </div>
              {/* CTA */}
              <button type="button" aria-label={`Inscrever-se em ${c.titulo}`} style={{
                width: '100%', background: c.cor, color: 'white', border: 'none',
                borderRadius: 7, padding: '9px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
              }}>
                Inscrever-se →
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 28px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · Desenvolvimento de Pessoas</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
