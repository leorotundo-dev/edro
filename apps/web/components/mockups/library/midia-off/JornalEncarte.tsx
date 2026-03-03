'use client';

import React from 'react';

interface JornalEncarteProps {
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

export const JornalEncarte: React.FC<JornalEncarteProps> = ({
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
  brandColor = '#e67e22',
}) => {
  const brand = brandName ?? name ?? 'SuperMercado';
  const mainHeadline = headline ?? title ?? 'Ofertas da Semana — Não Perca!';
  const bodyText =
    body ?? caption ?? description ?? text ??
    'As melhores promoções estão aqui. Aproveite e economize muito nesta semana!';
  const heroImage = image ?? postImage ?? thumbnail ?? profileImage ?? '';

  const products = [
    { name: 'Feijão 1kg',    from: 'R$ 8,90',  price: 'R$ 5,99' },
    { name: 'Arroz 5kg',     from: 'R$ 22,00', price: 'R$ 16,90' },
    { name: 'Óleo 900ml',    from: 'R$ 9,50',  price: 'R$ 6,49' },
    { name: 'Macarrão 500g', from: 'R$ 4,80',  price: 'R$ 2,99' },
    { name: 'Café 250g',     from: 'R$ 14,00', price: 'R$ 9,90' },
    { name: 'Leite 1L',      from: 'R$ 6,20',  price: 'R$ 4,29' },
  ];

  const validFrom = new Date().toLocaleDateString('pt-BR');
  const validTo   = new Date(Date.now() + 7 * 86400000).toLocaleDateString('pt-BR');

  return (
    <div
      style={{
        width: 360,
        background: '#fff',
        fontFamily: '"Arial", sans-serif',
        border: `3px solid ${brandColor}`,
        boxShadow: '0 6px 24px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes jenc-in { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
        .jenc-in { animation: jenc-in 0.45s ease both; }
      `}</style>

      {/* Colorful header */}
      <div style={{ background: brandColor, padding: '10px 16px' }} className="jenc-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.5, lineHeight: 1 }}>
              {brand}
            </div>
            <div style={{ fontSize: 8.5, color: 'rgba(255,255,255,0.82)', marginTop: 2, letterSpacing: 0.5, textTransform: 'uppercase' }}>
              Encarte de Ofertas
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1 }}>%</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>OFF</div>
          </div>
        </div>
      </div>

      {/* "Só esta semana!" banner */}
      <div style={{ background: '#c0392b', padding: '4px 16px', textAlign: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: 1, textTransform: 'uppercase' }}>
          Só esta semana!
        </span>
      </div>

      {/* Optional hero image strip */}
      {heroImage && (
        <div style={{ height: 70, overflow: 'hidden' }}>
          <img
            src={heroImage}
            alt={mainHeadline}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </div>
      )}

      {/* Headline */}
      <div style={{ background: '#fef3e2', borderBottom: `2px solid ${brandColor}`, padding: '7px 16px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 13, fontWeight: 900, color: brandColor, margin: 0, letterSpacing: -0.2 }}>
          {mainHeadline}
        </h2>
        <p style={{ fontSize: 8.5, color: '#666', margin: '3px 0 0' }}>{bodyText}</p>
      </div>

      {/* Product grid 3×2 */}
      <div style={{ padding: '10px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {products.map((prod, i) => (
          <div
            key={i}
            style={{
              border: '1px solid #f0e0c8',
              borderRadius: 4,
              padding: '8px 6px',
              textAlign: 'center',
              background: '#fffaf4',
            }}
          >
            {/* Product image placeholder */}
            <div
              style={{
                width: '100%',
                height: 44,
                background: '#f5ece0',
                borderRadius: 3,
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
            </div>
            <div style={{ fontSize: 8.5, fontWeight: 700, color: '#222', lineHeight: 1.2, marginBottom: 3 }}>
              {prod.name}
            </div>
            <div style={{ fontSize: 8, color: '#aaa', textDecoration: 'line-through', marginBottom: 4 }}>
              {prod.from}
            </div>
            {/* Price in red circle badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#c0392b',
                borderRadius: '50%',
                width: 46,
                height: 46,
              }}
            >
              <span style={{ fontSize: 9.5, fontWeight: 900, color: '#fff', lineHeight: 1.15, textAlign: 'center' }}>
                {prod.price}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          background: '#111',
          padding: '7px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{brand.toUpperCase()}</span>
        <span style={{ fontSize: 7.5, color: '#aaa' }}>
          Válido de {validFrom} até {validTo}
        </span>
      </div>
    </div>
  );
};
