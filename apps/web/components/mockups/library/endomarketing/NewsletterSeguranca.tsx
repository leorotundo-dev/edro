'use client';

import React from 'react';

interface NewsletterSegurancaProps {
  brandName?: string;
  brandColor?: string;
  title?: string;
  headline?: string;
  name?: string;
  body?: string;
}

export const NewsletterSeguranca: React.FC<NewsletterSegurancaProps> = ({
  brandName = 'Empresa S.A.',
  brandColor = '#eab308',
  title = 'Boletim de Segurança',
  headline = 'Março 2025',
  name = 'CIPA · Segurança do Trabalho',
  body = 'A segurança é responsabilidade de todos. Reporte condições inseguras e participe das ações de prevenção. Juntos, mantemos o recorde de dias sem acidentes!',
}) => {
  const stats = [
    { val: '62', label: 'Dias sem acidentes', cor: '#22c55e', destaque: true },
    { val: '0', label: 'Incidentes no mês', cor: '#22c55e', destaque: false },
    { val: '3', label: 'Quase-acidentes reportados', cor: '#f59e0b', destaque: false },
  ];

  return (
    <div style={{
      width: 420, background: '#ffffff',
      borderRadius: 12, overflow: 'hidden',
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
    }}>
      <style>{`
        @keyframes ns-hat { 0%,100%{transform:rotate(-5deg)} 50%{transform:rotate(5deg)} }
        .ns-hat { display:inline-block; animation: ns-hat 3s ease-in-out infinite; }
        @keyframes ns-stat { from{opacity:0;transform:scale(0.85)} to{opacity:1;transform:scale(1)} }
        .ns-stat { animation: ns-stat 0.4s ease both; }
        .ns-stat:nth-child(1){animation-delay:0.05s}
        .ns-stat:nth-child(2){animation-delay:0.15s}
        .ns-stat:nth-child(3){animation-delay:0.25s}
      `}</style>

      {/* Header listrado amarelo/preto */}
      <div style={{ height: 8, background: 'repeating-linear-gradient(90deg, #eab308 0px, #eab308 20px, #1a1700 20px, #1a1700 40px)' }} />
      <div style={{ background: '#1a1700', padding: '22px 28px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{brandName} · {name}</div>
            <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10 }}>{headline}</div>
          </div>
          <span className="ns-hat" style={{ fontSize: 30 }}>⛑️</span>
        </div>
        <h1 style={{ color: '#fde047', fontSize: 21, fontWeight: 900, margin: 0 }}>{title}</h1>
      </div>
      <div style={{ height: 5, background: brandColor }} />

      {/* Stats */}
      <div style={{ padding: '18px 28px 14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {stats.map((s, i) => (
            <div key={i} className="ns-stat" style={{
              background: s.destaque ? `${s.cor}10` : '#f9fafb',
              border: `1px solid ${s.destaque ? s.cor + '30' : '#e5e7eb'}`,
              borderRadius: 8, padding: '12px 8px', textAlign: 'center',
            }}>
              <div style={{ color: s.cor, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>
                {s.destaque ? '🏆' : ''}{s.val}
              </div>
              <div style={{ color: '#6b7280', fontSize: 9, marginTop: 4, lineHeight: 1.3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Dica da semana */}
      <div style={{ padding: '0 28px 14px' }}>
        <div style={{
          background: '#fefce8', border: '1px solid #fde68a',
          borderLeft: `4px solid ${brandColor}`,
          borderRadius: '0 8px 8px 0', padding: '12px 16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span style={{ color: '#92400e', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>Dica da Semana</span>
          </div>
          <p style={{ color: '#78350f', fontSize: 12, margin: 0, lineHeight: 1.6 }}>
            Ao utilizar escadas portáteis, sempre mantenha três pontos de apoio (dois pés e uma mão, ou dois pés e os dois quadris). Nunca ultrapasse o penúltimo degrau.
          </p>
        </div>
      </div>

      {/* Mensagem */}
      <div style={{ padding: '0 28px 14px' }}>
        <p style={{ color: '#4b5563', fontSize: 11, lineHeight: 1.65, margin: 0 }}>{body}</p>
      </div>

      {/* CTA denúncia */}
      <div style={{ padding: '0 28px 22px' }}>
        <div style={{
          background: '#fef2f2', border: '1px solid #fecdd3',
          borderRadius: 10, padding: '12px 16px',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#dc2626', fontSize: 11, fontWeight: 800, marginBottom: 1 }}>Reporte uma condição insegura</div>
            <div style={{ color: '#b91c1c', fontSize: 10 }}>CIPA · (11) 9999-0000 · cipa@empresa.com.br</div>
          </div>
          <button type="button" aria-label="Reportar condição insegura" style={{
            background: '#dc2626', color: 'white', border: 'none',
            borderRadius: 7, padding: '7px 12px', fontSize: 10, fontWeight: 700, cursor: 'pointer', flexShrink: 0,
          }}>
            Reportar
          </button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f9fafb', borderTop: '1px solid #e5e7eb', padding: '12px 28px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{brandName} · CIPA · Segurança</span>
        <span style={{ color: '#9ca3af', fontSize: 10 }}>{new Date().toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  );
};
