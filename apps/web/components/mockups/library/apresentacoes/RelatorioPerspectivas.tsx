'use client';

import React from 'react';

interface RelatorioPerspectivasProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  brandColor?: string;
  themeColor?: string;
}

export const RelatorioPerspectivas: React.FC<RelatorioPerspectivasProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  brandColor,
  themeColor = '#1E3A5F',
}) => {
  const accent = brandColor ?? themeColor;
  const pageTitle = headline ?? title ?? name ?? username ?? brandName ?? 'Perspectivas 2025';

  const priorities = [
    {
      num: '01',
      title: 'Expansão Internacional',
      detail: 'Abertura de operações em 3 novos países da América Latina',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
        </svg>
      ),
      color: '#2563eb',
    },
    {
      num: '02',
      title: 'Plataforma IA',
      detail: 'Lançamento de módulos de inteligência artificial para todos os produtos',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
        </svg>
      ),
      color: '#7c3aed',
    },
    {
      num: '03',
      title: 'Sustentabilidade',
      detail: 'Meta de neutralidade de carbono até dezembro de 2025',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
      color: '#16a34a',
    },
    {
      num: '04',
      title: 'Crescimento Acelerado',
      detail: 'Projeção de receita de R$ 1 bilhão com margem EBITDA de 28%',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M23 6l-9.5 9.5-5-5L1 18" />
          <path d="M17 6h6v6" />
        </svg>
      ),
      color: accent,
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '420px',
        height: '594px',
        background: '#ffffff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
      }}
    >
      {/* Top bar */}
      <div style={{ height: '5px', background: accent, flexShrink: 0 }} />

      {/* Header */}
      <div
        style={{
          padding: '20px 28px 16px',
          background: `linear-gradient(135deg, ${accent} 0%, ${accent}bb 100%)`,
          flexShrink: 0,
        }}
      >
        <div style={{ fontSize: '9px', fontWeight: 700, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
          Relatório Anual 2024
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', margin: 0 }}>{pageTitle}</h2>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', margin: '5px 0 0' }}>
          Prioridades estratégicas para o próximo exercício
        </p>
      </div>

      {/* Strategic priority cards */}
      <div style={{ flex: 1, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {priorities.map((p, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
              padding: '14px',
              background: '#f9fafb',
              borderRadius: '8px',
              border: `1px solid ${p.color}18`,
              borderLeft: `4px solid ${p.color}`,
            }}
          >
            {/* Icon */}
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: `${p.color}14`,
                color: p.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {p.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ fontSize: '9px', fontWeight: 800, color: p.color, letterSpacing: '0.3px' }}>{p.num}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>{p.title}</span>
              </div>
              <p style={{ fontSize: '10px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{p.detail}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom note */}
      <div style={{ padding: '8px 28px 14px', flexShrink: 0 }}>
        <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
          Projeções sujeitas a revisão trimestral conforme condições de mercado.
        </p>
      </div>

      <div style={{ height: '4px', background: `linear-gradient(90deg, ${accent} 0%, ${accent}44 100%)`, flexShrink: 0 }} />

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'rgba(255,255,255,0.2)',
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: '4px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
          border: '1px solid rgba(255,255,255,0.3)',
        }}
      >
        Perspectivas
      </div>
    </div>
  );
};
