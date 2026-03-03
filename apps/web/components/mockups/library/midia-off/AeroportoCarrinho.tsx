'use client';

import React from 'react';

interface AeroportoCarrinhoProps {
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

export const AeroportoCarrinho: React.FC<AeroportoCarrinhoProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#cc6600',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Sua Bagagem, Nossa Parceria';
  const resolvedBody = body ?? caption ?? description ?? 'Presente em cada chegada e saída';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#d4d8e0', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Baggage cart outline */}
        <div style={{ position: 'relative', width: '340px' }}>

          {/* Handle bar */}
          <div style={{
            width: '240px',
            height: '14px',
            background: '#555',
            borderRadius: '7px',
            margin: '0 auto 4px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          }} />
          <div style={{
            width: '12px',
            height: '30px',
            background: '#555',
            borderRadius: '3px',
            margin: '0 auto 0',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '200px',
              height: '8px',
              background: '#444',
              borderRadius: '3px',
            }} />
          </div>

          {/* Cart frame */}
          <div style={{
            width: '100%',
            background: '#ccc',
            border: '3px solid #999',
            borderRadius: '6px',
            overflow: 'hidden',
            marginTop: '10px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          }}>
            {/* Cart basket top edge */}
            <div style={{
              height: '16px',
              background: '#b0b0b0',
              borderBottom: '2px solid #999',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px',
            }}>
              <div style={{ width: '24px', height: '6px', background: '#888', borderRadius: '2px' }} />
              <div style={{ width: '24px', height: '6px', background: '#888', borderRadius: '2px' }} />
            </div>

            {/* Luggage items (stacked) */}
            <div style={{
              padding: '8px',
              background: '#c0c4c8',
              minHeight: '80px',
              display: 'flex',
              gap: '6px',
              alignItems: 'flex-end',
            }}>
              {[
                { w: 60, h: 70, color: '#1a4488' },
                { w: 55, h: 80, color: '#333' },
                { w: 50, h: 65, color: '#8B0000' },
                { w: 65, h: 75, color: '#2a5e2a' },
                { w: 50, h: 70, color: '#444' },
              ].map((bag, i) => (
                <div key={i} style={{
                  width: `${bag.w}px`,
                  height: `${bag.h}px`,
                  background: bag.color,
                  borderRadius: '4px',
                  border: '2px solid rgba(255,255,255,0.15)',
                  flexShrink: 0,
                  position: 'relative',
                }}>
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '20px',
                    height: '8px',
                    background: 'rgba(255,255,255,0.2)',
                    borderRadius: '2px',
                  }} />
                </div>
              ))}
            </div>

            {/* Ad panel on back panel */}
            <div style={{
              width: '100%',
              height: '110px',
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #0d0d20 0%, ${brandColor}cc 55%, #1a0000 100%)`,
              position: 'relative',
              overflow: 'hidden',
              borderTop: '3px solid #888',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Painel carrinho" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{
                    position: 'absolute',
                    top: '-30px',
                    right: '-30px',
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.05)',
                  }} />
                </>
              )}

              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: '900',
                    color: '#fff',
                    lineHeight: 1.2,
                    textShadow: '0 2px 8px rgba(0,0,0,0.7)',
                    maxWidth: '180px',
                  }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.8)',
                    marginTop: '5px',
                  }}>
                    {resolvedBody}
                  </div>
                </div>
                <div style={{
                  background: brandColor,
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: '700',
                  padding: '8px 12px',
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

          {/* Wheels */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingLeft: '30px',
            paddingRight: '30px',
            marginTop: '4px',
          }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#222',
                border: '4px solid #555',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#444' }} />
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
          Carrinho de Bagagem
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
          Aeroporto Carrinho — Painel no Carrinho de Bagagem
        </div>
      </div>
    </div>
  );
};
