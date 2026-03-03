'use client';

import React from 'react';

interface JornalDestaqueProps {
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

export const JornalDestaque: React.FC<JornalDestaqueProps> = ({
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
  const mainHeadline = headline ?? title ?? 'A grande oportunidade que você esperava';
  const bodyText = body ?? caption ?? description ?? text ?? 'Não perca esta chance única. Oferta por tempo limitado com condições exclusivas para os primeiros clientes.';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div style={{ width: 420, background: '#faf9f5', fontFamily: '"Georgia", "Times New Roman", serif', border: '2px solid #111', boxShadow: '0 6px 24px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
      <style>{`
        @keyframes jdes-rise { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .jdes-rise { animation: jdes-rise 0.5s ease both; }
        @keyframes jdes-border { 0%,100%{opacity:1} 50%{opacity:0.6} }
        .jdes-border { animation: jdes-border 2.5s ease infinite; }
      `}</style>

      {/* Top bar with brand */}
      <div style={{ background: brandColor, padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="jdes-rise">
        <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: 0.5, textTransform: 'uppercase' }}>{brand}</div>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.75)', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 1.5 }}>Destaque</div>
      </div>

      {/* Prominent headline */}
      <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid #d0cfc0' }}>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: '#111', lineHeight: 1.2, margin: 0, letterSpacing: -0.5 }}>{mainHeadline}</h2>
      </div>

      {/* Image */}
      <div style={{ width: '100%', height: 200, background: '#ccc9b8', overflow: 'hidden', position: 'relative' }}>
        {heroImage ? (
          <img src={heroImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg,#d0cdc0 0%,#a8a59a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexDirection: 'column' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.3"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: 10, color: '#888', fontFamily: 'sans-serif' }}>Foto do produto</span>
          </div>
        )}
      </div>

      {/* Body copy */}
      <div style={{ padding: '12px 18px' }}>
        <p style={{ fontSize: 11, color: '#444', lineHeight: 1.65, margin: '0 0 14px' }}>{bodyText}</p>

        {/* Highlighted offer box */}
        <div style={{ border: `2px solid ${brandColor}`, padding: '10px 14px', background: '#fffdf7', position: 'relative' }} className="jdes-border">
          <div style={{ position: 'absolute', top: -9, left: 12, background: '#fffdf7', paddingLeft: 4, paddingRight: 4 }}>
            <span style={{ fontSize: 9, fontFamily: 'sans-serif', fontWeight: 700, color: brandColor, textTransform: 'uppercase', letterSpacing: 1 }}>Oferta especial</span>
          </div>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#222', lineHeight: 1.5, margin: '0 0 6px' }}>ATÉ 50% OFF em produtos selecionados</p>
          <p style={{ fontSize: 9, color: '#666', fontFamily: 'sans-serif', margin: 0 }}>Válido enquanto durarem os estoques. Não acumulativo.</p>
        </div>

        {/* Key facts */}
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {['Frete grátis acima R$200', 'Parcelamento em 12x', 'Garantia de 1 ano', 'Suporte 24 horas'].map((fact, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 5, height: 5, background: brandColor, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: '#333', fontFamily: 'sans-serif' }}>{fact}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#111', padding: '8px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 11, color: '#fff', fontWeight: 700, fontFamily: 'sans-serif' }}>(11) 9 9999-0000</div>
        <div style={{ fontSize: 9, color: '#aaa', fontFamily: 'sans-serif' }}>www.{brand.toLowerCase().replace(/\s/g, '')}.com.br</div>
      </div>
    </div>
  );
};
