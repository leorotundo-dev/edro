'use client';

import React, { useState } from 'react';

interface EstandeXBannerProps {
  headline?: string;
  title?: string;
  name?: string;
  username?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  brandName?: string;
}

export const EstandeXBanner: React.FC<EstandeXBannerProps> = ({
  headline,
  title,
  name,
  username,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#e11d48',
  brandName,
}) => {
  const [vista, setVista] = useState<'frente' | 'lateral'>('frente');

  const resolvedHeadline = headline ?? title ?? name ?? 'Estande X-Banner';
  const resolvedBody = body ?? caption ?? description ?? text ?? 'Destaque sua marca em feiras e eventos';
  const resolvedImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  const isFrente = vista === 'frente';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#ccc8c0', display: 'inline-block', borderRadius: '12px' }}>
      <style>{`
        @keyframes xban-sway {
          0%, 100% { transform: rotate(-0.6deg); }
          50% { transform: rotate(0.6deg); }
        }
      `}</style>

      <div style={{ position: 'relative', width: '380px' }}>
        {/* Format badge */}
        <div style={{
          position: 'absolute', top: 0, right: 0,
          background: brandColor, color: '#fff',
          fontSize: '11px', fontWeight: '700',
          padding: '4px 10px', borderRadius: '4px', zIndex: 20,
        }}>
          Estande X-Banner
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
          {(['frente', 'lateral'] as const).map(v => (
            <button
              key={v}
              type="button"
              aria-label={`Visualizar vista ${v}`}
              onClick={() => setVista(v)}
              style={{
                padding: '4px 14px', borderRadius: '4px', border: 'none',
                background: vista === v ? brandColor : '#999',
                color: '#fff', fontSize: '11px', fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              {v === 'frente' ? 'Frente' : 'Lateral'}
            </button>
          ))}
        </div>

        {/* Scene */}
        <div style={{
          width: '380px', background: '#d8d4cc', borderRadius: '8px',
          padding: '20px', display: 'flex', justifyContent: 'center',
          alignItems: 'flex-end', minHeight: '420px',
          position: 'relative', overflow: 'hidden',
        }}>
          {/* Floor */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '30px',
            background: 'linear-gradient(180deg, #b8b0a8 0%, #a0988e 100%)',
          }} />

          {/* X-Frame Banner assembly */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            position: 'relative',
            animation: 'xban-sway 4s ease-in-out infinite',
            transformOrigin: 'bottom center',
          }}>
            {/* Top crossbar */}
            <div style={{
              width: isFrente ? '170px' : '10px', height: '7px',
              background: 'linear-gradient(90deg, #555 0%, #888 50%, #555 100%)',
              borderRadius: '3px', position: 'relative', zIndex: 3,
            }}>
              {isFrente && (
                <>
                  <div style={{ position: 'absolute', top: '-5px', left: '-6px', width: '17px', height: '17px', borderRadius: '50%', background: '#333', border: '2px solid #666' }} />
                  <div style={{ position: 'absolute', top: '-5px', right: '-6px', width: '17px', height: '17px', borderRadius: '50%', background: '#333', border: '2px solid #666' }} />
                </>
              )}
            </div>

            {/* X diagonal struts (frente only) */}
            {isFrente && (
              <div style={{ position: 'absolute', top: '4px', width: '170px', height: '330px', zIndex: 1 }}>
                <div style={{ position: 'absolute', top: 0, left: '5px', width: '3px', height: '340px', background: '#555', transform: 'rotate(21deg)', transformOrigin: 'top left' }} />
                <div style={{ position: 'absolute', top: 0, right: '5px', width: '3px', height: '340px', background: '#555', transform: 'rotate(-21deg)', transformOrigin: 'top right' }} />
              </div>
            )}

            {/* Banner face */}
            <div style={{
              width: isFrente ? '160px' : '7px', height: '330px',
              background: resolvedImage ? 'transparent'
                : `linear-gradient(180deg, ${brandColor} 0%, ${brandColor}aa 55%, #111 100%)`,
              border: isFrente ? `2px solid ${brandColor}99` : '1px solid #555',
              borderRadius: '4px', overflow: 'hidden',
              position: 'relative', marginTop: '-4px', zIndex: 2,
              boxShadow: isFrente ? '3px 6px 18px rgba(0,0,0,0.3)' : 'none',
            }}>
              {resolvedImage && isFrente && (
                <img src={resolvedImage} alt="X-Banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              )}
              {isFrente && (
                <div style={{
                  position: 'absolute', inset: 0, display: 'flex',
                  flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '16px 12px',
                  background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
                }}>
                  {/* Logo circle */}
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.18)',
                    border: '2px solid rgba(255,255,255,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: '12px',
                  }}>
                    <span style={{ fontSize: '22px', fontWeight: '900', color: '#fff' }}>
                      {resolvedBrand.slice(0, 1)}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '14px', fontWeight: '900', color: '#fff',
                    textAlign: 'center', lineHeight: 1.2, marginBottom: '8px',
                    textShadow: '0 1px 6px rgba(0,0,0,0.6)',
                  }}>
                    {resolvedHeadline}
                  </div>

                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 1.5, marginBottom: '16px' }}>
                    {resolvedBody}
                  </div>

                  <div style={{
                    background: 'rgba(255,255,255,0.95)', color: brandColor,
                    fontWeight: '900', fontSize: '10px', padding: '4px 12px',
                    borderRadius: '3px', textTransform: 'uppercase', letterSpacing: '1px',
                  }}>
                    {resolvedBrand}
                  </div>

                  <div style={{
                    position: 'absolute', bottom: '6px', right: '6px',
                    background: 'rgba(0,0,0,0.55)', color: '#fff',
                    fontSize: '8px', fontWeight: '600',
                    padding: '2px 5px', borderRadius: '2px',
                  }}>
                    60×160cm
                  </div>
                </div>
              )}
            </div>

            {/* Bottom crossbar */}
            <div style={{
              width: isFrente ? '120px' : '10px', height: '7px',
              background: 'linear-gradient(90deg, #555 0%, #888 50%, #555 100%)',
              borderRadius: '3px', position: 'relative', marginTop: '-4px', zIndex: 3,
            }}>
              {isFrente && (
                <>
                  <div style={{ position: 'absolute', bottom: '-5px', left: '-6px', width: '17px', height: '17px', borderRadius: '50%', background: '#333', border: '2px solid #666' }} />
                  <div style={{ position: 'absolute', bottom: '-5px', right: '-6px', width: '17px', height: '17px', borderRadius: '50%', background: '#333', border: '2px solid #666' }} />
                </>
              )}
            </div>

            {/* Central pole */}
            <div style={{
              width: '6px', height: '46px',
              background: 'linear-gradient(90deg, #555 0%, #aaa 50%, #555 100%)',
              borderRadius: '3px',
            }} />

            {/* Base feet */}
            <div style={{
              width: isFrente ? '90px' : '14px', height: '10px',
              background: '#3a3a3a', borderRadius: '3px',
            }} />
          </div>
        </div>

        <div style={{
          marginTop: '8px', textAlign: 'center',
          fontSize: '11px', color: '#555', fontWeight: '600',
          letterSpacing: '1px', textTransform: 'uppercase',
        }}>
          Estande X-Banner — X-Frame 60×160cm
        </div>
      </div>
    </div>
  );
};
