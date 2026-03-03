'use client';

import React from 'react';

interface AeroportoBacklightProps {
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

export const AeroportoBacklight: React.FC<AeroportoBacklightProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#003399',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Bem-vindo ao Brasil';
  const resolvedBody = body ?? caption ?? description ?? 'Experimente o premium na chegada';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  const flightRows = [
    { dest: 'GRU → JFK', time: '14:35', gate: 'A12', status: 'Embarcando' },
    { dest: 'GRU → LHR', time: '15:10', gate: 'B04', status: 'No prazo' },
    { dest: 'GRU → CDG', time: '16:00', gate: 'C08', status: 'No prazo' },
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#0a0c12', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '480px' }}>

        {/* Airport terminal ceiling */}
        <div style={{
          width: '480px',
          height: '70px',
          background: 'linear-gradient(180deg, #1a1e2a 0%, #0e1018 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Terminal glass ceiling effect */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(255,255,255,0.03) 59px, rgba(255,255,255,0.03) 60px)',
          }} />
          {/* LED downlights */}
          {[50, 160, 280, 400].map((x, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '10px',
              left: `${x}px`,
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: 'rgba(255,255,220,0.8)',
              boxShadow: '0 0 12px 6px rgba(255,255,220,0.2)',
            }} />
          ))}

          {/* Airport context strip */}
          <div style={{
            position: 'absolute',
            top: '8px',
            left: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '10px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '3px',
              letterSpacing: '1px',
            }}>
              TERMINAL 3
            </div>
            <div style={{
              color: 'rgba(255,255,255,0.5)',
              fontSize: '9px',
              letterSpacing: '0.5px',
            }}>
              INTERNACIONAL
            </div>
          </div>
        </div>

        {/* Terminal wall with panel */}
        <div style={{
          width: '480px',
          background: '#0c0e18',
          padding: '16px',
          position: 'relative',
        }}>
          {/* Premium lightbox panel */}
          <div style={{
            width: '100%',
            background: '#fff',
            padding: '8px',
            boxShadow: '0 0 40px 10px rgba(255,255,255,0.25), 0 0 80px 30px rgba(255,255,255,0.08)',
            borderRadius: '3px',
            position: 'relative',
          }}>
            {/* Inner glow border */}
            <div style={{
              position: 'absolute',
              inset: '4px',
              border: '1px solid rgba(255,255,255,0.7)',
              borderRadius: '2px',
              pointerEvents: 'none',
              zIndex: 5,
            }} />

            {/* Premium ad panel */}
            <div style={{
              width: '100%',
              height: '200px',
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #001a44 0%, ${brandColor} 50%, #000d22 100%)`,
              overflow: 'hidden',
              position: 'relative',
              borderRadius: '1px',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Backlight aeroporto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '250px',
                    height: '250px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    bottom: '-30px',
                    left: '-20px',
                    width: '160px',
                    height: '160px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.03)',
                  }} />
                </>
              )}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '20px 28px',
                background: resolvedImage ? 'linear-gradient(90deg, rgba(0,0,0,0.55) 0%, transparent 60%)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '26px',
                    fontWeight: '900',
                    color: '#fff',
                    lineHeight: 1.1,
                    textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                    maxWidth: '260px',
                    letterSpacing: '-0.5px',
                  }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.85)',
                    marginTop: '10px',
                    fontWeight: '300',
                    letterSpacing: '0.5px',
                  }}>
                    {resolvedBody}
                  </div>
                </div>
                <div style={{
                  background: brandColor,
                  color: '#fff',
                  fontWeight: '900',
                  fontSize: '13px',
                  padding: '12px 18px',
                  borderRadius: '4px',
                  flexShrink: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '1.5px',
                  boxShadow: `0 4px 20px ${brandColor}88`,
                }}>
                  {resolvedBrand}
                </div>
              </div>
            </div>
          </div>

          {/* Flight board element */}
          <div style={{
            marginTop: '12px',
            background: '#0d1020',
            border: '1px solid #1a2030',
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            <div style={{
              background: '#111828',
              padding: '5px 12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #1a2030',
            }}>
              <div style={{ fontSize: '9px', color: '#aaa', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
                Partidas — Departures
              </div>
              <div style={{ fontSize: '9px', color: brandColor, fontWeight: '700' }}>
                Patrocinado por {resolvedBrand}
              </div>
            </div>
            {flightRows.map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '5px 12px',
                borderBottom: i < flightRows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                gap: '16px',
              }}>
                <div style={{ fontSize: '10px', color: '#fff', fontWeight: '700', flex: 1 }}>{f.dest}</div>
                <div style={{ fontSize: '10px', color: '#aaa', width: '36px' }}>{f.time}</div>
                <div style={{ fontSize: '10px', color: '#aaa', width: '26px' }}>{f.gate}</div>
                <div style={{
                  fontSize: '9px',
                  color: f.status === 'Embarcando' ? '#00cc66' : '#aaa',
                  fontWeight: '600',
                  width: '70px',
                  textAlign: 'right',
                }}>
                  {f.status}
                </div>
              </div>
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
          boxShadow: '0 0 12px rgba(255,255,255,0.25)',
        }}>
          Backlight Aeroporto
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
          Aeroporto Backlight — Lightbox Premium · Terminal Internacional
        </div>
      </div>
    </div>
  );
};
