'use client';

import React from 'react';

interface JornalColunaProps {
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

export const JornalColuna: React.FC<JornalColunaProps> = ({
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
  brandColor = '#1a1a1a',
}) => {
  const brand = brandName ?? name ?? 'Marca';
  const mainHeadline = headline ?? title ?? 'A melhor escolha para o seu dia a dia';
  const bodyText = body ?? caption ?? description ?? text ?? 'Produtos selecionados com qualidade superior. Conheça nossa linha completa e descubra por que somos referência no mercado.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div style={{ width: 260, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', border: '2px solid #222', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes jcol-in { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
        .jcol-in { animation: jcol-in 0.45s ease both; }
      `}</style>

      {/* Top accent */}
      <div style={{ height: 5, background: brandColor }} />

      {/* Brand header */}
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #d0cfc0' }} className="jcol-in">
        <div style={{ fontSize: 8, fontFamily: 'sans-serif', color: '#888', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 2 }}>Publicidade</div>
        <div style={{ fontSize: 16, fontWeight: 900, color: '#111', letterSpacing: -0.3, textTransform: 'uppercase' }}>{brand}</div>
      </div>

      {/* Bold headline */}
      <div style={{ padding: '10px 14px 8px', borderBottom: '1px solid #d0cfc0' }}>
        <div style={{ width: 24, height: 3, background: brandColor, marginBottom: 7 }} />
        <h2 style={{ fontSize: 16, fontWeight: 900, color: '#111', lineHeight: 1.25, margin: 0, letterSpacing: -0.3 }}>{mainHeadline}</h2>
      </div>

      {/* Vertical image */}
      <div style={{ width: '100%', height: 200, background: '#ccc9b8', overflow: 'hidden', flexShrink: 0 }}>
        {heroImage ? (
          <img src={heroImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(180deg,#ccc9b8 0%,#9e9c8e 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: 9, color: '#888', fontFamily: 'sans-serif' }}>Imagem</span>
          </div>
        )}
      </div>

      {/* Body copy */}
      <div style={{ padding: '10px 14px', flex: 1 }}>
        <p style={{ fontSize: 10, color: '#444', lineHeight: 1.65, margin: '0 0 12px' }}>{bodyText}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {['Qualidade garantida', 'Entrega rápida', 'Melhor preço'].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 4, height: 4, background: brandColor, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: '#333', fontFamily: 'sans-serif' }}>{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA at bottom */}
      <div style={{ background: brandColor, padding: '10px 14px', marginTop: 'auto' }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontFamily: 'sans-serif', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 1 }}>Entre em contato</div>
        <div style={{ fontSize: 12, color: '#fff', fontWeight: 700, fontFamily: 'sans-serif', marginBottom: 2 }}>(11) 9 9999-0000</div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', fontFamily: 'sans-serif' }}>www.{brand.toLowerCase().replace(/\s/g, '')}.com.br</div>
      </div>
    </div>
  );
};
