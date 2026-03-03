'use client';

import React from 'react';

interface RevistaTerceiraCapaProps {
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

export const RevistaTerceiraCapa: React.FC<RevistaTerceiraCapaProps> = ({
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
  brandColor = '#1d3557',
}) => {
  const brand = brandName ?? name ?? 'Marca Editorial';
  const mainHeadline = headline ?? title ?? 'O futuro chegou — e ele é mais bonito do que imaginávamos';
  const bodyText = body ?? caption ?? description ?? text ?? 'Nossa nova linha redefine padrões com materiais sustentáveis, design atemporal e performance incomparável.';
  const coverImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div style={{ width: 340, height: 454, background: '#f8f8f4', fontFamily: '"Georgia", "Times New Roman", serif', boxShadow: '0 8px 32px rgba(0,0,0,0.22)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes r3c-slide { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .r3c-slide { animation: r3c-slide 0.55s ease both; }
      `}</style>

      {/* Editorial-feel top bar */}
      <div style={{ background: brandColor, padding: '10px 16px', flexShrink: 0 }} className="r3c-slide">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: -0.3 }}>{brand.toUpperCase()}</div>
          <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 1.5 }}>3ª Capa</div>
        </div>
      </div>

      {/* Image */}
      <div style={{ width: '100%', height: 220, background: '#ddd', overflow: 'hidden', flexShrink: 0, position: 'relative' }}>
        {coverImage ? (
          <img src={coverImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${brandColor}22 0%, ${brandColor}44 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1" opacity="0.4"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: 10, color: brandColor, fontFamily: 'sans-serif', opacity: 0.5 }}>Foto do produto</span>
          </div>
        )}
        {/* Caption bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.4)', padding: '4px 12px' }}>
          <span style={{ fontSize: 8, color: '#ddd', fontFamily: 'sans-serif' }}>Imagem ilustrativa — {brand}</span>
        </div>
      </div>

      {/* Article copy */}
      <div style={{ flex: 1, padding: '16px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{ width: 32, height: 3, background: brandColor }} />
            <span style={{ fontSize: 8, fontFamily: 'sans-serif', color: brandColor, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700 }}>Editorial</span>
          </div>
          <h2 style={{ fontSize: 17, fontWeight: 900, color: '#111', lineHeight: 1.25, margin: '0 0 10px', letterSpacing: -0.3 }}>{mainHeadline}</h2>
          <p style={{ fontSize: 10.5, color: '#444', lineHeight: 1.7, margin: 0 }}>{bodyText}</p>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #ddd' }}>
          <span style={{ fontSize: 9, color: '#888', fontFamily: 'sans-serif' }}>(11) 9 9999-0000</span>
          <span style={{ fontSize: 9, color: '#888', fontFamily: 'sans-serif' }}>www.{brand.toLowerCase().replace(/\s/g, '')}.com.br</span>
        </div>
      </div>
    </div>
  );
};
