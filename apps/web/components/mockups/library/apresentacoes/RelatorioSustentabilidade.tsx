'use client';

import React from 'react';

interface RelatorioSustentabilidadeProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  brandColor?: string;
  themeColor?: string;
}

export const RelatorioSustentabilidade: React.FC<RelatorioSustentabilidadeProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  brandColor,
  themeColor = '#1E3A5F',
}) => {
  const accent = brandColor ?? themeColor;
  const pageTitle = headline ?? title ?? name ?? username ?? brandName ?? 'ESG & Sustentabilidade';

  const pillars = [
    {
      key: 'E',
      label: 'Ambiental',
      color: '#16a34a',
      bg: '#f0fdf4',
      border: '#bbf7d0',
      goals: [
        { text: 'Redução de CO₂', pct: 78 },
        { text: 'Resíduos zerados', pct: 62 },
        { text: 'Energia renovável', pct: 91 },
      ],
    },
    {
      key: 'S',
      label: 'Social',
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
      goals: [
        { text: 'Treinamentos D&I', pct: 88 },
        { text: 'Fornecedores locais', pct: 55 },
        { text: 'Voluntariado', pct: 43 },
      ],
    },
    {
      key: 'G',
      label: 'Governança',
      color: accent,
      bg: `${accent}08`,
      border: `${accent}33`,
      goals: [
        { text: 'Políticas anticorrupção', pct: 100 },
        { text: 'Conselheiros independentes', pct: 60 },
        { text: 'Relatório integrado', pct: 100 },
      ],
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
      <div style={{ height: '5px', background: 'linear-gradient(90deg, #16a34a 0%, #2563eb 50%, ' + accent + ' 100%)', flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '20px 28px 14px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
          Relatório Anual 2024
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>{pageTitle}</h2>
      </div>

      {/* CO2 reduction highlight */}
      <div
        style={{
          padding: '12px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          background: '#f0fdf4',
          borderBottom: '1px solid #bbf7d0',
          flexShrink: 0,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.8" aria-hidden="true">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        <div>
          <span style={{ fontSize: '22px', fontWeight: 900, color: '#16a34a' }}>-32%</span>
          <span style={{ fontSize: '11px', color: '#374151', marginLeft: '8px' }}>de emissões de CO₂ em 2024 vs. 2020</span>
        </div>
      </div>

      {/* 3 pillars */}
      <div style={{ flex: 1, padding: '14px 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {pillars.map((pillar) => (
          <div
            key={pillar.key}
            style={{
              background: pillar.bg,
              border: `1px solid ${pillar.border}`,
              borderRadius: '8px',
              padding: '12px 14px',
            }}
          >
            {/* Pillar header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '6px',
                  background: pillar.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: 900,
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {pillar.key}
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>{pillar.label}</span>
            </div>

            {/* Goal progress bars */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              {pillar.goals.map((goal, j) => (
                <div key={j}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontSize: '9px', color: '#374151' }}>{goal.text}</span>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: pillar.color }}>{goal.pct}%</span>
                  </div>
                  <div style={{ height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${goal.pct}%`,
                        background: pillar.color,
                        borderRadius: '2px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom strip */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #16a34a 0%, #2563eb 50%, ' + accent + ' 100%)', flexShrink: 0 }} />

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          top: '13px',
          right: '10px',
          background: '#16a34a',
          color: '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 7px',
          borderRadius: '4px',
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        ESG
      </div>
    </div>
  );
};
