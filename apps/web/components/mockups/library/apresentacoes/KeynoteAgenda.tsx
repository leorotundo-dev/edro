'use client';

import React from 'react';

interface KeynoteAgendaProps {
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

export const KeynoteAgenda: React.FC<KeynoteAgendaProps> = ({
  name,
  username,
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
  const resolvedTitle = title ?? headline ?? brandName ?? 'Agenda da Apresentação';
  const resolvedBody = body ?? caption ?? description ?? text ?? '';

  const topics = [
    'Introdução e contexto do projeto',
    'Análise de mercado e oportunidades',
    'Nossa proposta de valor e diferenciais',
    'Resultados e métricas alcançadas',
    'Próximos passos e chamada para ação',
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '560px',
        height: '315px',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        background: '#ffffff',
      }}
    >
      {/* Left accent panel */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '6px',
          height: '100%',
          background: accent,
        }}
      />

      {/* Top header area */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '6px',
          right: 0,
          height: '72px',
          background: `linear-gradient(90deg, ${accent}18 0%, transparent 100%)`,
          borderBottom: `1px solid ${accent}20`,
          display: 'flex',
          alignItems: 'center',
          padding: '0 28px',
          gap: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: accent,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
        </div>
        <div>
          <div style={{ fontSize: '10px', fontWeight: 600, color: accent, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
            O que veremos hoje
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#1a1a2e', margin: 0, lineHeight: 1.1 }}>
            {resolvedTitle}
          </h2>
        </div>
      </div>

      {/* Topics list */}
      <div
        style={{
          position: 'absolute',
          top: '80px',
          left: '34px',
          right: '28px',
          bottom: '44px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '4px',
        }}
      >
        {topics.map((topic, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              borderRadius: '8px',
              background: i === 0 ? `${accent}12` : 'transparent',
              border: `1px solid ${i === 0 ? accent + '40' : '#f0f0f0'}`,
            }}
          >
            {/* Number badge */}
            <div
              style={{
                minWidth: '26px',
                height: '26px',
                borderRadius: '50%',
                background: i === 0 ? accent : `${accent}20`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 800,
                color: i === 0 ? '#fff' : accent,
              }}
            >
              {i + 1}
            </div>
            {/* Left accent bar */}
            <div
              style={{
                width: '3px',
                height: '28px',
                borderRadius: '2px',
                background: i === 0 ? accent : `${accent}30`,
              }}
            />
            <span
              style={{
                fontSize: '12px',
                fontWeight: i === 0 ? 700 : 500,
                color: i === 0 ? '#1a1a2e' : '#555',
                lineHeight: 1.3,
              }}
            >
              {topic}
            </span>
          </div>
        ))}
      </div>

      {/* Bottom progress dots */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              width: i === 1 ? '20px' : '7px',
              height: '7px',
              borderRadius: '4px',
              background: i === 1 ? accent : `${accent}30`,
            }}
          />
        ))}
      </div>

      {/* Slide number */}
      <div
        style={{
          position: 'absolute',
          bottom: '14px',
          right: '18px',
          fontSize: '10px',
          color: '#aaa',
          fontWeight: 500,
        }}
      >
        02
      </div>
    </div>
  );
};
