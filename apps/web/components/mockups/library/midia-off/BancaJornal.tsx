'use client';

import React from 'react';

interface BancaJornalProps {
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

export const BancaJornal: React.FC<BancaJornalProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#cc2200',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Anuncie na Banca';
  const resolvedBody = body ?? caption ?? description ?? 'Visibilidade máxima para quem passa todo dia';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  const magazines = [
    { color: '#1a4488', title: 'VEJA' },
    { color: '#8B0000', title: 'ISTOÉ' },
    { color: '#006633', title: 'ÉPOCA' },
    { color: '#5c2d91', title: 'TRIP' },
    { color: '#cc4400', title: 'CARTA' },
    { color: '#1a3366', title: 'INFO' },
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#c4c0b8', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '400px' }}>

        {/* Street background */}
        <div style={{
          width: '400px',
          height: '60px',
          background: 'linear-gradient(180deg, #8cc4d8 0%, #b0d0d8 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12px', background: '#c0b890' }} />
        </div>

        {/* Newsstand kiosk body */}
        <div style={{
          width: '400px',
          position: 'relative',
          background: '#c0b890',
        }}>
          {/* Booth structure */}
          <div style={{
            margin: '0 30px',
            position: 'relative',
          }}>
            {/* Slanted roof */}
            <div style={{
              height: '20px',
              background: '#558855',
              borderRadius: '4px 4px 0 0',
              transform: 'perspective(200px) rotateX(-5deg)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
            }} />
            {/* Awning strip */}
            <div style={{
              height: '8px',
              background: `repeating-linear-gradient(90deg, ${brandColor} 0px, ${brandColor} 18px, #fff 18px, #fff 36px)`,
              marginBottom: '0',
            }} />

            {/* Main kiosk body */}
            <div style={{
              background: '#e8e0cc',
              border: '2px solid #aaa090',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}>
              {/* Magazine display racks */}
              <div style={{
                background: '#d4ccb8',
                padding: '8px 10px',
                borderBottom: '2px solid #b0a880',
                display: 'grid',
                gridTemplateColumns: 'repeat(6, 1fr)',
                gap: '4px',
              }}>
                {magazines.map((mag, i) => (
                  <div key={i} style={{
                    height: '50px',
                    background: mag.color,
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '4px',
                    border: '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }}>
                    <span style={{ color: '#fff', fontSize: '6px', fontWeight: '700', letterSpacing: '0.3px' }}>
                      {mag.title}
                    </span>
                  </div>
                ))}
              </div>

              {/* Side panel ad */}
              <div style={{
                display: 'flex',
                height: '100px',
              }}>
                <div style={{
                  flex: 1,
                  background: '#e0d8c4',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  borderRight: '1px solid #b0a880',
                }}>
                  {/* Counter with items */}
                  <div style={{ fontSize: '10px', color: '#555', marginBottom: '6px', fontWeight: '600' }}>
                    Banca Central
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {['📰', '📚', '🎫'].map((item, i) => (
                      <div key={i} style={{
                        width: '24px',
                        height: '32px',
                        background: '#ccc4b0',
                        borderRadius: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                      }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Ad panel on side */}
                <div style={{
                  width: '120px',
                  background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor} 0%, #440000 100%)`,
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                }}>
                  {resolvedImage ? (
                    <img src={resolvedImage} alt="Painel banca" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : null}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '8px',
                    background: resolvedImage ? 'rgba(0,0,0,0.45)' : 'none',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: '6px' }}>
                      {resolvedHeadline}
                    </div>
                    <div style={{
                      background: 'rgba(255,255,255,0.2)',
                      color: '#fff',
                      fontSize: '9px',
                      fontWeight: '700',
                      padding: '4px 8px',
                      borderRadius: '2px',
                      letterSpacing: '0.5px',
                    }}>
                      {resolvedBrand}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ground / sidewalk */}
        <div style={{
          width: '400px',
          height: '14px',
          background: '#b8b090',
          borderRadius: '0 0 8px 8px',
        }} />

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
          Banca de Jornal
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
          Banca de Jornal — Painel Lateral + Display Frontal
        </div>
      </div>
    </div>
  );
};
