'use client';

import React from 'react';

interface RevistaColunaProps {
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

export const RevistaColuna: React.FC<RevistaColunaProps> = ({
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
  brandColor = '#1abc9c',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Coluna lateral';
  const bodyText =
    body ?? caption ?? description ?? text ??
    'Anúncio estreito de coluna — 120×454px. Formato vertical máximo para presença editorial contínua.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 120,
        height: 454,
        background: '#f8f8f4',
        fontFamily: '"Georgia", "Times New Roman", serif',
        boxShadow: '0 6px 20px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        border: `1px solid #e0e0d8`,
        borderTop: `5px solid ${brandColor}`,
      }}
    >
      <style>{`
        @keyframes rcol-in { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
        .rcol-in { animation: rcol-in 0.45s ease both; }
        @keyframes rcol-cta { 0%,100%{opacity:1} 50%{opacity:0.8} }
        .rcol-cta { animation: rcol-cta 2.5s ease infinite; }
      `}</style>

      {/* Brand header */}
      <div
        style={{
          background: brandColor,
          padding: '8px 6px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        className="rcol-in"
      >
        <div
          style={{
            fontSize: 9,
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
            fontSize: 6,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: 'sans-serif',
            marginTop: 3,
            textTransform: 'uppercase',
            letterSpacing: 0.8,
          }}
        >
          Coluna
        </div>
      </div>

      {/* Image */}
      <div
        style={{
          width: '100%',
          height: 120,
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
              background: `linear-gradient(180deg, ${brandColor}22 0%, ${brandColor}44 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.1" opacity="0.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Rotated concept label */}
      <div
        style={{
          padding: '8px 6px 4px',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            fontSize: 7,
            fontFamily: 'sans-serif',
            color: brandColor,
            textTransform: 'uppercase',
            letterSpacing: 2,
            fontWeight: 700,
            height: 80,
          }}
        >
          {mainHeadline}
        </div>
      </div>

      {/* Body copy */}
      <div
        style={{
          flex: 1,
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <p style={{ fontSize: 8, color: '#444', lineHeight: 1.6, margin: 0 }}>
          {bodyText}
        </p>

        {/* Price */}
        <div
          style={{
            textAlign: 'center',
            padding: '5px 4px',
            background: '#fff8ee',
            border: `1px solid ${brandColor}`,
            marginBottom: 6,
          }}
        >
          <div style={{ fontSize: 7, color: '#aaa', textDecoration: 'line-through', fontFamily: 'sans-serif' }}>
            R$ 299
          </div>
          <div style={{ fontSize: 14, fontWeight: 900, color: brandColor, lineHeight: 1 }}>
            R$ 199
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          aria-label={`Ver oferta de ${brand}`}
          style={{
            background: brandColor,
            border: 'none',
            padding: '6px 4px',
            width: '100%',
            cursor: 'pointer',
          }}
          className="rcol-cta"
        >
          <span
            style={{
              fontSize: 7.5,
              color: '#fff',
              fontFamily: 'sans-serif',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            Ver oferta
          </span>
        </button>

        <div
          style={{
            fontSize: 7,
            color: '#bbb',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            marginTop: 5,
            lineHeight: 1.4,
          }}
        >
          (11) 9 9999-0000
        </div>
      </div>

      {/* Bottom strip */}
      <div
        style={{
          height: 16,
          background: '#111',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 6.5, color: '#888', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          120×454px
        </span>
      </div>
    </div>
  );
};
