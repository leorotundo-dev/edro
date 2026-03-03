'use client';

import React from 'react';

interface RevistaPopupProps {
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
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
}

export const RevistaPopup: React.FC<RevistaPopupProps> = ({
  name,
  username,
  brandName,
  headline,
  title,
  body,
  caption,
  description,
  text,
  image,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#9333ea',
}) => {
  const brand = brandName ?? name ?? 'Marca Pop';
  const mainHeadline = headline ?? title ?? 'Abre e impressiona — o anúncio que se destaca sozinho';
  const bodyText = body ?? caption ?? description ?? text ?? 'O pop-up de revista é um encarte tridimensional que se ergue ao ser aberto. Impossível ignorar, garantido de ser lembrado muito depois de fechar a edição.';
  const adImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div style={{ width: 300, height: 400, background: '#f9f8ff', fontFamily: '"Georgia", "Times New Roman", serif', boxShadow: '0 10px 40px rgba(0,0,0,0.22)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes rpop-in { from{opacity:0;transform:scale(0.95)} to{opacity:1;transform:scale(1)} }
        .rpop-in { animation: rpop-in 0.55s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes rpop-lift { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .rpop-lift { animation: rpop-lift 3s ease infinite; }
        @keyframes rpop-img { from{transform:scale(1.05)} to{transform:scale(1)} }
        .rpop-img { animation: rpop-img 0.7s ease both; }
      `}</style>

      {/* Fold tab at top — 3D illusion */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 10, background: `linear-gradient(to bottom, ${brandColor}bb, ${brandColor})`, zIndex: 5 }} />

      {/* Left fold shadow */}
      <div style={{ position: 'absolute', left: 0, top: 10, bottom: 0, width: 10, background: 'linear-gradient(90deg, rgba(0,0,0,0.12), transparent)', zIndex: 5 }} />

      {/* Right fold shadow */}
      <div style={{ position: 'absolute', right: 0, top: 10, bottom: 0, width: 10, background: 'linear-gradient(270deg, rgba(0,0,0,0.10), transparent)', zIndex: 5 }} />

      {/* Top bar */}
      <div style={{ background: brandColor, padding: '16px 18px 10px', flexShrink: 0 }} className="rpop-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: -0.3, textTransform: 'uppercase' }}>{brand}</div>
          <div style={{ fontSize: 7.5, color: 'rgba(255,255,255,0.65)', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 1.5 }}>Pop-up</div>
        </div>
      </div>

      {/* Image — the "rising" element */}
      <div style={{ width: '100%', height: 160, overflow: 'hidden', position: 'relative', flexShrink: 0 }} className="rpop-img">
        {adImage ? (
          <img src={adImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(145deg, ${brandColor}22 0%, ${brandColor}55 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1" opacity="0.35"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: 10, color: brandColor, fontFamily: 'sans-serif', opacity: 0.45 }}>Elemento em destaque</span>
          </div>
        )}
        {/* Fold crease in center */}
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 3, height: '100%', background: 'rgba(0,0,0,0.07)', pointerEvents: 'none' }} />
      </div>

      {/* Accent rule */}
      <div style={{ height: 3, background: brandColor, flexShrink: 0 }} />

      {/* Copy area */}
      <div style={{ flex: 1, padding: '14px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} className="rpop-in">
        <div>
          {/* Tag */}
          <div style={{ display: 'inline-block', background: `${brandColor}15`, border: `1px solid ${brandColor}30`, padding: '3px 10px', marginBottom: 10, borderRadius: 20 }}>
            <span style={{ fontSize: 7.5, color: brandColor, fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.2 }}>Formato Pop-up 3D</span>
          </div>

          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111', lineHeight: 1.25, margin: '0 0 10px', letterSpacing: -0.25 }}>{mainHeadline}</h2>
          <p style={{ fontSize: 10, color: '#666', lineHeight: 1.65, margin: 0, fontFamily: 'sans-serif' }}>{bodyText}</p>
        </div>

        {/* Footer CTA */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #e5e5f5', paddingTop: 12 }}>
          <div className="rpop-lift" style={{ background: brandColor, padding: '9px 22px', boxShadow: `0 4px 12px ${brandColor}44` }}>
            <span style={{ fontSize: 9, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase' }}>Descubra mais</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8.5, color: '#bbb', fontFamily: 'sans-serif' }}>www.{brand.toLowerCase().replace(/\s/g, '')}.com.br</div>
            <div style={{ fontSize: 8.5, color: '#bbb', fontFamily: 'sans-serif' }}>(11) 9 9999-0000</div>
          </div>
        </div>
      </div>
    </div>
  );
};
