'use client';

import React from 'react';

interface OutdoorBusdoorProps {
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

export const OutdoorBusdoor: React.FC<OutdoorBusdoorProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#0057a8',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Anuncie no Busdoor';
  const resolvedBody = body ?? caption ?? description ?? 'Impacte milhares de passageiros diariamente';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#e8e8e8', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Bus body outline */}
        <div style={{
          width: '420px',
          height: '200px',
          background: '#f0f0f0',
          border: '3px solid #888',
          borderRadius: '16px 16px 8px 8px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>
          {/* Bus color stripe */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '45px',
            background: '#2255aa',
            borderRadius: '13px 13px 0 0',
          }} />
          <div style={{
            position: 'absolute',
            top: '45px',
            left: 0,
            right: 0,
            height: '8px',
            background: '#ffcc00',
          }} />

          {/* Destination sign */}
          <div style={{
            position: 'absolute',
            top: '10px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#111',
            color: '#ffcc00',
            fontSize: '10px',
            fontWeight: '700',
            padding: '3px 14px',
            borderRadius: '3px',
            letterSpacing: '1px',
          }}>
            CENTRO / TERMINAL
          </div>

          {/* Windows row */}
          <div style={{
            position: 'absolute',
            top: '58px',
            left: '14px',
            right: '14px',
            display: 'flex',
            gap: '8px',
          }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} style={{
                flex: 1,
                height: '38px',
                background: 'rgba(180,220,255,0.5)',
                border: '2px solid #999',
                borderRadius: '6px 6px 4px 4px',
              }} />
            ))}
          </div>

          {/* Door area with ad panel */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '130px',
            height: '88px',
            border: '2px solid #666',
            borderRadius: '4px',
            background: '#ddd',
            overflow: 'hidden',
            display: 'flex',
          }}>
            {/* Door split */}
            <div style={{ flex: 1, borderRight: '1px solid #888', position: 'relative', overflow: 'hidden' }}>
              {resolvedImage && (
                <img src={resolvedImage} alt="Busdoor" style={{ width: '200%', height: '100%', objectFit: 'cover' }} />
              )}
            </div>
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
              {resolvedImage && (
                <img src={resolvedImage} alt="Busdoor" style={{ width: '200%', height: '100%', objectFit: 'cover', marginLeft: '-100%' }} />
              )}
            </div>
            {!resolvedImage && (
              <div style={{
                position: 'absolute',
                inset: 0,
                background: `linear-gradient(135deg, ${brandColor} 0%, #0099ff 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <span style={{ color: '#fff', fontWeight: '900', fontSize: '10px', textAlign: 'center', padding: '4px', letterSpacing: '0.5px' }}>
                  {resolvedBrand}
                </span>
              </div>
            )}
          </div>

          {/* Side ad panel (lateral) */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            left: '14px',
            width: '80px',
            height: '70px',
            background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor} 0%, #003880 100%)`,
            border: '2px solid #555',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            {resolvedImage ? (
              <img src={resolvedImage} alt="Lateral" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
              }}>
                <div style={{ color: '#fff', fontWeight: '900', fontSize: '9px', textAlign: 'center', lineHeight: 1.2 }}>
                  {resolvedHeadline.substring(0, 16)}
                </div>
              </div>
            )}
          </div>

          {/* Right side ad panel */}
          <div style={{
            position: 'absolute',
            bottom: '16px',
            right: '14px',
            width: '80px',
            height: '70px',
            background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor} 0%, #003880 100%)`,
            border: '2px solid #555',
            borderRadius: '3px',
            overflow: 'hidden',
          }}>
            {resolvedImage ? (
              <img src={resolvedImage} alt="Lateral direita" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
              }}>
                <div style={{ color: '#fff', fontWeight: '700', fontSize: '8px', textAlign: 'center', lineHeight: 1.2 }}>
                  {resolvedBrand}
                </div>
              </div>
            )}
          </div>

          {/* Dimension badge */}
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            background: brandColor,
            color: '#fff',
            fontSize: '9px',
            fontWeight: '700',
            padding: '3px 6px',
            borderRadius: '3px',
            zIndex: 10,
          }}>
            70×200cm
          </div>
        </div>

        {/* Wheels */}
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '380px', marginTop: '-8px' }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: '#333',
              border: '4px solid #555',
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#666' }} />
            </div>
          ))}
        </div>

        {/* Ad info */}
        <div style={{
          marginTop: '16px',
          padding: '10px 16px',
          background: '#fff',
          borderRadius: '8px',
          width: '380px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <div style={{
            fontSize: '14px',
            fontWeight: '800',
            color: '#111',
            marginBottom: '4px',
          }}>
            {resolvedHeadline}
          </div>
          <div style={{ fontSize: '11px', color: '#555' }}>
            {resolvedBody}
          </div>
        </div>

        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#666',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Busdoor — Mídia Exterior em Ônibus · 70×200cm
        </div>
      </div>
    </div>
  );
};
