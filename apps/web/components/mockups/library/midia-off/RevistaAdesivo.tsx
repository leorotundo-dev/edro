'use client';

import React from 'react';

interface RevistaAdesivoProps {
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

export const RevistaAdesivo: React.FC<RevistaAdesivoProps> = ({
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
  brandColor = '#f39c12',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Encarte adesivo';
  const bodyText =
    body ?? caption ?? description ?? text ??
    'Inserção destacável com canto dobrado. Alta memorabilidade e interatividade.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 220,
        height: 220,
        background: '#fff',
        fontFamily: '"Georgia", "Times New Roman", serif',
        boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
        overflow: 'hidden',
        position: 'relative',
        borderRadius: 6,
      }}
    >
      <style>{`
        @keyframes rads-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .rads-in { animation: rads-in 0.45s ease both; }
      `}</style>

      {/* Bright background */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(135deg, #fff 0%, ${brandColor}18 100%)`,
          zIndex: 0,
        }}
      />

      {/* Peel corner effect — bottom-right triangle */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderWidth: '0 0 36px 36px',
          borderColor: `transparent transparent #d0cfc0 transparent`,
          zIndex: 4,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 4,
          right: 4,
          width: 0,
          height: 0,
          borderStyle: 'solid',
          borderWidth: '0 0 28px 28px',
          borderColor: `transparent transparent rgba(0,0,0,0.07) transparent`,
          zIndex: 3,
        }}
      />

      {/* Main content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          padding: '14px 14px 18px',
        }}
        className="rads-in"
      >
        {/* Top brand strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: brandColor,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {brand}
          </div>
          <div
            style={{
              fontSize: 7,
              color: '#bbb',
              fontFamily: 'sans-serif',
              textTransform: 'uppercase',
              letterSpacing: 1,
            }}
          >
            Adesivo
          </div>
        </div>

        {/* Image */}
        <div
          style={{
            width: '100%',
            height: 90,
            background: '#f0ede0',
            overflow: 'hidden',
            borderRadius: 4,
            marginBottom: 10,
            flexShrink: 0,
          }}
        >
          {heroImage ? (
            <img
              src={heroImage}
              alt={mainHeadline}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', borderRadius: 4 }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `linear-gradient(135deg, ${brandColor}22 0%, ${brandColor}44 100%)`,
                borderRadius: 4,
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1.1" opacity="0.55">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>

        {/* Headline */}
        <h2
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: '#111',
            lineHeight: 1.2,
            margin: '0 0 5px',
            letterSpacing: -0.1,
          }}
        >
          {mainHeadline}
        </h2>
        <p style={{ fontSize: 8.5, color: '#555', lineHeight: 1.5, margin: '0 0 10px', fontFamily: 'sans-serif' }}>
          {bodyText}
        </p>

        {/* Bottom CTA row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <button
            type="button"
            aria-label={`Ver mais — ${brand}`}
            style={{
              background: brandColor,
              border: 'none',
              padding: '5px 12px',
              borderRadius: 3,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                fontSize: 8.5,
                color: '#fff',
                fontFamily: 'sans-serif',
                fontWeight: 700,
              }}
            >
              Ver mais
            </span>
          </button>
          <span style={{ fontSize: 8, color: '#bbb', fontFamily: 'sans-serif' }}>220×220px</span>
        </div>
      </div>
    </div>
  );
};
