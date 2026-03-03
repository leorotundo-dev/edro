'use client';

import React from 'react';

interface QuiosqueRuaProps {
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

export const QuiosqueRua: React.FC<QuiosqueRuaProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#e63800',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Quiosque Patrocinado';
  const resolvedBody = body ?? caption ?? description ?? 'Atendimento ao público com sua marca';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  const magazineTitles = ['VEJA', 'ÉPOCA', 'ISTOÉ', 'EXAME', 'CARAS', 'GULA'];
  const magazineColors = ['#cc0000', '#0044cc', '#228822', '#004488', '#cc44aa', '#dd6600'];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#b8bec8', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', width: '460px' }}>

        {/* Sky */}
        <div style={{
          width: '460px',
          height: '70px',
          background: 'linear-gradient(180deg, #7ab0cc 0%, #a8ccd8 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Clouds */}
          <div style={{ position: 'absolute', top: '14px', left: '50px', width: '80px', height: '24px', background: 'rgba(255,255,255,0.85)', borderRadius: '14px' }} />
          <div style={{ position: 'absolute', top: '20px', left: '200px', width: '55px', height: '18px', background: 'rgba(255,255,255,0.7)', borderRadius: '10px' }} />
          <div style={{ position: 'absolute', top: '12px', left: '340px', width: '65px', height: '20px', background: 'rgba(255,255,255,0.75)', borderRadius: '12px' }} />
          {/* Sun */}
          <div style={{ position: 'absolute', top: '8px', right: '30px', width: '30px', height: '30px', borderRadius: '50%', background: '#ffe066', boxShadow: '0 0 12px #ffe066cc' }} />
          {/* Ground */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12px', background: '#c8c0a0' }} />
        </div>

        {/* Sidewalk scene */}
        <div style={{
          width: '460px',
          background: '#c0b898',
          position: 'relative',
          paddingBottom: '20px',
          display: 'flex',
          justifyContent: 'center',
        }}>
          {/* Kiosk structure */}
          <div style={{ position: 'relative', marginTop: '10px' }}>

            {/* Roof / awning */}
            <div style={{
              width: '320px',
              height: '28px',
              background: `linear-gradient(180deg, ${brandColor} 0%, ${brandColor}cc 100%)`,
              borderRadius: '6px 6px 0 0',
              border: `2px solid ${brandColor}`,
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              position: 'relative',
              zIndex: 2,
            }}>
              {/* Awning stripes */}
              <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'repeating-linear-gradient(90deg, rgba(255,255,255,0.15) 0px, rgba(255,255,255,0.15) 20px, transparent 20px, transparent 40px)',
                borderRadius: '4px 4px 0 0',
              }} />
              {/* Awning fringe */}
              <div style={{
                position: 'absolute',
                bottom: '-8px',
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'space-around',
              }}>
                {Array.from({ length: 16 }).map((_, i) => (
                  <div key={i} style={{
                    width: '14px',
                    height: '8px',
                    background: brandColor,
                    borderRadius: '0 0 4px 4px',
                  }} />
                ))}
              </div>
            </div>

            {/* Kiosk body */}
            <div style={{
              width: '320px',
              display: 'flex',
              background: '#f5f0e8',
              border: '3px solid #999',
              borderTop: 'none',
            }}>
              {/* Left side panel — ad */}
              <div style={{
                width: '80px',
                background: resolvedImage ? 'transparent' : `linear-gradient(180deg, ${brandColor} 0%, #220000 100%)`,
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
                borderRight: '2px solid #aaa',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Quiosque lateral" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6px',
                  background: resolvedImage ? 'rgba(0,0,0,0.5)' : 'none',
                }}>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: '900',
                    padding: '4px 6px',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    textAlign: 'center',
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              </div>

              {/* Center — magazine display */}
              <div style={{ flex: 1, padding: '8px 6px 6px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {/* Magazine rack top row */}
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  {magazineTitles.slice(0, 3).map((mag, i) => (
                    <div key={i} style={{
                      width: '42px',
                      height: '56px',
                      background: magazineColors[i],
                      borderRadius: '2px',
                      border: '1px solid rgba(0,0,0,0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '3px 2px',
                      boxShadow: '1px 1px 3px rgba(0,0,0,0.2)',
                    }}>
                      <div style={{ fontSize: '7px', fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: '-0.3px' }}>{mag}</div>
                      <div style={{ width: '34px', height: '28px', background: 'rgba(255,255,255,0.2)', borderRadius: '1px' }} />
                      <div style={{ fontSize: '5px', color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>R$ 12,90</div>
                    </div>
                  ))}
                </div>
                {/* Magazine rack bottom row */}
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  {magazineTitles.slice(3, 6).map((mag, i) => (
                    <div key={i} style={{
                      width: '42px',
                      height: '56px',
                      background: magazineColors[i + 3],
                      borderRadius: '2px',
                      border: '1px solid rgba(0,0,0,0.2)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '3px 2px',
                      boxShadow: '1px 1px 3px rgba(0,0,0,0.2)',
                    }}>
                      <div style={{ fontSize: '7px', fontWeight: '900', color: '#fff', textAlign: 'center', letterSpacing: '-0.3px' }}>{mag}</div>
                      <div style={{ width: '34px', height: '28px', background: 'rgba(255,255,255,0.2)', borderRadius: '1px' }} />
                      <div style={{ fontSize: '5px', color: 'rgba(255,255,255,0.8)', textAlign: 'center' }}>R$ 14,90</div>
                    </div>
                  ))}
                </div>

                {/* Counter / service area */}
                <div style={{
                  height: '22px',
                  background: '#d8d0b8',
                  border: '2px solid #aaa',
                  borderRadius: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <div style={{ fontSize: '8px', color: '#666', fontWeight: '600' }}>ATENDIMENTO</div>
                </div>
              </div>

              {/* Right side panel — ad */}
              <div style={{
                width: '80px',
                background: resolvedImage ? 'transparent' : `linear-gradient(180deg, #221100 0%, ${brandColor}cc 100%)`,
                overflow: 'hidden',
                position: 'relative',
                flexShrink: 0,
                borderLeft: '2px solid #aaa',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Quiosque lateral direita" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px 4px',
                  background: resolvedImage ? 'rgba(0,0,0,0.5)' : 'none',
                }}>
                  <div style={{ fontSize: '8px', fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: '6px' }}>
                    {resolvedHeadline.substring(0, 18)}
                  </div>
                  <div style={{ fontSize: '7px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.3, marginBottom: '6px' }}>
                    {resolvedBody.substring(0, 24)}
                  </div>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '7px',
                    fontWeight: '700',
                    padding: '3px 6px',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    textAlign: 'center',
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              </div>
            </div>

            {/* Base / floor slab */}
            <div style={{
              width: '326px',
              height: '10px',
              background: '#888',
              borderRadius: '0 0 4px 4px',
              border: '2px solid #666',
              borderTop: 'none',
            }} />

            {/* Support feet */}
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '20px', paddingRight: '20px' }}>
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{
                  width: '12px',
                  height: '14px',
                  background: '#777',
                  borderRadius: '0 0 3px 3px',
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* Ground strip */}
        <div style={{ width: '460px', height: '14px', background: '#a8a288', borderRadius: '0 0 8px 8px' }} />

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
          Quiosque de Rua
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
          Quiosque de Rua — Painel Lateral + Tenda Publicitária
        </div>
      </div>
    </div>
  );
};
