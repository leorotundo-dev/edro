'use client';

import React from 'react';

interface OutdoorRelogioProps {
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

export const OutdoorRelogio: React.FC<OutdoorRelogioProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#1e3a5f',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Patrocinador Oficial';
  const resolvedBody = body ?? caption ?? description ?? 'Horário certo, mensagem certa';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  // Static clock hands at 10:10
  const hourAngle = 300; // 10 o'clock = 300deg
  const minuteAngle = 60; // 10 min = 60deg

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#c8cfd8', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Street scene */}
        <div style={{
          width: '280px',
          height: '80px',
          background: 'linear-gradient(180deg, #78a8c8 0%, #a8c8d8 100%)',
          borderRadius: '8px 8px 0 0',
        }} />

        {/* Pole + clock + ad panel */}
        <div style={{
          width: '280px',
          background: '#9aa8b0',
          display: 'flex',
          justifyContent: 'center',
          position: 'relative',
          paddingBottom: '20px',
        }}>

          {/* Vertical pole */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '14px',
            height: '100%',
            background: 'linear-gradient(90deg, #4a4a4a 0%, #666 50%, #4a4a4a 100%)',
            zIndex: 1,
          }} />

          {/* Clock face (SVG) */}
          <div style={{
            marginTop: '-30px',
            position: 'relative',
            zIndex: 2,
          }}>
            <svg width="110" height="110" viewBox="0 0 110 110">
              {/* Clock outer ring */}
              <circle cx="55" cy="55" r="52" fill="#f5f0e8" stroke="#2a2a2a" strokeWidth="4" />
              <circle cx="55" cy="55" r="48" fill="none" stroke={brandColor} strokeWidth="2" />

              {/* Hour markers */}
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => {
                const angle = (h * 30 - 90) * (Math.PI / 180);
                const isMain = h % 3 === 0;
                const r1 = isMain ? 40 : 43;
                const r2 = 47;
                return (
                  <line
                    key={h}
                    x1={55 + r1 * Math.cos(angle)}
                    y1={55 + r1 * Math.sin(angle)}
                    x2={55 + r2 * Math.cos(angle)}
                    y2={55 + r2 * Math.sin(angle)}
                    stroke="#2a2a2a"
                    strokeWidth={isMain ? 3 : 1.5}
                    strokeLinecap="round"
                  />
                );
              })}

              {/* Hour numbers */}
              {[12, 3, 6, 9].map((n, i) => {
                const angle = (i * 90 - 90) * (Math.PI / 180);
                return (
                  <text
                    key={n}
                    x={55 + 34 * Math.cos(angle)}
                    y={55 + 34 * Math.sin(angle)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="10"
                    fontWeight="700"
                    fill="#1a1a1a"
                    fontFamily="Arial, sans-serif"
                  >
                    {n}
                  </text>
                );
              })}

              {/* Hour hand */}
              <line
                x1="55"
                y1="55"
                x2={55 + 26 * Math.cos((hourAngle - 90) * (Math.PI / 180))}
                y2={55 + 26 * Math.sin((hourAngle - 90) * (Math.PI / 180))}
                stroke="#1a1a1a"
                strokeWidth="4"
                strokeLinecap="round"
              />

              {/* Minute hand */}
              <line
                x1="55"
                y1="55"
                x2={55 + 36 * Math.cos((minuteAngle - 90) * (Math.PI / 180))}
                y2={55 + 36 * Math.sin((minuteAngle - 90) * (Math.PI / 180))}
                stroke="#2a2a2a"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Center dot */}
              <circle cx="55" cy="55" r="4" fill={brandColor} />

              {/* Brand text inside clock */}
              <text x="55" y="72" textAnchor="middle" fontSize="7" fill={brandColor} fontFamily="Arial" fontWeight="700">
                {resolvedBrand.substring(0, 8)}
              </text>
            </svg>
          </div>
        </div>

        {/* Ad panel below clock */}
        <div style={{
          width: '160px',
          background: '#2a2a2a',
          padding: '5px',
          border: '3px solid #1a1a1a',
          borderTop: 'none',
          position: 'relative',
          zIndex: 2,
        }}>
          <div style={{
            width: '100%',
            height: '90px',
            background: resolvedImage ? 'transparent' : `linear-gradient(180deg, ${brandColor} 0%, #0a1a30 100%)`,
            overflow: 'hidden',
            position: 'relative',
            borderRadius: '2px',
          }}>
            {resolvedImage ? (
              <img src={resolvedImage} alt="Painel" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'rgba(255,255,255,0.05)',
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
              padding: '8px',
              background: resolvedImage ? 'rgba(0,0,0,0.4)' : 'none',
            }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '900',
                color: '#fff',
                textAlign: 'center',
                lineHeight: 1.2,
                textShadow: '0 1px 6px rgba(0,0,0,0.7)',
              }}>
                {resolvedHeadline}
              </div>
              <div style={{
                fontSize: '9px',
                color: 'rgba(255,255,255,0.8)',
                textAlign: 'center',
                marginTop: '6px',
                lineHeight: 1.3,
              }}>
                {resolvedBody}
              </div>
              <div style={{
                marginTop: '8px',
                background: brandColor,
                color: '#fff',
                fontSize: '8px',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '2px',
                letterSpacing: '0.5px',
              }}>
                {resolvedBrand}
              </div>
            </div>
          </div>
        </div>

        {/* Pole below panel */}
        <div style={{
          width: '14px',
          height: '40px',
          background: 'linear-gradient(90deg, #4a4a4a 0%, #666 50%, #4a4a4a 100%)',
          zIndex: 1,
        }} />

        {/* Base */}
        <div style={{
          width: '60px',
          height: '12px',
          background: '#555',
          borderRadius: '3px',
        }} />
        <div style={{
          width: '80px',
          height: '8px',
          background: '#444',
          borderRadius: '0 0 4px 4px',
        }} />

        {/* Ground */}
        <div style={{
          width: '280px',
          height: '12px',
          background: '#7a8870',
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
          Relógio de Rua
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
          Relógio Público Patrocinado — Painel Inferior 160×90cm
        </div>
      </div>
    </div>
  );
};
