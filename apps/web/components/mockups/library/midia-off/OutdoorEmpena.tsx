'use client';

import React from 'react';

interface OutdoorEmpenaProps {
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

export const OutdoorEmpena: React.FC<OutdoorEmpenaProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#e8a000',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Mural de Impacto';
  const resolvedBody = body ?? caption ?? description ?? 'A maior tela da cidade ao seu alcance';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#b0bec5', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '460px' }}>

        {/* Sky */}
        <div style={{
          width: '460px',
          height: '50px',
          background: 'linear-gradient(180deg, #6fa8d0 0%, #a8c8e0 100%)',
          borderRadius: '8px 8px 0 0',
        }} />

        {/* Building scene */}
        <div style={{ width: '460px', position: 'relative', display: 'flex' }}>

          {/* Left building face (side) */}
          <div style={{
            width: '55px',
            height: '370px',
            background: 'linear-gradient(180deg, #7a8898 0%, #606c78 100%)',
            flexShrink: 0,
            position: 'relative',
          }}>
            {[0, 1, 2, 3, 4, 5].map((row) => (
              <div key={row} style={{
                position: 'absolute',
                top: `${20 + row * 55}px`,
                left: '8px',
                width: '18px',
                height: '28px',
                background: 'rgba(200,220,255,0.25)',
                border: '1px solid rgba(0,0,0,0.15)',
                borderRadius: '2px',
              }} />
            ))}
          </div>

          {/* Main front wall with brick texture */}
          <div style={{
            flex: 1,
            height: '370px',
            background: `
              repeating-linear-gradient(90deg, transparent, transparent 29px, rgba(0,0,0,0.07) 29px, rgba(0,0,0,0.07) 30px),
              repeating-linear-gradient(180deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 14px),
              linear-gradient(180deg, #9eaab6 0%, #8090a0 100%)
            `,
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Window grid (above and below the mural) */}
            {[0, 1, 2, 3, 4, 5].map((row) =>
              [0, 1, 2, 3, 4, 5].map((col) =>
                (row < 1 || row > 3 || col === 0 || col === 5) ? (
                  <div key={`${row}-${col}`} style={{
                    position: 'absolute',
                    top: `${14 + row * 58}px`,
                    left: `${12 + col * 64}px`,
                    width: '28px',
                    height: '36px',
                    background: 'rgba(180,200,230,0.22)',
                    border: '1px solid rgba(0,0,0,0.1)',
                    borderRadius: '2px',
                  }} />
                ) : null
              )
            )}

            {/* Painted mural area */}
            <div style={{
              position: 'absolute',
              top: '80px',
              left: '40px',
              right: '24px',
              height: '210px',
              background: resolvedImage
                ? 'transparent'
                : `linear-gradient(135deg, #1a1a2e 0%, ${brandColor}dd 60%, #ff6600 100%)`,
              borderRadius: '4px',
              overflow: 'hidden',
              boxShadow: '0 2px 20px rgba(0,0,0,0.3)',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Mural" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 2px, transparent 2px, transparent 12px)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    right: '-30px',
                    width: '180px',
                    height: '180px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.07)',
                  }} />
                </>
              )}

              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                padding: '20px 24px',
                background: resolvedImage ? 'linear-gradient(135deg, rgba(0,0,0,0.4) 0%, transparent 60%)' : 'none',
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '900',
                  color: '#fff',
                  lineHeight: 1.1,
                  textShadow: '0 3px 12px rgba(0,0,0,0.7)',
                  letterSpacing: '-0.5px',
                }}>
                  {resolvedHeadline}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: 'rgba(255,255,255,0.9)',
                  marginTop: '10px',
                  fontWeight: '500',
                  textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                  maxWidth: '240px',
                }}>
                  {resolvedBody}
                </div>
                <div style={{
                  display: 'inline-block',
                  marginTop: '14px',
                  background: brandColor,
                  color: '#fff',
                  fontWeight: '900',
                  fontSize: '13px',
                  padding: '8px 18px',
                  borderRadius: '4px',
                  alignSelf: 'flex-start',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                }}>
                  {resolvedBrand}
                </div>
              </div>
            </div>

            {/* Paint drip details */}
            {[60, 140, 240, 320].map((x, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: '288px',
                left: `${x}px`,
                width: '3px',
                height: `${6 + i * 2}px`,
                background: brandColor,
                borderRadius: '0 0 3px 3px',
                opacity: 0.55,
              }} />
            ))}
          </div>
        </div>

        {/* Ground / sidewalk */}
        <div style={{ width: '460px', height: '18px', background: '#5a6570' }} />
        <div style={{ width: '460px', height: '10px', background: '#c0b090', borderRadius: '0 0 4px 4px' }} />

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
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
        }}>
          Empena
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
          Outdoor Empena — Mural Pintado em Parede de Edifício
        </div>
      </div>
    </div>
  );
};
