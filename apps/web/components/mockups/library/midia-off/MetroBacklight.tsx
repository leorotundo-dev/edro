'use client';

import React from 'react';

interface MetroBacklightProps {
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

export const MetroBacklight: React.FC<MetroBacklightProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#0066cc',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Backlight de Estação';
  const resolvedBody = body ?? caption ?? description ?? 'Alta visibilidade no corredor de passageiros';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#111520', display: 'inline-block', borderRadius: '12px' }}>
      <style>{`
        @keyframes metro-backlight-glow {
          0%, 100% { boxShadow: '0 0 20px rgba(255,255,255,0.4)'; }
          50% { boxShadow: '0 0 35px rgba(255,255,255,0.7)'; }
        }
      `}</style>

      <div style={{ position: 'relative', width: '440px' }}>

        {/* Station context — ceiling and walls */}
        <div style={{
          width: '440px',
          height: '80px',
          background: 'linear-gradient(180deg, #0a0a14 0%, #101828 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'flex-end',
        }}>
          {/* Ceiling tiles */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 49px, rgba(255,255,255,0.04) 49px, rgba(255,255,255,0.04) 50px), repeating-linear-gradient(180deg, transparent, transparent 24px, rgba(255,255,255,0.04) 24px, rgba(255,255,255,0.04) 25px)',
          }} />

          {/* Fluorescent ceiling lights */}
          {[60, 180, 300].map((x, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: '10px',
              left: `${x}px`,
              width: '60px',
              height: '8px',
              background: 'rgba(255,255,200,0.6)',
              borderRadius: '2px',
              boxShadow: '0 0 16px 6px rgba(255,255,200,0.25)',
            }} />
          ))}

          {/* Station name strip */}
          <div style={{
            width: '100%',
            height: '22px',
            background: brandColor,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: '16px',
            gap: '12px',
          }}>
            <div style={{ fontSize: '10px', color: '#fff', fontWeight: '900', letterSpacing: '2px' }}>
              ESTAÇÃO CENTRAL
            </div>
            <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.7)', letterSpacing: '1px' }}>
              LINHA 3 - VERMELHA
            </div>
          </div>
        </div>

        {/* Station wall panel */}
        <div style={{
          width: '440px',
          background: '#080c14',
          padding: '0',
          position: 'relative',
        }}>
          {/* Wall tiles */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,255,255,0.03) 39px, rgba(255,255,255,0.03) 40px), repeating-linear-gradient(180deg, transparent, transparent 39px, rgba(255,255,255,0.03) 39px, rgba(255,255,255,0.03) 40px)',
          }} />

          {/* Luminous backlight frame with inner glow */}
          <div style={{
            margin: '20px auto',
            width: '380px',
            background: '#fff',
            padding: '8px',
            boxShadow: '0 0 30px 8px rgba(255,255,255,0.4), 0 0 60px 20px rgba(255,255,255,0.15), inset 0 0 20px rgba(255,255,255,0.1)',
            borderRadius: '3px',
            position: 'relative',
          }}>
            {/* Inner glow edge */}
            <div style={{
              position: 'absolute',
              inset: '4px',
              border: '2px solid rgba(255,255,255,0.8)',
              borderRadius: '2px',
              pointerEvents: 'none',
              zIndex: 5,
              boxShadow: 'inset 0 0 20px rgba(255,255,255,0.3)',
            }} />

            {/* Ad panel */}
            <div style={{
              width: '100%',
              height: '200px',
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor} 0%, #002244 60%, #000a18 100%)`,
              position: 'relative',
              overflow: 'hidden',
              borderRadius: '1px',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Backlight" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '-40px',
                    right: '-40px',
                    width: '200px',
                    height: '200px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.06)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-30px',
                    left: '-20px',
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.04)',
                  }} />
                </>
              )}

              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '18px 24px',
                background: resolvedImage ? 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, transparent 65%)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '26px',
                    fontWeight: '900',
                    color: '#fff',
                    lineHeight: 1.1,
                    textShadow: '0 2px 12px rgba(0,0,0,0.7)',
                    maxWidth: '230px',
                    letterSpacing: '-0.5px',
                  }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.85)',
                    marginTop: '10px',
                    fontWeight: '400',
                    lineHeight: 1.4,
                  }}>
                    {resolvedBody}
                  </div>
                </div>
                <div style={{
                  background: brandColor,
                  color: '#fff',
                  fontWeight: '900',
                  fontSize: '13px',
                  padding: '10px 16px',
                  borderRadius: '4px',
                  flexShrink: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: `0 2px 16px ${brandColor}88`,
                }}>
                  {resolvedBrand}
                </div>
              </div>
            </div>
          </div>

          {/* Platform floor indicator */}
          <div style={{
            height: '16px',
            background: '#0a0a14',
            borderTop: '3px solid #222',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}>
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} style={{
                width: '30px',
                height: '4px',
                background: i === 3 ? brandColor : 'rgba(255,255,255,0.1)',
                borderRadius: '2px',
              }} />
            ))}
          </div>
        </div>

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
          boxShadow: '0 0 12px rgba(255,255,255,0.3)',
        }}>
          Backlight Metrô
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
          Metrô Backlight — Painel Luminoso em Estação · São Paulo
        </div>
      </div>
    </div>
  );
};
