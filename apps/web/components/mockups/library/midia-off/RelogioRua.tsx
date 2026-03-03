'use client';

import React from 'react';

interface RelogioRuaProps {
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

export const RelogioRua: React.FC<RelogioRuaProps> = ({
  headline,
  title,
  name,
  body,
  caption,
  description,
  image,
  postImage,
  thumbnail,
  brandColor = '#1a5a9a',
  brandName,
  username,
}) => {
  const resolvedHeadline = headline ?? title ?? name ?? 'Relógio Patrocinado';
  const resolvedBody = body ?? caption ?? description ?? 'Sua marca no ritmo da cidade';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedBrand = brandName ?? username ?? 'MARCA';

  // Clock hand positions (fixed display time: 10:10 — classic marketing pose)
  const hourAngle = 300;   // 10 o'clock = 300deg
  const minuteAngle = 60;  // 10 min = 60deg

  const hourMarkers = Array.from({ length: 12 }, (_, i) => i);
  const clockRadius = 60;
  const cx = 65;
  const cy = 65;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '24px', background: '#b0b8c0', display: 'inline-block', borderRadius: '12px' }}>
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

        {/* Sky backdrop */}
        <div style={{
          width: '320px',
          height: '70px',
          background: 'linear-gradient(180deg, #7ab4cc 0%, #a8ccd8 100%)',
          borderRadius: '8px 8px 0 0',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Clouds */}
          <div style={{ position: 'absolute', top: '16px', left: '40px', width: '70px', height: '20px', background: 'rgba(255,255,255,0.85)', borderRadius: '12px' }} />
          <div style={{ position: 'absolute', top: '22px', left: '200px', width: '55px', height: '16px', background: 'rgba(255,255,255,0.7)', borderRadius: '10px' }} />
          {/* Ground */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '12px', background: '#c4bc9c' }} />
        </div>

        {/* Street ground */}
        <div style={{
          width: '320px',
          background: '#bab498',
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: '20px',
          position: 'relative',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>

            {/* Clock housing cap */}
            <div style={{
              width: '150px',
              height: '14px',
              background: '#3a3a3a',
              borderRadius: '8px 8px 0 0',
              border: '2px solid #222',
              marginTop: '16px',
            }} />

            {/* Clock face housing */}
            <div style={{
              width: '150px',
              height: '150px',
              background: '#2a2a2a',
              border: '4px solid #1a1a1a',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.4)',
              position: 'relative',
            }}>
              {/* Clock face — SVG */}
              <svg
                width="130"
                height="130"
                viewBox="0 0 130 130"
                style={{ display: 'block' }}
              >
                {/* Outer ring */}
                <circle cx={cx} cy={cy} r={clockRadius} fill="#f5f0e0" stroke="#333" strokeWidth="3" />
                {/* Inner ring accent */}
                <circle cx={cx} cy={cy} r={clockRadius - 5} fill="none" stroke="#ccc" strokeWidth="1" />

                {/* Hour markers */}
                {hourMarkers.map((i) => {
                  const angle = (i / 12) * 2 * Math.PI - Math.PI / 2;
                  const isMain = i % 3 === 0;
                  const outerR = clockRadius - 3;
                  const innerR = isMain ? clockRadius - 11 : clockRadius - 7;
                  const x1 = cx + outerR * Math.cos(angle);
                  const y1 = cy + outerR * Math.sin(angle);
                  const x2 = cx + innerR * Math.cos(angle);
                  const y2 = cy + innerR * Math.sin(angle);
                  return (
                    <line
                      key={i}
                      x1={x1} y1={y1}
                      x2={x2} y2={y2}
                      stroke="#333"
                      strokeWidth={isMain ? 2.5 : 1.5}
                      strokeLinecap="round"
                    />
                  );
                })}

                {/* Hour numbers — 12, 3, 6, 9 */}
                {[
                  { n: '12', x: cx, y: cy - clockRadius + 18 },
                  { n: '3',  x: cx + clockRadius - 16, y: cy + 4 },
                  { n: '6',  x: cx, y: cy + clockRadius - 12 },
                  { n: '9',  x: cx - clockRadius + 16, y: cy + 4 },
                ].map(({ n, x, y }) => (
                  <text key={n} x={x} y={y} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#333" fontFamily="Arial">{n}</text>
                ))}

                {/* Hour hand */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx + 32 * Math.cos((hourAngle * Math.PI) / 180 - Math.PI / 2)}
                  y2={cy + 32 * Math.sin((hourAngle * Math.PI) / 180 - Math.PI / 2)}
                  stroke="#1a1a1a"
                  strokeWidth="4"
                  strokeLinecap="round"
                />
                {/* Minute hand */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx + 46 * Math.cos((minuteAngle * Math.PI) / 180 - Math.PI / 2)}
                  y2={cy + 46 * Math.sin((minuteAngle * Math.PI) / 180 - Math.PI / 2)}
                  stroke="#1a1a1a"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
                {/* Second hand */}
                <line
                  x1={cx}
                  y1={cy}
                  x2={cx + 52 * Math.cos((180 * Math.PI) / 180 - Math.PI / 2)}
                  y2={cy + 52 * Math.sin((180 * Math.PI) / 180 - Math.PI / 2)}
                  stroke="#cc2200"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
                {/* Center dot */}
                <circle cx={cx} cy={cy} r="4" fill="#1a1a1a" />
                <circle cx={cx} cy={cy} r="2" fill="#cc2200" />
              </svg>

              {/* Brand color accent strip at bottom of clock housing */}
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '6px',
                background: brandColor,
                borderRadius: '0 0 4px 4px',
              }} />
            </div>

            {/* Connection to ad panels */}
            <div style={{
              width: '20px',
              height: '12px',
              background: '#555',
              boxShadow: '1px 0 3px rgba(0,0,0,0.3)',
            }} />

            {/* Ad panel body */}
            <div style={{
              width: '150px',
              background: '#fff',
              border: '3px solid #bbb',
              borderRadius: '3px',
              overflow: 'hidden',
              boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
            }}>
              {/* Ad image area */}
              <div style={{
                width: '100%',
                height: '90px',
                background: resolvedImage ? 'transparent' : `linear-gradient(135deg, #001133 0%, ${brandColor}cc 50%, #00050d 100%)`,
                overflow: 'hidden',
                position: 'relative',
              }}>
                {resolvedImage ? (
                  <img src={resolvedImage} alt="Anúncio relógio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : null}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8px',
                  background: resolvedImage ? 'rgba(0,0,0,0.5)' : 'none',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: '900', color: '#fff', textAlign: 'center', lineHeight: 1.2, marginBottom: '5px' }}>
                    {resolvedHeadline}
                  </div>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 1.3, marginBottom: '6px' }}>
                    {resolvedBody}
                  </div>
                  <div style={{
                    background: brandColor,
                    color: '#fff',
                    fontSize: '9px',
                    fontWeight: '700',
                    padding: '4px 10px',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: `0 1px 6px ${brandColor}66`,
                  }}>
                    {resolvedBrand}
                  </div>
                </div>
              </div>

              {/* Sponsored by strip */}
              <div style={{
                height: '18px',
                background: brandColor,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ fontSize: '8px', color: '#fff', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>
                  Patrocinado por {resolvedBrand}
                </div>
              </div>
            </div>

            {/* Post / pole */}
            <div style={{
              width: '18px',
              height: '60px',
              background: 'linear-gradient(90deg, #444 0%, #777 40%, #999 60%, #555 100%)',
              boxShadow: '1px 0 4px rgba(0,0,0,0.3)',
            }} />

            {/* Base plate */}
            <div style={{
              width: '60px',
              height: '12px',
              background: '#3a3a3a',
              borderRadius: '0 0 4px 4px',
              border: '2px solid #222',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }} />

            {/* Anchor bolts */}
            <div style={{ display: 'flex', gap: '30px', marginTop: '3px' }}>
              {[0, 1].map((i) => (
                <div key={i} style={{
                  width: '6px',
                  height: '8px',
                  background: '#555',
                  borderRadius: '0 0 2px 2px',
                }} />
              ))}
            </div>
          </div>
        </div>

        {/* Ground strip */}
        <div style={{ width: '320px', height: '14px', background: '#9a9278', borderRadius: '0 0 8px 8px' }} />

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
          Relógio de Rua — Painel Publicitário + Relógio Analógico
        </div>
      </div>
    </div>
  );
};
