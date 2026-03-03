'use client';

import React from 'react';

interface EbookIndiceProps {
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

export const EbookIndice: React.FC<EbookIndiceProps> = ({
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
  const resolvedTitle = title ?? headline ?? 'Índice';
  const resolvedSubtitle = description ?? caption ?? body ?? text ?? 'Conteúdo do E-book';
  const resolvedPublisher = brandName ?? name ?? username ?? 'EduPress';
  const accent = brandColor;

  const chapters = [
    { num: '01', title: 'Introdução ao Aprendizado Acelerado', page: 12 },
    { num: '02', title: 'Bases Neurocientíficas da Memória', page: 28 },
    { num: '03', title: 'Técnicas de Repetição Espaçada', page: 47 },
    { num: '04', title: 'Mapas Mentais e Conexões Cognitivas', page: 68 },
    { num: '05', title: 'Rotina de Estudos de Alta Performance', page: 89 },
    { num: '06', title: 'Avaliação e Ajuste do Método', page: 112 },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: '560px',
        minHeight: '420px',
        background: '#ffffff',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: accent,
          padding: '28px 36px 24px',
        }}
      >
        <div
          style={{
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.7)',
            marginBottom: '6px',
          }}
        >
          {resolvedSubtitle}
        </div>
        <h1
          style={{
            margin: 0,
            fontSize: '28px',
            fontWeight: 900,
            color: '#ffffff',
            letterSpacing: '-0.5px',
          }}
        >
          {resolvedTitle}
        </h1>
      </div>

      {/* Chapter list */}
      <div style={{ padding: '8px 36px 24px' }}>
        {chapters.map((ch, i) => (
          <div
            key={ch.num}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '0',
              padding: '12px 0',
              borderBottom: i < chapters.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}
          >
            {/* Chapter number */}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: accent,
                minWidth: '28px',
                flexShrink: 0,
              }}
            >
              {ch.num}
            </span>

            {/* Chapter title */}
            <span
              style={{
                fontSize: '13px',
                color: '#1f2937',
                fontWeight: 500,
                flex: 1,
              }}
            >
              {ch.title}
            </span>

            {/* Dot leaders */}
            <span
              style={{
                flex: 1,
                borderBottom: '2px dotted #d1d5db',
                margin: '0 8px',
                minWidth: '20px',
                position: 'relative',
                top: '-4px',
              }}
            />

            {/* Page number */}
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: accent,
                minWidth: '28px',
                textAlign: 'right',
                flexShrink: 0,
              }}
            >
              {ch.page}
            </span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '10px 36px',
          borderTop: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '10px', color: '#9ca3af', letterSpacing: '1px', textTransform: 'uppercase' }}>
          {resolvedPublisher}
        </span>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>
          {chapters.length} capítulos
        </span>
      </div>
    </div>
  );
};
