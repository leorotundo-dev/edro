'use client';

import React from 'react';

interface AbrigoOnibusProps {
  headline?: string;
  title?: string;
  name?: string;
  body?: string;
  caption?: string;
  description?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  brandColor?: string;
  brandName?: string;
  username?: string;
}

export const AbrigoOnibus: React.FC<AbrigoOnibusProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#008040',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Ponto de Ônibus';
  const resolvedBody = body ?? caption ?? description ?? 'Alcance quem usa transporte público diariamente';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#c0c8d0', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '380px' }}>

        {/* Street scene */}
        <div style={{
          width: '380px',
          height: '80px',
          background: 'linear-gradient(180deg, #87c4e8 0%, #a8d0e4 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Buildings far bg */}
          {[20, 100, 190, 280, 340].map((x, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '20px',
              left: `${x}px`,
              width: `${30 + (i % 3) * 10}px`,
              height: `${30 + (i % 4) * 12}px`,
              background: 'rgba(100,120,140,0.4)',
            }} />
          ))}
          {/* Ground */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20px', background: '#b0a880' }} />
          {/* Sidewalk */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '10px', background: '#c0b890' }} />
        </div>

        {/* Bus shelter structure */}
        <div style={{
          width: '380px',
          background: '#b8c0c8',
          position: 'relative',
          paddingBottom: '20px',
        }}>
          {/* Shelter frame */}
          <div style={{
            margin: '0 20px',
            position: 'relative',
          }}>
            {/* Roof */}
            <div style={{
              height: '12px',
              background: '#4a5560',
              borderRadius: '4px 4px 0 0',
              border: '2px solid #3a4550',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }} />

            {/* Shelter body */}
            <div style={{
              display: 'flex',
              height: '260px',
              border: '2px solid #5a6570',
              borderTop: 'none',
              background: '#d8dce4',
              overflow: 'hidden',
            }}>
              {/* Left glass panel */}
              <div style={{
                width: '40px',
                height: '100%',
                background: 'rgba(180,210,240,0.35)',
                borderRight: '2px solid #8898a8',
                flexShrink: 0,
              }} />

              {/* Main ad panel in back wall */}
              <div style={{
                flex: 1,
                height: '100%',
                background: resolvedImage ? 'transparent' : `linear-gradient(180deg, ${brandColor}dd 0%, #001a00 100%)`,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Abrigo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <div style={{
                      position: 'absolute',
                      top: '-30px',
                      right: '-30px',
                      width: '150px',
                      height: '150px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.06)',
                    }} />
                  </>
                )}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  padding: '18px 16px',
                  background: resolvedImage ? 'rgba(0,0,0,0.4)' : 'none',
                }}>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '900',
                    color: '#fff',
                    lineHeight: 1.1,
                    textShadow: '0 2px 10px rgba(0,0,0,0.7)',
                    marginBottom: '10px',
                  }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255,255,255,0.85)',
                    lineHeight: 1.5,
                    marginBottom: '16px',
                  }}>
                    {resolvedBody}
                  </div>
                  <div style={{
                    display: 'inline-block',
                    background: brandColor,
                    color: '#fff',
                    fontWeight: '900',
                    fontSize: '12px',
                    padding: '8px 14px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    alignSelf: 'flex-start',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}>
                    {resolvedBrand}
                  </div>
                </div>

                {/* Dimension badge */}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: '600',
                  padding: '3px 6px',
                  borderRadius: '2px',
                }}>
                  120×180cm
                </div>
              </div>

              {/* Right glass panel */}
              <div style={{
                width: '40px',
                height: '100%',
                background: 'rgba(180,210,240,0.35)',
                borderLeft: '2px solid #8898a8',
                flexShrink: 0,
              }} />
            </div>

            {/* Bench at bottom */}
            <div style={{
              height: '22px',
              background: '#d8c890',
              border: '2px solid #b8a870',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              gap: '8px',
            }}>
              {/* Wooden slat lines */}
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{
                  flex: 1,
                  height: '10px',
                  background: '#c8b880',
                  borderRadius: '1px',
                }} />
              ))}
            </div>

            {/* Passenger silhouette */}
            <div style={{
              position: 'absolute',
              bottom: '22px',
              right: '60px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0',
            }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(80,80,80,0.4)' }} />
              <div style={{ width: '18px', height: '26px', background: 'rgba(80,80,80,0.35)', borderRadius: '3px 3px 0 0' }} />
            </div>
          </div>

          {/* Left column */}
          <div style={{
            position: 'absolute',
            top: '12px',
            left: '14px',
            width: '10px',
            height: '282px',
            background: '#4a5560',
          }} />
          {/* Right column */}
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '14px',
            width: '10px',
            height: '282px',
            background: '#4a5560',
          }} />
        </div>

        {/* Ground */}
        <div style={{
          width: '380px',
          height: '14px',
          background: '#b0a880',
          borderRadius: '0 0 8px 8px',
        }} />

        {/* Format badge */}
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: brandColor,
          color: '#fff',
          fontSize: '11px',
          fontWeight: '700',
          padding: '4px 8px',
          borderRadius: '4px',
          zIndex: 10,
        }}>
          Abrigo de Ônibus
        </div>

        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#555',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Abrigo de Ônibus — Painel no Painel Traseiro · 120×180cm
        </div>
      </div>
    </div>
  );
};
