import React from 'react';

interface GoogleShoppingAdProps {
  productImage?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  productName?: string;
  name?: string;
  headline?: string;
  title?: string;
  price?: string;
  storeName?: string;
  brandName?: string;
  username?: string;
  rating?: number;
  reviewCount?: number | string;
  freeShipping?: boolean;
  inStock?: boolean;
  isSponsored?: boolean;
}

const StarRating = ({ rating }: { rating: number }) => {
  const stars = [1, 2, 3, 4, 5];
  return (
    <span style={{ display: 'inline-flex', gap: 1, alignItems: 'center' }}>
      {stars.map((s) => {
        const fill = rating >= s ? '#FBBC04' : rating >= s - 0.5 ? 'url(#half)' : '#DADCE0';
        return (
          <svg key={s} width="12" height="12" viewBox="0 0 24 24" fill={fill}>
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        );
      })}
    </span>
  );
};

export const GoogleShoppingAd: React.FC<GoogleShoppingAdProps> = ({
  productImage,
  image,
  postImage,
  thumbnail,
  productName,
  name,
  headline,
  title,
  price = 'R$ 199,90',
  storeName,
  brandName,
  username,
  rating = 4.3,
  reviewCount = '1.234',
  freeShipping = true,
  inStock = true,
  isSponsored = true,
}) => {
  const displayImage = productImage || image || postImage || thumbnail || '';
  const displayName = productName || name || headline || title || 'Nome do Produto';
  const displayStore = storeName || brandName || username || 'Nome da Loja';
  const reviewLabel = typeof reviewCount === 'number'
    ? reviewCount.toLocaleString('pt-BR')
    : reviewCount;

  return (
    <div style={{
      width: 200,
      background: '#fff',
      border: '1px solid #DADCE0',
      borderRadius: 8,
      overflow: 'hidden',
      cursor: 'pointer',
      fontFamily: 'Google Sans, "Helvetica Neue", Helvetica, Arial, sans-serif',
      transition: 'box-shadow 0.15s',
      boxShadow: '0 1px 3px rgba(60,64,67,0.08)',
    }}>
      {/* Product image */}
      <div style={{
        position: 'relative',
        width: '100%',
        paddingTop: '100%',
        background: '#F8F9FA',
        overflow: 'hidden',
      }}>
        {displayImage
          ? (
            <img
              src={displayImage}
              alt={displayName}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', padding: 12 }}
            />
          )
          : (
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#DADCE0" strokeWidth="1.2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          )
        }
        {/* Sponsored badge */}
        {isSponsored && (
          <div style={{
            position: 'absolute', top: 8, left: 8,
            background: '#fff',
            border: '1px solid #70757A',
            borderRadius: 3,
            padding: '1px 5px',
            fontSize: 10,
            fontWeight: 600,
            color: '#70757A',
            lineHeight: '14px',
          }}>
            Patrocinado
          </div>
        )}
      </div>

      {/* Product info */}
      <div style={{ padding: '10px 12px 12px' }}>
        {/* Price */}
        <p style={{ fontSize: 18, fontWeight: 700, color: '#202124', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
          {price}
        </p>

        {/* Product name */}
        <h4 style={{
          fontSize: 13,
          fontWeight: 400,
          color: '#202124',
          margin: '0 0 6px',
          lineHeight: '18px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {displayName}
        </h4>

        {/* Store name */}
        <p style={{ fontSize: 12, color: '#70757A', margin: '0 0 5px' }}>
          {displayStore}
        </p>

        {/* Rating */}
        {rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 5 }}>
            <StarRating rating={rating} />
            <span style={{ fontSize: 11, color: '#70757A' }}>({reviewLabel})</span>
          </div>
        )}

        {/* Badges */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {freeShipping && (
            <span style={{
              fontSize: 11, color: '#137333', fontWeight: 500,
              background: '#E6F4EA', borderRadius: 4, padding: '2px 6px',
            }}>
              Frete grátis
            </span>
          )}
          {inStock && (
            <span style={{
              fontSize: 11, color: '#1A73E8', fontWeight: 500,
              background: '#E8F0FE', borderRadius: 4, padding: '2px 6px',
            }}>
              Em estoque
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
