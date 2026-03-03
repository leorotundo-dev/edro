'use client';

import React from 'react';

interface RelatorioResultadosProps {
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

export const RelatorioResultados: React.FC<RelatorioResultadosProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  brandColor,
  themeColor = '#1E3A5F',
}) => {
  const accent = brandColor ?? themeColor;
  const pageTitle = headline ?? title ?? name ?? username ?? brandName ?? 'Resultados do Exercício';

  const kpis = [
    {
      label: 'Receita Líquida',
      value: 'R$ 847M',
      prev: 'R$ 723M',
      change: '+17,1%',
      up: true,
      color: '#16a34a',
    },
    {
      label: 'EBITDA',
      value: 'R$ 214M',
      prev: 'R$ 178M',
      change: '+20,2%',
      up: true,
      color: '#16a34a',
    },
    {
      label: 'Clientes Ativos',
      value: '2,4M',
      prev: '1,9M',
      change: '+26,3%',
      up: true,
      color: '#16a34a',
    },
    {
      label: 'NPS',
      value: '72 pts',
      prev: '68 pts',
      change: '+4 pts',
      up: true,
      color: '#16a34a',
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
      {/* Top accent bar */}
      <div style={{ height: '5px', background: accent, flexShrink: 0 }} />

      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
          Relatório Anual 2024
        </div>
        <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>{pageTitle}</h2>
        <p style={{ fontSize: '11px', color: '#6b7280', margin: '4px 0 0' }}>
          Comparativo com exercício anterior (2023 vs 2024)
        </p>
      </div>

      {/* KPI cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          padding: '20px 28px',
          flex: 1,
        }}
      >
        {kpis.map((kpi, i) => (
          <div
            key={i}
            style={{
              background: '#f9fafb',
              borderRadius: '10px',
              padding: '16px',
              border: `1px solid ${accent}18`,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#6b7280', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
              {kpi.label}
            </div>

            <div style={{ fontSize: '26px', fontWeight: 900, color: '#111827', lineHeight: 1, marginBottom: '8px' }}>
              {kpi.value}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                2023: {kpi.prev}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: `${kpi.color}14`,
                  borderRadius: '20px',
                  padding: '2px 8px',
                  border: `1px solid ${kpi.color}33`,
                }}
              >
                <span style={{ fontSize: '12px', color: kpi.color, lineHeight: 1 }}>
                  {kpi.up ? '↑' : '↓'}
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: kpi.color }}>
                  {kpi.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Commentary bar */}
      <div
        style={{
          margin: '0 28px 20px',
          padding: '12px 16px',
          background: `${accent}08`,
          borderLeft: `3px solid ${accent}`,
          borderRadius: '0 6px 6px 0',
          flexShrink: 0,
        }}
      >
        <p style={{ fontSize: '11px', color: '#374151', margin: 0, lineHeight: 1.5 }}>
          <strong style={{ color: accent }}>Destaques 2024:</strong> Todos os indicadores-chave superaram as metas estabelecidas no início do exercício, confirmando a solidez da estratégia adotada.
        </p>
      </div>

      {/* Bottom strip */}
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
        Resultados
      </div>
    </div>
  );
};
