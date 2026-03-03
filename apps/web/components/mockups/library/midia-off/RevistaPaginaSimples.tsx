'use client';

import React from 'react';

interface RevistaPaginaSimplesProps {
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
}

export const RevistaPaginaSimples: React.FC<RevistaPaginaSimplesProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#2980b9',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Uma página inteira dedicada à sua história';
  const bodyText =
    body ?? caption ?? description ?? text ??
    'Página simples em revista — 60% imagem, 40% mensagem. O espaço ideal para contar quem você é com impacto e elegância.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 340,
        height: 454,
        background: '#f8f8f4',
        fontFamily: '"Georgia", "Times New Roman", serif',
        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        @keyframes rps-in { from { opacity: 0; } to { opacity: 1; } }
        .rps-in { animation: rps-in 0.5s ease both; }
      `}</style>

      {/* Top brand colour rule */}
      <div style={{ height: 5, background: brandColor, flexShrink: 0 }} />

      {/* Image area — 60% height */}
      <div
        style={{
          height: 264,
          background: '#ddd',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
        }}
        className="rps-in"
      >
        {heroImage ? (
          <img
            src={heroImage}
            alt={mainHeadline}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: `linear-gradient(135deg, ${brandColor}22 0%, ${brandColor}55 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="0.9" opacity="0.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span style={{ fontSize: 10, color: brandColor, fontFamily: 'sans-serif', opacity: 0.55 }}>
              Imagem principal
            </span>
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'rgba(0,0,0,0.38)',
            padding: '4px 14px',
          }}
        >
          <span style={{ fontSize: 8, color: '#ddd', fontFamily: 'sans-serif', fontStyle: 'italic' }}>
            Imagem ilustrativa — {brand}
          </span>
        </div>
      </div>

      {/* Text area — 40% height */}
      <div
        style={{
          flex: 1,
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 3, background: brandColor }} />
            <span
              style={{
                fontSize: 8,
                fontFamily: 'sans-serif',
                color: brandColor,
                textTransform: 'uppercase',
                letterSpacing: 1.2,
                fontWeight: 700,
              }}
            >
              {brand}
            </span>
          </div>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: '#111',
              lineHeight: 1.25,
              margin: '0 0 10px',
              letterSpacing: -0.3,
            }}
          >
            {mainHeadline}
          </h2>
          <p style={{ fontSize: 10.5, color: '#444', lineHeight: 1.65, margin: 0 }}>
            {bodyText}
          </p>
        </div>

        {/* Footer row */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 10,
            borderTop: '1px solid #ddd',
          }}
        >
          <button
            type="button"
            aria-label={`Saiba mais sobre ${brand}`}
            style={{
              background: brandColor,
              border: 'none',
              padding: '6px 14px',
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontSize: 9,
                color: '#fff',
                fontFamily: 'sans-serif',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 1,
              }}
            >
              Saiba mais
            </span>
          </button>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8.5, color: '#888', fontFamily: 'sans-serif' }}>(11) 9 9999-0000</div>
            <div style={{ fontSize: 8, color: '#bbb', fontFamily: 'sans-serif', marginTop: 1 }}>
              Página simples 340×454px
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
