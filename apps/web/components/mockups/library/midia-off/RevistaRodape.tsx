'use client';

import React from 'react';

interface RevistaRodapeProps {
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

export const RevistaRodape: React.FC<RevistaRodapeProps> = ({
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
  brandColor = '#0369a1',
}) => {
  const brand = brandName ?? name ?? 'Marca Rodapé';
  const mainHeadline = headline ?? title ?? 'Base da página, topo do impacto';
  const bodyText = body ?? caption ?? description ?? text ?? 'O rodapé de revista percorre todas as páginas como uma presença constante e elegante da sua marca.';
  const adImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div style={{ width: 340, height: 80, background: '#fff', fontFamily: '"Georgia", "Times New Roman", serif', boxShadow: '0 -4px 16px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)', overflow: 'hidden', position: 'relative', display: 'flex', borderTop: `3px solid ${brandColor}` }}>
      <style>{`
        @keyframes rrod-in { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .rrod-in { animation: rrod-in 0.45s ease both; }
        @keyframes rrod-slide { from{transform:translateX(-8px);opacity:0} to{transform:translateX(0);opacity:1} }
        .rrod-slide { animation: rrod-slide 0.5s ease both; }
      `}</style>

      {/* Left: image thumbnail */}
      {adImage ? (
        <div style={{ width: 80, overflow: 'hidden', flexShrink: 0 }}>
          <img src={adImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
      ) : (
        <div style={{ width: 80, background: `linear-gradient(135deg, ${brandColor}18 0%, ${brandColor}40 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1" opacity="0.4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
        </div>
      )}

      {/* Brand block */}
      <div style={{ background: brandColor, padding: '0 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', flexShrink: 0 }} className="rrod-slide">
        <div style={{ fontSize: 9, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{brand}</div>
        <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.6)', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 1 }}>Rodapé</div>
      </div>

      {/* Headline + body */}
      <div style={{ flex: 1, padding: '0 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="rrod-in">
        <h2 style={{ fontSize: 11, fontWeight: 900, color: '#111', lineHeight: 1.2, margin: '0 0 3px', letterSpacing: -0.15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{mainHeadline}</h2>
        <p style={{ fontSize: 8.5, color: '#777', lineHeight: 1.4, margin: 0, fontFamily: 'sans-serif', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as React.CSSProperties}>{bodyText}</p>
      </div>

      {/* Right: CTA block */}
      <div style={{ background: '#f5f5f5', padding: '0 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', gap: 5, flexShrink: 0, borderLeft: `1px solid #eee` }} className="rrod-in">
        <div style={{ background: brandColor, padding: '5px 12px' }}>
          <span style={{ fontSize: 7.5, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, whiteSpace: 'nowrap' }}>Saiba mais</span>
        </div>
        <div style={{ fontSize: 7.5, color: '#aaa', fontFamily: 'sans-serif', whiteSpace: 'nowrap' }}>(11) 9 9999-0000</div>
      </div>
    </div>
  );
};
