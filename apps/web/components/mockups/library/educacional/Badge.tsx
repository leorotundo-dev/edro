'use client';

import React from 'react';

interface BadgeProps {
  title?: string;
  headline?: string;
  name?: string;
  username?: string;
  brandName?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  brandColor?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  title,
  headline,
  name,
  username,
  brandName,
  body,
  caption,
  description,
  text,
  brandColor = '#f59e0b',
}) => {
  const achievementName = title ?? headline ?? 'Mestre em Álgebra';
  const recipientName = name ?? username ?? 'Ana Carolina Silva';
  const awardedBy = brandName ?? 'Instituto Educacional';
  const badgeDesc = body ?? caption ?? description ?? text ?? 'Concluiu com distinção o módulo de álgebra avançada';

  // Derive darker shade for gradient
  const darkShade = '#b45309';

  return (
    <div style={{ width: '320px', height: '320px', backgroundColor: '#1e293b', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Segoe UI', system-ui, sans-serif", position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>

      {/* Background radial glow */}
      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 40%, ${brandColor}22 0%, transparent 70%)` }} />

      {/* Outer decorative ring */}
      <div style={{ position: 'relative', width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

        {/* SVG ring with text */}
        <svg width="260" height="260" viewBox="0 0 260 260" style={{ position: 'absolute', inset: 0 }}>
          {/* Outer dashed decorative circle */}
          <circle cx="130" cy="130" r="122" fill="none" stroke={`${brandColor}44`} strokeWidth="1" strokeDasharray="4 4" />
          {/* Main ring */}
          <circle cx="130" cy="130" r="112" fill="none" stroke={brandColor} strokeWidth="3" />
          <circle cx="130" cy="130" r="106" fill="none" stroke={brandColor} strokeWidth="1" opacity="0.5" />
          {/* Star decorations on ring */}
          {[0, 60, 120, 180, 240, 300].map((deg, i) => {
            const rad = (deg * Math.PI) / 180;
            const cx = 130 + 112 * Math.cos(rad);
            const cy = 130 + 112 * Math.sin(rad);
            return <circle key={i} cx={cx} cy={cy} r="3" fill={brandColor} />;
          })}
          {/* Arc text path */}
          <defs>
            <path id="topArc" d="M 30,130 A 100,100 0 0,1 230,130" />
            <path id="bottomArc" d="M 42,150 A 100,100 0 0,0 218,150" />
          </defs>
          <text fontSize="10" fontWeight="700" fill={brandColor} fontFamily="system-ui" letterSpacing="3">
            <textPath href="#topArc" startOffset="50%" textAnchor="middle">{awardedBy.toUpperCase()}</textPath>
          </text>
          <text fontSize="9" fontWeight="600" fill={`${brandColor}99`} fontFamily="system-ui" letterSpacing="2">
            <textPath href="#bottomArc" startOffset="50%" textAnchor="middle">CONQUISTA EDUCACIONAL</textPath>
          </text>
        </svg>

        {/* Inner badge body */}
        <div style={{ width: '180px', height: '180px', borderRadius: '50%', background: `linear-gradient(145deg, ${brandColor} 0%, ${darkShade} 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 24px ${brandColor}55`, position: 'relative' }}>

          {/* Trophy icon */}
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginBottom: '6px', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}>
            <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
            <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
            <path d="M4 22h16" />
            <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
            <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
            <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
          </svg>

          <div style={{ fontSize: '11px', fontWeight: 900, color: '#fff', textAlign: 'center', lineHeight: '1.2', padding: '0 16px', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{achievementName}</div>
        </div>
      </div>

      {/* Recipient name below */}
      <div style={{ position: 'absolute', bottom: '18px', textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: '10px', color: `${brandColor}99`, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '2px' }}>Concedido a</div>
        <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff' }}>{recipientName}</div>
        <div style={{ fontSize: '8.5px', color: '#64748b', marginTop: '2px' }}>{badgeDesc}</div>
      </div>
    </div>
  );
};
