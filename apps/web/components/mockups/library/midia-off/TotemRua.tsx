'use client';

import React from 'react';

interface TotemRuaProps {
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

export const TotemRua: React.FC<TotemRuaProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#004488',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Totem Informativo';
  const resolvedBody = body ?? caption ?? description ?? 'Informação e publicidade no coração da cidade';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  const navItems = [
    { label: 'Terminal', arrow: '↑', dist: '200m' },
    { label: 'Shopping',  arrow: '→', dist: '350m' },
    { label: 'Hospital',  arrow: '←', dist: '500m' },
    { label: 'Metrô',     arrow: '↓', dist: '120m' },
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#b4bcc4', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Sky */}
        <div style={{
          width: '340px',
          height: '70px',
          background: 'linear-gradient(180deg, #7ab0cc 0%, #a8ccd8 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: '14px', left: '40px', width: '75px', height: '22px', background: 'rgba(255,255,255,0.85)', borderRadius: '12px' }} />
          <div style={{ position: 'absolute', top: '20px', left: '220px', width: '55px', height: '16px', background: 'rgba(255,255,255,0.7)', borderRadius: '10px' }} />
          {/* Buildings silhouette */}
          {[20, 70, 130, 230, 280].map((x, i) => (
            <div key={i} style={{
              position: 'absolute',
              bottom: '12px',
              left: `${x}px`,
              width: `${20 + (i % 3) * 12}px`,
              height: `${18 + (i % 4) * 10}px`,
              background: 'rgba(60,60,80,0.25)',
            }} />
          ))}
          {/* Ground */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12px', background: '#c4bc9c' }} />
        </div>

        {/* Sidewalk */}
        <div style={{
          width: '340px',
          background: '#bab498',
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: '22px',
          position: 'relative',
        }}>
          {/* Sidewalk tile texture */}
          <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0px, rgba(0,0,0,0.04) 1px, transparent 1px, transparent 40px)',
          }} />

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', zIndex: 1, marginTop: '12px' }}>

            {/* Totem cap */}
            <div style={{
              width: '80px',
              height: '16px',
              background: brandColor,
              borderRadius: '5px 5px 0 0',
              border: `2px solid ${brandColor}`,
              boxShadow: `0 -2px 8px ${brandColor}55`,
              position: 'relative',
            }}>
              {/* Cap accent line */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '3px',
                background: 'rgba(255,255,255,0.25)',
              }} />
            </div>

            {/* Totem body wrapper — simulates 3-sided structure */}
            <div style={{ position: 'relative', width: '80px' }}>

