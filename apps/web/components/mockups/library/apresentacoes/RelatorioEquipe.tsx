'use client';

import React from 'react';

interface RelatorioEquipeProps {
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

export const RelatorioEquipe: React.FC<RelatorioEquipeProps> = ({
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
  const pageTitle = headline ?? title ?? name ?? username ?? brandName ?? 'Nossa Equipe';
  const employeeQuote = body ?? description ?? caption ??
    'Trabalhar aqui me fez crescer profissionalmente e pessoalmente. O ambiente colaborativo e os desafios constantes me motivam a dar o meu melhor todos os dias.';

  const diversity = [
    { label: 'Mulheres', pct: 47, color: '#8b5cf6' },
    { label: 'LGBTQIA+', pct: 18, color: '#ec4899' },
    { label: 'Pessoas negras', pct: 34, color: '#f59e0b' },
    { label: 'PcD', pct: 5, color: '#10b981' },
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
      <div style={{ padding: '20px 28px 14px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
          Relatório Anual 2024
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>{pageTitle}</h2>
      </div>

      {/* Headcount highlight */}
      <div
        style={{
          padding: '18px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          background: `${accent}06`,
          flexShrink: 0,
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '52px', fontWeight: 900, color: accent, lineHeight: 1 }}>4.287</div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Colaboradores
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {[
            { label: 'Admissões em 2024', val: '+612' },
            { label: 'Índice de retenção', val: '91%' },
            { label: 'Horas de treinamento / colaborador', val: '48h' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span style={{ fontSize: '10px', color: '#374151' }}>{s.label}</span>
              <span style={{ fontSize: '11px', fontWeight: 700, color: accent }}>{s.val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Diversity stats */}
      <div style={{ padding: '14px 28px', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '10px' }}>
          Diversidade & Inclusão
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
          {diversity.map((d, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              {/* Circular stat */}
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: `${d.color}14`,
                  border: `3px solid ${d.color}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 6px',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 900, color: d.color }}>{d.pct}%</span>
              </div>
              <div style={{ fontSize: '9px', color: '#374151', lineHeight: 1.3, fontWeight: 600 }}>{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Employee quote */}
      <div style={{ flex: 1, padding: '0 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div
          style={{
            padding: '14px 18px',
            background: `${accent}06`,
            borderLeft: `3px solid ${accent}`,
            borderRadius: '0 8px 8px 0',
          }}
        >
          <p style={{ fontSize: '11px', fontStyle: 'italic', color: '#374151', margin: '0 0 8px', lineHeight: 1.6 }}>
            &ldquo;{employeeQuote}&rdquo;
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `${accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill={accent} aria-hidden="true">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
            <div style={{ fontSize: '10px', color: '#6b7280' }}>Colaboradora, Equipe de Tecnologia</div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div style={{ padding: '14px 28px 16px', flexShrink: 0 }}>
        <div style={{ height: '1px', background: '#f0f0f0', marginBottom: '8px' }} />
        <p style={{ fontSize: '9px', color: '#9ca3af', margin: 0, fontStyle: 'italic' }}>
          Dados referentes a dezembro de 2024. Pesquisa de clima com 92% de participação.
        </p>
      </div>

      <div style={{ height: '4px', background: `linear-gradient(90deg, ${accent} 0%, ${accent}44 100%)`, flexShrink: 0 }} />

      {/* Slide label */}
      <div
        style={{
          position: 'absolute',
          top: '13px',
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
        Equipe
      </div>
    </div>
  );
};
