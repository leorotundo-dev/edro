'use client';

import React from 'react';

interface AbrigoOnibusBacklightProps {
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

export const AbrigoOnibusBacklight: React.FC<AbrigoOnibusBacklightProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#0055aa',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Abrigo Iluminado';
  const resolvedBody = body ?? caption ?? description ?? 'Visibilidade 24 horas no ponto de ônibus';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#0a0c14', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '380px' }}>

        {/* Night street */}
        <div style={{
          width: '380px',
          height: '70px',
          background: 'linear-gradient(180deg, #050510 0%, #0a0a1e 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* City buildings silhouette */}
          {[10, 80, 160, 240, 310].map((x, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '12px',
              left: `${x}px`,
              width: `${25 + (i % 3) * 8}px`,
              height: `${20 + (i % 4) * 8}px`,
              background: '#0d0d20',
            }} />
          ))}
          {/* Stars */}
          {[30, 90, 160, 230, 310, 350].map((x, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: `${5 + (i % 3) * 8}px`,
              left: `${x}px`,
              width: '2px',
              height: '2px',
              borderRadius: '50%',
              background: '#fff',
              opacity: 0.6,
            }} />
          ))}
          {/* Ground */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12px', background: '#1a1814' }} />
        </div>

        {/* Shelter */}
        <div style={{
          width: '380px',
          background: '#0a0a14',
          position: 'relative',
          paddingBottom: '20px',
        }}>
          {/* Left column */}
          <div style={{ position: 'absolute', top: '10px', left: '14px', width: '10px', height: '286px', background: '#333' }} />
          {/* Right column */}
          <div style={{ position: 'absolute', top: '10px', right: '14px', width: '10px', height: '286px', background: '#333' }} />

          <div style={{ margin: '0 20px', position: 'relative' }}>
            {/* Roof */}
            <div style={{
              height: '12px',
              background: '#2a2a3a',
              borderRadius: '4px 4px 0 0',
              border: '2px solid #1a1a2a',
            }} />

            {/* Shelter body */}
            <div style={{
              display: 'flex',
              height: '260px',
              border: '2px solid #1a1a2a',
              borderTop: 'none',
              background: '#080810',
              overflow: 'hidden',
            }}>
              {/* Left glass (dark) */}
              <div style={{
                width: '36px',
                flexShrink: 0,
                background: 'rgba(20,30,60,0.6)',
                borderRight: '2px solid #1a2030',
              }} />

              {/* Glowing backlit panel */}
              <div style={{
                flex: 1,
                background: '#fff',
                padding: '5px',
                boxShadow: `0 0 30px 8px ${brandColor}44, 0 0 60px 20px ${brandColor}22`,
                position: 'relative',
              }}>
                {/* Inner glow border */}
                <div style={{
                  position: 'absolute',
                  inset: '2px',
                  border: `1px solid ${brandColor}88`,
                  pointerEvents: 'none',
                  zIndex: 5,
                }} />

                <div style={{
                  width: '100%',
                  height: '100%',
                  background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #001230 0%, ${brandColor}cc 50%, #000a1e 100%)`,
                  overflow: 'hidden',
                  position: 'relative',
                }}>
                  {resolvedImage ? (
                    <img src={resolvedImage} alt="Backlight abrigo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <>
                      <div style={{
                        position: 'absolute',
                        top: '-30px',
                        right: '-30px',
                        width: '160px',
                        height: '160px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.05)',
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
                      textShadow: `0 0 16px ${brandColor}, 0 2px 10px rgba(0,0,0,0.8)`,
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
                      boxShadow: `0 0 14px ${brandColor}88`,
                    }}>
                      {resolvedBrand}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right glass (dark) */}
              <div style={{
                width: '36px',
                flexShrink: 0,
                background: 'rgba(20,30,60,0.6)',
                borderLeft: '2px solid #1a2030',
              }} />
            </div>

            {/* Bench */}
            <div style={{
              height: '22px',
              background: '#2a2a1a',
              border: '2px solid #1a1a0a',
              display: 'flex',
              alignItems: 'center',
              padding: '0 8px',
              gap: '8px',
            }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} style={{ flex: 1, height: '10px', background: '#333320', borderRadius: '1px' }} />
              ))}
            </div>
          </div>
        </div>

        {/* Ground */}
        <div style={{ width: '380px', height: '14px', background: '#1a1814', borderRadius: '0 0 8px 8px' }} />

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
          boxShadow: `0 0 10px ${brandColor}88`,
        }}>
          Abrigo Backlight
        </div>

        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#888',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Abrigo Backlight (Adshel) — Iluminação Interna · 120×180cm
        </div>
      </div>
    </div>
  );
};
