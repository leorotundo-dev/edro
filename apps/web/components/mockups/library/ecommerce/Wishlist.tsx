import React from 'react';

interface WishlistItem {
  id: string;
  name: string;
  price: string;
  originalPrice?: string;
  image?: string;
  inStock: boolean;
  discount?: string;
}

interface WishlistProps {
  title?: string;
  headline?: string;
  name?: string;
  brandName?: string;
  username?: string;
  subtitle?: string;
  description?: string;
  body?: string;
  caption?: string;
  image?: string;
  postImage?: string;
  thumbnail?: string;
  profileImage?: string;
  brandColor?: string;
  items?: WishlistItem[];
}

const defaultItems: WishlistItem[] = [
  { id: '1', name: 'Tenis Esportivo Pro', price: 'R$ 299,90', originalPrice: 'R$ 399,90', image: '', inStock: true, discount: '25%' },
  { id: '2', name: 'Mochila Urbana Premium', price: 'R$ 189,90', originalPrice: 'R$ 249,90', image: '', inStock: true, discount: '24%' },
  { id: '3', name: 'Fone Bluetooth Plus', price: 'R$ 449,90', image: '', inStock: false },
  { id: '4', name: 'Camiseta Basica Slim', price: 'R$ 79,90', originalPrice: 'R$ 99,90', image: '', inStock: true, discount: '20%' },
];

export const Wishlist: React.FC<WishlistProps> = ({
  title: titleProp,
  headline,
  name,
  brandName,
  username,
  subtitle,
  description,
  body,
  caption,
  image: imageProp,
  postImage,
  thumbnail,
  profileImage,
  brandColor = '#5D87FF',
  items = defaultItems,
}) => {
  const pageTitle = titleProp ?? headline ?? 'Minha Lista de Desejos';
  const userName = username ?? name ?? brandName ?? 'Usuario';
  const sub = subtitle ?? description ?? body ?? caption ?? `${items.length} itens salvos`;
  const avatarImage = imageProp ?? postImage ?? thumbnail ?? profileImage ?? '';

  return (
    <div
      style={{
        flexShrink: 0,
        width: '520px',
        background: '#ffffff',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        border: '1.5px solid #E8ECF4',
        fontFamily: "'Segoe UI', Arial, sans-serif",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}cc 100%)`,
          padding: '18px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Avatar */}
          {avatarImage ? (
            <img
              src={avatarImage}
              alt={userName}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid rgba(255,255,255,0.5)',
              }}
            />
          ) : (
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.25)',
                border: '2px solid rgba(255,255,255,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="7" r="4" stroke="white" strokeWidth="2"/>
              </svg>
            </div>
          )}

          <div>
            <div
              style={{
                color: 'rgba(255,255,255,0.75)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.5px',
              }}
            >
              Lista de desejos de
            </div>
            <div
              style={{
                color: '#ffffff',
                fontSize: '15px',
                fontWeight: 800,
                lineHeight: 1.2,
              }}
            >
              {pageTitle}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Heart icon */}
          <div
            style={{
              background: 'rgba(255,255,255,0.18)',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
            </svg>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '10px' }}>{sub}</div>
            <div style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>{userName}</div>
          </div>
        </div>
      </div>

      {/* Items list */}
      <div style={{ padding: '8px 0' }}>
        {items.map((item, index) => (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 16px',
              borderBottom: index < items.length - 1 ? '1px solid #F0F2F8' : 'none',
              transition: 'background 0.15s',
            }}
          >
            {/* Product image */}
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '10px',
                overflow: 'hidden',
                flexShrink: 0,
                background: '#F5F7FA',
                border: '1px solid #E8ECF4',
                position: 'relative',
              }}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="3" width="18" height="18" rx="3" fill={brandColor} opacity="0.15"/>
                    <circle cx="8.5" cy="8.5" r="1.5" fill={brandColor} opacity="0.5"/>
                    <path d="M21 15l-5-5L5 21" stroke={brandColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
                  </svg>
                </div>
              )}

              {item.discount && (
                <div
                  style={{
                    position: 'absolute',
                    top: '2px',
                    left: '2px',
                    background: '#FF3B3B',
                    color: '#fff',
                    borderRadius: '3px',
                    padding: '1px 4px',
                    fontSize: '8px',
                    fontWeight: 800,
                    lineHeight: 1.4,
                  }}
                >
                  -{item.discount}
                </div>
              )}
            </div>

            {/* Product info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  color: '#1A1A2E',
                  fontSize: '13px',
                  fontWeight: 700,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.3,
                }}
              >
                {item.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                <span
                  style={{
                    color: brandColor,
                    fontSize: '14px',
                    fontWeight: 800,
                  }}
                >
                  {item.price}
                </span>
                {item.originalPrice && (
                  <span
                    style={{
                      color: 'rgba(0,0,0,0.35)',
                      fontSize: '11px',
                      textDecoration: 'line-through',
                    }}
                  >
                    {item.originalPrice}
                  </span>
                )}
              </div>
              {!item.inStock && (
                <span
                  style={{
                    color: '#FF3B3B',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  Fora de estoque
                </span>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              {item.inStock ? (
                <button
                  style={{
                    background: brandColor,
                    color: '#fff',
                    border: 'none',
                    borderRadius: '7px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    boxShadow: `0 2px 8px ${brandColor}35`,
                  }}
                >
                  Adicionar
                </button>
              ) : (
                <button
                  style={{
                    background: 'transparent',
                    color: 'rgba(0,0,0,0.4)',
                    border: '1px solid #E0E4EF',
                    borderRadius: '7px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Avisar
                </button>
              )}

              {/* Remove/Heart button */}
              <button
                style={{
                  background: 'transparent',
                  border: '1px solid #E0E4EF',
                  borderRadius: '7px',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke={brandColor} strokeWidth="1.5" fill={`${brandColor}25`}/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        style={{
          borderTop: '1.5px solid #F0F2F8',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#FAFBFF',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: '11px' }}>
            {items.filter(i => i.inStock).length} itens disponíveis
          </span>
          <span style={{ color: '#E0E4EF', fontSize: '11px' }}>•</span>
          <span style={{ color: 'rgba(0,0,0,0.45)', fontSize: '11px' }}>
            {items.filter(i => !i.inStock).length} indisponível
          </span>
        </div>
        <button
          style={{
            background: brandColor,
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            padding: '8px 16px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: `0 3px 10px ${brandColor}40`,
          }}
        >
          Comprar Todos
        </button>
      </div>
    </div>
  );
};
