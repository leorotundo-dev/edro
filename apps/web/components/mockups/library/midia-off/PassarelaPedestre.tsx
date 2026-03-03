'use client';

import React from 'react';

interface PassarelaPedestreProps {
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

export const PassarelaPedestre: React.FC<PassarelaPedestreProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#003388',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Passarela de Destaque';
  const resolvedBody = body ?? caption ?? description ?? 'Banner sobre o fluxo de pedestres';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#b0b8c0', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '520px' }}>

        {/* Sky */}
        <div style={{
          width: '520px',
          height: '80px',
          background: 'linear-gradient(180deg, #88b8d0 0%, #aaccdc 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Clouds */}
          <div style={{ position: 'absolute', top: '15px', left: '60px', width: '70px', height: '22px', background: 'rgba(255,255,255,0.8)', borderRadius: '14px' }} />
          <div style={{ position: 'absolute', top: '20px', left: '300px', width: '55px', height: '18px', background: 'rgba(255,255,255,0.7)', borderRadius: '12px' }} />
        </div>

        {/* Bridge scene */}
        <div style={{
          width: '520px',
          background: '#a8b0b8',
          position: 'relative',
          paddingBottom: '20px',
        }}>
          {/* Bridge structure */}
          <div style={{ margin: '0 20px', position: 'relative' }}>
            {/* Top rail / beam */}
            <div style={{
              height: '14px',
              background: '#555',
              borderRadius: '4px 4px 0 0',
              border: '2px solid #333',
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }} />

            {/* Bridge deck / walkway */}
            <div style={{
              display: 'flex',
              height: '80px',
              background: '#888',
              border: '2px solid #555',
              borderTop: 'none',
            }}>
              {/* Left railing */}
              <div style={{
                width: '12px',
                background: '#666',
                borderRight: '2px solid #444',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                paddingLeft: '3px',
              }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ width: '4px', height: '4px', background: '#888', borderRadius: '50%' }} />
                ))}
              </div>

              {/* Walkway surface */}
              <div style={{
                flex: 1,
                background: '#7a7a7a',
                backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 1px, transparent 1px, transparent 20px)',
                position: 'relative',
              }}>
                {/* Hanging banner across bridge */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  left: '15%',
                  right: '15%',
                  height: '54px',
                  background: '#fff',
                  padding: '4px',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
                  borderRadius: '2px',
                }}>
                  <div style={{
                    width: '100%',
                    height: '100%',
                    background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor} 0%, #000820 60%, ${brandColor}88 100%)`,
                    overflow: 'hidden',
                    position: 'relative',
                    borderRadius: '1px',
                  }}>
                    {resolvedImage ? (
                      <img src={resolvedImage} alt="Banner passarela" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : null}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 14px',
                      background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '15px', fontWeight: '900', color: '#fff', lineHeight: 1.1, maxWidth: '220px' }}>
                          {resolvedHeadline}
                        </div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', marginTop: '3px' }}>
                          {resolvedBody}
                        </div>
                      </div>
                      <div style={{
                        background: brandColor,
                        color: '#fff',
                        fontSize: '10px',
                        fontWeight: '700',
                        padding: '6px 10px',
                        borderRadius: '3px',
                        flexShrink: 0,
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                      }}>
                        {resolvedBrand}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Banner hanging strings */}
                {[15, 50, 85].map((pct, i) => (
                  <div key={i} style={{
                    position: 'absolute',
                    top: 0,
                    left: `${pct}%`,
                    width: '1px',
                    height: '8px',
                    background: '#aaa',
                  }} />
                ))}
              </div>

              {/* Right railing */}
              <div style={{
                width: '12px',
                background: '#666',
                borderLeft: '2px solid #444',
                flexShrink: 0,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-around',
                paddingRight: '3px',
                alignItems: 'flex-end',
              }}>
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} style={{ width: '4px', height: '4px', background: '#888', borderRadius: '50%' }} />
                ))}
              </div>
            </div>

            {/* Bottom rail */}
            <div style={{
              height: '10px',
              background: '#444',
              border: '2px solid #333',
              borderTop: 'none',
            }} />

            {/* Bridge support columns */}
            {[60, 300].map((x, i) => (
              <div key={i} style={{
                position: 'absolute',
                bottom: '0px',
                left: `${x}px`,
                width: '12px',
                height: '60px',
                background: '#555',
              }} />
            ))}
          </div>

          {/* Ground below bridge */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingLeft: '20px',
            paddingRight: '20px',
            marginTop: '0',
          }}>
            <div style={{
              width: '200px',
              height: '30px',
              background: '#888',
              borderRadius: '0 0 4px 4px',
            }} />
            <div style={{
              width: '200px',
              height: '30px',
              background: '#888',
              borderRadius: '0 0 4px 4px',
            }} />
          </div>

          {/* Road between */}
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '120px',
            height: '28px',
            background: '#666',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: '20px',
                height: '4px',
                background: 'rgba(255,255,255,0.5)',
                borderRadius: '2px',
              }} />
            ))}
          </div>
        </div>

        {/* Ground */}
        <div style={{ width: '520px', height: '12px', background: '#8a9098', borderRadius: '0 0 8px 8px' }} />

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
          Passarela Pedestre
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
          Passarela de Pedestre — Banner Suspenso sobre a Estrutura
        </div>
      </div>
    </div>
  );
};
