import React from 'react';

interface BannerAppProps {
  title?: string;
  headline?: string;
  name?: string;
  brandName?: string;
  subtitle?: string;
  description?: string;
  body?: string;
  caption?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  rating?: string;
  downloadCount?: string;
}

export const BannerApp: React.FC<BannerAppProps> = ({
  title: titleProp,
  headline,
  name,
  brandName,
  subtitle,
  description,
  body,
  caption,
  image: imageProp,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#5D87FF',
  rating = '4.8',
  downloadCount = '500 mil+',
}) => {
  const appName = titleProp ?? headline ?? brandName ?? name ?? 'MeuApp';
  const sub = subtitle ?? description ?? body ?? caption ?? 'A melhor experiência de compra';
  const image = imageProp ?? postImage ?? thumbnail ?? profileImage ?? '';

  // QR code grid pattern (5x5 pixel grid simulated)
  const qrPattern = [
    [1,1,1,1,1,0,1,0,1,1,1,1,1],
    [1,0,0,0,1,0,0,1,1,0,0,0,1],
    [1,0,1,0,1,0,1,0,1,0,1,0,1],
    [1,0,0,0,1,1,0,0,1,0,0,0,1],
    [1,1,1,1,1,0,1,1,1,1,1,1,1],
    [0,1,0,0,0,1,0,1,0,0,0,1,0],
    [1,0,1,1,0,0,1,0,0,1,1,0,1],
    [0,1,0,0,1,1,0,1,1,0,0,1,0],
    [1,1,1,1,1,0,0,0,1,1,0,0,1],
    [1,0,0,0,1,1,1,0,0,0,1,0,0],
    [1,0,1,0,1,0,0,1,1,0,1,1,1],
    [1,0,0,0,1,0,1,0,0,1,0,0,0],
    [1,1,1,1,1,1,0,1,1,1,1,1,0],
  ];

  return (
    <div
      style={{
        flexShrink: 0,
        position: 'relative',
        width: '600px',
        height: '120px',
        borderRadius: '14px',
        overflow: 'hidden',
        background: `linear-gradient(110deg, ${brandColor}12 0%, #ffffff 40%, ${brandColor}08 100%)`,
        border: `1.5px solid ${brandColor}25`,
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        display: 'flex',
        alignItems: 'center',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      {/* Background gradient decoration */}
      <div
        style={{
          position: 'absolute',
          left: '-20px',
          top: '-30px',
          width: '140px',
          height: '140px',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${brandColor}18 0%, transparent 70%)`,
        }}
      />

      {/* App icon */}
      <div style={{ padding: '0 0 0 20px', flexShrink: 0 }}>
        {image ? (
          <img
            src={image}
            alt={appName}
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '18px',
              objectFit: 'cover',
              boxShadow: `0 4px 14px ${brandColor}35`,
              border: `2px solid ${brandColor}25`,
              display: 'block',
            }}
          />
        ) : (
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '18px',
              background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}cc 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 14px ${brandColor}35`,
              border: `2px solid ${brandColor}25`,
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" fill="white"/>
            </svg>
          </div>
        )}
      </div>

      {/* Center — app info + store badges */}
      <div
        style={{
          flex: 1,
          padding: '0 16px 0 16px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: '4px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
          <h3
            style={{
              color: '#1A1A2E',
              fontSize: '17px',
              fontWeight: 900,
              margin: 0,
              lineHeight: 1,
            }}
          >
            {appName}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ color: '#F59E0B', fontSize: '12px' }}>★</span>
            <span style={{ color: '#1A1A2E', fontSize: '11px', fontWeight: 700 }}>{rating}</span>
          </div>
        </div>

        <p
          style={{
            color: 'rgba(0,0,0,0.5)',
            fontSize: '11px',
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {sub} &bull; {downloadCount} downloads
        </p>

        <span
          style={{
            color: 'rgba(0,0,0,0.35)',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.3px',
          }}
        >
          Disponivel no
        </span>

        {/* App store badges */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
          {/* App Store badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: '#000000',
              borderRadius: '6px',
              padding: '5px 10px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '7px', fontWeight: 500 }}>Baixe na</span>
              <span style={{ color: '#ffffff', fontSize: '10px', fontWeight: 700 }}>App Store</span>
            </div>
          </div>

          {/* Google Play badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: '#1A1A2E',
              borderRadius: '6px',
              padding: '5px 10px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M3 20.5v-17c0-.83 1-.83 1.5-.5l14 8.5-14 8.5c-.5.33-1.5.33-1.5-.5z" fill="#4CAF50"/>
              <path d="M3 3.5l8 8L3 20.5" fill="#2196F3" opacity="0.8"/>
              <path d="M11 11.5l3.5-3.5 3 1.8L11 11.5z" fill="#FFC107"/>
              <path d="M11 12.5l3.5 3.5 3-1.8L11 12.5z" fill="#F44336"/>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '7px', fontWeight: 500 }}>Disponivel no</span>
              <span style={{ color: '#ffffff', fontSize: '10px', fontWeight: 700 }}>Google Play</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right — QR code + scan text */}
      <div
        style={{
          flexShrink: 0,
          padding: '0 20px 0 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {/* QR code placeholder */}
        <div
          style={{
            background: '#ffffff',
            border: `1.5px solid ${brandColor}30`,
            borderRadius: '8px',
            padding: '5px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(13, 4px)',
              gridTemplateRows: 'repeat(13, 4px)',
              gap: '0.5px',
            }}
          >
            {qrPattern.flat().map((cell, i) => (
              <div
                key={i}
                style={{
                  width: '4px',
                  height: '4px',
                  background: cell ? '#1A1A2E' : '#ffffff',
                  borderRadius: '0.5px',
                }}
              />
            ))}
          </div>
        </div>

        <span
          style={{
            color: 'rgba(0,0,0,0.4)',
            fontSize: '9px',
            fontWeight: 600,
            letterSpacing: '0.3px',
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          Escaneie para
          <br />
          baixar
        </span>
      </div>
    </div>
  );
};
