'use client';

import React from 'react';

interface OutdoorTotemProps {
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

export const OutdoorTotem: React.FC<OutdoorTotemProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#8b0000',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Totem Publicitário';
  const resolvedBody = body ?? caption ?? description ?? 'Alta visibilidade em pontos de fluxo';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#c8d0d8', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Scene background */}
        <div style={{
          width: '320px',
          height: '100px',
          background: 'linear-gradient(180deg, #87CEEB 0%, #b8d8e8 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Ground */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20px', background: '#a0a888' }} />
        </div>

        {/* Totem structure centered */}
        <div style={{
          width: '320px',
          background: '#a0a888',
          display: 'flex',
          justifyContent: 'center',
          paddingTop: '0',
          position: 'relative',
          marginTop: '-20px',
        }}>
          {/* Concrete base / feet */}
          <div style={{
            position: 'absolute',
            bottom: '-30px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '30px',
            zIndex: 3,
          }}>
            <div style={{ width: '30px', height: '30px', background: '#7a7a6a', borderRadius: '2px 2px 0 0' }} />
            <div style={{ width: '30px', height: '30px', background: '#7a7a6a', borderRadius: '2px 2px 0 0' }} />
          </div>

          {/* Double-sided badge indicator */}
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 6,
          }}>
            <div style={{
              background: brandColor,
              color: '#fff',
              fontSize: '9px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '3px',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}>
              Dupla Face
            </div>
          </div>

          {/* Totem body */}
          <div style={{
            width: '100px',
            height: '380px',
            position: 'relative',
            zIndex: 2,
          }}>
            {/* Frame */}
            <div style={{
              width: '100%',
              height: '100%',
              background: '#2a2a2a',
              border: '4px solid #1a1a1a',
              borderRadius: '6px 6px 2px 2px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '2px 0 8px rgba(0,0,0,0.3), -2px 0 8px rgba(0,0,0,0.2)',
            }}>
              {/* Top cap */}
              <div style={{
                background: '#111',
                height: '16px',
                borderRadius: '4px 4px 0 0',
                borderBottom: `3px solid ${brandColor}`,
                flexShrink: 0,
              }} />

              {/* Ad panel 100x380 internal */}
              <div style={{
                flex: 1,
                background: resolvedImage ? 'transparent' : `linear-gradient(180deg, #1a1a2e 0%, ${brandColor}cc 50%, #0a0a14 100%)`,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Totem ad" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    {/* Decorative lines */}
                    <div style={{
                      position: 'absolute',
                      top: '30px',
                      left: '8px',
                      right: '8px',
                      height: '2px',
                      background: `${brandColor}88`,
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: '34px',
                      left: '8px',
                      right: '8px',
                      height: '1px',
                      background: `${brandColor}44`,
                    }} />
                    {/* Central emblem */}
                    <div style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '50px',
                      height: '50px',
                      borderRadius: '50%',
                      border: `2px solid ${brandColor}88`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <div style={{
                        fontSize: '8px',
                        fontWeight: '900',
                        color: '#fff',
                        textAlign: 'center',
                        lineHeight: 1.1,
                      }}>
                        {resolvedBrand.substring(0, 6)}
                      </div>
                    </div>
                    <div style={{
                      position: 'absolute',
                      bottom: '50px',
                      left: '8px',
                      right: '8px',
                      height: '2px',
                      background: `${brandColor}88`,
                    }} />
                  </>
                )}

                {/* Text content */}
                <div style={{
                  position: 'absolute',
                  top: '40px',
                  left: '6px',
                  right: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <div style={{
                    fontSize: '10px',
                    fontWeight: '900',
                    color: '#fff',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    textShadow: '0 1px 6px rgba(0,0,0,0.7)',
                  }}>
                    {resolvedHeadline}
                  </div>
                </div>

                <div style={{
                  position: 'absolute',
                  bottom: '14px',
                  left: '6px',
                  right: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '8px',
                    fontWeight: '700',
                    padding: '4px 6px',
                    borderRadius: '3px',
                    textAlign: 'center',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}>
                    {resolvedBrand}
                  </div>
                  <div style={{
                    fontSize: '7px',
                    color: 'rgba(255,255,255,0.7)',
                    textAlign: 'center',
                    lineHeight: 1.3,
                  }}>
                    {resolvedBody.substring(0, 30)}
                  </div>
                </div>
              </div>

              {/* Bottom cap */}
              <div style={{
                background: '#111',
                height: '12px',
                borderRadius: '0 0 2px 2px',
                borderTop: `2px solid ${brandColor}`,
                flexShrink: 0,
              }} />
            </div>
          </div>
        </div>

        {/* Ground / base */}
        <div style={{ width: '320px', height: '30px', background: '#7a8870', borderRadius: '0 0 8px 8px' }} />

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
        }}>
          Totem 120×300cm
        </div>

        <div style={{
          marginTop: '12px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#555',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Totem Autoportante — Dupla Face · Base de Concreto
        </div>
      </div>
    </div>
  );
};
