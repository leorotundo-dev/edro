'use client';

import React from 'react';

interface BrandbookCapaProps {
  name?: string;
  username?: string;
  brandName?: string;
  headline?: string;
  title?: string;
  body?: string;
  caption?: string;
  description?: string;
  text?: string;
  image?: string;
  profileImage?: string;
  brandColor?: string;
}

export const BrandbookCapa: React.FC<BrandbookCapaProps> = ({
  name,
  username,
  brandName = 'Marca',
  headline,
  title = 'Manual de Identidade Visual',
  body,
  caption,
  description,
  text,
  image,
  profileImage,
  brandColor = '#2563eb',
}) => {
  const resolvedBrandName = brandName || name || username || 'Marca';
  const resolvedTagline = headline || title || 'Manual de Identidade Visual';
  const resolvedSubtitle = body || description || caption || text || 'Diretrizes de uso e aplicação da marca';
  const resolvedLogo = image || profileImage;
  const initial = resolvedBrandName.charAt(0).toUpperCase();

  // Derive a darker shade for gradient
  const darken = (hex: string, pct: number) => {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - Math.round(255 * pct));
    const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * pct));
    const b = Math.max(0, (n & 0xff) - Math.round(255 * pct));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };
  const darkColor = darken(brandColor, 0.25);

  return (
    <div style={{ width: 297, height: 420, fontFamily: "'Inter', 'Segoe UI', sans-serif", position: 'relative', borderRadius: 10, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.22)', background: `linear-gradient(145deg, ${brandColor} 0%, ${darkColor} 100%)` }}>

      {/* Geometric background decoration */}
      <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -30, left: -30, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', top: 60, right: 20, width: 60, height: 60, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />

      {/* Top bar with brand name */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' as const }}>Identidade Visual</span>
        <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>© 2024</span>
      </div>

      {/* Center logo area */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        {/* Logo mark */}
        <div style={{ width: 80, height: 80, borderRadius: 20, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)', border: '1.5px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          {resolvedLogo ? (
            <img src={resolvedLogo} alt={resolvedBrandName} style={{ width: 52, height: 52, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          ) : (
            <span style={{ color: '#ffffff', fontSize: 36, fontWeight: 900, letterSpacing: '-0.02em' }}>{initial}</span>
          )}
        </div>

        {/* Brand name */}
        <div style={{ textAlign: 'center' as const }}>
          <div style={{ color: '#ffffff', fontSize: 28, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6 }}>
            {resolvedBrandName}
          </div>
          <div style={{ width: 40, height: 2, background: 'rgba(255,255,255,0.4)', margin: '0 auto 12px' }} />
          <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: 500, letterSpacing: '0.04em' }}>
            {resolvedTagline}
          </div>
        </div>
      </div>

      {/* Bottom section */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 24px', borderTop: '1px solid rgba(255,255,255,0.12)', background: 'rgba(0,0,0,0.15)' }}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9, margin: 0, lineHeight: 1.6 }}>
          {resolvedSubtitle}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{ width: i === 0 ? 16 : 6, height: 4, borderRadius: 2, background: i === 0 ? '#ffffff' : 'rgba(255,255,255,0.3)' }} />
            ))}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600 }}>Versão 1.0</span>
        </div>
      </div>
    </div>
  );
};