              {/* Left face shadow (gives 3D depth) */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '-8px',
                width: '10px',
                height: '100%',
                background: 'linear-gradient(90deg, rgba(0,0,0,0.0) 0%, rgba(0,0,0,0.22) 100%)',
                borderRadius: '2px 0 0 2px',
              }} />
              {/* Right face highlight */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: '-8px',
                width: '10px',
                height: '100%',
                background: 'linear-gradient(90deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.0) 100%)',
                borderRadius: '0 2px 2px 0',
              }} />

              {/* Panel 1 — Navigation / wayfinding */}
              <div style={{
                width: '80px',
                background: '#f0f4f8',
                border: `2px solid ${brandColor}`,
                borderBottom: 'none',
                padding: '6px 5px',
              }}>
                {/* Panel header */}
                <div style={{
                  background: brandColor,
                  color: '#fff',
                  fontSize: '8px',
                  fontWeight: '700',
                  letterSpacing: '0.8px',
                  textAlign: 'center',
                  padding: '3px 0',
                  borderRadius: '2px',
                  marginBottom: '5px',
                  textTransform: 'uppercase',
                }}>
                  Como Chegar
                </div>
                {navItems.map((item, i) => (
                  <div key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '2px 3px',
                    borderBottom: i < navItems.length - 1 ? '1px solid #dce4ec' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <div style={{
                        width: '14px',
                        height: '14px',
                        background: brandColor,
                        borderRadius: '2px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '9px',
                        color: '#fff',
                        fontWeight: '900',
                        flexShrink: 0,
                      }}>
                        {item.arrow}
                      </div>
                      <div style={{ fontSize: '7px', color: '#333', fontWeight: '600' }}>{item.label}</div>
                    </div>
                    <div style={{ fontSize: '6px', color: '#888', fontWeight: '500' }}>{item.dist}</div>
                  </div>
                ))}
              </div>

              {/* Divider strip between panels */}
              <div style={{
                width: '80px',
                height: '6px',
                background: brandColor,
              }} />

              {/* Panel 2 — Main ad panel */}
              <div style={{
                width: '80px',
                height: '200px',
                background: resolvedImage ? 'transparent' : `linear-gradient(180deg, #001133 0%, ${brandColor}cc 45%, #000820 100%)`,
                overflow: 'hidden',
                position: 'relative',
                border: `2px solid ${brandColor}`,
                borderTop: 'none',
                borderBottom: 'none',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Totem anúncio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    {/* Background decoration circles */}
                    <div style={{
                      position: 'absolute',
                      top: '-20px',
                      right: '-20px',
                      width: '80px',
                      height: '80px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.04)',
                    }} />
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '-15px',
                      width: '60px',
                      height: '60px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.03)',
                    }} />
                  </>
                )}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '10px 6px',
                  background: resolvedImage ? 'rgba(0,0,0,0.5)' : 'none',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: '8px', letterSpacing: '-0.2px' }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.4, marginBottom: '10px' }}>
                    {resolvedBody}
                  </div>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '8px',
                    fontWeight: '700',
                    padding: '5px 10px',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: `0 2px 8px ${brandColor}66`,
                    textAlign: 'center',
                  }}>
                    {resolvedBrand}
                  </div>
                </div>

                {/* QR code placeholder */}
                <div style={{
                  position: 'absolute',
                  bottom: '8px',
                  right: '6px',
                  width: '22px',
                  height: '22px',
                  background: '#fff',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    backgroundImage: 'repeating-linear-gradient(0deg, #333 0px, #333 2px, transparent 2px, transparent 4px), repeating-linear-gradient(90deg, #333 0px, #333 2px, transparent 2px, transparent 4px)',
                    opacity: 0.9,
                  }} />
                </div>
              </div>

              {/* Divider strip between panels */}
              <div style={{
                width: '80px',
                height: '6px',
                background: brandColor,
              }} />

              {/* Panel 3 — Brand / sponsor panel */}
              <div style={{
                width: '80px',
                height: '70px',
                background: '#fff',
                border: `2px solid ${brandColor}`,
                borderTop: 'none',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: resolvedImage ? 'transparent' : `linear-gradient(135deg, ${brandColor}22 0%, #ffffff 60%, ${brandColor}11 100%)`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  gap: '4px',
                }}>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '10px',
                    fontWeight: '900',
                    padding: '4px 12px',
                    borderRadius: '3px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                  }}>
                    {resolvedBrand}
                  </div>
                  <div style={{ fontSize: '7px', color: '#666', textAlign: 'center', lineHeight: 1.3 }}>
                    Patrocinador oficial
                  </div>
                  {/* Sponsor logo dots pattern */}
                  <div style={{ display: 'flex', gap: '3px' }}>
                    {[0, 1, 2].map((i) => (
                      <div key={i} style={{
                        width: '5px',
                        height: '5px',
                        borderRadius: '50%',
                        background: brandColor,
                        opacity: 1 - i * 0.25,
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom cap */}
            <div style={{
              width: '80px',
              height: '12px',
              background: brandColor,
              borderRadius: '0 0 3px 3px',
              boxShadow: `0 3px 8px ${brandColor}55`,
            }} />

            {/* Pole */}
            <div style={{
              width: '16px',
              height: '28px',
              background: 'linear-gradient(90deg, #444 0%, #888 50%, #555 100%)',
              boxShadow: '1px 0 4px rgba(0,0,0,0.25)',
            }} />

            {/* Base plate */}
            <div style={{
              width: '56px',
              height: '10px',
              background: '#3a3a3a',
              borderRadius: '0 0 4px 4px',
              border: '2px solid #222',
            }} />

            {/* Anchor bolts */}
            <div style={{ display: 'flex', gap: '28px', marginTop: '3px' }}>
              {[0, 1].map((i) => (
                <div key={i} style={{
                  width: '6px',
                  height: '7px',
                  background: '#555',
                  borderRadius: '0 0 2px 2px',
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* Ground strip */}
        <div style={{ width: '340px', height: '14px', background: '#9a9278', borderRadius: '0 0 8px 8px' }} />

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
          Totem de Rua
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
          Totem de Rua — 3 Painéis: Wayfinding + Anúncio + Patrocinador
        </div>
      </div>
    </div>
  );
};
