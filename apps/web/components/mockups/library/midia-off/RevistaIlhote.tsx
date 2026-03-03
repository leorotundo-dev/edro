'use client';

import React from 'react';

interface RevistaIlhoteProps {
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

export const RevistaIlhote: React.FC<RevistaIlhoteProps> = ({
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
  brandColor = '#0f766e',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'Rodeado de conteúdo — destacado no centro da atenção';
  const bodyText = body ?? caption ?? description ?? text ?? 'O ilhote de revista é o formato inserido no meio do conteúdo editorial, garantindo máxima atenção do leitor quando está mais engajado.';
  const adImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div style={{ width: 220, height: 220, background: '#fff', fontFamily: '"Georgia", "Times New Roman", serif', boxShadow: '0 6px 22px rgba(0,0,0,0.18)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', border: `2px solid ${brandColor}22` }}>
      <style>{`
        @keyframes rilh-in { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        .rilh-in { animation: rilh-in 0.5s ease both; }
        @keyframes rilh-img { from{transform:scale(1.06)} to{transform:scale(1)} }
        .rilh-img { animation: rilh-img 0.65s ease both; }
      `}</style>

      {/* Top bar */}
      <div style={{ background: brandColor, padding: '7px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }} className="rilh-in">
        <div style={{ fontSize: 9, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: -0.1 }}>{brand}</div>
        <div style={{ fontSize: 6.5, color: 'rgba(255,255,255,0.65)', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 1 }}>Ilhote</div>
      </div>

      {/* Image */}
      <div style={{ width: '100%', height: 90, overflow: 'hidden', flexShrink: 0, position: 'relative' }} className="rilh-img">
        {adImage ? (
          <img src={adImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${brandColor}18 0%, ${brandColor}40 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1" opacity="0.4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
          </div>
        )}
      </div>

      {/* Accent rule */}
      <div style={{ height: 2.5, background: brandColor, flexShrink: 0 }} />

      {/* Copy */}
      <div style={{ flex: 1, padding: '9px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} className="rilh-in">
        <div>
          <h2 style={{ fontSize: 10.5, fontWeight: 900, color: '#111', lineHeight: 1.28, margin: '0 0 5px', letterSpacing: -0.15 }}>{mainHeadline}</h2>
          <p style={{ fontSize: 8, color: '#666', lineHeight: 1.55, margin: 0, fontFamily: 'sans-serif' }}>{bodyText.substring(0, 90)}...</p>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: 7 }}>
          <div style={{ background: brandColor, padding: '4px 10px' }}>
            <span style={{ fontSize: 7.5, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Ver mais</span>
          </div>
          <span style={{ fontSize: 7.5, color: '#ccc', fontFamily: 'sans-serif' }}>(11) 9 9999-0000</span>
        </div>
      </div>
    </div>
  );
};
