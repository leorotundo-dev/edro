'use client';

import React from 'react';

interface InfograficoEstatisticasProps {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  brandName?: string;
  brandColor?: string;
}

export const InfograficoEstatisticas: React.FC<InfograficoEstatisticasProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  brandName,
  brandColor = '#8b5cf6',
}) => {
  const resolvedTitle = headline || title || name || 'Marketing de Conteúdo em Números';
  const resolvedSubtitle =
    body || text || description || caption || 'Estatísticas essenciais sobre o impacto do conteúdo digital em 2025.';
  const resolvedBrand = brandName || 'Fonte: Content Marketing Institute 2025';
  const accent = brandColor || '#8b5cf6';

  const stats = [
    {
      value: '72%',
      label: 'das empresas aumentaram o orçamento de conteúdo',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
        </svg>
      ),
      color: '#10b981',
      bg: '#ecfdf5',
    },
    {
      value: '3.5×',
      label: 'mais leads gerados por conteúdo vs. anúncios pagos',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      color: '#3b82f6',
      bg: '#eff6ff',
    },
    {
      value: '62%',
      label: 'custo menor por lead em comparação ao marketing tradicional',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
      color: '#f59e0b',
      bg: '#fffbeb',
    },
    {
      value: '4.8×',
      label: 'maior taxa de conversão com conteúdo personalizado',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
        </svg>
      ),
      color: '#ef4444',
      bg: '#fef2f2',
    },
  ];

  return (
    <div
      style={{
        width: '400px',
        background: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes iest-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .iest-card { animation: iest-fade 0.4s ease; }
        .iest-stat:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.08); }
        .iest-stat { transition: transform 0.2s, box-shadow 0.2s; }
      `}</style>

      <div className="iest-card">
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
            padding: '18px 22px 14px',
          }}
        >
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Infográfico · Estatísticas
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.01em' }}>
            {resolvedTitle}
          </h2>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.78)', margin: 0 }}>{resolvedSubtitle}</p>
        </div>

        {/* Stats grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            padding: '18px 20px',
          }}
        >
          {stats.map((s, i) => (
            <div
              key={i}
              className="iest-stat"
              style={{
                background: s.bg,
                borderRadius: '12px',
                padding: '16px 14px',
                border: `1px solid ${s.color}20`,
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: `${s.color}18`,
                  color: s.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '10px',
                }}
              >
                {s.icon}
              </div>
              <div
                style={{
                  fontSize: '28px',
                  fontWeight: 900,
                  color: s.color,
                  letterSpacing: '-0.03em',
                  lineHeight: 1,
                  marginBottom: '6px',
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1.45 }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Source footer */}
        <div
          style={{
            padding: '0 20px 16px',
            borderTop: '1px solid #f3f4f6',
            paddingTop: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span style={{ fontSize: '10px', color: '#9ca3af' }}>{resolvedBrand}</span>
        </div>
      </div>
    </div>
  );
};
