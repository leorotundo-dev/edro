'use client';

import React from 'react';

interface OutdoorTaxiProps {
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

export const OutdoorTaxi: React.FC<OutdoorTaxiProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#0047ab',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Seu Anúncio no Táxi';
  const resolvedBody = body ?? caption ?? description ?? 'Impacte passageiros em toda a cidade';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#e0e4e8', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Taxi body */}
        <div style={{ position: 'relative', width: '360px' }}>

          {/* Roof topper display panel */}
          <div style={{
            position: 'absolute',
            top: '-52px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}>
            {/* Mounting bracket */}
            <div style={{
              width: '80px',
              height: '6px',
              background: '#555',
              borderRadius: '3px',
            }} />
            {/* Topper panel — illuminated display */}
            <div style={{
              width: '180px',
              height: '46px',
              background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor} 0%, #0077ff 100%)`,
              border: '3px solid #fff',
              borderRadius: '6px',
              marginTop: '2px',
              overflow: 'hidden',
              boxShadow: '0 0 14px rgba(255,255,255,0.6), 0 4px 12px rgba(0,0,0,0.3)',
              position: 'relative',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Topper" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <>
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(255,255,255,0.07)',
                    backgroundImage: 'repeating-linear-gradient(90deg, transparent, transparent 5px, rgba(255,255,255,0.03) 5px, rgba(255,255,255,0.03) 6px)',
                  }} />
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 8px',
                  }}>
                    <span style={{
                      color: '#fff',
                      fontWeight: '900',
                      fontSize: '11px',
                      textAlign: 'center',
                      letterSpacing: '0.5px',
                      textShadow: '0 0 8px rgba(255,255,255,0.5)',
                    }}>
                      {resolvedBrand}
                    </span>
                  </div>
                </>
              )}
              {/* Glow indicator light */}
              <div style={{
                position: 'absolute',
                top: '4px',
                right: '5px',
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#00ff88',
                boxShadow: '0 0 6px #00ff88',
              }} />
            </div>
          </div>

          {/* Taxi car body */}
          <div style={{
            width: '360px',
            height: '160px',
            background: '#ffcc00',
            borderRadius: '30px 30px 10px 10px',
            position: 'relative',
            border: '2px solid #cc9900',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            overflow: 'hidden',
          }}>
            {/* Roof cut */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '60px',
              right: '60px',
              height: '55px',
              background: '#ffcc00',
              borderRadius: '20px 20px 0 0',
              border: '2px solid #cc9900',
              borderBottom: 'none',
            }} />

            {/* Windshield */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '70px',
              width: '100px',
              height: '46px',
              background: 'rgba(180,220,255,0.55)',
              borderRadius: '12px 8px 0 0',
              border: '1px solid rgba(0,0,0,0.15)',
            }} />

            {/* Rear window */}
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '70px',
              width: '100px',
              height: '46px',
              background: 'rgba(180,220,255,0.55)',
              borderRadius: '8px 12px 0 0',
              border: '1px solid rgba(0,0,0,0.15)',
            }} />

            {/* Side windows */}
            <div style={{
              position: 'absolute',
              top: '55px',
              left: '55px',
              width: '80px',
              height: '38px',
              background: 'rgba(180,220,255,0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.1)',
            }} />
            <div style={{
              position: 'absolute',
              top: '55px',
              left: '145px',
              width: '80px',
              height: '38px',
              background: 'rgba(180,220,255,0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.1)',
            }} />
            <div style={{
              position: 'absolute',
              top: '55px',
              right: '55px',
              width: '80px',
              height: '38px',
              background: 'rgba(180,220,255,0.5)',
              borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.1)',
            }} />

            {/* Door ad panel (side) */}
            <div style={{
              position: 'absolute',
              bottom: '30px',
              left: '40px',
              right: '40px',
              height: '52px',
              background: resolvedImage ? 'transparent' : `linear-gradient(90deg, ${brandColor} 0%, #003399 100%)`,
              borderRadius: '6px',
              overflow: 'hidden',
              border: '1px solid rgba(0,0,0,0.15)',
            }}>
              {resolvedImage ? (
                <img src={resolvedImage} alt="Lataria" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 12px',
                }}>
                  <div style={{ color: '#fff', fontWeight: '900', fontSize: '11px', maxWidth: '180px', lineHeight: 1.2 }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: '700',
                    padding: '4px 8px',
                    borderRadius: '3px',
                    letterSpacing: '0.5px',
                    flexShrink: 0,
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              )}
            </div>

            {/* TAXI sign */}
            <div style={{
              position: 'absolute',
              top: '10px',
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#111',
              color: '#ffcc00',
              fontSize: '8px',
              fontWeight: '900',
              padding: '2px 8px',
              borderRadius: '2px',
              letterSpacing: '2px',
            }}>
              TÁXI
            </div>

            {/* Checkerboard stripe */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '12px',
              backgroundImage: 'repeating-linear-gradient(90deg, #000 0px, #000 10px, #ffcc00 10px, #ffcc00 20px)',
              opacity: 0.5,
            }} />
          </div>

          {/* Wheels */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingLeft: '30px',
            paddingRight: '30px',
            marginTop: '-10px',
          }}>
            {[0, 1].map((i) => (
              <div key={i} style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                background: '#222',
                border: '5px solid #444',
                boxShadow: 'inset 0 0 12px rgba(0,0,0,0.6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#666' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Info strip */}
        <div style={{
          marginTop: '16px',
          padding: '10px 16px',
          background: '#fff',
          borderRadius: '8px',
          width: '360px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#111', marginBottom: '3px' }}>
            {resolvedHeadline}
          </div>
          <div style={{ fontSize: '11px', color: '#555' }}>{resolvedBody}</div>
        </div>

        {/* Format label */}
        <div style={{
          marginTop: '8px',
          textAlign: 'center',
          fontSize: '11px',
          color: '#666',
          fontWeight: '600',
          letterSpacing: '1px',
          textTransform: 'uppercase',
        }}>
          Busdoor / Taxi Topper — Painel Luminoso + Lataria
        </div>
      </div>
    </div>
  );
};
