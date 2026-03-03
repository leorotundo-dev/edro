'use client';

import React from 'react';

interface KeynoteComparacaoProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  text?: string;
  caption?: string;
  description?: string;
  brandColor?: string;
  themeColor?: string;
}

export const KeynoteComparacao: React.FC<KeynoteComparacaoProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  brandColor,
  themeColor = '#6366F1',
}) => {
  const accent = brandColor ?? themeColor;
  const slideTitle = headline ?? title ?? name ?? username ?? brandName ?? 'Comparação';

  const features: { label: string; a: boolean; b: boolean }[] = [
    { label: 'Facilidade de uso', a: true, b: false },
    { label: 'Suporte 24/7', a: true, b: true },
    { label: 'Integração via API', a: true, b: false },
    { label: 'Relatórios avançados', a: true, b: false },
    { label: 'Preço acessível', a: false, b: true },
  ];

  const Check = () => (
    <span style={{ color: '#16a34a', fontWeight: 800, fontSize: '14px' }}>✓</span>
  );
  const Cross = () => (
    <span style={{ color: '#dc2626', fontWeight: 800, fontSize: '14px' }}>✗</span>
  );

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        background: '#fafafa',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Header bar */}
      <div
        style={{
          background: accent,
          padding: '10px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" aria-hidden="true">
          <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
        </svg>
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '13px' }}>{slideTitle}</span>
      </div>

      {/* Table */}
      <div style={{ flex: 1, padding: '10px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Column headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 108px 108px',
            gap: '6px',
            marginBottom: '6px',
          }}
        >
          <div style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px', paddingLeft: '4px' }}>
            Funcionalidade
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: '10px',
              fontWeight: 700,
              color: '#fff',
              background: accent,
              borderRadius: '6px',
              padding: '4px 4px',
            }}
          >
            Nossa Solução
          </div>
          <div
            style={{
              textAlign: 'center',
              fontSize: '10px',
              fontWeight: 600,
              color: '#6b7280',
              background: '#e5e7eb',
              borderRadius: '6px',
              padding: '4px 4px',
            }}
          >
            Concorrente
          </div>
        </div>

        {/* Feature rows */}
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 108px 108px',
              gap: '6px',
              alignItems: 'center',
              padding: '7px 0',
              borderBottom: i < features.length - 1 ? '1px solid #f0f0f0' : 'none',
            }}
          >
            <div style={{ fontSize: '11px', color: '#374151', fontWeight: 500, paddingLeft: '4px' }}>
              {f.label}
            </div>
            <div
              style={{
                textAlign: 'center',
                background: f.a ? '#f0fdf4' : '#fef2f2',
                borderRadius: '4px',
                padding: '2px',
                border: f.a ? '1px solid #bbf7d0' : '1px solid #fecaca',
              }}
            >
              {f.a ? <Check /> : <Cross />}
            </div>
            <div
              style={{
                textAlign: 'center',
                background: f.b ? '#f0fdf4' : '#fef2f2',
                borderRadius: '4px',
                padding: '2px',
                border: f.b ? '1px solid #bbf7d0' : '1px solid #fecaca',
              }}
            >
              {f.b ? <Check /> : <Cross />}
            </div>
          </div>
        ))}
      </div>

      {/* Winner badge */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '14px',
          background: accent,
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '3px 10px',
          borderRadius: '20px',
          letterSpacing: '0.4px',
        }}
      >
        Vencedor: Nossa Solução
      </div>
    </div>
  );
};
