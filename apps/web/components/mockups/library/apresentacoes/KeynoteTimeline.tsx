'use client';

import React from 'react';

interface KeynoteTimelineProps {
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

export const KeynoteTimeline: React.FC<KeynoteTimelineProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  brandColor,
  themeColor = '#6366F1',
}) => {
  const accent = brandColor ?? themeColor;
  const slideTitle = headline ?? title ?? name ?? username ?? brandName ?? 'Nossa Jornada';

  const milestones = [
    {
      year: '2021',
      event: 'Fundação',
      detail: 'Empresa fundada com foco em inovação digital',
    },
    {
      year: '2022',
      event: 'Primeiro produto',
      detail: 'Lançamento da plataforma principal para o mercado',
    },
    {
      year: '2023',
      event: 'Expansão',
      detail: 'Abertura de novos mercados e parcerias estratégicas',
    },
    {
      year: '2024',
      event: 'Consolidação',
      detail: 'Liderança no setor e crescimento de 87% em receita',
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        background: '#ffffff',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        padding: '20px 24px 20px',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', flexShrink: 0 }}>
        <div style={{ width: '4px', height: '18px', background: accent, borderRadius: '2px' }} />
        <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#111827', margin: 0 }}>{slideTitle}</h2>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2" aria-hidden="true" style={{ marginLeft: '4px' }}>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4l3 3" />
        </svg>
      </div>

      {/* Timeline section */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Horizontal line */}
        <div
          style={{
            position: 'absolute',
            top: '28px',
            left: '28px',
            right: '28px',
            height: '3px',
            background: `linear-gradient(90deg, ${accent} 0%, ${accent}44 100%)`,
            borderRadius: '2px',
          }}
        />

        {/* Milestone nodes + labels */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            position: 'relative',
          }}
        >
          {milestones.map((m, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                width: '110px',
              }}
            >
              {/* Circle node */}
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: i === milestones.length - 1 ? accent : '#fff',
                  border: `3px solid ${accent}`,
                  boxShadow: i === milestones.length - 1 ? `0 0 0 4px ${accent}22` : 'none',
                  zIndex: 1,
                  marginBottom: '10px',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                }}
              />

              {/* Year */}
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 800,
                  color: accent,
                  marginBottom: '4px',
                  lineHeight: 1,
                }}
              >
                {m.year}
              </div>

              {/* Event name */}
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#111827',
                  marginBottom: '4px',
                  textAlign: 'center',
                  lineHeight: 1.3,
                }}
              >
                {m.event}
              </div>

              {/* Detail */}
              <div
                style={{
                  fontSize: '9px',
                  color: '#6b7280',
                  textAlign: 'center',
                  lineHeight: 1.4,
                }}
              >
                {m.detail}
              </div>
            </div>
          ))}
        </div>
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
        Timeline
      </div>
    </div>
  );
};
