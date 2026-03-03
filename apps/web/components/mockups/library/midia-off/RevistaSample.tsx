'use client';

import React from 'react';

interface RevistaSampleProps {
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

export const RevistaSample: React.FC<RevistaSampleProps> = ({
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
  brandColor = '#e11d48',
}) => {
  const brand = brandName ?? name ?? 'Marca Amostra';
  const mainHeadline = headline ?? title ?? 'Amostra Grátis — experimente antes de comprar';
  const bodyText = body ?? caption ?? description ?? text ?? 'Descole e experimente. Esta amostra foi desenvolvida especialmente para novos clientes. Descubra por que somos a escolha de milhões de pessoas.';
  const adImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div style={{ width: 340, height: 454, background: '#fff', fontFamily: '"Georgia", "Times New Roman", serif', boxShadow: '0 8px 32px rgba(0,0,0,0.20)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes rsmp-in { from{opacity:0;transform:scale(0.96)} to{opacity:1;transform:scale(1)} }
        .rsmp-in { animation: rsmp-in 0.55s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes rsmp-star { 0%,100%{transform:rotate(-3deg) scale(1)} 50%{transform:rotate(3deg) scale(1.04)} }
        .rsmp-star { animation: rsmp-star 3s ease infinite; }
        @keyframes rsmp-img { from{transform:scale(1.05)} to{transform:scale(1)} }
        .rsmp-img { animation: rsmp-img 0.7s ease both; }
      `}</style>

      {/* Perforation top edge */}
      <div style={{ height: 12, background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderBottom: '1px dashed #ccc' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: 28 }, (_, i) => (
            <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#ddd' }} />
          ))}
        </div>
      </div>

      {/* Bold top bar */}
      <div style={{ background: brandColor, padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }} className="rsmp-in">
        <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: -0.3 }}>{brand}</div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 1.5 }}>Amostra Grátis</div>
      </div>

      {/* Image section */}
      <div style={{ width: '100%', height: 170, overflow: 'hidden', position: 'relative', flexShrink: 0 }} className="rsmp-img">
        {adImage ? (
          <img src={adImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${brandColor}18 0%, ${brandColor}38 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1" opacity="0.35"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: 10, color: brandColor, fontFamily: 'sans-serif', opacity: 0.45 }}>Produto em destaque</span>
          </div>
        )}

        {/* Starburst "GRÁTIS" badge */}
        <div className="rsmp-star" style={{ position: 'absolute', top: 12, right: 14 }}>
          <svg width="64" height="64" viewBox="0 0 64 64"><polygon points="32,4 38,22 56,22 42,34 48,52 32,40 16,52 22,34 8,22 26,22" fill={brandColor} opacity="0.95"/><text x="32" y="36" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="900" fontFamily="sans-serif">GRÁTIS</text></svg>
        </div>
      </div>

      {/* Dashed separator */}
      <div style={{ height: 1, background: 'repeating-linear-gradient(90deg, #ccc 0, #ccc 6px, transparent 6px, transparent 12px)', flexShrink: 0, margin: '0 14px' }} />

      {/* Content */}
      <div style={{ flex: 1, padding: '12px 18px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} className="rsmp-in">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
            <div style={{ width: 24, height: 3, background: brandColor }} />
            <span style={{ fontSize: 8, color: brandColor, fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 1.3, fontWeight: 700 }}>Experimente hoje</span>
          </div>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111', lineHeight: 1.22, margin: '0 0 9px', letterSpacing: -0.25 }}>{mainHeadline}</h2>
          <p style={{ fontSize: 10, color: '#666', lineHeight: 1.65, margin: 0, fontFamily: 'sans-serif' }}>{bodyText}</p>
        </div>

        {/* CTA + contact */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: 10 }}>
          <div style={{ background: brandColor, padding: '8px 20px' }}>
            <span style={{ fontSize: 9, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Resgatar</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8.5, color: '#bbb', fontFamily: 'sans-serif' }}>www.{brand.toLowerCase().replace(/\s/g, '')}.com.br</div>
            <div style={{ fontSize: 8.5, color: '#bbb', fontFamily: 'sans-serif' }}>(11) 9 9999-0000</div>
          </div>
        </div>
      </div>

      {/* Perforation bottom edge */}
      <div style={{ height: 12, background: '#f8f8f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderTop: '1px dashed #ccc' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {Array.from({ length: 28 }, (_, i) => (
            <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: '#ddd' }} />
          ))}
        </div>
      </div>
    </div>
  );
};
