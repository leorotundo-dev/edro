'use client';

import React from 'react';

interface PosterEducativoProps {
  title?: string;
  headline?: string;
  name?: string;
  username?: string;
  brandName?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  brandColor?: string;
}

export const PosterEducativo: React.FC<PosterEducativoProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  brandColor = '#5D87FF',
}) => {
  const resolvedTitle = title ?? headline ?? 'Aprenda Mais, Esqueça Menos';
  const resolvedSubtitle = description ?? caption ?? 'Técnicas baseadas em neurociência para potencializar seus estudos';
  const resolvedBody = body ?? text ?? 'Combine repetição espaçada, aprendizado ativo e sono de qualidade para transformar informação em conhecimento duradouro.';
  const resolvedAuthor = name ?? username ?? 'Instituto EduCiência';
  const resolvedPublisher = brandName ?? 'EduPress';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const accent = brandColor;

  const stats = [
    { num: '80%', label: 'mais retenção com repetição espaçada' },
    { num: '3×', label: 'melhor desempenho com aprendizado ativo' },
    { num: '40%', label: 'de ganho cognitivo com sono adequado' },
  ];

  return (
    <div
      style={{
        position: 'relative',
        width: '360px',
        height: '480px',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 16px 56px rgba(0,0,0,0.2)',
        fontFamily: 'system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        background: '#0f172a',
      }}
    >
      {/* Top accent bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: `linear-gradient(90deg, ${accent}, #a855f7)`,
          zIndex: 10,
        }}
      />

      {/* Illustration area */}
      <div
        style={{
          height: '160px',
          flexShrink: 0,
          position: 'relative',
          background: resolvedImage
            ? `url(${resolvedImage}) center/cover no-repeat`
            : `linear-gradient(135deg, ${accent}40 0%, #a855f720 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {!resolvedImage && (
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1" opacity="0.4">
            <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" />
            <path d="M12 8v4l3 3" />
          </svg>
        )}
        {/* Gradient fade to dark */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '60px',
            background: 'linear-gradient(to bottom, transparent, #0f172a)',
          }}
        />
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '16px 24px 20px', display: 'flex', flexDirection: 'column' }}>
        {/* Category */}
        <div
          style={{
            display: 'inline-block',
            alignSelf: 'flex-start',
            background: accent,
            color: '#ffffff',
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            padding: '3px 10px',
            borderRadius: '2px',
            marginBottom: '10px',
          }}
        >
          Poster Educativo
        </div>

        {/* Title */}
        <h1
          style={{
            margin: 0,
            fontSize: '22px',
            fontWeight: 900,
            color: '#ffffff',
            lineHeight: 1.15,
            marginBottom: '8px',
          }}
        >
          {resolvedTitle}
        </h1>

        {/* Subtitle */}
        <p
          style={{
            margin: 0,
            fontSize: '11px',
            color: '#94a3b8',
            lineHeight: 1.5,
            marginBottom: '16px',
          }}
        >
          {resolvedSubtitle}
        </p>

        {/* Body */}
        <p
          style={{
            margin: 0,
            fontSize: '12px',
            color: '#cbd5e1',
            lineHeight: 1.65,
            marginBottom: '18px',
          }}
        >
          {resolvedBody}
        </p>

        {/* Stats blocks */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: 'auto' }}>
          {stats.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '8px',
                padding: '10px 8px',
                textAlign: 'center',
                border: `1px solid ${accent}25`,
              }}
            >
              <div style={{ fontSize: '18px', fontWeight: 900, color: accent, lineHeight: 1 }}>
                {s.num}
              </div>
              <div style={{ fontSize: '9px', color: '#94a3b8', lineHeight: 1.3, marginTop: '4px' }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: '16px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '10px', color: '#64748b' }}>{resolvedAuthor}</span>
          <span
            style={{
              fontSize: '9px',
              color: accent,
              fontWeight: 700,
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            {resolvedPublisher}
          </span>
        </div>
      </div>
    </div>
  );
};
