'use client';

import React from 'react';

interface OutdoorFrontLightProps {
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

export const OutdoorFrontLight: React.FC<OutdoorFrontLightProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#d4380d',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Destaque à Luz do Dia';
  const resolvedBody = body ?? caption ?? description ?? 'Visibilidade máxima em rodovias e avenidas';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#d0dde8', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '500px' }}>

        {/* Daylight sky */}
        <div style={{
          width: '500px',
          height: '190px',
          background: 'linear-gradient(180deg, #4a90d9 0%, #87CEEB 45%, #c8e8f5 75%, #e8f5e0 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Clouds */}
          <div style={{
            position: 'absolute',
            top: '22px',
            left: '60px',
            width: '90px',
            height: '32px',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '20px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          }} />
          <div style={{
            position: 'absolute',
            top: '18px',
            left: '90px',
            width: '60px',
            height: '22px',
            background: 'rgba(255,255,255,0.9)',
            borderRadius: '14px',
          }} />
          <div style={{
            position: 'absolute',
            top: '35px',
            left: '280px',
            width: '70px',
            height: '26px',
            background: 'rgba(255,255,255,0.85)',
            borderRadius: '18px',
          }} />
          <div style={{
            position: 'absolute',
            top: '28px',
            left: '310px',
            width: '50px',
            height: '18px',
            background: 'rgba(255,255,255,0.85)',
            borderRadius: '12px',
          }} />

          {/* Tree silhouettes */}
          <div style={{ position: 'absolute', bottom: 0, left: '20px', display: 'flex', gap: '8px' }}>
            {[40, 55, 45, 60, 42].map((h, i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{
                  width: `${24 + i * 2}px`,
                  height: `${h}px`,
                  background: '#2d6a2d',
                  borderRadius: '40% 40% 0 0',
                }} />
                <div style={{ width: '6px', height: '12px', background: '#5c3d1e' }} />
              </div>
            ))}
          </div>

          {/* Road */}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '22px',
            background: '#6b7280',
          }} />
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '8px',
              left: `${30 + i * 90}px`,
              width: '50px',
              height: '5px',
              background: '#fff',
              borderRadius: '3px',
              opacity: 0.6,
            }} />
          ))}

          {/* Billboard poles */}
          <div style={{
            position: 'absolute',
            bottom: '22px',
            left: '50%',
            transform: 'translateX(-50%)',
          }}>
            <div style={{
              width: '420px',
              height: '10px',
              background: '#555',
              borderRadius: '3px',
            }} />
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '100px',
              width: '14px',
              height: '65px',
              background: '#4a4a4a',
            }} />
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '100px',
              width: '14px',
              height: '65px',
              background: '#4a4a4a',
            }} />
          </div>
        </div>

        {/* Metal frame with weathered look */}
        <div style={{
          width: '500px',
          background: '#3a3a3a',
          padding: '7px',
          border: '4px solid #222',
          borderRadius: '3px',
          boxShadow: '2px 4px 16px rgba(0,0,0,0.5), inset 0 1px 3px rgba(255,255,255,0.05)',
          marginTop: '-85px',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Front-light bar on top */}
          <div style={{
            position: 'absolute',
            top: '-18px',
            left: '10%',
            width: '80%',
            height: '12px',
            background: 'linear-gradient(180deg, #d4d4d4 0%, #a0a0a0 100%)',
            borderRadius: '4px 4px 0 0',
            boxShadow: '0 -4px 20px rgba(255,255,150,0.4), 0 2px 8px rgba(0,0,0,0.3)',
          }} />
          {/* Light beam */}
          <div style={{
            position: 'absolute',
            top: '-6px',
            left: '15%',
            width: '70%',
            height: '4px',
            background: 'rgba(255,255,200,0.6)',
            borderRadius: '2px',
            boxShadow: '0 0 12px 6px rgba(255,255,150,0.25)',
          }} />

          {/* Weathered corners */}
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: corner.includes('top') ? '4px' : 'auto',
              bottom: corner.includes('bottom') ? '4px' : 'auto',
              left: corner.includes('left') ? '4px' : 'auto',
              right: corner.includes('right') ? '4px' : 'auto',
              width: '8px',
              height: '8px',
              background: '#555',
              borderRadius: '1px',
            }} />
          ))}

          {/* Ad panel */}
          <div style={{
            width: '100%',
            height: '140px',
            position: 'relative',
            overflow: 'hidden',
            background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #1a1a2e 0%, ${brandColor}cc 60%, #ff8c00 100%)`,
            borderRadius: '2px',
          }}>
            {resolvedImage ? (
              <img src={resolvedImage} alt="Anúncio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '200px',
                  height: '100%',
                  background: `linear-gradient(90deg, transparent, ${brandColor}55)`,
                }} />
                <div style={{
                  position: 'absolute',
                  bottom: '-10px',
                  right: '-10px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: '50%',
                }} />
              </>
            )}

            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 22px',
              background: resolvedImage ? 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, transparent 65%)' : 'none',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '23px',
                  fontWeight: '900',
                  color: '#fff',
                  lineHeight: 1.1,
                  textShadow: '0 2px 10px rgba(0,0,0,0.7)',
                  maxWidth: '270px',
                }}>
                  {resolvedHeadline}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255,255,255,0.9)',
                  marginTop: '8px',
                  fontWeight: '500',
                  textShadow: '0 1px 4px rgba(0,0,0,0.5)',
                }}>
                  {resolvedBody}
                </div>
              </div>
              <div style={{
                background: brandColor,
                color: '#fff',
                fontWeight: '900',
                fontSize: '12px',
                padding: '10px 14px',
                borderRadius: '3px',
                flexShrink: 0,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
              }}>
                {resolvedBrand}
              </div>
            </div>
          </div>
        </div>

        {/* Dimension badge */}
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
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          letterSpacing: '0.5px',
        }}>
          Front-Light 9×3m
        </div>

        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#666',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Outdoor Front Light — Iluminação Externa · Estrutura Metálica
        </div>
      </div>
    </div>
  );
};
