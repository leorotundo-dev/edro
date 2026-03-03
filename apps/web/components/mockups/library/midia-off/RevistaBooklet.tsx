'use client';

import React from 'react';

interface RevistaBookletProps {
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

export const RevistaBooklet: React.FC<RevistaBookletProps> = ({
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
  brandColor = '#2471a3',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Mini catálogo encartado';
  const bodyText =
    body ?? caption ?? description ?? text ??
    'Booklet inserido na revista — formato miniatura com identidade própria, ideal para catálogos, vouchers e guias de produto.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const pageCount = 16;

  return (
    <div
      style={{
        width: 280,
        height: 380,
        background: '#f0ede0',
        fontFamily: '"Georgia", "Times New Roman", serif',
        boxShadow: '4px 4px 18px rgba(0,0,0,0.22), -1px 0 4px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: '0 4px 4px 0',
      }}
    >
      <style>{`
        @keyframes rbkl-in { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
        .rbkl-in { animation: rbkl-in 0.5s ease both; }
      `}</style>

      {/* Staple marks on left spine */}
      {[72, 190, 308].map((top) => (
        <div
          key={top}
          style={{
            position: 'absolute',
            left: 0,
            top,
            width: 6,
            height: 14,
            zIndex: 5,
          }}
        >
          {/* Staple U shape */}
          <div
            style={{
              width: 6,
              height: 14,
              border: '2px solid #888',
              borderRight: 'none',
              borderRadius: '2px 0 0 2px',
              background: 'transparent',
            }}
          />
        </div>
      ))}

      {/* Spine accent */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 10,
          background: `linear-gradient(to right, rgba(0,0,0,0.12), transparent)`,
          zIndex: 4,
          pointerEvents: 'none',
        }}
      />

      {/* Cover image */}
      <div
        style={{
          width: '100%',
          height: 190,
          background: '#ccc',
          overflow: 'hidden',
          flexShrink: 0,
          position: 'relative',
        }}
        className="rbkl-in"
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
              background: `linear-gradient(135deg, ${brandColor}33 0%, ${brandColor}88 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="0.9" opacity="0.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <span style={{ fontSize: 9, color: brandColor, fontFamily: 'sans-serif', opacity: 0.55 }}>Capa</span>
          </div>
        )}
        {/* Page count badge */}
        <div
          style={{
            position: 'absolute',
            bottom: 8,
            right: 10,
            background: brandColor,
            padding: '2px 8px',
            borderRadius: 10,
          }}
        >
          <span style={{ fontSize: 8, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700 }}>
            {pageCount} pág.
          </span>
        </div>
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          padding: '14px 16px 12px 18px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <div style={{ width: 24, height: 3, background: brandColor }} />
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
              fontSize: 15,
              fontWeight: 900,
              color: '#111',
              lineHeight: 1.25,
              margin: '0 0 9px',
              letterSpacing: -0.2,
            }}
          >
            {mainHeadline}
          </h2>
          <p style={{ fontSize: 9.5, color: '#444', lineHeight: 1.65, margin: 0 }}>
            {bodyText}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 10,
            borderTop: '1px solid #d8d5c8',
          }}
        >
          <div style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif' }}>
            (11) 9 9999-0000
          </div>
          <div
            style={{
              background: brandColor,
              padding: '4px 10px',
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
              Ver catálogo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
