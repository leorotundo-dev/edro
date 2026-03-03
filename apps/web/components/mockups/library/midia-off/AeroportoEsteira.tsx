'use client';

import React from 'react';

interface AeroportoEsteiraProps {
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

export const AeroportoEsteira: React.FC<AeroportoEsteiraProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#aa3300',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Área de Restituição de Bagagem';
  const resolvedBody = body ?? caption ?? description ?? 'Painel premium no momento da espera';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#c8ccd4', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '480px' }}>

        {/* Airport terminal interior */}
        <div style={{
          width: '480px',
          height: '80px',
          background: 'linear-gradient(180deg, #d8dce4 0%, #c8ccd4 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Terminal ceiling grid */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(0,0,0,0.04) 59px, rgba(0,0,0,0.04) 60px)',
          }} />
          {/* Downlights */}
          {[60, 200, 340, 440].map((x, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '14px',
              left: `${x}px`,
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'rgba(255,255,220,0.9)',
              boxShadow: '0 0 12px 6px rgba(255,255,220,0.25)',
            }} />
          ))}
          {/* Floor sign */}
          <div style={{
            position: 'absolute',
            bottom: '4px',
            left: '16px',
            fontSize: '10px',
            color: '#666',
            fontWeight: '700',
            letterSpacing: '1px',
          }}>
            RESTITUIÇÃO DE BAGAGEM · BAGGAGE CLAIM
          </div>
        </div>

        {/* Scene with conveyor */}
        <div style={{
          width: '480px',
          background: '#d0d4dc',
          padding: '16px',
          position: 'relative',
        }}>
          {/* Overhead ad panel */}
          <div style={{
            width: '100%',
            background: '#fff',
            padding: '6px',
            boxShadow: '0 0 20px 4px rgba(255,255,255,0.3)',
            borderRadius: '3px',
            marginBottom: '16px',
          }}>
            <div style={{
              width: '100%',
              height: '100px',
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #001422 0%, ${brandColor}cc 50%, #1a0000 100%)`,
              overflow: 'hidden',
              position: 'relative',
              borderRadius: '2px',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Painel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#fff', lineHeight: 1.1, maxWidth: '250px' }}>
                      {resolvedHeadline}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>
                      {resolvedBody}
                    </div>
                  </div>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              )}
              {resolvedImage && (
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 24px',
                  background: 'linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 60%)',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '20px', fontWeight: '900', color: '#fff', lineHeight: 1.1, maxWidth: '250px' }}>
                      {resolvedHeadline}
                    </div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>
                      {resolvedBody}
                    </div>
                  </div>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '700',
                    padding: '10px 14px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Oval conveyor belt */}
          <div style={{
            width: '440px',
            height: '90px',
            border: '4px solid #888',
            borderRadius: '45px',
            background: '#aaa',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}>
            {/* Belt texture */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.06) 0px, rgba(0,0,0,0.06) 2px, transparent 2px, transparent 20px)',
              borderRadius: '41px',
            }} />

            {/* Belt inner oval hole */}
            <div style={{
              position: 'absolute',
              top: '18px',
              left: '60px',
              right: '60px',
              height: '54px',
              borderRadius: '27px',
              background: '#999',
              border: '3px solid #888',
            }} />

            {/* Luggage items on belt */}
            {[
              { left: 14, top: 8, w: 40, h: 28, color: '#1a3a6e' },
              { left: 120, top: 8, w: 36, h: 32, color: '#222' },
              { left: 300, top: 5, w: 45, h: 35, color: '#6e1a1a' },
              { left: 380, top: 10, w: 36, h: 28, color: '#2a5e2a' },
            ].map((bag, i) => (
              <div key={i} style={{
                position: 'absolute',
                top: `${bag.top}px`,
                left: `${bag.left}px`,
                width: `${bag.w}px`,
                height: `${bag.h}px`,
                background: bag.color,
                borderRadius: '3px',
                border: '2px solid rgba(255,255,255,0.1)',
                zIndex: 2,
              }} />
            ))}

            {/* Floor marking arrows */}
            <div style={{
              position: 'absolute',
              bottom: '6px',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(0,0,0,0.3)',
              fontSize: '18px',
              fontWeight: '900',
              letterSpacing: '8px',
            }}>
              → → →
            </div>
          </div>

          {/* Floor markings below */}
          <div style={{
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
          }}>
            {['ESTEIRA 1', 'ESTEIRA 2', 'ESTEIRA 3'].map((label, i) => (
              <div key={i} style={{
                fontSize: '9px',
                color: '#555',
                fontWeight: '700',
                letterSpacing: '1px',
                background: '#bbb',
                padding: '3px 8px',
                borderRadius: '3px',
              }}>
                {label}
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
        }}>
          Esteira de Bagagem
        </div>

        <div style={{
          marginTop: '10px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#555',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Aeroporto Esteira — Painel Aéreo na Área de Restituição
        </div>
      </div>
    </div>
  );
};
