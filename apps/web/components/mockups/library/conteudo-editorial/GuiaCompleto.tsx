'use client';

import React from 'react';

interface GuiaCompletoProps {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  text?: string;
  description?: string;
  caption?: string;
  username?: string;
  brandName?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const GuiaCompleto: React.FC<GuiaCompletoProps> = ({
  headline,
  title,
  name,
  body,
  text,
  description,
  caption,
  username,
  brandName,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#059669',
}) => {
  const resolvedTitle =
    headline || title || 'Guia Completo de Marketing de Conteúdo para 2026';
  const resolvedSubtitle =
    body || text || description || caption ||
    'Tudo que você precisa saber para criar uma estratégia de conteúdo eficaz, do planejamento à distribuição e mensuração de resultados.';
  const resolvedAuthor = name || username || brandName || 'Equipe Editorial';
  const resolvedImage = image || postImage || thumbnail || null;
  const resolvedAvatar = profileImage || null;
  const accent = brandColor || '#059669';

  const chapters = [
    { num: 1, title: 'Fundamentos do Marketing de Conteúdo', time: '12 min' },
    { num: 2, title: 'Definindo sua Estratégia e Personas', time: '18 min' },
    { num: 3, title: 'Criação e Otimização de Conteúdo', time: '25 min' },
    { num: 4, title: 'Distribuição e Amplificação', time: '15 min' },
    { num: 5, title: 'Mensuração de Resultados e ROI', time: '20 min' },
  ];

  return (
    <div
      style={{
        width: '420px',
        background: '#ffffff',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: '0 8px 32px rgba(0,0,0,0.11)',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
        border: '1px solid #e5e7eb',
      }}
    >
      <style>{`
        @keyframes gc-fade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .gc-card { animation: gc-fade 0.4s ease; }
        .gc-chapter:hover { background: #f8fdf9 !important; }
        .gc-chapter { transition: background 0.15s; }
        .gc-dl-btn:hover { opacity: 0.88; transform: translateY(-1px); }
        .gc-dl-btn { transition: opacity 0.2s, transform 0.15s; }
      `}</style>

      <div className="gc-card">
        {/* Hero image */}
        <div
          style={{
            width: '100%',
            height: '180px',
            background: resolvedImage
              ? `url(${resolvedImage}) center/cover no-repeat`
              : `linear-gradient(150deg, ${accent} 0%, ${accent}99 50%, #d1fae5 100%)`,
            position: 'relative',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'flex-start',
            padding: '16px',
          }}
        >
          {/* Guia badge */}
          <div
            style={{
              background: '#fff',
              color: accent,
              fontSize: '11px',
              fontWeight: 800,
              padding: '5px 12px',
              borderRadius: '20px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            Guia Completo
          </div>

          {/* Page count */}
          <div
            style={{
              position: 'absolute',
              bottom: '14px',
              right: '16px',
              background: 'rgba(0,0,0,0.45)',
              color: '#fff',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '12px',
            }}
          >
            90 páginas · PDF
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '18px 22px 0' }}>
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 800,
              color: '#111827',
              lineHeight: 1.3,
              margin: '0 0 8px',
              letterSpacing: '-0.01em',
            }}
          >
            {resolvedTitle}
          </h2>
          <p
            style={{
              fontSize: '12.5px',
              color: '#4b5563',
              lineHeight: 1.6,
              margin: '0 0 16px',
            }}
          >
            {resolvedSubtitle}
          </p>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '16px',
              padding: '10px 14px',
              background: '#f0fdf4',
              borderRadius: '8px',
            }}
          >
            {[
              { icon: '📖', val: '5 capítulos', label: 'de conteúdo' },
              { icon: '⏱', val: '90 min', label: 'leitura total' },
              { icon: '⭐', val: '4.9/5', label: 'avaliação' },
            ].map((s, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: '16px', marginBottom: '1px' }}>{s.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: accent }}>{s.val}</div>
                <div style={{ fontSize: '10px', color: '#6b7280' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Chapter list */}
          <div style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
            Capítulos
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginBottom: '16px' }}>
            {chapters.map((ch) => (
              <div
                key={ch.num}
                className="gc-chapter"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  background: 'transparent',
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    background: `${accent}18`,
                    color: accent,
                    fontSize: '11px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {ch.num}
                </div>
                <span style={{ fontSize: '12.5px', color: '#374151', flex: 1, lineHeight: 1.3 }}>{ch.title}</span>
                <span style={{ fontSize: '10.5px', color: '#9ca3af', flexShrink: 0 }}>{ch.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Author + download */}
        <div
          style={{
            padding: '12px 22px 18px',
            borderTop: '1px solid #f3f4f6',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* Author */}
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              background: resolvedAvatar
                ? `url(${resolvedAvatar}) center/cover no-repeat`
                : `linear-gradient(135deg, ${accent} 0%, ${accent}88 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {!resolvedAvatar && resolvedAuthor.charAt(0)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>{resolvedAuthor}</div>
            <div style={{ fontSize: '10.5px', color: '#9ca3af' }}>3 mar 2026 · Gratuito</div>
          </div>
          <button
            type="button"
            aria-label="Baixar guia completo em PDF"
            className="gc-dl-btn"
            style={{
              background: accent,
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 16px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Baixar PDF
          </button>
        </div>
      </div>
    </div>
  );
};
