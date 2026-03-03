'use client';

import React from 'react';

interface MetroTetoProps {
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

export const MetroTeto: React.FC<MetroTetoProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#006633',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Teto do Vagão';
  const resolvedBody = body ?? caption ?? description ?? 'Visto por todos os passageiros durante a viagem';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#0a0d14', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '480px' }}>

        {/* Looking-up view label */}
        <div style={{
          marginBottom: '8px',
          textAlign: 'center',
          fontSize: '10px',
          color: '#666',
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          fontWeight: '600',
        }}>
          Vista de baixo para cima — perspectiva interna
        </div>

        {/* Wagon interior perspective — top view */}
        <div style={{
          width: '480px',
          height: '320px',
          background: '#141420',
          borderRadius: '8px',
          position: 'relative',
          overflow: 'hidden',
          perspective: '800px',
        }}>
          {/* Wagon ceiling shape — perspective transform */}
          <div style={{
            position: 'absolute',
            inset: '20px',
            background: '#1a1a2e',
            borderRadius: '20px',
            border: '3px solid #252535',
            transform: 'perspective(500px) rotateX(-8deg)',
            transformOrigin: 'bottom center',
            overflow: 'hidden',
            boxShadow: 'inset 0 -20px 40px rgba(0,0,0,0.5)',
          }}>

            {/* Interior ceiling tiles */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 79px, rgba(255,255,255,0.04) 79px, rgba(255,255,255,0.04) 80px), repeating-linear-gradient(180deg, transparent, transparent 59px, rgba(255,255,255,0.04) 59px, rgba(255,255,255,0.04) 60px)',
            }} />

            {/* Ceiling light strips */}
            {[60, 220, 360].map((x, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: '10px',
                left: `${x}px`,
                width: '80px',
                height: '8px',
                background: 'rgba(255,255,200,0.6)',
                borderRadius: '3px',
                boxShadow: '0 0 16px 8px rgba(255,255,200,0.2)',
              }} />
            ))}

            {/* Hanging banner — main ad */}
            <div style={{
              position: 'absolute',
              top: '30px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '320px',
              zIndex: 3,
            }}>
              {/* Hanger clips */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '30px', paddingRight: '30px', marginBottom: '2px' }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: '3px', height: '12px', background: '#888' }} />
                ))}
              </div>

              {/* Banner */}
              <div style={{
                width: '320px',
                height: '140px',
                background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #050510 0%, ${brandColor}cc 50%, #001100 100%)`,
                border: `3px solid ${brandColor}66`,
                borderRadius: '4px',
                overflow: 'hidden',
                boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
                position: 'relative',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Banner teto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 14px)',
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      right: '-20px',
                      width: '120px',
                      height: '120px',
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
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '14px 20px',
                  background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
                }}>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '900',
                    color: '#fff',
                    textAlign: 'center',
                    lineHeight: 1.1,
                    textShadow: '0 2px 10px rgba(0,0,0,0.8)',
                    marginBottom: '8px',
                    letterSpacing: '-0.3px',
                  }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.8)',
                    textAlign: 'center',
                    lineHeight: 1.4,
                    marginBottom: '12px',
                  }}>
                    {resolvedBody}
                  </div>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: '900',
                    padding: '6px 14px',
                    borderRadius: '3px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: `0 0 12px ${brandColor}66`,
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              </div>
            </div>

            {/* Side handles (grab bars) */}
            {[0, 1].map((side) => (
              <div key={side} style={{
                position: 'absolute',
                bottom: '15px',
                [side === 0 ? 'left' : 'right']: '20px',
                display: 'flex',
                gap: '20px',
              }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                    <div style={{ width: '2px', height: '16px', background: '#444' }} />
                    <div style={{ width: '16px', height: '6px', border: '2px solid #555', borderRadius: '3px', background: 'transparent' }} />
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Perspective corner overlays */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.4) 100%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* Format badge */}
        <div style={{
          position: 'absolute',
          top: '36px',
          right: '8px',
          background: brandColor,
          color: '#fff',
          fontSize: '11px',
          fontWeight: '700',
          padding: '4px 8px',
          borderRadius: '4px',
          zIndex: 10,
        }}>
          Teto do Vagão
        </div>

        <div style={{
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#888',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Metrô Teto — Banner Suspenso no Teto do Vagão
        </div>
      </div>
    </div>
  );
};
