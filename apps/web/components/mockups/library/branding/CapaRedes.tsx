'use client';

import React from 'react';

interface CapaRedesProps {
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
  postImage?: string;
  profileImage?: string;
  brandColor?: string;
}

export const CapaRedes: React.FC<CapaRedesProps> = ({
  name,
  username,
  brandName = 'Marca',
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  profileImage,
  brandColor = '#2563eb',
}) => {
  const resolvedBrandName = brandName || name || username || 'Marca';
  const resolvedTagline = headline || title || body || description || caption || text || 'Conectando pessoas e marcas com propósito';
  const resolvedLogo = image || postImage || profileImage;
  const initial = resolvedBrandName.charAt(0).toUpperCase();

  const darken = (hex: string, pct: number) => {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = Math.max(0, (n >> 16) - Math.round(255 * pct));
    const g = Math.max(0, ((n >> 8) & 0xff) - Math.round(255 * pct));
    const b = Math.max(0, (n & 0xff) - Math.round(255 * pct));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };
  const darkColor = darken(brandColor, 0.28);

  return (
    <div style={{ width: 600, fontFamily: "'Inter', 'Segoe UI', sans-serif", position: 'relative', borderRadius: 10, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.18)' }}>
      {/* Label badge */}
      <div style={{ position: 'absolute', top: 10, right: 10, zIndex: 10, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)', borderRadius: 5, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 9, fontWeight: 700, letterSpacing: '0.05em' }}>820 × 312 · Capa Redes</span>
      </div>

      {/* Main banner */}
      <div style={{ background: `linear-gradient(120deg, ${brandColor} 0%, ${darkColor} 100%)`, height: 200, position: 'relative', display: 'flex', alignItems: 'center', padding: '0 48px', gap: 32 }}>
        {/* Decorative circles */}
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 60, bottom: -60, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', left: -20, bottom: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />

        {/* Logo area */}
        <div style={{ flexShrink: 0, width: 80, height: 80, borderRadius: 20, background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
          {resolvedLogo ? (
            <img src={resolvedLogo} alt={resolvedBrandName} style={{ width: 52, height: 52, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
          ) : (
            <span style={{ color: '#ffffff', fontSize: 34, fontWeight: 900, letterSpacing: '-0.02em' }}>{initial}</span>
          )}
        </div>

        {/* Text content */}
        <div style={{ flex: 1 }}>
          <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 8 }}>
            Bem-vindo à página oficial de
          </div>
          <div style={{ color: '#ffffff', fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 10 }}>
            {resolvedBrandName}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 400, maxWidth: 360, lineHeight: 1.5 }}>
            {resolvedTagline}
          </div>
        </div>
      </div>

      {/* Bottom colored strip */}
      <div style={{ height: 6, background: `linear-gradient(90deg, ${darkColor} 0%, ${brandColor} 50%, rgba(255,255,255,0.3) 100%)` }} />

      {/* Info strip */}
      <div style={{ background: '#0f172a', padding: '10px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Início', 'Sobre', 'Serviços', 'Contato'].map((item) => (
            <span key={item} style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 500, cursor: 'pointer' }}>{item}</span>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: brandColor }} />
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9 }}>Seguir página</span>
        </div>
      </div>
    </div>
  );
};
