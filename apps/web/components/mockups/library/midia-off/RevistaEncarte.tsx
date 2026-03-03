'use client';

import React from 'react';

interface RevistaEncarteProps {
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

export const RevistaEncarte: React.FC<RevistaEncarteProps> = ({
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
  brandColor = '#b45309',
}) => {
  const brand = brandName ?? name ?? 'Marca Encarte';
  const mainHeadline = headline ?? title ?? 'Encarte especial — ofertas que não cabem em uma só página';
  const bodyText = body ?? caption ?? description ?? text ?? 'Impresso em papel diferenciado e inserido entre as páginas da revista, o encarte se destaca como um material exclusivo que o leitor guarda e consulta novamente.';
  const adImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';
  const validUntil = new Date(Date.now() + 30 * 86400000).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });

  const products = [
    { name: 'Produto Premium A', price: 'R$ 299', tag: 'Lançamento' },
    { name: 'Produto Especial B', price: 'R$ 149', tag: '-20%' },
    { name: 'Kit Completo C', price: 'R$ 399', tag: 'Exclusivo' },
    { name: 'Edição Limitada D', price: 'R$ 199', tag: 'Promoção' },
    { name: 'Coleção Básica E', price: 'R$ 89', tag: 'Popular' },
    { name: 'Pacote Plus F', price: 'R$ 499', tag: 'Premium' },
  ];

  return (
    <div style={{ width: 340, height: 454, background: '#fff', fontFamily: '"Georgia", "Times New Roman", serif', boxShadow: '0 8px 28px rgba(0,0,0,0.20)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', border: '1px solid #e5e5e5' }}>
      <style>{`
        @keyframes renc-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .renc-in { animation: renc-in 0.55s ease both; }
        @keyframes renc-img { from{transform:scale(1.04)} to{transform:scale(1)} }
        .renc-img { animation: renc-img 0.7s ease both; }
      `}</style>

      {/* Bold header */}
      <div style={{ background: brandColor, padding: '10px 16px', flexShrink: 0 }} className="renc-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', fontFamily: 'sans-serif', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 2 }}>Encarte Especial</div>
            <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: -0.3, textTransform: 'uppercase' }}>{brand}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', fontFamily: 'sans-serif', marginBottom: 2 }}>Válido até</div>
            <div style={{ fontSize: 8, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700 }}>{validUntil}</div>
          </div>
        </div>
      </div>

      {/* Hero image */}
      <div style={{ width: '100%', height: 120, overflow: 'hidden', position: 'relative', flexShrink: 0 }} className="renc-img">
        {adImage ? (
          <img src={adImage} alt={mainHeadline} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: `linear-gradient(135deg, ${brandColor}18 0%, ${brandColor}38 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke={brandColor} strokeWidth="1" opacity="0.35"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></svg>
            <span style={{ fontSize: 9, color: brandColor, fontFamily: 'sans-serif', opacity: 0.45 }}>Imagem do encarte</span>
          </div>
        )}
        {/* Overlay headline */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)', padding: '18px 14px 8px' }}>
          <h2 style={{ fontSize: 12, fontWeight: 900, color: '#fff', lineHeight: 1.25, margin: 0, letterSpacing: -0.2 }}>{mainHeadline}</h2>
        </div>
      </div>

      {/* Accent rule */}
      <div style={{ height: 3, background: brandColor, flexShrink: 0 }} />

      {/* Product grid */}
      <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }} className="renc-in">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {products.map((p, i) => (
            <div key={i} style={{ background: '#fafafa', border: '1px solid #eee', padding: '7px 7px', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -4, right: 4, background: brandColor, padding: '1px 5px' }}>
                <span style={{ fontSize: 6, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700 }}>{p.tag}</span>
              </div>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: '#222', lineHeight: 1.3, marginBottom: 3 }}>{p.name}</div>
              <div style={{ fontSize: 10, fontWeight: 900, color: brandColor, fontFamily: 'sans-serif' }}>{p.price}</div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: '1px solid #eee', paddingTop: 9, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 8.5, color: '#777', lineHeight: 1.5, margin: 0, fontFamily: 'sans-serif', flex: 1, paddingRight: 10 }}>{bodyText.substring(0, 80)}...</p>
          <div style={{ background: brandColor, padding: '6px 12px', flexShrink: 0 }}>
            <span style={{ fontSize: 8, color: '#fff', fontFamily: 'sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>Ver tudo</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#111', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif' }}>(11) 9 9999-0000</span>
        <span style={{ fontSize: 8, color: '#888', fontFamily: 'sans-serif' }}>www.{brand.toLowerCase().replace(/\s/g, '')}.com.br</span>
      </div>
    </div>
  );
};
