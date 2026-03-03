'use client';

import React from 'react';

interface KeynoteDadosProps {
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

export const KeynoteDados: React.FC<KeynoteDadosProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  text,
  caption,
  description,
  brandColor,
  themeColor = '#6366F1',
}) => {
  const accent = brandColor ?? themeColor;
  const slideTitle = headline ?? title ?? 'Números que Impressionam';
  const source = body ?? text ?? caption ?? description ?? name ?? username ?? brandName ?? 'Fonte: Pesquisa Interna 2024';

  const stats = [
    {
      value: '+87%',
      label: 'Crescimento',
      sub: 'em 12 meses',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M23 6l-9.5 9.5-5-5L1 18" />
          <path d="M17 6h6v6" />
        </svg>
      ),
      bg: `${accent}18`,
      color: accent,
    },
    {
      value: '2.4M',
      label: 'Usuários ativos',
      sub: 'em todo o Brasil',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
      bg: '#f0fdf4',
      color: '#16a34a',
    },
    {
      value: '98%',
      label: 'Satisfação',
      sub: 'NPS líder do setor',
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <path d="M22 4L12 14.01l-3-3" />
        </svg>
      ),
      bg: '#fffbeb',
      color: '#d97706',
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        background: '#f8f9fa',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Header */}
      <div style={{ padding: '16px 24px 8px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
          <div style={{ width: '4px', height: '18px', background: accent, borderRadius: '2px' }} />
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#111827', margin: 0 }}>
            {slideTitle}
          </h2>
        </div>
      </div>

      {/* Stats grid */}
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '12px',
          padding: '8px 20px 12px',
          alignItems: 'stretch',
        }}
      >
        {stats.map((stat, i) => (
          <div
            key={i}
            style={{
              background: stat.bg,
              borderRadius: '10px',
              padding: '16px 14px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              border: `1px solid ${stat.color}22`,
            }}
          >
            <div style={{ color: stat.color, marginBottom: '8px' }}>{stat.icon}</div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 900,
                color: stat.color,
                lineHeight: 1.1,
                marginBottom: '4px',
              }}
            >
              {stat.value}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '2px' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '9px', color: '#9ca3af' }}>{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Source citation */}
      <div
        style={{
          padding: '6px 24px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          flexShrink: 0,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <span style={{ fontSize: '9px', color: '#9ca3af', fontStyle: 'italic' }}>{source}</span>
      </div>

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: accent,
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: '4px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        Dados
      </div>
    </div>
  );
};
