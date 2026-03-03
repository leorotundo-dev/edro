'use client';

import React from 'react';

interface KeynoteImagemProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  text?: string;
  caption?: string;
  description?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  themeColor?: string;
}

export const KeynoteImagem: React.FC<KeynoteImagemProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  text,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor,
  themeColor = '#6366F1',
}) => {
  const accent = brandColor ?? themeColor;
  const mainTitle = headline ?? title ?? 'Transformando o Futuro';
  const subText = body ?? text ?? description ?? caption ??
    'Uma visão poderosa que redefine as possibilidades do seu negócio.';
  const photoUrl = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const author = name ?? username ?? brandName ?? '';

  const bullets = [
    'Inovação centrada no cliente',
    'Resultados mensuráveis e reais',
    'Tecnologia de ponta acessível',
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
        flexDirection: 'row',
        userSelect: 'none',
      }}
    >
      {/* Left accent strip */}
      <div
        style={{
          width: '5px',
          background: `linear-gradient(180deg, ${accent} 0%, ${accent}66 100%)`,
          flexShrink: 0,
        }}
      />

      {/* Left text panel — 40% */}
      <div
        style={{
          width: '220px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '24px 20px 24px 16px',
          background: '#ffffff',
        }}
      >
        {/* Category tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: `${accent}14`,
            borderRadius: '20px',
            padding: '2px 10px',
            marginBottom: '12px',
            width: 'fit-content',
          }}
        >
          <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: accent }} />
          <span style={{ fontSize: '8px', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Destaque
          </span>
        </div>

        {/* Headline */}
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 900,
            color: '#111827',
            lineHeight: 1.25,
            margin: '0 0 10px',
          }}
        >
          {mainTitle}
        </h2>

        {/* Sub text */}
        <p
          style={{
            fontSize: '10px',
            color: '#6b7280',
            lineHeight: 1.55,
            margin: '0 0 14px',
          }}
        >
          {subText}
        </p>

        {/* Bullet points */}
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {bullets.map((b, i) => (
            <li
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                fontSize: '10px',
                color: '#374151',
                fontWeight: 500,
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  borderRadius: '50%',
                  background: accent,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  marginTop: '1px',
                }}
              >
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              {b}
            </li>
          ))}
        </ul>

        {/* Author credit */}
        {author && (
          <div style={{ marginTop: '14px', fontSize: '9px', color: '#9ca3af' }}>
            — {author}
          </div>
        )}
      </div>

      {/* Right image panel — 60% */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          background: `${accent}10`,
          overflow: 'hidden',
        }}
      >
        {photoUrl ? (
          <img
            src={photoUrl}
            alt="Imagem principal"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: `linear-gradient(135deg, ${accent}18 0%, ${accent}08 100%)`,
            }}
          >
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={`${accent}55`} strokeWidth="1.2" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            <span style={{ fontSize: '10px', color: `${accent}66`, marginTop: '8px', fontStyle: 'italic' }}>
              Imagem do slide
            </span>
          </div>
        )}

        {/* Caption overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'linear-gradient(0deg, rgba(0,0,0,0.45) 0%, transparent 100%)',
            padding: '20px 12px 8px',
          }}
        >
          <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic' }}>
            {caption ?? 'Imagem ilustrativa'}
          </span>
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
        Imagem
      </div>
    </div>
  );
};
