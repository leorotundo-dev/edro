'use client';

import React from 'react';

interface RelatorioVisaoProps {
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

export const RelatorioVisao: React.FC<RelatorioVisaoProps> = ({
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
  const pageTitle = headline ?? title ?? 'Visão & Valores';
  const mission = body ?? description ??
    'Ser a empresa de tecnologia mais admirada do Brasil, transformando a vida de pessoas e negócios por meio da inovação responsável.';
  const missionLabel = caption ?? 'Nossa Visão';

  const values = [
    { word: 'Excelência', color: accent },
    { word: 'Inovação', color: '#2563eb' },
    { word: 'Integridade', color: '#7c3aed' },
    { word: 'Pessoas', color: '#16a34a' },
    { word: 'Sustentabilidade', color: '#d97706' },
    { word: 'Colaboração', color: '#dc2626' },
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '9px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px' }}>
              {companyName}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#111827', margin: 0 }}>{pageTitle}</h2>
          </div>
          {/* Logo placeholder */}
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: `${accent}12`,
              border: `1.5px solid ${accent}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.8" aria-hidden="true">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              <path d="M9 22V12h6v10" />
            </svg>
          </div>
        </div>
      </div>

      {/* Mission / Vision statement */}
      <div style={{ padding: '20px 28px', flexShrink: 0 }}>
        <div
          style={{
            background: `${accent}08`,
            borderRadius: '10px',
            padding: '18px 20px',
            border: `1px solid ${accent}22`,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '-10px',
              left: '18px',
              background: '#fff',
              padding: '2px 8px',
              fontSize: '9px',
              fontWeight: 700,
              color: accent,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              border: `1px solid ${accent}33`,
              borderRadius: '20px',
            }}
          >
            {missionLabel}
          </div>
          <p
            style={{
              fontSize: '13px',
              fontStyle: 'italic',
              color: '#374151',
              lineHeight: 1.7,
              margin: '6px 0 0',
              fontWeight: 500,
            }}
          >
            &ldquo;{mission}&rdquo;
          </p>
        </div>
      </div>

      {/* Divider */}
      <div style={{ padding: '0 28px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
          <span style={{ fontSize: '9px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Nossos Valores
          </span>
          <div style={{ flex: 1, height: '1px', background: '#e5e7eb' }} />
        </div>
      </div>

      {/* Values word cards */}
      <div
        style={{
          flex: 1,
          padding: '14px 28px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          alignContent: 'flex-start',
        }}
      >
        {values.map((v, i) => (
          <div
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: `${v.color}0e`,
              border: `1.5px solid ${v.color}30`,
              borderRadius: '8px',
              padding: '8px 14px',
            }}
          >
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: v.color, flexShrink: 0 }} />
            <span style={{ fontSize: '12px', fontWeight: 700, color: v.color }}>{v.word}</span>
          </div>
        ))}
      </div>

      {/* Bottom footer */}
      <div style={{ padding: '10px 28px 14px', flexShrink: 0 }}>
        <div style={{ height: '1px', background: '#f0f0f0', marginBottom: '8px' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '9px', color: '#9ca3af' }}>{companyName} — Relatório Anual 2024</span>
          <span style={{ fontSize: '9px', fontWeight: 700, color: accent }}>Visão 2030</span>
        </div>
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
        Visão
      </div>
    </div>
  );
};
