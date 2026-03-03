'use client';

import React from 'react';

interface RevistaQuartoPaginaProps {
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

export const RevistaQuartoPagina: React.FC<RevistaQuartoPaginaProps> = ({
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
  brandColor = '#2c3e50',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Sua marca aqui';
  const bodyText =
    body ?? caption ?? description ?? text ??
    'Anúncio vertical de coluna lateral — formato tall narrow ideal para sidebar editorial.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 165,
        height: 454,
        background: '#f8f8f4',
        fontFamily: '"Georgia", "Times New Roman", serif',
        boxShadow: '0 6px 22px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid #e0e0d8`,
      }}
    >
      <style>{`
        @keyframes rqto-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .rqto-in { animation: rqto-in 0.45s ease both; }
        @keyframes rqto-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
        .rqto-cta { animation: rqto-pulse 2s ease infinite; }
      `}</style>

      {/* Top brand bar */}
      <div
        style={{
          background: brandColor,
          padding: '8px 10px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        className="rqto-in"
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: 0.3,
            textAlign: 'center',
            lineHeight: 1.1,
          }}
        >
          {brand}
        </div>
        <div
          style={{
            fontSize: 6.5,
            color: 'rgba(255,255,255,0.5)',
            fontFamily: 'sans-serif',
            marginTop: 3,
            textTransform: 'uppercase',
            letterSpacing: 1,
          }}
        >
          ¼ pág. vertical
        </div>
      </div>

      {/* Image */}
      <div
        style={{
          width: '100%',
          height: 155,
          background: '#ccc',
          overflow: 'hidden',
          flexShrink: 0,
        }}
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
              background: `linear-gradient(160deg, ${brandColor}22 0%, ${brandColor}55 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.1" opacity="0.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Body copy */}
      <div
        style={{
          flex: 1,
          padding: '10px 10px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ width: 18, height: 3, background: brandColor, marginBottom: 7 }} />
          <h2
            style={{
              fontSize: 12,
              fontWeight: 900,
              color: '#111',
              lineHeight: 1.3,
              margin: '0 0 7px',
              letterSpacing: -0.1,
            }}
          >
            {mainHeadline}
          </h2>
          <p style={{ fontSize: 8.5, color: '#444', lineHeight: 1.6, margin: 0 }}>
            {bodyText}
          </p>
        </div>

        {/* Price badge */}
        <div
          style={{
            textAlign: 'center',
            background: '#fff8ee',
            border: `1px solid ${brandColor}`,
            padding: '5px 6px',
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 7.5, color: '#999', textDecoration: 'line-through', fontFamily: 'sans-serif' }}>
            R$ 299,90
          </div>
          <div style={{ fontSize: 16, fontWeight: 900, color: brandColor }}>
            R$ 199,90
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          aria-label={`Comprar de ${brand}`}
          style={{
            background: brandColor,
            border: 'none',
            padding: '7px 6px',
            width: '100%',
            cursor: 'pointer',
          }}
          className="rqto-cta"
        >
          <span
            style={{
              fontSize: 9,
              color: '#fff',
              fontFamily: 'sans-serif',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
            }}
          >
            Comprar
          </span>
        </button>

        {/* Contact */}
        <div
          style={{
            fontSize: 7.5,
            color: '#bbb',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            marginTop: 5,
          }}
        >
          (11) 9 9999-0000
        </div>
      </div>
    </div>
  );
};
