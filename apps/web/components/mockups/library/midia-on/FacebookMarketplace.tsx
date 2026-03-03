'use client';

import React, { useState } from 'react';

interface FacebookMarketplaceProps {
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
  price?: string | number;
  condition?: 'Novo' | 'Usado – como novo' | 'Usado – bom' | 'Usado – aceitável';
  location?: string;
  sellerName?: string;
  sellerImage?: string;
  sellerRating?: number;
}

export const FacebookMarketplace: React.FC<FacebookMarketplaceProps> = ({
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
  price = 350,
  condition = 'Usado – bom',
  location = 'São Paulo, SP',
  sellerName,
  sellerImage,
  sellerRating = 4.8,
}) => {
  const [messageSent, setMessageSent] = useState(false);
  const [saved, setSaved] = useState(false);

  const resolvedTitle = headline ?? title ?? name ?? brandName ?? 'Produto à Venda';
  const resolvedDescription = body ?? caption ?? description ?? text ?? '';
  const resolvedImage = image ?? postImage ?? thumbnail ?? '';
  const resolvedSellerName = sellerName ?? username ?? brandName ?? 'Vendedor';
  const resolvedSellerImage = sellerImage ?? profileImage ?? '';

  const formattedPrice = typeof price === 'number'
    ? `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : price;

  const conditionColor: Record<string, string> = {
    'Novo': '#1d7a3e',
    'Usado – como novo': '#1d7a3e',
    'Usado – bom': '#e6700e',
    'Usado – aceitável': '#c0392b',
  };

  const stars = Array.from({ length: 5 }, (_, i) => i < Math.round(sellerRating));

  return (
    <div style={{
      width: 400,
      background: '#fff',
      borderRadius: 8,
      boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
      fontFamily: 'Helvetica Neue, Arial, sans-serif',
      overflow: 'hidden',
      color: '#050505',
    }}>
      <style>{`
        @keyframes fbm-fadein { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .fbm-product-img { transition: transform 0.3s ease; }
        .fbm-product-img:hover { transform: scale(1.03); }
        .fbm-save-btn:hover { background: rgba(0,0,0,0.08) !important; }
        .fbm-msg-btn:hover { filter: brightness(0.92); }
      `}</style>

      {/* Product image */}
      <div style={{ position: 'relative', width: '100%', height: 260, background: '#f0f2f5', overflow: 'hidden' }}>
        {resolvedImage ? (
          <img
            src={resolvedImage}
            alt={resolvedTitle}
            className="fbm-product-img"
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            background: '#f0f2f5',
          }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#bcc0c4" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{ fontSize: 13, color: '#bcc0c4' }}>Foto do produto</span>
          </div>
        )}

        {/* Save button */}
        <button
          type="button"
          aria-label={saved ? 'Remover dos salvos' : 'Salvar anúncio'}
          className="fbm-save-btn"
          onClick={() => setSaved((v) => !v)}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 36,
            height: 36,
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255,255,255,0.92)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={saved ? '#1877f2' : 'none'} stroke={saved ? '#1877f2' : '#050505'} strokeWidth="2">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
          </svg>
        </button>

        {/* Condition badge */}
        <div style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          background: 'rgba(255,255,255,0.95)',
          borderRadius: 4,
          padding: '3px 8px',
          fontSize: 11,
          fontWeight: 700,
          color: conditionColor[condition] ?? '#555',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}>
          {condition}
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px 16px' }}>
        {/* Price */}
        <div style={{ fontSize: 24, fontWeight: 800, color: '#050505', marginBottom: 4 }}>
          {formattedPrice}
        </div>

        {/* Title */}
        <h2 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: '#050505', lineHeight: 1.3 }}>
          {resolvedTitle}
        </h2>

        {/* Location */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 10 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#65676b" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span style={{ fontSize: 13, color: '#65676b' }}>{location}</span>
        </div>

        {/* Description */}
        {resolvedDescription ? (
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#65676b', lineHeight: 1.4 }}>
            {resolvedDescription}
          </p>
        ) : null}

        {/* Divider */}
        <div style={{ borderTop: '1px solid #e4e6eb', margin: '12px 0' }} />

        {/* Seller info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#bcc0c4',
            overflow: 'hidden',
            flexShrink: 0,
          }}>
            {resolvedSellerImage ? (
              <img src={resolvedSellerImage} alt={resolvedSellerName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#050505' }}>{resolvedSellerName}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 2 }}>
              {stars.map((filled, i) => (
                <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={filled ? '#f5a623' : '#e4e6eb'} stroke="none">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              ))}
              <span style={{ fontSize: 12, color: '#65676b', marginLeft: 3 }}>{sellerRating.toFixed(1)}</span>
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          type="button"
          aria-label="Enviar mensagem ao vendedor"
          className="fbm-msg-btn"
          onClick={() => setMessageSent(true)}
          style={{
            width: '100%',
            padding: '10px 0',
            border: 'none',
            borderRadius: 6,
            background: messageSent ? '#42b883' : '#1877f2',
            color: '#fff',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'background 0.2s',
          }}
        >
          {messageSent ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Mensagem enviada!
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              Enviar mensagem
            </>
          )}
        </button>
      </div>
    </div>
  );
};
