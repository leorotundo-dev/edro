'use client';

import React from 'react';

interface RevistaMeiaPaginaProps {
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

export const RevistaMeiaPagina: React.FC<RevistaMeiaPaginaProps> = ({
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
  brandColor = '#16a085',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Metade da página, o dobro de impacto';
  const bodyText =
    body ?? caption ?? description ?? text ??
    'O anúncio de meia página combina visibilidade com custo-benefício. Ideal para lançamentos, ofertas e reforço de marca em contexto editorial.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 340,
        height: 220,
        background: '#f8f8f4',
        fontFamily: '"Georgia", "Times New Roman", serif',
        boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'row',
        border: `1px solid #e0e0d8`,
      }}
    >
      <style>{`
        @keyframes rmp-in { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        .rmp-in { animation: rmp-in 0.45s ease both; }
      `}</style>

      {/* Left image column */}
      <div
        style={{
          width: 148,
          flexShrink: 0,
          background: '#ccc',
          overflow: 'hidden',
          position: 'relative',
        }}
        className="rmp-in"
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
              background: `linear-gradient(160deg, ${brandColor}33 0%, ${brandColor}77 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1" opacity="0.55">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span style={{ fontSize: 8.5, color: brandColor, fontFamily: 'sans-serif', opacity: 0.6 }}>
              Imagem
            </span>
          </div>
        )}
        {/* Left brand accent strip */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: 4,
            background: brandColor,
          }}
        />
      </div>

      {/* Right text column */}
      <div
        style={{
          flex: 1,
          padding: '16px 16px 12px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderLeft: '1px solid #e8e8e0',
        }}
      >
        <div>
          {/* Brand tag */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 9 }}>
            <div style={{ width: 22, height: 3, background: brandColor }} />
            <span
              style={{
                fontSize: 7.5,
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

          {/* Headline */}
          <h2
            style={{
              fontSize: 14,
              fontWeight: 900,
              color: '#111',
              lineHeight: 1.25,
              margin: '0 0 9px',
              letterSpacing: -0.2,
            }}
          >
            {mainHeadline}
          </h2>

          {/* Body */}
          <p style={{ fontSize: 9.5, color: '#444', lineHeight: 1.65, margin: 0 }}>
            {bodyText}
          </p>
        </div>

        {/* Footer */}
        <div>
          {/* Offer badge */}
          <div
            style={{
              display: 'inline-block',
              background: brandColor,
              padding: '3px 10px',
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 8.5,
                color: '#fff',
                fontFamily: 'sans-serif',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
              }}
            >
              Meia Página
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif' }}>
              (11) 9 9999-0000
            </span>
            <button
              type="button"
              aria-label={`Ver mais sobre ${brand}`}
              style={{
                border: `1px solid ${brandColor}`,
                background: 'transparent',
                padding: '3px 9px',
                cursor: 'pointer',
              }}
            >
              <span
                style={{
                  fontSize: 8,
                  color: brandColor,
                  fontFamily: 'sans-serif',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                }}
              >
                Ver mais
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
