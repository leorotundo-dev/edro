'use client';

import React from 'react';

interface RevistaOrelhaProps {
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

export const RevistaOrelha: React.FC<RevistaOrelhaProps> = ({
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
  brandColor = '#9b59b6',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Orelha';
  const bodyText =
    body ?? caption ?? description ?? text ??
    'Tira ultra-estreita de presença editorial contínua ao longo de toda a página.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        width: 80,
        height: 454,
        background: brandColor,
        fontFamily: '"Georgia", "Times New Roman", serif',
        boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes rore-in { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
        .rore-in { animation: rore-in 0.4s ease both; }
        @keyframes rore-pulse { 0%,100%{opacity:1} 50%{opacity:0.75} }
        .rore-pulse { animation: rore-pulse 3s ease infinite; }
      `}</style>

      {/* Subtle texture overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 50%, rgba(0,0,0,0.12) 100%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Brand wordmark — rotated */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
        className="rore-in"
      >
        <div
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            fontSize: 14,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: 3,
            lineHeight: 1,
            textShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        >
          {brand}
        </div>
      </div>

      {/* Centre divider rule */}
      <div
        style={{
          position: 'absolute',
          top: 180,
          left: 14,
          right: 14,
          height: 1,
          background: 'rgba(255,255,255,0.3)',
          zIndex: 1,
        }}
      />

      {/* Small image or logo area */}
      <div
        style={{
          position: 'absolute',
          top: 195,
          left: 10,
          right: 10,
          height: 60,
          background: 'rgba(0,0,0,0.2)',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {heroImage ? (
          <img
            src={heroImage}
            alt={brand}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>

      {/* Tagline — rotated */}
      <div
        style={{
          position: 'absolute',
          top: 270,
          left: 0,
          right: 0,
          height: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
        className="rore-pulse"
      >
        <div
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            fontSize: 8,
            color: 'rgba(255,255,255,0.82)',
            fontFamily: 'sans-serif',
            letterSpacing: 1.5,
            lineHeight: 1,
            textAlign: 'center',
          }}
        >
          {mainHeadline}
        </div>
      </div>

      {/* Bottom contact */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 0,
          right: 0,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <div style={{ width: 30, height: 1, background: 'rgba(255,255,255,0.3)' }} />
        <div
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            transform: 'rotate(180deg)',
            fontSize: 7,
            color: 'rgba(255,255,255,0.55)',
            fontFamily: 'sans-serif',
            letterSpacing: 0.8,
            height: 70,
          }}
        >
          www.{brand.toLowerCase().replace(/\s/g, '')}.com.br
        </div>
      </div>
    </div>
  );
};
