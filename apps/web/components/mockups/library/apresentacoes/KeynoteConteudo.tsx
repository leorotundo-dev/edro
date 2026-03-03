'use client';

import React from 'react';

interface KeynoteConteudoProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  themeColor?: string;
}

export const KeynoteConteudo: React.FC<KeynoteConteudoProps> = ({
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  brandColor,
  themeColor,
}) => {
  const accent = brandColor ?? themeColor ?? '#6366F1';
  const resolvedTitle = title ?? headline ?? brandName ?? 'Conteúdo Principal';
  const resolvedBody = body ?? caption ?? description ?? text ?? 'Explore os pilares fundamentais que sustentam nossa abordagem estratégica e impulsionam resultados consistentes.';

  const columns = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" />
        </svg>
      ),
      heading: 'Eficiência Operacional',
      text: 'Processos otimizados que reduzem custos em até 35% sem comprometer qualidade ou escala.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
        </svg>
      ),
      heading: 'Crescimento Acelerado',
      text: 'Estratégias comprovadas que triplicaram o alcance de mercado em 18 meses consecutivos.',
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
      heading: 'Equipe de Alto Impacto',
      text: 'Time multidisciplinar com expertise em tecnologia, marketing e operações integradas.',
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
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: '#ffffff',
      }}
    >
      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: `linear-gradient(90deg, ${accent} 0%, ${accent}50 100%)` }} />

      {/* Background decoration */}
      <div
        style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          background: `${accent}06`,
          pointerEvents: 'none',
        }}
      />

      {/* Header */}
      <div style={{ padding: '20px 28px 0' }}>
        <div style={{ fontSize: '9px', fontWeight: 700, color: accent, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '4px' }}>
          Seção 03
        </div>
        <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a2e', margin: '0 0 4px 0', lineHeight: 1.1 }}>
          {resolvedTitle}
        </h2>
        <p style={{ fontSize: '10px', color: '#666', margin: '0 0 14px 0', lineHeight: 1.5, maxWidth: '420px' }}>
          {resolvedBody}
        </p>
        <div style={{ width: '40px', height: '2px', background: accent, borderRadius: '2px' }} />
      </div>

      {/* 3-column grid */}
      <div
        style={{
          position: 'absolute',
          top: '116px',
          left: '24px',
          right: '24px',
          bottom: '36px',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: '12px',
        }}
      >
        {columns.map((col, i) => (
          <div
            key={i}
            style={{
              background: i === 1 ? accent : '#f8f9fc',
              borderRadius: '10px',
              padding: '14px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              border: i === 1 ? 'none' : `1px solid ${accent}15`,
              boxShadow: i === 1 ? `0 8px 24px ${accent}40` : '0 2px 8px rgba(0,0,0,0.05)',
              transform: i === 1 ? 'translateY(-6px)' : 'none',
            }}
          >
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: i === 1 ? 'rgba(255,255,255,0.2)' : `${accent}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: i === 1 ? '#fff' : accent,
              }}
            >
              {col.icon}
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: i === 1 ? '#fff' : '#1a1a2e', lineHeight: 1.2 }}>
              {col.heading}
            </div>
            <div style={{ fontSize: '9px', color: i === 1 ? 'rgba(255,255,255,0.8)' : '#777', lineHeight: 1.5 }}>
              {col.text}
            </div>
          </div>
        ))}
      </div>

      {/* Slide number bottom-right */}
      <div
        style={{
          position: 'absolute',
          bottom: '10px',
          right: '18px',
          fontSize: '10px',
          color: '#bbb',
          fontWeight: 600,
        }}
      >
        04
      </div>
    </div>
  );
};
