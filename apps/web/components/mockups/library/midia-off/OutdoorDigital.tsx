'use client';

import React from 'react';

interface OutdoorDigitalProps {
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

export const OutdoorDigital: React.FC<OutdoorDigitalProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#ff4d00',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'LED Digital em Destaque';
  const resolvedBody = body ?? caption ?? description ?? 'Mídia dinâmica em tempo real';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';
  const tickerText = `${resolvedBrand.toUpperCase()} — ${resolvedHeadline} — ${resolvedBody} — `;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#111', display: 'inline-block', borderRadius: '12px' }}>
      <style>{`
        @keyframes outdoor-digital-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes outdoor-digital-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>

      <div style={{ position: 'relative', width: '500px' }}>

        {/* Night city scene */}
        <div style={{
          width: '500px',
          height: '170px',
          background: 'linear-gradient(180deg, #050508 0%, #0a0a18 60%, #141428 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* City buildings with lit windows */}
          {[
            { left: 10, width: 50, height: 100, windows: [[10, 15], [30, 15], [10, 35], [30, 35], [10, 55], [30, 55]] },
            { left: 70, width: 40, height: 75, windows: [[8, 12], [24, 12], [8, 28], [24, 28]] },
            { left: 120, width: 60, height: 120, windows: [[10, 12], [30, 12], [10, 30], [30, 30], [10, 48], [30, 48], [10, 66]] },
            { left: 190, width: 45, height: 90, windows: [[8, 14], [24, 14], [8, 30], [24, 30], [8, 46]] },
            { left: 290, width: 55, height: 110, windows: [[10, 12], [30, 12], [10, 30], [30, 30], [10, 48], [30, 48]] },
            { left: 355, width: 50, height: 80, windows: [[8, 14], [24, 14], [8, 30], [24, 30]] },
            { left: 415, width: 65, height: 130, windows: [[10, 12], [30, 12], [50, 12], [10, 30], [30, 30], [50, 30], [10, 48], [30, 48]] },
          ].map((b, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '20px',
              left: `${b.left}px`,
              width: `${b.width}px`,
              height: `${b.height}px`,
              background: '#0e0e22',
              border: '1px solid #1a1a30',
            }}>
              {b.windows.map(([wx, wy], wi) => (
                <div key={wi} style={{
                  position: 'absolute',
                  top: `${wy}px`,
                  left: `${wx}px`,
                  width: '8px',
                  height: '10px',
                  background: Math.random() > 0.3 ? 'rgba(255,220,100,0.8)' : 'rgba(100,150,255,0.6)',
                  borderRadius: '1px',
                }} />
              ))}
            </div>
          ))}
          {/* Ground */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '20px', background: '#0a0a14' }} />
        </div>

        {/* Dark LED frame */}
        <div style={{
          width: '500px',
          background: '#0d0d0d',
          padding: '10px',
          border: '5px solid #1a1a1a',
          borderRadius: '4px',
          boxShadow: '0 0 30px rgba(0,0,0,0.9), inset 0 0 8px rgba(0,0,0,0.8)',
          marginTop: '-75px',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Corner LEDs */}
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map((corner, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: corner.includes('top') ? '3px' : 'auto',
              bottom: corner.includes('bottom') ? '3px' : 'auto',
              left: corner.includes('left') ? '3px' : 'auto',
              right: corner.includes('right') ? '3px' : 'auto',
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: brandColor,
              boxShadow: `0 0 6px ${brandColor}`,
              animation: 'outdoor-digital-blink 2s ease-in-out infinite',
              animationDelay: `${i * 0.5}s`,
            }} />
          ))}

          {/* LED dot-matrix texture overlay */}
          <div style={{
            position: 'absolute',
            inset: '10px',
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '4px 4px',
            pointerEvents: 'none',
            zIndex: 4,
            borderRadius: '2px',
          }} />

          {/* Ad panel */}
          <div style={{
            width: '100%',
            height: '130px',
            position: 'relative',
            overflow: 'hidden',
            background: resolvedImage ? 'transparent' : `radial-gradient(ellipse at 30% 50%, ${brandColor}33 0%, #0a0010 60%)`,
            borderRadius: '2px',
          }}>
            {resolvedImage ? (
              <img src={resolvedImage} alt="Anúncio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                {/* Scanlines effect */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.15) 3px, rgba(0,0,0,0.15) 4px)',
                  pointerEvents: 'none',
                  zIndex: 2,
                }} />
                {/* Glow orb */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '35%',
                  transform: 'translate(-50%, -50%)',
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${brandColor}44 0%, transparent 70%)`,
                }} />
              </>
            )}

            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              zIndex: 3,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '22px',
                  fontWeight: '900',
                  color: '#fff',
                  lineHeight: 1.1,
                  textShadow: `0 0 20px ${brandColor}, 0 0 40px ${brandColor}66`,
                  maxWidth: '260px',
                  letterSpacing: '-0.5px',
                }}>
                  {resolvedHeadline}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: brandColor,
                  marginTop: '8px',
                  fontWeight: '600',
                  textShadow: `0 0 8px ${brandColor}`,
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                }}>
                  {resolvedBody}
                </div>
              </div>
              <div style={{
                background: `linear-gradient(135deg, ${brandColor} 0%, #cc0000 100%)`,
                color: '#fff',
                fontWeight: '900',
                fontSize: '11px',
                padding: '10px 12px',
                borderRadius: '3px',
                flexShrink: 0,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                boxShadow: `0 0 16px ${brandColor}88`,
              }}>
                {resolvedBrand}
              </div>
            </div>
          </div>

          {/* Animated ticker */}
          <div style={{
            marginTop: '8px',
            background: '#000',
            height: '22px',
            overflow: 'hidden',
            position: 'relative',
            borderRadius: '2px',
            border: `1px solid ${brandColor}44`,
          }}>
            <div style={{
              display: 'flex',
              whiteSpace: 'nowrap',
              animation: 'outdoor-digital-marquee 12s linear infinite',
              height: '100%',
              alignItems: 'center',
            }}>
              {[...Array(4)].map((_, idx) => (
                <span key={idx} style={{
                  fontSize: '11px',
                  color: brandColor,
                  fontWeight: '700',
                  letterSpacing: '2px',
                  paddingRight: '60px',
                  textShadow: `0 0 8px ${brandColor}`,
                }}>
                  {tickerText}
                </span>
              ))}
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
          boxShadow: `0 0 10px ${brandColor}`,
        }}>
          LED Digital
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
          Outdoor Digital LED — Conteúdo Dinâmico · Ticker em Loop
        </div>
      </div>
    </div>
  );
};
