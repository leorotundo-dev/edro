'use client';

import React from 'react';

interface SlideConteudoProps {
  title?: string;
  headline?: string;
  name?: string;
  username?: string;
  brandName?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  brandColor?: string;
}

export const SlideConteudo: React.FC<SlideConteudoProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#5D87FF',
}) => {
  const resolvedTitle = title ?? headline ?? 'Derivadas e suas Aplicações';
  const resolvedInstitution = brandName ?? name ?? username ?? 'EduTech';
  const resolvedNote = description ?? caption ?? body ?? text ?? 'A derivada mede a taxa de variação instantânea de uma função.';
  const accent = brandColor;

  const bullets = [
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
      title: 'Conceito de derivada',
      detail: 'Limite do quociente de diferenças quando Δx → 0. Representa a inclinação da reta tangente ao gráfico.',
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
        </svg>
      ),
      title: 'Regras de derivação',
      detail: 'Regra da potência, produto, quociente e cadeia. Cada regra simplifica o cálculo para classes específicas de funções.',
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
        </svg>
      ),
      title: 'Pontos críticos',
      detail: 'Onde f\'(x) = 0 ou f\'(x) não existe. Usados para encontrar máximos e mínimos locais da função.',
    },
    {
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
        </svg>
      ),
      title: 'Aplicações práticas',
      detail: 'Otimização de custos, velocidade instantânea em física, taxa de crescimento em economia e biologia.',
    },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.14)',
        fontFamily: 'system-ui, sans-serif',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header with left accent bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
        }}
      >
        <div style={{ width: '5px', background: accent, flexShrink: 0 }} />
        <div
          style={{
            flex: 1,
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h1 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>
            {resolvedTitle}
          </h1>
          <span style={{ fontSize: '10px', color: '#94a3b8', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {resolvedInstitution}
          </span>
        </div>
      </div>

      {/* Bullet points — 2 columns */}
      <div
        style={{
          flex: 1,
          padding: '16px 20px 10px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '10px',
          alignContent: 'start',
        }}
      >
        {bullets.map((b, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
              background: '#f8fafc',
              borderRadius: '8px',
              padding: '10px 12px',
              borderLeft: `3px solid ${accent}`,
            }}
          >
            <div
              style={{
                color: accent,
                flexShrink: 0,
                marginTop: '1px',
              }}
            >
              {b.icon}
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b', marginBottom: '3px' }}>
                {b.title}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', lineHeight: 1.45 }}>
                {b.detail}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Note bar */}
      <div
        style={{
          padding: '8px 20px 8px 25px',
          background: `${accent}0c`,
          borderTop: `1px solid ${accent}20`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <span style={{ fontSize: '10px', color: '#475569', fontStyle: 'italic' }}>{resolvedNote}</span>
      </div>

      {/* Slide number */}
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '12px',
          fontSize: '10px',
          color: '#cbd5e1',
          fontWeight: 700,
        }}
      >
        02
      </div>
    </div>
  );
};
