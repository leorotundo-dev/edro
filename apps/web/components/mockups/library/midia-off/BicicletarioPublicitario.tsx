'use client';

import React from 'react';

interface BicicletarioPublicitarioProps {
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

export const BicicletarioPublicitario: React.FC<BicicletarioPublicitarioProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#1a7a40',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Bicicletário Patrocinado';
  const resolvedBody = body ?? caption ?? description ?? 'Apoie a mobilidade urbana e sua marca';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#b8c4b0', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '420px' }}>

        {/* Scene background */}
        <div style={{
          width: '420px',
          height: '60px',
          background: 'linear-gradient(180deg, #8ab8d0 0%, #aaccd8 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '16px', background: '#8aaa62' }} />
        </div>

        {/* Ground scene */}
        <div style={{
          width: '420px',
          background: '#9ab872',
          padding: '16px 16px 16px',
          position: 'relative',
        }}>
          {/* Ad panel behind rack */}
          <div style={{
            width: '100%',
            background: '#fff',
            padding: '5px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
            borderRadius: '4px',
            marginBottom: '12px',
          }}>
            <div style={{
              width: '100%',
              height: '80px',
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #001a0a 0%, ${brandColor}dd 55%, #001a0a 100%)`,
              overflow: 'hidden',
              position: 'relative',
              borderRadius: '2px',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Bicicletário" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : null}
              <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 18px',
                background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '15px', fontWeight: '900', color: '#fff', lineHeight: 1.2, maxWidth: '220px' }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>
                    {resolvedBody}
                  </div>
                </div>
                <div style={{
                  background: brandColor,
                  color: '#fff',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '8px 12px',
                  borderRadius: '3px',
                  flexShrink: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}>
                  {resolvedBrand}
                </div>
              </div>
            </div>
          </div>

          {/* Bicycle rack — U-shaped bars */}
          <div style={{
            display: 'flex',
            gap: '20px',
            justifyContent: 'center',
            alignItems: 'flex-end',
            position: 'relative',
          }}>
            {/* Horizontal base bar */}
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '20px',
              right: '20px',
              height: '8px',
              background: '#666',
              borderRadius: '4px',
              zIndex: 1,
            }} />

            {/* U-shaped rack units */}
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} style={{
                width: '30px',
                height: '60px',
                border: '5px solid #555',
                borderBottom: 'none',
                borderRadius: '15px 15px 0 0',
                background: 'transparent',
                position: 'relative',
                zIndex: 2,
              }} />
            ))}
          </div>

          {/* Bicycle silhouette on rack 2 */}
          <div style={{
            position: 'absolute',
            bottom: '24px',
            left: '90px',
          }}>
            <svg width="60" height="40" viewBox="0 0 60 40">
              {/* Wheels */}
              <circle cx="10" cy="30" r="8" fill="none" stroke="#444" strokeWidth="2" />
              <circle cx="50" cy="30" r="8" fill="none" stroke="#444" strokeWidth="2" />
              {/* Frame */}
              <line x1="10" y1="30" x2="30" y2="12" stroke="#444" strokeWidth="2" />
              <line x1="30" y1="12" x2="50" y2="30" stroke="#444" strokeWidth="2" />
              <line x1="30" y1="12" x2="28" y2="30" stroke="#444" strokeWidth="1.5" />
              {/* Handlebar */}
              <line x1="30" y1="12" x2="26" y2="8" stroke="#444" strokeWidth="2" />
              <line x1="26" y1="8" x2="22" y2="10" stroke="#444" strokeWidth="2" />
              {/* Seat */}
              <line x1="28" y1="12" x2="34" y2="8" stroke="#444" strokeWidth="2" />
              <line x1="32" y1="8" x2="38" y2="8" stroke="#444" strokeWidth="2.5" />
            </svg>
          </div>
        </div>

        {/* Ground */}
        <div style={{ width: '420px', height: '12px', background: '#7a9852', borderRadius: '0 0 8px 8px' }} />

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
          Bicicletário
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
          Bicicletário Publicitário — Painel + Rack em U · Mobilidade Urbana
        </div>
      </div>
    </div>
  );
};
