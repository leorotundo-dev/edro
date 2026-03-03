'use client';

import React from 'react';

interface JornalMeiaPaginaProps {
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

export const JornalMeiaPagina: React.FC<JornalMeiaPaginaProps> = ({
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
  const mainHeadline = headline ?? title ?? 'Oferta imperdível para você';
  const bodyText = body ?? caption ?? description ?? text ?? 'Qualidade superior e preço justo. Visite nossa loja ou acesse nosso site e aproveite condições exclusivas.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div style={{ width: 420, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', border: '2px solid #222', boxShadow: '0 4px 18px rgba(0,0,0,0.18)', overflow: 'hidden' }}>
      <style>{`
        @keyframes jmp-slide { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
        .jmp-slide { animation: jmp-slide 0.5s ease both; }
      `}</style>

      {/* Top accent bar */}
      <div style={{ height: 5, background: brandColor }} />

      {/* Main content: image left + copy right */}
      <div style={{ display: 'flex', height: 220 }}>
        {/* Left: image */}
        <div style={{ width: 200, flexShrink: 0, background: '#c8c5b5', overflow: 'hidden', position: 'relative' }}>
          {heroImage ? (
            <img src={heroImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #ccc9b8 0%, #aaa89a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 6 }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
              <span style={{ fontSize: 9, color: '#888', fontFamily: 'sans-serif' }}>Foto</span>
            </div>
          )}
          {/* Section label overlay */}
          <div style={{ position: 'absolute', top: 10, left: 0, background: brandColor, padding: '3px 8px' }}>
            <span style={{ fontSize: 8, color: '#fff', fontFamily: 'sans-serif', letterSpacing: 1, textTransform: 'uppercase' }}>Publicidade</span>
          </div>
        </div>

        {/* Right: copy */}
        <div style={{ flex: 1, padding: '14px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', borderLeft: '1px solid #d0cfc0' }} className="jmp-slide">
          <div>
            <div style={{ fontSize: 10, fontFamily: 'sans-serif', color: brandColor, textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 6 }}>{brand}</div>
            <h2 style={{ fontSize: 17, fontWeight: 900, color: '#111', lineHeight: 1.25, margin: '0 0 10px', letterSpacing: -0.3 }}>{mainHeadline}</h2>
            <p style={{ fontSize: 10.5, color: '#444', lineHeight: 1.65, margin: 0 }}>{bodyText}</p>
          </div>
          <div>
            <div style={{ width: '100%', height: 1, background: '#d0cfc0', marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif', marginBottom: 1 }}>Contato</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#111', fontFamily: 'sans-serif' }}>(11) 9 9999-0000</div>
              </div>
              <div style={{ width: 32, height: 32, background: brandColor, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logo/contact footer bar */}
      <div style={{ background: '#111', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', letterSpacing: -0.3 }}>{brand.toUpperCase()}</span>
        <span style={{ fontSize: 9, color: '#aaa', fontFamily: 'sans-serif' }}>www.{brand.toLowerCase().replace(/\s/g, '')}.com.br</span>
        <span style={{ fontSize: 9, color: '#aaa', fontFamily: 'sans-serif' }}>CNPJ 00.000.000/0001-00</span>
      </div>
    </div>
  );
};
