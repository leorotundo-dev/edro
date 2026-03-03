'use client';

import React from 'react';

interface RelatorioContracapaProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  description?: string;
  caption?: string;
  brandColor?: string;
  themeColor?: string;
}

export const RelatorioContracapa: React.FC<RelatorioContracapaProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  description,
  caption,
  brandColor,
  themeColor = '#1E3A5F',
}) => {
  const accent = brandColor ?? themeColor;
  const companyName = brandName ?? name ?? username ?? 'Empresa S.A.';
  const mission = body ?? description ??
    'Gerar valor sustentável para nossos clientes, colaboradores e acionistas por meio de inovação responsável e excelência operacional.';
  const sub = headline ?? title ?? caption ?? 'Nossa missão';

  const values = [
    {
      label: 'Integridade',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      ),
    },
    {
      label: 'Inovação',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      ),
    },
    {
      label: 'Pessoas',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
        </svg>
      ),
    },
  ];

  const toc = [
    { num: '01', section: 'Mensagem do Presidente', page: '4' },
    { num: '02', section: 'Resultados do Exercício', page: '8' },
    { num: '03', section: 'Demonstrações Financeiras', page: '14' },
    { num: '04', section: 'Governança Corporativa', page: '22' },
    { num: '05', section: 'Relatório de Sustentabilidade', page: '28' },
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
      {/* Top accent bar */}
      <div style={{ height: '6px', background: accent, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '24px 28px 16px', flexShrink: 0, borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ fontSize: '10px', fontWeight: 700, color: accent, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>
          {companyName}
        </div>
        <div style={{ fontSize: '11px', color: '#6b7280' }}>Relatório Anual 2024</div>
      </div>

      {/* Mission section */}
      <div style={{ padding: '24px 28px', flexShrink: 0 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: `${accent}10`,
            borderRadius: '4px',
            padding: '3px 10px',
            marginBottom: '12px',
          }}
        >
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: accent }} />
          <span style={{ fontSize: '9px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {sub}
          </span>
        </div>
        <p
          style={{
            fontSize: '13px',
            color: '#374151',
            lineHeight: 1.65,
            margin: 0,
            fontStyle: 'italic',
            fontWeight: 400,
          }}
        >
          &ldquo;{mission}&rdquo;
        </p>
      </div>

      {/* Core values — 3 pillars */}
      <div style={{ padding: '0 28px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
          Valores Fundamentais
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {values.map((v, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: '#f9fafb',
                borderRadius: '8px',
                padding: '14px 10px',
                textAlign: 'center',
                border: `1px solid ${accent}22`,
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '50%',
                  background: `${accent}14`,
                  color: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 8px',
                }}
              >
                {v.icon}
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#111827' }}>{v.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table of contents preview */}
      <div style={{ flex: 1, padding: '0 28px 20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '8px' }}>
          Sumário
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {toc.map((item, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '5px 0',
                borderBottom: i < toc.length - 1 ? '1px dotted #e5e7eb' : 'none',
              }}
            >
              <span style={{ fontSize: '10px', fontWeight: 700, color: accent, width: '20px', flexShrink: 0 }}>{item.num}</span>
              <span style={{ flex: 1, fontSize: '10px', color: '#374151' }}>{item.section}</span>
              <span style={{ fontSize: '9px', color: '#9ca3af', fontWeight: 600 }}>{item.page}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          height: '4px',
          background: `linear-gradient(90deg, ${accent} 0%, ${accent}44 100%)`,
          flexShrink: 0,
        }}
      />

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          top: '14px',
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
        Contracapa
      </div>
    </div>
  );
};
