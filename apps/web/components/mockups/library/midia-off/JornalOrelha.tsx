'use client';

import React from 'react';

interface JornalOrelhaProps {
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

export const JornalOrelha: React.FC<JornalOrelhaProps> = ({
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
  brandColor = '#1a1a1a',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Oferta do dia';
  const bodyText = body ?? caption ?? description ?? text ?? 'Promoção exclusiva para leitores';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 120,
        height: 200,
        background: '#faf9f5',
        fontFamily: '"Georgia", "Times New Roman", serif',
        border: '2px solid #222',
        borderBottom: `4px solid ${brandColor}`,
        boxShadow: '2px 2px 12px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        @keyframes jore-in { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
        .jore-in { animation: jore-in 0.4s ease both; }
        @keyframes jore-cta { 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
        .jore-cta { animation: jore-cta 2s ease infinite; }
      `}</style>

      {/* Top brand bar */}
      <div
        style={{
          background: brandColor,
          padding: '5px 8px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
        className="jore-in"
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: 0.3,
            lineHeight: 1.1,
            textAlign: 'center',
          }}
        >
          {brand}
        </div>
        <div
          style={{
            fontSize: 6.5,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: 'sans-serif',
            textTransform: 'uppercase',
            letterSpacing: 0.8,
            marginTop: 2,
          }}
        >
          Publicidade
        </div>
      </div>

      {/* Small product image */}
      <div
        style={{
          width: '100%',
          height: 58,
          background: '#ccc9b8',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
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
              background: 'linear-gradient(180deg,#ccc9b8 0%,#9e9c8e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
        {/* Price badge overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: 3,
            right: 4,
            background: brandColor,
            padding: '1px 5px',
            borderRadius: 1,
          }}
        >
          <span
            style={{
              fontSize: 8,
              fontWeight: 900,
              color: '#fff',
              fontFamily: 'sans-serif',
            }}
          >
            R$ 49,90
          </span>
        </div>
      </div>

      {/* Copy block */}
      <div
        style={{
          flex: 1,
          padding: '6px 7px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ width: 14, height: 2, background: brandColor, marginBottom: 4 }} />
          <h3
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: '#111',
              lineHeight: 1.2,
              margin: '0 0 4px',
              letterSpacing: -0.1,
            }}
          >
            {mainHeadline}
          </h3>
          <p
            style={{
              fontSize: 8,
              color: '#555',
              lineHeight: 1.5,
              margin: 0,
              fontFamily: 'sans-serif',
            }}
          >
            {bodyText}
          </p>
        </div>

        {/* CTA */}
        <button
          type="button"
          aria-label={`Ver oferta — ${brand}`}
          style={{
            background: brandColor,
            border: 'none',
            padding: '4px 6px',
            textAlign: 'center',
            marginTop: 5,
            width: '100%',
            cursor: 'pointer',
          }}
          className="jore-cta"
        >
          <span
            style={{
              fontSize: 7.5,
              color: '#fff',
              fontFamily: 'sans-serif',
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            Ver oferta
          </span>
        </button>
      </div>
    </div>
  );
};
