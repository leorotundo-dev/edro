'use client';

import React from 'react';

interface InfograficoVerticalProps {
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

export const InfograficoVertical: React.FC<InfograficoVerticalProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  brandName,
  brandColor = '#6366f1',
}) => {
  const resolvedTitle = headline || title || name || 'O Poder do Marketing Digital';
  const resolvedSubtitle =
    body || text || description || caption || '5 dados que você precisa conhecer em 2026.';
  const resolvedBrand = brandName || 'Edro.Digital';
  const accent = brandColor || '#6366f1';

  const blocks = [
    {
      num: '01',
      stat: '93%',
      label: 'das compras B2B começam com uma busca online',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      color: '#6366f1',
      bg: '#eef2ff',
    },
    {
      num: '02',
      stat: '47×',
      label: 'mais leads gerados por marcas com blog ativo',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
        </svg>
      ),
      color: '#ec4899',
      bg: '#fdf2f8',
    },
    {
      num: '03',
      stat: '82%',
      label: 'dos consumidores preferem vídeos curtos a textos',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      ),
      color: '#f59e0b',
      bg: '#fffbeb',
    },
    {
      num: '04',
      stat: '6×',
      label: 'maior ROI com personalização de conteúdo',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
        </svg>
      ),
      color: '#10b981',
      bg: '#ecfdf5',
    },
    {
      num: '05',
      stat: '3.2B',
      label: 'de usuários ativos em redes sociais no mundo',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
      ),
      color: '#3b82f6',
      bg: '#eff6ff',
    },
  ];

  return (
    <div
      style={{
        width: '300px',
        background: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes iv-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .iv-card { animation: iv-fade 0.4s ease; }
        .iv-block:hover { transform: translateX(3px); }
        .iv-block { transition: transform 0.2s; }
      `}</style>

      <div className="iv-card">
        {/* Header */}
        <div
          style={{
            background: `linear-gradient(160deg, ${accent} 0%, ${accent}cc 100%)`,
            padding: '22px 20px 18px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'rgba(255,255,255,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 10px',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
          </div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>
            Infográfico Vertical
          </div>
          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#fff', margin: '0 0 4px', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
            {resolvedTitle}
          </h2>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', margin: 0 }}>{resolvedSubtitle}</p>
        </div>

        {/* Data blocks */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {blocks.map((b, i) => (
            <div
              key={i}
              className="iv-block"
              style={{
                background: b.bg,
                borderRadius: '10px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                border: `1px solid ${b.color}20`,
              }}
            >
              {/* Number + icon */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: b.color, letterSpacing: '0.06em' }}>#{b.num}</span>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9px',
                    background: `${b.color}22`,
                    color: b.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {b.icon}
                </div>
              </div>

              {/* Stat + label */}
              <div>
                <div
                  style={{
                    fontSize: '24px',
                    fontWeight: 900,
                    color: b.color,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                    marginBottom: '3px',
                  }}
                >
                  {b.stat}
                </div>
                <div style={{ fontSize: '11px', color: '#374151', lineHeight: 1.4 }}>
                  {b.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '8px 14px 14px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '5px',
          }}
        >
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: accent }} />
          <span style={{ fontSize: '10px', color: '#9ca3af', fontWeight: 600 }}>{resolvedBrand} · 2026</span>
        </div>
      </div>
    </div>
  );
};
